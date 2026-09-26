import assert from "node:assert/strict";
import {
  parseVietnamParts,
  toVietnamDateString,
  toVietnamTimeString,
  toVietnamHour,
  vietnamTimeToIso,
  formatVietnamDateTime,
  getVietnamTodayDateString,
  getVietnamTomorrowDateString
} from "./src/utils/timezone.ts";

console.log("=== RUNNING VIETNAM TIMEZONE BOUNDARY TESTS ===");

// 1. Exact UTC midnight boundary for UTC+7 (17:00:00 UTC = 00:00:00 VN next day)
{
  const beforeMidnightUtc = "2026-09-26T16:59:59.000Z";
  assert.equal(toVietnamDateString(beforeMidnightUtc), "2026-09-26");
  assert.equal(toVietnamTimeString(beforeMidnightUtc), "23:59");
  assert.equal(toVietnamHour(beforeMidnightUtc), 23);

  const exactMidnightUtc = "2026-09-26T17:00:00.000Z";
  assert.equal(toVietnamDateString(exactMidnightUtc), "2026-09-27");
  assert.equal(toVietnamTimeString(exactMidnightUtc), "00:00");
  assert.equal(toVietnamHour(exactMidnightUtc), 0);

  const afterMidnightUtc = "2026-09-26T17:00:01.000Z";
  assert.equal(toVietnamDateString(afterMidnightUtc), "2026-09-27");
  assert.equal(toVietnamTimeString(afterMidnightUtc), "00:00");
}

// 2. Month and Year rollover
{
  const endOfYearUtc = "2026-12-31T16:59:59.000Z";
  assert.equal(toVietnamDateString(endOfYearUtc), "2026-12-31");
  const newYearUtc = "2026-12-31T17:00:00.000Z";
  assert.equal(toVietnamDateString(newYearUtc), "2027-01-01");
  assert.equal(toVietnamHour(newYearUtc), 0);
}

// 3. Conversion to ISO (UTC) from Vietnam local date and time
{
  const iso = vietnamTimeToIso("2026-09-27", "09:00");
  assert.equal(iso, "2026-09-27T02:00:00.000Z");

  const isoMidnight = vietnamTimeToIso("2026-09-27", "00:00");
  assert.equal(isoMidnight, "2026-09-26T17:00:00.000Z");

  const isoEndOfDay = vietnamTimeToIso("2026-09-27", "23:59");
  assert.equal(isoEndOfDay, "2026-09-27T16:59:00.000Z");
}

// 4. Formatting Vietnam Date Time
{
  const formatted = formatVietnamDateTime("2026-09-27T02:30:00.000Z");
  assert.equal(formatted, "27/09/2026 09:30");

  const formattedNull = formatVietnamDateTime(null);
  assert.equal(formattedNull, "—");
}

// 5. getVietnamTodayDateString() and getVietnamTomorrowDateString()
{
  const today = getVietnamTodayDateString();
  const tomorrow = getVietnamTomorrowDateString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(tomorrow, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(today, tomorrow);
}

console.log("All Vietnam timezone boundary tests PASS!");
