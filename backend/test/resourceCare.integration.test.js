import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

const url = new URL(process.env.MONITORING_TEST_DATABASE_URL || "");
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.pathname, "/lab_resources_monitoring_test");
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: "test", LOG_FORMAT: "dev", JWT_SECRET: "resource-care-isolated-test-secret-32-characters", RATE_LIMIT_MAX: "10000", PAYMENTS_ENABLED: "false", MCP_ASSISTANT_ENABLED: "false" });
const [{ createApp }, { prisma }, { enforceOperationLimits }, { transitionBooking }] = await Promise.all([import("../src/app.js"), import("../src/db.js"), import("../src/services/resourceOperationScheduler.js"), import("../src/services/bookingService.js")]);
const app = createApp(), marker = randomUUID(), users = {}, tokens = {};
const { dispatchMaintenanceNotices } = await import("../src/services/resourceCareNoticeService.js");
const { config } = await import("../src/config.js");
let lab, resource, room, booking;
const command = (name, target, data) => request(app).post(`/api/resource-care/${target}/commands`).set("Authorization", `Bearer ${tokens[name]}`).send(data);
const reason = "Recorded inspection evidence for resource operation";
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, "lab_resources_monitoring_test");
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(u => u.email.endsWith("@monitoring.test")));
  const campus = await prisma.campus.create({ data: { id: randomUUID(), code: `C-${marker}`, name: "Care test" } });
  const building = await prisma.building.create({ data: { id: randomUUID(), code: `B-${marker}`, name: "Care test", campusId: campus.id } });
  lab = await prisma.laboratory.create({ data: { id: randomUUID(), code: `L-${marker}`, name: "Care test", buildingId: building.id } });
  const passwordHash = await bcrypt.hash("ResourceCare!2026", 4);
  for (const [name, role] of Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", outsider: "LAB_STAFF", student: "CUSTOMER", lecturer: "CUSTOMER" })) {
    users[name] = await prisma.user.create({ data: { id: randomUUID(), email: `${name}-${marker}@monitoring.test`, fullName: name, phone: "0901234567", role, passwordHash } });
    tokens[name] = (await request(app).post("/api/auth/login").send({ email: users[name].email, password: "ResourceCare!2026" })).body.accessToken;
  }
  await prisma.userLabAssignment.create({ data: { userId: users.staff.id, laboratoryId: lab.id } });
  resource = await prisma.resource.create({ data: { id: randomUUID(), code: `M-${marker}`, name: "Machine", category: "MACHINE", subtype: "GPU_SERVER", laboratoryId: lab.id, location: "Lab" } });
  room = await prisma.resource.create({ data: { id: randomUUID(), code: `R-${marker}`, name: "Room", category: "ROOM", subtype: "ROOM", capacity: 5, laboratoryId: lab.id, location: "Lab" } });
  booking = await prisma.booking.create({ data: { id: randomUUID(), resourceId: resource.id, requestedById: users.student.id, title: "Machine session", purpose: "Testing", status: "CONFIRMED", startAt: new Date(Date.now() - 60000), endAt: new Date(Date.now() + 3600000) } });
});
test.after(() => prisma.$disconnect());

