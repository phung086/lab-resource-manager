import crypto from 'node:crypto';
import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errors.js';
import { lockCurrentAccount } from '../accountAccess.js';
import { preflightBooking } from '../bookingService.js';
import { planInput } from './bundleService.js';

export async function joinWaitlist(actor, body) {
  const input = planInput.parse(body);
  if (input.resourceIds.length !== 1) throw new HttpError(400, 'Waitlist accepts one resource', undefined, 'VALIDATION_ERROR');
  const startAt = new Date(input.startAt), endAt = new Date(input.endAt), resourceId = input.resourceIds[0];
  if (+startAt < Date.now() + 30 * 60000 || +startAt > Date.now() + 90 * 86400000)
    throw new HttpError(400, 'Waitlist requires a future interval within 90 days', undefined, 'VALIDATION_ERROR');
  // A waitlist may tolerate a time conflict, but not missing qualifications,
  // scope or an invalid policy. Validate those through the real booking flow.
  try { await preflightBooking(actor, { ...input, resourceId }); }
  catch (error) { if (!['BOOKING_CONFLICT','RESOURCE_CONFLICT','MAINTENANCE_CONFLICT'].includes(error.code)) throw error; }
  return prisma.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    const existing = await tx.bookingWaitlist.findUnique({ where: { userId_resourceId_startAt_endAt: { userId: actor.id, resourceId, startAt, endAt } } });
    if (existing?.status === 'WAITING') return existing;
    const count = await tx.bookingWaitlist.count({ where: { userId: actor.id, status: 'WAITING' } });
    if (count >= 20) throw new HttpError(409, 'Maximum 20 active interests', undefined, 'WAITLIST_LIMIT');
    return tx.bookingWaitlist.upsert({ where: { userId_resourceId_startAt_endAt: { userId: actor.id, resourceId, startAt, endAt } },
      create: { id: crypto.randomUUID(), userId: actor.id, resourceId, startAt, endAt, purposeCode: input.purposeCode },
      update: { status: 'WAITING', notifiedAt: null, purposeCode: input.purposeCode } });
  });
}
export async function cancelWaitlist(actor, id) {
  return prisma.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    const result = await tx.bookingWaitlist.updateMany({ where: { id, userId: actor.id, status: { in: ['WAITING','NOTIFIED'] } }, data: { status: 'CANCELLED' } });
    if (!result.count) throw new HttpError(404, 'Interest not found', undefined, 'NOT_FOUND');
    return { cancelled: true };
  });
}
export async function listWaitlist(actor) {
  const items = await prisma.bookingWaitlist.findMany({ where: { userId: actor.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  const resources = await prisma.resource.findMany({ where: { id: { in: items.map(row => row.resourceId) } }, select: { id: true, code: true, name: true } });
  return items.map(row => ({ ...row, resource: resources.find(resource => resource.id === row.resourceId) }));
}
export async function dispatchWaitlist() {
  const now = new Date();
  await prisma.bookingWaitlist.updateMany({ where: { status: { in: ['WAITING','NOTIFIED'] }, startAt: { lte: now } }, data: { status: 'EXPIRED' } });
  // oldest checked first, then rotate checked interests to avoid starvation.
  const rows = await prisma.bookingWaitlist.findMany({ where: { status: 'WAITING' }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: 20 });
  for (const row of rows) {
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || !user.isActive || user.deletedAt) {
      await prisma.bookingWaitlist.updateMany({ where: { id: row.id, status: 'WAITING' }, data: { status: 'CANCELLED' } });
      continue;
    }
    try {
      await preflightBooking(user, { resourceId: row.resourceId, startAt: row.startAt, endAt: row.endAt, purposeCode: row.purposeCode });
    } catch (error) {
      if (![400,401,403,404,409].includes(error.status)) throw error;
      await prisma.bookingWaitlist.updateMany({ where: { id: row.id, status: 'WAITING' }, data: { updatedAt: now, ...(error.code === 'BOOKING_NOTICE_REQUIRED' ? { status: 'EXPIRED' } : {}) } });
      continue;
    }
    await prisma.$transaction(async tx => {
      const changed = await tx.bookingWaitlist.updateMany({ where: { id: row.id, status: 'WAITING' }, data: { status: 'NOTIFIED', notifiedAt: now } });
      if (!changed.count) return;
      await tx.notification.create({ data: { id: crypto.randomUUID(), userId: row.userId, type: 'WAITLIST_AVAILABLE',
        title: 'Có khung giờ phù hợp', message: 'Khung giờ bạn theo dõi hiện có thể đặt. Vui lòng kiểm tra lại trước khi xác nhận; thông báo không giữ chỗ.',
        titleKey: 'planning.waitlistAvailable', messageKey: 'planning.waitlistMessage',
        messageParams: { resourceId: row.resourceId, startAt: row.startAt.toISOString() }, severity: 'info', channel: 'in_app', sentAt: now,
        dedupeKey: `waitlist:${row.id}:${now.getTime()}` } });
    });
  }
}
export function startWaitlistScheduler() {
  let running = null;
  const timer = setInterval(() => {
    if (!running) running = dispatchWaitlist().catch(error => console.warn('Waitlist dispatch failed', error.code || 'UNAVAILABLE')).finally(() => { running = null; });
  }, 60000);
  timer.unref();
  return () => { clearInterval(timer); return running || Promise.resolve(); };
}
