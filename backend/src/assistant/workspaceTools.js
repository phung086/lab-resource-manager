import { prisma } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { CANONICAL_ROLES, STAFF_ROLES } from '../constants/roles.js';
import { resourceScope } from '../services/labWorkspaceService.js';
import { bookingScopeWhere } from '../services/workspaceQueueService.js';
import { staffCustomerSelect } from '../services/accountManagementService.js';
import { buildOperationsReport } from '../services/operationsReportService.js';

const text = { type: 'string', minLength: 1, maxLength: 120 };
const limit = { type: 'integer', minimum: 1, maximum: 20 };
const date = { type: 'string', format: 'date-time' };
const forbidden = () => { throw new HttpError(403, 'Forbidden', undefined, 'FORBIDDEN'); };
const definitions = [
  ['get_material_stock', 'Read current material stock in assigned LABs (ADMIN: all). Uninitialized stock is unknown.', { query: text, limit }, []],
  ['search_customers', 'Find CUSTOMER contact information allowed by account management. No passwords, addresses or financial details.', { query: text, limit }, []],
  ['get_lab_schedule', 'Read bookings overlapping a Vietnam-time interval. CUSTOMER: own; staff: assigned LABs; ADMIN: all. Returns complete matching totals and a bounded preview.', { startAt: date, endAt: date, resourceId: text, limit }, ['startAt', 'endAt']],
  ['get_operations_report', 'Read complete 7/30-day persisted operational totals within current staff scope. Scheduled time and declared actual use are separate.', { days: { type: 'integer', enum: [7, 30] } }, []]
];

/** All four reads use a fresh account and one scoped snapshot; no business writes. */
async function read(name, input, actor) {
  return prisma.$transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    if (!current?.isActive || current.deletedAt || current.passwordResetRequired || !CANONICAL_ROLES.includes(current.role) ||
        current.role !== actor.role || (actor.authVersion !== undefined && actor.authVersion !== current.authVersion)) forbidden();
    const operator = STAFF_ROLES.includes(current.role), take = input.limit || 10;
    if (name !== 'get_lab_schedule' && !operator) forbidden();
    const match = fields => input.query ? { OR: fields.map(field => ({ [field]: { contains: input.query, mode: 'insensitive' } })) } : {};
    if (name === 'get_material_stock') {
      const where = { category: 'MATERIAL', ...resourceScope(current), ...match(['code', 'name']) };
      const [total, items] = await Promise.all([tx.resource.count({ where }), tx.resource.findMany({ where,
        select: { id: true, code: true, name: true, laboratory: { select: { code: true, name: true } }, stockItem: { select: { unit: true, balance: true } } }, orderBy: [{ code: 'asc' }, { id: 'asc' }], take })]);
      return { kind: 'stock', total, items, limit: take, source: 'database' };
    }
    if (name === 'search_customers') {
      // ADR-034 explicitly grants staff global CUSTOMER account reads, without
      // granting access to those customers' foreign-LAB bookings or payments.
      const where = { role: 'CUSTOMER', deletedAt: null, ...match(['fullName', 'email', 'phone']) };
      const [total, items] = await Promise.all([tx.user.count({ where }), tx.user.findMany({ where, select: staffCustomerSelect,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take })]);
      return { kind: 'customers', total, items, limit: take, source: 'database' };
    }
    if (name === 'get_operations_report') {
      const result = await buildOperationsReport(tx, current, { days: input.days || 7 });
      return { kind: 'report', ...result, resources: result.resources.slice(0, 10), resourcePreviewLimit: 10 };
    }
    const startAt = new Date(input.startAt), endAt = new Date(input.endAt), now = new Date();
    if (!Number.isFinite(+startAt) || !Number.isFinite(+endAt) || startAt >= endAt || endAt - startAt > 31 * 86400000)
      throw new HttpError(400, 'Invalid interval', undefined, 'VALIDATION_ERROR');
    const where = { ...bookingScopeWhere(current), ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      startAt: { lt: endAt }, endAt: { gt: startAt },
      NOT: { status: 'PENDING_APPROVAL', paymentDueAt: { lte: now } } };
    const [total, counts, items, awaitingPayment] = await Promise.all([tx.booking.count({ where }),
      tx.booking.groupBy({ by: ['status'], where, _count: { _all: true } }),
      tx.booking.findMany({ where, select: { id: true, bookingCode: true, title: true, status: true, paymentDueAt: true, startAt: true, endAt: true,
        resource: { select: { id: true, code: true, name: true } }, ...(operator ? { requestedBy: { select: { id: true, fullName: true } } } : {}) },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }], take }),
      tx.booking.count({ where: { ...where, status: 'PENDING_APPROVAL', paymentDueAt: { not: null } } })]);
    return { kind: 'schedule', total, counts: counts.map(row => ({ status: row.status, count: row._count._all })), awaitingPayment, items, limit: take,
      startAt: startAt.toISOString(), endAt: endAt.toISOString(), timezone: 'Asia/Ho_Chi_Minh', source: 'database' };
  }, { isolationLevel: 'RepeatableRead', timeout: 8000 });
}

export const workspaceAssistantTools = definitions.map(([name, description, properties, required]) => ({ name, description,
  inputSchema: { type: 'object', properties, required, additionalProperties: false }, readOnly: true,
  handler: (input, actor) => read(name, input, actor) }));
