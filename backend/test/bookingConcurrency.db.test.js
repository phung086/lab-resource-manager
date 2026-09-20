import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { batch1DClient, assertTargetIdentity, assertBatch1DDatabase } from "./helpers/batch1dDatabase.js";

const databases = (process.env.BATCH1D_DATABASES ?? "").split(",").filter(Boolean);
assert.ok(databases.length > 0, "BATCH1D_DATABASES is required");
databases.forEach(assertBatch1DDatabase);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function hasSqlState(error, state) {
  const seen = new Set();
  const visit = (value) => {
    if (value === state) return true;
    if (!value || typeof value !== "object" || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).some(visit);
  };
  return visit(error) || String(error?.message).includes(state) || JSON.stringify(error?.meta ?? {}).includes(state);
}

async function booking(tx, fixture, resourceId, status, startAt, endAt) {
  return tx.booking.create({ data: {
    id: randomUUID(), resourceId, requestedById: fixture.user,
    title: "B1D concurrency booking", purpose: "TEST_ONLY", status, startAt, endAt,
  } });
}

async function maintenance(tx, fixture, resourceId, startAt, endAt) {
  return tx.maintenanceWindow.create({ data: {
    id: randomUUID(), resourceId, createdById: fixture.user,
    title: "B1D concurrency maintenance", startAt, endAt,
  } });
}

async function leaderFollower(clientA, clientB, leader, follower) {
  let release;
  let inserted;
  const leaderInserted = new Promise((resolve) => { inserted = resolve; });
  const holdLeader = new Promise((resolve) => { release = resolve; });
  const first = clientA.$transaction(async (tx) => {
    await leader(tx);
    inserted();
    await holdLeader;
  }, { timeout: 10000 });
  await leaderInserted;
  const second = clientB.$transaction(async (tx) => follower(tx), { timeout: 10000 });
  await delay(250);
  release();
  return Promise.allSettled([first, second]);
}

