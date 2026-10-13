import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeTimeContext } from '../src/chatgptBridge/timeContext.js';

test('relative LAB dates cross midnight in Vietnam before the UTC date changes', () => {
  const before = bridgeTimeContext(new Date('2026-10-13T16:59:59.000Z'));
  assert.equal(before.today, '2026-10-13');
  assert.equal(before.tomorrow, '2026-10-14');
  const after = bridgeTimeContext(new Date('2026-10-13T17:00:00.000Z'));
  assert.deepEqual(after, { timeZone: 'Asia/Ho_Chi_Minh', nowVietnam: '2026-10-14T00:00:00.000+07:00',
    today: '2026-10-14', tomorrow: '2026-10-15' });
  assert.equal(Date.parse(after.nowVietnam), Date.parse('2026-10-13T17:00:00.000Z'));
});

test('Vietnam tomorrow handles leap days and year rollover', () => {
  assert.equal(bridgeTimeContext(new Date('2028-02-28T18:00:00Z')).tomorrow, '2028-03-01');
  assert.equal(bridgeTimeContext(new Date('2026-12-31T03:00:00Z')).tomorrow, '2027-01-01');
});
