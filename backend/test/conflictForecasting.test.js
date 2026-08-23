import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  calculateSlotCongestionProbability,
  generateWeeklyCongestionForecast,
  proposeShiftRecommendation,
  CONGESTION_WARNING_THRESHOLD
} from "../src/services/conflictForecastingService.js";

test("Phase 4 - Congestion Probability: Computes exact historical demand ratio across sliding window", () => {
  // Mock 8-week history with 2 GPU servers: Total Capacity = 2 servers * 8 weeks * 1h = 16 hours
  const mockHistoricalBookings = [
    // 7 bookings on Wednesday (dayOfWeek=3) at 14:00 (duration 2h each -> 14 demand hours)
    { id: "h1", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h2", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h3", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h4", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h5", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h6", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" },
    { id: "h7", dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 2, resourceCategory: "GPU_SERVER", status: "completed" }
  ];

  const result = calculateSlotCongestionProbability({
    historicalBookings: mockHistoricalBookings,
    dayOfWeek: 3, // Wednesday
    hourSlot: 14,
    resourceCategory: "GPU_SERVER",
    resourceCount: 2,
    rollingWeeks: 8
  });

  // Demand = 14 hours, Capacity = 16 hours -> P = 14 / 16 = 0.875 (87.5%)
  assert.equal(result.capacityHours, 16);
  assert.equal(result.totalDemandHours, 14.0);
  assert.equal(result.congestionProbability, 0.875);
  assert.equal(result.congestionPercent, 87.5);
  assert.equal(result.isWarning, true);
  assert.equal(result.statusLabel, "CẢNH BÁO NGUY CƠ QUÁ TẢI");
});

test("Phase 4 - Warning Threshold Invariant: Triggers at P >= 0.75 and remains safe at P < 0.75", () => {
  // Case A: P = 0.75 (12 hours / 16 capacity hours) -> Warning
  const mock75 = [
    { dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 6, resourceCategory: "GPU_SERVER", status: "completed" },
    { dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 6, resourceCategory: "GPU_SERVER", status: "completed" }
  ];
  const res75 = calculateSlotCongestionProbability({
    historicalBookings: mock75,
    dayOfWeek: 3,
    hourSlot: 14,
    totalCapacityHours: 16
  });
  assert.equal(res75.congestionProbability, 0.75);
  assert.equal(res75.isWarning, true);

  // Case B: P = 0.50 (8 hours / 16 capacity hours) -> Safe (No Warning)
  const mock50 = [
    { dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 8, resourceCategory: "GPU_SERVER", status: "completed" }
  ];
  const res50 = calculateSlotCongestionProbability({
    historicalBookings: mock50,
    dayOfWeek: 3,
    hourSlot: 14,
    totalCapacityHours: 16
  });
  assert.equal(res50.congestionProbability, 0.50);
  assert.equal(res50.isWarning, false);
  assert.equal(res50.statusLabel, "TẢI TIÊU CHUẨN AN TOÀN");
});

test("Phase 4 - Shift Recommendation: Proposes cold alternative slot when booking lands in congested window", () => {
  const mockHistorical = [
    // Slot 14:00 heavily congested (14h / 16h = 87.5%)
    { dayOfWeek: 3, startHour: 14, endHour: 16, durationHours: 14, resourceCategory: "GPU_SERVER", status: "completed" },
    // Slot 10:00 lightly used (3h / 16h = 18.8%)
    { dayOfWeek: 3, startHour: 10, endHour: 12, durationHours: 3, resourceCategory: "GPU_SERVER", status: "completed" }
  ];

  const proposedBooking = {
    dayOfWeek: 3,
    startHour: 14,
    resourceCategory: "GPU_SERVER"
  };

  const shiftRes = proposeShiftRecommendation({
    booking: proposedBooking,
    historicalBookings: mockHistorical,
    rollingWeeks: 8
  });

  assert.equal(shiftRes.hasConflictRisk, true);
  assert.equal(shiftRes.congestionPercent, 87.5);
  assert.equal(shiftRes.currentSlot, "14:00");
  assert.equal(shiftRes.suggestedShiftSlot, "9:00");
  assert.ok(shiftRes.suggestedShiftCongestionPercent < 40.0);
  assert.ok(shiftRes.recommendationText.includes("Đề xuất dịch chuyển sang 9:00"));
});

test("Phase 4 - Terminology Compliance: Strictly zero occurrences of 'AI' or 'machine learning' in forecasting module", () => {
  const serviceFilePath = path.join(process.cwd(), "src", "services", "conflictForecastingService.js");
  const content = fs.readFileSync(serviceFilePath, "utf8");

  // Regex checks for banned buzzwords
  const bannedPatterns = [
    /\bmachine\s*learning\b/i,
    /\bhọc\s*máy\b/i,
    /\bneural\b/i,
    /\bdeep\s*learning\b/i,
    /\bAI-driven\s*forecasting\b/i,
    /\bmô\s*hình\s*AI\b/i
  ];

  for (const pattern of bannedPatterns) {
    assert.equal(
      pattern.test(content),
      false,
      `Banned terminology match found: ${pattern.toString()} in conflictForecastingService.js`
    );
  }
});
