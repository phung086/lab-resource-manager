import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.LAB_WORKSPACE_TEST_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
assert.ok(['/lab_resources_workspace_test', '/lab_resources_workspace_review_test'].includes(url.pathname), 'Refuse to mutate any non-workspace test database');
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
  assert.equal(db.name, url.pathname.slice(1));
  const campus = await prisma.campus.create({ data: { id: id(), code: marker, name: 'Workspace test campus' } });
  const building = await prisma.building.create({ data: { id: id(), code: marker, name: 'Test building', campusId: campus.id } });
  lab = await prisma.laboratory.create({ data: { id: id(), code: `A-${marker}`, name: 'Assigned lab', buildingId: building.id } });
  otherLab = await prisma.laboratory.create({ data: { id: id(), code: `B-${marker}`, name: 'Foreign lab', buildingId: building.id } });
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', unassigned: 'LAB_STAFF', lecturer: 'CUSTOMER', otherLecturer: 'CUSTOMER', student: 'CUSTOMER', otherStudent: 'CUSTOMER' })) {
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

test('retired teaching workspace keeps a private ADMIN archive and rejects new mutations', async () => {
  group = await prisma.teachingGroup.create({ data: { id: id(), code: marker, name: 'Historical group', term: '2026-1', lecturerId: users.lecturer.id } });
  activity = await prisma.teachingActivity.create({ data: { id: id(), groupId: group.id, bookingId: booking.id, learningGoal: 'Historical learning goal' } });
  await prisma.teachingMembership.create({ data: { groupId: group.id, userId: users.student.id } });
  for (const name of ['student','lecturer','staff']) assert.equal((await call('get', '/lab-workspace/groups', name)).status,403);
  const archive = await call('get', '/lab-workspace/groups/'+group.id, 'admin');
  assert.equal(archive.status,200); assert.equal(archive.body.activities[0].id,activity.id);
  assert.equal((await call('post','/lab-workspace/groups','admin',{code:'NEW'})).status,404);
  assert.equal((await call('post','/lab-workspace/groups/'+group.id+'/members','admin',{email:users.student.email})).status,404);
  assert.equal((await call('patch','/lab-workspace/groups/'+group.id+'/activities/'+activity.id,'admin',{decision:'ENDORSED',feedback:'No longer active'})).status,404);
  assert.equal((await prisma.booking.findUnique({where:{id:booking.id}})).status,'CONFIRMED');
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

test('maintenance save rechecks bookings created after a clear impact preview', async () => {
  const data = { resourceId: equipment.id, title: 'Preview race regression', kind: 'maintenance', startAt: '2026-10-08T02:00:00Z', endAt: '2026-10-08T03:00:00Z' };
  const created = await call('post', '/maintenance', 'staff', data);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const update = { startAt: '2026-10-09T02:00:00Z', endAt: '2026-10-09T03:00:00Z', changeReason: 'Technician requested a new date' };
  const impact = await call('get', `/maintenance/impact?${new URLSearchParams({ resourceId: equipment.id, startAt: update.startAt, endAt: update.endAt })}`, 'staff');
  assert.equal(impact.status, 200);
  assert.deepEqual(impact.body.conflicts, []);
  await prisma.booking.create({ data: { id: id(), resourceId: equipment.id, requestedById: users.student.id, title: 'Booking committed after preview', purpose: 'Race regression', status: 'CONFIRMED', startAt: new Date(update.startAt), endAt: new Date(update.endAt) } });
  const saved = await call('patch', `/maintenance/${created.body.id}`, 'staff', update);
  assert.equal(saved.status, 409, JSON.stringify(saved.body));
  const persisted = await prisma.maintenanceWindow.findUnique({ where: { id: created.body.id } });
  assert.equal(persisted.startAt.toISOString(), data.startAt.replace('Z', '.000Z'));
});
