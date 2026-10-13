import test from "node:test";
import assert from "node:assert/strict";
import { operationTotals, careStatus, bookingCareUsage } from "../src/services/resourceCareModel.js";

test("operating hours integrate persisted load segments and clip to service baseline", () => {
  const end = new Date("2026-10-12T03:00:00Z");
  const rows = [
    { startedAt: "2026-10-12T00:00:00Z", endedAt: "2026-10-12T02:00:00Z", loadPercent: 50 },
    { startedAt: "2026-10-12T02:00:00Z", endedAt: null, loadPercent: 100 }
  ];
  assert.deepEqual(operationTotals(rows, end), { hours: 3, equivalentLoadHours: 2 });
  assert.deepEqual(operationTotals(rows, end, new Date("2026-10-12T01:00:00Z")), { hours: 2, equivalentLoadHours: 1.5 });
  assert.deepEqual(operationTotals([], end), { hours: 0, equivalentLoadHours: 0 });
});
test("maintenance counts completed handovers, not requests or workload segments", () => {
  const now = new Date("2026-10-12T03:00:00Z"), since = new Date("2026-10-12T01:00:00Z");
  const usage = bookingCareUsage([
    { actualStartAt: null, actualEndAt: null },
    { actualStartAt: "2026-10-12T00:00:00Z", actualEndAt: "2026-10-12T02:00:00Z" },
    { actualStartAt: "2026-10-12T02:00:00Z", actualEndAt: "2026-10-12T02:30:00Z" },
    { actualStartAt: "2026-10-12T02:30:00Z", actualEndAt: null }
  ], now, since);
  assert.deepEqual(usage, { hours: 2, uses: 1 });
  const profile = { servicedAt: since, intervalUses: 10, warningPercent: 80 };
  assert.equal(careStatus(profile, 0, now, 7).nearDue, false);
  assert.equal(careStatus(profile, 0, now, 8).nearDue, true);
  assert.equal(careStatus(profile, 0, now, 8).due, false);
  assert.equal(careStatus(profile, 0, now, 10).due, true);
});
test("maintenance becomes due at exact calendar or operating-hour boundary", () => {
  const profile = { servicedAt: new Date("2026-10-11T00:00:00Z"), intervalDays: 1, intervalHours: 100 };
  assert.equal(careStatus(profile, 10, new Date("2026-10-11T23:59:59Z")).due, false);
  assert.equal(careStatus(profile, 10, new Date("2026-10-12T00:00:00Z")).due, true);
  assert.equal(careStatus(profile, 100, new Date("2026-10-11T01:00:00Z")).due, true);
  assert.equal(careStatus(null, 100).configured, false);
});
