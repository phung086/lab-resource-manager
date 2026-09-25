import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import { configurePhaseETestEnvironment, phaseEClient } from "./helpers/phaseEDatabase.js";

const environment = configurePhaseETestEnvironment();
const [{ createApp }, { prisma }] = await Promise.all([import("../src/app.js"), import("../src/db.js")]);
const app = createApp();
const isolated = phaseEClient(environment.url);
const id = () => crypto.randomUUID();
const marker = crypto.randomUUID();
const password = "PhaseE!Pass123";
const newPassword = "PhaseE!Changed456";
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const now = new Date();
const future = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);

const fixture = {
  campus: id(), building: id(),
  labs: { assigned: id(), foreign: id() },
  users: { admin: id(), staff: id(), foreignStaff: id(), unassignedStaff: id(), student: id(), otherStudent: id(), lecturer: id(), temporary: id() },
  resources: { assigned: id(), foreign: id() },
  bookings: { student: id(), lecturer: id() },
  payment: id(), incident: id(), notifications: { student: id(), other: id() }
};

async function login(name, loginPassword = password) {
  const response = await request(app).post("/api/auth/login").send({ email: `${name}-${marker}@example.test`.toLowerCase(), password: loginPassword });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.accessToken;
}

async function seed() {
  const [identity] = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity.database, environment.database);
  assert.match(identity.version, /^16\./);
  const passwordHash = await bcrypt.hash(password, 4);
  await isolated.campus.create({ data: { id: fixture.campus, code: `PEC-${marker}`, name: "Phase E Campus" } });
  await isolated.building.create({ data: { id: fixture.building, campusId: fixture.campus, code: `PEB-${marker}`, name: "Phase E Building" } });
  await isolated.laboratory.createMany({ data: [
    { id: fixture.labs.assigned, buildingId: fixture.building, code: `PELA-${marker}`, name: "Phase E Assigned Lab" },
    { id: fixture.labs.foreign, buildingId: fixture.building, code: `PELF-${marker}`, name: "Phase E Foreign Lab" }
  ] });
  const roles = { admin: "ADMIN", staff: "LAB_STAFF", foreignStaff: "LAB_STAFF", unassignedStaff: "LAB_STAFF", student: "STUDENT", otherStudent: "STUDENT", lecturer: "LECTURER", temporary: "STUDENT" };
  await isolated.user.createMany({ data: Object.entries(fixture.users).map(([name, userId]) => ({
    id: userId, email: `${name}-${marker}@example.test`.toLowerCase(), fullName: `Phase E ${name}`, role: roles[name], passwordHash,
    isActive: true, passwordResetRequired: name === "temporary", customerType: name === "student" ? "INTERNAL" : "EXTERNAL"
  })) });
  await isolated.userLabAssignment.createMany({ data: [
    { userId: fixture.users.staff, laboratoryId: fixture.labs.assigned },
    { userId: fixture.users.foreignStaff, laboratoryId: fixture.labs.foreign }
  ] });
  await isolated.resource.createMany({ data: [
    { id: fixture.resources.assigned, laboratoryId: fixture.labs.assigned, code: `PERA-${marker}`, name: "Privacy Resource", subtype: "OTHER", category: "EQUIPMENT", location: "PE-01" },
    { id: fixture.resources.foreign, laboratoryId: fixture.labs.foreign, code: `PERF-${marker}`, name: "Foreign Resource", subtype: "OTHER", category: "EQUIPMENT", location: "PE-02" }
  ] });
  await isolated.booking.createMany({ data: [
    { id: fixture.bookings.student, resourceId: fixture.resources.assigned, requestedById: fixture.users.student, title: "Private student purpose", purpose: "PRIVATE_STUDENT", startAt: future(24), endAt: future(25), status: "CONFIRMED" },
    { id: fixture.bookings.lecturer, resourceId: fixture.resources.assigned, requestedById: fixture.users.lecturer, title: "Private lecturer purpose", purpose: "PRIVATE_LECTURER", startAt: future(26), endAt: future(27), status: "PENDING_APPROVAL" }
  ] });
  await isolated.resourceStatusHistory.create({ data: { id: id(), resourceId: fixture.resources.assigned, fromStatus: "AVAILABLE", toStatus: "MAINTENANCE", reason: "Internal operational reason", changedById: fixture.users.staff } });
  await isolated.usageLog.create({ data: { id: id(), resourceId: fixture.resources.assigned, bookingId: fixture.bookings.lecturer, userId: fixture.users.staff, action: "APPROVE", message: "private.audit.message", reason: "Private staff reason", metadata: { privateKey: "secret-value" } } });
  await isolated.maintenanceWindow.create({ data: { id: id(), resourceId: fixture.resources.assigned, createdById: fixture.users.staff, title: "Internal maintenance title", kind: "calibration", status: "scheduled", startAt: future(30), endAt: future(32) } });
  await isolated.incident.create({ data: { id: fixture.incident, resourceId: fixture.resources.assigned, reportedById: fixture.users.otherStudent, title: "Private reporter incident", description: "Private incident detail", severity: "high", status: "reported" } });
  await isolated.paymentTransaction.create({ data: { id: fixture.payment, bookingId: fixture.bookings.student, userId: fixture.users.student, txnRef: `PETXN${marker.replaceAll("-", "")}`, amount: 125000, provider: "unselected", status: "pending", description: "Private payment" } });
  await isolated.notification.createMany({ data: [
    { id: fixture.notifications.student, userId: fixture.users.student, title: "Student private notification", message: "Student only", sentAt: now },
    { id: fixture.notifications.other, userId: fixture.users.otherStudent, title: "Other private notification", message: "Other only", sentAt: now }
  ] });
}

