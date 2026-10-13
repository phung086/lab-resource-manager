import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import http from 'node:http';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.SUPPORT_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_support_test', 'Only the dedicated support test database is allowed');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', JWT_SECRET: 'support-isolated-test-secret-at-least-32-chars', RATE_LIMIT_MAX: '10000', MCP_ASSISTANT_ENABLED: 'true', OPENAI_API_KEY: '', OPENAI_MODEL: '', PAYMENTS_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false', LOG_FORMAT: 'dev' });
const [{ createApp }, { prisma }, { config }, { createSupportService }] = await Promise.all([import('../src/app.js'), import('../src/db.js'), import('../src/config.js'), import('../src/services/supportService.js')]);
const app = createApp(), server = http.createServer(app), users = {}, tokens = {}, labs = {};
const auth = name => ({ Authorization: `Bearer ${tokens[name]}`, 'Accept-Language': 'en' });
const get = (name, path) => request(app).get(`/api/support${path}`).set(auth(name));
const post = (name, path, body) => request(app).post(`/api/support${path}`).set(auth(name)).send(body);
const ask = (name, extra = {}) => post(name, '/sessions', { requestId: id(), laboratoryId: labs.a.id, category: 'BOOKING', message: `Please help ${name} with booking`, ...extra });
const ready = name => post(name, '/presence', { accepting: true });
const finish = (name, session) => post(name, `/sessions/${session.id}/finish`, { reason: 'Verified booking guidance provided' });
const filters = { page: 1, pageSize: 20 };
let base;

