import assert from "node:assert";
import test from "node:test";

import { calculatePriorityScore, findBumpProposals } from "../src/services/prioritySchedulerService.js";
import { analyzeResourceHealth } from "../src/services/predictiveMaintenanceService.js";
import { estimateJobImpact } from "../src/services/jobEstimatorService.js";

test("Priority Scheduler Engine calculates correct scores based on weighted factors", () => {
  const phdScore = calculatePriorityScore({
    userRole: "phd_researcher",
    projectUrgency: "paper_deadline",
    noShowRate: 0,
    recentUsageHours: 5
  });

  const undergradScore = calculatePriorityScore({
    userRole: "undergrad_student",
    projectUrgency: "personal_learning",
    noShowRate: 0.2,
    recentUsageHours: 45
  });

  assert.ok(phdScore.totalScore > undergradScore.totalScore);
  assert.strictEqual(phdScore.tier, "CRITICAL_PRIORITY");
});

test("Priority Scheduler generates bump proposal when priority delta >= 25", () => {
  const targetBooking = { id: "b-1", userRole: "phd_researcher", projectUrgency: "paper_deadline" };
  const existingBookings = [
    { id: "b-2", title: "Test Job 1", requestedBy: { fullName: "SV A", role: "undergrad_student" }, projectUrgency: "personal_learning", status: "approved" }
  ];

  const result = findBumpProposals({ targetBooking, existingBookings });

  assert.strictEqual(result.proposalsFound, 1);
  assert.strictEqual(result.candidates[0].canBump, true);
  assert.strictEqual(result.candidates[0].compensationQuotaHours, 4);
});

test("Predictive Maintenance Engine computes RUL and detects thermal anomalies", () => {
  const highTempTelemetry = [
    { gpuTemp: 85, powerWatts: 350, fanPercent: 90 },
    { gpuTemp: 88, powerWatts: 360, fanPercent: 95 },
    { gpuTemp: 82, powerWatts: 340, fanPercent: 88 }
  ];

  const report = analyzeResourceHealth(highTempTelemetry);

  assert.strictEqual(report.thermalStressLevel, "HIGH");
  assert.ok(report.healthIndex < 75);
  assert.ok(report.estimatedRulDays < 150);
});

test("Green AI Estimator calculates energy kWh, electricity cost, and carbon footprint", () => {
  const estimation = estimateJobImpact({
    modelType: "LLM_FINETUNE",
    durationHours: 10,
    gpuCount: 4
  });

  // 4 GPUs * 400W * 10h = 16,000 W-h = 16 kWh
  assert.strictEqual(estimation.energyKwh, 16);
  assert.strictEqual(estimation.estimatedCostVnd, 16 * 2500); // 40,000 VND
  assert.strictEqual(estimation.carbonFootprintKg, 16 * 0.72); // 11.52 kg CO2
});
