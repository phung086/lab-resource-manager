import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import {
  configureGuestPhaseDTestEnvironment,
  guestPhaseDClient
} from "./helpers/guestPhaseDDatabase.js";

const environment = configureGuestPhaseDTestEnvironment();
const [{ createApp }, { prisma }, guestService, { HttpError }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js"),
  import("../src/services/guestBookingService.js"),
  import("../src/middleware/errors.js")
]);

const app = createApp();
const isolated = guestPhaseDClient(environment.url);
const id = () => crypto.randomUUID();
const marker = crypto.randomUUID();
const deliveredCodes = new Map();
const password = "GuestPhaseD!123";
const phone = "0901234567";
const purpose = "GUEST_QUICK_BOOKING";
const resources = {
  free: id(), conflict: id(), training: id(), unavailable: id(), priced: id(), concurrency: id()
};

const verifiedAddress = {
  addressLine: "123 Nguyen Trai",
  provinceCode: "79",
  provinceName: "Thành phố Hồ Chí Minh",
  wardCode: "26734",
  wardName: "Phường Bến Thành",
  source: "provinces.open-api.vn",
  version: "v2-post-2025-07"
};

guestService.configureGuestOtpTestDelivery(async ({ to, code }) => {
  deliveredCodes.set(to, code);
  return { success: true, messageId: `test-${crypto.randomUUID()}` };
});
guestService.configureGuestAddressTestValidation(async () => verifiedAddress);

function email(label) {
  return `${label}-${marker}@example.test`;
}

function windowFor(offset) {
  const start = new Date(Date.now() + (offset + 48) * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);
  return { startAt: start.toISOString(), endAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString() };
}

function completionPayload(targetEmail, resourceId, offset, overrides = {}) {
  const { booking: bookingOverrides = {}, ...payloadOverrides } = overrides;
  return {
    email: targetEmail,
    otpCode: deliveredCodes.get(targetEmail),
    fullName: "Guest Submitted Name",
    phone,
    organization: "Guest Submitted Organization",
    address: { addressLine: "123 Nguyen Trai", provinceCode: "79", wardCode: "26734" },
    booking: {
      resourceId,
      title: `Guest booking ${offset}`,
      purpose: "Phase D verification",
      ...windowFor(offset),
      ...bookingOverrides
    },
    ...payloadOverrides
  };
}

async function issueOtp(targetEmail) {
  const response = await request(app).post("/api/guest-booking/otp").send({ email: targetEmail, fullName: "Phase D Guest" });
  assert.equal(response.status, 202, JSON.stringify(response.body));
  assert.match(deliveredCodes.get(targetEmail), /^\d{6}$/);
  return deliveredCodes.get(targetEmail);
}

async function seed() {
  const [identity] = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity.database, environment.database);
  assert.match(identity.version, /^16\./);

  await isolated.resource.createMany({
    data: Object.entries(resources).map(([name, resourceId]) => ({
      id: resourceId,
      code: `GUEST-${name.toUpperCase()}-${marker}`,
      name: `Guest Phase D ${name}`,
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: "Phase D isolated test",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    }))
  });
  await isolated.resourcePricingRule.create({
    data: { id: id(), resourceId: resources.priced, purposeCode: "SERVICE", label: "Phase D fee", hourlyRateVnd: 1000, version: 2 }
  });
  const courseId = id();
  await isolated.trainingCourse.create({ data: { id: courseId, code: `GUEST-TRAIN-${marker}`, name: "Guest required training", isRequired: true } });
  await isolated.trainingRequirement.create({ data: { id: id(), resourceId: resources.training, courseId, isMandatory: true } });

  const conflictOwner = id();
  await isolated.user.create({
    data: { id: conflictOwner, email: email("conflict-owner"), fullName: "Conflict Owner", role: "STUDENT", passwordHash: await bcrypt.hash(password, 4) }
  });
  await isolated.booking.create({
    data: {
      id: id(), resourceId: resources.conflict, requestedById: conflictOwner,
      title: "Existing conflict", purpose: "Phase D", status: "CONFIRMED", ...windowFor(20)
    }
  });
}

