import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { setTimeout as delay } from "node:timers/promises";

import {
  assertBatch3Database,
  configureBatch3TestEnvironment,
  isolatedBatch3Client
} from "./helpers/batch3Database.js";

const database = assertBatch3Database(process.env.BATCH3_DATABASE || "");
const databaseUrl = await configureBatch3TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([import("../src/app.js"), import("../src/db.js")]);
const app = createApp();
const isolated = isolatedBatch3Client(databaseUrl);
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const password = "Batch3!Pass";
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const at = (day, hour) => new Date(Date.UTC(2042, 0, day, hour));

const fixture = {
  campus: id(), building: id(),
  labs: { assigned: id(), foreign: id() },
  users: { admin: id(), staff: id(), unassigned: id(), lecturer: id(), student: id() },
  resources: { assigned: id(), foreign: id(), historical: id(), review: id() }
};

async function seed() {
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.campus.create({ data: { id: fixture.campus, name: "Batch 3 Campus", code: `B3C-${marker}` } });
  await prisma.building.create({ data: { id: fixture.building, campusId: fixture.campus, name: "Batch 3 Building", code: `B3B-${marker}` } });
  await prisma.laboratory.createMany({ data: [
    { id: fixture.labs.assigned, buildingId: fixture.building, name: "Assigned Laboratory", code: `B3LA-${marker}` },
    { id: fixture.labs.foreign, buildingId: fixture.building, name: "Foreign Laboratory", code: `B3LF-${marker}` }
  ] });
  await prisma.user.createMany({ data: Object.entries(fixture.users).map(([name, userId]) => ({
    id: userId,
    email: `${name}-${marker}@example.test`,
    fullName: `Batch 3 ${name}`,
    role: name === "admin" ? "ADMIN" : name === "staff" || name === "unassigned" ? "LAB_STAFF" : name === "lecturer" ? "CUSTOMER" : "CUSTOMER",
    passwordHash,
    isActive: true
  })) });
  await prisma.userLabAssignment.create({ data: { userId: fixture.users.staff, laboratoryId: fixture.labs.assigned } });
  await prisma.resource.createMany({ data: [
    { id: fixture.resources.assigned, laboratoryId: fixture.labs.assigned, code: `B3-EQ-${marker}`, name: "Assigned Microscope", subtype: "OTHER", category: "EQUIPMENT", location: "A-101", description: "Optical inspection", requiresApproval: true },
    { id: fixture.resources.foreign, laboratoryId: fixture.labs.foreign, code: `B3-MC-${marker}`, name: "Foreign CNC Machine", subtype: "OTHER", category: "MACHINE", location: "B-202" },
    { id: fixture.resources.historical, laboratoryId: fixture.labs.assigned, code: `B3-HISTORY-${marker}`, name: "Historical Machine", subtype: "OTHER", category: "MACHINE", location: "A-102" },
    { id: fixture.resources.review, laboratoryId: fixture.labs.assigned, code: `B3-REVIEW-${marker}`, name: "Classification Review", subtype: "CAMERA", category: null, location: "A-103" },
    ...["CAM-D435I-01", "EDGE-RPI5-01", "RPI-KIT-05", "UAV-M350-RTK-01", "UAV-MATRICE-300"].map((code, index) => ({
      id: id(), laboratoryId: fixture.labs.assigned, code: `${code}-${marker}`, name: `Unresolved ${index + 1}`, subtype: "OTHER", category: null, location: "REVIEW"
    }))
  ] });
  await prisma.booking.create({ data: {
    id: id(), resourceId: fixture.resources.historical, requestedById: fixture.users.student,
    title: "Persisted schedule evidence", purpose: "BATCH3_TEST", startAt: at(10, 8), endAt: at(10, 10), status: "CONFIRMED"
  } });
  await prisma.maintenanceWindow.create({ data: {
    id: id(), resourceId: fixture.resources.historical, createdById: fixture.users.staff,
    title: "Persisted maintenance evidence", startAt: at(12, 8), endAt: at(12, 10), status: "scheduled"
  } });
}

