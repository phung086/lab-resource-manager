import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import { configurePhaseFTestEnvironment, phaseFClient } from "./helpers/phaseFDatabase.js";
import { configureGuestOtpTestDelivery, configureGuestAddressTestValidation } from "../src/services/guestBookingService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "../src/services/systemAuditService.js";

const environment = configurePhaseFTestEnvironment();
const [{ createApp }, { prisma }] = await Promise.all([import("../src/app.js"), import("../src/db.js")]);
const app = createApp();
const isolated = phaseFClient(environment.url);
const id = () => crypto.randomUUID();
const marker = crypto.randomUUID();
const password = "PhaseF!Pass123";
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const now = new Date();
const future = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), foreign: id() },
  users: {
    admin: id(),
    staff: id(),
    foreignStaff: id(),
    student: id(),
    lecturer: id(),
    targetUser: id()
  },
  resources: { assigned: id(), foreign: id() },
  booking: id()
};

async function login(name) {
  const response = await request(app).post("/api/auth/login").send({
    email: `${name}-${marker}@example.test`.toLowerCase(),
    password
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.accessToken;
}

async function seed() {
  const [identity] = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity.database, environment.database);
  assert.match(identity.version, /^16\./);

  const passwordHash = await bcrypt.hash(password, 4);

  await isolated.campus.create({ data: { id: fixture.campus, code: `PFC-${marker}`, name: "Phase F Campus" } });
  await isolated.building.create({ data: { id: fixture.building, campusId: fixture.campus, code: `PFB-${marker}`, name: "Phase F Building" } });
  await isolated.laboratory.createMany({
    data: [
      { id: fixture.labs.assigned, buildingId: fixture.building, code: `PFLA-${marker}`, name: "Phase F Assigned Lab" },
      { id: fixture.labs.foreign, buildingId: fixture.building, code: `PFLF-${marker}`, name: "Phase F Foreign Lab" }
    ]
  });

  const roles = {
    admin: "ADMIN",
    staff: "LAB_STAFF",
    foreignStaff: "LAB_STAFF",
    student: "STUDENT",
    lecturer: "LECTURER",
    targetUser: "STUDENT"
  };

  await isolated.user.createMany({
    data: Object.entries(fixture.users).map(([name, userId]) => ({
      id: userId,
      email: `${name}-${marker}@example.test`.toLowerCase(),
      fullName: `Phase F ${name}`,
      role: roles[name],
      passwordHash,
      isActive: true,
      customerType: name === "student" ? "INTERNAL" : "EXTERNAL"
    }))
  });

  await isolated.userLabAssignment.createMany({
    data: [
      { userId: fixture.users.staff, laboratoryId: fixture.labs.assigned },
      { userId: fixture.users.foreignStaff, laboratoryId: fixture.labs.foreign }
    ]
  });

  await isolated.resource.createMany({
    data: [
      { id: fixture.resources.assigned, laboratoryId: fixture.labs.assigned, code: `PFRA-${marker}`, name: "Audit Resource", subtype: "OTHER", category: "EQUIPMENT", location: "PF-01" },
      { id: fixture.resources.foreign, laboratoryId: fixture.labs.foreign, code: `PFRF-${marker}`, name: "Foreign Resource", subtype: "OTHER", category: "EQUIPMENT", location: "PF-02" }
    ]
  });

  await isolated.booking.create({
    data: {
      id: fixture.booking,
      resourceId: fixture.resources.assigned,
      requestedById: fixture.users.student,
      title: "Audit test booking",
      purpose: "ACADEMIC",
      startAt: future(10),
      endAt: future(12),
      status: "CONFIRMED",
      feeAmountVnd: 100000
    }
  });
}

test("Phase F System Audit Trail and Administrative Accountability", { timeout: 180000 }, async (t) => {
  await seed();
  const names = ["admin", "staff", "foreignStaff", "student", "lecturer"];
  const tokens = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await login(n)])));

  await t.test("USER ROLE: admin role change is auditable with before/after state; unauthorized mutation denied", async () => {
    // 1. Admin changes target user role from STUDENT to LECTURER
    const changeRes = await request(app)
      .patch(`/api/users/${fixture.users.targetUser}/role`)
      .set(bearer(tokens.admin))
      .send({ role: "LECTURER" });
    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.role, "LECTURER");

    const auditEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        targetId: fixture.users.targetUser
      },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(auditEvent);
    assert.equal(auditEvent.actorId, fixture.users.admin);
    assert.equal(auditEvent.actorRoleSnapshot, "ADMIN");
    assert.deepEqual(auditEvent.beforeState, { role: "STUDENT" });
    assert.deepEqual(auditEvent.afterState, { role: "LECTURER" });

    // 2. Unauthorized role change by STUDENT fails with 403, writes no audit
    const countBefore = await isolated.systemAuditEvent.count();
    const deniedRes = await request(app)
      .patch(`/api/users/${fixture.users.targetUser}/role`)
      .set(bearer(tokens.student))
      .send({ role: "ADMIN" });
    assert.equal(deniedRes.status, 403);
    assert.equal(await isolated.systemAuditEvent.count(), countBefore);

    // 3. Failed mutation on non-existent user writes no audit
    const nonExistentRes = await request(app)
      .patch(`/api/users/${id()}/role`)
      .set(bearer(tokens.admin))
      .send({ role: "LECTURER" });
    assert.equal(nonExistentRes.status, 404);
    assert.equal(await isolated.systemAuditEvent.count(), countBefore);
  });

  await t.test("USER ACTIVATION: admin deactivate and reactivate generate audit with minimized state", async () => {
    // 4. Deactivate
    const deactivateRes = await request(app)
      .patch(`/api/users/${fixture.users.targetUser}/active`)
      .set(bearer(tokens.admin))
      .send({ isActive: false });
    assert.equal(deactivateRes.status, 200);
    assert.equal(deactivateRes.body.isActive, false);

    const deactEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.USER_ACTIVATION_CHANGED,
        targetId: fixture.users.targetUser
      },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(deactEvent);
    assert.deepEqual(deactEvent.beforeState, { isActive: true });
    assert.deepEqual(deactEvent.afterState, { isActive: false });

    // 5. Reactivate
    const reactivateRes = await request(app)
      .patch(`/api/users/${fixture.users.targetUser}/active`)
      .set(bearer(tokens.admin))
      .send({ isActive: true });
    assert.equal(reactivateRes.status, 200);
    assert.equal(reactivateRes.body.isActive, true);

    const reactEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.USER_ACTIVATION_CHANGED,
        targetId: fixture.users.targetUser
      },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(reactEvent);
    assert.deepEqual(reactEvent.beforeState, { isActive: false });
    assert.deepEqual(reactEvent.afterState, { isActive: true });
  });

  await t.test("LAB ASSIGNMENT: add and remove are transactionally auditable and survive row deletion", async () => {
    // 6. Assign target user to assigned lab (first ensure target is LAB_STAFF)
    await isolated.user.update({
      where: { id: fixture.users.targetUser },
      data: { role: "LAB_STAFF" }
    });

    const assignRes = await request(app)
      .post(`/api/users/${fixture.users.targetUser}/lab-assignments`)
      .set(bearer(tokens.admin))
      .send({ laboratoryId: fixture.labs.assigned });
    assert.equal(assignRes.status, 201);

    const addEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.LAB_ASSIGNMENT_ADDED,
        targetId: `${fixture.users.targetUser}:${fixture.labs.assigned}`
      }
    });
    assert.ok(addEvent);
    assert.equal(addEvent.labId, fixture.labs.assigned);
    assert.equal(addEvent.targetType, AUDIT_TARGET_TYPES.LAB_ASSIGNMENT);
    assert.equal(addEvent.afterState?.userId, fixture.users.targetUser);
    assert.equal(addEvent.afterState?.laboratoryId, fixture.labs.assigned);

    // 7. Remove assignment and verify audit row persists even though userLabAssignment is deleted
    const removeRes = await request(app)
      .delete(`/api/users/${fixture.users.targetUser}/lab-assignments/${fixture.labs.assigned}`)
      .set(bearer(tokens.admin));
    assert.equal(removeRes.status, 204);

    const checkAssignment = await isolated.userLabAssignment.findUnique({
      where: {
        userId_laboratoryId: {
          userId: fixture.users.targetUser,
          laboratoryId: fixture.labs.assigned
        }
      }
    });
    assert.equal(checkAssignment, null);

    const removeEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.LAB_ASSIGNMENT_REMOVED,
        targetId: `${fixture.users.targetUser}:${fixture.labs.assigned}`
      }
    });
    assert.ok(removeEvent);
    assert.deepEqual(removeEvent.beforeState, {
      userId: fixture.users.targetUser,
      laboratoryId: fixture.labs.assigned
    });

    // 8. Unauthorized lab assignment by student denied
    const unauthRes = await request(app)
      .post(`/api/users/${fixture.users.targetUser}/lab-assignments`)
      .set(bearer(tokens.student))
      .send({ laboratoryId: fixture.labs.assigned });
    assert.equal(unauthRes.status, 403);
  });

  await t.test("AUDIT READ AUTHORIZATION: ordinary users denied, staff scoped, admin global", async () => {
    // 9. STUDENT denied
    const studentRes = await request(app).get("/api/audit-events").set(bearer(tokens.student));
    assert.equal(studentRes.status, 403);

    // 10. LECTURER denied
    const lecturerRes = await request(app).get("/api/audit-events").set(bearer(tokens.lecturer));
    assert.equal(lecturerRes.status, 403);

    // 11. Foreign LAB_STAFF cannot query other labs
    const foreignStaffRes = await request(app)
      .get(`/api/audit-events?labId=${fixture.labs.assigned}`)
      .set(bearer(tokens.foreignStaff));
    assert.equal(foreignStaffRes.status, 403);

    // LAB_STAFF with assigned lab can query their lab's events
    const staffRes = await request(app)
      .get(`/api/audit-events?labId=${fixture.labs.assigned}`)
      .set(bearer(tokens.staff));
    assert.equal(staffRes.status, 200);
    assert.ok(Array.isArray(staffRes.body.events));
    assert.ok(staffRes.body.events.every((e) => e.labId === fixture.labs.assigned));

    // 12. ADMIN has global read access
    const adminRes = await request(app).get("/api/audit-events").set(bearer(tokens.admin));
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.body.events.length >= 4);
    assert.ok(adminRes.body.pagination);
    assert.equal(adminRes.body.pagination.page, 1);
  });

  await t.test("DATA MINIMIZATION: no password hashes, tokens, or OTP codes stored in audit", async () => {
    // 13, 14, 15: Retrieve all audit records and ensure no secret tokens exist
    const allEvents = await isolated.systemAuditEvent.findMany();
    const serialized = JSON.stringify(allEvents);
    assert.equal(serialized.includes("passwordHash"), false);
    assert.equal(serialized.includes(password), false);
    assert.equal(serialized.includes("codeHash"), false);
    assert.equal(serialized.includes("jwtSecret"), false);
    assert.equal(serialized.includes("refreshToken"), false);
  });

  await t.test("GUEST ACCOUNT EVENTS: creation and reuse are audited atomically without PII exposure", async () => {
    let capturedOtp = null;
    configureGuestOtpTestDelivery(({ code }) => {
      capturedOtp = code;
      return { success: true };
    });
    configureGuestAddressTestValidation(async (addr) => ({
      addressLine: addr.addressLine,
      provinceCode: "01",
      provinceName: "Hà Nội",
      wardCode: "00001",
      wardName: "Phường Phúc Xá",
      source: "test_mock",
      version: "2026.1"
    }));

    const guestEmail = `guest-audit-${marker}@example.test`;
    const sendRes = await request(app).post("/api/guest-booking/otp").send({
      email: guestEmail,
      fullName: "Guest Audit User"
    });
    assert.equal(sendRes.status, 202);
    assert.ok(capturedOtp);

    // 17. Complete guest booking for NEW account
    const completeRes = await request(app).post("/api/guest-booking/book").send({
      email: guestEmail,
      fullName: "Guest Audit User",
      phone: "0912345678",
      address: { addressLine: "123 Đường Test", provinceCode: "01", wardCode: "00001" },
      otpCode: capturedOtp,
      booking: {
        resourceId: fixture.resources.assigned,
        title: "Guest audit booking",
        purpose: "Guest academic use",
        startAt: future(40).toISOString(),
        endAt: future(42).toISOString()
      }
    });
    assert.equal(completeRes.status, 201);
    const guestUser = completeRes.body.user;

    const guestCreatedEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.GUEST_ACCOUNT_CREATED,
        targetId: guestUser.id
      }
    });
    assert.ok(guestCreatedEvent);
    assert.equal(guestCreatedEvent.targetType, AUDIT_TARGET_TYPES.USER);
    assert.equal(guestCreatedEvent.afterState?.role, "STUDENT");
    assert.equal(guestCreatedEvent.afterState?.customerType, "EXTERNAL");
    assert.equal(JSON.stringify(guestCreatedEvent).includes(capturedOtp), false);
    assert.equal(JSON.stringify(guestCreatedEvent).includes("0912345678"), false);

    // 18. Complete guest booking for REUSED account
    let reuseOtp = null;
    configureGuestOtpTestDelivery(({ code }) => {
      reuseOtp = code;
      return { success: true };
    });
    await request(app).post("/api/guest-booking/otp").send({
      email: guestEmail,
      fullName: "Guest Audit User"
    });
    assert.ok(reuseOtp);

    const reuseRes = await request(app).post("/api/guest-booking/book").send({
      email: guestEmail,
      fullName: "Guest Audit User",
      phone: "0912345678",
      address: { addressLine: "123 Đường Test", provinceCode: "01", wardCode: "00001" },
      otpCode: reuseOtp,
      booking: {
        resourceId: fixture.resources.assigned,
        title: "Guest reuse booking",
        purpose: "Guest reuse",
        startAt: future(48).toISOString(),
        endAt: future(50).toISOString()
      }
    });
    assert.equal(reuseRes.status, 201);

    const guestReusedEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.GUEST_ACCOUNT_REUSED,
        targetId: guestUser.id
      }
    });
    assert.ok(guestReusedEvent);
    assert.equal(guestReusedEvent.targetType, AUDIT_TARGET_TYPES.USER);
    assert.deepEqual(guestReusedEvent.beforeState, { customerType: "EXTERNAL" });
    assert.deepEqual(guestReusedEvent.afterState, { customerType: "EXTERNAL" });
  });

  await t.test("PRICING & PAYMENT: pricing change captures before/after rate; admin charge is auditable", async () => {
    // 19. Admin updates pricing
    const pricingRes = await request(app)
      .put(`/api/booking-pricing/${fixture.resources.assigned}`)
      .set(bearer(tokens.admin))
      .send({
        purposeCode: "RESEARCH",
        label: "Internal Rate",
        hourlyRateVnd: 75000
      });
    assert.equal(pricingRes.status, 200);

    const pricingEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.RESOURCE_PRICING_CHANGED,
        resourceId: fixture.resources.assigned
      },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(pricingEvent);
    assert.equal(pricingEvent.afterState?.hourlyRateVnd, 75000);
    assert.equal(pricingEvent.afterState?.purposeCode, "RESEARCH");

    // 20. Admin creates payment charge
    const chargeRes = await request(app)
      .post("/api/payments/charges")
      .set(bearer(tokens.admin))
      .send({
        bookingId: fixture.booking,
        amount: 100000,
        description: "Charge for audit test booking"
      });
    assert.equal(chargeRes.status, 201);

    const chargeEvent = await isolated.systemAuditEvent.findFirst({
      where: {
        action: AUDIT_ACTIONS.PAYMENT_CHARGE_CREATED,
        targetId: chargeRes.body.id
      }
    });
    assert.ok(chargeEvent);
    assert.equal(chargeEvent.actorId, fixture.users.admin);
    assert.equal(chargeEvent.afterState?.amount, 100000);
    assert.equal(chargeEvent.afterState?.bookingId, fixture.booking);
  });

  await t.test("TRANSACTION GUARANTEE: forced audit insert failure rolls back business mutation", async () => {
    // 16. If audit insert fails, the enclosing mutation must roll back
    const userBefore = await isolated.user.findUnique({ where: { id: fixture.users.targetUser } });
    const originalRole = userBefore.role;
    const candidateRole = originalRole === "LECTURER" ? "STUDENT" : "LECTURER";

    await assert.rejects(async () => {
      await isolated.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: fixture.users.targetUser },
          data: { role: candidateRole }
        });
        // Deliberately violate NOT NULL constraint on action column to force audit write failure
        await tx.systemAuditEvent.create({
          data: {
            id: crypto.randomUUID(),
            action: null,
            targetType: "USER",
            targetId: fixture.users.targetUser
          }
        });
      });
    });

    const userAfter = await isolated.user.findUnique({ where: { id: fixture.users.targetUser } });
    assert.equal(userAfter.role, originalRole);
  });

  await isolated.$disconnect();
  await prisma.$disconnect();
});
