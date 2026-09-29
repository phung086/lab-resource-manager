import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.LAB_WORKSPACE_TEST_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_workspace_test', 'Refuse to mutate any non-workspace test database');
process.env.DATABASE_URL = url.href;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'workspace-test-secret-at-least-32-characters';
process.env.REMINDER_SCHEDULER_ENABLED = 'false';
process.env.PAYMENTS_ENABLED = 'false';
process.env.LOG_FORMAT = 'dev';
const [{ createApp }, { prisma }] = await Promise.all([import('../src/app.js'), import('../src/db.js')]);
const app = createApp();
const marker = id();
const users = {}, tokens = {};
let lab, otherLab, material, equipment, foreignMaterial, group, booking, activity;
const auth = name => ({ Authorization: `Bearer ${tokens[name]}` });
const call = (method, path, name, body) => request(app)[method](`/api${path}`).set(auth(name)).send(body);
const movement = (kind, quantity, resourceId = material.id) => ({ id: id(), resourceId, kind, quantity, unit: 'piece', reference: `TEST-${marker}`, reason: 'Verified fixture transaction', });

test.before(async () => {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert.equal(db.name, 'lab_resources_workspace_test');
  const campus = await prisma.campus.create({ data: { id: id(), code: marker, name: 'Workspace test campus' } });
  const building = await prisma.building.create({ data: { id: id(), code: marker, name: 'Test building', campusId: campus.id } });
  lab = await prisma.laboratory.create({ data: { id: id(), code: `A-${marker}`, name: 'Assigned lab', buildingId: building.id } });
  otherLab = await prisma.laboratory.create({ data: { id: id(), code: `B-${marker}`, name: 'Foreign lab', buildingId: building.id } });
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', unassigned: 'LAB_STAFF', lecturer: 'LECTURER', otherLecturer: 'LECTURER', student: 'STUDENT', otherStudent: 'STUDENT' })) {
    users[name] = await prisma.user.create({ data: { id: id(), email: `${name}-${marker}@example.test`.toLowerCase(), fullName: `Test ${name}`, role, passwordHash: await bcrypt.hash('WorkspaceTest!2026', 4) } });
    const response = await request(app).post('/api/auth/login').send({ email: users[name].email, password: 'WorkspaceTest!2026' });
    assert.equal(response.status, 200); tokens[name] = response.body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: users.staff.id, laboratoryId: lab.id } });
  const resource = (category, labId, suffix) => prisma.resource.create({ data: { id: id(), code: `${suffix}-${marker}`, name: `Test ${suffix}`, category, subtype: 'OTHER', laboratoryId: labId, location: 'TEST' } });
  material = await resource('MATERIAL', lab.id, 'material');
  equipment = await resource('EQUIPMENT', lab.id, 'equipment');
  foreignMaterial = await resource('MATERIAL', otherLab.id, 'foreign');
  booking = await prisma.booking.create({ data: { id: id(), resourceId: equipment.id, requestedById: users.student.id, title: 'Practical session', purpose: 'Teaching test', status: 'CONFIRMED', startAt: new Date('2026-10-05T02:00:00Z'), endAt: new Date('2026-10-05T03:00:00Z') } });
});
test.after(async () => { await prisma.$disconnect(); });

test('stock scope, initialization, retries and concurrent issues preserve the balance', async () => {
  assert.equal((await request(app).get('/api/lab-workspace/stock')).status, 401);
  assert.equal((await call('get', '/lab-workspace/stock', 'student')).status, 403);
  assert.equal((await call('get', '/lab-workspace/stock', 'unassigned')).body.length, 0);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', movement('RECEIPT', 1, foreignMaterial.id))).status, 403);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', movement('RECEIPT', 1, equipment.id))).status, 400);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', movement('ISSUE', 1))).status, 409);
  const receipt = movement('RECEIPT', 10);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', receipt)).status, 201);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', receipt)).status, 201);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', { ...receipt, quantity: 20 })).status, 409);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', { ...receipt, unit: 'box' })).status, 409);
  const results = await Promise.all([1, 2].map(() => call('post', '/lab-workspace/stock', 'staff', movement('ISSUE', 7))));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal((await prisma.stockItem.findUnique({ where: { resourceId: material.id } })).balance, 3);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', movement('ADJUSTMENT', 1))).status, 403);
  assert.equal((await call('post', '/lab-workspace/stock', 'admin', movement('ADJUSTMENT', -4))).status, 409);
  assert.equal((await call('post', '/lab-workspace/stock', 'admin', movement('ADJUSTMENT', 2))).status, 201);
  const history = await call('get', `/lab-workspace/stock/${material.id}`, 'staff');
  assert.equal(history.body.length, 3);
  assert.equal(await prisma.systemAuditEvent.count({ where: { resourceId: material.id, action: 'STOCK_MOVEMENT_RECORDED' } }), 3);
});

