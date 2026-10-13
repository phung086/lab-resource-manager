import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";

const url = new URL(process.env.LOYALTY_TEST_DATABASE_URL || "");
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.port, "25439");
assert.equal(url.pathname, "/lab_resources_loyalty_test");
Object.assign(process.env, {
  DATABASE_URL: url.href, NODE_ENV: "test", LOG_FORMAT: "dev", RATE_LIMIT_MAX: "10000",
  JWT_SECRET: "loyalty-isolated-contract-test-secret-32-characters", PAYMENTS_ENABLED: "true",
  VNPAY_ENABLED: "true", VNPAY_TMN_CODE: "TESTONLY", VNPAY_HASH_SECRET: "loyalty-signed-test-fixture-secret",
  VNPAY_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  VNPAY_RETURN_URL: "http://127.0.0.1:18000/api/payments/vnpay/return",
  VNPAY_IPN_URL: "http://127.0.0.1:18000/api/payments/vnpay/ipn", PAYMENT_APP_URL: "http://127.0.0.1:5173"
});
const [{ createApp }, { prisma }, guestService, { config }] = await Promise.all([
  import("../src/app.js"), import("../src/db.js"), import("../src/services/guestBookingService.js"), import("../src/config.js")
]);
const app = createApp(), marker = crypto.randomUUID(), password = "Loyalty!2026";
const users = {}, tokens = {}, deliveredCodes = new Map();
let resource, fixtureResource, freeResource, sequence = 0, ownerBooking;
const http = (method, path, actor, body) => {
  const call = request(app)[method]("/api" + path);
  if (actor) call.set("Authorization", "Bearer " + tokens[actor]);
  return body ? call.send(body) : call;
};
const interval = offset => {
  const start = Math.ceil(Date.now() / 60000) * 60000 + 86400000 + offset * 3600000;
  return { startAt: new Date(start).toISOString(), endAt: new Date(start + 3600000).toISOString() };
};
const policyInput = policy => ({ enabled: true, plusThreshold: 1500000, priorityThreshold: 5000000, plusDiscountBps: 300, priorityDiscountBps: 500, expectedVersion: policy.version });
const currentPolicy = async () => (await http("get", "/loyalty/policy", "admin")).body;
async function fixturePayment(changes = {}, bookingChanges = {}) {
  const timing = interval(++sequence * 2 + 100);
  const booking = await prisma.booking.create({ data: {
    id: crypto.randomUUID(), resourceId: fixtureResource.id, requestedById: users.owner.id,
    title: "Explicit isolated payment fixture", purpose: "Contract test", ...timing,
    status: "COMPLETED", feeAmountVnd: 200000, ...bookingChanges
  } });
  return prisma.paymentTransaction.create({ data: {
    id: crypto.randomUUID(), bookingId: booking.id, userId: users.owner.id, txnRef: crypto.randomBytes(10).toString("hex").toUpperCase(),
    amount: booking.feeAmountVnd, currency: "VND", provider: "vnpay", status: "success", paidAt: new Date(),
    ...changes
  } });
}
function signedCallback(row) {
  const params = {
    vnp_TmnCode: "TESTONLY", vnp_Amount: String(row.amount * 100), vnp_TxnRef: row.txnRef,
    vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: BigInt("0x" + crypto.randomBytes(6).toString("hex")).toString(), vnp_PayDate: "20261013120000"
  };
  const query = Object.keys(params).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  return { ...params, vnp_SecureHash: crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET).update(query).digest("hex") };
}
test.before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS name, current_setting('server_version') AS version`;
  assert.equal(identity.name, "lab_resources_loyalty_test"); assert.match(identity.version, /^16\./);
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(user => user.email.endsWith("@loyalty.test")), "Unrelated data prohibits fixture creation");
  const hash = await bcrypt.hash(password, 4);
  for (const [actor, role] of Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", owner: "CUSTOMER", other: "CUSTOMER" })) {
    users[actor] = await prisma.user.create({ data: {
      id: crypto.randomUUID(), email: `${actor}-${marker}@loyalty.test`, fullName: "Contract " + actor,
      phone: "0901234567", role, passwordHash: hash,
      ...(actor === "other" ? { loyaltyTier: "LAB_PRIORITY", loyaltyPoints: 999999, loyaltyDiscountBps: 5000 } : {})
    } });
    const login = await http("post", "/auth/login", null, { email: users[actor].email, password });
    assert.equal(login.status, 200, JSON.stringify(login.body)); tokens[actor] = login.body.accessToken;
  }
  for (const [name, category] of [["resource", "ROOM"], ["fixture", "ROOM"], ["free", "ROOM"]]) {
    const row = await prisma.resource.create({ data: { id: crypto.randomUUID(), code: `${name}-${marker}`, name: "Loyalty " + name, subtype: "ROOM", category, location: "Isolated test" } });
    if (name === "resource") resource = row;
    else if (name === "fixture") fixtureResource = row;
    else freeResource = row;
  }
  await prisma.resourcePricingRule.create({ data: { id: crypto.randomUUID(), resourceId: resource.id, purposeCode: "SERVICE", label: "Rental", hourlyRateVnd: 100001 } });
  const policy = await currentPolicy();
  const saved = await http("put", "/loyalty/policy", "admin", policyInput(policy)); assert.equal(saved.status, 200, JSON.stringify(saved.body));
  guestService.configureGuestOtpTestDelivery(async ({ to, code }) => { deliveredCodes.set(to, code); return { success: true }; });
  guestService.configureGuestAddressTestValidation(async () => ({ addressLine: "123 Contract street", provinceCode: "79", provinceName: "Test province", wardCode: "test", wardName: "Test ward", source: "test-fixture", version: "test" }));
});
test.after(() => prisma.$disconnect());

test("loyalty is authenticated and owner scoped; only ADMIN can configure strict policy", async () => {
  assert.equal((await http("get", "/loyalty/me")).status, 401);
  const policy = await currentPolicy();
  for (const actor of ["owner", "staff"]) assert.equal((await http("put", "/loyalty/policy", actor, policyInput(policy))).status, 403);
  for (const changes of [{ priorityThreshold: 1500000 }, { plusThreshold: 1.5 }, { plusDiscountBps: 5001 }, { userId: users.other.id }]) {
    assert.equal((await http("put", "/loyalty/policy", "admin", { ...policyInput(policy), ...changes })).status, 400);
  }
  const me = await http("get", "/loyalty/me?userId=" + users.owner.id, "other");
  assert.equal(me.status, 200); assert.equal(me.body.totalSpendVnd, 0); assert.equal(me.body.tier, "LAB_STANDARD"); assert.equal(me.body.discountBps, 0);
});
test("verified spending excludes unpaid, non-VND, orphan, wrong owner, refunds and reconciliation/terminal exceptions", async () => {
  await fixturePayment({}, { feeAmountVnd: 1499999 });
  const changes = [
    { status: "pending", paidAt: null }, { status: "failed", paidAt: null }, { status: "refunded" }, { paidAt: null },
    { currency: "USD" }, { provider: "unselected" }, { reconciliationStatus: "manual_review" }, { reconciliationStatus: "resolved" },
    { amount: 199999 }, { bookingId: null }, { userId: users.other.id }
  ];
  for (const change of changes) await fixturePayment(change);
  for (const status of ["CANCELLED", "REJECTED"]) await fixturePayment({}, { status });
  await fixturePayment({}, { requestedById: users.other.id });
  const result = await http("get", "/loyalty/me", "owner");
  assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.totalSpendVnd, 1499999);
  assert.equal(result.body.tier, "LAB_STANDARD"); assert.equal(result.body.discountBps, 0);
  const profile = await http("get", "/users/me", "owner");
  assert.equal(profile.body.spending.totalSpendVnd, 1499999); assert.equal(profile.body.spending.successfulPayments, 1);
  assert.deepEqual(profile.body.loyalty, result.body);
});
test("signed settlement promotes by spend exactly once; browser Return and invalid signatures do not earn", async () => {
  const row = await fixturePayment({ status: "pending", paidAt: null, provider: "vnpay", paymentUrl: "https://sandbox.vnpayment.vn/fixture" }, { status: "CONFIRMED", feeAmountVnd: 1 });
  const callback = signedCallback(row);
  await request(app).get("/api/payments/vnpay/return").query(callback);
  assert.equal((await http("get", "/loyalty/me", "owner")).body.totalSpendVnd, 1499999);
  const invalid = await request(app).get("/api/payments/vnpay/ipn").query({ ...callback, vnp_SecureHash: "0".repeat(128) });
  assert.equal(invalid.body.RspCode, "97"); assert.equal((await http("get", "/loyalty/me", "owner")).body.totalSpendVnd, 1499999);
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(callback)).body.RspCode, "00");
  assert.equal((await request(app).get("/api/payments/vnpay/ipn").query(callback)).body.RspCode, "02");
  const me = await http("get", "/loyalty/me", "owner");
  assert.equal(me.body.totalSpendVnd, 1500000); assert.equal(me.body.tier, "LAB_PLUS"); assert.equal(me.body.discountBps, 300);
});
test("public pricing ignores client identity and invalid bearer headers fail closed; private quotes use current CUSTOMER", async () => {
  const body = { resourceId: resource.id, purposeCode: "SERVICE", ...interval(0) };
  assert.equal((await http("post", "/booking-pricing/quote", null, { ...body, userId: users.owner.id })).status, 400);
  assert.equal((await request(app).post("/api/booking-pricing/quote").set("Authorization", "Bearer invalid").send(body)).status, 401);
  const publicQuote = await http("post", "/booking-pricing/quote", null, body);
  assert.equal(publicQuote.status, 200, JSON.stringify(publicQuote.body)); assert.equal(publicQuote.body.amountVnd, 100001);
  const privateQuote = await http("post", "/booking-pricing/quote", "owner", body);
  assert.equal(privateQuote.body.amountVnd, 97001); assert.equal(privateQuote.body.discountAmountVnd, 3000);
  for (const actor of ["staff", "admin", "other"]) assert.equal((await http("post", "/booking-pricing/quote", actor, body)).body.amountVnd, 100001);
});
test("discounted booking requires current accepted policy, saves immutable net fee and creates exact charge", async () => {
  const body = { resourceId: resource.id, title: "Discounted rental", purposeCode: "SERVICE", ...interval(1) };
  const quote = (await http("post", "/booking-pricing/quote", "owner", body)).body;
  // The quote route deliberately rejects booking-only fields.
  const freshQuote = (await http("post", "/booking-pricing/quote", "owner", { resourceId: body.resourceId, purposeCode: body.purposeCode, startAt: body.startAt, endAt: body.endAt })).body;
  assert.ok(quote.error);
  const acceptedQuote = { amountVnd: freshQuote.amountVnd, version: freshQuote.version, loyaltyPolicyVersion: freshQuote.loyaltyPolicyVersion };
  assert.equal((await http("post", "/bookings", "owner", { ...body, acceptedQuote: { amountVnd: freshQuote.amountVnd, version: freshQuote.version } })).status, 409);
  const response = await http("post", "/bookings", "owner", { ...body, acceptedQuote });
  assert.equal(response.status, 201, JSON.stringify(response.body)); ownerBooking = response.body;
  assert.equal(ownerBooking.feeAmountVnd, 97001); assert.deepEqual(ownerBooking.feeSnapshot, freshQuote);
  const charge = await prisma.paymentTransaction.findFirstOrThrow({ where: { bookingId: ownerBooking.id } }); assert.equal(charge.amount, 97001); assert.equal(charge.status, "pending");
  const before = await prisma.booking.findUniqueOrThrow({ where: { id: ownerBooking.id } });
  const policy = await currentPolicy();
  assert.equal((await http("put", "/loyalty/policy", "admin", { ...policyInput(policy), plusDiscountBps: 400 })).status, 200);
  const stale = await http("post", "/bookings", "owner", { ...body, ...interval(3), acceptedQuote });
  assert.equal(stale.status, 409); assert.equal(stale.body.error.code, "PRICING_CHANGED");
  const after = await prisma.booking.findUniqueOrThrow({ where: { id: ownerBooking.id } }); assert.equal(after.feeAmountVnd, before.feeAmountVnd); assert.deepEqual(after.feeSnapshot, before.feeSnapshot);
});
test("concurrent policy writers serialize version checks and append exactly one audit", async () => {
  const policy = await currentPolicy(), input = policyInput(policy);
  const before = await prisma.systemAuditEvent.count({ where: { action: "LOYALTY_POLICY_CHANGED" } });
  const results = await Promise.all([http("put", "/loyalty/policy", "admin", input), http("put", "/loyalty/policy", "admin", input)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const after = await currentPolicy(); assert.equal(after.version, policy.version + 1);
  assert.equal(await prisma.systemAuditEvent.count({ where: { action: "LOYALTY_POLICY_CHANGED" } }), before + 1);
  const audit = await prisma.systemAuditEvent.findFirstOrThrow({ where: { action: "LOYALTY_POLICY_CHANGED" }, orderBy: { createdAt: "desc" } });
  assert.equal(audit.actorId, users.admin.id); assert.equal(audit.beforeState.version, policy.version); assert.equal(audit.afterState.version, after.version);
});
test("audit insertion failure rolls back the policy mutation", async () => {
  const policy = await currentPolicy(), { updateLoyaltyPolicy } = await import("../src/services/loyaltyService.js");
  const client = { $transaction: callback => prisma.$transaction(tx => callback(new Proxy(tx, { get(target, property) {
    if (property === "systemAuditEvent") return { create: async () => { throw new Error("Controlled audit failure"); } };
    const value = target[property]; return typeof value === "function" ? value.bind(target) : value;
  } }))) };
  await assert.rejects(updateLoyaltyPolicy(client, users.admin, { ...policyInput(policy), plusDiscountBps: 100 }), /Controlled audit failure/);
  const after = await currentPolicy(); assert.equal(after.version, policy.version); assert.equal(after.plusDiscountBps, policy.plusDiscountBps);
});
test("policy mutation rechecks the administrator and session under the account-change lock", async () => {
  const { updateLoyaltyPolicy } = await import("../src/services/loyaltyService.js");
  const policy = await currentPolicy();
  const staleAdmin = { ...users.admin, authVersion: users.admin.authVersion - 1 };
  await assert.rejects(updateLoyaltyPolicy(prisma, staleAdmin, policyInput(policy)), error => error.code === "AUTH_INVALID");
  const forgedAdmin = { ...users.staff, role: "ADMIN" };
  await assert.rejects(updateLoyaltyPolicy(prisma, forgedAdmin, policyInput(policy)), error => error.code === "FORBIDDEN");
  const after = await currentPolicy(); assert.equal(after.version, policy.version);
});
test("free booking remains free with payments disabled and creates no payment record", async () => {
  const prior = config.paymentsEnabled; config.paymentsEnabled = false;
  try {
    const response = await http("post", "/bookings", "owner", { resourceId: freeResource.id, title: "Free rental", ...interval(0) });
    assert.equal(response.status, 201, JSON.stringify(response.body)); assert.equal(response.body.feeAmountVnd, 0);
    assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: response.body.id } }), 0);
  } finally { config.paymentsEnabled = prior; }
});
test("OTP-verified guest reuse preserves the accepted public quote despite an earned loyalty tier", async () => {
  const period = interval(6), quote = (await http("post", "/booking-pricing/quote", null, { resourceId: resource.id, purposeCode: "SERVICE", ...period })).body;
  assert.equal((await http("post", "/guest-booking/otp", null, { email: users.owner.email })).status, 202);
  const response = await http("post", "/guest-booking/book", null, {
    email: users.owner.email, otpCode: deliveredCodes.get(users.owner.email), fullName: "Guest Contract", phone: "0901234567",
    address: { addressLine: "123 Contract street", provinceCode: "79", wardCode: "test" },
    booking: { resourceId: resource.id, purposeCode: "SERVICE", title: "Guest quote compatibility", ...period,
      acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version, loyaltyPolicyVersion: quote.loyaltyPolicyVersion } }
  });
  assert.equal(response.status, 201, JSON.stringify(response.body)); assert.equal(response.body.booking.feeAmountVnd, 100001);
  assert.equal(response.body.booking.feeSnapshot.discountBps, 0); assert.equal(response.body.accessToken, null);
});
test("spend changes between quote and booking require reconfirmation; disabling policy preserves historic fees", async () => {
  const period = interval(8), quoteInput = { resourceId: resource.id, purposeCode: "SERVICE", ...period };
  const quote = (await http("post", "/booking-pricing/quote", "owner", quoteInput)).body;
  assert.equal(quote.discountBps, 300);
  const earned = await prisma.paymentTransaction.findFirstOrThrow({ where: { userId: users.owner.id, amount: 1499999, status: "success" } });
  // This isolated fixture exercises the authoritative refunded status; it is not
  // a claim that the application has performed an external provider refund.
  await prisma.paymentTransaction.update({ where: { id: earned.id }, data: { status: "refunded" } });
  const stale = await http("post", "/bookings", "owner", { ...quoteInput, title: "Reconfirm changed spend", acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version, loyaltyPolicyVersion: quote.loyaltyPolicyVersion } });
  assert.equal(stale.status, 409); assert.equal(stale.body.error.code, "PRICING_CHANGED"); assert.equal(stale.body.error.details.quote.amountVnd, 100001);
  await prisma.paymentTransaction.update({ where: { id: earned.id }, data: { status: "success" } });
  const before = await currentPolicy();
  const response = await http("put", "/loyalty/policy", "admin", { ...policyInput(before), enabled: false });
  assert.equal(response.status, 200);
  const disabled = (await http("post", "/booking-pricing/quote", "owner", quoteInput)).body;
  assert.equal(disabled.amountVnd, 100001); assert.equal(disabled.discountBps, 0);
  const loyalty = (await http("get", "/loyalty/me", "owner")).body; assert.equal(loyalty.tier, "LAB_PLUS"); assert.equal(loyalty.enabled, false); assert.equal(loyalty.discountBps, 0);
  const saved = await prisma.booking.findUniqueOrThrow({ where: { id: ownerBooking.id } });
  assert.equal(saved.feeAmountVnd, 97001); assert.deepEqual(saved.feeSnapshot, ownerBooking.feeSnapshot);
});
