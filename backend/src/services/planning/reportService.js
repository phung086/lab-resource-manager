import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errors.js';

export async function planningReport(actor, days = 30) {
  if (!['ADMIN','LAB_STAFF'].includes(actor.role)) throw new HttpError(403, 'Operator required', undefined, 'FORBIDDEN');
  const from = new Date(Date.now() - days * 86400000), to = new Date();
  const scope = actor.role === 'LAB_STAFF' ? { laboratory: { staffAssignments: { some: { userId: actor.id } } } } : {};
  const where = { resource: scope, createdAt: { gte: from, lte: to } };
  const total = await prisma.booking.count({ where });
  if (total > 10000) throw new HttpError(400, 'Select a shorter reporting period', undefined, 'REPORT_RANGE_TOO_LARGE');
  const rows = await prisma.booking.findMany({ where, select: { status: true, startAt: true, endAt: true, actualStartAt: true, actualEndAt: true,
    resourceId: true, resource: { select: { name: true, code: true } } } });
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })), resources = new Map();
  for (const row of rows) {
    hours[new Date(+row.startAt + 7 * 3600000).getUTCHours()].count++;
    const item = resources.get(row.resourceId) || { id: row.resourceId, ...row.resource, bookings: 0, cancelled: 0, completed: 0, declaredHours: 0 };
    item.bookings++; item.cancelled += Number(row.status === 'CANCELLED'); item.completed += Number(row.status === 'COMPLETED');
    if (row.actualStartAt && row.actualEndAt) item.declaredHours += Math.max(0, +row.actualEndAt - +row.actualStartAt) / 3600000;
    resources.set(row.resourceId, item);
  }
  const maintenance = await prisma.maintenanceWindow.count({ where: { resource: scope, startAt: { lt: to }, endAt: { gt: from } } });
  return { from, to, total, cancelled: rows.filter(row => row.status === 'CANCELLED').length,
    completed: rows.filter(row => row.status === 'COMPLETED').length, maintenance,
    hours, resources: [...resources.values()].sort((a,b) => b.bookings - a.bookings),
    basis: 'BOOKINGS_CREATED_IN_PERIOD', usageSource: 'RECORDED_HANDOVER_RETURN' };
}
