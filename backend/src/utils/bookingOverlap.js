import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";

/**
 * Returns the canonical active booking statuses used by the GiST exclusion constraint.
 */
export function activeBookingStatuses() {
  return ACTIVE_BOOKING_STATUSES;
}

export function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Builds a Prisma where clause for finding overlapping active bookings.
 * Uses canonical uppercase statuses matching the database constraint.
 */
export function bookingOverlapWhere({ resourceId, startAt, endAt, excludeBookingId }) {
  return {
    resourceId,
    status: { in: ACTIVE_BOOKING_STATUSES },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    startAt: { lt: endAt },
    endAt: { gt: startAt }
  };
}
