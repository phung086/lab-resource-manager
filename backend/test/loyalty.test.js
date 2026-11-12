import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.PAYMENTS_ENABLED = "true";
process.env.LOG_FORMAT = "dev";
const [{ deriveLoyalty, DEFAULT_LOYALTY_POLICY, loyaltyPolicySchema, getUserLoyalty }, { quoteBooking, verifyAcceptedQuote, ensureBookingCharge }, { config }] = await Promise.all([
  import("../src/services/loyaltyService.js"), import("../src/services/bookingPricingService.js"), import("../src/config.js")
]);
const enabledPolicy = { ...DEFAULT_LOYALTY_POLICY, enabled: true, version: 4 };

test("spend alone determines tier; completed bookings and legacy fields do not promote it", () => {
  const standard = deriveLoyalty({ totalSpendVnd: 1499999, completedBookings: 100, loyaltyTier: "LAB_PRIORITY", loyaltyDiscountBps: 9000 }, enabledPolicy);
  assert.equal(standard.tier, "LAB_STANDARD"); assert.equal(standard.discountBps, 0); assert.equal(standard.basis, "SPEND");
  assert.equal(standard.remainingToNext, 1); assert.equal(standard.points, 149);
  const plus = deriveLoyalty({ totalSpendVnd: 1500000 }, enabledPolicy);
  assert.equal(plus.tier, "LAB_PLUS"); assert.equal(plus.discountBps, 300); assert.equal(plus.progress, 0);
  assert.equal(plus.nextThreshold, 5000000);
  const priority = deriveLoyalty({ totalSpendVnd: 5000000 }, enabledPolicy);
  assert.equal(priority.tier, "LAB_PRIORITY"); assert.equal(priority.discountBps, 500);
  assert.equal(priority.progress, 100); assert.equal(priority.nextTier, null); assert.equal(priority.remainingToNext, 0);
});
test("disabled policy and operator roles never grant pricing discounts", () => {
  for (const role of ["ADMIN", "LAB_STAFF"]) assert.equal(deriveLoyalty({ role, totalSpendVnd: 9000000 }, enabledPolicy).discountBps, 0);
  assert.equal(deriveLoyalty({ totalSpendVnd: 9000000 }, DEFAULT_LOYALTY_POLICY).discountBps, 0);
});
test("policy strictly validates bounded integer money, ordered thresholds and discount caps", () => {
  const valid = { enabled: true, plusThreshold: 1500000, priorityThreshold: 5000000, plusDiscountBps: 300, priorityDiscountBps: 500, expectedVersion: 0 };
  assert.ok(loyaltyPolicySchema.safeParse(valid).success);
  for (const invalid of [{ plusThreshold: 0 }, { priorityThreshold: 1500000 }, { plusThreshold: 1.5 }, { priorityThreshold: 2000000001 }, { plusDiscountBps: 5001 }, { priorityDiscountBps: -1 }, { expectedVersion: -1 }, { userId: "injected" }]) {
    assert.equal(loyaltyPolicySchema.safeParse({ ...valid, ...invalid }).success, false, JSON.stringify(invalid));
  }
});
function pricingClient({ rate = 100001, spend = 1500000, role = "CUSTOMER", rules = true, active = true } = {}) {
  return {
    resource: { findUnique: async () => ({ id: "resource", maxBookingMinutes: 120, laboratory: null }) },
    resourcePricingRule: { findMany: async () => rules ? [{ purposeCode: "SERVICE", hourlyRateVnd: rate, version: 2, label: "Rental" }] : [] },
    user: { findUnique: async () => ({ role, isActive: active, deletedAt: null }) },
    loyaltyPolicy: { findUnique: async () => enabledPolicy },
    booking: { count: async () => 4 },
    $queryRaw: async () => [{ totalSpendVnd: spend, successfulPayments: 1, lastPaidAt: new Date() }]
  };
}
const quoteStart = Math.ceil((Date.now() + 48 * 3600000) / 60000) * 60000;
const period = { resourceId: "resource", purposeCode: "SERVICE", startAt: new Date(quoteStart).toISOString(), endAt: new Date(quoteStart + 3600000).toISOString() };
test("public quotes preserve list price; only server-selected customers receive integer discounted quotes", async () => {
  const publicQuote = await quoteBooking(pricingClient(), period);
  assert.equal(publicQuote.amountVnd, 100001); assert.equal(publicQuote.discountBps, 0); assert.equal(publicQuote.loyaltyPolicyVersion, null);
  const privateQuote = await quoteBooking(pricingClient(), period, { userId: "owner" });
  assert.equal(privateQuote.amountVnd, 97001); assert.equal(privateQuote.baseAmountVnd, 100001);
  assert.equal(privateQuote.discountAmountVnd, 3000); assert.equal(privateQuote.loyaltyPolicyVersion, 4);
  const staffQuote = await quoteBooking(pricingClient({ role: "LAB_STAFF", spend: 5000000 }), period, { userId: "staff" });
  assert.equal(staffQuote.amountVnd, 100001); assert.equal(staffQuote.discountBps, 0);
});
test("accepted discounted quotes require policy version even when the rounded net amount is unchanged", () => {
  const quote = { version: 2, amountVnd: 97000, discountBps: 300, loyaltyPolicyVersion: 4 };
  for (const accepted of [{ amountVnd: 97000, version: 2 }, { amountVnd: 97000, version: 2, loyaltyPolicyVersion: 3 }, { amountVnd: 100000, version: 2, loyaltyPolicyVersion: 4 }]) {
    assert.throws(() => verifyAcceptedQuote(quote, accepted), error => error.code === "PRICING_CHANGED");
  }
  assert.doesNotThrow(() => verifyAcceptedQuote(quote, { amountVnd: 97000, version: 2, loyaltyPolicyVersion: 4 }));
  assert.doesNotThrow(() => verifyAcceptedQuote({ version: 2, amountVnd: 100000, discountBps: 0, loyaltyPolicyVersion: 0 }, { amountVnd: 100000, version: 2 }));
  assert.doesNotThrow(() => verifyAcceptedQuote({ version: 0, amountVnd: 0 }, undefined));
});
test("free bookings need no payment configuration or synthetic charge", async () => {
  const prior = config.paymentsEnabled;
  config.paymentsEnabled = false;
  try {
    const free = await quoteBooking(pricingClient({ rate: 0 }), period, { userId: "owner" });
    assert.equal(free.amountVnd, 0); assert.equal(free.baseAmountVnd, 0);
    const unpriced = await quoteBooking(pricingClient({ rules: false }), period);
    assert.equal(unpriced.amountVnd, 0);
    await ensureBookingCharge({}, { feeAmountVnd: 0, status: "CONFIRMED" });
    await assert.rejects(quoteBooking(pricingClient(), period), error => error.code === "PAYMENT_NOT_CONFIGURED");
  } finally { config.paymentsEnabled = prior; }
});
test("private pricing rejects inactive or deleted identities", async () => {
  await assert.rejects(getUserLoyalty(pricingClient({ active: false }), "owner"), error => error.code === "ACCOUNT_INACTIVE");
  const deleted = pricingClient(); deleted.user.findUnique = async () => ({ role: "CUSTOMER", isActive: true, deletedAt: new Date() });
  await assert.rejects(getUserLoyalty(deleted, "owner"), error => error.code === "ACCOUNT_INACTIVE");
});
