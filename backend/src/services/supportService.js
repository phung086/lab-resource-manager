import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { ADMIN, LAB_STAFF, CUSTOMER } from '../constants/roles.js';
import { lockCurrentAccount } from './accountAccess.js';

export const SUPPORT_CATEGORIES = ['BOOKING', 'PAYMENT', 'ACCOUNT', 'RESOURCE', 'OTHER'];
export const SUPPORT_STATUSES = ['WAITING', 'ACTIVE', 'CLOSED', 'CANCELLED'];
export const SUPPORT_PRESENCE_TTL_MS = 45_000;
const person = { id: true, fullName: true, role: true };
const include = { requester: { select: person }, assignedStaff: { select: person }, laboratory: { select: { id: true, name: true, code: true } } };
const missing = () => new HttpError(404, 'NOT_FOUND', undefined, 'NOT_FOUND');
const fail = (code, details) => { throw new HttpError(409, code, details, code); };
const operator = actor => {
  if (actor.role !== LAB_STAFF) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
};
const event = (tx, sessionId, eventType, senderId) => tx.supportMessage.create({ data: { id: randomUUID(), sessionId, senderId, kind: 'SYSTEM', body: '', eventType } });
const lockDispatch = tx => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('support:dispatch'))::text`;
const lockSession = (tx, id) => tx.$queryRaw`SELECT id FROM support_sessions WHERE id = ${id} FOR UPDATE`;

export function createSupportService(db = prisma, clock = () => new Date()) {
  async function labs(tx, actor) {
    if (actor.role !== LAB_STAFF) return null;
    return (await tx.userLabAssignment.findMany({ where: { userId: actor.id }, select: { laboratoryId: true } })).map(row => row.laboratoryId);
  }
  async function readScope(tx, actor) {
    if (actor.role === ADMIN) return {};
    if (actor.role !== LAB_STAFF) return { requesterId: actor.id };
    return { laboratoryId: { in: await labs(tx, actor) }, OR: [{ assignedStaffId: actor.id }, { status: 'WAITING' }] };
  }
  async function sessionFor(tx, actor, id, { detail = true } = {}) {
    const row = await tx.supportSession.findUnique({ where: { id }, include });
    if (!row) throw missing();
    if (actor.role === ADMIN) return row;
    if (actor.role === LAB_STAFF) {
      if (!(await labs(tx, actor)).includes(row.laboratoryId) || (detail && row.assignedStaffId !== actor.id)) throw missing();
    } else if (row.requesterId !== actor.id) throw missing();
    return row;
  }
  // One database lock coordinates requests, presence, completion and assignment
  // across all processes. Each staff member has at most one active conversation.
  async function dispatch(tx) {
    const now = clock();
    const ready = await tx.supportPresence.findMany({
      where: { accepting: true, lastSeenAt: { gt: new Date(now.getTime() - SUPPORT_PRESENCE_TTL_MS) }, user: { isActive: true, role: LAB_STAFF, passwordResetRequired: false } },
      include: { user: { select: { labAssignments: { select: { laboratoryId: true } } } } },
      orderBy: [{ lastAssignedAt: { sort: 'asc', nulls: 'first' } }, { userId: 'asc' }],
    });
    const busy = new Set((await tx.supportSession.findMany({ where: { status: 'ACTIVE' }, select: { assignedStaffId: true } })).map(row => row.assignedStaffId));
    const idle = ready.filter(row => !busy.has(row.userId) && row.user.labAssignments.length);
    for (const agent of idle) {
      const next = await tx.supportSession.findFirst({
        where: { status: 'WAITING', laboratoryId: { in: agent.user.labAssignments.map(row => row.laboratoryId) }, laboratory: { isActive: true }, requester: { isActive: true } },
        orderBy: { ordinal: 'asc' },
      });
      if (!next) continue;
      await tx.supportSession.update({ where: { id: next.id }, data: { status: 'ACTIVE', assignedStaffId: agent.userId, assignedAt: now } });
      await tx.supportPresence.update({ where: { userId: agent.userId }, data: { lastAssignedAt: now } });
      await event(tx, next.id, 'ASSIGNED', agent.userId);
    }
  }
  async function publicSession(tx, row) {
    const queuePosition = row.status === 'WAITING' ? 1 + await tx.supportSession.count({ where: { laboratoryId: row.laboratoryId, status: 'WAITING', ordinal: { lt: row.ordinal } } }) : null;
    const presence = row.assignedStaffId ? await tx.supportPresence.findUnique({ where: { userId: row.assignedStaffId } }) : null;
    const { requestFingerprint: _fingerprint, ...safe } = row;
    return { ...safe, queuePosition, staffConnected: Boolean(presence && presence.lastSeenAt > new Date(clock().getTime() - SUPPORT_PRESENCE_TTL_MS)) };
  }
  async function metadata(actor) {
    const scope = actor.role === LAB_STAFF ? { id: { in: await labs(db, actor) } } : {};
    const laboratoryRows = await db.laboratory.findMany({ where: { ...scope, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { code: 'asc' } });
    const presence = actor.role === LAB_STAFF ? await db.supportPresence.findUnique({ where: { userId: actor.id } }) : null;
    return { laboratories: laboratoryRows, presence, pollIntervalMs: 2000, heartbeatIntervalMs: 15_000, quickReplies: ['booking', 'payment', 'account', 'resource', 'details'].map(id => ({ id, titleKey: `support.quick.${id}.title`, bodyKey: `support.quick.${id}.body` })) };
  }
  async function list(actor, filters) {
    return db.$transaction(async tx => {
      const scope = await readScope(tx, actor);
      const where = { AND: [scope, filters.status ? { status: filters.status } : {}, filters.laboratoryId ? { laboratoryId: filters.laboratoryId } : {}] };
      const [rows, total, counts, active] = await Promise.all([
        tx.supportSession.findMany({ where, include, orderBy: { ordinal: filters.status === 'WAITING' ? 'asc' : 'desc' }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
        tx.supportSession.count({ where }), tx.supportSession.groupBy({ by: ['status'], where: scope, _count: true }),
        actor.role === ADMIN ? null : tx.supportSession.findFirst({ where: { AND: [scope, actor.role === LAB_STAFF ? { status: 'ACTIVE', assignedStaffId: actor.id } : { status: { in: ['WAITING', 'ACTIVE'] } }] }, include }),
      ]);
      return { activeSession: active ? await publicSession(tx, active) : null, items: await Promise.all(rows.map(row => publicSession(tx, row))), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) }, summary: Object.fromEntries(counts.map(row => [row.status, row._count])) };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async function detail(actor, id, after = 0, before) {
    return db.$transaction(async tx => {
      const row = await sessionFor(tx, actor, id);
      const messages = await tx.supportMessage.findMany({
        where: { sessionId: id, sequence: before ? { lt: before } : { gt: after } }, include: { sender: { select: person } }, orderBy: { sequence: before ? 'desc' : 'asc' }, take: 101,
      });
      const hasMore = messages.length > 100, page = messages.slice(0, 100);
      if (before) page.reverse();
      return { session: await publicSession(tx, row), messages: page, hasMore, nextCursor: before ? page[0]?.sequence || before : page.at(-1)?.sequence || after };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async function request(actor, data, transcript = []) {
    if (![CUSTOMER].includes(actor.role)) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
    const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return db.$transaction(async tx => {
      await lockDispatch(tx);
      await lockCurrentAccount(tx, actor.id, actor.authVersion);
      const existing = await tx.supportSession.findUnique({ where: { id: data.requestId }, include });
      if (existing) {
        if (existing.requesterId !== actor.id || existing.requestFingerprint !== fingerprint) fail('SUPPORT_REQUEST_CHANGED');
        return publicSession(tx, existing);
      }
      const open = await tx.supportSession.findFirst({ where: { requesterId: actor.id, status: { in: ['WAITING', 'ACTIVE'] } } });
      if (open) fail('SUPPORT_ALREADY_OPEN', { sessionId: open.id });
      const lab = await tx.laboratory.findUnique({ where: { id: data.laboratoryId } });
      if (!lab?.isActive) throw missing();
      const staffed = await tx.userLabAssignment.count({ where: { laboratoryId: lab.id, user: { role: LAB_STAFF, isActive: true } } });
      if (!staffed) fail('SUPPORT_NO_STAFF');
      // Resolve temporary AI context only for a new request. A committed, same-
      // content retry remains valid after its original assistant context expires.
      const sharedTranscript = typeof transcript === 'function' ? transcript() : transcript;
      await tx.supportSession.create({ data: { id: data.requestId, laboratoryId: lab.id, requesterId: actor.id, category: data.category, subject: data.message.slice(0, 160), requestFingerprint: fingerprint } });
      for (const turn of sharedTranscript) {
        await tx.supportMessage.create({ data: { id: randomUUID(), sessionId: data.requestId, senderId: turn.kind === 'CUSTOMER' ? actor.id : null, kind: turn.kind, body: turn.body, source: 'AI_HANDOFF', createdAt: new Date(turn.createdAt) } });
      }
      await tx.supportMessage.create({ data: { id: randomUUID(), sessionId: data.requestId, senderId: actor.id, kind: 'CUSTOMER', body: data.message } });
      await event(tx, data.requestId, 'REQUESTED', actor.id);
      await dispatch(tx);
      return publicSession(tx, await tx.supportSession.findUnique({ where: { id: data.requestId }, include }));
    }, { timeout: 15_000 });
  }
  async function heartbeat(actor, accepting) {
    operator(actor);
    return db.$transaction(async tx => {
      await lockDispatch(tx);
      if (!(await labs(tx, actor)).length) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
      const presence = await tx.supportPresence.upsert({ where: { userId: actor.id }, create: { userId: actor.id, accepting: accepting ?? false, lastSeenAt: clock() }, update: { ...(accepting === undefined ? {} : { accepting }), lastSeenAt: clock() } });
      await dispatch(tx);
      return presence;
    });
  }
  async function send(actor, id, data) {
    return db.$transaction(async tx => {
      await lockSession(tx, id);
      const row = await sessionFor(tx, actor, id);
      if (actor.role === ADMIN) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
      const existing = await tx.supportMessage.findUnique({ where: { id: data.messageId }, include: { sender: { select: person } } });
      if (existing) {
        if (existing.sessionId !== id || existing.senderId !== actor.id || existing.body !== data.body || existing.source !== 'CHAT') fail('SUPPORT_MESSAGE_CHANGED');
        return existing;
      }
      if (!['WAITING', 'ACTIVE'].includes(row.status)) fail('SUPPORT_SESSION_CLOSED');
      if (actor.role === LAB_STAFF && (row.status !== 'ACTIVE' || row.assignedStaffId !== actor.id)) throw missing();
      const message = await tx.supportMessage.create({ data: { id: data.messageId, sessionId: id, senderId: actor.id, kind: actor.role === LAB_STAFF ? 'STAFF' : 'CUSTOMER', body: data.body }, include: { sender: { select: person } } });
      await tx.supportSession.update({ where: { id }, data: { updatedAt: clock() } });
      return message;
    });
  }
  async function transition(actor, id, action, reason) {
    return db.$transaction(async tx => {
      await lockDispatch(tx); await lockSession(tx, id);
      const row = await sessionFor(tx, actor, id);
      if (action === 'finish') {
        operator(actor);
        if (row.status === 'CLOSED') return publicSession(tx, row);
        if (row.status !== 'ACTIVE' || row.assignedStaffId !== actor.id) fail('SUPPORT_INVALID_TRANSITION');
      } else if (action === 'cancel') {
        if (row.requesterId !== actor.id) throw missing();
        if (row.status === 'CANCELLED') return publicSession(tx, row);
        if (!['WAITING', 'ACTIVE'].includes(row.status)) fail('SUPPORT_INVALID_TRANSITION');
      } else {
        if (actor.role !== ADMIN) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
        if (row.status !== 'ACTIVE') fail('SUPPORT_INVALID_TRANSITION');
        await tx.supportPresence.updateMany({ where: { userId: row.assignedStaffId }, data: { accepting: false } });
      }
      await tx.supportSession.update({ where: { id }, data: action === 'requeue'
        ? { status: 'WAITING', assignedStaffId: null, assignedAt: null }
        : { status: action === 'finish' ? 'CLOSED' : 'CANCELLED', closedAt: clock(), resolution: reason } });
      await tx.supportMessage.create({ data: { id: randomUUID(), sessionId: id, senderId: actor.id, kind: 'SYSTEM', body: reason, eventType: action === 'finish' ? 'CLOSED' : action === 'cancel' ? 'CANCELLED' : 'REQUEUED' } });
      await dispatch(tx);
      return publicSession(tx, await tx.supportSession.findUnique({ where: { id }, include }));
    });
  }
  return { metadata, list, detail, request, heartbeat, send, transition };
}
export const supportService = createSupportService();
