import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { batch1DClient, assertTargetIdentity, assertBatch1DDatabase } from "./helpers/batch1dDatabase.js";

const databases = (process.env.BATCH1D_DATABASES ?? "").split(",").filter(Boolean);
assert.ok(databases.length > 0, "BATCH1D_DATABASES is required");
databases.forEach(assertBatch1DDatabase);

const rejectsWithDatabaseError = async (operation) => {
  await assert.rejects(operation, (error) => Boolean(error?.code || error?.message));
};

async function cleanup(client, ids) {
  await client.telemetrySample.deleteMany({ where: { resourceId: { in: ids.resources } } });
  await client.notification.deleteMany({ where: { userId: ids.user } });
  await client.usageLog.deleteMany({ where: { resourceId: { in: ids.resources } } });
  await client.booking.deleteMany({ where: { resourceId: { in: ids.resources } } });
  await client.userLabAssignment.deleteMany({ where: { userId: ids.user } });
  await client.resource.deleteMany({ where: { id: { in: ids.resources } } });
  await client.user.deleteMany({ where: { id: ids.user } });
  await client.laboratory.deleteMany({ where: { id: ids.lab } });
  await client.building.deleteMany({ where: { id: ids.building } });
  await client.campus.deleteMany({ where: { id: ids.campus } });
}

