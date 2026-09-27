import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

const databaseUrl = new URL(process.env.DATABASE_URL || "http://missing");
assert.equal(databaseUrl.hostname, "127.0.0.1");
assert.equal(databaseUrl.port, "15436");
assert.match(databaseUrl.pathname, /^\/lab_resources_phase_h_payment_test_[a-z0-9_]+$/);

Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_FORMAT: "dev",
  RATE_LIMIT_MAX: "5000",
  JWT_SECRET: "phase-h-isolated-integration-secret-only",
  PAYMENTS_ENABLED: "true",
  VNPAY_ENABLED: "true",
  VNPAY_TMN_CODE: "TESTONLY",
  VNPAY_HASH_SECRET: "phase-h-signed-fixture-secret",
  VNPAY_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  VNPAY_RETURN_URL: "http://127.0.0.1:15003/api/payments/vnpay/return",
  VNPAY_IPN_URL: "http://127.0.0.1:15003/api/payments/vnpay/ipn",
  PAYMENT_APP_URL: "http://127.0.0.1:5173",
});

const [{ createApp }, { prisma }, { ensureBookingCharge }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js"),
  import("../src/services/bookingPricingService.js"),
]);
const app = createApp();
const http = request(app);
const password = "PhaseH!Pass2026";
const tokens = {};
const bearer = (name) => ({ Authorization: `Bearer ${tokens[name]}` });
let sequence = 0;

