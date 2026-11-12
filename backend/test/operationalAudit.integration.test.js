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

test('customer action queue counts before pagination and drops settled or returned bookings', async () => {
  const now = Date.now(), minute = 60_000;
  const ready = await reservation(await resource(), { startAt: new Date(now + 10 * minute), endAt: new Date(now + 70 * minute) });
  const delivery = await reservation(await resource(), { startAt: ready.startAt, endAt: ready.endAt, fulfillmentSnapshot: { mode: 'HOME_DELIVERY' } });
  const overdue = await reservation(await resource(), { status: 'CHECKED_OUT', startAt: new Date(now - 120 * minute), endAt: new Date(now - minute), actualStartAt: new Date(now - 120 * minute) });
  const payment = await reservation(await resource(), { status: 'PENDING_APPROVAL', feeAmountVnd: 20000, paymentDueAt: new Date(now + 5 * minute) });
  await reservation(await resource(), { status: 'PENDING_APPROVAL', feeAmountVnd: 20000, paymentDueAt: new Date(now - minute) });
  await reservation(await resource(), { status: 'CONFIRMED', startAt: new Date(now - 70 * minute), endAt: new Date(now - minute) });
  await reservation(await resource());
  const query = (name, page = 1, pageSize = 20) => http.get('/api/bookings').set(auth(name)).query({ page, pageSize, filter: 'ACTION_REQUIRED' });
  const first = await query('owner', 1, 1);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.summary.actionRequired, 3);
  assert.equal(first.body.pagination.total, 3);
  assert.equal(first.body.items.length, 1);
  const all = await query('owner');
  assert.deepEqual(new Set(all.body.items.map(row => row.id)), new Set([payment.id, ready.id, overdue.id]));
  assert.ok(!all.body.items.some(row => row.id === delivery.id));
  assert.deepEqual((await query('peer')).body.items, []);
  assert.equal((await query('staff')).status, 403);
  await prisma.booking.update({ where: { id: payment.id }, data: { status: 'CONFIRMED' } });
  const returned = await http.post(`/api/bookings/${overdue.id}/return`).set(auth('staff')).send({ conditionAfter: 'Received equipment at the desk' });
  assert.equal(returned.status, 200);
  const refreshed = await query('owner');
  assert.equal(refreshed.body.summary.actionRequired, 1);
  assert.equal(refreshed.body.items[0]?.id, ready.id);
});

