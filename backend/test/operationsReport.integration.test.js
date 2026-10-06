import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";

const url = new URL(process.env.OPERATIONS_REPORT_TEST_DATABASE_URL || "");
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
assert.equal(url.pathname, "/lab_resources_assistant_test", "Refuse writes outside the existing isolated test database");
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: "test", LOG_FORMAT: "dev", JWT_SECRET: "operations-report-test-secret-at-least-32-characters", REMINDER_SCHEDULER_ENABLED: "false", OPENAI_API_KEY: "", OPENAI_MODEL: "", PAYMENTS_ENABLED: "false", RATE_LIMIT_MAX: "10000" });
const [{ createApp }, { prisma }, { buildOperationsReport }] = await Promise.all([import("../src/app.js"), import("../src/db.js"), import("../src/services/operationsReportService.js")]);
const app = createApp(), marker = randomUUID(), ids = {}, now = new Date();
const at = minutes => new Date(now.getTime() + minutes * 60000);
const users = {};
const auth = name => ({ Authorization: `Bearer ${jwt.sign({ sub: users[name].id }, process.env.JWT_SECRET, { expiresIn: "1h" })}` });

test.before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS name, current_setting('server_version') AS version`;
  assert.equal(identity.name, "lab_resources_assistant_test"); assert.match(identity.version, /^16\./);
  for (const key of ["campus", "building", "lab", "foreignLab", "resource", "unused", "foreign"]) ids[key] = randomUUID();
  await prisma.campus.create({ data: { id: ids.campus, code: `OR-${marker}`, name: "Isolated report test" } });
  await prisma.building.create({ data: { id: ids.building, campusId: ids.campus, code: `OR-${marker}`, name: "Isolated report test" } });
  for (const key of ["lab", "foreignLab"]) await prisma.laboratory.create({ data: { id: ids[key], buildingId: ids.building, code: `OR-${key}-${marker}`, name: `Isolated ${key}` } });
  for (const [key, role] of Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", unassigned: "LAB_STAFF", lecturer: "LECTURER", student: "STUDENT", inactive: "ADMIN" })) {
    users[key] = await prisma.user.create({ data: { id: randomUUID(), email: `or-${key}-${marker}@example.test`, fullName: `Isolated ${key}`, role, isActive: key !== "inactive", passwordHash: "unused-test-hash" } });
  }
  await prisma.userLabAssignment.create({ data: { userId: users.staff.id, laboratoryId: ids.lab } });
  for (const key of ["resource", "unused", "foreign"]) await prisma.resource.create({ data: { id: ids[key], code: `OR-${key}-${marker}`, name: `Isolated ${key}`, subtype: "OTHER", category: "ROOM", location: "Test", laboratoryId: key === "foreign" ? ids.foreignLab : ids.lab } });
  const booking = (status, start, end, extra = {}) => ({ id: randomUUID(), resourceId: ids.resource, requestedById: users.student.id, title: "Isolated report fixture", purpose: "Verification", status, startAt: at(start), endAt: at(end), ...extra });
  await prisma.booking.createMany({ data: [
    booking("CHECKED_OUT", -40*1440, -40*1440+60, { actualStartAt: at(-120) }),
    booking("COMPLETED", -10*1440, -10*1440+60, { actualStartAt: at(-10*1440+10), actualEndAt: at(-10*1440+40) }),
    booking("COMPLETED", -8*1440, -6*1440, { actualStartAt: at(-8*1440), actualEndAt: at(-6*1440) }),
    booking("COMPLETED", -7*1440-60, -7*1440, { actualStartAt: at(-7*1440-60), actualEndAt: at(-7*1440) }),
    booking("PENDING_APPROVAL", -300, -270),
    booking("CANCELLED", -240, -210),
    booking("CANCELLED", -180, -150, { outcome: "NO_SHOW", outcomeAt: at(-150) }),
    ...Array.from({ length: 25 }, (_, index) => booking("CONFIRMED", 1440+index*60, 1470+index*60)),
    booking("COMPLETED", -120, -90, { resourceId: ids.foreign, actualStartAt: at(-120), actualEndAt: at(-90) })
  ] });
  await prisma.incident.createMany({ data: [
    { id: randomUUID(), resourceId: ids.resource, title: "Old open", description: "Isolated", status: "reported", detectedAt: at(-40*1440) },
    { id: randomUUID(), resourceId: ids.resource, title: "Recent resolved", description: "Isolated", status: "resolved", detectedAt: at(-1440), resolvedAt: at(-60) },
    { id: randomUUID(), resourceId: ids.foreign, title: "Foreign", description: "Isolated", status: "reported", detectedAt: at(-60) }
  ] });
  await prisma.maintenanceWindow.createMany({ data: [
    { id: randomUUID(), resourceId: ids.unused, title: "Planned only", startAt: at(-60), endAt: at(60) },
    { id: randomUUID(), resourceId: ids.unused, title: "Cancelled", startAt: at(-180), endAt: at(-120), status: "cancelled" }
  ] });
});

test("7/30-day report clips actual intervals independently of planned dates and excludes pending/cancelled schedules", async () => {
  const week = await buildOperationsReport(prisma, users.staff, { days: 7, now });
  if (process.env.OPERATIONS_REPORT_FIXTURE_OUTPUT) writeFileSync(process.env.OPERATIONS_REPORT_FIXTURE_OUTPUT, JSON.stringify(week, null, 2));
  assert.equal(week.source, "database"); assert.equal(week.summary.resourceCount, 2);
  assert.equal(week.summary.actualUsageMinutes, 1560); assert.equal(week.summary.scheduledMinutes, 1440);
  assert.equal(week.summary.cancelledCount, 2); assert.equal(week.summary.noShowCount, 1);
  assert.equal(week.summary.endedSessionCount, 2); assert.equal(week.summary.usedResourceCount, 1);
  assert.equal(week.summary.incidentCount, 1); assert.equal(week.summary.openIncidentCount, 1);
  assert.equal(week.summary.plannedMaintenanceMinutes, 60); assert.equal(week.basis.maintenance, "PLANNED_WINDOWS");
  assert.equal(week.resources[0].id, ids.resource); assert.ok(week.resources.every(row => row.id !== ids.foreign));
  const month = await buildOperationsReport(prisma, users.staff, { days: 30, now });
  assert.equal(month.summary.actualUsageMinutes, 3090); assert.equal(month.summary.scheduledMinutes, 3000);
  const admin = await buildOperationsReport(prisma, users.admin, { days: 7, now });
  assert.equal(admin.resources.find(row => row.id === ids.foreign).actualUsageMinutes, 30);
  const unassigned = await buildOperationsReport(prisma, users.unassigned, { now });
  assert.deepEqual(unassigned.resources, []); assert.equal(unassigned.summary.resourceCount, 0);
});

test("dashboard totals include all open work and overdue handovers beyond its 20-row preview", async () => {
  const response = await request(app).get("/api/dashboard?includeTelemetry=false").set(auth("staff"));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.upcomingBookings.length, 20);
  assert.equal(response.body.summary.activeBookingsCount, 27);
  assert.equal(response.body.summary.pendingApprovalCount, 1); assert.equal(response.body.summary.checkedOutCount, 1);
  assert.equal(response.body.telemetrySummary, null);
});

test("report HTTP boundary enforces authentication, canonical roles, active accounts and strict finite filters", async () => {
  assert.equal((await request(app).get("/api/dashboard/report")).status, 401);
  for (const name of ["student", "lecturer"]) assert.equal((await request(app).get("/api/dashboard/report").set(auth(name))).status, 403);
  assert.equal((await request(app).get("/api/dashboard/report").set(auth("inactive"))).status, 401);
  for (const query of ["days=1", "days=365", "days=7&days=30", `days=7&laboratoryId=${ids.foreignLab}`]) assert.equal((await request(app).get(`/api/dashboard/report?${query}`).set(auth("staff"))).status, 400);
  const result = await request(app).get("/api/dashboard/report?days=7").set(auth("staff"));
  assert.equal(result.status, 200); assert.equal(result.body.summary.resourceCount, 2);
  assert.equal(result.headers["cache-control"], "private, no-store");
  await prisma.userLabAssignment.delete({ where: { userId_laboratoryId: { userId: users.staff.id, laboratoryId: ids.lab } } });
  const revoked = await request(app).get("/api/dashboard/report?days=7").set(auth("staff"));
  assert.equal(revoked.status, 200); assert.deepEqual(revoked.body.resources, []);
});

test.after(async () => {
  // Only this run's synthetic verification fixtures; no shared reset or migration.
  const resourceIds = [ids.resource, ids.unused, ids.foreign].filter(Boolean);
  if (resourceIds.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: Object.values(users).map(user => user.id) } } });
    await prisma.maintenanceWindow.deleteMany({ where: { resourceId: { in: resourceIds } } });
    await prisma.incident.deleteMany({ where: { resourceId: { in: resourceIds } } });
    await prisma.booking.deleteMany({ where: { resourceId: { in: resourceIds } } });
    await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } });
    await prisma.userLabAssignment.deleteMany({ where: { userId: { in: Object.values(users).map(user => user.id) } } });
    await prisma.laboratory.deleteMany({ where: { id: { in: [ids.lab, ids.foreignLab] } } });
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.campus.deleteMany({ where: { id: ids.campus } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users).map(user => user.id) } } });
  }
  await prisma.$disconnect();
});
