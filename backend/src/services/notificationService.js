import { localize } from '../locales/index.js';
import crypto from "crypto";

import { prisma } from "../db.js";

export const BOOKING_UPCOMING_REMINDER_MINUTES = Number(process.env.BOOKING_UPCOMING_REMINDER_MINUTES || 30);
export const RETURN_REMINDER_MINUTES = Number(process.env.RETURN_REMINDER_MINUTES || 15);

const REMINDER_TYPES = ["BOOKING_UPCOMING", "RETURN_REMINDER"];

function reminderSchedule(booking) {
  return [
    {
      type: "BOOKING_UPCOMING",
      minutesBefore: BOOKING_UPCOMING_REMINDER_MINUTES,
      title: localize("vi", "notification.booking.upcoming.title"),
      titleKey: "booking.upcoming.title",
      messageKey: "booking.upcoming.message",
      severity: "info"
    },
    {
      type: "RETURN_REMINDER",
      minutesBefore: RETURN_REMINDER_MINUTES,
      title: localize("vi", "notification.booking.return_reminder.title"),
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
  if (booking.feeAmountVnd > 0 && !await tx.paymentTransaction.findFirst({ where: { bookingId: booking.id, userId: booking.requestedById, status: 'success', amount: booking.feeAmountVnd, currency: 'VND', provider: { in: ['vnpay','vietqr'] }, reconciliationStatus: 'none', paidAt: { not: null } } })) return;
  if (booking.endAt <= now) return;

  for (const definition of reminderSchedule(booking)) {
    if (definition.type === 'BOOKING_UPCOMING' && (booking.status !== 'CONFIRMED' || booking.startAt <= now)) continue;
    const messageParams = {
      bookingId: booking.id,
      title: booking.title,
      resourceCode: booking.resource?.code || null,
      resourceName: booking.resource?.name || null,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString()
    };
    const message = localize("vi", `notification.${definition.messageKey}`, messageParams);

    await tx.notification.upsert({
      where: { dedupeKey: `booking:${booking.id}:${definition.type}` },
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
        dedupeKey: `booking:${booking.id}:${definition.type}`
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

export async function cancelPendingBookingReminders(tx, bookingId, types = REMINDER_TYPES) {
  const selectedTypes = types.filter((type) => REMINDER_TYPES.includes(type));
  if (!selectedTypes.length) return 0;
  const result = await tx.notification.deleteMany({
    where: {
      type: { in: selectedTypes },
      sentAt: null,
      dedupeKey: { in: selectedTypes.map((type) => `booking:${bookingId}:${type}`) }
    }
  });
  await tx.notification.updateMany({ where: { dedupeKey: { in: selectedTypes.map(type => `booking:${bookingId}:${type}`) }, sentAt: { not: null }, readAt: null }, data: { readAt: new Date() } });
  return result.count;
}

export async function dispatchDueNotifications(client = prisma, now = new Date(), userId = null) {
  let reminderCount = 0;
  // Recheck persisted reminders after downtime; an obsolete job must not pop up
  // as though a cancelled, unpaid or expired booking were still upcoming.
  const reminders = await client.notification.findMany({ where: { sentAt: null, type: { in: REMINDER_TYPES }, scheduledAt: { lte: now }, ...(userId ? { userId } : {}) }, take: 100,
    select: { id: true, type: true, messageParams: true } });
  for (const reminder of reminders) {
    const bookingId = reminder.messageParams?.bookingId;
    const booking = typeof bookingId === 'string' ? await client.booking.findUnique({ where: { id: bookingId } }) : null;
    const active = booking && ['CONFIRMED','CHECKED_OUT'].includes(booking.status) && booking.endAt > now && (reminder.type !== 'BOOKING_UPCOMING' || (booking.status === 'CONFIRMED' && booking.startAt > now));
    const paid = active && (booking.feeAmountVnd === 0 || await client.paymentTransaction.findFirst({ where: { bookingId, userId: booking.requestedById, status: 'success', amount: booking.feeAmountVnd, currency: 'VND', provider: { in: ['vnpay','vietqr'] }, reconciliationStatus: 'none', paidAt: { not: null } } }));
    if (paid) reminderCount += (await client.notification.updateMany({ where: { id: reminder.id, sentAt: null }, data: { sentAt: now } })).count;
    else await client.notification.deleteMany({ where: { id: reminder.id, sentAt: null } });
  }
  const where = {
    sentAt: null,
    OR: [{ type: null }, { type: { notIn: REMINDER_TYPES } }],
    AND: [{ OR: [
      { scheduledAt: null },
      { scheduledAt: { lte: now } }
    ] }],
    ...(userId ? { userId } : {})
  };
  const result = await client.notification.updateMany({
    where,
    data: { sentAt: now }
  });
  return result.count + reminderCount;
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

export async function countUnreadUserNotifications(userId, client = prisma) {
  await dispatchDueNotifications(client, new Date(), userId);
  return client.notification.count({ where: { userId, sentAt: { not: null }, readAt: null } });
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
