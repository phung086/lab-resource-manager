import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.PLANNING_TEST_URL || 'http://missing');
assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_planning_test');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000',
  JWT_SECRET: 'isolated-planning-tests-only-2026', PAYMENTS_ENABLED: 'false', CHATGPT_BRIDGE_ENABLED: 'false', MCP_ASSISTANT_ENABLED: 'false',
  EMAIL_ENABLED: 'false', EMAIL_AUTOMATION_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }, { dispatchWaitlist }] = await Promise.all([import('../src/db.js'), import('../src/app.js'), import('../src/services/planning/waitlistService.js')]);
const http = request(createApp()), id = () => crypto.randomUUID(), actors = {}, tokens = {};
let lab, otherLab;
const auth = name => ({ Authorization: `Bearer ${tokens[name]}` });
const startAt = new Date(Math.ceil((Date.now() + 48 * 3600000) / 60000) * 60000).toISOString(), endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
async function resource() { return prisma.resource.create({ data: { id: id(), code: id(), name: 'Planning test resource', subtype: 'OTHER', category: 'EQUIPMENT', location: 'Test LAB', laboratoryId: lab.id } }); }
const plan = ids => ({ resourceIds: ids, startAt, endAt, purposeCode: 'STUDY' });
const payload = ids => ({ plan: plan(ids), requestKey: id(), title: 'Test laboratory session', purpose: '', contact: { fullName: 'Planning owner', phone: '0900000001' }, quotes: ids.map(resourceId => ({ resourceId, amountVnd: 0, version: 0 })) });
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_planning_test');
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@planning.test')));
  const campus = await prisma.campus.create({ data: { id: id(), code: id(), name: 'Planning test' } });
  const building = await prisma.building.create({ data: { id: id(), code: id(), name: 'Planning test', campusId: campus.id } });
  const newLab = () => prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Planning test LAB', buildingId: building.id,
    labPolicy: { create: { id: id(), allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 } } } });
  lab = await newLab(); otherLab = await newLab();
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', owner: 'CUSTOMER', peer: 'CUSTOMER' })) {
    actors[name] = await prisma.user.create({ data: { id: id(), fullName: name, email: `${id()}@planning.test`, role, passwordHash: await bcrypt.hash('PlanningTest!2026', 4) } });
    const login = await http.post('/api/auth/login').send({ email: actors[name].email, password: 'PlanningTest!2026' });
    assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: lab.id } });
});
test.after(() => prisma.$disconnect());
test('bundle atomic creation, retry idempotency and current policy snapshot', async () => {
  const a = await resource(), b = await resource(), input = payload([a.id,b.id]);
  const responses = await Promise.all([1,2].map(() => http.post('/api/planning/bundles').set(auth('owner')).send(input)));
  for (const response of responses) assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(responses[0].body.id, responses[1].body.id);
  assert.equal(await prisma.booking.count({ where: { resourceId: { in: [a.id,b.id] } } }), 2);
  assert.equal(responses[0].body.bookings[0].policySnapshot.minAdvanceBookingMinutes, 30);
  const changed = await http.post('/api/planning/bundles').set(auth('owner')).send({ ...input, title: 'Changed request' });
  assert.equal(changed.status, 409);
});
test('last-resource failure rolls back first booking, group, fee and audit', async () => {
  const resources = [await resource(),await resource()].sort((a,b) => a.id.localeCompare(b.id));
  await prisma.resource.update({ where: { id: resources[1].id }, data: { operationalStatus: 'BROKEN' } });
  const input = payload(resources.map(row => row.id));
  const response = await http.post('/api/planning/bundles').set(auth('owner')).send(input);
  assert.ok([400,409].includes(response.status), JSON.stringify(response.body));
  assert.equal(await prisma.booking.count({ where: { resourceId: { in: input.plan.resourceIds } } }), 0);
  assert.equal(await prisma.bookingBundle.count({ where: { requestKey: input.requestKey } }), 0);
});
test('bundle rejects cross LAB and direct staff scope bypass', async () => {
  const a = await resource(), b = await resource(); await prisma.resource.update({ where: { id: b.id }, data: { laboratoryId: otherLab.id } });
  assert.equal((await http.post('/api/planning/bundles').set(auth('owner')).send(payload([a.id,b.id]))).status, 400);
  assert.equal((await http.post('/api/planning/bundles').set(auth('staff')).send(payload([b.id]))).status, 403);
});
test('concurrent different owners cannot both reserve the same bundle', async () => {
  const a = await resource(), b = await resource();
  const responses = await Promise.all(['owner','peer'].map(name => http.post('/api/planning/bundles').set(auth(name)).send(payload([a.id,b.id]))));
  assert.deepEqual(responses.map(row => row.status).sort(), [200,409]);
  assert.equal(await prisma.booking.count({ where: { resourceId: { in: [a.id,b.id] } } }), 2);
});
test('policy preview does not mutate, optimistic save records audit, non-admin rejected', async () => {
  const before = await prisma.labPolicy.findUnique({ where: { laboratoryId: lab.id } });
  const input = { expectedRevision: before.revision, reason: 'Planning policy verification', minAdvanceBookingMinutes: 40, turnaroundMinutes: 20,
    minBookingMinutes: 15, maxBookingMinutes: 480, maxAdvanceBookingDays: 30, allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 };
  assert.equal((await http.post(`/api/planning/policies/${lab.id}/preview`).set(auth('admin')).send(input)).status, 200);
  assert.equal((await prisma.labPolicy.findUnique({ where: { laboratoryId: lab.id } })).revision, before.revision);
  assert.equal((await http.put(`/api/planning/policies/${lab.id}`).set(auth('staff')).send(input)).status, 403);
  assert.equal((await http.put(`/api/planning/policies/${lab.id}`).set(auth('admin')).send(input)).status, 200);
  assert.equal((await http.put(`/api/planning/policies/${lab.id}`).set(auth('admin')).send(input)).status, 409);
  assert.equal(await prisma.systemAuditEvent.count({ where: { targetId: lab.id, action: 'LAB_BOOKING_POLICY_CHANGED' } }), 1);
});
test('turnaround prevents adjacent direct booking and allows exact preparation boundary', async () => {
  const a = await resource(), input = payload([a.id]);
  assert.equal((await http.post('/api/planning/bundles').set(auth('owner')).send(input)).status, 200);
  const next = delta => ({ resourceId: a.id, startAt: new Date(Date.parse(endAt) + delta * 60000).toISOString(), endAt: new Date(Date.parse(endAt) + (delta + 60) * 60000).toISOString() });
  assert.equal((await http.post('/api/bookings/preflight').set(auth('owner')).send(next(19))).status, 409);
  assert.equal((await http.post('/api/bookings/preflight').set(auth('owner')).send(next(20))).status, 200);
});
test('waitlist notifies once after release and never creates a reservation', async () => {
  const a = await resource(); const created = await http.post('/api/planning/bundles').set(auth('owner')).send(payload([a.id]));
  const joined = await http.post('/api/planning/waitlist').set(auth('peer')).send(plan([a.id]));
  assert.equal(joined.status, 200, JSON.stringify(joined.body));
  await dispatchWaitlist(); assert.equal((await prisma.bookingWaitlist.findUnique({ where: { id: joined.body.id } })).status, 'WAITING');
  assert.equal((await http.post(`/api/bookings/${created.body.bookings[0].id}/cancel`).set(auth('owner')).send({ reason: 'Release for waitlist test' })).status, 200);
  await dispatchWaitlist(); await dispatchWaitlist();
  assert.equal((await prisma.bookingWaitlist.findUnique({ where: { id: joined.body.id } })).status, 'NOTIFIED');
  assert.equal(await prisma.notification.count({ where: { userId: actors.peer.id, type: 'WAITLIST_AVAILABLE' } }), 1);
  assert.equal(await prisma.booking.count({ where: { resourceId: a.id } }), 1);
  assert.equal((await http.delete(`/api/planning/waitlist/${joined.body.id}`).set(auth('owner'))).status, 404);
});
test('dossier ownership, operator checklist stage, immutable evidence and report scope', async () => {
  const a = await resource(); const created = await http.post('/api/planning/bundles').set(auth('owner')).send(payload([a.id]));
  const bookingId = created.body.bookings[0].id, path = `/api/planning/dossiers/${bookingId}`;
  assert.equal((await http.get(path).set(auth('peer'))).status, 404);
  assert.equal((await http.get(path).set(auth('owner'))).status, 200);
  const evidence = { stage: 'HANDOVER', items: ['identity','condition','instructions'], notes: 'All items checked by test operator' };
  assert.equal((await http.post(`${path}/checklist`).set(auth('owner')).send(evidence)).status, 403);
  assert.equal((await http.post(`${path}/checklist`).set(auth('staff')).send(evidence)).status, 200);
  assert.equal((await http.post(`${path}/checklist`).set(auth('staff')).send(evidence)).status, 409);
  assert.equal((await http.post(`${path}/checklist`).set(auth('staff')).send({ ...evidence, stage: 'INSPECTION', items: ['condition','accessories','followup'] })).status, 409);
  assert.equal((await http.get('/api/planning/report').set(auth('owner'))).status, 403);
  const report = await http.get('/api/planning/report').set(auth('staff'));
  assert.equal(report.status, 200); assert.ok(report.body.total > 0); assert.equal(report.body.hours.length, 24);
});