test("Guest booking OTP, identity, and transaction integrity on PostgreSQL 16", { timeout: 240000 }, async (t) => {
  await seed();

  await t.test("OTP is hashed, attempts persist, fifth failure locks, and sixth attempt cannot validate", async () => {
    const target = email("attempts");
    const validCode = await issueOtp(target);
    const stored = await isolated.emailOtp.findFirst({ where: { email: target }, orderBy: { createdAt: "desc" } });
    assert.notEqual(stored.codeHash, validCode);
    assert.equal(stored.codeHash.includes(validCode), false);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app).post("/api/guest-booking/book")
        .send(completionPayload(target, resources.free, 100 + attempt, { otpCode: "000000" }));
      assert.equal(response.status, attempt === 5 ? 429 : 400, JSON.stringify(response.body));
      assert.equal(response.body.error.code, attempt === 5 ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_INVALID");
      assert.equal((await isolated.emailOtp.findUnique({ where: { id: stored.id } })).attempts, attempt);
    }
    const sixth = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 106, { otpCode: validCode }));
    assert.equal(sixth.status, 429);
    assert.equal(sixth.body.error.code, "OTP_ATTEMPTS_EXCEEDED");
    assert.equal((await isolated.emailOtp.findUnique({ where: { id: stored.id } })).attempts, 5);
  });

  await t.test("a valid OTP remains usable while attempts remain", async () => {
    const target = email("remaining-attempts");
    const validCode = await issueOtp(target);
    await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 120, { otpCode: "000000" }));
    const success = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 120, { otpCode: validCode }));
    assert.equal(success.status, 201, JSON.stringify(success.body));
  });

  await t.test("resend cooldown is per email; resend retains history, invalidates old code, and resets attempts", async () => {
    const target = email("resend");
    const firstCode = await issueOtp(target);
    const tooSoon = await request(app).post("/api/guest-booking/otp").send({ email: target });
    assert.equal(tooSoon.status, 429);
    assert.equal(tooSoon.body.error.code, "OTP_RESEND_TOO_SOON");

    const first = await isolated.emailOtp.findFirst({ where: { email: target }, orderBy: { createdAt: "desc" } });
    await isolated.emailOtp.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 61_000) } });
    const secondCode = await issueOtp(target);
    assert.notEqual(secondCode, firstCode);
    const rows = await isolated.emailOtp.findMany({ where: { email: target }, orderBy: { createdAt: "asc" } });
    assert.equal(rows.length, 2);
    assert.ok(rows[0].consumedAt);
    assert.equal(rows[1].consumedAt, null);
    assert.equal(rows[1].attempts, 0);

    const oldCode = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 130, { otpCode: firstCode }));
    assert.equal(oldCode.status, 400);
    assert.equal(oldCode.body.error.code, "OTP_INVALID");
    const newCode = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 130, { otpCode: secondCode }));
    assert.equal(newCode.status, 201, JSON.stringify(newCode.body));
  });

  await t.test("expired and consumed challenges return stable errors", async () => {
    const expiredEmail = email("expired");
    await issueOtp(expiredEmail);
    const expired = await isolated.emailOtp.findFirst({ where: { email: expiredEmail } });
    await isolated.emailOtp.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expiredResult = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(expiredEmail, resources.free, 140));
    assert.equal(expiredResult.status, 400);
    assert.equal(expiredResult.body.error.code, "OTP_EXPIRED");

    const usedEmail = email("single-use");
    await issueOtp(usedEmail);
    const first = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(usedEmail, resources.free, 141));
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const second = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(usedEmail, resources.free, 142));
    assert.equal(second.status, 409);
    assert.equal(second.body.error.code, "OTP_ALREADY_USED");
  });

  await t.test("new external account and booking commit together, then backend restricts its temporary credential", async () => {
    const target = email("new-external");
    await issueOtp(target);
    const response = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 150));
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const user = await isolated.user.findUnique({ where: { email: target } });
    assert.equal(user.customerType, "EXTERNAL");
    assert.equal(user.passwordResetRequired, true);
    assert.equal(await bcrypt.compare(phone, user.passwordHash), true);
    assert.equal(await isolated.booking.count({ where: { requestedById: user.id } }), 1);
    const bearer = { Authorization: `Bearer ${response.body.accessToken}` };
    assert.equal((await request(app).get("/api/auth/me").set(bearer)).status, 200);
    const blocked = await request(app).get("/api/bookings/my-bookings").set(bearer);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, "PASSWORD_RESET_REQUIRED");
    assert.equal((await request(app).post("/api/auth/change-password").set(bearer)
      .send({ currentPassword: phone, newPassword: password })).status, 204);
    assert.equal((await request(app).get("/api/bookings/my-bookings").set(bearer)).status, 200);
  });

  await t.test("existing EXTERNAL is reused without profile or password overwrite", async () => {
    const target = email("existing-external");
    const userId = id();
    const originalHash = await bcrypt.hash(password, 4);
    await isolated.user.create({
      data: {
        id: userId, email: target, fullName: "Authoritative External", role: "STUDENT", passwordHash: originalHash,
        customerType: "EXTERNAL", phone: "0988888888", organization: "Trusted Organization", isActive: true
      }
    });
    await issueOtp(target);
    const response = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 160));
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.accessToken, null);
    assert.equal(response.body.requiresLogin, true);
    const after = await isolated.user.findUnique({ where: { id: userId } });
    assert.equal(after.fullName, "Authoritative External");
    assert.equal(after.phone, "0988888888");
    assert.equal(after.organization, "Trusted Organization");
    assert.equal(after.passwordHash, originalHash);
  });

  await t.test("existing INTERNAL classification is preserved", async () => {
    const target = email("existing-internal");
    const userId = id();
    await isolated.user.create({
      data: { id: userId, email: target, fullName: "Trusted Internal", role: "STUDENT", passwordHash: await bcrypt.hash(password, 4), customerType: "INTERNAL" }
    });
    await issueOtp(target);
    const response = await request(app).post("/api/guest-booking/book")
      .send(completionPayload(target, resources.free, 170));
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.accessToken, null);
    assert.equal(response.body.requiresLogin, true);
    assert.equal((await isolated.user.findUnique({ where: { id: userId } })).customerType, "INTERNAL");
  });

  await t.test("booking failures roll back OTP consumption and new account creation", async () => {
    const cases = [
      { label: "conflict", resourceId: resources.conflict, offset: 20, code: "BOOKING_CONFLICT" },
      { label: "training", resourceId: resources.training, offset: 180, code: "BOOKING_TRAINING_REQUIRED" },
      { label: "unavailable", resourceId: resources.unavailable, offset: 181, code: "RESOURCE_UNAVAILABLE" },
      {
        label: "stale-quote", resourceId: resources.priced, offset: 182, code: "PRICING_CHANGED",
        booking: { purposeCode: "SERVICE", acceptedQuote: { amountVnd: 1000, version: 1 } }
      }
    ];
    for (const failure of cases) {
      const target = email(failure.label);
      await issueOtp(target);
      if (failure.label === "unavailable") {
        await isolated.resource.update({ where: { id: resources.unavailable }, data: { operationalStatus: "BROKEN" } });
      }
      const response = await request(app).post("/api/guest-booking/book")
        .send(completionPayload(target, failure.resourceId, failure.offset, { booking: failure.booking }));
      assert.ok([400, 403, 409].includes(response.status), JSON.stringify(response.body));
      assert.equal(response.body.error.code, failure.code);
      assert.equal(await isolated.user.count({ where: { email: target } }), 0);
      assert.equal(await isolated.booking.count({ where: { requestedBy: { email: target } } }), 0);
      assert.equal((await isolated.emailOtp.findFirst({ where: { email: target } })).consumedAt, null);
    }
  });

  await t.test("a PostgreSQL booking write failure rolls back OTP and account without exposing SQL", async () => {
    await isolated.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION guest_phase_d_force_booking_failure() RETURNS trigger AS $$
      BEGIN
        IF NEW.title = 'PHASE_D_FORCED_DB_FAILURE' THEN
          RAISE EXCEPTION 'phase d forced database failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await isolated.$executeRawUnsafe(`
      CREATE TRIGGER guest_phase_d_booking_failure
      BEFORE INSERT ON bookings
      FOR EACH ROW EXECUTE FUNCTION guest_phase_d_force_booking_failure()
    `);
    try {
      const target = email("database-failure");
      await issueOtp(target);
      const response = await request(app).post("/api/guest-booking/book")
        .send(completionPayload(target, resources.free, 185, { booking: { title: "PHASE_D_FORCED_DB_FAILURE" } }));
      assert.equal(response.status, 500);
      assert.equal(response.body.error.code, "INTERNAL_ERROR");
      assert.equal(JSON.stringify(response.body).includes("forced database failure"), false);
      assert.equal(await isolated.user.count({ where: { email: target } }), 0);
      assert.equal((await isolated.emailOtp.findFirst({ where: { email: target } })).consumedAt, null);
    } finally {
      await isolated.$executeRawUnsafe("DROP TRIGGER IF EXISTS guest_phase_d_booking_failure ON bookings");
      await isolated.$executeRawUnsafe("DROP FUNCTION IF EXISTS guest_phase_d_force_booking_failure()");
    }
  });

  await t.test("invalid address and address-source failure occur before OTP consumption", async () => {
    for (const [label, error] of [
      ["address-invalid", new HttpError(400, "Ward mismatch", { field: "wardCode" }, "VALIDATION_ERROR")],
      ["address-source", new HttpError(503, "Address source unavailable", undefined, "ADDRESS_SOURCE_UNAVAILABLE")]
    ]) {
      const target = email(label);
      await issueOtp(target);
      guestService.configureGuestAddressTestValidation(async () => { throw error; });
      const response = await request(app).post("/api/guest-booking/book")
        .send(completionPayload(target, resources.free, 190));
      assert.equal(response.status, error.status);
      assert.equal(response.body.error.code, error.code);
      assert.equal((await isolated.emailOtp.findFirst({ where: { email: target } })).consumedAt, null);
    }
    guestService.configureGuestAddressTestValidation(async () => verifiedAddress);
  });

  await t.test("duplicate and simultaneous completion produce at most one business outcome", async () => {
    const duplicateEmail = email("duplicate");
    await issueOtp(duplicateEmail);
    const payload = completionPayload(duplicateEmail, resources.free, 200);
    const first = await request(app).post("/api/guest-booking/book").send(payload);
    const retry = await request(app).post("/api/guest-booking/book").send(payload);
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(retry.status, 409);
    assert.equal(retry.body.error.code, "OTP_ALREADY_USED");
    assert.equal(await isolated.booking.count({ where: { requestedBy: { email: duplicateEmail } } }), 1);

    const concurrentEmail = email("concurrent");
    await issueOtp(concurrentEmail);
    const concurrentPayload = completionPayload(concurrentEmail, resources.concurrency, 201);
    const results = await Promise.all([
      request(app).post("/api/guest-booking/book").send(concurrentPayload),
      request(app).post("/api/guest-booking/book").send(concurrentPayload)
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal(await isolated.user.count({ where: { email: concurrentEmail } }), 1);
    assert.equal(await isolated.booking.count({ where: { requestedBy: { email: concurrentEmail } } }), 1);
  });

  await t.test("required OTP email fails closed and leaves no active challenge when SMTP is unavailable", async () => {
    guestService.configureGuestOtpTestDelivery(null);
    const target = email("smtp-unavailable");
    const response = await request(app).post("/api/guest-booking/otp").send({ email: target });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "EMAIL_DELIVERY_FAILED");
    const otp = await isolated.emailOtp.findFirst({ where: { email: target } });
    assert.ok(otp.consumedAt);
    guestService.configureGuestOtpTestDelivery(async ({ to, code }) => {
      deliveredCodes.set(to, code);
      return { success: true };
    });
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