test('malformed booking dates fail validation without persistence or a server error', async () => {
  const r = await resource(), start = new Date(Date.now() + 48 * 3600000).toISOString();
  for (const [startAt, endAt] of [[start, 'invalid-date'], ['invalid-date', start]]) {
    const response = await http.post('/api/bookings').set(auth('owner')).send({ resourceId: r.id, title: 'Invalid date check', startAt, endAt, contact: { fullName: 'Audit owner', phone: '0900000001' } });
    assert.equal(response.status, 400, JSON.stringify(response.body)); assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(await prisma.booking.count({ where: { resourceId: r.id } }), 0);
});

test('availability and failed booking preflight do not disclose another customer’s private title', async () => {
  const r = await resource();
  const startAt = new Date(Date.now() + 48 * 3600000);
  startAt.setUTCHours(4, 0, 0, 0);
  const endAt = new Date(+startAt + 3600000);
  const title = 'Private audit title, visible only to the booking owner and scoped operators';
  await reservation(r, { startAt, endAt, title });
  const input = { resourceId: r.id, startAt: startAt.toISOString(), endAt: endAt.toISOString() };
  const availability = await http.get('/api/bookings/availability').set(auth('peer')).query(input);
  assert.equal(availability.status, 200);
  assert.equal(availability.body.available, false);
  const preflight = await http.post('/api/bookings/preflight').set(auth('peer')).send(input);
  assert.equal(preflight.status, 409);
  assert.equal(preflight.body.error.code, 'BOOKING_CONFLICT');
  for (const reply of [availability, preflight]) assert.ok(!reply.text.includes(title));
});

test('a late return still blocks preparation after its old scheduled end leaves the query window', async () => {
  const r = await resource(), minute = 60000;
  const released = new Date(Math.floor(Date.now() / (30 * minute)) * 30 * minute);
  await reservation(r, { status: 'COMPLETED', startAt: new Date(+released - 420 * minute),
    endAt: new Date(+released - 360 * minute), actualStartAt: new Date(+released - 420 * minute),
    actualEndAt: released, returnedAt: released, schedulingReleasedAt: released, completedAt: released,
    policySnapshot: { turnaroundMinutes: 120 } });
  const startAt = new Date(+released + 60 * minute).toISOString();
  const endAt = new Date(+released + 90 * minute).toISOString();
  const availability = await http.get('/api/bookings/availability').set(auth('peer')).query({ resourceId: r.id, startAt, endAt });
  assert.equal(availability.status, 200);
  assert.equal(availability.body.available, false);
  const detail = await http.get(`/api/resources/${r.id}/schedule`).query({ from: startAt, to: endAt });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.resource.availability.state, 'RESERVED');
  const calendar = await http.get('/api/calendar/events').query({ resource_id: r.id, start: startAt, end: endAt });
  assert.equal(calendar.status, 200);
  assert.ok(calendar.body.events.some(row => row.type === 'preparation'));
  const next = await http.get('/api/bookings/availability').set(auth('peer')).query({
    resourceId: r.id, startAt: new Date(+released + 120 * minute).toISOString(), endAt: new Date(+released + 150 * minute).toISOString()
  });
  assert.equal(next.status, 200);
  assert.equal(next.body.available, true);
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

test('maintenance may be scheduled but cannot start before overdue equipment is returned', async () => {
  const r = await resource(), now = Date.now();
  const booking = await reservation(r, { startAt: new Date(now - 7200000),
    endAt: new Date(now - 3600000), status: 'CHECKED_OUT', actualStartAt: new Date(now - 7200000) });
  await prisma.resource.update({ where: { id: r.id }, data: { operationalStatus: 'IN_USE' } });
  const job = await http.post('/api/maintenance').set(auth('staff')).send({
    resourceId: r.id, title: 'Maintenance after custody ends', startAt: new Date(now - 60000),
    endAt: new Date(now + 3600000)
  });
  assert.equal(job.status, 201, JSON.stringify(job.body));
  const start = () => http.patch(`/api/maintenance/${job.body.id}`).set(auth('staff')).send({
    status: 'in_progress', changeReason: 'Begin inspection and maintenance'
  });
  const blocked = await start();
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
  assert.equal(blocked.body.error.code, 'RESOURCE_RETURN_REQUIRED');
  assert.equal((await prisma.maintenanceWindow.findUnique({ where: { id: job.body.id } })).status, 'scheduled');
  const returned = await http.post(`/api/bookings/${booking.id}/return`).set(auth('staff')).send({ conditionAfter: 'Equipment received intact' });
  assert.equal(returned.status, 200, JSON.stringify(returned.body));
  assert.equal((await start()).status, 200);
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

test('operations brief counts all scoped records and prioritizes overdue loans with a next booking', async () => {
  const now = Date.now(), hour = 3600000;
  const briefLab = await prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Operations brief LAB', buildingId: lab.buildingId } });
  await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: briefLab.id } });
  const briefResource = () => prisma.resource.create({ data: {
    id: id(), code: id(), name: 'Brief resource', subtype: 'OTHER', category: 'EQUIPMENT', location: 'Audit', laboratoryId: briefLab.id
  } });
  const r = await briefResource();
  const foreign = await prisma.resource.create({ data: {
    id: id(), code: id(), name: 'Foreign brief resource', subtype: 'OTHER', category: 'EQUIPMENT', location: 'Audit', laboratoryId: foreignLab.id
  } });
  const makeOverdue = target => reservation(target, {
    status: 'CHECKED_OUT', startAt: new Date(now - 4 * hour), endAt: new Date(now - 2 * hour)
  });
  for (let index = 0; index < 3; index++) await makeOverdue(await briefResource());
  const urgent = await reservation(r, {
    status: 'CHECKED_OUT', startAt: new Date(now - 2 * hour), endAt: new Date(now - hour)
  });
  const next = await reservation(r, {
    startAt: new Date(now + hour), endAt: new Date(now + 2 * hour), title: 'Private next reservation title'
  });
  const foreignLoan = await makeOverdue(foreign);
  const incident = (target, severity, origin = 'EXTERNAL') => prisma.incident.create({ data: {
    id: id(), resourceId: target.id, severity, status: 'reported', origin, title: 'Incident', description: 'Private incident description'
  } });
  await incident(r, 'high');
  const critical = await incident(r, 'critical');
  await incident(r, 'critical', 'SIMULATED');
  await incident(foreign, 'critical');
  const maintenance = await prisma.maintenanceWindow.create({ data: {
    id: id(), resourceId: r.id, title: 'Calibrate fixture', kind: 'calibration',
    startAt: new Date(now + 3 * hour), endAt: new Date(now + 4 * hour)
  } });
  await prisma.maintenanceWindow.create({ data: {
    id: id(), resourceId: r.id, title: 'Outside horizon',
    startAt: new Date(now + 25 * hour), endAt: new Date(now + 26 * hour)
  } });
  const brief = (actor, laboratoryId) => http.get('/api/dashboard/operations-brief').set(auth(actor)).query(laboratoryId ? { laboratoryId } : {});
  const response = await brief('admin', briefLab.id);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.match(response.headers['cache-control'], /no-store/);
  assert.equal(response.body.overdue.total, 4);
  assert.equal(response.body.overdue.items.length, 3);
  assert.equal(response.body.overdue.withNextBooking, 1);
  assert.equal(response.body.overdue.items[0].id, urgent.id);
  assert.equal(response.body.overdue.items[0].nextBooking.id, next.id);
  assert.equal(response.body.incidents.total, 2);
  assert.equal(response.body.incidents.items[0].id, critical.id);
  assert.deepEqual(response.body.maintenance.items.map(row => row.id), [maintenance.id]);
  assert.doesNotMatch(JSON.stringify(response.body), /Private next reservation title|Private incident description/);
  const staff = await brief('staff', briefLab.id);
  assert.equal(staff.status, 200);
  assert.deepEqual(new Set(staff.body.laboratories.map(row => row.id)), new Set([lab.id, briefLab.id]));
  assert.equal(staff.body.overdue.total, 4);
  assert.equal((await brief('staff', foreignLab.id)).status, 404);
  const otherLab = await brief('admin', foreignLab.id);
  assert.equal(otherLab.body.overdue.items[0].id, foreignLoan.id);
  assert.equal((await brief('owner')).status, 403);
});