async function login(name) {
  const response = await request(app).post("/api/auth/login").send({ email: `${name}-${marker}@example.test`, password });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

test("Batch 3 canonical resource management", { timeout: 180000 }, async (t) => {
  await seed();
  const tokens = Object.fromEntries(await Promise.all(["admin", "staff", "unassigned", "lecturer", "student"].map(async (name) => [name, await login(name)])));

  await t.test("resource list, detail, DB search and filters are canonical", async () => {
    const list = await request(app).get(`/api/resources?laboratoryId=${fixture.labs.assigned}&category=EQUIPMENT&operationalStatus=AVAILABLE&search=microscope`);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].id, fixture.resources.assigned);
    assert.equal(list.body[0].category, "EQUIPMENT");
    assert.equal(list.body[0].subtype, "OTHER");
    assert.equal(list.body[0].status, undefined);
    assert.equal(list.body[0].laboratory.id, fixture.labs.assigned);
    assert.equal(typeof list.body[0].availability.available, "boolean");

    const detail = await request(app).get(`/api/resources/${fixture.resources.historical}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.code.startsWith("B3-HISTORY"), true);
    assert.equal(detail.body.upcomingSchedule.bookings.length, 1);
    assert.equal(detail.body.upcomingSchedule.maintenanceWindows.length, 1);
  });

  await t.test("create enforces role, lab scope, taxonomy and uniqueness", async () => {
    const payload = {
      code: `B3-CREATE-${marker}`, name: "Created Experiment Kit", laboratoryId: fixture.labs.assigned,
      category: "EXPERIMENT_KIT", subtype: "KIT", location: "A-104", capacity: 2, requiresApproval: false
    };
    const adminCreate = await request(app).post("/api/resources").set(bearer(tokens.admin)).send(payload);
    assert.equal(adminCreate.status, 201);
    assert.equal(adminCreate.body.operationalStatus, "AVAILABLE");
    assert.equal(adminCreate.body.category, "EXPERIMENT_KIT");

    const staffCreate = await request(app).post("/api/resources").set(bearer(tokens.staff)).send({ ...payload, code: `B3-STAFF-${marker}` });
    assert.equal(staffCreate.status, 201);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.staff)).send({ ...payload, code: `B3-FOREIGN-${marker}`, laboratoryId: fixture.labs.foreign })).status, 403);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.unassigned)).send({ ...payload, code: `B3-UNASSIGNED-${marker}` })).status, 403);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.student)).send({ ...payload, code: `B3-CUSTOMER-${marker}` })).status, 403);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.lecturer)).send({ ...payload, code: `B3-CUSTOMER-${marker}` })).status, 403);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.admin)).send({ ...payload, code: `B3-BAD-${marker}`, category: "GPU_CLUSTER" })).status, 400);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.admin)).send({ ...payload, code: `B3-NOLAB-${marker}`, laboratoryId: id() })).status, 404);
    assert.equal((await request(app).post("/api/resources").set(bearer(tokens.admin)).send(payload)).status, 409);
  });

  await t.test("update protects immutable fields and cross-lab resources", async () => {
    const valid = await request(app).patch(`/api/resources/${fixture.resources.assigned}`).set(bearer(tokens.staff))
      .send({ expectedVersion: 0, description: "Updated with real persistence", category: "EQUIPMENT", changeReason: "Catalog review" });
    assert.equal(valid.status, 200);
    assert.equal(valid.body.description, "Updated with real persistence");
    assert.equal(valid.body.version, 1);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.foreign}`).set(bearer(tokens.staff)).send({ expectedVersion: 0, name: "Outside LAB" })).status, 403);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.assigned}`).set(bearer(tokens.admin)).send({ expectedVersion: 1, id: id() })).status, 400);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.assigned}`).set(bearer(tokens.admin)).send({ expectedVersion: 1, operationalStatus: "BROKEN" })).status, 400);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.assigned}`).set(bearer(tokens.staff)).send({ expectedVersion: 1, laboratoryId: fixture.labs.foreign })).status, 403);
  });

  await t.test("a concurrent LAB move invalidates staff writes waiting on that resource", async () => {
    const resourceId = id();
    await isolated.resource.create({ data: { id: resourceId, code: resourceId, name: "Scoped write test", location: "LAB", laboratoryId: fixture.labs.assigned, category: "EQUIPMENT", subtype: "OTHER" } });
    let write;
    await isolated.$transaction(async tx => {
      const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
      await tx.resource.update({ where: { id: resourceId }, data: { laboratoryId: fixture.labs.foreign } });
      write = request(app).patch(`/api/resources/${resourceId}/operational-status`).set(bearer(tokens.staff))
        .send({ operationalStatus: "MAINTENANCE", reason: "Verify current LAB scope" }).then(response => response);
      const deadline = Date.now() + 3000;
      let blocked = false;
      while (!blocked && Date.now() < deadline) {
        [{ blocked }] = await isolated.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND ${pid} = ANY(pg_blocking_pids(pid))) AS blocked`;
        if (!blocked) await delay(20);
      }
      assert.ok(blocked, "Wait for the staff write to reach the resource lock before committing the move");
    });
    assert.equal((await write).status, 403);
    assert.equal((await isolated.resource.findUniqueOrThrow({ where: { id: resourceId } })).operationalStatus, "AVAILABLE");
    assert.equal(await isolated.resourceStatusHistory.count({ where: { resourceId } }), 0);
  });

  await t.test("concurrent resource edits accept only one version and leave the other draft unsaved", async () => {
    const resourceId = id();
    await isolated.resource.create({ data: { id: resourceId, code: resourceId, name: "Original resource", location: "LAB", laboratoryId: fixture.labs.assigned, subtype: "OTHER" } });
    const endpoint = `/api/resources/${resourceId}`;
    const update = (token, data) => request(app).patch(endpoint).set(bearer(token)).send(data);
    const view = await request(app).get(endpoint);
    assert.equal(view.body.version, 0);
    assert.equal((await update(tokens.admin, { name: "No version" })).status, 400);
    assert.equal((await update(tokens.admin, { expectedVersion: 0 })).status, 400);
    const edits = [
      { expectedVersion: view.body.version, name: "Admin revision", description: "Admin details" },
      { expectedVersion: view.body.version, name: "Staff revision", description: "Staff details" }
    ];
    const results = await Promise.all([update(tokens.admin, edits[0]), update(tokens.staff, edits[1])]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const winner = results.findIndex(result => result.status === 200);
    assert.equal(results[1 - winner].body.error.code, "RESOURCE_CHANGED");
    const saved = await isolated.resource.findUniqueOrThrow({ where: { id: resourceId } });
    assert.equal(saved.version, 1);
    assert.equal(saved.name, edits[winner].name);
    assert.equal(saved.description, edits[winner].description);
    assert.equal(await isolated.usageLog.count({ where: { resourceId, message: "resource.updated" } }), 1);

    const tariff = await request(app).put(`/api/booking-pricing/${resourceId}/tariff`)
      .set(bearer(tokens.admin)).send({ hourlyRateVnd: 0, maxBookingMinutes: 120 });
    assert.equal(tariff.status, 200);
    const staleLimit = await update(tokens.admin, { expectedVersion: saved.version, maxBookingMinutes: 60 });
    assert.equal(staleLimit.status, 409);
    assert.equal(staleLimit.body.error.code, "RESOURCE_CHANGED");
    assert.equal((await isolated.resource.findUniqueOrThrow({ where: { id: resourceId } })).maxBookingMinutes, 120);
  });

  await t.test("room category stays stable until the confirmed booking is returned and inspected", async () => {
    const resourceId = id(), bookingId = id(), now = Date.now();
    await isolated.resource.create({ data: { id: resourceId, code: resourceId, name: "Bookable room", location: "LAB", laboratoryId: fixture.labs.assigned, category: "ROOM", subtype: "ROOM" } });
    await isolated.booking.create({ data: {
      id: bookingId, resourceId, requestedById: fixture.users.student, title: "Room booking", purpose: "Integration test",
      status: "CONFIRMED", startAt: new Date(now + 10 * 60000), endAt: new Date(now + 70 * 60000),
      fulfillmentSnapshot: { mode: "ROOM_SELF_SERVICE" }, contactSnapshot: { phone: "0901234567" }
    } });
    const endpoint = `/api/resources/${resourceId}`;
    const changeCategory = async (category) => {
      const view = await request(app).get(endpoint);
      return request(app).patch(endpoint).set(bearer(tokens.admin)).send({ category, expectedVersion: view.body.version });
    };
    const bookingAction = (action, actor, body = {}) =>
      request(app).post(`/api/bookings/${bookingId}/${action}`).set(bearer(tokens[actor])).send(body);
    for (const step of ["self-check-in", "self-return", "complete"]) {
      const denied = await changeCategory("EQUIPMENT");
      assert.equal(denied.status, 409);
      assert.equal(denied.body.error.code, "RESOURCE_CATEGORY_BOOKED");
      const response = step === "complete" ? await bookingAction(step, "staff")
        : await bookingAction(step, "student", step === "self-return" ? { conditionAfter: "Room returned in good condition" } : {});
      assert.equal(response.status, 200, JSON.stringify(response.body.error));
    }
    const changed = await changeCategory("EQUIPMENT");
    assert.equal(changed.status, 200);
    assert.equal(changed.body.category, "EQUIPMENT");
  });

  await t.test("resources with monitoring links cannot move labs", async () => {
    for (const kind of ["cameras", "sources"]) {
      const resourceId = id(), laboratoryId = fixture.labs.assigned;
      await isolated.resource.create({ data: { id: resourceId, code: resourceId, name: "Monitored resource", location: "LAB", laboratoryId, category: "EQUIPMENT", subtype: "OTHER" } });
      const linked = await request(app).post(`/api/telemetry/${kind}`).set(bearer(tokens.admin)).send({ resourceId, laboratoryId, code: id(), name: "Monitoring fixture" });
      assert.equal(linked.status, 201);
      const move = await request(app).patch(`/api/resources/${resourceId}`).set(bearer(tokens.admin)).send({ expectedVersion: 0, laboratoryId: fixture.labs.foreign });
      assert.equal(move.status, 409);
      assert.equal(move.body.error.code, "RESOURCE_MONITORING_LINKED");
      assert.equal((await isolated.resource.findUniqueOrThrow({ where: { id: resourceId } })).laboratoryId, laboratoryId);
    }
  });

  await t.test("operational status is authoritative and history is persisted", async () => {
    const changed = await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`)
      .set(bearer(tokens.staff)).send({ operationalStatus: "MAINTENANCE", reason: "Scheduled inspection" });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.operationalStatus, "MAINTENANCE");
    const persisted = await isolated.resource.findUnique({ where: { id: fixture.resources.assigned } });
    assert.equal(persisted.operationalStatus, "MAINTENANCE");
    assert.equal(persisted.status, "maintenance");
    const history = await isolated.resourceStatusHistory.findFirst({ where: { resourceId: fixture.resources.assigned }, orderBy: { createdAt: "desc" } });
    assert.equal(history.reason, "Scheduled inspection");
    assert.equal(history.changedById, fixture.users.staff);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`).set(bearer(tokens.staff)).send({ operationalStatus: "INVALID" })).status, 400);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.assigned}/operational-status`).set(bearer(tokens.staff)).send({ operationalStatus: "BROKEN" })).status, 400);
  });

  await t.test("retire is non-destructive and restoration is admin-only", async () => {
    const retired = await request(app).post(`/api/resources/${fixture.resources.historical}/retire`).set(bearer(tokens.staff)).send({ reason: "End of supported life" });
    assert.equal(retired.status, 200);
    assert.equal(retired.body.operationalStatus, "RETIRED");
    assert.ok(await isolated.resource.findUnique({ where: { id: fixture.resources.historical } }));
    assert.equal(await isolated.booking.count({ where: { resourceId: fixture.resources.historical } }), 1);
    assert.equal((await request(app).patch(`/api/resources/${fixture.resources.historical}/operational-status`).set(bearer(tokens.staff)).send({ operationalStatus: "AVAILABLE", reason: "Attempt restore" })).status, 403);
    const restored = await request(app).patch(`/api/resources/${fixture.resources.historical}/operational-status`).set(bearer(tokens.admin)).send({ operationalStatus: "AVAILABLE", reason: "Administrative recommission" });
    assert.equal(restored.status, 200);
  });

  await t.test("classification review preserves null and persists reviewed category", async () => {
    const unresolved = await request(app).get("/api/resources?classification=UNRESOLVED");
    assert.equal(unresolved.status, 200);
    assert.equal(unresolved.body.some((resource) => resource.id === fixture.resources.review && resource.category === null), true);
    const reviewed = await request(app).patch(`/api/resources/${fixture.resources.review}`).set(bearer(tokens.admin)).send({ expectedVersion: 0, category: "EQUIPMENT", changeReason: "Verified camera classification" });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.category, "EQUIPMENT");
    const audit = await isolated.usageLog.findFirst({ where: { resourceId: fixture.resources.review, message: "resource.updated" }, orderBy: { createdAt: "desc" } });
    assert.equal(audit.metadata.category.to, "EQUIPMENT");
  });

  await t.test("schedule and history expose only persisted events", async () => {
    const schedule = await request(app).get(`/api/resources/${fixture.resources.historical}/schedule?from=${encodeURIComponent(at(9, 0).toISOString())}&to=${encodeURIComponent(at(13, 0).toISOString())}`);
    assert.equal(schedule.status, 200);
    assert.equal(schedule.body.interval.semantics, "[from,to)");
    assert.equal(schedule.body.bookings.length, 1);
    assert.equal(schedule.body.maintenanceWindows.length, 1);
    assert.equal(JSON.stringify(schedule.body).includes("requestedBy"), false);

    const history = await request(app).get(`/api/resources/${fixture.resources.historical}/history`).set(bearer(tokens.student));
    assert.equal(history.status, 200);
    assert.equal(history.body.timeline.some((event) => event.source === "booking"), true);
    assert.equal(history.body.timeline.some((event) => event.source === "maintenance_window"), true);
    assert.equal(history.body.timeline.every((event) => event.timestamp && event.source && event.eventType), true);
  });

  await t.test("laboratory visibility and administration follow role scope", async () => {
    const adminLabs = await request(app).get("/api/laboratories").set(bearer(tokens.admin));
    assert.equal(adminLabs.status, 200);
    assert.equal(adminLabs.body.length >= 2, true);
    const staffLabs = await request(app).get("/api/laboratories").set(bearer(tokens.staff));
    assert.deepEqual(staffLabs.body.map((lab) => lab.id), [fixture.labs.assigned]);
    assert.equal((await request(app).get(`/api/laboratories/${fixture.labs.foreign}`).set(bearer(tokens.staff))).status, 403);
    assert.equal((await request(app).post("/api/laboratories").set(bearer(tokens.staff)).send({})).status, 403);
    const created = await request(app).post("/api/laboratories").set(bearer(tokens.admin)).send({
      buildingId: fixture.building, code: `B3-LAB-NEW-${marker}`, name: "New Managed Lab", capacity: 12
    });
    assert.equal(created.status, 201);
    const updated = await request(app).patch(`/api/laboratories/${created.body.id}`).set(bearer(tokens.admin)).send({ description: "Updated laboratory" });
    assert.equal(updated.status, 200);
  });

  await isolated.$disconnect();
  await prisma.$disconnect();
});
