import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { configureQueueTestEnvironment, seedQueueFixture } from "./helpers/queuePaginationFixture.js";

configureQueueTestEnvironment();
const [{ createApp }, { prisma }] = await Promise.all([import("../src/app.js"), import("../src/db.js")]);
const app = createApp();
let fixture;
const auth = name => ({ Authorization: `Bearer ${jwt.sign({ sub: fixture.users[name].id }, process.env.JWT_SECRET)}` });
const get = (path, name = "staff") => request(app).get(`/api${path}`).set(auth(name));
test.before(async () => { fixture = await seedQueueFixture(prisma); });
test.after(async () => { await prisma.$disconnect(); });

test("legacy reads retain arrays and caps; paginated reads reach records beyond both caps", async () => {
  const legacyBookings = await get("/bookings"), legacyIncidents = await get("/incidents");
  assert.equal(legacyBookings.body.length, 100);
  assert.equal(legacyIncidents.body.length, 50);
  assert.ok(legacyBookings.body.every(row => row.status === "COMPLETED"));
  assert.ok(legacyIncidents.body.every(row => row.status !== "reported"));
  for (const [path, total, count] of [["/bookings", 156, 8], ["/incidents", 82, 5]]) {
    const ids = [];
    for (let page = 1; page <= count; page++) {
      const response = await get(`${path}?page=${page}&pageSize=20`);
      assert.equal(response.status, 200);
      assert.equal(response.body.pagination.total, total);
      assert.equal(response.body.pagination.totalPages, count);
      ids.push(...response.body.items.map(row => row.id));
    }
    assert.equal(ids.length, total);
    assert.equal(new Set(ids).size, total, "Equal timestamps must not duplicate or skip records across pages");
  }
});

