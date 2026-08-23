import assert from "node:assert/strict";
import test from "node:test";

import { computeEquipmentHealthIndex, computeResourceReadinessScore, generateDigitalTwinReplay } from "../src/services/digitalTwinV2Service.js";
import { runWhatIfSimulation } from "../src/services/whatIfService.js";
import { runConcurrencyStressTest } from "../src/research/concurrencyBenchmark.js";

test("Digital Twin V2: Computes accurate multi-factor Equipment Health Index", () => {
  // Healthy nominal equipment
  const healthy = computeEquipmentHealthIndex({
    temperatureC: 58,
    powerWatts: 320,
    vibrationMmS: 0.15,
    gpuPercent: 50
  });

  assert.ok(healthy.healthIndex >= 85, `Health index (${healthy.healthIndex}) should be >= 85 for nominal state`);
  assert.equal(healthy.tier, "Xuất Sắc");
  assert.equal(healthy.requiresImmediateMaintenance, false);

  // Critical degraded equipment
  const critical = computeEquipmentHealthIndex({
    temperatureC: 92,
    powerWatts: 620,
    vibrationMmS: 2.10,
    gpuPercent: 95
  });

  assert.ok(critical.healthIndex < 40, `Health index (${critical.healthIndex}) should be < 40 for critical state`);
  assert.equal(critical.tier, "Nguy Hiểm / Dừng Khẩn Cấp");
  assert.equal(critical.requiresImmediateMaintenance, true);
});

test("Digital Twin V2: Computes Resource Readiness Score linking health to optimizer", () => {
  const resource = { id: "res-1", code: "GPU-H100-01", operationalStatus: "available" };
  const liveTelemetry = { metrics: { temperatureC: 60, powerWatts: 300, vibrationMmS: 0.12, gpuPercent: 40 } };

  const readiness = computeResourceReadinessScore(resource, liveTelemetry);
  assert.ok(readiness.readinessScore >= 70, `Readiness (${readiness.readinessScore}) should be >= 70`);
  assert.equal(readiness.isRecommendedForScheduling, true);
});

test("Digital Twin V2: Generates Historical Telemetry Replay timeline", () => {
  const resource = { id: "res-1", code: "GPU-01", name: "GPU Node 1" };
  const start = new Date("2026-08-20T08:00:00Z");
  const end = new Date("2026-08-20T12:00:00Z");

  const frames = generateDigitalTwinReplay(resource, start, end, 30);
  assert.ok(frames.length >= 8, `Replay should have at least 8 frames for 4 hours at 30-min intervals`);
  assert.equal(frames[0].dataSource, "SIMULATED");
});

test("What-If Engine: Runs side-by-side counterfactual comparisons", () => {
  // Test Extra GPUs capacity expansion
  const extraGpuResult = runWhatIfSimulation({
    scenarioType: "EXTRA_GPUS",
    modifier: { extraGpuCount: 2 }
  });

  assert.equal(extraGpuResult.success, true);
  assert.equal(extraGpuResult.comparison.counterfactual.availableResources, extraGpuResult.comparison.baseline.availableResources + 2);
  assert.ok(extraGpuResult.aiSynthesis.length > 0);

  // Test Node Failure scenario
  const failResult = runWhatIfSimulation({
    scenarioType: "NODE_FAILURE"
  });
  assert.equal(failResult.success, true);
  assert.equal(failResult.comparison.counterfactual.availableResources, failResult.comparison.baseline.availableResources - 1);
});

test("Concurrency Benchmark: 50 simultaneous workers strictly prevent double-booking (0 duplicates)", async () => {
  const benchmark = await runConcurrencyStressTest({
    concurrencyLevel: 50,
    targetResourceId: "res-gpu-01",
    slot: { startHour: 10, endHour: 12 }
  });

  assert.equal(benchmark.metrics.totalRequests, 50);
  assert.equal(benchmark.metrics.successfulBookings, 1, "Exactly 1 request must succeed");
  assert.equal(benchmark.metrics.rejectedConflicts, 49, "Remaining 49 requests must be safely rejected with conflict");
  assert.equal(benchmark.metrics.duplicateBookings, 0, "Must have ZERO duplicate bookings");
  assert.equal(benchmark.metrics.doubleBookingPrevented, true);
});
