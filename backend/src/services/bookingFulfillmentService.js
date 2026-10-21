import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { validateVietnamAddress } from './addressService.js';
import { lockCurrentAccount } from './accountAccess.js';
import { preparationBookingWhere, occupiesWithTurnaround } from './planning/policyModel.js';
import { applyOperationalStatusChange } from './resourceService.js';
import { assertCareReady } from './resourceCareAccounting.js';
import { assertBookingTrainingEligibility } from './trainingEligibilityService.js';
import { notifyBookingEvent } from './bookingEventService.js';
import { cancelPendingBookingReminders } from './notificationService.js';
import { recordSystemAuditEvent } from './systemAuditService.js';
import { bookingRoomAccessCode } from './bookingRoomAccessCode.js';
import { lockPaymentBooking } from './bookingPaymentHoldService.js';

export const HANDOVER_EARLY_MINUTES = 30;
export const fulfillmentInputSchema = z.object({
  mode: z.enum(['LAB_PICKUP', 'HOME_DELIVERY']),
  address: z.object({ addressLine: z.string().trim().min(5).max(300), provinceCode: z.string().regex(/^\d+$/), wardCode: z.string().regex(/^\d+$/) }).strict().optional()
}).strict();
export const fulfillmentSettingSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  roomPassword: z.string().trim().min(6).max(64).optional(),
  deliveryAllowed: z.boolean(),
  pickupInstructions: z.string().trim().max(500)
}).strict();
function roomKey() {
  const key = Buffer.from(process.env.ROOM_ACCESS_SECRET_KEY || '', 'base64');
  if (key.length !== 32) throw new HttpError(503, 'Chưa cấu hình khóa truy cập phòng.', undefined, 'ROOM_ACCESS_NOT_CONFIGURED');
  return key;
}
function encryptPassword(password, resourceId) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', roomKey(), iv);
  cipher.setAAD(Buffer.from(resourceId));
  const data = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(value => value.toString('base64')).join('.');
}
export function assertHandoverWindow(booking, now = new Date()) {
  const availableAt = new Date(+booking.startAt - HANDOVER_EARLY_MINUTES * 60000);
  if (now < availableAt) throw new HttpError(409, 'Chưa đến giờ nhận tài nguyên. Có thể nhận trước lịch tối đa 30 phút.', { availableAt: availableAt.toISOString() }, 'BOOKING_HANDOVER_TOO_EARLY');
  if (now >= booking.endAt) throw new HttpError(409, 'Lịch sử dụng đã kết thúc.', undefined, 'BOOKING_HANDOVER_EXPIRED');
}
export async function assertBookingPaid(tx, booking) {
  if (booking.feeAmountVnd === 0) return;
  const paid = await tx.paymentTransaction.findFirst({ where: {
    bookingId: booking.id, userId: booking.requestedById, status: 'success', currency: 'VND',
    amount: booking.feeAmountVnd, paidAt: { not: null }, provider: { in: ['vnpay', 'vietqr'] }, reconciliationStatus: 'none'
  } });
  if (!paid) throw new HttpError(409, 'Lịch đặt cần thanh toán đủ phí trước khi nhận tài nguyên.', undefined, 'BOOKING_PAYMENT_REQUIRED');
}
export async function assertHandoverReady(tx, booking, now) {
  const physical = await tx.resource.findUniqueOrThrow({ where: { id: booking.resourceId } });
  if (physical.laboratoryId) await tx.$queryRaw`SELECT id FROM laboratories WHERE id = ${physical.laboratoryId} FOR SHARE`;
  const laboratory = physical.laboratoryId ? await tx.laboratory.findUnique({ where: { id: physical.laboratoryId } }) : null;
  if (!laboratory?.isActive || physical.bookingState !== 'bookable') throw new HttpError(409, 'LAB chưa sẵn sàng.', undefined, 'RESOURCE_STATE_CONFLICT');
  await assertCareReady(tx, booking.resourceId, now);
  await assertBookingTrainingEligibility(tx, { userId: booking.requestedById, resourceId: booking.resourceId, now });
  const maintenance = await tx.maintenanceWindow.findFirst({ where: { resourceId: booking.resourceId, status: { in: ['scheduled','in_progress'] }, startAt: { lt: booking.endAt }, endAt: { gt: now } } });
  const conflicting = await tx.booking.findFirst({ where: { resourceId: booking.resourceId, id: { not: booking.id }, schedulingReleasedAt: null,
    OR: [{ status: 'CHECKED_OUT' }, { status: { in: ['PENDING_APPROVAL','CONFIRMED','RETURNED'] }, startAt: { lt: booking.endAt }, endAt: { gt: now } }] } });
  const preparation = await tx.booking.findMany({ where: { resourceId: booking.resourceId, id: { not: booking.id }, ...preparationBookingWhere(now, booking.endAt) } });
  if (maintenance || conflicting || preparation.some(row => occupiesWithTurnaround(row, now, booking.endAt))) throw new HttpError(409, 'Tài nguyên đang được giữ lịch, sử dụng hoặc bảo trì.', undefined, 'BOOKING_CONFLICT');
}
export async function getFulfillmentSetting(resourceId, db = prisma) {
  const resource = await db.resource.findUnique({ where: { id: resourceId }, select: { category: true, location: true } });
  if (!resource) throw new HttpError(404, 'Resource not found', undefined, 'NOT_FOUND');
  const row = await db.resourceFulfillment.findUnique({ where: { resourceId } });
  return { resourceId, category: resource.category, version: row?.version || 0,
    roomAccessConfigured: resource.category === 'ROOM', roomAccessPolicy: resource.category === 'ROOM' ? 'BOOKING_PHONE' : null, deliveryAllowed: row?.deliveryAllowed || false,
    deliveryFeeVnd: 0, deliveryProvider: 'INTERNAL', pickupInstructions: row?.pickupInstructions || resource.location };
}
export async function configureFulfillment(resourceId, actor, input, db = prisma) {
  if (actor.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
  const data = fulfillmentSettingSchema.parse(input);
  return db.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new HttpError(404, 'Resource not found', undefined, 'NOT_FOUND');
    const previous = await tx.resourceFulfillment.findUnique({ where: { resourceId } });
    if ((previous?.version || 0) !== data.expectedVersion) throw new HttpError(409, 'Cấu hình vừa thay đổi. Hãy tải lại.', undefined, 'CONFIGURATION_CHANGED');
    if (data.roomPassword && resource.category !== 'ROOM') throw new HttpError(400, 'Chỉ phòng có mật khẩu truy cập.', undefined, 'VALIDATION_ERROR');
    if (data.deliveryAllowed && !['EQUIPMENT','EXPERIMENT_KIT'].includes(resource.category)) throw new HttpError(400, 'Chỉ thiết bị và bộ thí nghiệm được giao tại nhà.', undefined, 'VALIDATION_ERROR');
    const changes = { deliveryAllowed: data.deliveryAllowed, pickupInstructions: data.pickupInstructions || null,
      version: data.expectedVersion + 1, ...(data.roomPassword ? { roomPasswordCiphertext: encryptPassword(data.roomPassword, resourceId) } : {}) };
    await tx.resourceFulfillment.upsert({ where: { resourceId }, create: { resourceId, ...changes }, update: changes });
    await recordSystemAuditEvent(tx, { actor, action: 'RESOURCE_FULFILLMENT_CONFIGURED', targetType: 'RESOURCE', targetId: resourceId,
      resourceId, labId: resource.laboratoryId, afterState: { deliveryAllowed: data.deliveryAllowed, version: changes.version, roomPasswordChanged: Boolean(data.roomPassword) } });
    return getFulfillmentSetting(resourceId, tx);
  });
}
export async function bookingFulfillmentSnapshot(tx, resource, input) {
  const setting = await getFulfillmentSetting(resource.id, tx);
  if (resource.category === 'ROOM') {
    if (input) throw new HttpError(400, 'Phòng dùng check-in tại LAB.', undefined, 'VALIDATION_ERROR');
    return { mode: 'ROOM_SELF_SERVICE', pickupInstructions: setting.pickupInstructions };
  }
  const selected = input ? fulfillmentInputSchema.parse(input) : { mode: 'LAB_PICKUP' };
  if (selected.mode === 'HOME_DELIVERY') {
    if (!setting.deliveryAllowed) throw new HttpError(409, 'Tài nguyên này chỉ nhận tại LAB.', undefined, 'DELIVERY_UNAVAILABLE');
    if (!selected.address) throw new HttpError(400, 'Cần địa chỉ nhận thiết bị.', { field: 'fulfillment.address' }, 'DELIVERY_ADDRESS_REQUIRED');
    return { mode: selected.mode, address: await validateVietnamAddress(selected.address), deliveryFeeVnd: 0, deliveryProvider: 'INTERNAL', configurationVersion: setting.version };
  }
  if (selected.address) throw new HttpError(400, 'Nhận tại LAB không dùng địa chỉ giao hàng.', undefined, 'VALIDATION_ERROR');
  return { mode: 'LAB_PICKUP', pickupInstructions: setting.pickupInstructions };
}
export async function bookingAccess(bookingId, actor, db = prisma, now = new Date()) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { resource: true } });
  if (!booking || booking.requestedById !== actor.id) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
  if (!['CONFIRMED','CHECKED_OUT'].includes(booking.status) || (booking.status === 'CONFIRMED' && now >= booking.endAt)) throw new HttpError(409, 'Lịch không còn cho phép nhận tài nguyên.', undefined, 'BOOKING_INVALID_TRANSITION');
  await assertBookingPaid(db, booking);
  const setting = await getFulfillmentSetting(booking.resourceId, db);
  const roomCode = booking.resource.category === 'ROOM' ? bookingRoomAccessCode(booking) : null;
  const availableAt = new Date(+booking.startAt - HANDOVER_EARLY_MINUTES * 60000);
  return { mode: booking.resource.category === 'ROOM' ? 'ROOM_SELF_SERVICE' : 'LAB_PICKUP',
    ...(booking.fulfillmentSnapshot || {}), availableAt, canCheckIn: booking.status === 'CONFIRMED' && now >= availableAt,
    roomPassword: now < booking.endAt ? roomCode : null, roomAccessPolicy: booking.resource.category === 'ROOM' ? 'BOOKING_PHONE' : null,
    roomAccessConfigured: booking.resource.category === 'ROOM' ? Boolean(roomCode) : setting.roomAccessConfigured, pickupInstructions: booking.fulfillmentSnapshot?.pickupInstructions || setting.pickupInstructions };
}
export async function selfCheckInRoom({ bookingId, actor }, db = prisma, clock = () => new Date()) {
  return db.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    await lockPaymentBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { resource: true } });
    if (!booking || booking.requestedById !== actor.id) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
    if (booking.resource.category !== 'ROOM') throw new HttpError(403, 'Thiết bị cần nhân viên bàn giao.', undefined, 'FORBIDDEN');
    if (booking.status === 'CHECKED_OUT') return booking;
    if (booking.status !== 'CONFIRMED') throw new HttpError(409, 'Không thể check-in lịch này.', undefined, 'BOOKING_INVALID_TRANSITION');
    const now = clock(); assertHandoverWindow(booking, now); await assertBookingPaid(tx, booking);
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${booking.resourceId} FOR UPDATE`;
    const physical = await tx.resource.findUniqueOrThrow({ where: { id: booking.resourceId } });
    if (!bookingRoomAccessCode(booking)) throw new HttpError(409, 'Lịch đặt thiếu số điện thoại hợp lệ. Liên hệ LAB.', undefined, 'ROOM_ACCESS_NOT_CONFIGURED');
    if (physical.operationalStatus !== 'AVAILABLE' || physical.bookingState !== 'bookable') throw new HttpError(409, 'Phòng chưa sẵn sàng.', undefined, 'RESOURCE_STATE_CONFLICT');
    await assertHandoverReady(tx, booking, now);
    await applyOperationalStatusChange(tx, { resourceId: booking.resourceId, operationalStatus: 'IN_USE', actor, bookingId, reason: 'Owner checked in', lockResource: false });
    const result = await tx.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_OUT', actualStartAt: now, handoverCondition: 'Owner self check-in' }, include: { resource: true } });
    await tx.usageLog.create({ data: { id: crypto.randomUUID(), resourceId: booking.resourceId, bookingId, userId: actor.id, actorType: 'USER', action: 'CHECK_OUT', fromStatus: 'CONFIRMED', toStatus: 'CHECKED_OUT', metadata: { selfCheckIn: true }, message: 'Owner self check-in', createdAt: now } });
    await cancelPendingBookingReminders(tx, bookingId, ['BOOKING_UPCOMING']);
    await notifyBookingEvent(tx, result, 'CHECKED_OUT', { includeOwner: true, now });
    return result;
  });
}