test("Phase E privacy and identity governance", { timeout: 180000 }, async (t) => {
  await seed();
  const names = ["admin", "staff", "foreignStaff", "unassignedStaff", "student", "otherStudent", "lecturer", "temporary"];
  const tokens = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await login(name)])));

  await t.test("resource history applies role and laboratory projections", async () => {
    const student = await request(app).get(`/api/resources/${fixture.resources.assigned}/history`).set(bearer(tokens.student));
    assert.equal(student.status, 200);
    assert.equal(student.body.projection, "SAFE_OPERATIONAL_TIMELINE");
    assert.equal(student.body.timeline.some((event) => event.reference?.bookingId === fixture.bookings.student), true);
    assert.equal(student.body.timeline.some((event) => event.reference?.bookingId === fixture.bookings.lecturer), false);
    const studentJson = JSON.stringify(student.body);
    for (const forbidden of [fixture.users.staff, fixture.users.otherStudent, fixture.incident, "Internal operational reason", "Internal maintenance title", "privateKey", "secret-value", "Private reporter incident"]) {
      assert.equal(studentJson.includes(forbidden), false, forbidden);
    }
    assert.equal(student.body.timeline.every((event) => event.actor === null), true);

    const lecturer = await request(app).get(`/api/resources/${fixture.resources.assigned}/history`).set(bearer(tokens.lecturer));
    assert.equal(lecturer.status, 200);
    assert.equal(lecturer.body.timeline.some((event) => event.reference?.bookingId === fixture.bookings.lecturer), true);
    assert.equal(lecturer.body.timeline.some((event) => event.reference?.bookingId === fixture.bookings.student), false);

    const assigned = await request(app).get(`/api/resources/${fixture.resources.assigned}/history`).set(bearer(tokens.staff));
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.projection, "FULL_OPERATIONAL_PROVENANCE");
    assert.equal(JSON.stringify(assigned.body).includes("Internal operational reason"), true);
    assert.equal(JSON.stringify(assigned.body).includes("Private reporter incident"), true);

    for (const name of ["foreignStaff", "unassignedStaff"]) {
      assert.equal((await request(app).get(`/api/resources/${fixture.resources.assigned}/history`).set(bearer(tokens[name]))).status, 403);
    }
    const admin = await request(app).get(`/api/resources/${fixture.resources.assigned}/history`).set(bearer(tokens.admin));
    assert.equal(admin.status, 200);
    assert.equal(admin.body.projection, "FULL_OPERATIONAL_PROVENANCE");
    assert.equal(JSON.stringify(admin.body).includes("secret-value"), true);
  });

  await t.test("customer type remains an unverified declaration without authority", async () => {
    for (const customerType of ["INTERNAL", "EXTERNAL"]) {
      const registered = await request(app).post("/api/auth/register").send({
        email: `declared-${customerType.toLowerCase()}-${marker}@example.test`, password, fullName: `Declared ${customerType}`, customerType
      });
      assert.equal(registered.status, 201, JSON.stringify(registered.body));
      assert.equal(registered.body.user.role, "STUDENT");
      assert.equal(registered.body.user.customerType, customerType);
      assert.equal(registered.body.user.customerTypeSemantics, "SELF_DECLARED_UNVERIFIED");
      assert.equal((await request(app).get("/api/users").set(bearer(registered.body.accessToken))).status, 403);
      assert.equal((await request(app).post("/api/resources").set(bearer(registered.body.accessToken)).send({})).status, 403);
    }
    assert.equal((await request(app).post("/api/auth/register").send({ email: `bad-${marker}@example.test`, password, fullName: "Bad Type", customerType: "PARTNER" })).status, 400);
    const protectedPatch = await request(app).patch("/api/users/me").set(bearer(tokens.student)).send({ role: "ADMIN", isActive: false, customerType: "EXTERNAL" });
    assert.equal(protectedPatch.status, 400);
    const unchanged = await isolated.user.findUnique({ where: { id: fixture.users.student } });
    assert.equal(unchanged.role, "STUDENT");
    assert.equal(unchanged.isActive, true);
    assert.equal(unchanged.customerType, "INTERNAL");
    const declaration = await request(app).patch("/api/users/me").set(bearer(tokens.student)).send({ customerType: "EXTERNAL" });
    assert.equal(declaration.status, 200);
    assert.equal(declaration.body.customerTypeSemantics, "SELF_DECLARED_UNVERIFIED");
    assert.equal((await isolated.user.findUnique({ where: { id: fixture.users.student } })).role, "STUDENT");
  });

  await t.test("temporary credential session fails closed until password change", async () => {
    assert.equal((await request(app).get("/api/payments/my").set(bearer(tokens.temporary))).status, 403);
    assert.equal((await request(app).post("/api/bookings").set(bearer(tokens.temporary)).send({})).status, 403);
    assert.equal((await request(app).post("/api/auth/logout").set(bearer(tokens.temporary))).status, 204);
    const changed = await request(app).post("/api/auth/change-password").set(bearer(tokens.temporary)).send({ currentPassword: password, newPassword });
    assert.equal(changed.status, 204);
    assert.equal((await request(app).post("/api/auth/login").send({ email: `temporary-${marker}@example.test`.toLowerCase(), password })).status, 401);
    const newToken = await login("temporary", newPassword);
    assert.equal((await request(app).get("/api/payments/my").set(bearer(newToken))).status, 200);
  });

  await t.test("payment, incident and notification records remain owner or lab scoped", async () => {
    assert.equal((await request(app).get(`/api/payments/${fixture.payment}`).set(bearer(tokens.otherStudent))).status, 404);
    assert.equal((await request(app).get(`/api/payments/${fixture.payment}/receipt`).set(bearer(tokens.otherStudent))).status, 404);
    assert.equal((await request(app).get(`/api/incidents/${fixture.incident}`).set(bearer(tokens.student))).status, 404);
    assert.equal((await request(app).get(`/api/incidents/${fixture.incident}`).set(bearer(tokens.foreignStaff))).status, 404);
    assert.equal((await request(app).get(`/api/incidents/${fixture.incident}`).set(bearer(tokens.staff))).status, 200);
    const notifications = await request(app).get("/api/notifications").set(bearer(tokens.student));
    assert.equal(notifications.status, 200);
    assert.deepEqual(notifications.body.map((row) => row.id), [fixture.notifications.student]);
    assert.equal((await request(app).post(`/api/notifications/${fixture.notifications.other}/read`).set(bearer(tokens.student))).status, 404);
  });

  await isolated.$disconnect();
  await prisma.$disconnect();
});
