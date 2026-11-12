import crypto from 'node:crypto';
import { ADMIN } from '../constants/roles.js';
import { HttpError } from '../middleware/errors.js';
import { accountWrite } from './accountAccess.js';
import { minimumBookingNotice } from './bookingNoticePolicy.js';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from './systemAuditService.js';

export async function updateLabBookingNotice(actor, laboratoryId, input) {
  return accountWrite(actor, async (tx, current) => {
    if (current.role !== ADMIN) throw new HttpError(403, 'Administrator required', undefined, 'FORBIDDEN');
    await tx.$queryRaw`SELECT id FROM laboratories WHERE id = ${laboratoryId} FOR UPDATE`;
    const lab = await tx.laboratory.findUnique({ where: { id: laboratoryId }, include: { labPolicy: true } });
    if (!lab) throw new HttpError(404, 'Laboratory not found', undefined, 'NOT_FOUND');
    const before = minimumBookingNotice(lab.labPolicy);
    if (before !== input.expectedMinAdvanceBookingMinutes) throw new HttpError(409, 'Policy changed; reload', undefined, 'LAB_POLICY_CHANGED');
    if (input.minAdvanceBookingMinutes > (lab.labPolicy?.maxAdvanceBookingDays ?? 30) * 1440)
      throw new HttpError(400, 'Notice exceeds advance booking horizon', undefined, 'VALIDATION_ERROR');
    const updated = await tx.labPolicy.upsert({ where: { laboratoryId: lab.id },
      create: { id: crypto.randomUUID(), laboratoryId: lab.id, minAdvanceBookingMinutes: input.minAdvanceBookingMinutes },
      update: { minAdvanceBookingMinutes: input.minAdvanceBookingMinutes, revision: { increment: 1 } } });
    await recordSystemAuditEvent(tx, { actor, action: AUDIT_ACTIONS.LAB_BOOKING_POLICY_CHANGED, targetType: AUDIT_TARGET_TYPES.LABORATORY, targetId: lab.id, labId: lab.id,
      beforeState: { minAdvanceBookingMinutes: before }, afterState: { minAdvanceBookingMinutes: updated.minAdvanceBookingMinutes }, reason: input.reason });
    return updated;
  });
}
