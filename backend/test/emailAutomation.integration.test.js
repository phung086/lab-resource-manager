import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

const database = new URL(process.env.EMAIL_TEST_DATABASE_URL || "http://missing");
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
assert.equal(database.pathname, "/lab_resources_email_test", "Refuse business/shared databases");

// Real loopback SMTP protocol fixture. No transport mocks or external inboxes.
const messages = [], sockets = new Set();
let rejectData = false;
const smtp = net.createServer(socket => {
  sockets.add(socket); socket.on("close", () => sockets.delete(socket));
  socket.setEncoding("utf8"); socket.write("220 email-fixture.local ESMTP\r\n");
  let buffer = "", raw = "", recipient = "", data = false, auth = false;
  socket.on("data", chunk => {
    buffer += chunk;
    while (buffer.includes("\r\n")) {
      const index = buffer.indexOf("\r\n"), line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (data) {
        if (line !== ".") { raw += line.replace(/^\.\./, ".") + "\r\n"; continue; }
        data = false;
        if (rejectData) socket.write("451 4.3.0 Temporary fixture rejection\r\n");
        else { messages.push({ recipient, raw }); socket.write("250 2.0.0 Message accepted\r\n"); }
        raw = ""; continue;
      }
      if (auth) { auth = false; socket.write("235 2.7.0 Authentication successful\r\n"); }
      else if (/^EHLO /i.test(line)) socket.write("250-email-fixture.local\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
      else if (/^AUTH PLAIN/i.test(line)) {
        if (line.split(" ").length >= 3) socket.write("235 2.7.0 Authentication successful\r\n");
        else { auth = true; socket.write("334 \r\n"); }
      } else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)[1]; socket.write("250 2.1.5 OK\r\n"); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write("354 End with dot\r\n"); }
      else if (/^QUIT$/i.test(line)) socket.end("221 2.0.0 Bye\r\n");
      else socket.write("250 2.1.0 OK\r\n");
    }
  });
});
await new Promise(resolve => smtp.listen(0, "127.0.0.1", resolve));
Object.assign(process.env, {
  DATABASE_URL: database.href, NODE_ENV: "test", LOG_FORMAT: "dev", RATE_LIMIT_MAX: "10000",
  JWT_SECRET: "email-isolated-integration-secret-at-least-32-chars", PAYMENTS_ENABLED: "true", VNPAY_ENABLED: "true",
  VNPAY_TMN_CODE: "TESTONLY", VNPAY_HASH_SECRET: "email-fixture-signing-secret",
  VNPAY_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  VNPAY_RETURN_URL: "http://127.0.0.1:8000/api/payments/vnpay/return", VNPAY_IPN_URL: "http://127.0.0.1:8000/api/payments/vnpay/ipn",
  PAYMENT_APP_URL: "http://localhost:5173", EMAIL_APP_URL: "http://localhost:5173",
  SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.address().port), SMTP_USER: "fixture", SMTP_PASS: "fixture-only",
  EMAIL_FROM: '"LAB Fixture" <sender@mailautomation.test>', EMAIL_AUTOMATION_ENABLED: "false", REMINDER_SCHEDULER_ENABLED: "false"
});
const [{ createApp }, { prisma }, automation, { signVnpay }, { ensureBookingCharge }, guest] = await Promise.all([
  import("../src/app.js"), import("../src/db.js"), import("../src/services/emailAutomationService.js"),
  import("../src/services/paymentProviders.js"), import("../src/services/bookingPricingService.js"), import("../src/services/guestBookingService.js")
]);
const app = createApp();
const password = "EmailRegistration!2026";
const email = label => `${label}-${randomUUID()}@mailautomation.test`;
let token, sequence = 0;
const register = (recipient, locale = "vi") => request(app).post("/api/auth/register").set("X-LRM-Locale", locale)
  .send({ email: recipient, password });
const dispatch = options => automation.dispatchEmailDeliveries({ client: prisma, ...options });
const getDelivery = where => prisma.emailDelivery.findFirstOrThrow({ where });

function callback(payment, changes = {}) {
  const values = { vnp_TmnCode: "TESTONLY", vnp_Amount: String(payment.amount * 100), vnp_TxnRef: payment.txnRef,
    vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: String(++sequence + 900000), vnp_PayDate: "20261012153500", ...changes };
  return { ...values, vnp_SecureHash: signVnpay(values, process.env.VNPAY_HASH_SECRET) };
}

