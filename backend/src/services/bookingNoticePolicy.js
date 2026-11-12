import { HttpError } from '../middleware/errors.js';

// Applies even when a laboratory has no policy row yet.
export const DEFAULT_MIN_ADVANCE_BOOKING_MINUTES = 30;
export function minimumBookingNotice(policy) {
  return Math.max(DEFAULT_MIN_ADVANCE_BOOKING_MINUTES, policy?.minAdvanceBookingMinutes ?? DEFAULT_MIN_ADVANCE_BOOKING_MINUTES);
}
export function earliestBookingStart(policy, now = new Date()) {
  return new Date(+now + minimumBookingNotice(policy) * 60000);
}
export function assertBookingNotice({ policy, startAt, now = new Date() }) {
  const start = new Date(startAt), earliestStartAt = earliestBookingStart(policy, now);
  if (!Number.isFinite(+start)) throw new HttpError(400, 'Invalid booking start time', undefined, 'VALIDATION_ERROR');
  if (+start < +earliestStartAt) throw new HttpError(400, 'Please book earlier than the minimum notice period.', {
    minAdvanceBookingMinutes: minimumBookingNotice(policy), earliestStartAt: earliestStartAt.toISOString()
  }, 'BOOKING_NOTICE_REQUIRED');
}