test("resource lifecycle: real API, database, booking, fault and maintenance", async t => {
  await t.test("role and lab scope fail closed; removed demo route is absent", async () => {
    const body = { action: "CONFIGURE", intervalDays: 30, intervalHours: 100, roomId: room.id, reason };
    assert.equal((await command("student", resource.id, body)).status, 403);
    assert.equal((await command("outsider", resource.id, body)).status, 404);
    assert.equal((await request(app).get("/api/monitoring-simulator").set("Authorization", `Bearer ${tokens.admin}`)).status, 404);
    assert.equal((await command("staff", resource.id, body)).status, 200);
    assert.equal((await command("staff", resource.id, { action: "START", loadPercent: 50, reason })).status, 409);
  });
  await t.test("checkout enables operation; concurrent starts allow one active session", async () => {
    await transitionBooking({ bookingId: booking.id, toStatus: "CHECKED_OUT", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionBefore: "All components checked and normal" });
    const results = await Promise.all([command("staff", resource.id, { action: "START", loadPercent: 50, reason }), command("staff", resource.id, { action: "START", loadPercent: 50, reason })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal(await prisma.resourceOperation.count({ where: { activeResourceId: resource.id } }), 1);
    assert.equal((await command("staff", resource.id, { action: "LOAD", loadPercent: 80, reason })).status, 200);
    const rows = await prisma.resourceOperation.findMany({ where: { resourceId: resource.id } });
    assert.equal(rows.length, 2); assert.equal(rows.find(s => !s.endedAt).loadPercent, 80);
  });
  await t.test("broken part stops operation, records incident and survives return", async () => {
    assert.equal((await command("staff", resource.id, { action: "PART", name: "Cooling fan", condition: "BROKEN", reason })).status, 200);
    assert.equal((await prisma.resource.findUnique({ where: { id: resource.id } })).operationalStatus, "BROKEN");
    assert.equal(await prisma.resourceOperation.count({ where: { activeResourceId: resource.id } }), 0);
    assert.equal(await prisma.incident.count({ where: { resourceId: resource.id } }), 1);
    // A manual AVAILABLE flag cannot bypass the inspection interlock.
    await prisma.resource.update({ where: { id: resource.id }, data: { operationalStatus: "IN_USE" } });
    assert.equal((await command("staff", resource.id, { action: "START", loadPercent: 50, reason })).status, 409);
    await prisma.resource.update({ where: { id: resource.id }, data: { operationalStatus: "BROKEN" } });
    await transitionBooking({ bookingId: booking.id, toStatus: "RETURNED", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionAfter: "Fan damage recorded for repair" });
    assert.equal((await prisma.resource.findUnique({ where: { id: resource.id } })).operationalStatus, "BROKEN");
  });
  let job;
  await t.test("maintenance uses existing job workflow; inspection rejects unresolved damage", async () => {
    await transitionBooking({ bookingId: booking.id, toStatus: "COMPLETED", actorId: users.staff.id, actorRole: "LAB_STAFF" });
    const result = await request(app).post("/api/maintenance").set("Authorization", `Bearer ${tokens.staff}`).send({ resourceId: resource.id, title: "Repair cooling fan", startAt: new Date(Date.now() - 60000).toISOString(), endAt: new Date(Date.now() + 3660000).toISOString() });
    assert.equal(result.status, 201, JSON.stringify(result.body)); job = result.body;
    assert.equal((await command("staff", resource.id, { action: "BEGIN_MAINTENANCE", maintenanceId: job.id, reason })).status, 200);
    assert.equal((await prisma.resource.findUnique({ where: { id: resource.id } })).operationalStatus, "MAINTENANCE");
    for (const status of ["in_progress", "completed"]) assert.equal((await request(app).patch(`/api/maintenance/${job.id}`).set("Authorization", `Bearer ${tokens.staff}`).send({ status, changeReason: reason })).status, 200);
    assert.equal((await command("staff", resource.id, { action: "INSPECT", maintenanceId: job.id, reason })).status, 409);
    assert.equal((await command("staff", resource.id, { action: "PART", name: "Cooling fan", condition: "OK", reason })).status, 200);
    const incident = await prisma.incident.findFirst({ where: { resourceId: resource.id } });
    for (const action of ["triage", "investigate", "resolve"]) assert.equal((await request(app).post(`/api/incidents/${incident.id}/${action}`).set("Authorization", `Bearer ${tokens.staff}`).send(action === "resolve" ? { resolution: reason } : {})).status, 200);
    assert.equal((await command("staff", resource.id, { action: "INSPECT", maintenanceId: job.id, reason })).status, 200);
    assert.equal((await prisma.resource.findUnique({ where: { id: resource.id } })).operationalStatus, "AVAILABLE");
    assert.equal((await command("staff", resource.id, { action: "INSPECT", maintenanceId: job.id, reason })).status, 409);
  });
  await t.test("maintenance baseline cannot reset on configuration; due blocks handover", async () => {
    const servicedAt = new Date(Date.now() - 2 * 86400000);
    await prisma.resourceCareProfile.update({ where: { resourceId: resource.id }, data: { servicedAt, intervalDays: 1 } });
    assert.equal((await command("staff", resource.id, { action: "CONFIGURE", intervalDays: 1, intervalHours: 100, roomId: room.id, reason })).status, 200);
    assert.equal(+(await prisma.resourceCareProfile.findUnique({ where: { resourceId: resource.id } })).servicedAt, +servicedAt);
    const next = await prisma.booking.create({ data: { id: randomUUID(), resourceId: resource.id, requestedById: users.student.id, title: "Next session", purpose: "Testing", status: "CONFIRMED", startAt: new Date(), endAt: new Date(Date.now() + 3600000) } });
    await assert.rejects(transitionBooking({ bookingId: next.id, toStatus: "CHECKED_OUT", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionBefore: reason }), e => e.code === "RESOURCE_MAINTENANCE_DUE");
    const catalogue = await request(app).get(`/api/resources/${resource.id}`).set("Authorization", `Bearer ${tokens.staff}`);
    assert.equal(catalogue.status, 200); assert.equal(catalogue.body.availability.available, false);
  });
  await t.test("room capacity validates and scheduler persists exact end of allotted time", async () => {
    assert.equal((await command("staff", room.id, { action: "CONFIGURE", intervalDays: 30, intervalHours: null, roomId: null, reason })).status, 200);
    const b = await prisma.booking.create({ data: { id: randomUUID(), resourceId: room.id, requestedById: users.student.id, title: "Room session", purpose: "Testing", status: "CONFIRMED", startAt: new Date(), endAt: new Date(Date.now() + 3600000) } });
    await transitionBooking({ bookingId: b.id, toStatus: "CHECKED_OUT", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionBefore: reason });
    assert.equal((await command("staff", room.id, { action: "START", occupants: 6, reason })).status, 409);
    assert.equal((await command("staff", room.id, { action: "START", occupants: 3, reason })).status, 200);
    await enforceOperationLimits(prisma, new Date(+b.endAt + 1000));
    const session = await prisma.resourceOperation.findFirst({ where: { resourceId: room.id } });
    assert.equal(+session.endedAt, +b.endAt); assert.equal(session.loadPercent, 60); assert.equal(session.stopReason, "BOOKING_ENDED");
    const listed = await request(app).get("/api/resource-care").set("Authorization", `Bearer ${tokens.staff}`);
    assert.equal(listed.status, 200); assert.equal(listed.body.items.some(r => r.id === resource.id && r.care.due), true);
    const outside = await request(app).get("/api/resource-care").set("Authorization", `Bearer ${tokens.outsider}`);
    assert.deepEqual(outside.body.items, []);
    assert.ok(await prisma.systemAuditEvent.count({ where: { resourceId: resource.id, action: { startsWith: "RESOURCE_CARE_" } } }) >= 7);
    await assert.rejects(prisma.resourceOperation.create({ data: { id: randomUUID(), resourceId: room.id, bookingId: b.id, actorId: users.staff.id, loadPercent: 50, endedAt: null, activeResourceId: null } }));
  });
  await t.test("normal return stops the clock and preserves operating history", async () => {
    const machine = await prisma.resource.create({ data: { id: randomUUID(), code: `NORMAL-${marker}`, name: "Normal machine", category: "MACHINE", subtype: "OTHER", laboratoryId: lab.id, location: "Lab" } });
    const b = await prisma.booking.create({ data: { id: randomUUID(), resourceId: machine.id, requestedById: users.student.id, title: "Normal return", purpose: "Testing", status: "CONFIRMED", startAt: new Date(), endAt: new Date(Date.now() + 3600000) } });
    assert.equal((await command("staff", machine.id, { action: "CONFIGURE", intervalDays: 30, intervalHours: 100, roomId: null, reason })).status, 200);
    await transitionBooking({ bookingId: b.id, toStatus: "CHECKED_OUT", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionBefore: reason });
    assert.equal((await command("staff", machine.id, { action: "START", loadPercent: 60, reason })).status, 200);
    await transitionBooking({ bookingId: b.id, toStatus: "RETURNED", actorId: users.staff.id, actorRole: "LAB_STAFF", conditionAfter: reason });
    const session = await prisma.resourceOperation.findFirst({ where: { resourceId: machine.id } });
    assert.ok(session.endedAt); assert.equal(session.activeResourceId, null); assert.equal(session.stopReason, "STATUS_AVAILABLE");
    assert.equal((await prisma.resource.findUnique({ where: { id: machine.id } })).operationalStatus, "AVAILABLE");
  });
  await t.test("approaching usage limit notifies only assigned operators, once per cycle and stage", async () => {
    const machine = await prisma.resource.create({ data: { id: randomUUID(), code: `NOTICE-${marker}`, name: "Cycle resource", category: "MACHINE", subtype: "OTHER", laboratoryId: lab.id, location: "Lab" } });
    const servicedAt = new Date(Date.now() - 86400000);
    await prisma.resourceCareProfile.create({ data: { resourceId: machine.id, intervalUses: 10, warningPercent: 80, servicedAt } });
    const end = new Date(Date.now() - 60000), start = new Date(+end - 60000);
    for (let index = 0; index < 8; index++) await prisma.booking.create({ data: { id: randomUUID(), resourceId: machine.id, requestedById: users.student.id, title: "Recorded use", purpose: "Testing", status: "COMPLETED", startAt: start, endAt: end, actualStartAt: start, actualEndAt: end } });
    await Promise.all([dispatchMaintenanceNotices(prisma), dispatchMaintenanceNotices(prisma)]);
    const where = { messageParams: { path: ["resourceId"], equals: machine.id } };
    assert.equal(await prisma.notification.count({ where: { ...where, userId: users.staff.id, titleKey: "care.near.title" } }), 1);
    assert.equal(await prisma.notification.count({ where: { ...where, userId: users.admin.id, titleKey: "care.near.title" } }), 1);
    assert.equal(await prisma.notification.count({ where: { ...where, userId: { in: [users.outsider.id, users.student.id] } } }), 0);
    assert.equal((await request(app).get(`/api/resources/${machine.id}`)).body.availability.available, true);
    for (let index = 0; index < 2; index++) await prisma.booking.create({ data: { id: randomUUID(), resourceId: machine.id, requestedById: users.student.id, title: "Recorded use", purpose: "Testing", status: "COMPLETED", startAt: start, endAt: end, actualStartAt: start, actualEndAt: end } });
    await dispatchMaintenanceNotices(prisma);
    assert.equal(await prisma.notification.count({ where: { ...where, userId: users.staff.id, titleKey: "care.due.title" } }), 1);
    assert.equal((await request(app).get(`/api/resources/${machine.id}`)).body.availability.available, false);
    const body = { resourceId: machine.id, title: "Must not book overdue resource", purpose: "Testing", startAt: new Date(Date.now() + 3600000).toISOString(), endAt: new Date(Date.now() + 7200000).toISOString() };
    assert.equal((await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send(body)).status, 409);
    await prisma.resourceCareProfile.update({ where: { resourceId: machine.id }, data: { servicedAt: new Date() } });
    const list = (await request(app).get("/api/resource-care").set("Authorization", `Bearer ${tokens.staff}`)).body.items.find(r => r.id === machine.id);
    assert.equal(list.sinceService.uses, 0); assert.equal(list.care.due, false);
  });
  await t.test("valid bookings confirm automatically; overlapping concurrent requests cannot both succeed", async () => {
    const machine = await prisma.resource.create({ data: { id: randomUUID(), code: `AUTO-${marker}`, name: "Auto resource", category: "EQUIPMENT", subtype: "OTHER", laboratoryId: lab.id, location: "Lab", requiresApproval: true } });
    const startAt = new Date(Math.ceil(Date.now() / 60000) * 60000 + 3600000), endAt = new Date(+startAt + 3600000);
    const body = { resourceId: machine.id, title: "Automatically confirmed", purpose: "Testing", startAt: startAt.toISOString(), endAt: endAt.toISOString() };
    const results = await Promise.all([request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send(body), request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send(body)]);
    assert.deepEqual(results.map(r => r.status).sort(), [201,409]);
    const accepted = results.find(r => r.status === 201).body;
    assert.equal(accepted.status, "CONFIRMED"); assert.ok(accepted.approvedAt); assert.equal(accepted.approvedById, null);
    assert.equal((await request(app).get(`/api/resources/${machine.id}`)).body.effectiveRequiresApproval, false);
    await prisma.maintenanceWindow.create({ data: { id: randomUUID(), resourceId: machine.id, title: "Scheduled service", startAt: new Date(+endAt + 60000), endAt: new Date(+endAt + 3660000) } });
    const blocked = await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send({ ...body, startAt: new Date(+endAt + 60000).toISOString(), endAt: new Date(+endAt + 3660000).toISOString() });
    assert.equal(blocked.status, 409);
    await prisma.resource.update({where:{id:machine.id},data:{bookingState:"non_bookable"}});
    const closed = await request(app).post("/api/bookings").set("Authorization",`Bearer ${tokens.student}`).send({...body,startAt:new Date(+endAt+2*3600000).toISOString(),endAt:new Date(+endAt+3*3600000).toISOString()});
    assert.equal(closed.status,409);
  });
  await t.test("tariff edit is admin-only, quote versions protect price snapshots and duration limits", async () => {
    const machine = await prisma.resource.create({ data: { id: randomUUID(), code: `RATE-${marker}`, name: "Priced resource", category: "MACHINE", subtype: "GPU_SERVER", laboratoryId: lab.id, location: "Lab" } });
    const put = (name, hourlyRateVnd) => request(app).put(`/api/booking-pricing/${machine.id}/tariff`).set("Authorization", `Bearer ${tokens[name]}`).send({ hourlyRateVnd, maxBookingMinutes: 120 });
    assert.equal((await put("student", 180000)).status, 403); assert.equal((await put("staff", 180000)).status, 403);
    assert.equal((await put("admin", 180000)).status, 200);
    config.paymentsEnabled = true;
    try {
      const startAt = new Date(Math.ceil(Date.now() / 60000) * 60000 + 3600000), endAt = new Date(+startAt + 3600000);
      const body = { resourceId: machine.id, title: "Paid rental", purpose: "Testing", purposeCode: "STUDY", startAt: startAt.toISOString(), endAt: endAt.toISOString() };
      const quote = (await request(app).post("/api/booking-pricing/quote").send({ resourceId: machine.id, purposeCode: "STUDY", startAt: body.startAt, endAt: body.endAt })).body;
      assert.equal(quote.amountVnd, 180000);
      const created = await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send({ ...body, acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version } });
      assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.status, "PENDING_APPROVAL");
      assert.equal(created.body.approvedAt, null, "A priced reservation cannot confirm before payment verification");
      assert.equal(Date.parse(created.body.paymentDueAt) - Date.parse(created.body.createdAt), 15 * 60000);
      assert.equal((await prisma.paymentTransaction.findFirst({ where: { bookingId: created.body.id } })).status, "pending");
      assert.equal((await put("admin", 200000)).status, 200);
      assert.equal((await prisma.booking.findUnique({ where: { id: created.body.id } })).feeAmountVnd, 180000);
      const stale = await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send({ ...body, startAt: new Date(+endAt + 60000).toISOString(), endAt: new Date(+endAt + 3660000).toISOString(), acceptedQuote: { amountVnd: quote.amountVnd, version: quote.version } });
      assert.equal(stale.status, 409); assert.equal(stale.body.error.code, "PRICING_CHANGED");
      const tooLong = await request(app).post("/api/booking-pricing/quote").send({ resourceId: machine.id, purposeCode: "STUDY", startAt: body.startAt, endAt: new Date(+startAt + 3 * 3600000).toISOString() });
      assert.equal(tooLong.status, 400); assert.equal(tooLong.body.error.code, "RESOURCE_DURATION_LIMIT");
    } finally { config.paymentsEnabled = false; }
  });
  await t.test("calendar uses Vietnam slot instants; staff moving keeps duration and revalidates conflicts", async () => {
    const machine = await prisma.resource.create({ data: { id: randomUUID(), code: `MOVE-${marker}`, name: "Calendar resource", category: "EQUIPMENT", subtype: "OTHER", laboratoryId: lab.id, location: "Lab" } });
    const tomorrow = new Date(Date.now() + 7*3600000 + 86400000).toISOString().slice(0,10);
    const startAt = new Date(`${tomorrow}T09:00:00+07:00`), endAt = new Date(+startAt + 3600000);
    const created = (await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens.student}`).send({ resourceId: machine.id, title: "Move booking", purpose: "Testing", startAt: startAt.toISOString(), endAt: endAt.toISOString() })).body;
    assert.ok(created.id);
    const slots = (await request(app).get(`/api/calendar/slots?resource_id=${machine.id}&start_date=${tomorrow}`)).body;
    const dayIndex = slots.daysHeader.findIndex(day => day.fullDate === tomorrow);
    assert.equal(slots.grid.find(row => row.hour === 9).days[dayIndex].status, "booked");
    assert.equal(slots.grid.find(row => row.hour === 10).days[dayIndex].status, "available");
    const moving = { startAt: new Date(+startAt + 2*3600000).toISOString(), endAt: new Date(+endAt + 2*3600000).toISOString(), expectedStartAt: startAt.toISOString(), reason };
    const post = name => request(app).post(`/api/bookings/${created.id}/reschedule`).set("Authorization", `Bearer ${tokens[name]}`).send(moving);
    assert.equal((await post("student")).status,403); assert.equal((await post("outsider")).status,403);
    const moved = await post("staff"); assert.equal(moved.status,200,JSON.stringify(moved.body)); assert.equal(moved.body.startAt,moving.startAt);
    const stale = await post("staff"); assert.equal(stale.status,409); assert.equal(stale.body.error.code,"BOOKING_CHANGED");
    await prisma.maintenanceWindow.create({data:{id:randomUUID(),resourceId:machine.id,title:"Blocked move",startAt:new Date(+startAt+4*3600000),endAt:new Date(+endAt+4*3600000)}});
    const conflict = await request(app).post(`/api/bookings/${created.id}/reschedule`).set("Authorization",`Bearer ${tokens.staff}`).send({ ...moving, expectedStartAt:moving.startAt, startAt:new Date(+startAt+4*3600000).toISOString(), endAt:new Date(+endAt+4*3600000).toISOString() });
    assert.equal(conflict.status,409);
    assert.equal((await prisma.booking.findUnique({where:{id:created.id}})).feeAmountVnd,0);
    assert.equal((await prisma.booking.findUnique({where:{id:created.id}})).startAt.toISOString(),moving.startAt);
    assert.equal(await prisma.systemAuditEvent.count({where:{targetId:created.id,action:"BOOKING_RESCHEDULED"}}),1);
  });
  await t.test("automatic confirmation applies to every resource category and authenticated role", async () => {
    for (const category of ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"]) {
      const item = await prisma.resource.create({ data: { id: randomUUID(), code: `AUTO-${category}-${marker}`, name: category, category, subtype: category === "ROOM" ? "ROOM" : "OTHER", laboratoryId: lab.id, location: "Lab", requiresApproval: true } });
      for (const [index, actor] of ["student", "lecturer", "staff", "admin"].entries()) {
        const start = new Date(Date.now() + (index + 1) * 3600000);
        const result = await request(app).post("/api/bookings").set("Authorization", `Bearer ${tokens[actor]}`).send({ resourceId: item.id, title: "Automatic cross-system booking", purpose: "Testing", startAt: start.toISOString(), endAt: new Date(+start + 1800000).toISOString() });
        assert.equal(result.status, 201, JSON.stringify(result.body));
        assert.equal(result.body.status, "CONFIRMED");
        assert.ok(result.body.approvedAt); assert.equal(result.body.approvedById, null);
      }
    }
  });
  await t.test("future reservations and maintenance block their interval, not the whole catalogue", async () => {
    const item = await prisma.resource.create({ data: { id: randomUUID(), code: `WINDOW-${marker}`, name: "Interval resource", category: "EQUIPMENT", subtype: "OTHER", laboratoryId: lab.id, location: "Lab", requiresApproval: true } });
    const start = new Date(Date.now() + 86400000), end = new Date(+start + 3600000);
    await prisma.maintenanceWindow.create({ data: { id: randomUUID(), resourceId: item.id, title: "Future maintenance", startAt: start, endAt: end } });
    const catalogue = await request(app).get(`/api/resources/${item.id}`);
    assert.equal(catalogue.body.availability.available, true);
    assert.equal(catalogue.body.requiresApproval, false); assert.equal(catalogue.body.effectiveRequiresApproval, false);
    const occupied = await request(app).get(`/api/resources/${item.id}/schedule`).query({ from: start.toISOString(), to: end.toISOString() });
    assert.equal(occupied.status, 200); assert.equal(occupied.body.resource.availability.available, false);
    const boundary = await request(app).get(`/api/resources/${item.id}/schedule`).query({ from: end.toISOString(), to: new Date(+end + 3600000).toISOString() });
    assert.equal(boundary.body.resource.availability.available, true);
    await prisma.booking.create({ data: { id: randomUUID(), resourceId: item.id, requestedById: users.student.id, title: "Future confirmed booking", purpose: "Testing", status: "CONFIRMED", startAt: new Date(+end + 3600000), endAt: new Date(+end + 7200000) } });
    assert.equal((await request(app).get(`/api/resources/${item.id}`)).body.availability.available, true);
    const booked = await request(app).get(`/api/resources/${item.id}/schedule`).query({ from: new Date(+end + 3600000).toISOString(), to: new Date(+end + 7200000).toISOString() });
    assert.equal(booked.body.resource.availability.source, "booking");
    await prisma.laboratory.update({ where: { id: lab.id }, data: { isActive: false } });
    try {
      const closed = (await request(app).get(`/api/resources/${item.id}`)).body;
      assert.equal(closed.availability.available, false); assert.equal(closed.availability.source, "booking_policy");
      const date = new Date(Date.now() + 7*3600000 + 86400000).toISOString().slice(0,10);
      const grid = (await request(app).get(`/api/calendar/slots?resource_id=${item.id}&start_date=${date}`)).body.grid;
      assert.ok(grid.every(row => row.days.every(slot => slot.status === "offline")));
    } finally { await prisma.laboratory.update({ where: { id: lab.id }, data: { isActive: true } }); }
  });
  await t.test("assistant uses automatic confirmation and the same maintenance and duration checks", async () => {
    const { assistantTools } = await import("../src/assistant/toolHandlers.js");
    const call = (name, input) => assistantTools.find(tool => tool.name === name).handler(input, users.student);
    const item = await prisma.resource.create({ data: { id: randomUUID(), code: `AI-${marker}`, name: "Assistant resource", category: "MACHINE", subtype: "OTHER", laboratoryId: lab.id, location: "Lab", requiresApproval: true, maxBookingMinutes: 60 } });
    assert.equal((await call("get_resource_detail", { resourceId: item.id })).resource.requiresApproval, false);
    assert.equal((await call("check_user_eligibility", { resourceId: item.id })).requiresApproval, false);
    const from = new Date(Date.now() + 86400000), to = new Date(+from + 4 * 3600000);
    const valid = await call("find_available_slots", { resourceId: item.id, from: from.toISOString(), to: to.toISOString(), durationMinutes: 30, limit: 1 });
    assert.equal(valid.slots.length, 1); assert.equal(valid.slots[0].requiresApproval, false);
    assert.equal((await call("find_available_slots", { resourceId: item.id, from: from.toISOString(), to: to.toISOString(), durationMinutes: 120, limit: 1 })).slots.length, 0);
    await prisma.resourceCareProfile.create({ data: { resourceId: item.id, intervalDays: 1, servicedAt: new Date(Date.now() - 2 * 86400000) } });
    const eligibility = await call("check_user_eligibility", { resourceId: item.id });
    assert.equal(eligibility.bookable, false); assert.equal(eligibility.careReason, "RESOURCE_MAINTENANCE_DUE");
    assert.equal((await call("check_booking_conflicts", { resourceId: item.id, startAt: from.toISOString(), endAt: new Date(+from + 1800000).toISOString() })).available, false);
    assert.equal((await call("find_available_slots", { resourceId: item.id, from: from.toISOString(), to: to.toISOString(), durationMinutes: 30, limit: 1 })).slots.length, 0);
  });
});

