import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import {
  assertBatch6Database,
  configureBatch6TestEnvironment,
  isolatedBatch6Client
} from "./helpers/batch6Database.js";

const database = assertBatch6Database(process.env.BATCH6_DATABASE || "");
const databaseUrl = await configureBatch6TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js")
]);

const app = createApp();
const isolated = isolatedBatch6Client(databaseUrl);
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const password = "Batch6!Pass";
const bearer = (token) => ({ Authorization: \`Bearer \${token}\` });
const telemetryKey = process.env.TELEMETRY_API_KEY;

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), foreign: id() },
  users: {
    admin: id(),
    staff: id(),
    foreignStaff: id(),
    studentA: id(),
    studentB: id(),
    lecturer: id()
  },
  resources: {
    noData: id(),
    healthy: id(),
    warning: id(),
    stale: id(),
    offline: id(),
    foreign: id()
  }
};

function futureWindow(days = 2, hour = 9, durationMinutes = 60) {
  const start = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start, end };
}

async function seed() {
  const identity = await isolated.$queryRaw\`SELECT current_database() AS database, current_setting('server_version') AS version\`;
  assert.equal(identity[0].database, database);
  assert.match(identity[0].version, /^16\./);

  const passwordHash = await bcrypt.hash(password, 4);
  await isolated.campus.create({ data: { id: fixture.campus, code: \`B6C-\${marker}\`, name: "Batch 6 Campus" } });
  await isolated.building.create({ data: { id: fixture.building, campusId: fixture.campus, code: \`B6B-\${marker}\`, name: "Batch 6 Building" } });

  for (const [laboratoryId, code, name] of [
    [fixture.labs.assigned, \`B6LA-\${marker}\`, "Assigned Monitoring Lab"],
    [fixture.labs.foreign, \`B6LF-\${marker}\`, "Foreign Monitoring Lab"]
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
    ["studentA", "STUDENT"],
    ["studentB", "STUDENT"],
    ["lecturer", "LECTURER"]
  ];
  await isolated.user.createMany({
    data: users.map(([key, role]) => ({
      id: fixture.users[key],
      email: \`\${key.toLowerCase()}-\${marker}@example.test\`,
      fullName: \`Batch 6 \${key}\`,
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

  const assignedSpecs = {
    telemetryStaleMinutes: 15,
    temperatureWarningC: 75,
    humidityMinPercent: 20,
    humidityMaxPercent: 80
  };

  await isolated.resource.createMany({
    data: [
      [fixture.resources.noData, fixture.labs.assigned, "NODATA", "No Data Resource", assignedSpecs],
      [fixture.resources.healthy, fixture.labs.assigned, "HEALTHY", "Healthy Resource", assignedSpecs],
      [fixture.resources.warning, fixture.labs.assigned, "WARNING", "Warning Resource", assignedSpecs],
      [fixture.resources.stale, fixture.labs.assigned, "STALE", "Stale Resource", assignedSpecs],
      [fixture.resources.offline, fixture.labs.assigned, "OFFLINE", "Offline Resource", assignedSpecs],
      [fixture.resources.foreign, fixture.labs.foreign, "FOREIGN", "Foreign Resource", assignedSpecs]
    ].map(([resourceId, laboratoryId, suffix, name, specs]) => ({
      id: resourceId,
      laboratoryId,
      code: \`B6-\${suffix}-\${marker}\`,
      name,
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: laboratoryId === fixture.labs.assigned ? "A-601" : "B-601",
      operationalStatus: "AVAILABLE",
      requiresApproval: false,
      specs
    }))
  });
}

async function login(key) {
  const response = await request(app).post("/api/auth/login").send({
    email: \`\${key.toLowerCase()}-\${marker}@example.test\`,
    password
  });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

async function ingest(resourceId, body = {}) {
  return request(app)
    .post("/api/telemetry/samples")
    .set("x-telemetry-api-key", telemetryKey)
    .send({
      labId: fixture.labs.assigned,
      resourceId,
      source: "batch6-agent",
      timestamp: new Date().toISOString(),
      temperatureC: 30,
      humidityPercent: 50,
      online: true,
      ...body
    });
}

test("Batch 6 notifications, incidents, dashboard and telemetry", { timeout: 180000 }, async (t) => {
  await seed();
  const tokens = Object.fromEntries(await Promise.all(
    ["admin", "staff", "foreignStaff", "studentA", "studentB", "lecturer"]
      .map(async (key) => [key, await login(key)])
  ));

  await t.test("confirmed booking schedules durable upcoming and return reminders", async () => {
    const { start, end } = futureWindow(2);
    const response = await request(app).post("/api/bookings").set(bearer(tokens.studentA)).send({
      resourceId: fixture.resources.noData,
      title: "Batch 6 reminder booking",
      purpose: "Reminder verification",
      startAt: start.toISOString(),
      endAt: end.toISOString()
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.status, "CONFIRMED");

    const reminders = await isolated.notification.findMany({
      where: {
        userId: fixture.users.studentA,
        dedupeKey: { startsWith: \`booking:\${response.body.id}:\` }
      },
      orderBy: { type: "asc" }
    });
    assert.equal(reminders.length, 2);
    assert.deepEqual(reminders.map((row) => row.type).sort(), ["BOOKING_UPCOMING", "RETURN_REMINDER"]);
    assert.equal(reminders.every((row) => row.sentAt === null), true);

    const hidden = await request(app).get("/api/notifications").set(bearer(tokens.studentA));
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.some((row) => row.type === "BOOKING_UPCOMING"), false);

    await isolated.notification.update({
      where: { dedupeKey: \`booking:\${response.body.id}:BOOKING_UPCOMING\` },
      data: { scheduledAt: new Date(Date.now() - 1000) }
    });
    const delivered = await request(app).get("/api/notifications").set(bearer(tokens.studentA));
    assert.equal(delivered.status, 200);
    assert.equal(delivered.body.some((row) => row.type === "BOOKING_UPCOMING" && row.sentAt), true);

    const cancelled = await request(app)
      .post(\`/api/bookings/\${response.body.id}/cancel\`)
      .set(bearer(tokens.studentA))
      .send({ reason: "Batch 6 cancellation test" });
    assert.equal(cancelled.status, 200);
    assert.equal(
      await isolated.notification.count({
        where: { dedupeKey: \`booking:\${response.body.id}:RETURN_REMINDER\`, sentAt: null }
      }),
      0
    );
  });

  await t.test("notification reads remain strictly user-scoped", async () => {
    await isolated.notification.create({
      data: {
        id: id(),
        userId: fixture.users.studentA,
        type: "BOOKING_UPCOMING",
        title: "Scoped notification",
        message: "Only student A can read this",
        severity: "info",
        sentAt: new Date(),
        dedupeKey: \`scope:\${marker}\`
      }
    });
    const studentA = await request(app).get("/api/notifications").set(bearer(tokens.studentA));
    const studentB = await request(app).get("/api/notifications").set(bearer(tokens.studentB));
    assert.equal(studentA.body.some((row) => row.title === "Scoped notification"), true);
    assert.equal(studentB.body.some((row) => row.title === "Scoped notification"), false);
  });

  let incidentId;
  await t.test("incident reporting is persisted and reporter-owned for ordinary users", async () => {
    const response = await request(app).post("/api/incidents").set(bearer(tokens.studentA)).send({
      resourceId: fixture.resources.noData,
      severity: "high",
      category: "hardware",
      title: "Thiết bị phát tiếng ồn bất thường",
      description: "Người dùng ghi nhận tiếng ồn cơ khí bất thường trong quá trình chuẩn bị sử dụng."
    });
    assert.equal(response.status, 201);
    incidentId = response.body.id;
    assert.equal(response.body.reportedBy.id, fixture.users.studentA);

    const ownerList = await request(app).get("/api/incidents").set(bearer(tokens.studentA));
    const unrelatedList = await request(app).get("/api/incidents").set(bearer(tokens.studentB));
    assert.equal(ownerList.body.some((row) => row.id === incidentId), true);
    assert.equal(unrelatedList.body.some((row) => row.id === incidentId), false);
    assert.equal(await isolated.usageLog.count({ where: { action: "INCIDENT_REPORTED", metadata: { path: ["incidentId"], equals: incidentId } } }), 1);
  });

  await t.test("incident staff scope is enforced and resolution requires evidence", async () => {
    const assigned = await request(app).get("/api/incidents").set(bearer(tokens.staff));
    const foreign = await request(app).get("/api/incidents").set(bearer(tokens.foreignStaff));
    assert.equal(assigned.body.some((row) => row.id === incidentId), true);
    assert.equal(foreign.body.some((row) => row.id === incidentId), false);

    assert.equal(
      (await request(app).post(\`/api/incidents/\${incidentId}/resolve\`).set(bearer(tokens.foreignStaff)).send({ resolution: "Không hợp lệ" })).status,
      403
    );
    assert.equal(
      (await request(app).post(\`/api/incidents/\${incidentId}/resolve\`).set(bearer(tokens.staff)).send({ resolution: "   " })).status,
      400
    );

    const triaged = await request(app).post(\`/api/incidents/\${incidentId}/triage\`).set(bearer(tokens.staff)).send({});
    assert.equal(triaged.status, 200);
    assert.ok(["triaged", "assigned"].includes(triaged.body.status));

    const resolved = await request(app).post(\`/api/incidents/\${incidentId}/resolve\`).set(bearer(tokens.staff)).send({
      resolution: "Đã kiểm tra cơ khí, siết lại cụm quạt và xác nhận thiết bị hoạt động ổn định."
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.status, "resolved");
    assert.ok(resolved.body.resolvedAt);
    assert.match(resolved.body.resolution, /xác nhận thiết bị/);
  });

  await t.test("telemetry ingestion fails closed without the service credential", async () => {
    const response = await request(app).post("/api/telemetry/samples").send({
      labId: fixture.labs.assigned,
      resourceId: fixture.resources.healthy,
      source: "unauthorized-agent",
      timestamp: new Date().toISOString(),
      temperatureC: 25,
      humidityPercent: 50,
      online: true
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "UNAUTHORIZED");
  });

  await t.test("telemetry validates lab ownership and numeric/timestamp sanity", async () => {
    const wrongLab = await request(app)
      .post("/api/telemetry/samples")
      .set("x-telemetry-api-key", telemetryKey)
      .send({
        labId: fixture.labs.foreign,
        resourceId: fixture.resources.healthy,
        source: "batch6-agent",
        timestamp: new Date().toISOString(),
        temperatureC: 25,
        humidityPercent: 50,
        online: true
      });
    assert.equal(wrongLab.status, 400);
    assert.equal(wrongLab.body.error.code, "TELEMETRY_RESOURCE_SCOPE_MISMATCH");

    assert.equal((await ingest(fixture.resources.healthy, { humidityPercent: 101 })).status, 400);
    assert.equal((await ingest(fixture.resources.healthy, { timestamp: new Date(Date.now() + 10 * 60_000).toISOString() })).status, 400);
  });

  await t.test("telemetry states are deterministic and unverified signals are not facts", async () => {
    const healthy = await ingest(fixture.resources.healthy, {
      signals: [{ code: "fan-noise", severity: "warning", message: "Unverified acoustic classifier", verified: false, provenance: "experimental-audio-model" }]
    });
    assert.equal(healthy.status, 201);
    assert.equal(healthy.body.monitoring.state, "HEALTHY");

    const warning = await ingest(fixture.resources.warning, {
      temperatureC: 80,
      signals: [{ code: "thermal", severity: "warning", message: "Verified sensor threshold", verified: true, provenance: "sensor-controller-01" }]
    });
    assert.equal(warning.status, 201);
    assert.equal(warning.body.monitoring.state, "WARNING");

    const stale = await ingest(fixture.resources.stale, {
      timestamp: new Date(Date.now() - 30 * 60_000).toISOString()
    });
    assert.equal(stale.status, 201);
    assert.equal(stale.body.monitoring.state, "STALE");

    const offline = await ingest(fixture.resources.offline, { online: false });
    assert.equal(offline.status, 201);
    assert.equal(offline.body.monitoring.state, "UNAVAILABLE");
  });

  await t.test("telemetry reads are lab-scoped for LAB_STAFF", async () => {
    const staff = await request(app).get("/api/telemetry").set(bearer(tokens.staff));
    const foreign = await request(app).get("/api/telemetry").set(bearer(tokens.foreignStaff));
    assert.equal(staff.status, 200);
    assert.equal(foreign.status, 200);
    assert.equal(staff.body.some((row) => row.resource.id === fixture.resources.healthy), true);
    assert.equal(foreign.body.some((row) => row.resource.id === fixture.resources.healthy), false);
  });

  await t.test("dashboard aggregates real resources, incidents, bookings and all five telemetry states", async () => {
    const staff = await request(app).get("/api/dashboard").set(bearer(tokens.staff));
    assert.equal(staff.status, 200);
    assert.equal(staff.body.summary.totalResources, 5);
    assert.equal(staff.body.summary.resourcesByOperationalStatus.AVAILABLE, 5);
    assert.equal(staff.body.incidents.total >= 1, true);
    assert.equal(staff.body.utilization.source, "database");
    assert.equal(typeof staff.body.utilization.scheduledUtilizationRate, "number");
    assert.equal(staff.body.telemetrySummary.HEALTHY, 1);
    assert.equal(staff.body.telemetrySummary.WARNING, 1);
    assert.equal(staff.body.telemetrySummary.STALE, 1);
    assert.equal(staff.body.telemetrySummary.UNAVAILABLE, 1);
    assert.equal(staff.body.telemetrySummary.NO_DATA, 1);

    const admin = await request(app).get("/api/dashboard").set(bearer(tokens.admin));
    assert.equal(admin.status, 200);
    assert.equal(admin.body.summary.totalResources, 6);
  });

  await t.test("ordinary users cannot access staff telemetry/dashboard endpoints", async () => {
    assert.equal((await request(app).get("/api/dashboard").set(bearer(tokens.studentA))).status, 403);
    assert.equal((await request(app).get("/api/telemetry").set(bearer(tokens.lecturer))).status, 403);
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
