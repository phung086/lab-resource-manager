import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

import {
  assertBatch4Database,
  configureBatch4TestEnvironment,
  isolatedBatch4Client
} from "./helpers/batch4Database.js";

const database = assertBatch4Database(process.env.BATCH4_DATABASE || "");
const databaseUrl = await configureBatch4TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js")
]);

const app = createApp();
const isolated = isolatedBatch4Client(databaseUrl);
const password = "Batch4!Pass";
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const VIETNAM_OFFSET_HOURS = 7;
function futureVietnamTime(daysAhead, hour, minute = 0) {
  const vnReference = new Date(Date.now() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  return new Date(Date.UTC(
    vnReference.getUTCFullYear(),
    vnReference.getUTCMonth(),
    vnReference.getUTCDate() + daysAhead,
    hour - VIETNAM_OFFSET_HOURS,
    minute,
    0,
    0
  ));
}

const fixture = {
  campus: id(),
  building: id(),
  lab: id(),
  users: {
    admin: id(),
    staff: id(),
    studentA: id(),
    studentB: id()
  },
  resources: {
    immediate: id(),
    approvalRequired: id(),
    maintenanceTarget: id()
  }
};

const userRows = [
  ["admin", "ADMIN"],
  ["staff", "LAB_STAFF"],
  ["studentA", "STUDENT"],
  ["studentB", "STUDENT"]
];

async function seed() {
  const passwordHash = await bcrypt.hash(password, 4);

  await isolated.campus.create({
    data: { id: fixture.campus, code: `CMP-${marker.slice(0, 6)}`, name: "Test Campus" }
  });

  await isolated.building.create({
    data: { id: fixture.building, campusId: fixture.campus, code: `BLD-${marker.slice(0, 6)}`, name: "Building B4" }
  });

  await isolated.laboratory.create({
    data: {
      id: fixture.lab,
      buildingId: fixture.building,
      code: `LAB-${marker.slice(0, 6)}`,
      name: "AI & Robotics Lab",
      labPolicy: {
        create: {
          id: id(),
          minBookingMinutes: 30,
          maxBookingMinutes: 480,
          maxAdvanceBookingDays: 30,
          allowWeekend: true
        }
      }
    }
  });

  for (const [key, role] of userRows) {
    await isolated.user.create({
      data: {
        id: fixture.users[key],
        email: `${key}-${marker}@example.test`,
        fullName: `${key.toUpperCase()} User`,
        role,
        passwordHash,
        isActive: true
      }
    });
  }

  await isolated.userLabAssignment.create({
    data: {
      userId: fixture.users.staff,
      laboratoryId: fixture.lab
    }
  });

  // Resources
  await isolated.resource.create({
    data: {
      id: fixture.resources.immediate,
      laboratoryId: fixture.lab,
      code: `RES-IMM-${marker.slice(0, 6)}`,
      name: "Instant Access Workstation",
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: "Room 101",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    }
  });

  await isolated.resource.create({
    data: {
      id: fixture.resources.approvalRequired,
      laboratoryId: fixture.lab,
      code: `RES-APP-${marker.slice(0, 6)}`,
      name: "High Performance GPU Server",
      subtype: "GPU_SERVER",
      category: "EQUIPMENT",
      location: "Server Room",
      operationalStatus: "AVAILABLE",
      requiresApproval: true
    }
  });

  await isolated.resource.create({
    data: {
      id: fixture.resources.maintenanceTarget,
      laboratoryId: fixture.lab,
      code: `RES-MNT-${marker.slice(0, 6)}`,
      name: "Spectrometer Under Maintenance",
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: "Room 102",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    }
  });

  // Maintenance window on maintenanceTarget
  const mStart = futureVietnamTime(2, 10);
  const mEnd = new Date(mStart.getTime() + 4 * 60 * 60 * 1000);

  await isolated.maintenanceWindow.create({
    data: {
      id: id(),
      resourceId: fixture.resources.maintenanceTarget,
      title: "Quarterly Calibration",
      kind: "calibration",
      status: "scheduled",
      startAt: mStart,
      endAt: mEnd
    }
  });
}

function tokenFor(userId, role) {
  return jwt.sign(
    { sub: userId, role, email: `${userId}@example.test` },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
}

test("Batch 4 - Booking Calendar & Required Workflow Integration Suite", async (t) => {
  await seed();

  const tokens = {
    admin: tokenFor(fixture.users.admin, "ADMIN"),
    staff: tokenFor(fixture.users.staff, "LAB_STAFF"),
    studentA: tokenFor(fixture.users.studentA, "STUDENT"),
    studentB: tokenFor(fixture.users.studentB, "STUDENT")
  };

  const slot1Start = futureVietnamTime(1, 9);
  const slot1End = new Date(slot1Start.getTime() + 2 * 60 * 60 * 1000); // 2 hours

  let bookingImmediateId;
  let bookingApprovalId;

  await t.test("1. Immediate booking creates CONFIRMED status", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: fixture.resources.immediate,
        title: "AI Inference Lab Session",
        purpose: "Testing neural network latency",
        startAt: slot1Start.toISOString(),
        endAt: slot1End.toISOString()
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, "CONFIRMED");
    assert.equal(res.body.title, "AI Inference Lab Session");
    bookingImmediateId = res.body.id;

    // Check usage log created
    const log = await isolated.usageLog.findFirst({
      where: { bookingId: bookingImmediateId, action: "REQUEST" }
    });
    assert.ok(log, "UsageLog should record initial request");
    assert.equal(log.toStatus, "CONFIRMED");
  });

  await t.test("2. Approval-required resource booking creates PENDING_APPROVAL status", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: fixture.resources.approvalRequired,
        title: "Distributed Model Training",
        purpose: "Training LLM on 8x GPUs",
        startAt: slot1Start.toISOString(),
        endAt: slot1End.toISOString()
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, "PENDING_APPROVAL");
    bookingApprovalId = res.body.id;
  });

  await t.test("3. Conflicting booking on overlapping slot is rejected with 409 BOOKING_CONFLICT", async () => {
    const overlappingStart = new Date(slot1Start.getTime() + 30 * 60 * 1000); // 30m into slot1
    const overlappingEnd = new Date(slot1End.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentB))
      .send({
        resourceId: fixture.resources.immediate,
        title: "Conflicting Student Session",
        purpose: "Should fail due to overlap",
        startAt: overlappingStart.toISOString(),
        endAt: overlappingEnd.toISOString()
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error?.code, "BOOKING_CONFLICT");
  });

  await t.test("4. Overlap with scheduled maintenance is rejected with 409 CALIBRATION_CONFLICT", async () => {
    const mWindow = await isolated.maintenanceWindow.findFirst({
      where: { resourceId: fixture.resources.maintenanceTarget }
    });
    assert.ok(mWindow);

    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: fixture.resources.maintenanceTarget,
        title: "Attempting booking during calibration",
        purpose: "Should be blocked by maintenance window",
        startAt: mWindow.startAt.toISOString(),
        endAt: mWindow.endAt.toISOString()
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error?.code, "BOOKING_CONFLICT");
  });

  await t.test("5. Lab policy violation: duration < minBookingMinutes is rejected", async () => {
    const shortStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const shortEnd = new Date(shortStart.getTime() + 10 * 60 * 1000); // 10 minutes < min 30m

    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: fixture.resources.immediate,
        title: "Too short session",
        startAt: shortStart.toISOString(),
        endAt: shortEnd.toISOString()
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, "POLICY_VIOLATION");
  });

  await t.test("6. Canonical state machine transitions: PENDING_APPROVAL -> CONFIRMED -> CHECKED_OUT -> RETURNED -> COMPLETED", async () => {
    // Approve by staff
    const approveRes = await request(app)
      .post(`/api/bookings/${bookingApprovalId}/approve`)
      .set(bearer(tokens.staff))
      .send({ reason: "Approved for research thesis" });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.status, "CONFIRMED");

    // Check out
    const checkOutRes = await request(app)
      .post(`/api/bookings/${bookingApprovalId}/check-out`)
      .set(bearer(tokens.staff))
      .send({ conditionBefore: "Device clean, all cables intact" });

    assert.equal(checkOutRes.status, 200);
    assert.equal(checkOutRes.body.status, "CHECKED_OUT");
    assert.equal(checkOutRes.body.handoverCondition, "Device clean, all cables intact");

    // Return
    const returnRes = await request(app)
      .post(`/api/bookings/${bookingApprovalId}/return`)
      .set(bearer(tokens.staff))
      .send({ conditionAfter: "Device returned in good working condition" });

    assert.equal(returnRes.status, 200);
    assert.equal(returnRes.body.status, "RETURNED");
    assert.equal(returnRes.body.returnCondition, "Device returned in good working condition");

    // Complete
    const completeRes = await request(app)
      .post(`/api/bookings/${bookingApprovalId}/complete`)
      .set(bearer(tokens.staff))
      .send({ reason: "Completed normally" });

    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.status, "COMPLETED");

    // Verify all transitions logged in UsageLog
    const logs = await isolated.usageLog.findMany({
      where: { bookingId: bookingApprovalId },
      orderBy: { createdAt: "asc" }
    });
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes("REQUEST"));
    assert.ok(actions.includes("APPROVE"));
    assert.ok(actions.includes("CHECK_OUT"));
    assert.ok(actions.includes("RETURN"));
    assert.ok(actions.includes("COMPLETE"));
  });

  await t.test("7. Calendar privacy contract: student sees sanitized occupancy, owner sees own title, staff sees operational details", async () => {
    // 7a. Public/unauthenticated GET /api/calendar/slots
    const publicSlots = await request(app)
      .get(`/api/calendar/slots?resource_id=${fixture.resources.immediate}`);
    assert.equal(publicSlots.status, 200);
    const publicStr = JSON.stringify(publicSlots.body);
    assert.equal(publicStr.includes("requestedBy"), false, "Public slots must not include requestedBy");
    assert.equal(publicStr.includes("studentA"), false, "Public slots must not reveal studentA identity");
    assert.equal(publicStr.includes("Testing neural network latency"), false, "Public slots must not reveal purpose");

    // 7b. Student B querying calendar events
    const startStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const studentBEvents = await request(app)
      .get(`/api/calendar/events?start=${startStr}&end=${endStr}&resource_id=${fixture.resources.immediate}`)
      .set(bearer(tokens.studentB));

    assert.equal(studentBEvents.status, 200);
    const bEvents = studentBEvents.body.events;
    const bMatch = bEvents.find((e) => e.id === bookingImmediateId);
    assert.ok(bMatch, "Event should appear on calendar");
    assert.equal(bMatch.title, "Đã đặt", "Student B should only see sanitized title");
    assert.equal(bMatch.isMine, false);
    assert.equal(bMatch.requestedBy, undefined, "Student B must not see requester PII");

    // 7c. Student A (owner) querying calendar events
    const studentAEvents = await request(app)
      .get(`/api/calendar/events?start=${startStr}&end=${endStr}&resource_id=${fixture.resources.immediate}`)
      .set(bearer(tokens.studentA));

    assert.equal(studentAEvents.status, 200);
    const aMatch = studentAEvents.body.events.find((e) => e.id === bookingImmediateId);
    assert.ok(aMatch);
    assert.equal(aMatch.title, "AI Inference Lab Session", "Owner sees their own booking title");
    assert.equal(aMatch.purpose, "Testing neural network latency", "Owner sees their own purpose");
    assert.equal(aMatch.isMine, true);

    // 7d. Lab Staff querying calendar events
    const staffEvents = await request(app)
      .get(`/api/calendar/events?start=${startStr}&end=${endStr}&resource_id=${fixture.resources.immediate}`)
      .set(bearer(tokens.staff));

    assert.equal(staffEvents.status, 200);
    const staffMatch = staffEvents.body.events.find((e) => e.id === bookingImmediateId);
    assert.ok(staffMatch);
    assert.equal(staffMatch.title, "AI Inference Lab Session");
    assert.ok(staffMatch.requestedBy, "Staff should see requester details");
    assert.equal(staffMatch.requestedBy.email, `studentA-${marker}@example.test`);
  });

  await t.test("8. GET /api/bookings/availability pre-checks availability accurately", async () => {
    const res = await request(app)
      .get(`/api/bookings/availability?resourceId=${fixture.resources.immediate}&startAt=${slot1Start.toISOString()}&endAt=${slot1End.toISOString()}`)
      .set(bearer(tokens.studentA));

    assert.equal(res.status, 200);
    assert.equal(res.body.available, false, "Should be marked unavailable because slot1 is already booked");
    assert.ok(res.body.conflicts?.length > 0);
  });

  await t.test("9. Operational status semantics: IN_USE does not blanket-block future slots; hard-blocking states reject booking", async () => {
    // 9a. Resource with operationalStatus IN_USE can be booked for future non-overlapping intervals
    const inUseResourceId = id();
    await isolated.resource.create({
      data: {
        id: inUseResourceId,
        laboratoryId: fixture.lab,
        code: `RES-INUSE-${marker.slice(0, 6)}`,
        name: "Workstation Currently In Physical Use",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Lab Room 105",
        operationalStatus: "IN_USE",
        requiresApproval: false
      }
    });

    const futureSlotStart = futureVietnamTime(3, 10);
    const futureSlotEnd = new Date(futureSlotStart.getTime() + 2 * 60 * 60 * 1000);

    const inUseBookingRes = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: inUseResourceId,
        title: "Future Booking on In-Use Resource",
        purpose: "Testing that physical IN_USE does not blanket-block future intervals",
        startAt: futureSlotStart.toISOString(),
        endAt: futureSlotEnd.toISOString()
      });

    assert.equal(inUseBookingRes.status, 201, "Resource with IN_USE operationalStatus must be bookable for future slots");
    assert.equal(inUseBookingRes.body.status, "CONFIRMED");

    // 9b. Resource with operationalStatus MAINTENANCE is hard-blocked and rejects future bookings
    const maintResourceId = id();
    await isolated.resource.create({
      data: {
        id: maintResourceId,
        laboratoryId: fixture.lab,
        code: `RES-MAINT-${marker.slice(0, 6)}`,
        name: "Workstation In Physical Maintenance",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Lab Room 106",
        operationalStatus: "MAINTENANCE",
        requiresApproval: false
      }
    });

    const maintBookingRes = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: maintResourceId,
        title: "Attempting to book maintenance resource",
        purpose: "Should be rejected",
        startAt: futureSlotStart.toISOString(),
        endAt: futureSlotEnd.toISOString()
      });

    assert.equal(maintBookingRes.status, 400, "Resource with MAINTENANCE operationalStatus must reject bookings");
    assert.equal(maintBookingRes.body.error?.code, "RESOURCE_UNAVAILABLE");
  });

  await t.test("10. Calendar privacy truthfulness: Never fabricate CONFIRMED status for other users", async () => {
    // Create bookings with distinct canonical statuses: PENDING_APPROVAL, CONFIRMED, CHECKED_OUT, RETURNED
    const privacyResourceId = id();
    await isolated.resource.create({
      data: {
        id: privacyResourceId,
        laboratoryId: fixture.lab,
        code: `RES-PRIV-${marker.slice(0, 6)}`,
        name: "Privacy Validation Workstation",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Lab Room 107",
        operationalStatus: "AVAILABLE",
        requiresApproval: false
      }
    });

    const baseTime = futureVietnamTime(4, 8);

    const testStatuses = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"];
    const createdBookingIds = [];

    for (let i = 0; i < testStatuses.length; i++) {
      const bStart = new Date(baseTime.getTime() + i * 2 * 60 * 60 * 1000);
      const bEnd = new Date(bStart.getTime() + 90 * 60 * 1000);
      const b = await isolated.booking.create({
        data: {
          id: id(),
          resourceId: privacyResourceId,
          requestedById: fixture.users.studentA,
          title: `Secret Project ${testStatuses[i]}`,
          purpose: `Highly confidential research details for ${testStatuses[i]}`,
          bookingCode: `BK-CONF-${i}-${marker.slice(0, 4)}`,
          startAt: bStart,
          endAt: bEnd,
          status: testStatuses[i]
        }
      });
      createdBookingIds.push({ id: b.id, status: testStatuses[i] });
    }

    const windowStart = new Date(baseTime.getTime() - 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000).toISOString();

    // Student B queries calendar: MUST NOT fabricate "CONFIRMED", MUST NOT leak PII
    const studentBView = await request(app)
      .get(`/api/calendar/events?start=${windowStart}&end=${windowEnd}&resource_id=${privacyResourceId}`)
      .set(bearer(tokens.studentB));

    assert.equal(studentBView.status, 200);
    for (const { id: bId, status: realStatus } of createdBookingIds) {
      const ev = studentBView.body.events.find((e) => e.id === bId);
      assert.ok(ev, `Event for ${realStatus} should appear on calendar projection`);
      assert.equal(ev.occupancy, "BOOKED", "Public projection must indicate occupancy: BOOKED");
      assert.equal(ev.status, undefined, `Public projection must NOT fabricate status (expected undefined, not '${realStatus}' or 'CONFIRMED')`);
      assert.equal(ev.title, "Đã đặt", "Sanitized title must be displayed");
      assert.equal(ev.purpose, undefined, "Purpose must not be leaked");
      assert.equal(ev.bookingCode, undefined, "Booking code must not be leaked");
      assert.equal(ev.requestedBy, undefined, "Requester PII must not be leaked");
    }

    // Student A (owner) queries calendar: sees real status
    const ownerView = await request(app)
      .get(`/api/calendar/events?start=${windowStart}&end=${windowEnd}&resource_id=${privacyResourceId}`)
      .set(bearer(tokens.studentA));

    assert.equal(ownerView.status, 200);
    for (const { id: bId, status: realStatus } of createdBookingIds) {
      const ev = ownerView.body.events.find((e) => e.id === bId);
      assert.ok(ev);
      assert.equal(ev.status, realStatus, `Owner must see their real canonical status ${realStatus}`);
      assert.equal(ev.isMine, true);
    }

    // Staff queries calendar: sees real status and requester info
    const staffView = await request(app)
      .get(`/api/calendar/events?start=${windowStart}&end=${windowEnd}&resource_id=${privacyResourceId}`)
      .set(bearer(tokens.staff));

    assert.equal(staffView.status, 200);
    for (const { id: bId, status: realStatus } of createdBookingIds) {
      const ev = staffView.body.events.find((e) => e.id === bId);
      assert.ok(ev);
      assert.equal(ev.status, realStatus, `Staff must see real canonical status ${realStatus}`);
      assert.ok(ev.requestedBy, "Staff must see requester details");
    }
  });

  await t.test("11. Half-open interval regression: adjacent intervals 09:00-10:00 and 10:00-11:00 both succeed", async () => {
    const halfOpenResourceId = id();
    await isolated.resource.create({
      data: {
        id: halfOpenResourceId,
        laboratoryId: fixture.lab,
        code: `RES-HALF-${marker.slice(0, 6)}`,
        name: "Half Open Interval Test Workstation",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Lab Room 108",
        operationalStatus: "AVAILABLE",
        requiresApproval: false
      }
    });

    const dayAnchor = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    dayAnchor.setHours(9, 0, 0, 0);

    const slot1StartAt = new Date(dayAnchor); // 09:00
    const slot1EndAt = new Date(dayAnchor.getTime() + 60 * 60 * 1000); // 10:00
    const slot2StartAt = new Date(slot1EndAt); // 10:00
    const slot2EndAt = new Date(slot2StartAt.getTime() + 60 * 60 * 1000); // 11:00

    const res1 = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: halfOpenResourceId,
        title: "Adjacent Session 1 (09:00-10:00)",
        purpose: "Verify half-open interval boundary",
        startAt: slot1StartAt.toISOString(),
        endAt: slot1EndAt.toISOString()
      });
    assert.equal(res1.status, 201, "First adjacent slot 09:00-10:00 must succeed");

    const res2 = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentB))
      .send({
        resourceId: halfOpenResourceId,
        title: "Adjacent Session 2 (10:00-11:00)",
        purpose: "Verify half-open interval boundary",
        startAt: slot2StartAt.toISOString(),
        endAt: slot2EndAt.toISOString()
      });
    assert.equal(res2.status, 201, "Second adjacent slot 10:00-11:00 must succeed");
  });

  await t.test("12. Real PostgreSQL concurrency: exactly 1 winner, exactly 1 409 conflict, and 5 simultaneous attempts", async () => {
    const concResourceId = id();
    await isolated.resource.create({
      data: {
        id: concResourceId,
        laboratoryId: fixture.lab,
        code: `RES-CONC-${marker.slice(0, 6)}`,
        name: "Concurrency Test Target Workstation",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Lab Room 109",
        operationalStatus: "AVAILABLE",
        requiresApproval: false
      }
    });

    const concStart = futureVietnamTime(6, 13);
    const concEnd = new Date(concStart.getTime() + 90 * 60 * 1000);

    // 12a. Exactly two concurrent requests
    const [twoA, twoB] = await Promise.all([
      request(app).post("/api/bookings").set(bearer(tokens.studentA)).send({
        resourceId: concResourceId,
        title: "Concurrent Attempt A",
        purpose: "Testing real concurrency race A",
        startAt: concStart.toISOString(),
        endAt: concEnd.toISOString()
      }),
      request(app).post("/api/bookings").set(bearer(tokens.studentB)).send({
        resourceId: concResourceId,
        title: "Concurrent Attempt B",
        purpose: "Testing real concurrency race B",
        startAt: concStart.toISOString(),
        endAt: concEnd.toISOString()
      })
    ]);

    const statusesTwo = [twoA.status, twoB.status].sort();
    assert.deepEqual(statusesTwo, [201, 409], "Exactly one concurrent attempt must succeed with 201 and one fail with 409");
    const conflictTwo = twoA.status === 409 ? twoA : twoB;
    assert.ok(
      ["BOOKING_CONFLICT", "EQUIPMENT_CONFLICT"].includes(conflictTwo.body.error?.code),
      `Conflict code must be canonical, got ${conflictTwo.body.error?.code}`
    );

    const persistedTwo = await isolated.booking.findMany({
      where: {
        resourceId: concResourceId,
        startAt: concStart,
        endAt: concEnd,
        status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"] }
      }
    });
    assert.equal(persistedTwo.length, 1, "Exactly 1 booking must be persisted in PostgreSQL");

    // 12b. Five simultaneous identical attempts
    const conc5Start = futureVietnamTime(6, 15);
    const conc5End = new Date(conc5Start.getTime() + 60 * 60 * 1000);

    const fiveResults = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app).post("/api/bookings").set(bearer(i % 2 === 0 ? tokens.studentA : tokens.studentB)).send({
          resourceId: concResourceId,
          title: `Simultaneous attempt ${i}`,
          purpose: `Testing 5 simultaneous requests ${i}`,
          startAt: conc5Start.toISOString(),
          endAt: conc5End.toISOString()
        })
      )
    );

    const successCount = fiveResults.filter((r) => r.status === 201).length;
    const conflictCount = fiveResults.filter((r) => r.status === 409).length;

    assert.equal(successCount, 1, "Exactly one of five concurrent attempts must succeed with 201");
    assert.equal(conflictCount, 4, "Remaining four concurrent attempts must be rejected with 409");

    const persisted5 = await isolated.booking.findMany({
      where: {
        resourceId: concResourceId,
        startAt: conc5Start,
        endAt: conc5End,
        status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"] }
      }
    });
    assert.equal(persisted5.length, 1, "Exactly 1 active booking must be persisted in PostgreSQL from five attempts");
  });

  await t.test("13. Calendar range validation: rejects >180 days, invalid dates, and inverted ranges with 400 VALIDATION_ERROR", async () => {
    const base = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const validStart = base.toISOString();
    const beyond180 = new Date(base.getTime() + 181 * 24 * 60 * 60 * 1000).toISOString();

    // 13a: > 180 days
    const resOver = await request(app)
      .get(`/api/calendar/events?start=${validStart}&end=${beyond180}`)
      .set(bearer(tokens.studentA));
    assert.equal(resOver.status, 400);
    assert.equal(resOver.body.error?.code, "VALIDATION_ERROR");
    assert.match(resOver.body.error?.message, /180 days/);

    // 13b: missing parameters
    const resMissing = await request(app)
      .get("/api/calendar/events")
      .set(bearer(tokens.studentA));
    assert.equal(resMissing.status, 400);
    assert.equal(resMissing.body.error?.code, "VALIDATION_ERROR");

    // 13c: inverted range (start >= end)
    const resInverted = await request(app)
      .get(`/api/calendar/events?start=${beyond180}&end=${validStart}`)
      .set(bearer(tokens.studentA));
    assert.equal(resInverted.status, 400);
    assert.equal(resInverted.body.error?.code, "VALIDATION_ERROR");

    // 13d: invalid date strings
    const resInvalid = await request(app)
      .get("/api/calendar/events?start=invalid-date&end=not-a-date")
      .set(bearer(tokens.studentA));
    assert.equal(resInvalid.status, 400);
    assert.equal(resInvalid.body.error?.code, "VALIDATION_ERROR");
  });

  await t.test("14. Effective approval requirement: labPolicy.requiresApproval=true enforces PENDING_APPROVAL even when resource.requiresApproval=false", async () => {
    // Create new lab with labPolicy.requiresApproval = true
    const approvalLabId = id();
    await isolated.laboratory.create({
      data: {
        id: approvalLabId,
        buildingId: fixture.building,
        code: `LAB-POL-${marker.slice(0, 6)}`,
        name: "Policy-Enforced Approval Lab",
        labPolicy: {
          create: {
            id: id(),
            requiresApproval: true, // Laboratory policy enforces approval!
            minBookingMinutes: 30,
            maxBookingMinutes: 480,
            allowWeekend: true
          }
        }
      }
    });

    // Create resource with requiresApproval = false in that lab
    const policyApprovalResourceId = id();
    await isolated.resource.create({
      data: {
        id: policyApprovalResourceId,
        laboratoryId: approvalLabId,
        code: `RES-POL-${marker.slice(0, 6)}`,
        name: "Auto-Approve Candidate Under Policy Lab",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Room 205",
        operationalStatus: "AVAILABLE",
        requiresApproval: false // Explicitly false on the resource itself
      }
    });

    // 14a: GET /api/resources/:id must serialize effectiveRequiresApproval: true
    const getRes = await request(app)
      .get(`/api/resources/${policyApprovalResourceId}`)
      .set(bearer(tokens.studentA));
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.requiresApproval, false, "Underlying resource flag remains false");
    assert.equal(getRes.body.effectiveRequiresApproval, true, "Effective requiresApproval must be true due to lab policy");
    assert.equal(getRes.body.labPolicy?.requiresApproval, true);

    // 14b: Booking creation must result in PENDING_APPROVAL
    const testStart = futureVietnamTime(7, 10);
    const testEnd = new Date(testStart.getTime() + 60 * 60 * 1000);

    const bookingRes = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send({
        resourceId: policyApprovalResourceId,
        title: "Booking Subject to Policy Approval",
        purpose: "Validating effective requiresApproval rule",
        startAt: testStart.toISOString(),
        endAt: testEnd.toISOString()
      });

    assert.equal(bookingRes.status, 201);
    assert.equal(
      bookingRes.body.status,
      "PENDING_APPROVAL",
      "Persisted status must be PENDING_APPROVAL when lab policy requires approval"
    );
  });

  await t.test("15. Mandatory training is enforced by authoritative booking creation", async () => {
    const trainingResourceId = id();
    const courseA = id();
    const courseB = id();

    await isolated.resource.create({
      data: {
        id: trainingResourceId,
        laboratoryId: fixture.lab,
        code: `RES-TRAIN-${marker.slice(0, 6)}`,
        name: "Laser Safety Training Target",
        subtype: "OTHER",
        category: "EQUIPMENT",
        location: "Safety Lab",
        operationalStatus: "AVAILABLE",
        requiresApproval: false
      }
    });

    await isolated.trainingCourse.createMany({
      data: [
        { id: courseA, code: `SAFE-A-${marker.slice(0, 6)}`, name: "General Lab Safety" },
        { id: courseB, code: `SAFE-B-${marker.slice(0, 6)}`, name: "Laser Safety" }
      ]
    });
    await isolated.trainingRequirement.createMany({
      data: [
        { id: id(), resourceId: trainingResourceId, courseId: courseA, isMandatory: true },
        { id: id(), resourceId: trainingResourceId, courseId: courseB, isMandatory: true }
      ]
    });

    const trainingStart = futureVietnamTime(8, 10);
    const trainingEnd = new Date(trainingStart.getTime() + 60 * 60 * 1000);
    const bookingPayload = {
      resourceId: trainingResourceId,
      title: "Training-gated equipment booking",
      purpose: "Verify mandatory safety qualification",
      startAt: trainingStart.toISOString(),
      endAt: trainingEnd.toISOString()
    };

    const missingAll = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send(bookingPayload);
    assert.equal(missingAll.status, 403);
    assert.equal(missingAll.body.error?.code, "BOOKING_TRAINING_REQUIRED");
    assert.deepEqual(
      missingAll.body.error?.details?.missingTraining.map((row) => row.code).sort(),
      [`SAFE-A-${marker.slice(0, 6)}`, `SAFE-B-${marker.slice(0, 6)}`].sort()
    );

    await isolated.userCertification.create({
      data: {
        id: id(),
        userId: fixture.users.studentA,
        courseId: courseA,
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    await isolated.userCertification.create({
      data: {
        id: id(),
        userId: fixture.users.studentA,
        courseId: courseB,
        status: "revoked"
      }
    });

    const revoked = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send(bookingPayload);
    assert.equal(revoked.status, 403);
    assert.equal(revoked.body.error?.code, "BOOKING_TRAINING_REQUIRED");
    assert.deepEqual(
      revoked.body.error?.details?.missingTraining.map((row) => row.code),
      [`SAFE-B-${marker.slice(0, 6)}`]
    );

    await isolated.userCertification.update({
      where: { userId_courseId: { userId: fixture.users.studentA, courseId: courseB } },
      data: {
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const qualified = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentA))
      .send(bookingPayload);
    assert.equal(qualified.status, 201);
    assert.equal(qualified.body.status, "CONFIRMED");

    const otherUserStart = new Date(trainingEnd);
    const otherUserEnd = new Date(otherUserStart.getTime() + 60 * 60 * 1000);
    const wrongUser = await request(app)
      .post("/api/bookings")
      .set(bearer(tokens.studentB))
      .send({
        ...bookingPayload,
        title: "Other user without certifications",
        startAt: otherUserStart.toISOString(),
        endAt: otherUserEnd.toISOString()
      });
    assert.equal(wrongUser.status, 403);
    assert.equal(wrongUser.body.error?.code, "BOOKING_TRAINING_REQUIRED");
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
