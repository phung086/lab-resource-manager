import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import { parse } from "dotenv";
import request from "supertest";

assert.equal(process.env.BATCH1E_DEVELOPMENT_DB, "lab_resources");
assert.equal(process.env.BATCH1E_ALLOW_DEVELOPMENT, "verified-backup-present");
const backend = fileURLToPath(new URL("../../", import.meta.url));
const env = parse(await readFile(path.join(backend, ".env")));
const databaseUrl = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname));
assert.equal(databaseUrl.pathname, "/lab_resources");
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = databaseUrl.toString();
process.env.JWT_SECRET = "batch1e-postcutover-secret-at-least-32-characters";

const [{ createApp }, { prisma }] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/db.js")
]);
const app = createApp();
const uuid = () => crypto.randomUUID();
const marker = uuid();
const ids = {
  campus: uuid(), building: uuid(), lab: uuid(), otherLab: uuid(),
  admin: uuid(), staff: uuid(), student: uuid(), resource: uuid(), otherResource: uuid()
};
const password = "Batch1e!Smoke";
const at = (hour) => new Date(Date.UTC(2039, 0, 10, hour)).toISOString();

test("Batch 1E-R development post-cutover smoke", { timeout: 60000 }, async () => {
  try {
    const [identity] = await prisma.$queryRaw`SELECT current_database() AS database`;
    assert.equal(identity.database, "lab_resources");
    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.campus.create({ data: { id: ids.campus, name: "B1E Smoke Campus", code: `B1ES-C-${marker}` } });
    await prisma.building.create({ data: { id: ids.building, campusId: ids.campus, name: "B1E Smoke Building", code: `B1ES-B-${marker}` } });
    await prisma.laboratory.createMany({ data: [
      { id: ids.lab, buildingId: ids.building, name: "B1E Smoke Lab", code: `B1ES-L1-${marker}` },
      { id: ids.otherLab, buildingId: ids.building, name: "B1E Smoke Other Lab", code: `B1ES-L2-${marker}` }
    ] });
    await prisma.user.createMany({ data: [
      { id: ids.admin, email: `b1e-admin-${marker}@example.test`, fullName: "B1E Admin", role: "ADMIN", passwordHash },
      { id: ids.staff, email: `b1e-staff-${marker}@example.test`, fullName: "B1E Staff", role: "LAB_STAFF", passwordHash },
      { id: ids.student, email: `b1e-student-${marker}@example.test`, fullName: "B1E Student", role: "STUDENT", passwordHash }
    ] });
    await prisma.userLabAssignment.create({ data: { userId: ids.staff, laboratoryId: ids.lab } });
    await prisma.resource.createMany({ data: [
      { id: ids.resource, laboratoryId: ids.lab, code: `B1ES-R1-${marker}`, name: "B1E Smoke Resource", subtype: "OTHER", category: "EQUIPMENT", location: "TEST_ONLY", requiresApproval: true },
      { id: ids.otherResource, laboratoryId: ids.otherLab, code: `B1ES-R2-${marker}`, name: "B1E Smoke Other Resource", subtype: "OTHER", category: "EQUIPMENT", location: "TEST_ONLY" }
    ] });

    assert.equal((await request(app).get("/health")).status, 200);
    assert.equal((await request(app).get("/health/ready")).status, 200);
    const studentLogin = await request(app).post("/api/auth/login").send({ email: `b1e-student-${marker}@example.test`, password });
    const staffLogin = await request(app).post("/api/auth/login").send({ email: `b1e-staff-${marker}@example.test`, password });
    assert.equal(studentLogin.status, 200);
    assert.equal(staffLogin.status, 200);
    const studentAuth = { Authorization: `Bearer ${studentLogin.body.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${staffLogin.body.accessToken}` };
    assert.equal((await request(app).get("/api/auth/me").set(studentAuth)).body.id, ids.student);
    assert.equal((await request(app).get(`/api/resources/${ids.resource}`)).status, 200);

    const bookingPayload = {
      resourceId: ids.resource,
      title: "B1E smoke booking",
      purpose: "Post-cutover verification",
      startAt: at(10),
      endAt: at(11)
    };
    const created = await request(app).post("/api/bookings").set(studentAuth).send(bookingPayload);
    assert.equal(created.status, 201);
    assert.equal(created.body.status, "PENDING_APPROVAL");
    const listed = await request(app).get("/api/bookings/my-bookings").set(studentAuth);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((booking) => booking.id === created.body.id));
    const conflict = await request(app).post("/api/bookings").set(studentAuth).send({ ...bookingPayload, title: "Overlap" });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, "BOOKING_CONFLICT");

    const approved = await request(app).post(`/api/bookings/${created.body.id}/approve`).set(staffAuth).send({ reason: "Smoke approval" });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, "CONFIRMED");
    const invalid = await request(app).post(`/api/bookings/${created.body.id}/approve`).set(staffAuth).send({});
    assert.equal(invalid.status, 409);
    assert.equal(invalid.body.error.code, "BOOKING_INVALID_TRANSITION");

    const scoped = await request(app).patch(`/api/resources/${ids.resource}/operational-status`).set(staffAuth).send({ operationalStatus: "AVAILABLE" });
    assert.equal(scoped.status, 200);
    const denied = await request(app).patch(`/api/resources/${ids.otherResource}/operational-status`).set(staffAuth).send({ operationalStatus: "MAINTENANCE", reason: "Foreign lab smoke" });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, "FORBIDDEN");
  } finally {
    const resourceIds = [ids.resource, ids.otherResource];
    const userIds = [ids.admin, ids.staff, ids.student];
    await prisma.usageLog.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
    await prisma.resourceStatusHistory.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
    await prisma.userLabAssignment.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    await prisma.laboratory.deleteMany({ where: { id: { in: [ids.lab, ids.otherLab] } } }).catch(() => {});
    await prisma.building.deleteMany({ where: { id: ids.building } }).catch(() => {});
    await prisma.campus.deleteMany({ where: { id: ids.campus } }).catch(() => {});
    await prisma.$disconnect();
  }
});
