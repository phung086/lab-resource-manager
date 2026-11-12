import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errors.js';
import { assertBookingAccess } from '../../middleware/labScope.js';
import { lockCurrentAccount } from '../accountAccess.js';

// Stable keys keep evidence readable after translation or wording changes.
export const checklistTemplates = Object.freeze({
  HANDOVER: ['identity','condition','instructions'],
  RETURN: ['items','condition','incident'],
  INSPECTION: ['condition','accessories','followup']
});
const checklistInput = z.object({ stage: z.enum(['HANDOVER','RETURN','INSPECTION']),
  items: z.array(z.string()).min(3).max(3), notes: z.string().trim().min(5).max(2000) }).strict();

export async function getDossier(actor, bookingId) {
  await assertBookingAccess(actor, bookingId);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: {
    resource: { select: { id: true, code: true, name: true, category: true } },
    checklistEntries: { orderBy: { createdAt: 'asc' } },
    usageLogs: { orderBy: { createdAt: 'asc' }, select: { id: true, action: true, fromStatus: true, toStatus: true, createdAt: true, reason: true, conditionBefore: true, conditionAfter: true } },
    incidents: { select: { id: true, title: true, status: true } }
  } });
  return { booking, templates: checklistTemplates, evidenceSource: 'USER_DECLARATION', hardwareVerified: false };
}
export async function recordChecklist(actor, bookingId, body) {
  const input = checklistInput.parse(body), expected = checklistTemplates[input.stage];
  if (new Set(input.items).size !== expected.length || expected.some(key => !input.items.includes(key)))
    throw new HttpError(400, 'Complete every checklist item', undefined, 'CHECKLIST_INCOMPLETE');
  return prisma.$transaction(async tx => {
    const current = await lockCurrentAccount(tx, actor.id, actor.authVersion);
    const pointer = await tx.booking.findUnique({ where: { id: bookingId }, select: { resourceId: true } });
    if (!pointer) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${pointer.resourceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { resource: true } });
    if (current.role === 'LAB_STAFF') {
      const rows = await tx.$queryRaw`SELECT "userId" FROM user_lab_assignments WHERE "userId" = ${current.id} AND "laboratoryId" = ${booking.resource.laboratoryId} FOR SHARE`;
      if (!rows.length) throw new HttpError(403, 'Laboratory scope required', undefined, 'FORBIDDEN');
    } else if (current.role !== 'ADMIN') {
      if (booking.requestedById !== current.id) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
      if (input.stage !== 'RETURN') throw new HttpError(403, 'Operator required', undefined, 'FORBIDDEN');
    }
    const statuses = { HANDOVER: ['CONFIRMED','CHECKED_OUT'], RETURN: ['CHECKED_OUT','RETURNED'], INSPECTION: ['RETURNED'] };
    if (!statuses[input.stage].includes(booking.status)) throw new HttpError(409, 'Checklist does not match current stage', undefined, 'BOOKING_INVALID_TRANSITION');
    const existing = await tx.bookingChecklistEntry.findUnique({ where: { bookingId_stage: { bookingId, stage: input.stage } } });
    if (existing) throw new HttpError(409, 'Evidence already recorded', undefined, 'CHECKLIST_RECORDED');
    const entry = await tx.bookingChecklistEntry.create({ data: { id: crypto.randomUUID(), bookingId, actorId: current.id,
      stage: input.stage, items: input.items, notes: input.notes } });
    await tx.usageLog.create({ data: { id: crypto.randomUUID(), resourceId: booking.resourceId, bookingId, userId: current.id,
      action: 'STATUS_CHANGE', message: `Checklist ${input.stage}`, metadata: { checklistId: entry.id, stage: input.stage, source: 'USER_DECLARATION' } } });
    return entry;
  });
}