for (const database of databases) {
  test(`${database}: canonical Prisma read/write and integrity proof`, async () => {
    const client = await batch1DClient(database);
    const token = randomUUID();
    const ids = {
      campus: randomUUID(),
      building: randomUUID(),
      lab: randomUUID(),
      user: randomUUID(),
      resources: [randomUUID(), randomUUID()],
      bookings: [randomUUID(), randomUUID()],
    };
    try {
      await assertTargetIdentity(client, database, { readOnly: false });
      await client.campus.create({ data: { id: ids.campus, name: "B1D Test Campus", code: `B1D-C-${token}` } });
      await client.building.create({ data: {
        id: ids.building, campusId: ids.campus, name: "B1D Test Building", code: `B1D-B-${token}`,
      } });
      await client.laboratory.create({ data: {
        id: ids.lab, buildingId: ids.building, name: "B1D Test Laboratory", code: `B1D-L-${token}`,
      } });
      await client.user.create({ data: {
        id: ids.user, email: `b1d-${token}@example.test`, fullName: "Batch 1D Test User",
        role: "STUDENT", passwordHash: "TEST_ONLY_NOT_A_REAL_PASSWORD_HASH",
      } });
      await rejectsWithDatabaseError(client.user.create({ data: {
        id: randomUUID(), email: `bad-role-${token}@example.test`, fullName: "Invalid Role",
        role: "INVALID_ROLE", passwordHash: "TEST_ONLY",
      } }));

      await client.userLabAssignment.create({ data: { userId: ids.user, laboratoryId: ids.lab } });
      await rejectsWithDatabaseError(client.userLabAssignment.create({ data: {
        userId: ids.user, laboratoryId: ids.lab,
      } }));
      await rejectsWithDatabaseError(client.userLabAssignment.create({ data: {
        userId: ids.user, laboratoryId: randomUUID(),
      } }));

      await client.resource.create({ data: {
        id: ids.resources[0], laboratoryId: ids.lab, code: `B1D-R1-${token}`,
        name: "B1D Non-approval Resource", subtype: "GPU_SERVER", category: "MACHINE",
        location: "TEST_ONLY", operationalStatus: "AVAILABLE", requiresApproval: false,
      } });
      await client.resource.create({ data: {
        id: ids.resources[1], laboratoryId: ids.lab, code: `B1D-R2-${token}`,
        name: "B1D Approval Resource", subtype: "CAMERA", category: null,
        location: "TEST_ONLY", operationalStatus: "AVAILABLE", requiresApproval: true,
      } });
      const updated = await client.resource.update({
        where: { id: ids.resources[1] }, data: { operationalStatus: "CALIBRATION" },
      });
      assert.equal(updated.subtype, "CAMERA");
      assert.equal(updated.category, null);
      assert.equal(updated.operationalStatus, "CALIBRATION");
      await client.resource.update({
        where: { id: ids.resources[1] }, data: { operationalStatus: "AVAILABLE" },
      });

      const start = new Date("2036-01-01T01:00:00.000Z");
      const end = new Date("2036-01-01T02:00:00.000Z");
      await client.booking.create({ data: {
        id: ids.bookings[0], resourceId: ids.resources[0], requestedById: ids.user,
        title: "B1D confirmed booking", purpose: "TEST_ONLY", startAt: start, endAt: end,
        status: "CONFIRMED",
      } });
      await client.booking.create({ data: {
        id: ids.bookings[1], resourceId: ids.resources[1], requestedById: ids.user,
        title: "B1D approval booking", purpose: "TEST_ONLY", startAt: start, endAt: end,
        status: "PENDING_APPROVAL",
      } });
      await client.booking.update({
        where: { id: ids.bookings[1] }, data: { status: "CONFIRMED", approvedAt: new Date() },
      });
      await client.booking.update({ where: { id: ids.bookings[1] }, data: { status: "CHECKED_OUT" } });
      await client.booking.update({
        where: { id: ids.bookings[1] }, data: { status: "RETURNED", returnedAt: new Date() },
      });
      await client.booking.update({
        where: { id: ids.bookings[1] }, data: { status: "COMPLETED", completedAt: new Date() },
      });

      // This succeeds by design: transition-graph enforcement belongs to the later booking service batch.
      const persistenceOnly = await client.booking.update({
        where: { id: ids.bookings[1] }, data: { status: "CONFIRMED" },
      });
      assert.equal(persistenceOnly.status, "CONFIRMED");

      const log = await client.usageLog.create({ data: {
        id: randomUUID(), resourceId: ids.resources[1], bookingId: ids.bookings[1], userId: ids.user,
        actorType: "USER", action: "CHECK_OUT", fromStatus: "CONFIRMED", toStatus: "CHECKED_OUT",
        reason: "Batch 1D transition proof", metadata: { fixture: "TEST_ONLY" },
        message: "Batch 1D audit", conditionBefore: "TEST condition before",
        conditionAfter: "TEST condition after",
      } });
      assert.equal(log.reason, "Batch 1D transition proof");
      assert.equal(log.conditionBefore, "TEST condition before");
      assert.equal(log.conditionAfter, "TEST condition after");

      await client.usageLog.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], bookingId: ids.bookings[0], userId: null,
        actorType: "SYSTEM", actorRef: "batch1d-test-service", action: "TELEMETRY",
        message: "Batch 1D system actor", metadata: { fixture: "TEST_ONLY" },
      } });
      await rejectsWithDatabaseError(client.usageLog.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], bookingId: ids.bookings[0], userId: null,
        actorType: "USER", action: "STATUS_CHANGE", message: "Invalid actor fixture",
      } }));
      await rejectsWithDatabaseError(client.usageLog.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], bookingId: ids.bookings[0], userId: ids.user,
        actorType: "SYSTEM", actorRef: "batch1d-test-service", action: "STATUS_CHANGE",
        message: "Invalid actor fixture",
      } }));

      await client.booking.update({
        where: { id: ids.bookings[1] },
        data: { status: "CANCELLED", outcome: "NO_SHOW", outcomeAt: new Date() },
      });
      await client.usageLog.create({ data: {
        id: randomUUID(), resourceId: ids.resources[1], bookingId: ids.bookings[1], userId: null,
        actorType: "SYSTEM", actorRef: "batch1d-no-show-check", action: "NO_SHOW",
        fromStatus: "CONFIRMED", toStatus: "CANCELLED", reason: "Batch 1D no-show proof",
        message: "Batch 1D no-show outcome", metadata: { fixture: "TEST_ONLY" },
      } });

      await rejectsWithDatabaseError(client.booking.delete({ where: { id: ids.bookings[1] } }));
      await rejectsWithDatabaseError(client.resource.delete({ where: { id: ids.resources[1] } }));

      const dedupeKey = `BOOKING_UPCOMING:${ids.bookings[0]}:2036-01-01T00:45:00Z`;
      await client.notification.create({ data: {
        id: randomUUID(), userId: ids.user, type: "BOOKING_UPCOMING",
        title: "B1D reminder", message: "TEST_ONLY", dedupeKey,
      } });
      await rejectsWithDatabaseError(client.notification.create({ data: {
        id: randomUUID(), userId: ids.user, type: "BOOKING_UPCOMING",
        title: "B1D duplicate", message: "TEST_ONLY", dedupeKey,
      } }));

      assert.equal(await client.telemetrySample.count({ where: { resourceId: ids.resources[0] } }), 0);
      const sample = await client.telemetrySample.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], temperatureC: 24.5,
        humidityPercent: null, online: true, source: "batch1d_test_fixture",
        verifiedSignals: { verified: false, fixture: "TEST_ONLY" },
      } });
      assert.equal(sample.humidityPercent, null);
      await client.telemetrySample.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], temperatureC: 23.0,
        humidityPercent: 0, online: true, source: "batch1d_test_fixture",
        verifiedSignals: { verified: true, signal: "TEST_ONLY" },
      } });
      await client.telemetrySample.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], temperatureC: 25.0,
        humidityPercent: 100, online: false, source: "batch1d_test_fixture",
        verifiedSignals: null,
      } });
      await rejectsWithDatabaseError(client.telemetrySample.create({ data: {
        id: randomUUID(), resourceId: ids.resources[0], humidityPercent: 101,
        online: true, source: "batch1d_test_fixture",
      } }));
    } finally {
      await cleanup(client, ids).catch(() => {});
      await client.$disconnect();
    }
  });
}
