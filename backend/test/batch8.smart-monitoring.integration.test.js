import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

import {
  assertBatch8Database,
  configureBatch8TestEnvironment,
  isolatedBatch8Client
} from "./helpers/batch8Database.js";

const database = assertBatch8Database(process.env.BATCH8_DATABASE || "");
const databaseUrl = await configureBatch8TestEnvironment(database);
const [{ createApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/db.js")
]);

const app = createApp();
const isolated = isolatedBatch8Client(databaseUrl);
const marker = crypto.randomUUID();
const id = () => crypto.randomUUID();
const password = "Batch8!Pass";
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const sourceHeader = (token) => ({ "x-telemetry-source-token": token });

const fixture = {
  campus: id(),
  building: id(),
  labs: { assigned: id(), foreign: id(), defaults: id() },
  users: { admin: id(), staff: id(), foreignStaff: id(), student: id(), lecturer: id() },
  resources: { primary: id(), labPolicy: id(), systemDefault: id(), noData: id(), foreign: id() }
};

async function seed() {
  const [identity] = await isolated.$queryRaw`SELECT current_database() AS database, current_setting('server_version') AS version`;
  assert.equal(identity.database, database);
  assert.match(identity.version, /^16\./);
  const passwordHash = await bcrypt.hash(password, 4);
  await isolated.campus.create({ data: { id: fixture.campus, code: `B8C-${marker}`, name: "Batch 8 Campus" } });
  await isolated.building.create({ data: { id: fixture.building, campusId: fixture.campus, code: `B8B-${marker}`, name: "Batch 8 Building" } });
  await isolated.laboratory.createMany({
    data: [
      { id: fixture.labs.assigned, buildingId: fixture.building, code: `B8LA-${marker}`, name: "Assigned Smart Lab" },
      { id: fixture.labs.foreign, buildingId: fixture.building, code: `B8LF-${marker}`, name: "Foreign Smart Lab" },
      { id: fixture.labs.defaults, buildingId: fixture.building, code: `B8LD-${marker}`, name: "System Defaults Lab" }
    ]
  });
  await isolated.user.createMany({
    data: Object.entries({ admin: "ADMIN", staff: "LAB_STAFF", foreignStaff: "LAB_STAFF", student: "STUDENT", lecturer: "LECTURER" })
      .map(([key, role]) => ({
        id: fixture.users[key],
        email: `${key.toLowerCase()}-${marker}@example.test`,
        fullName: `Batch 8 ${key}`,
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
      [fixture.resources.primary, fixture.labs.assigned, "PRIMARY"],
      [fixture.resources.labPolicy, fixture.labs.assigned, "LABPOLICY"],
      [fixture.resources.systemDefault, fixture.labs.defaults, "DEFAULT"],
      [fixture.resources.noData, fixture.labs.assigned, "NODATA"],
      [fixture.resources.foreign, fixture.labs.foreign, "FOREIGN"]
    ].map(([resourceId, laboratoryId, suffix]) => ({
      id: resourceId,
      laboratoryId,
      code: `B8-${suffix}-${marker}`,
      name: `Batch 8 ${suffix}`,
      subtype: suffix === "PRIMARY" ? "CAMERA" : "OTHER",
      category: "EQUIPMENT",
      location: `ROOM-${suffix}`,
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    }))
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

async function createSource(adminToken, resourceId, laboratoryId, suffix) {
  const response = await request(app)
    .post("/api/telemetry/sources")
    .set(bearer(adminToken))
    .send({
      code: `B8-SOURCE-${suffix}-${marker}`,
      name: `Batch 8 Source ${suffix}`,
      laboratoryId,
      resourceId
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.ok(response.body.credential.startsWith("lrmts_"));
  return response.body;
}

function ingest(token, body = {}) {
  return request(app)
    .post("/api/telemetry/samples")
    .set(sourceHeader(token))
    .send({
      eventId: `event-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      temperatureC: 25,
      humidityPercent: 50,
      online: true,
      ...body
    });
}

test("Batch 8 authenticated smart monitoring extension", { timeout: 180000 }, async (t) => {
  await seed();
  const tokens = Object.fromEntries(await Promise.all(
    Object.keys(fixture.users).map(async (key) => [key, await login(key)])
  ));

  const primary = await createSource(tokens.admin, fixture.resources.primary, fixture.labs.assigned, "PRIMARY");
  const labPolicy = await createSource(tokens.admin, fixture.resources.labPolicy, fixture.labs.assigned, "LAB");
  const systemDefault = await createSource(tokens.admin, fixture.resources.systemDefault, fixture.labs.defaults, "DEFAULT");
  const foreign = await createSource(tokens.admin, fixture.resources.foreign, fixture.labs.foreign, "FOREIGN");

  await t.test("source credentials are hashed, valid credentials ingest, and invalid credentials fail closed", async () => {
    const stored = await isolated.telemetrySource.findUnique({ where: { id: primary.source.id } });
    assert.ok(stored.credentialHash);
    assert.ok(stored.credentialSalt);
    assert.equal(stored.credentialHash.includes(primary.credential), false);

    const invalid = await ingest(`${primary.credential}tampered`);
    assert.equal(invalid.status, 401);
    const accepted = await ingest(primary.credential);
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
    assert.equal(accepted.body.monitoring.state, "HEALTHY");
    assert.equal(accepted.body.acceptedSource.id, primary.source.id);
    assert.equal(accepted.body.resource.operationalStatus, "AVAILABLE");
    const updated = await isolated.telemetrySource.findUnique({ where: { id: primary.source.id } });
    assert.ok(updated.lastSeenAt);
    assert.ok(updated.lastSampleAt);
    assert.equal(updated.reportedOnline, true);
  });

  await t.test("source identity is server-resolved and cannot spoof source, resource, or laboratory", async () => {
    assert.equal((await ingest(primary.credential, { resourceId: fixture.resources.foreign })).status, 403);
    assert.equal((await ingest(primary.credential, { labId: fixture.labs.foreign })).status, 403);
    assert.equal((await ingest(primary.credential, { source: foreign.source.code })).status, 403);
    assert.equal(await isolated.telemetrySample.count({ where: { sourceId: primary.source.id, resourceId: fixture.resources.foreign } }), 0);
  });

  await t.test("inactive sources are denied and credential rotation revokes the previous secret", async () => {
    const disabled = await request(app)
      .patch(`/api/telemetry/sources/${primary.source.id}/active`)
      .set(bearer(tokens.admin))
      .send({ isActive: false });
    assert.equal(disabled.status, 200);
    assert.equal((await ingest(primary.credential)).status, 403);
    await request(app)
      .patch(`/api/telemetry/sources/${primary.source.id}/active`)
      .set(bearer(tokens.admin))
      .send({ isActive: true });
    const rotated = await request(app)
      .post(`/api/telemetry/sources/${primary.source.id}/rotate`)
      .set(bearer(tokens.admin))
      .send({});
    assert.equal(rotated.status, 200);
    assert.equal((await ingest(primary.credential)).status, 401);
    primary.credential = rotated.body.credential;
    assert.equal((await ingest(primary.credential)).status, 201);
  });

  await t.test("timestamp and numeric validation reject invalid samples without updating lastSeenAt", async () => {
    const before = await isolated.telemetrySource.findUnique({ where: { id: labPolicy.source.id } });
    assert.equal((await ingest(labPolicy.credential, { humidityPercent: 101 })).status, 400);
    assert.equal((await ingest(labPolicy.credential, { timestamp: new Date(Date.now() + 10 * 60_000).toISOString() })).status, 400);
    const after = await isolated.telemetrySource.findUnique({ where: { id: labPolicy.source.id } });
    assert.equal(after.lastSeenAt?.toISOString() || null, before.lastSeenAt?.toISOString() || null);
  });

  await t.test("resource, laboratory, and system threshold precedence is explicit", async () => {
    assert.equal((await request(app)
      .put(`/api/telemetry/thresholds/laboratories/${fixture.labs.assigned}`)
      .set(bearer(tokens.admin))
      .send({ temperatureWarningC: 70, temperatureCriticalC: 90, humidityMinPercent: 20, humidityMaxPercent: 80, staleMinutes: 15 })).status, 200);
    assert.equal((await request(app)
      .put(`/api/telemetry/thresholds/resources/${fixture.resources.primary}`)
      .set(bearer(tokens.admin))
      .send({ temperatureWarningC: 60, temperatureCriticalC: 80, staleMinutes: 5 })).status, 200);

    const resourceResult = await ingest(primary.credential, { temperatureC: 65 });
    assert.equal(resourceResult.body.monitoring.state, "WARNING");
    assert.equal(resourceResult.body.thresholds.values.temperatureWarningC, 60);
    assert.equal(resourceResult.body.thresholds.sourceByField.temperatureWarningC, "RESOURCE_OVERRIDE");
    assert.equal(resourceResult.body.thresholds.sourceByField.humidityMinPercent, "LABORATORY");

    const labResult = await ingest(labPolicy.credential, { temperatureC: 72 });
    assert.equal(labResult.body.monitoring.state, "WARNING");
    assert.equal(labResult.body.thresholds.values.temperatureWarningC, 70);
    assert.equal(labResult.body.thresholds.sourceByField.temperatureWarningC, "LABORATORY");

    const defaultResult = await ingest(systemDefault.credential, { temperatureC: 74 });
    assert.equal(defaultResult.body.monitoring.state, "HEALTHY");
    assert.equal(defaultResult.body.thresholds.values.temperatureWarningC, 75);
    assert.equal(defaultResult.body.thresholds.sourceByField.temperatureWarningC, "SYSTEM_DEFAULT");
  });

  await t.test("HEALTHY, WARNING, STALE, UNAVAILABLE, and NO_DATA remain truthful", async () => {
    assert.equal((await ingest(labPolicy.credential, { temperatureC: 25 })).body.monitoring.state, "HEALTHY");
    assert.equal((await ingest(labPolicy.credential, { temperatureC: 72 })).body.monitoring.state, "WARNING");
    assert.equal((await ingest(primary.credential, { timestamp: new Date(Date.now() - 10 * 60_000).toISOString() })).body.monitoring.state, "STALE");
    const offline = await ingest(labPolicy.credential, { online: false });
    assert.equal(offline.body.monitoring.state, "UNAVAILABLE");
    assert.equal(offline.body.resource.operationalStatus, "AVAILABLE");
    const list = await request(app).get("/api/telemetry").set(bearer(tokens.staff));
    const noData = list.body.find((row) => row.resource.id === fixture.resources.noData);
    assert.equal(noData.monitoring.state, "NO_DATA");
    assert.equal(noData.latestTelemetry, null);
  });

  let criticalAlertId;
  await t.test("alerts are persisted and concurrent duplicate conditions remain one active episode", async () => {
    const requests = ["a", "b", "c"].map((suffix) => ingest(primary.credential, {
      eventId: `critical-${marker}-${suffix}`,
      temperatureC: 95,
      timestamp: new Date().toISOString()
    }));
    const responses = await Promise.all(requests);
    assert.equal(responses.every((response) => response.status === 201), true);
    const active = await isolated.monitoringAlert.findMany({
      where: { sourceId: primary.source.id, ruleCode: "TEMPERATURE_CRITICAL", activeDedupeKey: { not: null } }
    });
    assert.equal(active.length, 1);
    criticalAlertId = active[0].id;
    assert.equal(active[0].severity, "CRITICAL");
    assert.equal(await isolated.incident.count({ where: { monitoringAlertId: criticalAlertId } }), 1);
  });

  await t.test("alert acknowledgement is lab-scoped and retains incident provenance", async () => {
    assert.equal((await request(app)
      .post(`/api/telemetry/alerts/${criticalAlertId}/acknowledge`)
      .set(bearer(tokens.foreignStaff)).send({})).status, 403);
    assert.equal((await request(app)
      .post(`/api/telemetry/alerts/${criticalAlertId}/acknowledge`)
      .set(bearer(tokens.student)).send({})).status, 403);
    const acknowledged = await request(app)
      .post(`/api/telemetry/alerts/${criticalAlertId}/acknowledge`)
      .set(bearer(tokens.staff)).send({});
    assert.equal(acknowledged.status, 200);
    assert.equal(acknowledged.body.status, "ACKNOWLEDGED");
    assert.equal(acknowledged.body.acknowledgedBy.id, fixture.users.staff);
    assert.ok(acknowledged.body.incident?.id);
    const incident = await isolated.incident.findUnique({ where: { monitoringAlertId: criticalAlertId } });
    assert.equal(incident.telemetrySourceId, primary.source.id);
    assert.equal(incident.telemetrySampleId !== null, true);
    assert.equal(incident.reportedById, null);
  });

  await t.test("verified smoke/fire input is labelled non-certified and is never inferred from temperature alone", async () => {
    const temperatureOnly = await ingest(labPolicy.credential, { temperatureC: 95 });
    assert.equal(temperatureOnly.body.activeAlerts.some((alert) => alert.ruleCode.includes("SMOKE") || alert.ruleCode.includes("FIRE")), false);
    const smoke = await ingest(labPolicy.credential, {
      temperatureC: 30,
      signals: [{ code: "SMOKE_SENSOR", severity: "critical", message: "Optical smoke channel asserted", verified: true }]
    });
    assert.equal(smoke.status, 201);
    const warning = await isolated.monitoringAlert.findFirst({
      where: { sourceId: labPolicy.source.id, ruleCode: "SIGNAL_SMOKE_SENSOR", activeDedupeKey: { not: null } }
    });
    assert.match(warning.message, /NON-CERTIFIED EARLY WARNING; NOT A FIRE ALARM/);
    const linked = await isolated.incident.findUnique({ where: { monitoringAlertId: warning.id } });
    assert.equal(linked.category, "NON_CERTIFIED_SAFETY_EARLY_WARNING");
  });

  await t.test("camera metadata is scoped, private, disabled by default, and every attempt is audited", async () => {
    const created = await request(app)
      .post("/api/telemetry/cameras")
      .set(bearer(tokens.admin))
      .send({
        code: `B8-CAMERA-${marker}`,
        name: "Batch 8 Camera",
        laboratoryId: fixture.labs.assigned,
        resourceId: fixture.resources.primary,
        telemetrySourceId: primary.source.id,
        endpointUrl: "https://camera.internal.example/secret-stream",
        enabled: false,
        status: "NOT_CONFIGURED"
      });
    assert.equal(created.status, 201);
    assert.equal(created.body.endpointUrl, undefined);
    assert.equal(created.body.state, "NOT_CONFIGURED");

    const assignedList = await request(app).get("/api/telemetry/cameras").set(bearer(tokens.staff));
    const foreignList = await request(app).get("/api/telemetry/cameras").set(bearer(tokens.foreignStaff));
    assert.equal(assignedList.body.some((camera) => camera.id === created.body.id), true);
    assert.equal(foreignList.body.some((camera) => camera.id === created.body.id), false);
    assert.equal(JSON.stringify(assignedList.body).includes("secret-stream"), false);

    const studentDenied = await request(app)
      .post(`/api/telemetry/cameras/${created.body.id}/access`)
      .set(bearer(tokens.student))
      .send({ purpose: "Student attempted camera access" });
    const lecturerDenied = await request(app)
      .post(`/api/telemetry/cameras/${created.body.id}/access`)
      .set(bearer(tokens.lecturer))
      .send({ purpose: "Lecturer attempted camera access" });
    assert.equal(studentDenied.status, 403);
    assert.equal(lecturerDenied.status, 403);

    const staffAccess = await request(app)
      .post(`/api/telemetry/cameras/${created.body.id}/access`)
      .set(bearer(tokens.staff))
      .send({ purpose: "Operational metadata check" });
    assert.equal(staffAccess.status, 200);
    assert.equal(staffAccess.body.audit.outcome, "NOT_CONFIGURED");
    assert.equal(staffAccess.body.stream, undefined);
    assert.equal(await isolated.cameraAccessAudit.count({ where: { cameraId: created.body.id } }), 3);
  });

  await t.test("staff reads remain assigned-lab scoped and ordinary users receive no monitoring fallback", async () => {
    const staffSources = await request(app).get("/api/telemetry/sources").set(bearer(tokens.staff));
    const foreignSources = await request(app).get("/api/telemetry/sources").set(bearer(tokens.foreignStaff));
    assert.equal(staffSources.body.some((source) => source.id === primary.source.id), true);
    assert.equal(foreignSources.body.some((source) => source.id === primary.source.id), false);
    assert.equal((await request(app).get("/api/telemetry").set(bearer(tokens.student))).status, 403);
    assert.equal((await request(app).get("/api/telemetry/alerts").set(bearer(tokens.lecturer))).status, 403);
  });
});

test.after(async () => {
  await Promise.allSettled([prisma.$disconnect(), isolated.$disconnect()]);
});
