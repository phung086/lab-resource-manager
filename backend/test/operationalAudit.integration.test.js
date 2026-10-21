import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.OPERATIONAL_AUDIT_TEST_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_operational_audit_test');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000',
  JWT_SECRET: 'operational-audit-isolated-test-secret', PAYMENTS_ENABLED: 'false', CHATGPT_BRIDGE_ENABLED: 'false',
  MCP_ASSISTANT_ENABLED: 'false', EMAIL_ENABLED: 'false', EMAIL_AUTOMATION_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }, service, { buildDashboard }] = await Promise.all([
  import('../src/db.js'), import('../src/app.js'), import('../src/services/bookingService.js'), import('../src/services/dashboardService.js')
]);
const http = request(createApp()), id = () => crypto.randomUUID(), actors = {}, tokens = {};
let lab, foreignLab;
const auth = name => ({ Authorization: `Bearer ${tokens[name]}` });
async function resource(category = 'EQUIPMENT') {
  return prisma.resource.create({ data: { id: id(), code: id(), name: 'Isolated operational audit', subtype: 'OTHER', category, location: 'Test LAB', laboratoryId: lab.id } });
}
async function reservation(r, data = {}) {
  const startAt = new Date(Date.now() + 48 * 3600000), endAt = new Date(+startAt + 3600000);
  return prisma.booking.create({ data: { id: id(), resourceId: r.id, requestedById: actors.owner.id, title: 'Audit fixture', purpose: 'Isolated audit only', status: 'CONFIRMED', startAt, endAt, ...data } });
}
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_operational_audit_test');
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@operational-audit.test')));
  const campus = await prisma.campus.create({ data: { id: id(), code: id(), name: 'Audit only' } });
  const building = await prisma.building.create({ data: { id: id(), code: id(), name: 'Audit only', campusId: campus.id } });
  const createLab = () => prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Audit LAB', buildingId: building.id,
    labPolicy: { create: { id: id(), allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 } } } });
  lab = await createLab(); foreignLab = await createLab();
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staleAdmin: 'ADMIN', staff: 'LAB_STAFF', owner: 'CUSTOMER', peer: 'CUSTOMER' })) {
    actors[name] = await prisma.user.create({ data: { id: id(), fullName: name, email: `${id()}@operational-audit.test`, role, passwordHash: await bcrypt.hash('OperationalAudit!2026', 4) } });
    const login = await http.post('/api/auth/login').send({ email: actors[name].email, password: 'OperationalAudit!2026' });
    assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: lab.id } });
});
test.after(() => prisma.$disconnect());

test('moving a booking into a closed LAB fails and creates no history', async () => {
  const b = await reservation(await resource());
  await prisma.laboratory.update({ where: { id: lab.id }, data: { isActive: false } });
  try {
    const response = await http.post(`/api/bookings/${b.id}/reschedule`).set(auth('staff')).send({ startAt: new Date(+b.startAt + 3600000), endAt: new Date(+b.endAt + 3600000), expectedStartAt: b.startAt, reason: 'Check closed laboratory guard' });
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).startAt.toISOString(), b.startAt.toISOString());
    assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id } }), 0);
  } finally { await prisma.laboratory.update({ where: { id: lab.id }, data: { isActive: true } }); }
});

test('resource detail and schedule agree after an early room return releases the slot', async () => {
  const r = await resource('ROOM'), now = new Date();
  await reservation(r, { startAt: new Date(+now - 3600000), endAt: new Date(+now + 3600000), status: 'RETURNED', actualStartAt: new Date(+now - 3500000), actualEndAt: now, returnedAt: now, schedulingReleasedAt: now });
  const detail = await http.get(`/api/resources/${r.id}`);
  assert.equal(detail.status, 200); assert.equal(detail.body.availability.state, 'AVAILABLE');
  assert.equal(detail.body.upcomingSchedule.bookings.length, 0);
  const schedule = await http.get(`/api/resources/${r.id}/schedule`).query({ from: new Date(+now - 1000).toISOString(), to: new Date(+now + 3600000).toISOString() });
  assert.equal(schedule.body.resource.availability.state, 'AVAILABLE');
});

