import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

import {
  assertBatch1EDatabase,
  assertBatch1EIdentity,
  configureBatch1ETestEnvironment,
  hasSqlState,
  isolatedClient
} from "../helpers/batch1eDatabase.js";

const database = assertBatch1EDatabase(process.env.BATCH1E_DATABASE || "");
const databaseUrl = await configureBatch1ETestEnvironment(database);
const [{ createApp }, { prisma }, { getResourceAvailability }] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/db.js"),
  import("../../src/services/availabilityService.js")
]);

const app = createApp();
const password = "Batch1e!Pass";
const token = crypto.randomUUID();
const id = () => crypto.randomUUID();
const at = (day, hour, minute = 0) => new Date(Date.UTC(2038, 0, day, hour, minute));

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), other: id() },
  users: {
    admin: id(), staff: id(), unassignedStaff: id(), lecturer: id(), student: id(), inactive: id()
  },
  resources: Object.fromEntries([
    "approval", "immediate", "otherLab", "conflictApi", "conflictDb", "bookingFirst",
    "maintenanceFirst", "nonOverlap", "differentA", "differentB", "authority", "availability"
  ].map((name) => [name, id()]))
};

const userRows = [
  [fixture.users.admin, "admin", "ADMIN", true],
  [fixture.users.staff, "staff", "LAB_STAFF", true],
  [fixture.users.unassignedStaff, "staff-unassigned", "LAB_STAFF", true],
  [fixture.users.lecturer, "lecturer", "LECTURER", true],
  [fixture.users.student, "student", "STUDENT", true],
  [fixture.users.inactive, "inactive", "STUDENT", false]
];

async function seed() {
  await assertBatch1EIdentity(prisma, database);
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.campus.create({ data: { id: fixture.campus, name: "Batch 1E Campus", code: `B1EC-${token}` } });
  await prisma.building.create({ data: { id: fixture.building, campusId: fixture.campus, name: "Batch 1E Building", code: `B1EB-${token}` } });
  await prisma.laboratory.createMany({ data: [
    { id: fixture.labs.assigned, buildingId: fixture.building, name: "Assigned Lab", code: `B1ELA-${token}` },
    { id: fixture.labs.other, buildingId: fixture.building, name: "Other Lab", code: `B1ELO-${token}` }
  ] });
  await prisma.user.createMany({ data: userRows.map(([userId, prefix, role, isActive]) => ({
    id: userId,
    email: `${prefix}-${token}@example.test`,
    fullName: `Batch 1E ${prefix}`,
    role,
    passwordHash,
    isActive
  })) });
  await prisma.userLabAssignment.create({ data: { userId: fixture.users.staff, laboratoryId: fixture.labs.assigned } });

  const resourceEntries = Object.entries(fixture.resources);
  await prisma.resource.createMany({ data: resourceEntries.map(([name, resourceId], index) => ({
    id: resourceId,
    laboratoryId: name === "otherLab" ? fixture.labs.other : fixture.labs.assigned,
    code: `B1ER-${index}-${token}`,
    name: `Batch 1E ${name}`,
    subtype: "OTHER",
    category: "EQUIPMENT",
    location: "TEST_ONLY",
    operationalStatus: "AVAILABLE",
    status: "available",
    requiresApproval: name === "approval"
  })) });
}

async function cleanup() {
  const resourceIds = Object.values(fixture.resources);
  const userIds = Object.values(fixture.users);
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.usageLog.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  await prisma.resourceStatusHistory.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  await prisma.maintenanceWindow.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  await prisma.booking.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  await prisma.userLabAssignment.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  await prisma.laboratory.deleteMany({ where: { id: { in: Object.values(fixture.labs) } } }).catch(() => {});
  await prisma.building.deleteMany({ where: { id: fixture.building } }).catch(() => {});
  await prisma.campus.deleteMany({ where: { id: fixture.campus } }).catch(() => {});
}

async function login(userKey, suppliedPassword = password) {
  const prefix = userRows.find(([userId]) => userId === fixture.users[userKey])[1];
  return request(app).post("/api/auth/login").send({
    email: `${prefix}-${token}@example.test`,
    password: suppliedPassword
  });
}