test("server filtering and full scoped totals include old pending, overdue, history and open incidents", async () => {
  for (const [filter, total] of [["PENDING_APPROVAL", 25], ["CONFIRMED", 7], ["CHECKED_OUT", 7], ["RETURNED", 7], ["HISTORY", 110]]) {
    const response = await get(`/bookings?page=1&pageSize=5&filter=${filter}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, total);
    assert.equal(response.body.summary.total, 156);
    assert.equal(response.body.summary.byStatus.PENDING_APPROVAL, 25);
    assert.equal(response.body.summary.overdue, 7);
    assert.ok(response.body.items.every(row => row.status === (filter === "HISTORY" ? "COMPLETED" : filter)));
    const dates = response.body.items.map(row => filter === "CHECKED_OUT" ? row.endAt : row.startAt);
    if (filter !== "HISTORY") assert.deepEqual(dates, [...dates].sort());
  }
  const open = await get("/incidents?page=2&pageSize=20&filter=OPEN");
  assert.equal(open.body.items.length, 5);
  assert.equal(open.body.pagination.total, 25);
  assert.equal(open.body.summary.total, 82);
  assert.equal(open.body.summary.open, 25);
  assert.equal(open.body.summary.resolved, 57, "Verified belongs to resolved/history");
  assert.ok(open.body.items.every(row => row.status === "reported"));
  const done = await get("/incidents?page=1&filter=RESOLVED");
  assert.equal(done.body.pagination.total, 57);
});

test("all pages and summaries enforce admin, staff lab assignment, owner and current account checks", async () => {
  for (const [path, total, own] of [["/bookings", 160, 142], ["/incidents", 86, 82]]) {
    const admin = await get(`${path}?page=2`, "admin");
    assert.equal(admin.body.summary.total, total);
    const unassigned = await get(`${path}?page=1`, "unassigned");
    assert.equal(unassigned.status, 200); assert.equal(unassigned.body.summary.total, 0); assert.deepEqual(unassigned.body.items, []);
    const student = await get(`${path}?page=2`, "student");
    assert.equal(student.body.summary.total, own);
    assert.ok(student.body.items.every(row => (row.requestedById || row.reportedById) === fixture.users.student.id));
    const lecturer = await get(`${path}?page=1`, "lecturer");
    assert.equal(lecturer.body.summary.total, path === "/bookings" ? 7 : 0);
    assert.equal((await request(app).get(`/api${path}?page=1`)).status, 401);
    assert.equal((await get(`${path}?page=1`, "inactive")).status, 401);
    const foreign = await get(`${path}?page=1&resourceId=${fixture.resources.foreign.id}`);
    if (path === "/bookings") assert.equal(foreign.status, 403);
    else { assert.equal(foreign.body.pagination.total, 0); assert.equal(foreign.body.summary.total, 0); }
  }
  const old = fixture.bookings.find(row => row.status === "PENDING_APPROVAL");
  assert.equal((await get(`/bookings/${old.id}`)).status, 200);
  assert.equal((await get(`/bookings/${old.id}`, "otherStudent")).status, 404);
  await prisma.userLabAssignment.delete({ where: { userId_laboratoryId: { userId: fixture.users.staff.id, laboratoryId: fixture.labs.assigned.id } } });
  for (const path of ["/bookings", "/incidents"]) assert.equal((await get(`${path}?page=2`)).body.summary.total, 0);
  await prisma.userLabAssignment.create({ data: { userId: fixture.users.staff.id, laboratoryId: fixture.labs.assigned.id } });
});

test("invalid, unbounded and forged query fields fail; empty pages retain truthful totals", async () => {
  for (const path of ["/bookings", "/incidents"]) {
    for (const query of ["page=0", "page=-1", "page=1.5", "page=wat", "page=1000001", "page=1&pageSize=101", "page=1&pageSize=0", "page=1&pageSize=1.5", "page=1&filter=bad", "page=1&status=bad", "page=1&userId=someone", "page=1&laboratoryId=someone", "page=1&page=2"]) {
      const response = await get(`${path}?${query}`);
      assert.equal(response.status, 400, query); assert.equal(response.body.error.code, "VALIDATION_ERROR");
    }
    const beyond = await get(`${path}?page=1000`);
    assert.equal(beyond.status, 200); assert.deepEqual(beyond.body.items, []); assert.ok(beyond.body.pagination.total > 0);
  }
  const severity = await get("/incidents?page=1&severity=low");
  assert.equal(severity.body.summary.total, 0);
});

test("legacy booking filters validate canonical statuses and both read contracts accept persisted text IDs", async () => {
  for (const query of ["status=unknown", "status=confirmed&status=returned", "resourceId=one&resourceId=two"]) {
    const response = await get(`/bookings?${query}`);
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  }
  const id = fixture.resources.assigned.id;
  const legacy = await get(`/bookings?status=pending_approval&resourceId=${id}&_=123&take=1`);
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.length, 25);
  assert.ok(legacy.body.every(row => row.status === "PENDING_APPROVAL" && row.resourceId === id));
  for (const [path, total] of [["/bookings", 156], ["/incidents", 82]]) {
    const page = await get(`${path}?page=1&resourceId=${id}`);
    assert.equal(page.status, 200); assert.equal(page.body.pagination.total, total);
    const foreign = await get(`${path}?page=1&resourceId=${id}`, "foreignStaff");
    assert.equal(foreign.status, path === "/bookings" ? 403 : 200);
    if (path === "/incidents") assert.equal(foreign.body.summary.total, 0);
  }
  const owner = await get(`/bookings?requestedById=${fixture.users.otherStudent.id}`, "student");
  assert.ok(owner.body.every(row => row.requestedById === fixture.users.student.id));
});

test("historical queues follow current resource lab and fail closed for an unassigned resource", async () => {
  const resourceId = fixture.resources.assigned.id;
  try {
    for (const laboratoryId of [fixture.labs.foreign.id, null]) {
      await prisma.resource.update({ where: { id: resourceId }, data: { laboratoryId } });
      for (const path of ["/bookings", "/incidents"]) {
        const staff = await get(`${path}?page=1`);
        assert.equal(staff.status, 200);
        assert.equal(staff.body.summary.total, 0);
        const admin = await get(`${path}?page=1`, "admin");
        assert.equal(admin.body.summary.total, path === "/bookings" ? 160 : 86);
        const receivingStaff = await get(`${path}?page=1`, "foreignStaff");
        assert.equal(receivingStaff.body.summary.total, laboratoryId ? (path === "/bookings" ? 160 : 86) : 4);
      }
    }
  } finally {
    await prisma.resource.update({ where: { id: resourceId }, data: { laboratoryId: fixture.labs.assigned.id } });
  }
});
