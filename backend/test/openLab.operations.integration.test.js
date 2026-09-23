import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";

const target = new URL(process.env.DATABASE_URL || "http://missing");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, "15436");
assert.match(target.pathname, /^\/lab_resources_open_lab_test_[a-z0-9_]+$/);
Object.assign(process.env, { NODE_ENV: "test", JWT_SECRET: "open-lab-isolated-test-secret-only", LOG_FORMAT: "dev", PAYMENTS_ENABLED: "false", MCP_ASSISTANT_ENABLED: "false", RATE_LIMIT_MAX: "5000" });
const [{ createApp }, { prisma }] = await Promise.all([import("../src/app.js"), import("../src/db.js")]);
const http = request(createApp());
const roles = { admin: "ADMIN", staff: "LAB_STAFF", foreign: "LAB_STAFF", owner: "STUDENT", other: "LECTURER" };
const auth = who => ({ Authorization: `Bearer ${jwt.sign({ sub: who, role: roles[who] }, process.env.JWT_SECRET, { algorithm: "HS256" })}` });
let roomBooking;

test.before(async () => {
  assert.equal(await prisma.user.count(), 0, "Requires a new empty isolated database");
  for (const [id, role] of Object.entries(roles)) await prisma.user.create({ data: { id, role, email: `${id}@test.invalid`, fullName: id, passwordHash: "unusable-fixture-hash" } });
  await prisma.campus.create({ data: { id: "campus", code: "C", name: "Test campus" } });
  await prisma.building.create({ data: { id: "building", code: "B", name: "Test building", campusId: "campus" } });
  await prisma.laboratory.create({ data: { id: "lab", code: "L", name: "Test lab", buildingId: "building", labPolicy: { create: { id: "policy", allowWeekend: true, workDayStartHour: 0, workDayEndHour: 24 } } } });
  await prisma.userLabAssignment.create({ data: { userId: "staff", laboratoryId: "lab" } });
  for (const [id, category] of [["room", "ROOM"], ["equipment", "EQUIPMENT"], ["broken", "ROOM"]]) {
    await prisma.resource.create({ data: { id, code: id, name: id, laboratoryId: "lab", category, subtype: category === "ROOM" ? "ROOM" : "OTHER", location: "test", requiresApproval: true } });
  }
});
test.after(async () => prisma.$disconnect());

async function create(resourceId) {
  const startAt = new Date(Date.now() + 3600000).toISOString();
  const endAt = new Date(Date.now() + 7200000).toISOString();
  const response = await http.post("/api/bookings").set(auth("owner")).send({ resourceId, title: "Open LAB test", purpose: "test", startAt, endAt });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}
async function checkout(booking) {
  assert.equal((await http.post(`/api/bookings/${booking.id}/approve`).set(auth("admin")).send({})).status, 200);
  assert.equal((await http.post(`/api/bookings/${booking.id}/check-out`).set(auth("staff")).send({ conditionBefore: "Test evidence before" })).status, 200);
}

test("booking events reach admin and assigned staff, not unrelated staff", async () => {
  roomBooking = await create("room");
  const rows = await prisma.notification.findMany({ where: { messageParams: { path: ["event"], equals: "REQUEST" } } });
  assert.deepEqual(rows.map(row => row.userId).sort(), ["admin", "staff"]);
  await checkout(roomBooking);
  for (const userId of ["admin", "staff", "owner"]) {
    assert.ok(await prisma.notification.findFirst({ where: { userId, messageParams: { path: ["event"], equals: "CHECKED_OUT" } } }));
  }
});

test("owner ROOM self-return validates ownership/evidence, releases slot, keeps planned times and dedupes retries", async () => {
  const path = `/api/bookings/${roomBooking.id}/self-return`;
  assert.equal((await http.post(path).set(auth("other")).send({ conditionAfter: "ok" })).status, 404);
  assert.equal((await http.post(path).set(auth("owner")).send({ conditionAfter: " " })).status, 400);
  const results = await Promise.all([1, 2].map(() => http.post(path).set(auth("owner")).send({ conditionAfter: "Room vacated, intact" })));
  for (const result of results) {
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.status, "COMPLETED");
    assert.equal(result.body.endAt, roomBooking.endAt);
  }
  assert.equal((await prisma.resource.findUnique({ where: { id: "room" } })).operationalStatus, "AVAILABLE");
  const logs = await prisma.usageLog.findMany({ where: { bookingId: roomBooking.id, action: { in: ["RETURN", "COMPLETE"] } } });
  assert.equal(logs.length, 2);
  assert.ok(logs.every(log => log.userId === "owner" && log.metadata.selfReturn));
  const notifications = await prisma.notification.findMany({ where: { messageParams: { path: ["event"], equals: "SELF_RETURN" } } });
  assert.deepEqual(notifications.map(row => row.userId).sort(), ["admin", "owner", "staff"]);
  // A second booking can now reserve the same planned interval.
  assert.equal((await http.post("/api/bookings").set(auth("other")).send({ resourceId: "room", title: "Next user", purpose: "test", startAt: roomBooking.startAt, endAt: roomBooking.endAt })).status, 201);
});

test("equipment cannot self-return; ROOM self-return never restores a broken resource", async () => {
  const equipment = await create("equipment");
  await checkout(equipment);
  assert.equal((await http.post(`/api/bookings/${equipment.id}/self-return`).set(auth("owner")).send({ conditionAfter: "posted" })).status, 403);
  assert.equal((await prisma.booking.findUnique({ where: { id: equipment.id } })).status, "CHECKED_OUT");
  const broken = await create("broken");
  await checkout(broken);
  await prisma.resource.update({ where: { id: "broken" }, data: { operationalStatus: "BROKEN" } });
  const result = await http.post(`/api/bookings/${broken.id}/self-return`).set(auth("owner")).send({ conditionAfter: "Already reported damage" });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, "COMPLETED");
  assert.ok(result.body.physicalStateWarning);
  assert.equal((await prisma.resource.findUnique({ where: { id: "broken" } })).operationalStatus, "BROKEN");
});