test('teaching assignments protect student privacy and support revision without approving a resource', async () => {
  const body = { code: marker, name: 'Laboratory practical group', term: '2026-1', lecturerEmail: users.lecturer.email };
  assert.equal((await call('post', '/lab-workspace/groups', 'lecturer', body)).status, 403);
  const created = await call('post', '/lab-workspace/groups', 'admin', body); assert.equal(created.status, 201); group = created.body;
  assert.equal((await call('get', `/lab-workspace/groups/${group.id}`, 'otherLecturer')).status, 403);
  assert.equal((await call('get', '/lab-workspace/groups', 'staff')).status, 403);
  for (const name of ['student', 'otherStudent']) assert.equal((await call('post', `/lab-workspace/groups/${group.id}/members`, 'lecturer', { email: users[name].email })).status, 201);
  const submit = { bookingId: booking.id, learningGoal: 'Measure circuit voltage accurately' };
  assert.equal((await call('post', `/lab-workspace/groups/${group.id}/activities`, 'otherStudent', submit)).status, 403);
  const submitted = await call('post', `/lab-workspace/groups/${group.id}/activities`, 'student', submit); assert.equal(submitted.status, 201); activity = submitted.body;
  const peerView = await call('get', `/lab-workspace/groups/${group.id}`, 'otherStudent'); assert.equal(peerView.body.activities.length, 0); assert.equal(peerView.body.members.length, 1);
  const activityPath = `/lab-workspace/groups/${group.id}/activities/${activity.id}`;
  assert.equal((await call('patch', activityPath, 'student', { decision: 'ENDORSED', feedback: 'Unauthorized approval' })).status, 403);
  assert.equal((await call('patch', activityPath, 'otherLecturer', { decision: 'ENDORSED', feedback: 'Wrong lecturer' })).status, 403);
  assert.equal((await call('patch', activityPath, 'lecturer', { decision: 'CHANGES_REQUESTED', feedback: 'Specify measurement tolerance' })).status, 200);
  const revised = await call('patch', `${activityPath}/revision`, 'student', { learningGoal: 'Measure circuit voltage with a 1% tolerance' }); assert.equal(revised.status, 200); assert.equal(revised.body.decision, 'SUBMITTED');
  assert.equal((await call('patch', activityPath, 'lecturer', { decision: 'ENDORSED', feedback: 'The objective is now clear' })).status, 200);
  assert.equal((await prisma.booking.findUnique({ where: { id: booking.id } })).status, 'CONFIRMED');
});

test('maintenance impact, rescheduling reason and terminal states are enforced by the API', async () => {
  const data = { resourceId: equipment.id, title: 'Scheduled test maintenance', kind: 'maintenance', startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString() };
  const impact = await call('get', `/maintenance/impact?${new URLSearchParams({ resourceId: equipment.id, startAt: data.startAt, endAt: data.endAt })}`, 'staff');
  assert.equal(impact.status, 200); assert.equal(impact.body.conflicts[0].id, booking.id);
  assert.equal((await call('post', '/maintenance', 'staff', data)).status, 409);
  assert.equal((await call('post', '/maintenance', 'student', data)).status, 403);
  data.startAt = '2026-10-06T02:00:00Z'; data.endAt = '2026-10-06T03:00:00Z';
  assert.equal((await call('post', '/maintenance', 'staff', { ...data, kind: 'repair' })).status, 400);
  assert.equal((await call('post', '/maintenance', 'staff', { ...data, status: 'completed' })).status, 400);
  const created = await call('post', '/maintenance', 'staff', data); assert.equal(created.status, 201, JSON.stringify(created.body));
  const path = `/maintenance/${created.body.id}`;
  assert.equal((await call('patch', path, 'staff', { startAt: '2026-10-06T01:00:00Z' })).status, 400);
  assert.equal((await call('patch', path, 'staff', { startAt: '2026-10-06T01:00:00Z', changeReason: 'Earlier technician arrival' })).status, 200);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', { ...movement('ISSUE', 1), maintenanceId: created.body.id })).status, 201);
  assert.equal((await call('patch', path, 'staff', { status: 'in_progress', changeReason: 'Technician started the job' })).status, 200);
  assert.equal((await call('patch', path, 'staff', { status: 'completed', changeReason: 'Recorded work completion' })).status, 200);
  assert.equal((await call('patch', path, 'staff', { status: 'scheduled', changeReason: 'Try reopening closed work' })).status, 409);
  assert.equal((await call('post', '/lab-workspace/stock', 'staff', { ...movement('ISSUE', 1), maintenanceId: created.body.id })).status, 409);
});
