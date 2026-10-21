import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { cancelPendingBookingReminders, scheduleBookingReminders } from './notificationService.js';
import { notifyBookingEvent } from './bookingEventService.js';

export const PAYMENT_HOLD_MS = 15 * 60 * 1000;
export const isPaymentHold = booking => booking?.status === 'PENDING_APPROVAL' && Boolean(booking.paymentDueAt);
export const effectivePaymentDeadline = booking => booking?.paymentDueAt
  ? new Date(Math.min(+new Date(booking.paymentDueAt), booking.startAt ? +new Date(booking.startAt) : Infinity)) : null;
const expiredHoldWhere = now => ({ status: 'PENDING_APPROVAL', paymentDueAt: { not: null }, OR: [{ paymentDueAt: { lte: now } }, { startAt: { lte: now } }] });
export const settledBookingPaymentWhere = booking => ({
  bookingId: booking.id, userId: booking.requestedById, amount: booking.feeAmountVnd,
  currency: 'VND', status: 'success', provider: { in: ['vnpay', 'vietqr'] },
  paidAt: { not: null }, reconciliationStatus: 'none'
});

// Resource -> booking order is shared by creation, expiry and payment callbacks.
export async function lockPaymentBooking(tx, bookingId) {
  await tx.$queryRaw`SELECT id FROM resources WHERE id = (SELECT "resourceId" FROM bookings WHERE id = ${bookingId}) FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
}

async function logChange(tx, booking, status, reason, now) {
  await tx.usageLog.create({ data: {
    id: crypto.randomUUID(), bookingId: booking.id, resourceId: booking.resourceId,
    actorType: 'SYSTEM', actorRef: 'booking-payment-lifecycle', action: status === 'CANCELLED' ? 'CANCEL' : 'STATUS_CHANGE',
    fromStatus: booking.status, toStatus: status, reason, message: reason,
    metadata: { paymentDueAt: booking.paymentDueAt?.toISOString(), paymentHold: true }, createdAt: now
  } });
}

export async function confirmPaidBooking(tx, booking, now = new Date()) {
  if (!isPaymentHold(booking)) return booking;
  const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED', approvedAt: now }, include: { resource: true } });
  await logChange(tx, booking, 'CONFIRMED', 'PAYMENT_VERIFIED', now);
  await scheduleBookingReminders(tx, updated, now);
  await notifyBookingEvent(tx, updated, 'CONFIRMED', { now });
  return updated;
}

// Caller holds the resource and booking locks. Expiry never changes physical state.
export async function expireLockedPaymentHold(tx, booking, now = new Date()) {
  if (!isPaymentHold(booking) || +effectivePaymentDeadline(booking) > +now) return false;
  if (await tx.paymentTransaction.findFirst({ where: settledBookingPaymentWhere(booking), select: { id: true } })) return false;
  await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
  await tx.paymentTransaction.updateMany({ where: { bookingId: booking.id, status: 'pending' }, data: { status: 'expired' } });
  await cancelPendingBookingReminders(tx, booking.id);
  await logChange(tx, booking, 'CANCELLED', 'PAYMENT_HOLD_EXPIRED', now);
  await tx.notification.upsert({ where: { dedupeKey: `booking:${booking.id}:payment-expired` }, update: {}, create: {
    id: crypto.randomUUID(), userId: booking.requestedById, dedupeKey: `booking:${booking.id}:payment-expired`,
    title: 'Lịch giữ chỗ đã hết hạn', message: 'Đã hết hạn thanh toán giữ chỗ. Khung giờ đã được giải phóng.',
    titleKey: 'booking.payment_expired.title', messageKey: 'booking.payment_expired.message', severity: 'warning', sentAt: now
  } });
  return true;
}

export async function expireResourcePaymentHolds(tx, resourceId, now = new Date()) {
  const rows = await tx.booking.findMany({ where: { resourceId, ...expiredHoldWhere(now) }, orderBy: { id: 'asc' } });
  for (const row of rows) {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${row.id} FOR UPDATE`;
    const current = await tx.booking.findUnique({ where: { id: row.id } });
    await expireLockedPaymentHold(tx, current, now);
  }
}

export async function expirePaymentHolds(db = prisma, { resourceId, bookingId, userId, now = new Date() } = {}) {
  const rows = await db.booking.findMany({ where: { ...expiredHoldWhere(now), ...(resourceId ? { resourceId } : {}), ...(bookingId ? { id: bookingId } : {}), ...(userId ? { requestedById: userId } : {}) }, select: { id: true }, orderBy: { paymentDueAt: 'asc' }, take: 100 });
  for (const row of rows) await db.$transaction(async tx => {
    await lockPaymentBooking(tx, row.id);
    await expireLockedPaymentHold(tx, await tx.booking.findUnique({ where: { id: row.id } }), now);
  });
}

// Correct only still-active, unpaid reservations made by the earlier auto-confirm flow.
// Historical completed/ended records and verified settlements are preserved.
async function adoptUnpaidReservations(db, now) {
  const rows = await db.booking.findMany({ where: { status: 'CONFIRMED', paymentDueAt: null, feeAmountVnd: { gt: 0 }, endAt: { gt: now }, payments: { none: { status: 'success', paidAt: { not: null }, reconciliationStatus: 'none' } } }, select: { id: true }, take: 100 });
  for (const row of rows) await db.$transaction(async tx => {
    await lockPaymentBooking(tx, row.id);
    const current = await tx.booking.findUnique({ where: { id: row.id } });
    if (current?.status !== 'CONFIRMED' || current.paymentDueAt || current.endAt <= now || await tx.paymentTransaction.findFirst({ where: settledBookingPaymentWhere(current), select: { id: true } })) return;
    const paymentDueAt = new Date(Math.min(+current.createdAt + PAYMENT_HOLD_MS, +current.startAt));
    const updated = await tx.booking.update({ where: { id: row.id }, data: { status: 'PENDING_APPROVAL', paymentDueAt, approvedAt: null } });
    await cancelPendingBookingReminders(tx, row.id);
    await logChange(tx, { ...current, paymentDueAt }, 'PENDING_APPROVAL', 'PAYMENT_HOLD_REQUIRED', now);
    await expireLockedPaymentHold(tx, updated, now);
  });
}

export function startPaymentHoldScheduler(db = prisma) {
  let pending = null, stopped = false;
  const tick = () => {
    if (!stopped && !pending) pending = (async () => {
      const now = new Date();
      await adoptUnpaidReservations(db, now);
      await expirePaymentHolds(db, { now });
    })().catch(() => console.error('Payment hold expiry failed')).finally(() => { pending = null; });
  };
  tick(); const timer = setInterval(tick, 5000); timer.unref?.();
  return async () => { stopped = true; clearInterval(timer); await pending; };
}
