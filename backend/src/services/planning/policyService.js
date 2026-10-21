import crypto from 'node:crypto';
import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errors.js';
import { lockCurrentAccount } from '../accountAccess.js';
import { checkLabPolicyCompliance } from '../availabilityService.js';
import { recordSystemAuditEvent } from '../systemAuditService.js';
import { policyInput, policySnapshot } from './policyModel.js';

export async function changePolicy(actor, laboratoryId, body, preview = false) {
  const input = policyInput.parse(body);
  return prisma.$transaction(async tx => {
    const current = await lockCurrentAccount(tx, actor.id, actor.authVersion);
    if (current.role !== 'ADMIN') throw new HttpError(403, 'Administrator required', undefined, 'FORBIDDEN');
    await tx.$queryRaw`SELECT id FROM laboratories WHERE id = ${laboratoryId} FOR UPDATE`;
    const lab = await tx.laboratory.findUnique({ where: { id: laboratoryId }, include: { labPolicy: true } });
    if (!lab) throw new HttpError(404, 'Laboratory not found', undefined, 'NOT_FOUND');
    const before = policySnapshot(lab.labPolicy);
    if (input.expectedRevision !== before.revision) throw new HttpError(409, 'Reload policy', undefined, 'LAB_POLICY_CHANGED');
    const { expectedRevision, reason, ...fields } = input;
    const after = { ...fields, revision: expectedRevision + 1 };
    if (preview) {
      const where = { resource: { laboratoryId }, startAt: { gt: new Date() }, status: { in: ['CONFIRMED','PENDING_APPROVAL'] }, schedulingReleasedAt: null };
      const total = await tx.booking.count({ where });
      const rows = await tx.booking.findMany({ where, take: 500, orderBy: { startAt: 'asc' }, select: { id: true, title: true, startAt: true, endAt: true } });
      const affected = rows.flatMap(row => {
        try { checkLabPolicyCompliance({ policy: after, startAt: row.startAt, endAt: row.endAt }); return []; }
        catch (error) { if (error.status >= 500) throw error; return [{ ...row, reason: error.code }]; }
      });
      return { before, after, affected, scanned: rows.length, total, truncated: total > rows.length,
        preservesExistingBookings: true, turnaroundAppliesToNewBookings: true };
    }
    const updated = await tx.labPolicy.upsert({ where: { laboratoryId },
      create: { id: crypto.randomUUID(), laboratoryId, ...after }, update: after });
    await recordSystemAuditEvent(tx, { actor: current, action: 'LAB_BOOKING_POLICY_CHANGED', targetType: 'LABORATORY', targetId: laboratoryId,
      labId: laboratoryId, beforeState: before, afterState: after, reason });
    return updated;
  });
}

export async function policyHistory(actor, laboratoryId) {
  if (actor.role !== 'ADMIN') throw new HttpError(403, 'Administrator required', undefined, 'FORBIDDEN');
  return prisma.systemAuditEvent.findMany({ where: { targetId: laboratoryId, action: 'LAB_BOOKING_POLICY_CHANGED' },
    orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, createdAt: true, reason: true, beforeState: true, afterState: true } });
}