async function paymentFixture(status = "CONFIRMED") {
  sequence++;
  const startAt = new Date(Date.now() + (sequence + 72) * 3600000);
  const booking = await prisma.booking.create({ data: { id: randomUUID(), bookingCode: `EMAIL-${randomUUID().slice(0, 8)}`,
    requestedById: "email-owner", resourceId: "email-resource", title: "Equipment appointment", purpose: "Isolated email test",
    startAt, endAt: new Date(startAt.getTime() + 1800000), feeAmountVnd: 50000, status: "CONFIRMED" }, include: { resource: true } });
  const payment = await prisma.$transaction(tx => ensureBookingCharge(tx, booking));
  const started = await request(app).post(`/api/payments/${payment.id}/vnpay`).set("Authorization", `Bearer ${token}`).send({});
  assert.equal(started.status, 200, JSON.stringify(started.body));
  if (status !== "CONFIRMED") await prisma.booking.update({ where: { id: booking.id }, data: { status } });
  return { booking, payment };
}

test.before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert.equal(identity.name, "lab_resources_email_test");
  const existing = await prisma.user.findMany();
  assert.ok(existing.every(user => user.email.endsWith("@mailautomation.test")), "Refuse unrelated data");
  if (!existing.length) {
    await prisma.campus.create({ data: { id: "email-campus", code: "EMAIL", name: "Email test campus" } });
    await prisma.building.create({ data: { id: "email-building", code: "EMAIL", name: "Email test building", campusId: "email-campus" } });
    await prisma.laboratory.create({ data: { id: "email-lab", code: "EMAIL", name: "Email test LAB", buildingId: "email-building" } });
    await prisma.labPolicy.create({ data: { id: "email-policy", laboratoryId: "email-lab", allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 } });
    await prisma.resource.create({ data: { id: "email-resource", code: "EMAIL-EQUIPMENT", name: "Email equipment", subtype: "OTHER", category: "EQUIPMENT", operationalStatus: "AVAILABLE", location: "Email test", laboratoryId: "email-lab" } });
    await prisma.user.create({ data: { id: "email-owner", email: "owner@mailautomation.test", fullName: "Payment owner", role: "CUSTOMER", passwordHash: await bcrypt.hash(password, 4) } });
  }
  await prisma.emailDelivery.deleteMany(); await prisma.notification.deleteMany(); await prisma.paymentTransaction.deleteMany();
  await prisma.usageLog.deleteMany(); await prisma.booking.deleteMany(); await prisma.emailOtp.deleteMany();
  const login = await request(app).post("/api/auth/login").send({ email: "owner@mailautomation.test", password });
  assert.equal(login.status, 200); token = login.body.accessToken;
  guest.configureGuestAddressTestValidation(async () => ({ addressLine: "123 Nguyen Trai", provinceCode: "79", provinceName: "HCM", wardCode: "26734", wardName: "Ben Thanh", source: "fixture", version: "test" }));
});
test.beforeEach(async () => { await prisma.emailDelivery.deleteMany(); messages.length = 0; rejectData = false; });
test.after(async () => {
  guest.configureGuestAddressTestValidation(null);
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => smtp.close(resolve)); await prisma.$disconnect();
});

test("registration commits a durable welcome email with no passwords/tokens; real SMTP acceptance marks SENT", async () => {
  const recipient = email("register"), response = await register(recipient, "en");
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const row = await getDelivery({ userId: response.body.user.id });
  assert.equal(row.kind, "ACCOUNT_REGISTERED"); assert.equal(row.status, "PENDING"); assert.equal(row.locale, "en");
  assert.doesNotMatch(JSON.stringify(row.payload), /passwordHash|accessToken|EmailRegistration!2026/);
  const rendered = automation.renderAutomatedEmail(row);
  assert.match(rendered.subject, /registration successful/); assert.doesNotMatch(rendered.html, /<img src=x/);
  assert.match(automation.renderAutomatedEmail({...row,payload:{...row.payload,name:"<img src=x>"}}).html, /&lt;img/); assert.match(rendered.text, /password you chose/);
  assert.deepEqual(await dispatch(), { sent: 1, failed: 0 });
  const sent = await getDelivery({ id: row.id }); assert.equal(sent.status, "SENT"); assert.ok(sent.sentAt); assert.ok(sent.messageId);
  assert.equal(messages[0].recipient, recipient); assert.match(messages[0].raw, /Account registration successful/);
  assert.doesNotMatch(messages[0].raw, /EmailRegistration!2026/);
  assert.equal((await register(recipient)).status, 409); assert.equal(await prisma.emailDelivery.count(), 1);
  await dispatch(); assert.equal(messages.length, 1);
});

