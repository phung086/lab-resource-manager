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
  const startAt = new Date("2026-09-22T16:00:00");
  const endAt = new Date("2026-09-22T19:30:00"); // 19:30 > 18:00

  const policy = { workDayStartHour: 8, workDayEndHour: 18 };

  assert.throws(
    () => checkLabPolicyCompliance({ policy, startAt, endAt, now }),
    (err) => err.status === 400 && err.code === "POLICY_VIOLATION" && err.message.includes("closing hour")
  );
});