for (const database of databases) {
  test(`${database}: real booking and maintenance concurrency`, { timeout: 120000 }, async () => {
    const setup = await batch1DClient(database);
    const clientA = await batch1DClient(database);
    const clientB = await batch1DClient(database);
    const token = randomUUID();
    const fixture = {
      campus: randomUUID(), building: randomUUID(), lab: randomUUID(), user: randomUUID(),
      resources: Array.from({ length: 9 }, () => randomUUID()),
    };
    const day = (offset, hour, minute = 0) => new Date(Date.UTC(2037, 0, offset, hour, minute));
    try {
      await assertTargetIdentity(setup, database, { readOnly: false });
      await setup.campus.create({ data: { id: fixture.campus, name: "B1D C", code: `B1DC-${token}` } });
      await setup.building.create({ data: {
        id: fixture.building, campusId: fixture.campus, name: "B1D B", code: `B1DB-${token}`,
      } });
      await setup.laboratory.create({ data: {
        id: fixture.lab, buildingId: fixture.building, name: "B1D L", code: `B1DL-${token}`,
      } });
      await setup.user.create({ data: {
        id: fixture.user, email: `b1d-concurrency-${token}@example.test`,
        fullName: "B1D Concurrency User", role: "LECTURER", passwordHash: "TEST_ONLY",
      } });
      for (let index = 0; index < fixture.resources.length; index += 1) {
        await setup.resource.create({ data: {
          id: fixture.resources[index], laboratoryId: fixture.lab, code: `B1DCR-${index}-${token}`,
          name: `B1D Resource ${index}`, subtype: "OTHER", category: "EQUIPMENT", location: "TEST_ONLY",
        } });
      }

      const bookingRace = await leaderFollower(clientA, clientB,
        (tx) => booking(tx, fixture, fixture.resources[0], "CONFIRMED", day(1, 10), day(1, 11)),
        (tx) => booking(tx, fixture, fixture.resources[0], "CONFIRMED", day(1, 10, 30), day(1, 11, 30)));
      assert.equal(bookingRace.filter((item) => item.status === "fulfilled").length, 1);
      const bookingFailure = bookingRace.find((item) => item.status === "rejected")?.reason;
      assert.ok(hasSqlState(bookingFailure, "23P01"), `Expected 23P01, got ${bookingFailure}`);

      const adjacent = await Promise.allSettled([
        booking(clientA, fixture, fixture.resources[1], "CONFIRMED", day(2, 10), day(2, 11)),
        booking(clientB, fixture, fixture.resources[1], "CONFIRMED", day(2, 11), day(2, 12)),
      ]);
      assert.equal(adjacent.filter((item) => item.status === "fulfilled").length, 2);

      await booking(setup, fixture, fixture.resources[2], "COMPLETED", day(3, 10), day(3, 11));
      await booking(setup, fixture, fixture.resources[2], "CONFIRMED", day(3, 10, 30), day(3, 11, 30));
      await booking(setup, fixture, fixture.resources[2], "REJECTED", day(3, 12), day(3, 13));
      await booking(setup, fixture, fixture.resources[2], "CONFIRMED", day(3, 12, 30), day(3, 13, 30));
      await booking(setup, fixture, fixture.resources[2], "CANCELLED", day(3, 14), day(3, 15));
      await booking(setup, fixture, fixture.resources[2], "CONFIRMED", day(3, 14, 30), day(3, 15, 30));

      await booking(setup, fixture, fixture.resources[3], "RETURNED", day(4, 10), day(4, 11));
      await assert.rejects(
        booking(setup, fixture, fixture.resources[3], "CONFIRMED", day(4, 10, 30), day(4, 11, 30)),
        (error) => hasSqlState(error, "23P01"));

      const sameTime = await Promise.allSettled(Array.from({ length: 5 }, () =>
        booking(setup, fixture, fixture.resources[4], "PENDING_APPROVAL", day(5, 10), day(5, 11))));
      assert.equal(sameTime.filter((item) => item.status === "fulfilled").length, 1);
      assert.ok(sameTime.filter((item) => item.status === "rejected")
        .every((item) => hasSqlState(item.reason, "23P01")));
      assert.equal(await setup.booking.count({ where: {
        resourceId: fixture.resources[4], status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"] },
      } }), 1);

      const bookingFirst = await leaderFollower(clientA, clientB,
        (tx) => booking(tx, fixture, fixture.resources[5], "CONFIRMED", day(6, 10), day(6, 11)),
        (tx) => maintenance(tx, fixture, fixture.resources[5], day(6, 10, 30), day(6, 11, 30)));
      assert.equal(bookingFirst.filter((item) => item.status === "fulfilled").length, 1);
      assert.ok(hasSqlState(bookingFirst.find((item) => item.status === "rejected")?.reason, "23P01"));

      const maintenanceFirst = await leaderFollower(clientA, clientB,
        (tx) => maintenance(tx, fixture, fixture.resources[6], day(7, 10), day(7, 11)),
        (tx) => booking(tx, fixture, fixture.resources[6], "CONFIRMED", day(7, 10, 30), day(7, 11, 30)));
      assert.equal(maintenanceFirst.filter((item) => item.status === "fulfilled").length, 1);
      assert.ok(hasSqlState(maintenanceFirst.find((item) => item.status === "rejected")?.reason, "23P01"));

      const independent = await Promise.allSettled([
        booking(clientA, fixture, fixture.resources[7], "CONFIRMED", day(8, 10), day(8, 11)),
        maintenance(clientB, fixture, fixture.resources[8], day(8, 10), day(8, 11)),
      ]);
      assert.equal(independent.filter((item) => item.status === "fulfilled").length, 2);

      const nonOverlappingSameResource = await leaderFollower(clientA, clientB,
        (tx) => booking(tx, fixture, fixture.resources[7], "CONFIRMED", day(9, 10), day(9, 11)),
        (tx) => maintenance(tx, fixture, fixture.resources[7], day(9, 11), day(9, 12)));
      assert.equal(nonOverlappingSameResource.filter((item) => item.status === "fulfilled").length, 2);

      await assert.rejects(setup.$transaction(
        (tx) => booking(tx, fixture, fixture.resources[8], "CONFIRMED", day(10, 10), day(10, 11)),
        { isolationLevel: "Serializable" },
      ), (error) => hasSqlState(error, "25000"));
      assert.equal(await setup.booking.count({ where: {
        resourceId: fixture.resources[8], startAt: day(10, 10),
      } }), 0);
    } finally {
      await setup.maintenanceWindow.deleteMany({ where: { resourceId: { in: fixture.resources } } }).catch(() => {});
      await setup.booking.deleteMany({ where: { resourceId: { in: fixture.resources } } }).catch(() => {});
      await setup.resource.deleteMany({ where: { id: { in: fixture.resources } } }).catch(() => {});
      await setup.user.deleteMany({ where: { id: fixture.user } }).catch(() => {});
      await setup.laboratory.deleteMany({ where: { id: fixture.lab } }).catch(() => {});
      await setup.building.deleteMany({ where: { id: fixture.building } }).catch(() => {});
      await setup.campus.deleteMany({ where: { id: fixture.campus } }).catch(() => {});
      await Promise.all([setup.$disconnect(), clientA.$disconnect(), clientB.$disconnect()]);
    }
  });
}
