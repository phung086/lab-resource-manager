import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

import {
  assertBatch2Database,
  configureBatch2TestEnvironment,
  isolatedBatch2Client
} from "./helpers/batch2Database.js";

const database = assertBatch2Database(process.env.BATCH2_DATABASE || "");
const databaseUrl = await configureBatch2TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js")
]);

const app = createApp();
const isolated = isolatedBatch2Client(databaseUrl);
const password = "Batch2!Pass";
const newPassword = "Batch2!Changed";
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const at = (day, hour) => new Date(Date.UTC(2041, 0, day, hour));
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), foreign: id() },
  users: {
    admin: id(), staff: id(), unassigned: id(), lecturer: id(), studentA: id(), studentB: id(), inactive: id(), roleTarget: id(), tempReset: id()
  },
  resources: { assigned: id(), foreign: id() }
};

const userRows = [
  ["admin", "ADMIN", true], ["staff", "LAB_STAFF", true], ["unassigned", "LAB_STAFF", true],
  ["lecturer", "LECTURER", true], ["studentA", "STUDENT", true], ["studentB", "STUDENT", true],
  ["inactive", "STUDENT", false], ["roleTarget", "STUDENT", true], ["tempReset", "STUDENT", true, true]
];

async function seed() {
  const identity = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity[0].database, database);
  assert.match(identity[0].version, /^16\./);
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.campus.create({ data: { id: fixture.campus, name: "Batch 2 Campus", code: `B2C-${marker}` } });
  await prisma.building.create({ data: { id: fixture.building, campusId: fixture.campus, name: "Batch 2 Building", code: `B2B-${marker}` } });
  await prisma.laboratory.createMany({ data: [
    { id: fixture.labs.assigned, buildingId: fixture.building, name: "Assigned Lab", code: `B2LA-${marker}` },
    { id: fixture.labs.foreign, buildingId: fixture.building, name: "Foreign Lab", code: `B2LF-${marker}` }
  ] });
  await prisma.user.createMany({ data: userRows.map(([key, role, isActive, passwordResetRequired = false]) => ({
    id: fixture.users[key], email: `${key.toLowerCase()}-${marker}@example.test`, fullName: `Batch 2 ${key}`,
    role, isActive, passwordHash, passwordResetRequired
  })) });
  await prisma.userLabAssignment.create({ data: { userId: fixture.users.staff, laboratoryId: fixture.labs.assigned } });
  await prisma.resource.createMany({ data: [
    { id: fixture.resources.assigned, laboratoryId: fixture.labs.assigned, code: `B2RA-${marker}`, name: "Assigned Resource", subtype: "OTHER", category: "EQUIPMENT", location: "TEST", requiresApproval: true },
    { id: fixture.resources.foreign, laboratoryId: fixture.labs.foreign, code: `B2RF-${marker}`, name: "Foreign Resource", subtype: "OTHER", category: "EQUIPMENT", location: "TEST", requiresApproval: true }
  ] });
}

async function login(key, suppliedPassword = password) {
  return request(app).post("/api/auth/login").send({
    email: `${key.toLowerCase()}-${marker}@example.test`, password: suppliedPassword
  });
}

async function createBooking(token, resourceId, day, extra = {}) {
  return request(app).post("/api/bookings").set(bearer(token)).send({
    resourceId,
    title: `Batch 2 booking ${day}`,
    purpose: "Authorization verification",
    startAt: at(day, 10).toISOString(),
    endAt: at(day, 11).toISOString(),
    ...extra
  });
}