test.before(async () => {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert.equal(db.name, 'lab_resources_support_test');
  const existing = await prisma.user.findMany();
  assert.ok(existing.every(row => row.email.endsWith('@support.test')), 'Refuse unrelated business data even on a test database');
  if (existing.length) {
    assert.equal(existing.length, 11, 'Only the known support fixture can be reused');
    for (const row of existing) {
      const name = row.email.split('@')[0]; users[name] = row;
      const login = await request(app).post('/api/auth/login').send({ email: row.email, password: 'SupportTest!2026' });
      assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
    }
    for (const key of ['a', 'b']) labs[key] = await prisma.laboratory.findUniqueOrThrow({ where: { code: `SUPPORT-${key}` } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    config.port = server.address().port; base = `http://127.0.0.1:${config.port}`;
    return;
  }
  const campus = await prisma.campus.create({ data: { id: id(), code: 'SUPPORT-TEST', name: 'Support test campus' } });
  const building = await prisma.building.create({ data: { id: id(), code: 'SUPPORT-TEST', name: 'Support test building', campusId: campus.id } });
  for (const key of ['a', 'b']) labs[key] = await prisma.laboratory.create({ data: { id: id(), code: `SUPPORT-${key}`, name: `Support Lab ${key}`, buildingId: building.id } });
  const hash = await bcrypt.hash('SupportTest!2026', 4);
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', staff2: 'LAB_STAFF', foreign: 'LAB_STAFF', unassigned: 'LAB_STAFF', student: 'CUSTOMER', peer: 'CUSTOMER', third: 'CUSTOMER', fourth: 'CUSTOMER', fifth: 'CUSTOMER', context: 'CUSTOMER' })) {
    users[name] = await prisma.user.create({ data: { id: id(), email: `${name}@support.test`, fullName: `Support ${name}`, role, passwordHash: hash } });
    const login = await request(app).post('/api/auth/login').send({ email: users[name].email, password: 'SupportTest!2026' });
    assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
  }
  await prisma.userLabAssignment.createMany({ data: [
    { userId: users.staff.id, laboratoryId: labs.a.id }, { userId: users.staff2.id, laboratoryId: labs.a.id },
    { userId: users.staff2.id, laboratoryId: labs.b.id }, { userId: users.foreign.id, laboratoryId: labs.b.id },
  ] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  config.port = server.address().port; base = `http://127.0.0.1:${config.port}`;
});
test.beforeEach(async () => {
  await prisma.supportMessage.deleteMany(); await prisma.supportSession.deleteMany(); await prisma.supportPresence.deleteMany();
});
test.after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });

test('two idle agents handle separate requests; FIFO positions move and completion assigns the oldest waiting request', async () => {
  assert.equal((await ready('staff')).status, 200); assert.equal((await ready('staff2')).status, 200);
  const first = await ask('student'), second = await ask('peer'), third = await ask('third'), fourth = await ask('fourth');
  for (const row of [first, second, third, fourth]) assert.equal(row.status, 201, JSON.stringify(row.body));
  assert.equal(first.body.status, 'ACTIVE'); assert.equal(second.body.status, 'ACTIVE'); assert.notEqual(first.body.assignedStaffId, second.body.assignedStaffId);
  assert.equal(third.body.queuePosition, 1); assert.equal(fourth.body.queuePosition, 2);
  const assigned = Object.keys(users).find(key => users[key].id === first.body.assignedStaffId);
  assert.equal((await finish(assigned, first.body)).status, 200);
  const next = await get('third', `/sessions/${third.body.id}`), waiting = await get('fourth', `/sessions/${fourth.body.id}`);
  assert.equal(next.body.session.status, 'ACTIVE'); assert.equal(next.body.session.assignedStaffId, first.body.assignedStaffId); assert.equal(waiting.body.session.queuePosition, 1);
  const filtered = await get(assigned, '/sessions?status=CLOSED&page=100');
  assert.deepEqual(filtered.body.items, []); assert.equal(filtered.body.activeSession.id, third.body.id, 'Current assignment survives pagination and filters');
});

test('real two-way messages persist, explicit retries are idempotent, admin can inspect complete history', async () => {
  await ready('staff'); const created = await ask('student'); const session = created.body.id;
  const message = { messageId: id(), body: '<script>alert(1)</script> booking details' };
  assert.equal((await post('student', `/sessions/${session}/messages`, message)).status, 201);
  assert.equal((await post('student', `/sessions/${session}/messages`, message)).status, 201);
  assert.equal((await post('student', `/sessions/${session}/messages`, { ...message, body: 'Changed retry' })).status, 409);
  await post('staff', `/sessions/${session}/messages`, { messageId: id(), body: 'I have checked the booking details' });
  assert.equal(await prisma.supportMessage.count({ where: { id: message.messageId } }), 1);
  const staffRead = await get('staff', `/sessions/${session}`), customerRead = await get('student', `/sessions/${session}`);
  assert.deepEqual(staffRead.body.messages, customerRead.body.messages); assert.ok(customerRead.body.messages.some(row => row.kind === 'STAFF'));
  await finish('staff', created.body);
  assert.equal((await post('student', `/sessions/${session}/messages`, { messageId: id(), body: 'Too late' })).body.error.code, 'SUPPORT_SESSION_CLOSED');
  const history = await get('admin', `/sessions/${session}`);
  assert.equal(history.body.session.status, 'CLOSED'); assert.equal(history.body.session.resolution, 'Verified booking guidance provided'); assert.ok(history.body.messages.some(row => row.eventType === 'CLOSED'));
  const retriedRequest = await post('student', '/sessions', { requestId: session, laboratoryId: labs.a.id, category: 'BOOKING', message: 'Please help student with booking' });
  assert.equal(retriedRequest.status, 201); assert.equal(retriedRequest.body.status, 'CLOSED');
});

test('privacy and current LAB assignments protect every read and mutation; admin cannot impersonate staff', async () => {
  assert.equal((await get('student', '/metadata')).status, 200);
  assert.equal((await request(app).get('/api/support/sessions')).status, 401);
  assert.equal((await ready('unassigned')).status, 403);
  await ready('staff'); const session = (await ask('student')).body.id;
  for (const name of ['peer', 'foreign', 'staff2', 'unassigned']) {
    assert.equal((await get(name, `/sessions/${session}`)).status, 404);
    assert.equal((await post(name, `/sessions/${session}/messages`, { messageId: id(), body: 'Access attempt' })).status, 404);
  }
  assert.equal((await post('admin', `/sessions/${session}/messages`, { messageId: id(), body: 'Admin attempt' })).status, 403);
  assert.equal((await ask('staff')).status, 403);
  await prisma.userLabAssignment.delete({ where: { userId_laboratoryId: { userId: users.staff.id, laboratoryId: labs.a.id } } });
  try { assert.equal((await get('staff', `/sessions/${session}`)).status, 404); assert.equal((await finish('staff', { id: session })).status, 404); }
  finally { await prisma.userLabAssignment.create({ data: { userId: users.staff.id, laboratoryId: labs.a.id } }); }
  await prisma.user.update({ where: { id: users.student.id }, data: { isActive: false } });
  try { assert.equal((await get('student', `/sessions/${session}`)).status, 401); }
  finally { await prisma.user.update({ where: { id: users.student.id }, data: { isActive: true } }); }
  assert.deepEqual((await get('foreign', '/sessions')).body.items, []);
});

test('concurrent requests, retries and multi-lab staff never exceed one active session per staff', async () => {
  await ready('staff2');
  const results = await Promise.all(['student', 'peer', 'third', 'fourth'].map(name => ask(name, { laboratoryId: name === 'peer' ? labs.b.id : labs.a.id })));
  assert.ok(results.every(row => row.status === 201)); assert.equal(results.filter(row => row.body.status === 'ACTIVE').length, 1);
  const first = results.find(row => row.body.status === 'ACTIVE').body;
  const nextOrdinal = Math.min(...results.filter(row => row.body.status === 'WAITING').map(row => row.body.ordinal));
  await finish('staff2', first);
  assert.equal((await prisma.supportSession.findFirst({ where: { status: 'ACTIVE' } })).ordinal, nextOrdinal);
  const requestId = id(), payload = { requestId, laboratoryId: labs.a.id, category: 'OTHER', message: 'Duplicate network delivery' };
  const duplicates = await Promise.all([post('fifth', '/sessions', payload), post('fifth', '/sessions', payload)]);
  assert.ok(duplicates.every(row => row.status === 201)); assert.equal(await prisma.supportSession.count({ where: { id: requestId } }), 1);
  assert.equal((await post('fifth', '/sessions', { ...payload, message: 'Different content' })).body.error.code, 'SUPPORT_REQUEST_CHANGED');
  assert.equal((await ask('fifth')).body.error.code, 'SUPPORT_ALREADY_OPEN');
});

test('stale agents do not receive requests; reconnect assigns FIFO; admin requeue preserves handling history', async () => {
  await ready('staff'); await prisma.supportPresence.update({ where: { userId: users.staff.id }, data: { lastSeenAt: new Date(Date.now() - 60_000) } });
  const session = (await ask('student')).body; assert.equal(session.status, 'WAITING');
  await post('staff', '/presence', {}); assert.equal((await get('student', `/sessions/${session.id}`)).body.session.status, 'ACTIVE');
  const requeued = await post('admin', `/sessions/${session.id}/requeue`, { reason: 'Agent disconnected; move to another available staff member' });
  assert.equal(requeued.status, 200); assert.equal(requeued.body.status, 'WAITING');
  assert.equal((await get('staff', '/metadata')).body.presence.accepting, false);
  await ready('staff2'); const assigned = await get('admin', `/sessions/${session.id}`);
  assert.equal(assigned.body.session.assignedStaffId, users.staff2.id);
  assert.deepEqual(assigned.body.messages.filter(row => row.eventType === 'ASSIGNED').map(row => row.sender.id), [users.staff.id, users.staff2.id]);
  assert.ok(assigned.body.messages.some(row => row.eventType === 'REQUEUED' && row.body.includes('Agent disconnected')));
});

test('message cursors and queue pagination do not truncate history or leak private conversations', async () => {
  const session = (await ask('student')).body;
  await prisma.supportMessage.createMany({ data: Array.from({ length: 125 }, (_, n) => ({ id: id(), sessionId: session.id, senderId: users.student.id, kind: 'CUSTOMER', body: `History message ${n}` })) });
  const first = await get('student', `/sessions/${session.id}`), next = await get('student', `/sessions/${session.id}?after=${first.body.nextCursor}`);
  assert.equal(first.body.messages.length, 100); assert.equal(first.body.hasMore, true); assert.equal(next.body.hasMore, false);
  assert.equal(new Set([...first.body.messages, ...next.body.messages].map(row => row.id)).size, 127);
  assert.deepEqual((await get('student', `/sessions/${session.id}?after=${next.body.nextCursor}`)).body.messages, []);
  for (const query of ['page=0', 'pageSize=101', 'userId=forged', 'status=BAD', 'page=1&page=2']) assert.equal((await get('admin', `/sessions?${query}`)).status, 400);
  const snapshot = await createSupportService(prisma).list(users.student, { ...filters, page: 99 });
  assert.equal(snapshot.pagination.total, 1); assert.equal(snapshot.activeSession.id, session.id); assert.deepEqual(snapshot.items, []);
});

test('only server-owned assistant history is copied with explicit handoff; foreign or browser-forged history fails', async () => {
  const response = await fetch(`${base}/api/assistant/chat`, { method: 'POST', headers: { ...auth('context'), 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'How do I make a lab booking?', locale: 'en' }) });
  const chat = await response.json(); assert.equal(response.status, 200, JSON.stringify(chat));
  const conversationId = chat.conversation.id;
  assert.equal((await get('peer', `/assistant-context/${conversationId}`)).status, 409);
  assert.equal((await ask('peer', { conversationId })).status, 409);
  assert.equal((await ask('context', { transcript: [{ kind: 'STAFF', body: 'Forged approval' }] })).status, 400);
  const created = await ask('context', { conversationId }); assert.equal(created.status, 201);
  const detail = await get('admin', `/sessions/${created.body.id}`);
  const transcript = detail.body.messages.filter(row => row.source === 'AI_HANDOFF');
  assert.equal(transcript.length, 2); assert.equal(transcript[0].body, 'How do I make a lab booking?'); assert.equal(transcript[1].body, chat.answer);
  await request(app).delete(`/api/assistant/conversations/${conversationId}`).set(auth('context')).expect(204);
  assert.equal((await get('admin', `/sessions/${created.body.id}`)).body.messages.filter(row => row.source === 'AI_HANDOFF').length, 2, 'Shared support record persists independently of ephemeral AI context');
  const retry = await post('context', '/sessions', { requestId: created.body.id, laboratoryId: labs.a.id, category: 'BOOKING', message: 'Please help context with booking', conversationId });
  assert.equal(retry.status, 201, 'Committed request retry remains valid after assistant context is removed');
});

