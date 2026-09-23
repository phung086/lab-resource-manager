import crypto from "node:crypto";

const TITLES = {
  REQUEST: "Có yêu cầu đặt lịch mới", CONFIRMED: "Lịch đặt đã được duyệt",
  REJECTED: "Lịch đặt bị từ chối", CHECKED_OUT: "Đã bàn giao tài nguyên",
  RETURNED: "Đã nhận hoàn trả", COMPLETED: "Lịch đặt đã hoàn tất",
  CANCELLED: "Lịch đặt đã hủy", SELF_RETURN: "Người đặt đã tự trả phòng"
};

// Run inside the booking transaction: the event and business mutation commit together.
export async function notifyBookingEvent(tx, booking, event, { includeOwner = false, now = new Date() } = {}) {
  const assignments = booking.resource.laboratoryId
    ? await tx.userLabAssignment.findMany({ where: { laboratoryId: booking.resource.laboratoryId }, select: { userId: true } })
    : [];
  const recipients = await tx.user.findMany({
    where: { isActive: true, OR: [
      { role: "ADMIN" },
      { role: "LAB_STAFF", id: { in: assignments.map(row => row.userId) } },
      ...(includeOwner ? [{ id: booking.requestedById }] : [])
    ] }, select: { id: true }
  });
  for (const recipient of recipients) {
    // Approval notifications already cover the owner with their canonical type.
    if (["CONFIRMED", "REJECTED"].includes(event) && recipient.id === booking.requestedById) continue;
    const dedupeKey = `booking:${booking.id}:event:${event}:${recipient.id}`;
    await tx.notification.upsert({
      where: { dedupeKey }, update: {},
      create: {
        id: crypto.randomUUID(), userId: recipient.id, dedupeKey,
        title: TITLES[event], message: `${booking.title} · ${booking.resource.code}`,
        messageParams: { bookingId: booking.id, event, resourceCode: booking.resource.code },
        severity: "info", channel: "in_app", sentAt: now
      }
    });
  }
}
