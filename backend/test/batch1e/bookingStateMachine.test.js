import assert from "node:assert/strict";
import test from "node:test";

import {
  PENDING_APPROVAL,
  CONFIRMED,
  CHECKED_OUT,
  RETURNED,
  COMPLETED,
  REJECTED,
  CANCELLED,
  CANONICAL_BOOKING_STATUSES,
  ACTIVE_BOOKING_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  isValidTransition,
  isTerminalStatus,
  isActiveBookingStatus,
  getAllowedNextStatuses
} from "../../src/constants/bookingStatus.js";

test("Canonical statuses array contains exactly the 7 verified statuses", () => {
  assert.equal(CANONICAL_BOOKING_STATUSES.length, 7);
  assert.deepEqual(CANONICAL_BOOKING_STATUSES, [
    PENDING_APPROVAL,
    CONFIRMED,
    CHECKED_OUT,
    RETURNED,
    COMPLETED,
    REJECTED,
    CANCELLED
  ]);
  // NO_SHOW is NOT a BookingStatus
  assert.ok(!CANONICAL_BOOKING_STATUSES.includes("NO_SHOW"));
  assert.ok(!CANONICAL_BOOKING_STATUSES.includes("no_show"));
});

test("Active booking statuses used for exclusion constraint", () => {
  assert.equal(ACTIVE_BOOKING_STATUSES.length, 4);
  assert.ok(ACTIVE_BOOKING_STATUSES.includes(PENDING_APPROVAL));
  assert.ok(ACTIVE_BOOKING_STATUSES.includes(CONFIRMED));
  assert.ok(ACTIVE_BOOKING_STATUSES.includes(CHECKED_OUT));
  assert.ok(ACTIVE_BOOKING_STATUSES.includes(RETURNED));
  // Terminal statuses do not block
  assert.ok(!ACTIVE_BOOKING_STATUSES.includes(COMPLETED));
  assert.ok(!ACTIVE_BOOKING_STATUSES.includes(REJECTED));
  assert.ok(!ACTIVE_BOOKING_STATUSES.includes(CANCELLED));
});

test("Terminal statuses cannot transition further", () => {
  assert.deepEqual(TERMINAL_STATUSES, [COMPLETED, REJECTED, CANCELLED]);
  for (const terminal of TERMINAL_STATUSES) {
    assert.equal(isTerminalStatus(terminal), true);
    assert.deepEqual(getAllowedNextStatuses(terminal), []);
    for (const target of CANONICAL_BOOKING_STATUSES) {
      assert.equal(isValidTransition(terminal, target), false);
    }
  }
});

test("Valid lifecycle transitions succeed", () => {
  // PENDING_APPROVAL -> CONFIRMED (approve)
  assert.equal(isValidTransition(PENDING_APPROVAL, CONFIRMED), true);
  // PENDING_APPROVAL -> REJECTED (reject)
  assert.equal(isValidTransition(PENDING_APPROVAL, REJECTED), true);
  // PENDING_APPROVAL -> CANCELLED (cancel)
  assert.equal(isValidTransition(PENDING_APPROVAL, CANCELLED), true);

  // CONFIRMED -> CHECKED_OUT (check-out)
  assert.equal(isValidTransition(CONFIRMED, CHECKED_OUT), true);
  // CONFIRMED -> CANCELLED (cancel)
  assert.equal(isValidTransition(CONFIRMED, CANCELLED), true);

  // CHECKED_OUT -> RETURNED (return)
  assert.equal(isValidTransition(CHECKED_OUT, RETURNED), true);

  // RETURNED -> COMPLETED (complete)
  assert.equal(isValidTransition(RETURNED, COMPLETED), true);
});

test("Invalid lifecycle transitions are rejected", () => {
  // Cannot skip approval straight to checked_out
  assert.equal(isValidTransition(PENDING_APPROVAL, CHECKED_OUT), false);
  // Cannot skip to completed
  assert.equal(isValidTransition(PENDING_APPROVAL, COMPLETED), false);
  // Cannot checkout directly to completed without return
  assert.equal(isValidTransition(CHECKED_OUT, COMPLETED), false);
  // Cannot cancel after checkout
  assert.equal(isValidTransition(CHECKED_OUT, CANCELLED), false);
  // Cannot cancel after return
  assert.equal(isValidTransition(RETURNED, CANCELLED), false);
  // Cannot transition backward
  assert.equal(isValidTransition(CONFIRMED, PENDING_APPROVAL), false);
  assert.equal(isValidTransition(CHECKED_OUT, CONFIRMED), false);
  assert.equal(isValidTransition(RETURNED, CHECKED_OUT), false);
  assert.equal(isValidTransition(COMPLETED, RETURNED), false);
});