function bearer(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function createBooking(accessToken, resourceId, day, startHour = 10, endHour = 11, title = "Batch 1E booking") {
  return request(app).post("/api/bookings").set(bearer(accessToken)).send({
    resourceId,
    title,
    purpose: "Batch 1E isolated integration verification",
    startAt: at(day, startHour).toISOString(),
    endAt: at(day, endHour).toISOString()
  });
}

function maintenanceBody(resourceId, day, startHour = 10, endHour = 11, title = "Batch 1E maintenance") {
  return {
    resourceId,
    kind: "maintenance",
    status: "scheduled",
    title,
    startAt: at(day, startHour).toISOString(),
    endAt: at(day, endHour).toISOString()
  };
}

test("Batch 1E-L2 isolated canonical runtime", { timeout: 180000 }, async (t) => {
  await seed();
  const adminLogin = await login("admin");
  const staffLogin = await login("staff");
  const unassignedStaffLogin = await login("unassignedStaff");
  const lecturerLogin = await login("lecturer");
  const studentLogin = await login("student");
  const tokens = {
    admin: adminLogin.body.accessToken,
    staff: staffLogin.body.accessToken,
    unassignedStaff: unassignedStaffLogin.body.accessToken,
    lecturer: lecturerLogin.body.accessToken,
    student: studentLogin.body.accessToken
  };

  try {
    await t.test("1. real database-backed authentication", async () => {
      assert.equal(studentLogin.status, 200);
      assert.equal(studentLogin.body.user.id, fixture.users.student);
      assert.equal((await login("student", "Wrong!Pass")).status, 401);
      const inactive = await login("inactive");
      assert.equal(inactive.status, 401);
      assert.equal(inactive.body.error.code, "ACCOUNT_INACTIVE");

      const forged = jwt.sign({ sub: fixture.users.student, role: "STUDENT" }, "wrong-secret");
      const forgedResponse = await request(app).get("/api/auth/me").set(bearer(forged));
      assert.equal(forgedResponse.status, 401);
      const expired = jwt.sign({ sub: fixture.users.student, role: "STUDENT" }, process.env.JWT_SECRET, { expiresIn: -1 });
      const expiredResponse = await request(app).get("/api/auth/me").set(bearer(expired));
      assert.equal(expiredResponse.status, 401);

      const me = await request(app).get("/api/auth/me").set(bearer(tokens.student));
      assert.equal(me.status, 200);
      assert.equal(me.body.id, fixture.users.student);
      assert.equal(me.body.role, "STUDENT");
    });

    await t.test("2. real RBAC and lab scope", async () => {
      assert.equal((await request(app).get("/api/users").set(bearer(tokens.admin))).status, 200);
      assert.equal((await request(app).get("/api/users").set(bearer(tokens.lecturer))).status, 403);
      assert.equal((await request(app).get("/api/users").set(bearer(tokens.student))).status, 403);

      const assigned = await request(app).patch(`/api/resources/${fixture.resources.approval}/operational-status`)
        .set(bearer(tokens.staff)).send({ operationalStatus: "MAINTENANCE", reason: "Runtime scope verification" });
      assert.equal(assigned.status, 200);
      const restored = await request(app).patch(`/api/resources/${fixture.resources.approval}/operational-status`)
        .set(bearer(tokens.staff)).send({ operationalStatus: "AVAILABLE" });
      assert.equal(restored.status, 200);

      const otherLab = await request(app).patch(`/api/resources/${fixture.resources.otherLab}/operational-status`)
        .set(bearer(tokens.staff)).send({ operationalStatus: "MAINTENANCE", reason: "Foreign lab attempt" });
      assert.equal(otherLab.status, 403);
      assert.equal(otherLab.body.error.code, "FORBIDDEN");
      const unassigned = await request(app).patch(`/api/resources/${fixture.resources.approval}/operational-status`)
        .set(bearer(tokens.unassignedStaff)).send({ operationalStatus: "MAINTENANCE", reason: "Unassigned staff attempt" });
      assert.equal(unassigned.status, 403);

      const lecturerDenied = await request(app).post("/api/maintenance").set(bearer(tokens.lecturer))
        .send(maintenanceBody(fixture.resources.approval, 2));
      const studentDenied = await request(app).post("/api/maintenance").set(bearer(tokens.student))
        .send(maintenanceBody(fixture.resources.approval, 2));
      assert.equal(lecturerDenied.status, 403);
      assert.equal(studentDenied.status, 403);
    });

    let pendingBooking;
    let confirmedBooking;
    await t.test("3. real booking creation and atomic audit", async () => {
      const pending = await createBooking(tokens.student, fixture.resources.approval, 3, 10, 11, "Approval booking");
      const confirmed = await createBooking(tokens.lecturer, fixture.resources.immediate, 3, 12, 13, "Immediate booking");
      assert.equal(pending.status, 201);
      assert.equal(confirmed.status, 201);
      assert.equal(pending.body.status, "PENDING_APPROVAL");
      assert.equal(confirmed.body.status, "CONFIRMED");
      pendingBooking = pending.body;
      confirmedBooking = confirmed.body;

      const persisted = await prisma.booking.findMany({ where: { id: { in: [pending.body.id, confirmed.body.id] } } });
      assert.equal(persisted.length, 2);
      assert.equal(persisted.find((row) => row.id === pending.body.id).requestedById, fixture.users.student);
      assert.equal(persisted.find((row) => row.id === pending.body.id).purpose, "Batch 1E isolated integration verification");
      assert.equal(await prisma.usageLog.count({ where: { bookingId: { in: [pending.body.id, confirmed.body.id] }, action: "REQUEST" } }), 2);
      assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: { in: [pending.body.id, confirmed.body.id] } } }), 0);
    });

    await t.test("4. canonical booking state machine persists evidence", async () => {
      const approve = await request(app).post(`/api/bookings/${pendingBooking.id}/approve`).set(bearer(tokens.staff)).send({ reason: "Approved for test" });
      assert.equal(approve.status, 200);
      assert.equal(approve.body.status, "CONFIRMED");
      const checkout = await request(app).post(`/api/bookings/${pendingBooking.id}/check-out`).set(bearer(tokens.staff))
        .send({ reason: "Handover", conditionBefore: "Good before use" });
      assert.equal(checkout.status, 200);
      const returned = await request(app).post(`/api/bookings/${pendingBooking.id}/return`).set(bearer(tokens.staff))
        .send({ reason: "Returned", conditionAfter: "Good after use" });
      assert.equal(returned.status, 200);
      const completed = await request(app).post(`/api/bookings/${pendingBooking.id}/complete`).set(bearer(tokens.staff)).send({ reason: "Closed" });
      assert.equal(completed.status, 200);
      assert.equal(completed.body.status, "COMPLETED");

      const rejectionSource = await createBooking(tokens.student, fixture.resources.approval, 4, 10, 11, "Reject booking");
      const rejected = await request(app).post(`/api/bookings/${rejectionSource.body.id}/reject`).set(bearer(tokens.staff)).send({ reason: "Policy" });
      assert.equal(rejected.status, 200);
      assert.equal(rejected.body.status, "REJECTED");
      const cancelled = await request(app).post(`/api/bookings/${confirmedBooking.id}/cancel`).set(bearer(tokens.lecturer)).send({ reason: "No longer needed" });
      assert.equal(cancelled.status, 200);
      assert.equal(cancelled.body.status, "CANCELLED");

      assert.equal((await request(app).post(`/api/bookings/${pendingBooking.id}/approve`).set(bearer(tokens.staff)).send({})).body.error.code, "BOOKING_INVALID_TRANSITION");
      assert.equal((await request(app).post(`/api/bookings/${rejectionSource.body.id}/check-out`).set(bearer(tokens.staff)).send({})).body.error.code, "BOOKING_INVALID_TRANSITION");
      assert.equal((await request(app).post(`/api/bookings/${confirmedBooking.id}/return`).set(bearer(tokens.staff)).send({})).body.error.code, "BOOKING_INVALID_TRANSITION");

      const row = await prisma.booking.findUnique({ where: { id: pendingBooking.id } });
      assert.ok(row.approvedAt && row.actualStartAt && row.returnedAt && row.completedAt);
      assert.equal(row.handoverCondition, "Good before use");
      assert.equal(row.returnCondition, "Good after use");
      const logs = await prisma.usageLog.findMany({ where: { bookingId: pendingBooking.id }, orderBy: { createdAt: "asc" } });
      // Batch 5 adds real physical resource status audit rows during handover
      // and return. Preserve the original booking-transition invariant while
      // allowing those attributable STATUS_CHANGE rows to coexist.
      assert.deepEqual(
        logs.filter((log) => log.action !== "STATUS_CHANGE").map((log) => log.action),
        ["REQUEST", "APPROVE", "CHECK_OUT", "RETURN", "COMPLETE"]
      );
      assert.equal(logs.filter((log) => log.action === "STATUS_CHANGE").length, 2);
      assert.ok(logs.every((log) => log.userId));
    });

    await t.test("5. booking conflict maps to HTTP 409 and PostgreSQL 23P01", async () => {
      const responses = await Promise.all([
        createBooking(tokens.student, fixture.resources.conflictApi, 5, 10, 11, "Conflict A"),
        createBooking(tokens.lecturer, fixture.resources.conflictApi, 5, 10, 11, "Conflict B")
      ]);
      assert.equal(responses.filter((response) => response.status === 201).length, 1);
      const conflict = responses.find((response) => response.status === 409);
      assert.ok(conflict);
      assert.equal(conflict.body.error.code, "BOOKING_CONFLICT");

      const clientA = isolatedClient(databaseUrl);
      const clientB = isolatedClient(databaseUrl);
      let release;
      let inserted;
      const insertedPromise = new Promise((resolve) => { inserted = resolve; });
      const hold = new Promise((resolve) => { release = resolve; });
      try {
        const first = clientA.$transaction(async (tx) => {
          await tx.booking.create({ data: {
            id: id(), resourceId: fixture.resources.conflictDb, requestedById: fixture.users.student,
            title: "23P01 leader", purpose: "TEST_ONLY", status: "CONFIRMED", startAt: at(6, 10), endAt: at(6, 11)
          } });
          inserted();
          await hold;
        });
        await insertedPromise;
        const second = clientB.booking.create({ data: {
          id: id(), resourceId: fixture.resources.conflictDb, requestedById: fixture.users.lecturer,
          title: "23P01 follower", purpose: "TEST_ONLY", status: "CONFIRMED", startAt: at(6, 10, 30), endAt: at(6, 11, 30)
        } });
        await new Promise((resolve) => setTimeout(resolve, 150));
        release();
        const settled = await Promise.allSettled([first, second]);
        assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
        assert.ok(hasSqlState(settled.find((item) => item.status === "rejected").reason, "23P01"));
      } finally {
        await Promise.all([clientA.$disconnect(), clientB.$disconnect()]);
      }
    });

    await t.test("6. booking and maintenance concurrency rules", async () => {
      const bookingFirst = await createBooking(tokens.student, fixture.resources.bookingFirst, 7);
      assert.equal(bookingFirst.status, 201);
      const blockedMaintenance = await request(app).post("/api/maintenance").set(bearer(tokens.staff))
        .send(maintenanceBody(fixture.resources.bookingFirst, 7, 10, 11));
      assert.equal(blockedMaintenance.status, 409);

      const maintenanceFirst = await request(app).post("/api/maintenance").set(bearer(tokens.staff))
        .send(maintenanceBody(fixture.resources.maintenanceFirst, 8, 10, 11));
      assert.equal(maintenanceFirst.status, 201);
      const blockedBooking = await createBooking(tokens.student, fixture.resources.maintenanceFirst, 8);
      assert.equal(blockedBooking.status, 409);
      assert.equal(blockedBooking.body.error.code, "BOOKING_CONFLICT");

      const nonOverlap = await Promise.all([
        createBooking(tokens.student, fixture.resources.nonOverlap, 9, 10, 11),
        request(app).post("/api/maintenance").set(bearer(tokens.staff))
          .send(maintenanceBody(fixture.resources.nonOverlap, 9, 11, 12))
      ]);
      assert.ok(nonOverlap.every((response) => response.status === 201));

      const differentResources = await Promise.all([
        createBooking(tokens.student, fixture.resources.differentA, 10, 10, 11),
        request(app).post("/api/maintenance").set(bearer(tokens.staff))
          .send(maintenanceBody(fixture.resources.differentB, 10, 10, 11))
      ]);
      assert.ok(differentResources.every((response) => response.status === 201));
      const [isolation] = await prisma.$queryRaw`SHOW transaction_isolation`;
      assert.equal(isolation.transaction_isolation, "read committed");
    });

    await t.test("7. operationalStatus is authoritative and scheduling is derived", async () => {
      await prisma.resource.update({ where: { id: fixture.resources.authority }, data: { operationalStatus: "AVAILABLE", status: "maintenance" } });
      const legacyDoesNotBlock = await createBooking(tokens.student, fixture.resources.authority, 11, 10, 11);
      assert.equal(legacyDoesNotBlock.status, 201);

      await prisma.resource.update({ where: { id: fixture.resources.authority }, data: { operationalStatus: "MAINTENANCE", status: "available" } });
      const maintenanceBlocks = await createBooking(tokens.student, fixture.resources.authority, 12, 10, 11);
      assert.equal(maintenanceBlocks.status, 400);
      assert.equal(maintenanceBlocks.body.error.code, "RESOURCE_UNAVAILABLE");
      await prisma.resource.update({ where: { id: fixture.resources.authority }, data: { operationalStatus: "OFFLINE" } });
      assert.equal((await createBooking(tokens.student, fixture.resources.authority, 13, 10, 11)).body.error.code, "RESOURCE_UNAVAILABLE");

      const resource = await prisma.resource.findUnique({ where: { id: fixture.resources.availability } });
      const initiallyAvailable = await getResourceAvailability(prisma, { resourceId: resource.id, resource, startAt: at(14, 10), endAt: at(14, 11) });
      assert.equal(initiallyAvailable.available, true);
      await createBooking(tokens.student, resource.id, 14, 10, 11);
      const bookingDerived = await getResourceAvailability(prisma, { resourceId: resource.id, startAt: at(14, 10), endAt: at(14, 11) });
      assert.equal(bookingDerived.available, false);
      assert.equal(bookingDerived.conflicts[0].type, "EQUIPMENT_CONFLICT");
      await request(app).post("/api/maintenance").set(bearer(tokens.staff)).send(maintenanceBody(resource.id, 15, 10, 11));
      const maintenanceDerived = await getResourceAvailability(prisma, { resourceId: resource.id, startAt: at(15, 10), endAt: at(15, 11) });
      assert.equal(maintenanceDerived.available, false);
      assert.equal(maintenanceDerived.conflicts[0].type, "MAINTENANCE_CONFLICT");

      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()));
      monday.setHours(10, 0, 0, 0);
      await prisma.maintenanceWindow.create({ data: {
        id: id(),
        resourceId: resource.id,
        createdById: fixture.users.staff,
        title: "Calendar maintenance truth",
        startAt: monday,
        endAt: new Date(monday.getTime() + 60 * 60 * 1000)
      } });
      const calendar = await request(app).get(`/api/calendar/slots?resource_id=${resource.id}`);
      assert.equal(calendar.status, 200);
      assert.equal(calendar.body.grid.find((row) => row.hour === 10).days[0].status, "maintenance");
    });

    await t.test("8. notifications are persisted and user-scoped", async () => {
      const ownId = id();
      const otherId = id();
      await prisma.notification.createMany({ data: [
        { id: ownId, userId: fixture.users.student, type: "BOOKING_APPROVED", title: "Approved", message: "Your booking was approved", severity: "success" },
        { id: otherId, userId: fixture.users.lecturer, type: "RETURN_REMINDER", title: "Return", message: "Return reminder", severity: "warning" }
      ] });
      const list = await request(app).get("/api/notifications").set(bearer(tokens.student));
      assert.equal(list.status, 200);
      // Earlier lifecycle subtests may now persist legitimate Batch 5
      // approval/rejection notifications for this same owner. Keep the Batch
      // 1E assertion focused on its original security invariant: own
      // notifications are visible and another user's notification is not.
      assert.equal(list.body.some((item) => item.id === ownId), true);
      assert.equal(list.body.some((item) => item.id === otherId), false);
      const visibleRows = await prisma.notification.findMany({
        where: { id: { in: list.body.map((item) => item.id) } },
        select: { userId: true }
      });
      assert.ok(visibleRows.every((item) => item.userId === fixture.users.student));
      const read = await request(app).post(`/api/notifications/${ownId}/read`).set(bearer(tokens.student));
      assert.equal(read.status, 200);
      assert.ok((await prisma.notification.findUnique({ where: { id: ownId } })).readAt);
      const cannotReadOther = await request(app).post(`/api/notifications/${otherId}/read`).set(bearer(tokens.student));
      assert.equal(cannotReadOther.status, 404);
    });

    await t.test("9. readiness executes a real PostgreSQL probe", async () => {
      const ready = await request(app).get("/health/ready");
      assert.equal(ready.status, 200);
      assert.equal(ready.body.database, "ready");
    });

    await t.test("10. runtime uses only the isolated canonical database", async () => {
      const [identity] = await prisma.$queryRaw`SELECT current_database() AS database`;
      assert.equal(identity.database, database);
      assert.notEqual(identity.database, "lab_resources");
    });
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
});
