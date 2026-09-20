/**
 * Canonical booking status constants and state machine.
 *
 * NO_SHOW is NOT a BookingStatus — it is represented as a BookingOutcome / audit event.
 */

// --- Booking statuses ---
export const PENDING_APPROVAL = "PENDING_APPROVAL";
export const CONFIRMED = "CONFIRMED";
export const CHECKED_OUT = "CHECKED_OUT";
export const RETURNED = "RETURNED";
export const COMPLETED = "COMPLETED";
export const REJECTED = "REJECTED";
export const CANCELLED = "CANCELLED";

/** All canonical booking statuses. */
export const ALL_BOOKING_STATUSES = [
  PENDING_APPROVAL, CONFIRMED, CHECKED_OUT, RETURNED,
  COMPLETED, REJECTED, CANCELLED
];
export const CANONICAL_BOOKING_STATUSES = ALL_BOOKING_STATUSES;

/**
 * Active (reserving) statuses that participate in overlap protection.
 * These are the statuses used in the PostgreSQL GiST exclusion constraint.
 */
export const ACTIVE_BOOKING_STATUSES = [
  PENDING_APPROVAL, CONFIRMED, CHECKED_OUT, RETURNED
];

/** Terminal statuses that do not block future time ranges. */
export const TERMINAL_STATUSES = [COMPLETED, REJECTED, CANCELLED];

/**
 * Allowed transitions map.
 *
 * PENDING_APPROVAL -> CONFIRMED, REJECTED, CANCELLED
 * CONFIRMED -> CHECKED_OUT, CANCELLED
 * CHECKED_OUT -> RETURNED
 * RETURNED -> COMPLETED
 * COMPLETED, REJECTED, CANCELLED -> (terminal, no transitions)
 */
export const ALLOWED_TRANSITIONS = {
  [PENDING_APPROVAL]: [CONFIRMED, REJECTED, CANCELLED],
  [CONFIRMED]: [CHECKED_OUT, CANCELLED],
  [CHECKED_OUT]: [RETURNED],
  [RETURNED]: [COMPLETED],
  [COMPLETED]: [],
  [REJECTED]: [],
  [CANCELLED]: []
};

/**
 * Checks if a transition from one status to another is valid.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Returns whether a status is terminal (no further transitions allowed).
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Returns whether a status is an active reserving status.
 * @param {string} status
 * @returns {boolean}
 */
export function isActiveStatus(status) {
  return ACTIVE_BOOKING_STATUSES.includes(status);
}

export const isActiveBookingStatus = isActiveStatus;

export function getAllowedNextStatuses(status) {
  return ALLOWED_TRANSITIONS[status] || [];
}
