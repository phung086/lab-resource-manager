import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import {
  assertBatch5Database,
  configureBatch5TestEnvironment,
  isolatedBatch5Client
} from "./helpers/batch5Database.js";

const database = assertBatch5Database(process.env.BATCH5_DATABASE || "");
const databaseUrl = await configureBatch5TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js")
]);

const app = createApp();
const isolated = isolatedBatch5Client(databaseUrl);
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const password = "Batch5!Pass";
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), foreign: id() },
  users: {
    admin: id(),
    staff: id(),
    foreignStaff: id(),
    lecturer: id(),
    studentA: id(),
    studentB: id()
  },
  resources: { assigned: id(), foreign: id(), immediate: id() }
};

function futureWindow(days = 2, hour = 10, durationMinutes = 60) {
  const start = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

async function seed() {
  const identity = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity[0].database, database);
  assert.match(identity[0].version, /^16\./);

  const passwordHash = await bcrypt.hash(password, 4);
  await isolated.campus.create({ data: { id: fixture.campus, code: `B5C-${marker}`, name: "Batch 5 Campus" } });
  await isolated.building.create({ data: { id: fixture.building, campusId: fixture.campus, code: `B5B-${marker}`, name: "Batch 5 Building" } });

  for (const [laboratoryId, code, name] of [
    [fixture.labs.assigned, `B5LA-${marker}`, "Assigned Operations Lab"],
    [fixture.labs.foreign, `B5LF-${marker}`, "Foreign Operations Lab"]
  ]) {
    await isolated.laboratory.create({
      data: {
        id: laboratoryId,
        buildingId: fixture.building,
        code,
        name,
        labPolicy: {
          create: {
            id: id(),
            minBookingMinutes: 15,
            maxBookingMinutes: 480,
            maxAdvanceBookingDays: 3650,
            allowWeekend: true,
            workDayStartHour: 0,
            workDayEndHour: 23,
            requiresApproval: false
          }
        }
      }
    });
  }

  const users = [
    ["admin", "ADMIN"],
    ["staff", "LAB_STAFF"],
    ["foreignStaff", "LAB_STAFF"],
    ["lecturer", "LECTURER"],
    ["studentA", "STUDENT"],
    ["studentB", "STUDENT"]
  ];
  await isolated.user.createMany({
    data: users.map(([key, role]) => ({
      id: fixture.users[key],
      email: `${key.toLowerCase()}-${marker}@example.test`,
      fullName: `Batch 5 ${key}`,
      role,
      passwordHash,
      isActive: true
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
      {
        id: fixture.resources.assigned,
        laboratoryId: fixture.labs.assigned,
        code: `B5-APP-${marker}`,
        name: "Approval Required Equipment",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "A-501",
        operationalStatus: "AVAILABLE",
        requiresApproval: true
      },
      {
        id: fixture.resources.foreign,
        laboratoryId: fixture.labs.foreign,
        code: `B5-FGN-${marker}`,
        name: "Foreign Lab Equipment",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "B-501",
        operationalStatus: "AVAILABLE",
        requiresApproval: true
      },
      {
        id: fixture.resources.immediate,
        laboratoryId: fixture.labs.assigned,
        code: `B5-IMM-${marker}`,
        name: "Immediate Equipment",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "A-502",
        operationalStatus: "AVAILABLE",
        requiresApproval: false
      }
    ]
  });
}

async function login(key) {
  const response = await request(app).post("/api/auth/login").send({
    email: `${key.toLowerCase()}-${marker}@example.test`,
    password
  });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

async function createBooking(token, resourceId, days = 2, title = `Batch 5 ${crypto.randomUUID()}`) {
  const { start, end } = futureWindow(days);
  return request(app).post("/api/bookings").set(bearer(token)).send({
    resourceId,
    title,
    purpose: "Batch 5 operational workflow verification",
    startAt: start.toISOString(),
    endAt: end.toISOString()
  });
}

async function createPending(tokens, days) {
  const response = await createBooking(tokens.studentA, fixture.resources.assigned, days);
  assert.equal(response.status, 201);
  assert.equal(response.body.status, "PENDING_APPROVAL");
  return response.body;
}

async function approve(tokens, bookingId, actor = "staff") {
  return request(app)
    .post(`/api/bookings/${bookingId}/approve`)
    .set(bearer(tokens[actor]))
    .send({ reason: "Operational approval verified" });
}

async function resetAssignedResource() {
  await isolated.resource.update({
    where: { id: fixture.resources.assigned },
    data: { operationalStatus: "AVAILABLE", status: "available" }
  });
}

test("Batch 5 canonical operational booking workflow", { timeout: 180000 }, async (t) => {
  await seed();
  const tokens = Object.fromEntries(await Promise.all(
    ["admin", "staff", "foreignStaff", "lecturer", "studentA", "studentB"]
      .map(async (key) => [key, await login(key)])
  ));

  await t.test("approval is scoped, auditable and notifies the owner", async () => {
    const booking = await createPending(tokens, 2);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/approve`).set(bearer(tokens.studentA)).send({})).status, 403);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/approve`).set(bearer(tokens.lecturer)).send({})).status, 403);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/approve`).set(bearer(tokens.foreignStaff)).send({})).status, 403);

    const approved = await approve(tokens, booking.id);
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, "CONFIRMED");
    assert.equal(approved.body.approvedById, fixture.users.staff);
    assert.ok(approved.body.approvedAt);

    const audit = await isolated.usageLog.findMany({ where: { bookingId: booking.id, action: "APPROVE" } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].userId, fixture.users.staff);
    assert.equal(audit[0].fromStatus, "PENDING_APPROVAL");
    assert.equal(audit[0].toStatus, "CONFIRMED");

    const notifications = await isolated.notification.findMany({ where: { userId: fixture.users.studentA, type: "BOOKING_APPROVED" } });
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].dedupeKey, `booking:${booking.id}:BOOKING_APPROVED`);

    const duplicate = await approve(tokens, booking.id);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "BOOKING_INVALID_TRANSITION");
  });

  await t.test("rejection requires a real reason, is terminal and notifies the owner", async () => {
    const booking = await createPending(tokens, 3);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/reject`).set(bearer(tokens.staff)).send({})).status, 400);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/reject`).set(bearer(tokens.staff)).send({ reason: "   " })).status, 400);

    const rejected = await request(app).post(`/api/bookings/${booking.id}/reject`).set(bearer(tokens.admin))
      .send({ reason: "Thiết bị được dành cho hiệu chuẩn bắt buộc" });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.status, "REJECTED");
    const audit = await isolated.usageLog.findMany({ where: { bookingId: booking.id, action: "REJECT" } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].reason, "Thiết bị được dành cho hiệu chuẩn bắt buộc");
    assert.equal(await isolated.notification.count({ where: { userId: fixture.users.studentA, type: "BOOKING_REJECTED" } }), 1);
    assert.equal((await approve(tokens, booking.id, "admin")).status, 409);
  });

  await t.test("handover requires condition-before and atomically marks the resource IN_USE", async () => {
    const booking = await createPending(tokens, 4);
    assert.equal((await approve(tokens, booking.id)).status, 200);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({})).status, 400);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({ conditionBefore: "   " })).status, 400);

    const checkedOut = await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({
      conditionBefore: "Thiết bị sạch, đầy đủ phụ kiện và không có hư hỏng quan sát được",
      reason: "Bàn giao trực tiếp tại phòng lab"
    });
    assert.equal(checkedOut.status, 200);
    assert.equal(checkedOut.body.status, "CHECKED_OUT");
    assert.ok(checkedOut.body.actualStartAt);
    assert.equal((await isolated.resource.findUnique({ where: { id: fixture.resources.assigned } })).operationalStatus, "IN_USE");
    assert.equal(await isolated.usageLog.count({ where: { bookingId: booking.id, action: "CHECK_OUT" } }), 1);
    assert.equal(await isolated.resourceStatusHistory.count({ where: { resourceId: fixture.resources.assigned, toStatus: "IN_USE" } }), 1);
    await resetAssignedResource();
  });

  await t.test("return requires condition-after, persists actual end, and restores IN_USE to AVAILABLE", async () => {
    const booking = await createPending(tokens, 5);
    await approve(tokens, booking.id);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff))
      .send({ conditionBefore: "Tình trạng trước sử dụng bình thường" })).status, 200);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/return`).set(bearer(tokens.staff)).send({})).status, 400);

    const returned = await request(app).post(`/api/bookings/${booking.id}/return`).set(bearer(tokens.staff))
      .send({ conditionAfter: "Thiết bị hoàn trả đầy đủ, hoạt động bình thường" });
    assert.equal(returned.status, 200);
    assert.equal(returned.body.status, "RETURNED");
    assert.ok(returned.body.returnedAt);
    assert.ok(returned.body.actualEndAt);
    assert.equal(returned.body.returnCondition, "Thiết bị hoàn trả đầy đủ, hoạt động bình thường");
    assert.equal((await isolated.resource.findUnique({ where: { id: fixture.resources.assigned } })).operationalStatus, "AVAILABLE");
    assert.equal(await isolated.usageLog.count({ where: { bookingId: booking.id, action: "RETURN" } }), 1);
  });

  await t.test("return never overwrites a more serious physical state", async () => {
    const booking = await createPending(tokens, 6);
    await approve(tokens, booking.id);
    await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({ conditionBefore: "Tình trạng đầu ca bình thường" });
    await isolated.resource.update({ where: { id: fixture.resources.assigned }, data: { operationalStatus: "BROKEN", status: "maintenance" } });

    const returned = await request(app).post(`/api/bookings/${booking.id}/return`).set(bearer(tokens.staff))
      .send({ conditionAfter: "Phát hiện bất thường sau ca; thiết bị đã được đánh dấu hỏng bởi vận hành" });
    assert.equal(returned.status, 200);
    assert.equal(returned.body.status, "RETURNED");
    assert.match(returned.body.physicalStateWarning, /BROKEN/);
    assert.equal((await isolated.resource.findUnique({ where: { id: fixture.resources.assigned } })).operationalStatus, "BROKEN");
    await resetAssignedResource();
  });

  await t.test("completion closes RETURNED without erasing evidence", async () => {
    const booking = await createPending(tokens, 7);
    await approve(tokens, booking.id);
    await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({ conditionBefore: "Biên bản trước sử dụng" });
    await request(app).post(`/api/bookings/${booking.id}/return`).set(bearer(tokens.staff)).send({ conditionAfter: "Biên bản sau sử dụng" });

    const completed = await request(app).post(`/api/bookings/${booking.id}/complete`).set(bearer(tokens.admin)).send({ reason: "Đã đối soát hồ sơ bàn giao" });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.status, "COMPLETED");
    assert.ok(completed.body.completedAt);
    assert.equal(completed.body.handoverCondition, "Biên bản trước sử dụng");
    assert.equal(completed.body.returnCondition, "Biên bản sau sử dụng");
    assert.ok(completed.body.actualStartAt);
    assert.ok(completed.body.actualEndAt);
    assert.equal((await request(app).post(`/api/bookings/${booking.id}/return`).set(bearer(tokens.admin)).send({ conditionAfter: "Không hợp lệ" })).status, 409);
  });

  await t.test("hard physical state blocks handover before booking state changes", async () => {
    const booking = await createPending(tokens, 8);
    await approve(tokens, booking.id);
    await isolated.resource.update({ where: { id: fixture.resources.assigned }, data: { operationalStatus: "MAINTENANCE", status: "maintenance" } });
    const response = await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({ conditionBefore: "Không được phép bàn giao" });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "RESOURCE_STATE_CONFLICT");
    assert.equal((await isolated.booking.findUnique({ where: { id: booking.id } })).status, "CONFIRMED");
    await resetAssignedResource();
  });

  await t.test("booking history is persisted, owner-scoped and lab-scoped", async () => {
    const booking = await createPending(tokens, 9);
    await approve(tokens, booking.id);
    await request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send({ conditionBefore: "History before" });

    const owner = await request(app).get(`/api/bookings/${booking.id}/history`).set(bearer(tokens.studentA));
    assert.equal(owner.status, 200);
    for (const action of ["REQUEST", "APPROVE", "CHECK_OUT"]) {
      assert.equal(owner.body.timeline.some((row) => row.action === action), true);
    }
    assert.equal((await request(app).get(`/api/bookings/${booking.id}/history`).set(bearer(tokens.studentB))).status, 404);
    assert.equal((await request(app).get(`/api/bookings/${booking.id}/history`).set(bearer(tokens.staff))).status, 200);
    assert.equal((await request(app).get(`/api/bookings/${booking.id}/history`).set(bearer(tokens.foreignStaff))).status, 403);
    assert.equal((await request(app).get(`/api/bookings/${booking.id}/history`).set(bearer(tokens.admin))).status, 200);
    await resetAssignedResource();
  });

  await t.test("concurrent approve versus reject commits exactly one transition", async () => {
    const booking = await createPending(tokens, 10);
    const [approved, rejected] = await Promise.all([
      request(app).post(`/api/bookings/${booking.id}/approve`).set(bearer(tokens.staff)).send({ reason: "Concurrent approval" }),
      request(app).post(`/api/bookings/${booking.id}/reject`).set(bearer(tokens.admin)).send({ reason: "Concurrent rejection" })
    ]);
    assert.deepEqual([approved.status, rejected.status].sort(), [200, 409]);
    assert.ok(["CONFIRMED", "REJECTED"].includes((await isolated.booking.findUnique({ where: { id: booking.id } })).status));
    assert.equal(await isolated.usageLog.count({ where: { bookingId: booking.id, action: { in: ["APPROVE", "REJECT"] } } }), 1);
  });

  await t.test("duplicate concurrent check-out creates one handover audit and one physical transition", async () => {
    const booking = await createPending(tokens, 11);
    await approve(tokens, booking.id);
    const payload = { conditionBefore: "Concurrent handover condition" };
    const [first, second] = await Promise.all([
      request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.staff)).send(payload),
      request(app).post(`/api/bookings/${booking.id}/check-out`).set(bearer(tokens.admin)).send(payload)
    ]);
    assert.deepEqual([first.status, second.status].sort(), [200, 409]);
    assert.equal(await isolated.usageLog.count({ where: { bookingId: booking.id, action: "CHECK_OUT" } }), 1);
    const statusRows = await isolated.resourceStatusHistory.findMany({ where: { resourceId: fixture.resources.assigned, toStatus: "IN_USE" } });
    assert.equal(statusRows.length >= 1, true);
    await resetAssignedResource();
  });

  await t.test("staff listing is assigned-lab scoped while admin is global", async () => {
    const foreign = await createBooking(tokens.studentB, fixture.resources.foreign, 12);
    assert.equal(foreign.status, 201);
    const staffList = await request(app).get("/api/bookings").set(bearer(tokens.staff));
    assert.equal(staffList.status, 200);
    assert.equal(staffList.body.some((row) => row.resourceId === fixture.resources.foreign), false);
    const adminList = await request(app).get("/api/bookings").set(bearer(tokens.admin));
    assert.equal(adminList.status, 200);
    assert.equal(adminList.body.some((row) => row.resourceId === fixture.resources.foreign), true);
  });

  await t.test("IN_USE blocks current availability but not future non-overlapping resource availability", async () => {
    await isolated.resource.update({ where: { id: fixture.resources.immediate }, data: { operationalStatus: "IN_USE", status: "in_use" } });
    const current = await request(app).get(`/api/resources/${fixture.resources.immediate}`);
    assert.equal(current.status, 200);
    assert.equal(current.body.availability.state, "IN_USE");

    const { start, end } = futureWindow(30);
    const future = await request(app).get(`/api/resources?availableFrom=${encodeURIComponent(start.toISOString())}&availableTo=${encodeURIComponent(end.toISOString())}&search=${encodeURIComponent(`B5-IMM-${marker}`)}`);
    assert.equal(future.status, 200);
    assert.equal(future.body[0].availability.state, "AVAILABLE");
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