test('malformed booking dates fail validation without persistence or a server error', async () => {
  const r = await resource(), start = new Date(Date.now() + 48 * 3600000).toISOString();
  for (const [startAt, endAt] of [[start, 'invalid-date'], ['invalid-date', start]]) {
    const response = await http.post('/api/bookings').set(auth('owner')).send({ resourceId: r.id, title: 'Invalid date check', startAt, endAt, contact: { fullName: 'Audit owner', phone: '0900000001' } });
    assert.equal(response.status, 400, JSON.stringify(response.body)); assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(await prisma.booking.count({ where: { resourceId: r.id } }), 0);
});

test('catalogue schedule reads release expired payment holds without a background worker', async () => {
  const r = await resource(), b = await reservation(r, { status: 'PENDING_APPROVAL', feeAmountVnd: 10000, paymentDueAt: new Date(Date.now() - 1000) });
  const response = await http.get(`/api/resources/${r.id}/schedule`).query({ from: b.startAt.toISOString(), to: b.endAt.toISOString() });
  assert.equal(response.status, 200); assert.equal(response.body.resource.availability.state, 'AVAILABLE');
  assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
});

test('staff cannot bypass the assigned-LAB preflight rule by calling booking creation directly', async () => {
  const r = await resource(); await prisma.resource.update({ where: { id: r.id }, data: { laboratoryId: foreignLab.id } });
  const startAt = new Date(Date.now() + 48 * 3600000).toISOString(), endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
  const fields = { resourceId: r.id, startAt, endAt };
  assert.equal((await http.post('/api/bookings/preflight').set(auth('staff')).send(fields)).status, 403);
  const response = await http.post('/api/bookings').set(auth('staff')).send({ ...fields, title: 'Assigned LAB scope', contact: { fullName: 'Audit staff', phone: '0900000001' } });
  assert.equal(response.status, 403, JSON.stringify(response.body));
  assert.equal(await prisma.booking.count({ where: { resourceId: r.id } }), 0);
});

test('customers use public schedules and cannot read internal maintenance jobs or operator details', async () => {
  const response = await http.get('/api/maintenance').set(auth('owner'));
  assert.equal(response.status, 403, JSON.stringify(response.body));
  assert.equal((await http.get('/api/maintenance').set(auth('staff'))).status, 200);
});

test('catalogue available-time filtering excludes a LAB closing-hour policy violation', async () => {
  const r = await resource(), futureDay = new Date(Date.now() + 48 * 3600000 + 7 * 3600000).toISOString().slice(0, 10);
  const availableFrom = `${futureDay}T20:00:00+07:00`, availableTo = `${futureDay}T21:00:00+07:00`;
  await prisma.labPolicy.update({ where: { laboratoryId: lab.id }, data: { workDayStartHour: 8, workDayEndHour: 18 } });
  try {
    const response = await http.get('/api/resources').query({ search: r.code, availability: 'AVAILABLE', availableFrom, availableTo });
    assert.equal(response.status, 200); assert.deepEqual(response.body, []);
  } finally { await prisma.labPolicy.update({ where: { laboratoryId: lab.id }, data: { workDayStartHour: 0, workDayEndHour: 24 } }); }
});

test('maintenance duration uses exact instants instead of rounding a short job up to fifteen minutes', async () => {
  const r = await resource(), startAt = new Date(Date.now() + 48 * 3600000);
  const payload = { resourceId: r.id, title: 'Exact maintenance boundary', startAt };
  const short = await http.post('/api/maintenance').set(auth('staff')).send({ ...payload, endAt: new Date(+startAt + 15 * 60000 - 1) });
  assert.equal(short.status, 400, JSON.stringify(short.body)); assert.equal(short.body.error.code, 'INVALID_MAINTENANCE_TIME');
  const exact = await http.post('/api/maintenance').set(auth('staff')).send({ ...payload, endAt: new Date(+startAt + 15 * 60000) });
  assert.equal(exact.status, 201, JSON.stringify(exact.body));
});

test('business services reject an actor whose administrator role was revoked after authentication', async () => {
  const now = new Date();
  const b = await reservation(await resource(), { status: 'RETURNED', schedulingReleasedAt: now, returnedAt: now, actualStartAt: new Date(+now - 3600000), actualEndAt: now });
  const stale = actors.staleAdmin;
  await prisma.user.update({ where: { id: stale.id }, data: { role: 'CUSTOMER', authVersion: { increment: 1 } } });
  await assert.rejects(service.transitionBooking({ bookingId: b.id, toStatus: 'COMPLETED', actorId: stale.id, actorRole: stale.role, expectedAuthVersion: stale.authVersion }), error => ['AUTH_INVALID','FORBIDDEN'].includes(error.code));
  assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'RETURNED');
  assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id } }), 0);
});

test('cancellation rechecks the current LAB after waiting for the booking lock', async () => {
  const r = await resource(), b = await reservation(r);
  let release, acquired;
  const gate = new Promise(resolve => { release = resolve; }), locked = new Promise(resolve => { acquired = resolve; });
  const blocker = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${r.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${b.id} FOR UPDATE`;
    acquired(); await gate;
    await tx.resource.update({ where: { id: r.id }, data: { laboratoryId: foreignLab.id } });
  }, { timeout: 15000 });
  await locked;
  const pending = service.cancelBooking(b.id, actors.staff.id, 'LAB_STAFF', 'Check current LAB before cancellation', actors.staff.authVersion).then(value => ({ value }), error => ({ error }));
  try {
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = await prisma.$queryRaw`SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND (query LIKE '%FROM bookings%FOR UPDATE%' OR query LIKE '%FROM resources%FOR UPDATE%')`;
      if (rows.length) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waiting, 'Cancellation did not reach the booking lock');
  } finally { release(); await blocker; }
  const result = await pending;
  assert.equal(result.error?.code, 'FORBIDDEN', JSON.stringify(result));
  assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CONFIRMED');
});

test('dashboard includes overdue actual custody even when the planned interval ended before its thirty-day window', async () => {
  const r = await resource(), now = new Date(), day = 86400000;
  await reservation(r, { startAt: new Date(+now - 32 * day), endAt: new Date(+now - 31 * day), status: 'CHECKED_OUT', actualStartAt: new Date(+now - 32 * day) });
  const result = await buildDashboard(prisma, actors.admin, now, { includeTelemetry: false });
  assert.ok(result.utilization.actualUsageMinutes >= 30 * 24 * 60, JSON.stringify(result.utilization));
});

test('unread-count counts all delivered owner notifications rather than a one-hundred-row preview', async () => {
  await prisma.notification.createMany({ data: Array.from({ length: 137 }, () => ({ id: id(), userId: actors.peer.id, title: 'Audit notice', message: 'Isolated notification count', sentAt: new Date(), severity: 'info' })) });
  const response = await http.get('/api/notifications/unread-count').set(auth('peer'));
  assert.equal(response.status, 200);
  assert.equal(response.body.unread, 137);
  assert.equal((await http.get('/api/notifications/unread-count').set(auth('owner'))).body.unread,
    await prisma.notification.count({ where: { userId: actors.owner.id, readAt: null, sentAt: { not: null } } }));
});
