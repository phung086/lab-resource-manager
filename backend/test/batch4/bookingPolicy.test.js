import assert from "node:assert/strict";
import test from "node:test";

import { checkLabPolicyCompliance } from "../../src/services/availabilityService.js";

test("passes when no policy is provided", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-21T10:00:00Z");
  const endAt = new Date("2026-09-21T11:00:00Z");

  assert.doesNotThrow(() => {
    checkLabPolicyCompliance({ policy: null, startAt, endAt, now });
  });
});

test("rejects booking in the past", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-20T09:00:00Z");
  const endAt = new Date("2026-09-20T11:00:00Z");

  assert.throws(
    () => checkLabPolicyCompliance({ policy: {}, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("past")
  );
});

test("rejects booking duration shorter than minBookingMinutes", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-21T10:00:00Z");
  const endAt = new Date("2026-09-21T10:15:00Z"); // 15 mins

  const policy = { minBookingMinutes: 30, maxBookingMinutes: 240 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("less than the minimum")
  );
});

test("rejects booking duration longer than maxBookingMinutes", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-21T10:00:00Z");
  const endAt = new Date("2026-09-21T16:00:00Z"); // 360 mins

  const policy = { minBookingMinutes: 30, maxBookingMinutes: 240 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("exceeds the maximum")
  );
});

test("rejects booking placed too far in advance", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-10-15T10:00:00Z"); // 25 days later
  const endAt = new Date("2026-10-15T12:00:00Z");

  const policy = { maxAdvanceBookingDays: 14 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("days in advance")
  );
});

test("rejects weekend booking when allowWeekend is false", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  // 2026-09-26 is a Saturday
  const startAt = new Date("2026-09-26T10:00:00Z");
  const endAt = new Date("2026-09-26T12:00:00Z");

  const policy = { allowWeekend: false };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("Weekend")
  );
});

test("accepts valid booking matching policy", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  // 2026-09-22 is a Tuesday
  const startAt = new Date("2026-09-22T10:00:00");
  const endAt = new Date("2026-09-22T12:00:00");

  const policy = {
    minBookingMinutes: 30,
    maxBookingMinutes: 240,
    maxAdvanceBookingDays: 14,
    allowWeekend: false,
    workDayStartHour: 8,
    workDayEndHour: 18
  };

  assert.doesNotThrow(() => {
    checkLabPolicyCompliance({ policy, startAt, endAt, now });
  });
});

test("rejects booking starting before workDayStartHour", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-22T06:00:00"); // 6 AM < 8 AM
  const endAt = new Date("2026-09-22T09:00:00");

  const policy = { workDayStartHour: 8, workDayEndHour: 18 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("opening hour")
  );
});

test("rejects booking ending after workDayEndHour", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-22T09:00:00Z"); // 16:00 VN
  const endAt = new Date("2026-09-22T12:30:00Z");   // 19:30 VN > 18:00 VN

  const policy = { workDayStartHour: 8, workDayEndHour: 18 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("closing hour")
  );
});

// ─── FIX 7: POLICY DURATION PRECISION TESTS ────────────────────────────────

test("Fix 7: 14m31s does NOT satisfy 15-minute minimum (no rounding up)", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-22T03:00:00Z"); // 10:00 VN
  const endAt = new Date(startAt.getTime() + (14 * 60 + 31) * 1000); // 14m 31s = 871s

  const policy = { minBookingMinutes: 15, maxBookingMinutes: 240 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("less than the minimum")
  );
});

test("Fix 7: Exact 15 minutes satisfies 15-minute minimum", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-22T03:00:00Z"); // 10:00 VN
  const endAt = new Date(startAt.getTime() + 15 * 60 * 1000); // Exact 15m

  const policy = { minBookingMinutes: 15, maxBookingMinutes: 240 };

  assert.doesNotThrow(() => {
    checkLabPolicyCompliance({ policy, startAt, endAt, now });
  });
});

test("Fix 7: 240m01s exceeds 240-minute maximum", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  const startAt = new Date("2026-09-22T03:00:00Z");
  const endAt = new Date(startAt.getTime() + (240 * 60 + 1) * 1000); // 240m 1s

  const policy = { minBookingMinutes: 15, maxBookingMinutes: 240 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("exceeds the maximum")
  );
});

// ─── FIX 4: TIMEZONE CONTRACT TESTS (Asia/Ho_Chi_Minh, UTC+07:00) ──────────

test("Fix 4: UTC 01:00 corresponds to 08:00 Vietnam time and satisfies workDayStartHour: 8", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  // 2026-09-22T01:00:00Z is 08:00:00 on Tuesday in Vietnam (+07:00)
  const startAt = new Date("2026-09-22T01:00:00Z");
  const endAt = new Date("2026-09-22T03:00:00Z"); // 10:00 VN

  const policy = { workDayStartHour: 8, workDayEndHour: 18, allowWeekend: false };

  assert.doesNotThrow(() => {
    checkLabPolicyCompliance({ policy, startAt, endAt, now });
  });
});

test("Fix 4: Friday 22:00 UTC is Saturday 05:00 in Vietnam and is rejected when allowWeekend is false", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  // 2026-09-25 (Friday) at 22:30 UTC is 2026-09-26 (Saturday) at 05:30 in Vietnam!
  const startAt = new Date("2026-09-25T22:30:00Z");
  const endAt = new Date("2026-09-25T23:30:00Z");

  const policy = { allowWeekend: false };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("Weekend")
  );
});

test("Fix 4: Sunday 23:00 UTC is Monday 06:00 in Vietnam and is NOT considered weekend", () => {
  const now = new Date("2026-09-20T10:00:00Z");
  // 2026-09-27 (Sunday) at 23:00 UTC is 2026-09-28 (Monday) at 06:00 in Vietnam!
  const startAt = new Date("2026-09-27T23:00:00Z");
  const endAt = new Date("2026-09-28T01:00:00Z"); // Monday 08:00 VN

  const policy = { allowWeekend: false, minBookingMinutes: 30 };

  // Weekend check should NOT trigger (though early hour might if configured)
  assert.doesNotThrow(() => {
    checkLabPolicyCompliance({ policy, startAt, endAt, now });
  });
});