function signed(params) {
  const query = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`)
    .join("&");
  return {
    ...params,
    vnp_SecureHash: crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET).update(query).digest("hex"),
  };
}

function callback(row, changes = {}) {
  const transactionNo = BigInt(`0x${crypto.createHash("sha256").update(row.txnRef).digest("hex").slice(0, 12)}`).toString();
  return signed({
    vnp_TmnCode: "TESTONLY",
    vnp_Amount: String(row.amount * 100),
    vnp_TxnRef: row.txnRef,
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TransactionNo: transactionNo,
    vnp_PayDate: "20260926120000",
    ...changes,
  });
}

async function seed() {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(`/${identity.database}`, databaseUrl.pathname);
  assert.match(identity.version, /^16\./);
  assert.equal(await prisma.user.count(), 0, "Phase H test database must be empty and disposable");
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.campus.create({ data: { id: "phase-h-campus", code: "PHC", name: "Phase H Campus" } });
  await prisma.building.create({ data: { id: "phase-h-building", campusId: "phase-h-campus", code: "PHB", name: "Phase H Building" } });
  await prisma.laboratory.create({ data: { id: "phase-h-lab", buildingId: "phase-h-building", code: "PHL", name: "Phase H Lab" } });
  await prisma.labPolicy.create({ data: { id: "phase-h-policy", laboratoryId: "phase-h-lab", allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 } });
  for (const [name, role] of Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", student: "STUDENT", other: "STUDENT" })) {
    await prisma.user.create({ data: { id: `phase-h-${name}`, email: `${name}@phase-h.test`, fullName: `Phase H ${name}`, role, passwordHash } });
    const login = await http.post("/api/auth/login").send({ email: `${name}@phase-h.test`, password });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    tokens[name] = login.body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: "phase-h-staff", laboratoryId: "phase-h-lab" } });
  for (const suffix of ["a", "b", "c"]) {
    await prisma.resource.create({
      data: { id: `phase-h-resource-${suffix}`, laboratoryId: "phase-h-lab", code: `PH-${suffix.toUpperCase()}`, name: `Phase H Resource ${suffix}`, subtype: "OTHER", category: "EQUIPMENT", location: "Phase H", operationalStatus: "AVAILABLE" },
    });
  }
}

async function booking({ fee = 50000, status = "CONFIRMED", owner = "student", resource = "a" } = {}) {
  sequence += 1;
  const startAt = new Date(Date.now() + (sequence + 24) * 60 * 60 * 1000);
  return prisma.booking.create({
    data: {
      id: `phase-h-booking-${sequence}`,
      resourceId: `phase-h-resource-${resource}`,
      requestedById: `phase-h-${owner}`,
      title: `Phase H booking ${sequence}`,
      purpose: "Phase H isolated payment verification",
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
      status,
      feeAmountVnd: fee,
    },
    include: { resource: true },
  });
}

async function chargeFor(row) {
  return prisma.$transaction((tx) => ensureBookingCharge(tx, row));
}

async function initiate(row) {
  return http.post(`/api/payments/${row.id}/vnpay`).set(bearer("student")).send({});
}

async function ipn(row, changes = {}) {
  return http.get("/api/payments/vnpay/ipn").query(callback(row, changes));
}

test("Phase H payment hardening and reconciliation matrix", { timeout: 180000 }, async (t) => {
  await seed();
  t.after(async () => prisma.$disconnect());

  await t.test("01 free booking creates no payment", async () => {
    const row = await booking({ fee: 0 });
    assert.equal(await prisma.$transaction((tx) => ensureBookingCharge(tx, row)), undefined);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id } }), 0);
  });

  await t.test("02 paid confirmed booking creates authoritative payment", async () => {
    const row = await booking({ fee: 75000 });
    const charge = await chargeFor(row);
    assert.equal(charge.amount, 75000);
    assert.equal(charge.status, "pending");
  });

  await t.test("03 approval-required paid booking blocks payment until approval", async () => {
    const row = await booking({ fee: 65000, status: "PENDING_APPROVAL" });
    assert.equal(await chargeFor(row), undefined);
    assert.equal((await http.post(`/api/bookings/${row.id}/approve`).set(bearer("staff")).send({})).status, 200);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id, status: "pending" } }), 1);
  });

  await t.test("04 client amount cannot override booking snapshot", async () => {
    const row = await booking({ fee: 88000 });
    const forged = await http.post("/api/payments/charges").set(bearer("admin")).send({ bookingId: row.id, amount: 1, description: "Forged amount" });
    assert.equal(forged.status, 409);
    const created = await http.post("/api/payments/charges").set(bearer("admin")).send({ bookingId: row.id, description: "Authoritative charge" });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.amount, 88000);
  });

  await t.test("05 repeated session creation is idempotent while valid", async () => {
    const row = await booking();
    const charge = await chargeFor(row);
    const first = await initiate(charge);
    const second = await initiate(charge);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(first.body.paymentUrl, second.body.paymentUrl);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id, status: "pending" } }), 1);
  });

  await t.test("06 expired URL is retired and replaced", async () => {
    const row = await booking();
    const charge = await chargeFor(row);
    await initiate(charge);
    await prisma.paymentTransaction.update({ where: { id: charge.id }, data: { paymentUrlExpiresAt: new Date(Date.now() - 1000) } });
    const replacement = await initiate(charge);
    assert.equal(replacement.status, 200, JSON.stringify(replacement.body));
    assert.notEqual(replacement.body.transaction.id, charge.id);
    assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).status, "expired");
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id, status: "pending" } }), 1);
  });

  await t.test("07 successful payment cannot be recreated", async () => {
    const row = await booking();
    const charge = await chargeFor(row);
    await initiate(charge);
    assert.equal((await ipn(charge)).body.RspCode, "00");
    assert.equal((await initiate(charge)).status, 409);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id } }), 1);
  });

  await t.test("08 signed browser return is presentation-only", async () => {
    const row = await booking();
    const charge = await chargeFor(row);
    await initiate(charge);
    const returned = await http.get("/api/payments/vnpay/return").query(callback(charge));
    assert.equal(returned.status, 200);
    assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).status, "pending");
  });

  await t.test("09 valid success IPN can settle a prior failed callback", async () => {
    const row = await booking();
    const charge = await chargeFor(row);
    await initiate(charge);
    assert.equal((await ipn(charge, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" })).body.RspCode, "00");
    assert.equal((await ipn(charge)).body.RspCode, "00");
    assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).status, "success");
  });

  await t.test("10 invalid signature is rejected", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await http.get("/api/payments/vnpay/ipn").query({ ...callback(charge), vnp_SecureHash: "0".repeat(128) })).body.RspCode, "97");
  });

  await t.test("11 merchant mismatch and missing provider transaction ID are rejected", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await ipn(charge, { vnp_TmnCode: "FOREIGN1" })).body.RspCode, "99");
    assert.equal((await ipn(charge, { vnp_TransactionNo: "" })).body.RspCode, "99");
  });

  await t.test("12 amount mismatch is rejected", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await ipn(charge, { vnp_Amount: "1" })).body.RspCode, "04");
  });

  await t.test("13 unknown txnRef is rejected", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await ipn(charge, { vnp_TxnRef: "UNKNOWN" })).body.RspCode, "01");
  });

  await t.test("14 duplicate success IPN is idempotent", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await ipn(charge)).body.RspCode, "00");
    assert.equal((await ipn(charge)).body.RspCode, "02");
    assert.equal(await prisma.notification.count({ where: { dedupeKey: `payment:${charge.id}:SUCCESS:owner` } }), 1);
  });

  await t.test("15 concurrent duplicate success commits once", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    const responses = await Promise.all([ipn(charge), ipn(charge)]);
    assert.deepEqual(responses.map((response) => response.body.RspCode).sort(), ["00", "02"]);
  });

  await t.test("16 success then failure cannot downgrade", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge); await ipn(charge);
    assert.equal((await ipn(charge, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" })).body.RspCode, "02");
    assert.equal((await prisma.paymentTransaction.findUnique({ where: { id: charge.id } })).status, "success");
  });

  let lateSuccess;
  await t.test("17 late success after cancellation creates reconciliation exception", async () => {
    const row = await booking(); const charge = await chargeFor(row); await initiate(charge);
    assert.equal((await http.post(`/api/bookings/${row.id}/cancel`).set(bearer("student")).send({ reason: "Fixture cancellation" })).status, 200);
    assert.equal((await ipn(charge)).body.RspCode, "00");
    lateSuccess = await prisma.paymentTransaction.findUnique({ where: { id: charge.id } });
    assert.equal(lateSuccess.status, "success");
    assert.equal(lateSuccess.reconciliationStatus, "manual_review");
    assert.equal((await prisma.booking.findUnique({ where: { id: row.id } })).status, "CANCELLED");
  });

  await t.test("18 paid checkout is blocked before settlement", async () => {
    const row = await booking({ resource: "b" }); await chargeFor(row);
    const response = await http.post(`/api/bookings/${row.id}/check-out`).set(bearer("staff")).send({ conditionBefore: "Phase H fixture condition" });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "BOOKING_PAYMENT_REQUIRED");
  });

  await t.test("19 paid checkout is allowed after signed settlement", async () => {
    const row = await booking({ resource: "b" }); const charge = await chargeFor(row); await initiate(charge); await ipn(charge);
    const response = await http.post(`/api/bookings/${row.id}/check-out`).set(bearer("staff")).send({ conditionBefore: "Phase H paid handover" });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    await prisma.resource.update({ where: { id: "phase-h-resource-b" }, data: { operationalStatus: "AVAILABLE" } });
  });

  await t.test("20 free checkout is unaffected", async () => {
    const row = await booking({ fee: 0, resource: "c" });
    const response = await http.post(`/api/bookings/${row.id}/check-out`).set(bearer("staff")).send({ conditionBefore: "Phase H free handover" });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id } }), 0);
  });

  await t.test("21 cross-user payment lookup is non-enumerating", async () => {
    const row = await booking(); const charge = await chargeFor(row);
    assert.equal((await http.get(`/api/payments/${charge.id}`).set(bearer("other"))).status, 404);
    assert.deepEqual((await http.get("/api/payments/my").query({ bookingId: row.id }).set(bearer("other"))).body.transactions, []);
  });

  await t.test("22 concurrent session creation yields one active session", async () => {
    const row = await booking(); const charge = await chargeFor(row);
    const responses = await Promise.all([initiate(charge), initiate(charge)]);
    assert.ok(responses.every((response) => response.status === 200));
    assert.equal(new Set(responses.map((response) => response.body.paymentUrl)).size, 1);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: row.id, status: "pending" } }), 1);
  });

  await t.test("23 admin reconciliation is transaction-coupled and audited", async () => {
    const response = await http.post(`/api/payments/${lateSuccess.id}/reconciliation/resolve`).set(bearer("admin")).send({ reason: "Refund verified outside the application by finance fixture" });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.reconciliationStatus, "resolved");
    const audit = await prisma.systemAuditEvent.findFirst({ where: { action: "PAYMENT_RECONCILIATION_RESOLVED", targetId: lateSuccess.id } });
    assert.equal(audit.actorId, "phase-h-admin");
    assert.equal(audit.reason, "Refund verified outside the application by finance fixture");
  });

  await t.test("24 provider secret never leaks through API or audit", async () => {
    const adminLedger = await http.get("/api/payments/admin/transactions").set(bearer("admin"));
    const audit = await prisma.systemAuditEvent.findMany({ where: { targetType: "PAYMENT" } });
    const serialized = JSON.stringify({ ledger: adminLedger.body, audit });
    assert.equal(serialized.includes(process.env.VNPAY_HASH_SECRET), false);
    assert.equal(serialized.includes("vnp_SecureHash"), false);
  });
});
