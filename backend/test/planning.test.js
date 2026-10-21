import test from 'node:test';
import assert from 'node:assert/strict';
import { policyInput, policySnapshot, occupiesWithTurnaround } from '../src/services/planning/policyModel.js';
const at = minutes => new Date(Date.UTC(2026,9,22,2,minutes));
test('policy rejects contradictory duration, notice and working hours', () => {
  const { revision, ...fields } = policySnapshot(null);
  const input = { ...fields, expectedRevision: revision, reason: 'A meaningful policy change' };
  assert.equal(policyInput.safeParse(input).success, true);
  for (const change of [{ minBookingMinutes: 500 }, { workDayStartHour: 20 }, { minAdvanceBookingMinutes: 43200, maxAdvanceBookingDays: 1 }, { turnaroundMinutes: 241 }])
    assert.equal(policyInput.safeParse({ ...input, ...change }).success, false);
});
test('turnaround keeps half-open boundary and protects preparation before next booking', () => {
  const row = { startAt: at(0), endAt: at(60), policySnapshot: { turnaroundMinutes: 20 } };
  assert.equal(occupiesWithTurnaround(row, at(79), at(100)), true);
  assert.equal(occupiesWithTurnaround(row, at(80), at(100)), false);
  assert.equal(occupiesWithTurnaround(row, at(-30), at(-10), 20), true);
  assert.equal(occupiesWithTurnaround(row, at(-30), at(-20), 20), false);
});
test('early return starts declared preparation while zero-buffer legacy returns release immediately', () => {
  const row = { startAt: at(0), endAt: at(120), schedulingReleasedAt: at(30), policySnapshot: { turnaroundMinutes: 20 } };
  assert.equal(occupiesWithTurnaround(row, at(40), at(60)), true);
  assert.equal(occupiesWithTurnaround(row, at(50), at(60)), false);
  assert.equal(occupiesWithTurnaround({ ...row, policySnapshot: {} }, at(20), at(60)), false);
});
