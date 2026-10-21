import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { startPasswordOtpSmtp } from "./helpers/passwordOtpSmtp.js";

import {
  assertBatch2Database,
  configureBatch2TestEnvironment,
  isolatedBatch2Client
} from "./helpers/batch2Database.js";

const database = assertBatch2Database(process.env.BATCH2_DATABASE || "");
const databaseUrl = await configureBatch2TestEnvironment(database);
const smtp = await startPasswordOtpSmtp();
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
    admin: id(), staff: id(), unassigned: id(), customerOther: id(), customerA: id(), customerB: id(), inactive: id(), roleTarget: id()
  },
  resources: { assigned: id(), foreign: id() }
};

const userRows = [
  ["admin", "ADMIN", true], ["staff", "LAB_STAFF", true], ["unassigned", "LAB_STAFF", true],
  ["customerOther", "CUSTOMER", true], ["customerA", "CUSTOMER", true], ["customerB", "CUSTOMER", true],
  ["inactive", "CUSTOMER", false], ["roleTarget", "CUSTOMER", true]
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
  await prisma.user.createMany({ data: userRows.map(([key, role, isActive]) => ({
    id: fixture.users[key], email: `${key.toLowerCase()}-${marker}@example.test`, fullName: `Batch 2 ${key}`, phone: "0901234567",
    role, isActive, passwordHash
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
    ["admin", "staff", "unassigned", "customerOther", "customerA", "customerB", "roleTarget"]
      .map(async (key) => [key, await login(key)])
  ));
  const tokens = Object.fromEntries(Object.entries(logins).map(([key, response]) => [key, response.body.accessToken]));

  await t.test("registration is normalized, DB-backed, and cannot request privilege", async () => {
    const email = `New.Customer-${marker}@Example.Test`;
    const created = await request(app).post("/api/auth/register").send({ email, password });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, "CUSTOMER");
    assert.equal(created.body.user.email, email.toLowerCase());

    const duplicate = await request(app).post("/api/auth/register").send({ email: email.toLowerCase(), password });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "DUPLICATE_EMAIL");

    const escalation = await request(app).post("/api/auth/register").send({ email: `escalate-${marker}@example.test`, password, role: "ADMIN" });
    assert.equal(escalation.status, 400);
    assert.equal(escalation.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("login, me, inactive, forged, expired, strict bearer and logout contracts", async () => {
    assert.equal(logins.customerA.status, 200);
    assert.equal((await login("customerA", "Wrong!Password")).status, 401);
    const inactive = await login("inactive");
    assert.equal(inactive.status, 401);
    assert.equal(inactive.body.error.code, "ACCOUNT_INACTIVE");

    const forged = jwt.sign({ sub: fixture.users.customerA, role: "ADMIN" }, "incorrect-secret", { algorithm: "HS256" });
    const forgedResult = await request(app).get("/api/auth/me").set(bearer(forged));
    assert.equal(forgedResult.status, 401);
    assert.equal(forgedResult.body.error.code, "AUTH_INVALID");

    const expired = jwt.sign({ sub: fixture.users.customerA, role: "ADMIN" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: -1 });
    const expiredResult = await request(app).get("/api/auth/me").set(bearer(expired));
    assert.equal(expiredResult.status, 401);
    assert.equal(expiredResult.body.error.code, "AUTH_EXPIRED");
    assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokens.customerA} trailing`)).status, 401);

    const me = await request(app).get("/api/auth/me").set(bearer(tokens.customerA));
    assert.equal(me.status, 200);
    assert.equal(me.body.id, fixture.users.customerA);
    assert.equal(await request(app).post("/api/auth/logout").set(bearer(tokens.customerA)).then((r) => r.status), 204);
    assert.equal((await request(app).get('/api/auth/me').set(bearer(tokens.customerA))).status, 401);
    tokens.customerA = (await login('customerA')).body.accessToken;
  });

  await t.test("ADMIN manages all accounts; staff directory is globally CUSTOMER-only", async () => {
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.admin))).status, 200);
    for (const actor of ["staff", "unassigned"]) {
      const directory = await request(app).get("/api/users").set(bearer(tokens[actor]));
      assert.equal(directory.status, 200);
      assert.ok(directory.body.length > 0);
      assert.ok(directory.body.every((user) => user.role === "CUSTOMER"));
      assert.ok(directory.body.some((user) => user.id === fixture.users.customerA));
      assert.ok(directory.body.some((user) => user.id === fixture.users.customerB));
      assert.equal((await request(app).get(`/api/users/${fixture.users.admin}`).set(bearer(tokens[actor]))).status, 404);
      assert.equal((await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`)
        .set(bearer(tokens[actor])).send({ role: "LAB_STAFF" })).status, 403);
    }
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.customerA))).status, 403);
    assert.equal((await request(app).get("/api/users").set(bearer(tokens.customerOther))).status, 403);
    assert.equal((await request(app).get(`/api/users/${fixture.users.customerA}`).set(bearer(tokens.admin))).status, 200);
    assert.equal((await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.customerA)).send({ role: "CUSTOMER" })).status, 403);
    assert.equal((await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.admin)).send({ role: "INSTRUCTOR" })).status, 400);
    const updated = await request(app).patch(`/api/users/${fixture.users.roleTarget}/role`).set(bearer(tokens.admin)).send({ role: "CUSTOMER" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.role, "CUSTOMER");

    const selfDemotion = await request(app).patch(`/api/users/${fixture.users.admin}/role`)
      .set(bearer(tokens.admin)).send({ role: "CUSTOMER" });
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
    assert.equal((await request(app).post(`/api/users/${fixture.users.customerA}/lab-assignments`).set(bearer(tokens.admin)).send({ laboratoryId: fixture.labs.assigned })).status, 409);
    const list = await request(app).get(`/api/users/${fixture.users.unassigned}/lab-assignments`).set(bearer(tokens.admin));
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal((await request(app).delete(`/api/users/${fixture.users.unassigned}/lab-assignments/${fixture.labs.foreign}`).set(bearer(tokens.admin))).status, 204);
  });

  await t.test("LAB_STAFF scope rejects foreign path, body, query and booking indirection", async () => {
    const assigned = await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`)
      .set(bearer(tokens.staff)).send({ operationalStatus: "OFFLINE", reason: "Batch 2 scope verification" });
    assert.equal(assigned.status, 200);
    await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`)
      .set(bearer(tokens.admin)).send({ operationalStatus: "AVAILABLE", reason: "Restore after authorized availability scope check" });

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

    const foreignBooking = await createBooking(tokens.customerB, fixture.resources.foreign, 21);
    assert.equal(foreignBooking.status, 201);
    const foreignApproval = await request(app).post(`/api/bookings/${foreignBooking.body.id}/approve`).set(bearer(tokens.staff)).send({});
    assert.equal(foreignApproval.status, 403);
  });

  await t.test("booking ownership prevents IDOR and requester forgery", async () => {
    const own = await createBooking(tokens.customerA, fixture.resources.assigned, 22);
    assert.equal(own.status, 201);
    assert.equal(own.body.requestedById, fixture.users.customerA);
    assert.equal((await request(app).get(`/api/bookings/${own.body.id}`).set(bearer(tokens.customerA))).status, 200);
    const crossRead = await request(app).get(`/api/bookings/${own.body.id}`).set(bearer(tokens.customerB));
    assert.equal(crossRead.status, 404);
    assert.equal(crossRead.body.error.code, "NOT_FOUND");
    const crossCancel = await request(app).post(`/api/bookings/${own.body.id}/cancel`).set(bearer(tokens.customerB)).send({ reason: "IDOR" });
    assert.equal(crossCancel.status, 404);

    const forgedRequester = await createBooking(tokens.customerA, fixture.resources.assigned, 23, { requestedById: fixture.users.customerB });
    assert.equal(forgedRequester.status, 400);
    assert.equal(forgedRequester.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("deactivation immediately revokes access", async () => {
    const before = await request(app).get("/api/auth/me").set(bearer(tokens.customerOther));
    assert.equal(before.status, 200);
    const deactivated = await request(app).patch(`/api/users/${fixture.users.customerOther}/active`)
      .set(bearer(tokens.admin)).send({ isActive: false });
    assert.equal(deactivated.status, 200);
    const after = await request(app).get("/api/auth/me").set(bearer(tokens.customerOther));
    assert.equal(after.status, 401);
    assert.equal(after.body.error.code, "ACCOUNT_INACTIVE");
  });

  await t.test("password change requires emailed OTP, persists bcrypt and revokes old sessions", async () => {
    const bypass = await request(app).post("/api/auth/change-password").set(bearer(tokens.customerA))
      .send({ currentPassword: password, newPassword });
    assert.equal(bypass.status, 400);
    assert.equal(bypass.body.error.code, "VALIDATION_ERROR");
    const wrong = await request(app).post("/api/auth/password-otp/request").set(bearer(tokens.customerA))
      .send({ currentPassword: "Wrong!Password" });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, "CURRENT_PASSWORD_INVALID");
    const sent = await request(app).post("/api/auth/password-otp/request").set(bearer(tokens.customerA))
      .send({ currentPassword: password });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.otp, undefined);
    const otp = smtp.codeFor(`customera-${marker}@example.test`);
    const changed = await request(app).post("/api/auth/change-password").set(bearer(tokens.customerA))
      .send({ challengeId: sent.body.challengeId, otp, currentPassword: password, newPassword });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.ok(changed.body.accessToken);
    assert.equal((await request(app).get("/api/auth/me").set(bearer(tokens.customerA))).status, 401);
    assert.equal((await request(app).get("/api/auth/me").set(bearer(changed.body.accessToken))).status, 200);
    const saved = await isolated.user.findUniqueOrThrow({ where: { id: fixture.users.customerA } });
    assert.notEqual(saved.passwordHash, newPassword);
    assert.equal(await bcrypt.compare(newPassword, saved.passwordHash), true);
    assert.equal((await login("customerA", password)).status, 401);
    assert.equal((await login("customerA", newPassword)).status, 200);
    tokens.customerA = changed.body.accessToken;
  });

  await t.test("sensitive mounted routes are protected and public calendar does not leak identity", async () => {
    assert.equal((await request(app).get("/api/dashboard")).status, 401);
    assert.equal((await request(app).get("/api/dashboard").set(bearer(tokens.customerB))).status, 403);
    assert.equal((await request(app).get("/api/dashboard").set(bearer(tokens.staff))).status, 200);
    assert.equal((await request(app).get("/api/payments/transactions")).status, 404);
    assert.equal((await request(app).get("/api/ai/efficiency-kpi")).status, 404);
    assert.equal((await request(app).get("/auth/me").set(bearer(tokens.admin))).status, 404);

    const calendar = await request(app).get(`/api/calendar/slots?resource_id=${fixture.resources.assigned}`);
    assert.equal(calendar.status, 200);
    const serialized = JSON.stringify(calendar.body);
    assert.equal(serialized.includes("requestedBy"), false);
    assert.equal(serialized.includes(`customerA-${marker}@example.test`), false);
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
  await smtp.close();
});
