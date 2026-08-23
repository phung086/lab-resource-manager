const ACTIVE_BOOKING_STATUSES = ["pending", "approved", "checked_out"];

export function activeBookingStatuses() {
  return ACTIVE_BOOKING_STATUSES;
}

export function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function bookingOverlapWhere({ resourceId, startAt, endAt, excludeBookingId }) {
  return {
    resourceId,
    status: { in: ACTIVE_BOOKING_STATUSES },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    startAt: { lt: endAt },
    endAt: { gt: startAt }
  };
}
