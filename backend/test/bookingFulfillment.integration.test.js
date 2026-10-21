import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.FULFILLMENT_TEST_DATABASE_URL || 'http://missing');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_booking_fulfillment_test');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', JWT_SECRET: 'isolated-fulfillment-test-secret-2026', RATE_LIMIT_MAX: '10000',
  ROOM_ACCESS_SECRET_KEY: crypto.randomBytes(32).toString('base64'), PAYMENTS_ENABLED: 'true', VNPAY_ENABLED: 'true', VNPAY_TMN_CODE: 'TESTONLY', VNPAY_HASH_SECRET: 'fulfillment-test-only-secret',
  VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', VNPAY_RETURN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/return', VNPAY_IPN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/ipn',
  PAYMENT_APP_URL: 'http://localhost:5173', CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173', CHATGPT_BRIDGE_ENABLED: 'false', EMAIL_ENABLED: 'false', MCP_ASSISTANT_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }, fulfillment, bookings, notifications] = await Promise.all([
  import('../src/db.js'), import('../src/app.js'), import('../src/services/bookingFulfillmentService.js'), import('../src/services/bookingService.js'), import('../src/services/notificationService.js')
]);
const http = request(createApp()), id = () => crypto.randomUUID(), marker = id(), actors = {}, tokens = {};
const now = new Date(), minute = 60000;
let lab;
const auth = name => ({ Authorization: `Bearer ${tokens[name]}` });
async function resource(category = 'ROOM') {
  return prisma.resource.create({ data: { id: id(), code: id(), name: 'Fulfillment test', category, subtype: 'OTHER', location: 'LAB desk A', laboratoryId: lab.id } });
}
async function fixtureBooking(r, options = {}) {
  return prisma.booking.create({ data: { id: id(), resourceId: r.id, requestedById: actors.owner.id, title: 'Isolated fulfillment test', purpose: 'Test only', contactSnapshot: { fullName:'owner', phone:'0901234567', email:actors.owner.email }, status: 'CONFIRMED', startAt: new Date(+now + 10 * minute), endAt: new Date(+now + 70 * minute), ...options } });
}
async function setupRoom(r) { return fulfillment.configureFulfillment(r.id, actors.admin, { expectedVersion: 0, roomPassword: 'RoomPass2026', deliveryAllowed: false, pickupInstructions: 'LAB desk A' }); }
const fails = (code) => error => error.code === code;
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_booking_fulfillment_test');
  assert.ok((await prisma.user.findMany()).every(row => row.email.endsWith('@fulfillment.test')), 'Refuse unrelated data');
  const campus = await prisma.campus.create({ data: { id: id(), code: marker, name: 'Isolated test' } });
  const building = await prisma.building.create({ data: { id: id(), code: marker, name: 'Isolated test', campusId: campus.id } });
  lab = await prisma.laboratory.create({ data: { id: id(), code: marker, name: 'Isolated test', buildingId: building.id } });
  const passwordHash = await bcrypt.hash('FulfillmentTest!2026', 4);
  for (const [name, role] of Object.entries({ admin: 'ADMIN', staff: 'LAB_STAFF', outsider: 'LAB_STAFF', owner: 'CUSTOMER', peer: 'CUSTOMER' })) {
    actors[name] = await prisma.user.create({ data: { id: id(), fullName: name, email: `${name}-${marker}@fulfillment.test`, passwordHash, role } });
    const login = await http.post('/api/auth/login').send({ email: actors[name].email, password: 'FulfillmentTest!2026' }); assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: lab.id } });
});
test.after(async () => prisma.$disconnect());

