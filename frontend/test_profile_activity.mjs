import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileActivity } from './src/utils/profileActivity.ts';

test('activity keeps authoritative totals and measures each status against all bookings', () => {
  const result = buildProfileActivity({ total: 9, active: 4, completed: 1, byStatus: { CANCELLED: 4, COMPLETED: 1, CONFIRMED: 4 } });
  assert.deepEqual([result.total, result.active, result.completed], [9, 4, 1]);
  assert.deepEqual(result.rows.map(row => [row.status, row.count]), [['CONFIRMED', 4], ['COMPLETED', 1], ['CANCELLED', 4]]);
  assert.equal(result.rows[0].ratio, 4 / 9);
  assert.equal(result.rows[1].ratio, 1 / 9);
});
test('empty history is distinct from missing, partial or inconsistent data', () => {
  assert.deepEqual(buildProfileActivity({ total: 0, active: 0, completed: 0, byStatus: {} }), { total: 0, active: 0, completed: 0, rows: [] });
  for (const value of [undefined, null, {}, { total: 9, active: 4, completed: 1 }, { total: 9, active: 4, completed: 1, byStatus: { CONFIRMED: 4 } }]) assert.equal(buildProfileActivity(value), null);
});
test('invalid counts never produce a chart or misleading percentages', () => {
  const base = { total: 3, active: 1, completed: 2, byStatus: { CONFIRMED: 1, COMPLETED: 2 } };
  for (const value of [-1, 0.5, NaN, Infinity, '3']) assert.equal(buildProfileActivity({ ...base, total: value }), null);
  assert.equal(buildProfileActivity({ ...base, active: 2 }), null);
  assert.equal(buildProfileActivity({ ...base, active: 0 }), null);
  assert.equal(buildProfileActivity({ ...base, completed: 1 }), null);
  assert.equal(buildProfileActivity({ ...base, byStatus: { CONFIRMED: -1, COMPLETED: 4 } }), null);
});
test('unrecognized server statuses retain their data without being relabeled as a known state', () => {
  const result = buildProfileActivity({ total: 2, active: 0, completed: 0, byStatus: { FUTURE_STATUS: 2, CONFIRMED: 0 } });
  assert.deepEqual(result.rows, [{ status: 'FUTURE_STATUS', count: 2, ratio: 1 }]);
});