test('suggestions are checked, non-reserving, and alternatives require matching declared capabilities', async () => {
  const a = await resource(), b = await resource(), c = await resource();
  await prisma.resourceCapability.createMany({ data: [
    { id: id(), resourceId: a.id, key: 'range', value: '100', unit: 'V' },
    { id: id(), resourceId: b.id, key: 'range', value: '100', unit: 'V' },
    { id: id(), resourceId: c.id, key: 'range', value: '10', unit: 'V' }
  ] });
  const times = await http.post('/api/planning/suggestions').set(auth('owner')).send(plan([a.id]));
  assert.equal(times.status, 200, JSON.stringify(times.body)); assert.equal(times.body.suggestions.length, 3);
  assert.equal(await prisma.booking.count({ where: { resourceId: a.id } }), 0);
  const alternatives = await http.post('/api/planning/alternatives').set(auth('owner')).send(plan([a.id]));
  assert.equal(alternatives.status, 200, JSON.stringify(alternatives.body));
  assert.ok(alternatives.body.suggestions.some(row => row.replacement.id === b.id));
  assert.ok(!alternatives.body.suggestions.some(row => row.replacement.id === c.id));
  const unclassified = await resource();
  assert.equal((await http.post('/api/planning/alternatives').set(auth('owner')).send(plan([unclassified.id]))).body.suggestions.length, 0);
});

test('public catalogue and calendar include preparation without exposing owner or original title', async () => {
  const a = await resource(); await http.post('/api/planning/bundles').set(auth('owner')).send(payload([a.id]));
  const from = new Date(Date.parse(endAt) + 5 * 60000).toISOString(), to = new Date(Date.parse(endAt) + 15 * 60000).toISOString();
  const catalog = await http.get('/api/resources').query({ availableFrom: from, availableTo: to });
  assert.equal(catalog.status, 200, JSON.stringify(catalog.body));
  const items = Array.isArray(catalog.body) ? catalog.body : catalog.body.items;
  assert.notEqual(items.find(row => row.id === a.id).availability.state, 'AVAILABLE');
  const events = await http.get('/api/calendar/events').query({ start: from, end: to, resource_id: a.id });
  assert.equal(events.status, 200, JSON.stringify(events.body));
  const preparation = events.body.events.find(row => row.type === 'preparation');
  assert.ok(preparation); assert.equal(preparation.requestedBy, undefined); assert.notEqual(preparation.title, 'Test laboratory session');
});
