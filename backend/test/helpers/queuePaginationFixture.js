import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export function configureQueueTestEnvironment() {
  const url = new URL(process.env.QUEUE_TEST_DATABASE_URL || "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lab_resources_queue_pagination_test", "Only the isolated queue test database is allowed");
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "queue-pagination-isolated-test-secret";
  process.env.PAYMENTS_ENABLED = "false";
  process.env.REMINDER_SCHEDULER_ENABLED = "false";
  process.env.LOG_FORMAT = "dev";
  process.env.RATE_LIMIT_MAX = "10000";
  process.env.CORS_ORIGINS = "http://127.0.0.1:15185";
}

export async function seedQueueFixture(db) {
  const [{ name }] = await db.$queryRaw`SELECT current_database() AS name`;
  assert.equal(name, "lab_resources_queue_pagination_test");
  assert.equal(await db.user.count(), 0, "Use a fresh isolated database; never overwrite existing users");
  const id = randomUUID;
  const campus = await db.campus.create({ data: { id: id(), code: "QUEUE-TEST", name: "Queue test campus" } });
  const building = await db.building.create({ data: { id: id(), campusId: campus.id, code: "QUEUE-TEST", name: "Test building" } });
  const labs = {}, resources = {}, users = {};
  for (const scope of ["assigned", "foreign"]) {
    labs[scope] = await db.laboratory.create({ data: { id: id(), buildingId: building.id, code: scope, name: scope } });
    resources[scope] = await db.resource.create({ data: { id: scope === "assigned" ? "queue-assigned-resource" : id(), laboratoryId: labs[scope].id, code: scope, name: scope, category: "EQUIPMENT", subtype: "OTHER", location: "TEST" } });
  }
  const password = "QueueTest!2026";
  const passwordHash = await bcrypt.hash(password, 4);
  for (const [name, role] of Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", foreignStaff: "LAB_STAFF", unassigned: "LAB_STAFF", student: "STUDENT", otherStudent: "STUDENT", lecturer: "LECTURER", inactive: "ADMIN" })) {
    users[name] = await db.user.create({ data: { id: id(), email: `${name.toLowerCase()}@queue.test`, fullName: `Queue ${name}`, role, isActive: name !== "inactive", passwordHash } });
  }
  await db.userLabAssignment.createMany({ data: [
    { userId: users.staff.id, laboratoryId: labs.assigned.id },
    { userId: users.foreignStaff.id, laboratoryId: labs.foreign.id }
  ] });
  const bookings = [];
  let serial = 0;
  function booking(status, owner, resource, count, recent = false) {
    for (let i = 0; i < count; i++) {
      const startAt = new Date(Date.parse(recent ? "2026-09-01T00:00:00Z" : "2026-08-01T00:00:00Z") + serial++ * 3600000);
      bookings.push({ id: id(), resourceId: resource.id, requestedById: owner.id, title: `${status} ${i + 1}`, purpose: "Isolated pagination fixture", status, startAt, endAt: new Date(startAt.getTime() + 1800000), createdAt: new Date("2026-07-01T00:00:00Z") });
    }
  }
  booking("COMPLETED", users.student, resources.assigned, 110, true);
  booking("PENDING_APPROVAL", users.student, resources.assigned, 25);
  booking("CONFIRMED", users.otherStudent, resources.assigned, 7);
  booking("CHECKED_OUT", users.student, resources.assigned, 7);
  booking("RETURNED", users.lecturer, resources.assigned, 7);
  booking("PENDING_APPROVAL", users.otherStudent, resources.foreign, 4);
  await db.booking.createMany({ data: bookings });
  const incidents = [];
  for (const [status, count, scope, recent] of [["closed", 55, "assigned", true], ["reported", 25, "assigned", false], ["verified", 2, "assigned", true], ["reported", 4, "foreign", false]]) {
    for (let i = 0; i < count; i++) incidents.push({ id: id(), resourceId: resources[scope].id, reportedById: users[scope === "assigned" ? "student" : "otherStudent"].id, status, severity: "high", title: `${scope} ${status} ${i + 1}`, description: "Isolated pagination fixture", detectedAt: new Date(recent ? "2026-09-01T00:00:00Z" : "2026-08-01T00:00:00Z"), createdAt: new Date("2026-07-01T00:00:00Z") });
  }
  await db.incident.createMany({ data: incidents });
  return { users, resources, labs, bookings, incidents, password };
}
