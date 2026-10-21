import assert from 'node:assert/strict';
import test from 'node:test';
import { assertBookingNotice, earliestBookingStart } from '../src/services/bookingNoticePolicy.js';

const now = new Date('2026-10-19T08:19:00.000Z');
for (const [name, policy, minutes] of [['default without policy', null, 30], ['default with old projection', {}, 30], ['LAB notice', { minAdvanceBookingMinutes: 1440 }, 1440]]) {
  test(`${name}: exact minimum is accepted, one millisecond earlier is rejected`, () => {
    const boundary = earliestBookingStart(policy, now);
    assert.equal(+boundary - +now, minutes * 60000);
    assert.doesNotThrow(() => assertBookingNotice({ policy, startAt: boundary, now }));
    assert.throws(() => assertBookingNotice({ policy, startAt: new Date(+boundary - 1), now }), error =>
      error.code === 'BOOKING_NOTICE_REQUIRED' && error.details.minAdvanceBookingMinutes === minutes && error.details.earliestStartAt === boundary.toISOString());
  });
}
test('the reported 15:19 to 15:20 booking fails even without a LAB policy', () => {
  assert.throws(() => assertBookingNotice({ startAt: '2026-10-19T15:20:00+07:00', now }), { code: 'BOOKING_NOTICE_REQUIRED' });
});
test('elapsed review time is evaluated again instead of trusting the earlier check', () => {
  const startAt = new Date(+now + 30 * 60000);
  assertBookingNotice({ startAt, now });
  assert.throws(() => assertBookingNotice({ startAt, now: new Date(+now + 1) }), { code: 'BOOKING_NOTICE_REQUIRED' });
});