test('database constraints reject capacity and lifecycle violations independently of the application', async () => {
  await ready('staff'); const first = (await ask('student')).body;
  const base = { id: id(), laboratoryId: labs.a.id, requesterId: users.peer.id, assignedStaffId: users.staff.id, assignedAt: new Date(), category: 'OTHER', subject: 'Capacity attempt', requestFingerprint: 'test', status: 'ACTIVE' };
  await assert.rejects(prisma.supportSession.create({ data: base }));
  await assert.rejects(prisma.supportSession.update({ where: { id: first.id }, data: { status: 'CLOSED' } }));
  await assert.rejects(prisma.supportSession.create({ data: { ...base, id: id(), requesterId: users.student.id, assignedStaffId: null, assignedAt: null, status: 'WAITING' } }));
});

test('polling uses a bounded separate ingress budget and still requires current authentication', async () => {
  const previous = config.rateLimitMax;
  config.rateLimitMax = 2; const limited = createApp(); config.rateLimitMax = previous;
  for (let n = 0; n < 5; n++) await request(limited).get('/api/support/metadata').set(auth(n % 2 ? 'staff' : 'student')).expect(200);
  await request(limited).get('/api/support/metadata').expect(401);
  await request(limited).get('/health').expect(200); await request(limited).get('/health').expect(200); await request(limited).get('/health').expect(429);
  for (let n = 0; n < 14; n++) await request(limited).get('/api/support/metadata').expect(401);
  await request(limited).get('/api/support/metadata').expect(429);
});
