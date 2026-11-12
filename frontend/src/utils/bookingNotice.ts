export type BookingNoticePolicy = { minAdvanceBookingMinutes?: number | null };
export function minimumBookingNotice(policy?: BookingNoticePolicy | null) {
  return Math.max(30, policy?.minAdvanceBookingMinutes ?? 30);
}
export function bookingNoticeSatisfied(startAt: string, policy?: BookingNoticePolicy | null, now = Date.now()) {
  return Date.parse(startAt) >= now + minimumBookingNotice(policy) * 60000;
}