test("missing SMTP preserves PENDING and never fabricates success or consumes delivery attempts", async () => {
  const response = await register(email("unconfigured")); assert.equal(response.status, 201);
  const previous = process.env.SMTP_PASS; delete process.env.SMTP_PASS;
  try { assert.equal((await dispatch()).blocked, "SMTP_NOT_CONFIGURED"); }
  finally { process.env.SMTP_PASS = previous; }
  const row = await getDelivery({ userId: response.body.user.id });
  assert.equal(row.status, "PENDING"); assert.equal(row.attempts, 0); assert.equal(row.lastError, "SMTP_NOT_CONFIGURED"); assert.equal(messages.length, 0);
  await prisma.emailDelivery.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } });
  assert.equal((await dispatch()).sent, 1);
});

test("failed SMTP delivery retries with backoff; five rejections stop as FAILED and never mark SENT", async () => {
  const response = await register(email("retry")); rejectData = true;
  for (let attempt = 1; attempt <= 5; attempt++) {
    assert.equal((await dispatch()).failed, 1);
    const row = await getDelivery({ userId: response.body.user.id });
    assert.equal(row.attempts, attempt); assert.equal(row.sentAt, null); assert.equal(row.lastError, "SMTP_DELIVERY_FAILED");
    assert.equal(row.status, attempt === 5 ? "FAILED" : "PENDING");
    if (attempt < 5) {
      assert.ok(row.nextAttemptAt > new Date()); assert.equal((await dispatch()).failed, 0);
      await prisma.emailDelivery.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0) } });
    } else assert.equal(row.nextAttemptAt, null);
  }
  rejectData = false; await dispatch(); assert.equal(messages.length, 0);
});

test("concurrent workers claim a message once; a crashed worker lease recovers after restart", async () => {
  const response = await register(email("concurrent"));
  await Promise.all([dispatch(), dispatch()]); assert.equal(messages.length, 1);
  const row = await getDelivery({ userId: response.body.user.id }); assert.equal(row.attempts, 1);
  const recovery = await register(email("lease")), pending = await getDelivery({ userId: recovery.body.user.id });
  await prisma.emailDelivery.update({ where: { id: pending.id }, data: { status: "SENDING", attempts: 1, leaseToken: randomUUID(), lockedAt: new Date(0) } });
  assert.equal((await dispatch()).sent, 1); assert.equal((await getDelivery({ id: pending.id })).attempts, 2);
  const uncertain = await register(email("uncertain")), exhausted = await getDelivery({ userId: uncertain.body.user.id });
  await prisma.emailDelivery.update({ where: { id: exhausted.id }, data: { status: "SENDING", attempts: 5, leaseToken: randomUUID(), lockedAt: new Date(0) } });
  await dispatch(); assert.equal(messages.length, 2);
  const failed = await getDelivery({ id: exhausted.id }); assert.equal(failed.status, "FAILED"); assert.equal(failed.lastError, "DELIVERY_UNCERTAIN");
});

test("account and email enqueue roll back together if outbox persistence fails", async () => {
  const recipient = "rollback@mailautomation.test";
  await prisma.user.deleteMany({ where: { email: recipient } });
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION email_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.recipient = 'rollback@mailautomation.test' THEN RAISE EXCEPTION 'isolated outbox failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER email_test_reject_trigger BEFORE INSERT ON email_deliveries FOR EACH ROW EXECUTE FUNCTION email_test_reject()');
  try {
    assert.equal((await register(recipient)).status, 500);
    assert.equal(await prisma.user.count({ where: { email: recipient } }), 0); assert.equal(await prisma.emailDelivery.count(), 0);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER email_test_reject_trigger ON email_deliveries");
    await prisma.$executeRawUnsafe("DROP FUNCTION email_test_reject()");
  }
});

test("verified IPN creates exactly one receipt; browser return and duplicate callbacks never enqueue another", async () => {
  const { payment, booking } = await paymentFixture(); const query = callback(payment);
  const returned = await request(app).get("/api/payments/vnpay/return").query(query);
  assert.equal(returned.status, 303);
  const destination = new URL(returned.headers.location);
  assert.equal(destination.pathname, "/workspace/payments");
  assert.equal(destination.searchParams.get("booking"), booking.id);
  assert.equal(destination.searchParams.get("returned"), "1");
  assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } })).status, "pending");
  assert.equal(await prisma.emailDelivery.count(), 0);
  const [one, two] = await Promise.all([request(app).get("/api/payments/vnpay/ipn").query(query), request(app).get("/api/payments/vnpay/ipn").query(query)]);
  assert.deepEqual([one.body.RspCode, two.body.RspCode].sort(), ["00", "02"]);
  const row = await getDelivery({ kind: "PAYMENT_RECEIPT" });
  assert.equal(row.payload.booking.code, booking.bookingCode); assert.equal(row.payload.booking.resourceCode, "EMAIL-EQUIPMENT");
  assert.equal(row.payload.amount, 50000); assert.equal(row.payload.transactionNo, query.vnp_TransactionNo);
  const rendered = automation.renderAutomatedEmail(row);
  assert.match(rendered.text, /UTC\+7/); assert.match(rendered.text, /15:35/); assert.match(rendered.text, /50\.000/);
  assert.equal((await dispatch()).sent, 1); assert.equal(messages[0].recipient, "owner@mailautomation.test");
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(query)).body.RspCode, "02");
  await dispatch(); assert.equal(messages.length, 1);
});