test('room configuration is encrypted, audited, ADMIN-only and never public', async () => {
  const r = await resource(); const setting = await setupRoom(r);
  assert.equal(setting.roomAccessConfigured, true); assert.ok(!JSON.stringify(setting).includes('RoomPass2026'));
  const stored = await prisma.resourceFulfillment.findUnique({ where: { resourceId: r.id } }); assert.ok(!stored.roomPasswordCiphertext.includes('RoomPass2026'));
  const publicRow = await http.get(`/api/resources/${r.id}`); assert.equal(publicRow.status, 200); assert.ok(!JSON.stringify(publicRow.body).includes('roomPassword'));
  assert.equal((await http.put(`/api/resources/${r.id}/fulfillment`).set(auth('staff')).send({})).status, 403);
  await assert.rejects(fulfillment.configureFulfillment(r.id, actors.admin, { expectedVersion: 0, roomPassword: 'NewPass2026', deliveryAllowed: false, pickupInstructions: '' }), fails('CONFIGURATION_CHANGED'));
  const audit = await prisma.systemAuditEvent.findMany({ where: { targetId: r.id } }); assert.ok(audit.length); assert.ok(!JSON.stringify(audit).includes('RoomPass2026'));
});
test('check-in window has exact 30-minute inclusive opening and exclusive end', () => {
  const b = { startAt: new Date(+now + 30 * minute), endAt: new Date(+now + 90 * minute) };
  assert.throws(() => fulfillment.assertHandoverWindow(b, new Date(+now - 1)), fails('BOOKING_HANDOVER_TOO_EARLY'));
  fulfillment.assertHandoverWindow(b, now);
  assert.throws(() => fulfillment.assertHandoverWindow(b, b.endAt), fails('BOOKING_HANDOVER_EXPIRED'));
});
test('unpaid, other owner, equipment and missing booking contact fail closed', async () => {
  const r = await resource(); await setupRoom(r); const b = await fixtureBooking(r, { feeAmountVnd: 50000 });
  await assert.rejects(fulfillment.bookingAccess(b.id, actors.owner), fails('BOOKING_PAYMENT_REQUIRED'));
  await assert.rejects(fulfillment.selfCheckInRoom({ bookingId: b.id, actor: actors.owner }), fails('BOOKING_PAYMENT_REQUIRED'));
  await assert.rejects(fulfillment.bookingAccess(b.id, actors.peer), fails('NOT_FOUND'));
  const equipment = await fixtureBooking(await resource('EQUIPMENT'));
  await assert.rejects(fulfillment.selfCheckInRoom({ bookingId: equipment.id, actor: actors.owner }), fails('FORBIDDEN'));
  const missing = await fixtureBooking(await resource(), { contactSnapshot: { fullName:'owner', phone:'', email:actors.owner.email } });
  await assert.rejects(fulfillment.selfCheckInRoom({ bookingId: missing.id, actor: actors.owner }), fails('ROOM_ACCESS_NOT_CONFIGURED'));
});
test('staff handover enforces time and assigned LAB; failed action writes no usage', async () => {
  const b = await fixtureBooking(await resource('EQUIPMENT'), { startAt: new Date(+now + 2 * 3600000), endAt: new Date(+now + 3 * 3600000) });
  const early = await http.post(`/api/bookings/${b.id}/check-out`).set(auth('staff')).send({ conditionBefore: 'Inspected' });
  assert.equal(early.status, 409); assert.equal(early.body.error.code, 'BOOKING_HANDOVER_TOO_EARLY');
  assert.equal((await http.post(`/api/bookings/${b.id}/check-out`).set(auth('outsider')).send({ conditionBefore: 'Inspected' })).status, 403);
  assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id } }), 0);
});
test('expired bookings cannot start a new payment session', async () => {
  const r = await resource(); const b = await fixtureBooking(r, { feeAmountVnd: 80000, startAt: new Date(+now-7200000), endAt: new Date(+now-3600000) });
  const { ensureBookingCharge } = await import('../src/services/bookingPricingService.js');
  const payment = await ensureBookingCharge(prisma, { ...b, resource: r });
  const response = await http.post(`/api/payments/${payment.id}/vnpay`).set(auth('owner')).send({});
  assert.equal(response.status, 409); assert.equal(response.body.error.code, 'BOOKING_HANDOVER_EXPIRED');
  assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: payment.id } })).provider, 'unselected');
});
test('concurrent owner check-in creates one real transition; early return frees GiST slot but awaits inspection', async () => {
  const r = await resource(); await setupRoom(r); const b = await fixtureBooking(r);
  const access = await fulfillment.bookingAccess(b.id, actors.owner); assert.equal(access.roomPassword, '0901234567'); assert.equal(access.roomAccessPolicy, 'BOOKING_PHONE');
  const checked = await Promise.all([1,2].map(() => fulfillment.selfCheckInRoom({ bookingId: b.id, actor: actors.owner }, prisma, () => now)));
  assert.ok(checked.every(row => row.status === 'CHECKED_OUT')); assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id, action: 'CHECK_OUT' } }), 1);
  assert.equal((await prisma.resource.findUnique({ where: { id: r.id } })).operationalStatus, 'IN_USE');
  const returned = await bookings.selfReturnRoom({ bookingId: b.id, actorId: actors.owner.id, actorRole: 'CUSTOMER', conditionAfter: 'I have left, no damage observed' }, prisma, () => new Date(+now + minute));
  assert.equal(returned.status, 'RETURNED'); assert.ok(returned.schedulingReleasedAt); assert.equal(returned.completedAt, null);
  assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id, action: 'COMPLETE' } }), 0);
  assert.equal(await bookings.checkSlotConflict(r.id, b.startAt, b.endAt), null);
  const replacement = await fixtureBooking(r); assert.ok(replacement.id);
  assert.ok(await bookings.checkSlotConflict(r.id, b.startAt, b.endAt));
  const conflict = await http.post('/api/bookings').set(auth('owner')).send({ resourceId: r.id, title: 'Conflicting booking', startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), contact: { fullName: 'Owner name', phone: '0900000001' } });
  assert.equal(conflict.status, 400); assert.equal(conflict.body.error.code, 'BOOKING_NOTICE_REQUIRED');
  const inspection = await http.post(`/api/bookings/${b.id}/complete`).set(auth('staff')).send({ reason: 'Room inspected by staff' }); assert.equal(inspection.status, 200); assert.equal(inspection.body.status, 'COMPLETED');
  assert.equal((await prisma.booking.findUnique({ where: { id: replacement.id } })).status, 'CONFIRMED');
});
test('hard state and maintenance prevent check-in; room return never clears damage', async () => {
  const r = await resource(); await setupRoom(r); const b = await fixtureBooking(r);
  await prisma.maintenanceWindow.create({ data: { id: id(), resourceId: r.id, title: 'Maintenance test', startAt: now, endAt: new Date(+now + minute * 5) } });
  await assert.rejects(fulfillment.selfCheckInRoom({ bookingId: b.id, actor: actors.owner }), fails('BOOKING_CONFLICT'));
  await prisma.maintenanceWindow.updateMany({ where: { resourceId: r.id }, data: { status: 'cancelled' } });
  await fulfillment.selfCheckInRoom({ bookingId: b.id, actor: actors.owner }, prisma, () => now);
  await prisma.resource.update({ where: { id: r.id }, data: { operationalStatus: 'BROKEN' } });
  await bookings.selfReturnRoom({ bookingId: b.id, actorId: actors.owner.id, actorRole: 'CUSTOMER', conditionAfter: 'Damage reported' });
  assert.equal((await prisma.resource.findUnique({ where: { id: r.id } })).operationalStatus, 'BROKEN');
  await prisma.maintenanceWindow.create({ data: { id: id(), resourceId: r.id, title: 'Repair after owner return', startAt: b.startAt, endAt: b.endAt } });
  const completed = await http.post(`/api/bookings/${b.id}/complete`).set(auth('staff')).send({ reason: 'Damage recorded; repair scheduled' }); assert.equal(completed.status, 200);
  assert.equal((await prisma.resource.findUnique({ where: { id: r.id } })).operationalStatus, 'BROKEN');
});
test('early check-in cannot take a preceding reservation; legacy unreleased return still blocks', async () => {
  const r = await resource(); await setupRoom(r);
  const previous = await fixtureBooking(r, { startAt: new Date(+now - minute), endAt: new Date(+now + 10 * minute) });
  const next = await fixtureBooking(r, { startAt: previous.endAt, endAt: new Date(+now + 70 * minute) });
  await assert.rejects(fulfillment.selfCheckInRoom({ bookingId: next.id, actor: actors.owner }, prisma, () => now), fails('BOOKING_CONFLICT'));
  await prisma.booking.update({ where: { id: previous.id }, data: { status: 'RETURNED', returnedAt: now } });
  assert.ok(await bookings.checkSlotConflict(r.id, previous.startAt, previous.endAt));
});
test('delivery requires explicit resource setting and complete valid address; room cannot be delivered', async () => {
  const r = await resource('EQUIPMENT');
  await assert.rejects(fulfillment.bookingFulfillmentSnapshot(prisma, r, { mode: 'HOME_DELIVERY' }), fails('DELIVERY_UNAVAILABLE'));
  await fulfillment.configureFulfillment(r.id, actors.admin, { expectedVersion: 0, deliveryAllowed: true, pickupInstructions: 'Reception A' });
  await assert.rejects(fulfillment.bookingFulfillmentSnapshot(prisma, r, { mode: 'HOME_DELIVERY' }), fails('DELIVERY_ADDRESS_REQUIRED'));
  const snapshot = await fulfillment.bookingFulfillmentSnapshot(prisma, r, { mode: 'LAB_PICKUP' }); assert.equal(snapshot.pickupInstructions, 'Reception A');
  await assert.rejects(fulfillment.bookingFulfillmentSnapshot(prisma, await resource(), { mode: 'HOME_DELIVERY' }), fails('VALIDATION_ERROR'));
});
test('paid reminders scheduled once at 30/15 minutes and cancelled on return', async () => {
  const b = await fixtureBooking(await resource(), { startAt: new Date(+now + 60 * minute), endAt: new Date(+now + 120 * minute) });
  await notifications.scheduleBookingReminders(prisma, b, now); await notifications.scheduleBookingReminders(prisma, b, now);
  const rows = await prisma.notification.findMany({ where: { userId: actors.owner.id, dedupeKey: { startsWith: `booking:${b.id}:` } } });
  assert.equal(rows.length, 2);
  assert.equal(+rows.find(row => row.type === 'BOOKING_UPCOMING').scheduledAt, +b.startAt - 30 * minute);
  assert.equal(+rows.find(row => row.type === 'RETURN_REMINDER').scheduledAt, +b.endAt - 15 * minute);
  assert.equal(await notifications.cancelPendingBookingReminders(prisma, b.id), 2);
});
test('expired room access hides password but still allows overdue owner return', async () => {
  const r = await resource(); await setupRoom(r); const b = await fixtureBooking(r);
  await fulfillment.selfCheckInRoom({ bookingId: b.id, actor: actors.owner }, prisma, () => now);
  const overdue = new Date(+b.endAt + minute);
  const access = await fulfillment.bookingAccess(b.id, actors.owner, prisma, overdue);
  assert.equal(access.roomPassword, null); assert.equal(access.canCheckIn, false);
  const returned = await bookings.selfReturnRoom({ bookingId: b.id, actorId: actors.owner.id, actorRole: 'CUSTOMER', conditionAfter: 'Room vacated' }, prisma, () => overdue);
  assert.equal(returned.status, 'RETURNED'); assert.equal(+returned.actualEndAt, +overdue);
});
test('reminder delivery after downtime discards obsolete bookings and sends valid reminders once', async () => {
  const b = await fixtureBooking(await resource(), { startAt: new Date(+now + 60 * minute), endAt: new Date(+now + 120 * minute) });
  await notifications.scheduleBookingReminders(prisma, b, now);
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } });
  await notifications.dispatchDueNotifications(prisma, new Date(+now + 110 * minute), actors.owner.id);
  assert.equal(await prisma.notification.count({ where: { dedupeKey: { startsWith: `booking:${b.id}:` } } }), 0);
  const valid = await fixtureBooking(await resource(), { startAt: new Date(+now + 60 * minute), endAt: new Date(+now + 120 * minute) });
  await notifications.scheduleBookingReminders(prisma, valid, now);
  await notifications.dispatchDueNotifications(prisma, new Date(+now + 31 * minute), actors.owner.id);
  const notice = await prisma.notification.findUnique({ where: { dedupeKey: `booking:${valid.id}:BOOKING_UPCOMING` } });
  assert.ok(notice.sentAt);
  await notifications.dispatchDueNotifications(prisma, new Date(+now + 32 * minute), actors.owner.id);
  assert.equal(+(await prisma.notification.findUnique({ where: { id: notice.id } })).sentAt, +notice.sentAt);
});
test('VNPAY return redirects to allowlisted receipt and does not settle; signed IPN settles once', async () => {
  const b = await fixtureBooking(await resource(), { feeAmountVnd: 80000 });
  b.resource = await prisma.resource.findUniqueOrThrow({ where: { id: b.resourceId } });
  const { ensureBookingCharge } = await import('../src/services/bookingPricingService.js'); const payment = await ensureBookingCharge(prisma, b);
  const opened = await http.post(`/api/payments/${payment.id}/vnpay`).set(auth('owner')).set('Origin', 'http://127.0.0.1:5173').send({}); assert.equal(opened.status, 200);
  const params = { vnp_TmnCode: 'TESTONLY', vnp_Amount: '8000000', vnp_TxnRef: payment.txnRef, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: String(Date.now()), vnp_PayDate: '20261014120000' };
  const query = Object.keys(params).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  params.vnp_SecureHash = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(query).digest('hex');
  const returned = await http.get('/api/payments/vnpay/return').query(params); assert.equal(returned.status, 303); assert.equal(returned.headers.location, `http://127.0.0.1:5173/workspace/payments?booking=${b.id}&returned=1`);
  assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: payment.id } })).status, 'pending');
  const settled = await http.get('/api/payments/vnpay/ipn').query(params); assert.equal(settled.body.RspCode, '00');
  const again = await http.get('/api/payments/vnpay/ipn').query(params); assert.equal(again.body.RspCode, '02');
  assert.equal(await prisma.notification.count({ where: { dedupeKey: `payment:${payment.id}:SUCCESS:owner` } }), 1);
});
