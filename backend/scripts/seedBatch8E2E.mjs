import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { createTelemetrySource, telemetrySourceInclude } from "../src/services/telemetryIdentityService.js";
import { persistTelemetrySample } from "../src/services/telemetryService.js";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b8_monitoring_[a-z0-9_]+$/, "Refusing to seed a non-Batch-8 database");
const localDatabase = ["localhost", "127.0.0.1"].includes(databaseUrl.hostname);
const guardedComposeDatabase = process.env.DEMO_MODE === "true" && databaseUrl.hostname === "postgres";
assert.ok(localDatabase || guardedComposeDatabase, "Only local or explicit demo Compose PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch8E2E!Pass", 4);
const now = new Date();

const ids = {
  campus: "b8000000-0000-4000-8000-000000000001",
  building: "b8000000-0000-4000-8000-000000000002",
  assignedLab: "b8000000-0000-4000-8000-000000000003",
  foreignLab: "b8000000-0000-4000-8000-000000000004",
  admin: "b8000000-0000-4000-8000-000000000011",
  staff: "b8000000-0000-4000-8000-000000000012",
  foreignStaff: "b8000000-0000-4000-8000-000000000013",
  student: "b8000000-0000-4000-8000-000000000014",
  assignedResource: "b8000000-0000-4000-8000-000000000021",
  noDataResource: "b8000000-0000-4000-8000-000000000022",
  foreignResource: "b8000000-0000-4000-8000-000000000023",
  labThreshold: "b8000000-0000-4000-8000-000000000031",
  resourceThreshold: "b8000000-0000-4000-8000-000000000032",
  camera: "b8000000-0000-4000-8000-000000000041"
};

async function createSourceAndSamples({ laboratoryId, resourceId, code, samples }) {
  const created = await prisma.$transaction((tx) => createTelemetrySource(tx, {
    code,
    name: `${code} authenticated source`,
    laboratoryId,
    resourceId
  }));
  const source = await prisma.telemetrySource.findUniqueOrThrow({
    where: { id: created.source.id },
    include: telemetrySourceInclude()
  });
  for (const [index, sample] of samples.entries()) {
    await prisma.$transaction((tx) => persistTelemetrySample(tx, {
      source,
      now,
      payload: {
        eventId: `${code.toLowerCase()}-${index + 1}`,
        timestamp: sample.timestamp,
        temperatureC: sample.temperatureC,
        humidityPercent: sample.humidityPercent,
        online: sample.online,
        signals: sample.signals || []
      }
    }));
  }
  return source;
}

try {
  await prisma.campus.create({ data: { id: ids.campus, code: "B8-E2E-CAMPUS", name: "Batch 8 E2E Campus" } });
  await prisma.building.create({ data: { id: ids.building, campusId: ids.campus, code: "B8-E2E-BUILDING", name: "Batch 8 E2E Building" } });
  await prisma.laboratory.createMany({
    data: [
      { id: ids.assignedLab, buildingId: ids.building, code: "B8-E2E-LAB-A", name: "Phòng giám sát thông minh A" },
      { id: ids.foreignLab, buildingId: ids.building, code: "B8-E2E-LAB-B", name: "Phòng giám sát thông minh B" }
    ]
  });
  await prisma.user.createMany({
    data: [
      [ids.admin, "b8.admin@lab.test", "Batch 8 Admin", "ADMIN"],
      [ids.staff, "b8.staff@lab.test", "Batch 8 Staff", "LAB_STAFF"],
      [ids.foreignStaff, "b8.foreign.staff@lab.test", "Batch 8 Foreign Staff", "LAB_STAFF"],
      [ids.student, "b8.student@lab.test", "Batch 8 Student", "STUDENT"]
    ].map(([id, email, fullName, role]) => ({ id, email, fullName, role, passwordHash, isActive: true }))
  });
  await prisma.userLabAssignment.createMany({
    data: [
      { userId: ids.staff, laboratoryId: ids.assignedLab },
      { userId: ids.foreignStaff, laboratoryId: ids.foreignLab }
    ]
  });
  await prisma.resource.createMany({
    data: [
      [ids.assignedResource, ids.assignedLab, "B8-E2E-SMART-A", "Thiết bị giám sát thông minh A"],
      [ids.noDataResource, ids.assignedLab, "B8-E2E-NODATA", "Thiết bị chưa có dữ liệu Batch 8"],
      [ids.foreignResource, ids.foreignLab, "B8-E2E-SMART-B", "Thiết bị giám sát phòng B"]
    ].map(([id, laboratoryId, code, name]) => ({
      id,
      laboratoryId,
      code,
      name,
      category: "EQUIPMENT",
      subtype: "OTHER",
      location: laboratoryId === ids.assignedLab ? "A-801" : "B-801",
      operationalStatus: "AVAILABLE",
      status: "available",
      bookingState: "bookable",
      requiresApproval: false
    }))
  });
  await prisma.laboratoryMonitoringThreshold.create({
    data: {
      id: ids.labThreshold,
      laboratoryId: ids.assignedLab,
      temperatureWarningC: 70,
      temperatureCriticalC: 90,
      humidityMinPercent: 20,
      humidityMaxPercent: 80,
      staleMinutes: 15
    }
  });
  await prisma.resourceMonitoringThreshold.create({
    data: {
      id: ids.resourceThreshold,
      resourceId: ids.assignedResource,
      temperatureWarningC: 60,
      temperatureCriticalC: 80,
      staleMinutes: 5
    }
  });

  const assignedSource = await createSourceAndSamples({
    laboratoryId: ids.assignedLab,
    resourceId: ids.assignedResource,
    code: "B8-E2E-SOURCE-A",
    samples: [
      { timestamp: new Date(now.getTime() - 120_000), temperatureC: 28, humidityPercent: 52, online: true },
      { timestamp: new Date(now.getTime() - 60_000), temperatureC: 65, humidityPercent: 53, online: true },
      { timestamp: now, temperatureC: 95, humidityPercent: 54, online: true }
    ]
  });
  await createSourceAndSamples({
    laboratoryId: ids.foreignLab,
    resourceId: ids.foreignResource,
    code: "B8-E2E-SOURCE-B",
    samples: [{ timestamp: now, temperatureC: 27, humidityPercent: 49, online: true }]
  });
  await prisma.camera.create({
    data: {
      id: ids.camera,
      code: "B8-E2E-CAMERA-A",
      name: "Camera metadata Batch 8",
      laboratoryId: ids.assignedLab,
      resourceId: ids.assignedResource,
      telemetrySourceId: assignedSource.id,
      enabled: false,
      endpointUrl: null,
      status: "NOT_CONFIGURED"
    }
  });

  const [alerts, incidents, samples] = await Promise.all([
    prisma.monitoringAlert.count({ where: { resourceId: ids.assignedResource, status: "OPEN" } }),
    prisma.incident.count({ where: { resourceId: ids.assignedResource, monitoringAlertId: { not: null } } }),
    prisma.telemetrySample.count({ where: { resourceId: ids.assignedResource } })
  ]);
  assert.equal(alerts, 1);
  assert.equal(incidents, 1);
  assert.equal(samples, 3);
  console.log(`Seeded Batch 8 E2E fixtures in ${database}`);
} finally {
  await prisma.$disconnect();
}