test("Batch 2 authentication, RBAC, ownership and lab scope", { timeout: 180000 }, async (t) => {
  await seed();
  const logins = Object.fromEntries(await Promise.all(
    ["admin", "staff", "unassigned", "lecturer", "studentA", "studentB", "roleTarget", "tempReset"]
      .map(async (key) => [key, await login(key)])
  ));
  const tokens = Object.fromEntries(Object.entries(logins).map(([key, response]) => [key, response.body.accessToken]));

  await t.test("registration is normalized, DB-backed, and cannot request privilege", async () => {
    const email = `New.Student-${marker}@Example.Test`;
    const created = await request(app).post("/api/auth/register").send({ email, password, fullName: "New Student" });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, "STUDENT");
    assert.equal(created.body.user.email, email.toLowerCase());

    const duplicate = await request(app).post("/api/auth/register").send({ email: email.toLowerCase(), password, fullName: "Duplicate" });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "DUPLICATE_EMAIL");

    const escalation = await request(app).post("/api/auth/register").send({ email: `escalate-${marker}@example.test`, password, fullName: "Escalation", role: "ADMIN" });
    assert.equal(escalation.status, 400);
    assert.equal(escalation.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("login, me, inactive, forged, expired, strict bearer and logout contracts", async () => {
    assert.equal(logins.studentA.status, 200);
    assert.equal((await login("studentA", "Wrong!Password")).status, 401);
    const inactive = await login("inactive");
    assert.equal(inactive.status, 401);
    assert.equal(inactive.body.error.code, "ACCOUNT_INACTIVE");

    const forged = jwt.sign({ sub: fixture.users.studentA, role: "ADMIN" }, "incorrect-secret", { algorithm: "HS256" });
    const forgedResult = await request(app).get("/api/auth/me").set(bearer(forged));
    assert.equal(forgedResult.status, 401);
    assert.equal(forgedResult.body.error.code, "AUTH_INVALID");

    const expired = jwt.sign({ sub: fixture.users.studentA, role: "ADMIN" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: -1 });
    const expiredResult = await request(app).get("/api/auth/me").set(bearer(expired));
    assert.equal(expiredResult.status, 401);
    assert.equal(expiredResult.body.error.code, "AUTH_EXPIRED");
    assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokens.studentA} trailing`)).status, 401);

    const me = await request(app).get("/api/auth/me").set(bearer(tokens.studentA));
    assert.equal(me.status, 200);
    assert.equal(me.body.id, fixture.users.studentA);
    assert.equal(await request(app).post("/api/auth/logout").set(bearer(tokens.studentA)).then((r) => r.status), 204);
  });

  await t.test("ADMIN-only user management and canonical role validation", async () => {
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.admin))).status, 200);
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.studentA))).status, 403);
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.lecturer))).status, 403);
    assert.equal((await request(app).get(`/api/users/${fixture.users.studentA}`).set(bearer(tokens.admin))).status, 200);
    assert.equal((await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.studentA)).send({ role: "LECTURER" })).status, 403);
    assert.equal((await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.admin)).send({ role: "INSTRUCTOR" })).status, 400);
    const updated = await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.admin)).send({ role: "LECTURER" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.role, "LECTURER");

    const selfDemotion = await request(app).patch(`/api/users/${fixture.users.admin}/role`)
      .set(bearer(tokens.admin)).send({ role: "STUDENT" });
    assert.equal(selfDemotion.status, 409);
    assert.equal(selfDemotion.body.error.code, "SELF_LOCKOUT_FORBIDDEN");

    const selfDeactivation = await request(app).patch(`/api/users/${fixture.users.admin}/active`)
      .set(bearer(tokens.admin)).send({ isActive: false });
    assert.equal(selfDeactivation.status, 409);
    assert.equal(selfDeactivation.body.error.code, "SELF_LOCKOUT_FORBIDDEN");
  });

  await t.test("LAB_STAFF assignments are persisted and role constrained", async () => {
    const assigned = await request(app).post(`/api/users/${fixture.users.unassigned}/lab-assignments`)
      .set(bearer(tokens.admin)).send({ laboratoryId: fixture.labs.foreign });
    assert.equal(assigned.status, 201);
    assert.equal((await request(app).post(`/api/users/${fixture.users.unassigned}/lab-assignments`).set(bearer(tokens.admin)).send({ laboratoryId: fixture.labs.foreign })).status, 409);
    assert.equal((await request(app).post(`/api/users/${fixture.users.studentA}/lab-assignments`).set(bearer(tokens.admin)).send({ laboratoryId: fixture.labs.assigned })).status, 409);
    const list = await request(app).get(`/api/users/${fixture.users.unassigned}/lab-assignments`).set(bearer(tokens.admin));
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal((await request(app).delete(`/api/users/${fixture.users.unassigned}/lab-assignments/${fixture.labs.foreign}`).set(bearer(tokens.admin))).status, 204);
  });

  await t.test("LAB_STAFF scope rejects foreign path, body, query and booking indirection", async () => {
    const assigned = await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`)
      .set(bearer(tokens.staff)).send({ operationalStatus: "CALIBRATION", reason: "Batch 2 scope verification" });
    assert.equal(assigned.status, 200);
    await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`)
      .set(bearer(tokens.admin)).send({ operationalStatus: "AVAILABLE" });

    const foreignPath = await request(app).patch(`/api/resources/${fixture.resources.foreign}/operational-status`)
      .set(bearer(tokens.staff)).send({ operationalStatus: "MAINTENANCE", reason: "Forbidden foreign lab" });
    assert.equal(foreignPath.status, 403);
    assert.equal(foreignPath.body.error.code, "FORBIDDEN");

    const foreignBody = await request(app).post("/api/maintenance").set(bearer(tokens.staff)).send({
      resourceId: fixture.resources.foreign, kind: "maintenance", status: "scheduled", title: "Foreign maintenance",
      startAt: at(20, 10).toISOString(), endAt: at(20, 11).toISOString()
    });
    assert.equal(foreignBody.status, 403);

    const foreignQuery = await request(app).get(`/api/bookings?resourceId=${fixture.resources.foreign}`).set(bearer(tokens.staff));
    assert.equal(foreignQuery.status, 403);
    assert.equal((await request(app).get(`/api/bookings?resourceId=${fixture.resources.assigned}`).set(bearer(tokens.unassigned))).status, 403);

    const foreignBooking = await createBooking(tokens.studentB, fixture.resources.foreign, 21);
    assert.equal(foreignBooking.status, 201);
    const foreignApproval = await request(app).post(`/api/bookings/${foreignBooking.body.id}/approve`).set(bearer(tokens.staff)).send({});
    assert.equal(foreignApproval.status, 403);
  });

  await t.test("booking ownership prevents IDOR and requester forgery", async () => {
    const own = await createBooking(tokens.studentA, fixture.resources.assigned, 22);
    assert.equal(own.status, 201);
    assert.equal(own.body.requestedById, fixture.users.studentA);
    assert.equal((await request(app).get(`/api/bookings/${own.body.id}`).set(bearer(tokens.studentA))).status, 200);
    const crossRead = await request(app).get(`/api/bookings/${own.body.id}`).set(bearer(tokens.studentB));
    assert.equal(crossRead.status, 404);
    assert.equal(crossRead.body.error.code, "NOT_FOUND");
    const crossCancel = await request(app).post(`/api/bookings/${own.body.id}/cancel`).set(bearer(tokens.studentB)).send({ reason: "IDOR" });
    assert.equal(crossCancel.status, 404);

    const forgedRequester = await createBooking(tokens.studentA, fixture.resources.assigned, 23, { requestedById: fixture.users.studentB });
    assert.equal(forgedRequester.status, 400);
    assert.equal(forgedRequester.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("deactivation immediately revokes access", async () => {
    const before = await request(app).get("/api/auth/me").set(bearer(tokens.lecturer));
    assert.equal(before.status, 200);
    const deactivated = await request(app).patch(`/api/users/${fixture.users.lecturer}/active`)
      .set(bearer(tokens.admin)).send({ isActive: false });
    assert.equal(deactivated.status, 200);
    const after = await request(app).get("/api/auth/me").set(bearer(tokens.lecturer));
    assert.equal(after.status, 401);
    assert.equal(after.body.error.code, "ACCOUNT_INACTIVE");
  });

  await t.test("temporary credential is restricted until password reset completes", async () => {
    assert.equal(logins.tempReset.status, 200);
    assert.equal(logins.tempReset.body.user.passwordResetRequired, true);

    const meBefore = await request(app).get("/api/auth/me").set(bearer(tokens.tempReset));
    assert.equal(meBefore.status, 200);
    assert.equal(meBefore.body.passwordResetRequired, true);

    const blockedBooking = await createBooking(tokens.tempReset, fixture.resources.assigned, 24);
    assert.equal(blockedBooking.status, 403);
    assert.equal(blockedBooking.body.error.code, "PASSWORD_RESET_REQUIRED");

    const blockedProfile = await request(app).get("/api/users/me").set(bearer(tokens.tempReset));
    assert.equal(blockedProfile.status, 403);
    assert.equal(blockedProfile.body.error.code, "PASSWORD_RESET_REQUIRED");

    const temporaryNewPassword = "TempReset!Changed";
    const changed = await request(app)
      .post("/api/auth/change-password")
      .set(bearer(tokens.tempReset))
      .send({ currentPassword: password, newPassword: temporaryNewPassword });
    assert.equal(changed.status, 204);

    const meAfter = await request(app).get("/api/auth/me").set(bearer(tokens.tempReset));
    assert.equal(meAfter.status, 200);
    assert.equal(meAfter.body.passwordResetRequired, false);

    const allowedBooking = await createBooking(tokens.tempReset, fixture.resources.assigned, 24);
    assert.equal(allowedBooking.status, 201);

    assert.equal((await login("tempReset", password)).status, 401);
    assert.equal((await login("tempReset", temporaryNewPassword)).status, 200);
  });

  await t.test("password change verifies current password and persists a bcrypt hash", async () => {
    const wrong = await request(app).post("/api/auth/change-password").set(bearer(tokens.studentA))
      .send({ currentPassword: "Wrong!Password", newPassword });
    assert.equal(wrong.status, 400);
    const changed = await request(app).post("/api/auth/change-password").set(bearer(tokens.studentA))
      .send({ currentPassword: password, newPassword });
    assert.equal(changed.status, 204);
    assert.equal((await login("studentA", password)).status, 401);
    assert.equal((await login("studentA", newPassword)).status, 200);
  });

  await t.test("sensitive mounted routes are protected and public calendar does not leak identity", async () => {
    assert.equal((await request(app).get("/api/dashboard")).status, 401);
    assert.equal((await request(app).get("/api/dashboard").set(bearer(tokens.studentB))).status, 403);
    assert.equal((await request(app).get("/api/dashboard").set(bearer(tokens.staff))).status, 200);
    assert.equal((await request(app).get("/api/payments/transactions")).status, 404);
    assert.equal((await request(app).get("/api/ai/efficiency-kpi")).status, 404);
    assert.equal((await request(app).get("/auth/me").set(bearer(tokens.admin))).status, 404);

    const calendar = await request(app).get(`/api/calendar/slots?resource_id=${fixture.resources.assigned}`);
    assert.equal(calendar.status, 200);
    const serialized = JSON.stringify(calendar.body);
    assert.equal(serialized.includes("requestedBy"), false);
    assert.equal(serialized.includes(`studentA-${marker}@example.test`), false);
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
