import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const database = new URL(process.env.PAYMENT_HOLD_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_payment_hold_test');
Object.assign(process.env, {
  DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000', JWT_SECRET: 'payment-hold-isolated-test-secret',
  PAYMENTS_ENABLED: 'true', VNPAY_ENABLED: 'true', VNPAY_TMN_CODE: 'TESTONLY', VNPAY_HASH_SECRET: 'isolated-payment-hold-signing-secret',
  VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', VNPAY_RETURN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/return',
  VNPAY_IPN_URL: 'http://127.0.0.1:8000/api/payments/vnpay/ipn', PAYMENT_APP_URL: 'http://localhost:5173',
  CHATGPT_BRIDGE_ENABLED: 'false', EMAIL_ENABLED: 'false', MCP_ASSISTANT_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false'
});
const [{ prisma }, { createApp }, hold, provider] = await Promise.all([
  import('../src/db.js'), import('../src/app.js'), import('../src/services/bookingPaymentHoldService.js'), import('../src/services/paymentProviders.js')
]);
const http = request(createApp()), id = () => crypto.randomUUID(), actors = {}, tokens = {};
let lab;
const auth = name => ({ Authorization: `Bearer ${tokens[name]}` });

async function resource(category = 'EQUIPMENT', fee = 50000) {
  const row = await prisma.resource.create({ data: { id: id(), code: id(), name: 'Isolated payment hold', category, subtype: 'OTHER', location: 'Test LAB', laboratoryId: lab.id } });
  if (fee) await prisma.resourcePricingRule.create({ data: { id: id(), resourceId: row.id, purposeCode: 'STUDY', label: 'Test price', hourlyRateVnd: fee } });
  return row;
}
async function book(r, actor = 'owner', window = {}) {
  const startAt = window.startAt || new Date(Date.now() + 48 * 3600000).toISOString();
  const endAt = window.endAt || new Date(Date.parse(startAt) + 3600000).toISOString();
  const quote = await http.post('/api/booking-pricing/quote').set(auth(actor)).send({ resourceId: r.id, purposeCode: 'STUDY', startAt, endAt });
  assert.equal(quote.status, 200, JSON.stringify(quote.body));
  return http.post('/api/bookings').set(auth(actor)).send({ resourceId: r.id, title: 'Isolated test reservation', purpose: 'Testing', purposeCode: 'STUDY',
    acceptedQuote: { amountVnd: quote.body.amountVnd, version: quote.body.version, loyaltyPolicyVersion: quote.body.loyaltyPolicyVersion },
    contact: { fullName: 'Test Customer', phone: '0900000001' }, startAt, endAt });
}
const chargeFor = booking => prisma.paymentTransaction.findFirst({ where: { bookingId: booking.id }, orderBy: { createdAt: 'desc' } });
const pay = row => http.post(`/api/payments/${row.id}/vnpay`).set(auth('owner')).send({});
function callback(row, changes = {}) {
  const values = { vnp_TmnCode: 'TESTONLY', vnp_Amount: String(row.amount * 100), vnp_TxnRef: row.txnRef, vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
    vnp_TransactionNo: BigInt(`0x${crypto.createHash('sha256').update(row.txnRef).digest('hex').slice(0, 12)}`).toString(), vnp_PayDate: provider.vietnamPaymentDate(new Date()), ...changes };
  return { ...values, vnp_SecureHash: provider.signVnpay(values, process.env.VNPAY_HASH_SECRET) };
}
const ipn = (row, changes) => http.get('/api/payments/vnpay/ipn').query(callback(row, changes));

test('payment reservation lifecycle on isolated PostgreSQL', async t => {
  try {
    assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_payment_hold_test');
    assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@payment-hold.test')), 'Refuse unrelated data');
    const campus = await prisma.campus.create({ data: { id: id(), code: id(), name: 'Test only' } });
    const building = await prisma.building.create({ data: { id: id(), code: id(), name: 'Test only', campusId: campus.id } });
    lab = await prisma.laboratory.create({ data: { id: id(), code: id(), name: 'Test only', buildingId: building.id } });
    await prisma.labPolicy.create({ data: { id: id(), laboratoryId: lab.id, workDayStartHour: 0, workDayEndHour: 24, allowWeekend: true } });
    for (const [name, role] of Object.entries({ owner: 'CUSTOMER', peer: 'CUSTOMER', admin: 'ADMIN', staff: 'LAB_STAFF' })) {
      actors[name] = await prisma.user.create({ data: { id: id(), email: `${id()}@payment-hold.test`, fullName: name, role, passwordHash: await bcrypt.hash('HoldTest!2026', 4) } });
      const login = await http.post('/api/auth/login').send({ email: actors[name].email, password: 'HoldTest!2026' });
      assert.equal(login.status, 200); tokens[name] = login.body.accessToken;
    }
    await prisma.userLabAssignment.create({ data: { userId: actors.staff.id, laboratoryId: lab.id } });

    await t.test('short-notice free and priced bookings fail at public quote, preflight and direct creation without writes', async () => {
      for (const fee of [0, 50000]) {
        const r = await resource('EQUIPMENT', fee), startAt = new Date(Date.now() + 60000).toISOString(), endAt = new Date(Date.now() + 3660000).toISOString();
        const before = await prisma.booking.count({ where: { resourceId: r.id } });
        const payload = { resourceId: r.id, purposeCode: 'STUDY', startAt, endAt };
        for (const [path, body] of [['/api/booking-pricing/quote', payload], ['/api/bookings/preflight', payload], ['/api/bookings', { ...payload, title: 'Too soon', contact: { fullName: 'Owner name', phone: '0900000001' } }]]) {
          const response = await http.post(path).set(auth('owner')).send(body);
          assert.equal(response.status, 400, `${path}: ${JSON.stringify(response.body)}`);
          assert.equal(response.body.error.code, 'BOOKING_NOTICE_REQUIRED');
          assert.equal(response.body.error.details.minAdvanceBookingMinutes, 30);
        }
        const available = await http.get('/api/bookings/availability').set(auth('owner')).query({ resourceId: r.id, startAt, endAt });
        assert.equal(available.status, 400); assert.equal(available.body.error.code, 'BOOKING_NOTICE_REQUIRED');
        const publicQuote = await http.post('/api/booking-pricing/quote').send(payload);
        assert.equal(publicQuote.status, 400); assert.equal(publicQuote.body.error.code, 'BOOKING_NOTICE_REQUIRED');
        assert.equal(await prisma.booking.count({ where: { resourceId: r.id } }), before);
        assert.equal(await prisma.paymentTransaction.count({ where: { booking: { resourceId: r.id } } }), 0);
      }
    });

    await t.test('ADMIN notice edits are audited, scoped, validated and invalidate an earlier review', async () => {
      const r = await resource('EQUIPMENT', 0), startAt = new Date(Date.now() + 45 * 60000).toISOString(), endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
      const payload = { resourceId: r.id, startAt, endAt };
      assert.equal((await http.post('/api/bookings/preflight').set(auth('owner')).send(payload)).status, 200);
      const path = `/api/laboratories/${lab.id}/booking-policy`, change = { minAdvanceBookingMinutes: 60, expectedMinAdvanceBookingMinutes: 30, reason: 'Allow the LAB to prepare resources' };
      for (const actor of ['owner','staff']) assert.equal((await http.patch(path).set(auth(actor)).send(change)).status, 403);
      assert.equal((await http.patch(path).set(auth('admin')).send({ ...change, minAdvanceBookingMinutes: 1 })).status, 400);
      assert.equal((await http.patch(path).set(auth('admin')).send(change)).status, 200);
      assert.equal((await http.patch(path).set(auth('admin')).send(change)).status, 409);
      const response = await http.post('/api/bookings').set(auth('owner')).send({ ...payload, title: 'Review expired by policy change', contact: { fullName: 'Owner name', phone: '0900000001' } });
      assert.equal(response.status, 400); assert.equal(response.body.error.details.minAdvanceBookingMinutes, 60);
      assert.equal(await prisma.systemAuditEvent.count({ where: { targetId: lab.id, action: 'LAB_BOOKING_POLICY_CHANGED' } }), 1);
      assert.equal(await prisma.booking.count({ where: { resourceId: r.id } }), 0);
      assert.equal((await http.patch(path).set(auth('admin')).send({ ...change, expectedMinAdvanceBookingMinutes: 60, minAdvanceBookingMinutes: 30 })).status, 200);
    });

    await t.test('legacy short-notice payment URL is capped at start; exact start expires even if stored deadline is later', async () => {
      const b = (await book(await resource())).body, charge = await chargeFor(b);
      const startAt = new Date(Date.now() + 60000), paymentDueAt = new Date(Date.now() + 10 * 60000);
      await prisma.booking.update({ where: { id: b.id }, data: { startAt, endAt: new Date(+startAt + 3600000), paymentDueAt } });
      const response = await pay(charge); assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.ok(Date.parse(response.body.transaction.paymentUrlExpiresAt) <= +startAt);
      assert.equal(Date.parse(response.body.transaction.booking.paymentDueAt), +startAt);
      await hold.expirePaymentHolds(prisma, { bookingId: b.id, now: new Date(+startAt - 1) });
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'PENDING_APPROVAL');
      await hold.expirePaymentHolds(prisma, { bookingId: b.id, now: startAt });
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal((await pay(charge)).status, 409);
      await ipn(charge);
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).reconciliationStatus, 'manual_review');
    });

    await t.test('late callback alone expires a started legacy hold without scheduler assistance', async () => {
      const b = (await book(await resource())).body, charge = await chargeFor(b);
      await pay(charge);
      await prisma.booking.update({ where: { id: b.id }, data: { startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 3600000), paymentDueAt: new Date(Date.now() + 10 * 60000) } });
      assert.equal((await ipn(charge)).body.RspCode, '00');
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).reconciliationStatus, 'manual_review');
    });

    for (const category of ['ROOM', 'EQUIPMENT']) await t.test(`${category}: pending payment reserves the slot without confirming or allowing handover`, async () => {
      const r = await resource(category), response = await book(r), b = response.body;
      assert.equal(response.status, 201, JSON.stringify(b));
      assert.equal(b.status, 'PENDING_APPROVAL'); assert.equal(b.approvedAt, null);
      assert.ok(Math.abs(Date.parse(b.paymentDueAt) - Date.parse(b.createdAt) - hold.PAYMENT_HOLD_MS) < 1000);
      assert.equal((await chargeFor(b)).status, 'pending');
      assert.equal(await prisma.notification.count({ where: { userId: actors.owner.id, dedupeKey: `booking:${b.id}:auto-confirmed` } }), 0);
      assert.equal((await book(r, 'peer', b)).status, 409);
      assert.equal((await http.post(`/api/bookings/${b.id}/approve`).set(auth('staff')).send({})).status, 409);
      assert.equal((await http.post(`/api/bookings/${b.id}/check-out`).set(auth('staff')).send({ conditionBefore: 'Inspected' })).status, 409);
      const charges = await http.get(`/api/payments/booking/${b.id}`).set(auth('peer')); assert.ok([403,404].includes(charges.status));
      const calendar = await http.get('/api/calendar/slots').query({ resource_id: r.id, start_date: b.startAt }).set(auth('owner'));
      assert.ok(JSON.stringify(calendar.body).includes('calendar.paymentHold'));
    });

    await t.test('free bookings confirm immediately without a synthetic payment', async () => {
      const response = await book(await resource('ROOM', 0)); assert.equal(response.status, 201);
      assert.equal(response.body.status, 'CONFIRMED'); assert.equal(response.body.paymentDueAt, null); assert.equal(await chargeFor(response.body), null);
    });

    await t.test('staff cannot move an already valid booking into the preparation window', async () => {
      const b = (await book(await resource('ROOM', 0))).body;
      const startAt = new Date(Date.now() + 60000).toISOString(), endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
      const response = await http.post(`/api/bookings/${b.id}/reschedule`).set(auth('staff')).send({ startAt, endAt, expectedStartAt: b.startAt, reason: 'Verify preparation window' });
      assert.equal(response.status, 400, JSON.stringify(response.body)); assert.equal(response.body.error.code, 'BOOKING_NOTICE_REQUIRED');
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).startAt.toISOString(), b.startAt);
      assert.equal(await prisma.systemAuditEvent.count({ where: { targetId: b.id, action: 'BOOKING_RESCHEDULED' } }), 0);
    });

    await t.test('checkout and retry preserve the original deadline; signed IPN alone confirms', async () => {
      const b = (await book(await resource())).body, charge = await chargeFor(b);
      const deadline = new Date(Date.now() + 5 * 60000);
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: deadline } });
      const first = await pay(charge); assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.ok(Date.parse(first.body.transaction.paymentUrlExpiresAt) <= +deadline);
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'PENDING_APPROVAL');
      assert.equal((await pay(charge)).body.paymentUrl, first.body.paymentUrl);
      await ipn(charge, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
      const retry = await pay(charge); assert.equal(retry.status, 200);
      assert.equal(+(await prisma.booking.findUnique({ where: { id: b.id } })).paymentDueAt, +deadline);
      const current = await prisma.paymentTransaction.findUnique({ where: { id: retry.body.transaction.id } });
      assert.equal((await ipn(current)).body.RspCode, '00');
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CONFIRMED');
      await hold.expirePaymentHolds(prisma, { bookingId: b.id, now: new Date(+deadline + 1) });
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CONFIRMED');
      assert.equal((await ipn(current)).body.RspCode, '02');
      assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id, reason: 'PAYMENT_VERIFIED' } }), 1);
    });

    await t.test('exact expiry is idempotent; another customer can book and late IPN cannot resurrect the old booking', async () => {
      const r = await resource('ROOM'), b = (await book(r)).body, charge = await chargeFor(b);
      await pay(charge);
      const deadline = new Date(Date.now() - 1000);
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: deadline } });
      await hold.expirePaymentHolds(prisma, { bookingId: b.id, now: new Date(+deadline - 1) });
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'PENDING_APPROVAL');
      await Promise.all([1,2].map(() => hold.expirePaymentHolds(prisma, { bookingId: b.id, now: deadline })));
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id, reason: 'PAYMENT_HOLD_EXPIRED' } }), 1);
      assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).status, 'expired');
      const replacement = await book(r, 'peer', b); assert.equal(replacement.status, 201, JSON.stringify(replacement.body));
      assert.equal((await pay(charge)).status, 409);
      assert.equal((await ipn(charge)).body.RspCode, '00');
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).reconciliationStatus, 'manual_review');
      assert.equal((await prisma.booking.findUnique({ where: { id: replacement.body.id } })).status, 'PENDING_APPROVAL');
    });

    await t.test('booking creation releases an expired hold even without a running scheduler', async () => {
      const r = await resource(), b = (await book(r)).body;
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: new Date(Date.now() - 1) } });
      const results = await Promise.all([book(r, 'peer', b), book(r, 'owner', b)]);
      assert.deepEqual(results.map(row => row.status).sort(), [201,409]);
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
    });

    await t.test('payment and legacy approval queues remain distinct with scoped totals', async () => {
      const response = await http.get('/api/bookings?page=1&filter=PENDING_PAYMENT').set(auth('owner'));
      assert.equal(response.status, 200); assert.ok(response.body.items.length > 0);
      assert.ok(response.body.items.every(row => row.status === 'PENDING_APPROVAL' && row.paymentDueAt && row.requestedById === actors.owner.id));
      assert.equal(response.body.pagination.total, response.body.summary.pendingPayment);
      const legacy = await http.get('/api/bookings?page=1&filter=PENDING_APPROVAL').set(auth('owner'));
      assert.equal(legacy.status, 200); assert.equal(legacy.body.pagination.total, 0);
    });

    await t.test('late signed IPN racing expiry records one cancellation without restoring occupancy', async () => {
      const b = (await book(await resource())).body, charge = await chargeFor(b);
      await pay(charge);
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: new Date(Date.now() - 1) } });
      const [response] = await Promise.all([ipn(charge), hold.expirePaymentHolds(prisma, { bookingId: b.id })]);
      assert.equal(response.body.RspCode, '00');
      assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      assert.equal(await prisma.usageLog.count({ where: { bookingId: b.id, reason: 'PAYMENT_HOLD_EXPIRED' } }), 1);
      assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).reconciliationStatus, 'manual_review');
    });

    await t.test('an authorized payment read enforces expiry without waiting for the background worker', async () => {
      const b = (await book(await resource())).body, charge = await chargeFor(b);
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: new Date(Date.now() - 1) } });
      const response = await http.get(`/api/payments/${charge.id}`).set(auth('owner'));
      assert.equal(response.status, 200); assert.equal(response.body.status, 'expired');
      assert.equal(response.body.booking.status, 'CANCELLED');
    });

    await t.test('background scheduler expires holds without a browser or a payment-page visit', async () => {
      const b = (await book(await resource())).body;
      await prisma.booking.update({ where: { id: b.id }, data: { paymentDueAt: new Date(Date.now() + 500) } });
      const stop = hold.startPaymentHoldScheduler(prisma);
      try {
        await new Promise(resolve => setTimeout(resolve, 5500));
        assert.equal((await prisma.booking.findUnique({ where: { id: b.id } })).status, 'CANCELLED');
      } finally { await stop(); }
    });

    await t.test('booking account lock still blocks credential changes until the booking transaction ends', async () => {
      const { lockCurrentAccount } = await import('../src/services/accountAccess.js');
      let release, acquired;
      const gate = new Promise(resolve => { release = resolve; });
      const locked = new Promise(resolve => { acquired = resolve; });
      const owner = await prisma.user.findUnique({ where: { id: actors.owner.id } });
      const bookingTransaction = prisma.$transaction(async tx => {
        await lockCurrentAccount(tx, owner.id, owner.authVersion);
        acquired(); await gate;
      });
      await locked;
      let changed = false;
      const credentialChange = prisma.user.update({ where: { id: owner.id }, data: { authVersion: { increment: 1 } } }).then(() => { changed = true; });
      try { await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(changed, false); }
      finally { release(); }
      await bookingTransaction; await credentialChange;
      await assert.rejects(prisma.$transaction(tx => lockCurrentAccount(tx, owner.id, owner.authVersion)), error => error.code === 'AUTH_INVALID');
    });
  } finally { await prisma.$disconnect(); }
});
