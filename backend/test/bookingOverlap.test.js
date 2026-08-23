import assert from "node:assert/strict";
import test from "node:test";

import { hasTimeOverlap } from "../src/utils/bookingOverlap.js";

test("detects overlapping booking windows", () => {
  const aStart = new Date("2026-07-22T08:00:00Z");
  const aEnd = new Date("2026-07-22T10:00:00Z");
  const bStart = new Date("2026-07-22T09:30:00Z");
  const bEnd = new Date("2026-07-22T11:00:00Z");

  assert.equal(hasTimeOverlap(aStart, aEnd, bStart, bEnd), true);
});

test("allows adjacent booking windows", () => {
  const aStart = new Date("2026-07-22T08:00:00Z");
  const aEnd = new Date("2026-07-22T10:00:00Z");
  const bStart = new Date("2026-07-22T10:00:00Z");
  const bEnd = new Date("2026-07-22T12:00:00Z");

  assert.equal(hasTimeOverlap(aStart, aEnd, bStart, bEnd), false);
});
