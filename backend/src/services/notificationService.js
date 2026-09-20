import crypto from "crypto";

import { prisma } from "../db.js";

export const BOOKING_UPCOMING_REMINDER_MINUTES = Number(process.env.BOOKING_UPCOMING_REMINDER_MINUTES || 60);
export const RETURN_REMINDER_MINUTES = Number(process.env.RETURN_REMINDER_MINUTES || 15);

const REMINDER_TYPES = ["BOOKING_UPCOMING", "RETURN_REMINDER"];

function reminderSchedule(booking) {
  return [
    {
      type: "BOOKING_UPCOMING",
      minutesBefore: BOOKING_UPCOMING_REMINDER_MINUTES,
      title: "Lịch đặt sắp bắt đầu",
      titleKey: "booking.upcoming.title",
      messageKey: "booking.upcoming.message",
      severity: "info"
    },
    {
      type: "RETURN_REMINDER",
      minutesBefore: RETURN_REMINDER_MINUTES,
      title: "Sắp đến giờ hoàn trả tài nguyên",
      titleKey: "booking.return_reminder.title",
      messageKey: "booking.return_reminder.message",
      severity: "warning"
    }
  ].map((definition) => ({
    ...definition,
    scheduledAt: new Date(
      (definition.type === "BOOKING_UPCOMING" ? booking.startAt : booking.endAt).getTime()
      - definition.minutesBefore * 60_000
    )
  }));
}

export async function scheduleBookingReminders(tx, booking, now = new Date()) {
  if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_OUT") return;

  for (const definition of reminderSchedule(booking)) {
    const messageParams = {
      bookingId: booking.id,
      title: booking.title,
      resourceCode: booking.resource?.code || null,
      resourceName: booking.resource?.name || null,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString()
    };
    const message = definition.type === "BOOKING_UPCOMING"
      ? \`Lịch \${booking.title} sẽ bắt đầu lúc \${booking.startAt.toISOString()}.\`
      : \`Lịch \${booking.title} dự kiến kết thúc lúc \${booking.endAt.toISOString()}.\`;

    await tx.notification.upsert({
      where: { dedupeKey: \`booking:\${booking.id}:\${definition.type}\` },
      create: {
        id: crypto.randomUUID(),
        userId: booking.requestedById,
        type: definition.type,
        title: definition.title,
        message,
        titleKey: definition.titleKey,
        messageKey: definition.messageKey,
        messageParams,
        severity: definition.severity,
        channel: "in_app",
        scheduledAt: definition.scheduledAt,
        sentAt: definition.scheduledAt <= now ? now : null,
        dedupeKey: \`booking:\${booking.id}:\${definition.type}\`
      },
      update: {
        title: definition.title,
        message,
        titleKey: definition.titleKey,
        messageKey: definition.messageKey,
        messageParams,
        severity: definition.severity,
        scheduledAt: definition.scheduledAt,
        sentAt: definition.scheduledAt <= now ? now : null,
        readAt: null
      }
    });
  }
}

export async function cancelPendingBookingReminders(tx, bookingId) {
  await tx.notification.deleteMany({
    where: {
      type: { in: REMINDER_TYPES },
      sentAt: null,
      dedupeKey: { in: REMINDER_TYPES.map((type) => \`booking:\${bookingId}:\${type}\`) }
    }
  });
}

export async function dispatchDueNotifications(client = prisma, now = new Date(), userId = null) {
  const where = {
    sentAt: null,
    scheduledAt: { lte: now },
    ...(userId ? { userId } : {})
  };
  const result = await client.notification.updateMany({
    where,
    data: { sentAt: now }
  });
  return result.count;
}

export async function getUserNotifications(userId, { unreadOnly = false, take = 50 } = {}, client = prisma) {
  await dispatchDueNotifications(client, new Date(), userId);
  return client.notification.findMany({
    where: {
      userId,
      sentAt: { not: null },
      ...(unreadOnly ? { readAt: null } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(take) || 50, 1), 100)
  });
}

export function startReminderScheduler({
  client = prisma,
  intervalMs = Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || 60_000),
  onError = (error) => console.error("Reminder scheduler failed", error)
} = {}) {
  if (process.env.NODE_ENV === "test" || process.env.REMINDER_SCHEDULER_ENABLED === "false") {
    return () => {};
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await dispatchDueNotifications(client);
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