test("invalid signatures, wrong amounts and unsuccessful provider outcomes produce no receipt", async () => {
  const { payment } = await paymentFixture();
  const bad = callback(payment); bad.vnp_SecureHash = "0".repeat(128);
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(bad)).body.RspCode, "97");
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(callback(payment, { vnp_Amount: "100" }))).body.RspCode, "04");
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(callback(payment, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }))).body.RspCode, "00");
  assert.equal(await prisma.emailDelivery.count(), 0); assert.equal((await dispatch()).sent, 0);
});

test("settlement and receipt enqueue commit atomically; persistence failure leaves payment pending for provider retry", async () => {
  const { payment } = await paymentFixture(), query = callback(payment);
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION email_test_reject_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind = 'PAYMENT_RECEIPT' THEN RAISE EXCEPTION 'isolated receipt failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER email_test_reject_payment_trigger BEFORE INSERT ON email_deliveries FOR EACH ROW EXECUTE FUNCTION email_test_reject_payment()');
  try {
    assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(query)).body.RspCode, "99");
    const stored = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(stored.status, "pending"); assert.equal(stored.paidAt, null); assert.equal(await prisma.emailDelivery.count(), 0);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER email_test_reject_payment_trigger ON email_deliveries");
    await prisma.$executeRawUnsafe("DROP FUNCTION email_test_reject_payment()");
  }
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(query)).body.RspCode, "00");
  assert.equal(await prisma.emailDelivery.count(), 1);
});

test("late success preserves cancelled booking and explains manual reconciliation in the receipt", async () => {
  const { payment, booking } = await paymentFixture("CANCELLED");
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(callback(payment))).body.RspCode, "00");
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status, "CANCELLED");
  const row = await getDelivery({ kind: "PAYMENT_RECEIPT" }); assert.equal(row.payload.reconciliationRequired, true);
  const rendered = automation.renderAutomatedEmail(row); assert.match(rendered.text, /Đã hủy/); assert.match(rendered.text, /đối soát/);
  assert.equal((await dispatch()).sent, 1);
});

test("guest account created after real OTP email queues setup guidance; reusing an account sends no new welcome", async () => {
  const recipient = email("guest");
  const otp = await request(app).post("/api/guest-booking/otp").send({ email: recipient, fullName: "Guest test" });
  assert.equal(otp.status, 202, JSON.stringify(otp.body)); assert.equal(messages.length, 1);
  const code = messages[0].raw.match(/\b\d{6}\b/)[0];
  const startAt = new Date(Date.now() + 300 * 3600000); startAt.setUTCMinutes(0, 0, 0);
  const body = { email: recipient, otpCode: code, fullName: "Email guest", phone: "0901234567", address: { addressLine: "123 Nguyen Trai", provinceCode: "79", wardCode: "26734" },
    booking: { resourceId: "email-resource", title: "Guest free appointment", purpose: "Email test", startAt: startAt.toISOString(), endAt: new Date(startAt.getTime() + 3600000).toISOString() } };
  const completed = await request(app).post("/api/guest-booking/book").send(body);
  assert.equal(completed.status, 201, JSON.stringify(completed.body));
  const row = await getDelivery({ userId: completed.body.user.id }); assert.equal(row.payload.requiresPasswordSetup, true);
  assert.doesNotMatch(automation.renderAutomatedEmail(row).text, /0901234567/);
  assert.equal((await dispatch()).sent, 1); assert.equal(messages.length, 2);
  await prisma.emailOtp.updateMany({ where: { email: recipient }, data: { createdAt: new Date(0) } });
  const next = await request(app).post("/api/guest-booking/otp").send({ email: recipient }); assert.equal(next.status, 202);
  const nextCode = messages.at(-1).raw.match(/\b\d{6}\b/)[0];
  body.otpCode = nextCode; body.booking.startAt = new Date(startAt.getTime() + 7200000).toISOString(); body.booking.endAt = new Date(startAt.getTime() + 10800000).toISOString();
  const reused = await request(app).post("/api/guest-booking/book").send(body); assert.equal(reused.status, 201, JSON.stringify(reused.body));
  assert.equal(reused.body.requiresLogin, true); assert.equal(await prisma.emailDelivery.count(), 1);
});
