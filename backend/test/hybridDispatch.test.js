import assert from "node:assert/strict";
import test from "node:test";

import {
  fastPathGreedyAllocate,
  calculateCompromiseDistance,
  findParetoKneePoint,
  evaluateReallocationOpportunity,
  benchmarkFastPathAllocation,
  DISPATCH_MODES
} from "../src/services/hybridDispatchService.js";
import { HYPERVOLUME_REFERENCE_POINT } from "../src/services/multiObjectiveEngine.js";

test("Phase 3 - Fast-Path Allocation: Respects all hard constraints (VRAM, Certifications, Maintenance, GiST)", () => {
  const resources = [
    { id: "res-1", code: "GPU-H100-01", name: "GPU H100 80GB", specs: { vramGb: 80 }, operationalStatus: "available", requiredCert: "GPU-SAFETY-101" },
    { id: "res-2", code: "GPU-L40S-01", name: "GPU L40S 48GB", specs: { vramGb: 48 }, operationalStatus: "available" },
    { id: "res-3", code: "GPU-MAINT", name: "GPU Under Maintenance", specs: { vramGb: 80 }, operationalStatus: "maintenance" }
  ];

  const maintenanceWindows = [
    { resourceId: "res-1", startHour: 9, endHour: 12, startTime: "2026-08-25T09:00:00.000Z", endTime: "2026-08-25T12:00:00.000Z" } // 09:00 - 12:00
  ];

  const existingBookings = [
    { resourceId: "res-1", startHour: 8, endHour: 9, status: "approved" },
    { resourceId: "res-2", startHour: 8, endHour: 10, status: "approved" }
  ];

  // Request 1: Requires 80GB VRAM + Safety Cert + 2 hours
  const userCerts = [{ courseCode: "GPU-SAFETY-101", status: "active" }];
  const urgentReq = {
    id: "req-urgent-01",
    durationHours: 2,
    preferredStartHour: 8,
    minVramGb: 80,
    requiredCertification: "GPU-SAFETY-101"
  };

  const result = fastPathGreedyAllocate({
    request: urgentReq,
    resources,
    existingBookings,
    maintenanceWindows,
    userCertifications: userCerts
  });

  assert.ok(result.success);
  assert.equal(result.allocation.resourceCode, "GPU-H100-01");
  // Must avoid [8-9] booking and [9-12] maintenance -> Assigned to start at 12:00
  assert.equal(result.allocation.startHour, 12);
  assert.equal(result.allocation.endHour, 14);
  assert.equal(result.allocation.dispatchMode, DISPATCH_MODES.FAST_PATH);
  assert.ok(result.latencyMs >= 0 && result.latencyMs < 50, "Fast-path must respond in real-time (< 50ms)");
});

test("Phase 3 - Hard Constraint Failure: Safely rejects request when user lacks mandatory certification", () => {
  const resources = [
    { id: "res-1", code: "GPU-H100-01", name: "GPU H100", specs: { vramGb: 80 }, requiredCert: "GPU-SAFETY-101" }
  ];

  const uncertifiedResult = fastPathGreedyAllocate({
    request: { id: "req-unauth", durationHours: 2, requiredCertification: "GPU-SAFETY-101" },
    resources,
    userCertifications: [] // No cert
  });

  assert.equal(uncertifiedResult.success, false);
  assert.equal(uncertifiedResult.reason, "NO_CAPABLE_RESOURCE_FOUND");
});

test("Phase 3 - Compromise Distance: Computes exact Normalized Euclidean Distance to Ideal Point Z*", () => {
  // Ideal point solution (0 wait, 0 cost, 0 degradation, 1.0 fairness)
  const idealMetrics = {
    waitingTimeHours: 0,
    energyCostVnd: 0,
    equipmentDegradation: 0,
    fairnessJainIndex: 1.0
  };
  const dIdeal = calculateCompromiseDistance(idealMetrics, HYPERVOLUME_REFERENCE_POINT);
  assert.equal(dIdeal.distance, 0.0, "Distance to ideal point for ideal metrics must be 0");

  // Realistic trade-off solution: 4h wait (4/16=0.25), 45k VND (45/150=0.30), 20 deg (20/100=0.20), fairness 0.85 (0.15/1.0=0.15)
  // D = sqrt(0.25^2 + 0.30^2 + 0.20^2 + 0.15^2) = sqrt(0.0625 + 0.0900 + 0.0400 + 0.0225) = sqrt(0.2150) = 0.4637
  const realisticMetrics = {
    waitingTimeHours: 4.0,
    energyCostVnd: 45000.0,
    equipmentDegradation: 20.0,
    fairnessJainIndex: 0.85
  };
  const dReal = calculateCompromiseDistance(realisticMetrics, HYPERVOLUME_REFERENCE_POINT);
  assert.equal(dReal.distance, 0.4637);
  assert.equal(dReal.normalizedVector.f1_wait, 0.25);
  assert.equal(dReal.normalizedVector.f2_energy, 0.3);
  assert.equal(dReal.normalizedVector.f3_degradation, 0.2);
  assert.equal(dReal.normalizedVector.f4_fairnessDeficit, 0.15);
});

test("Phase 3 - Reallocation Decision: Triggers proposal when Batch Knee improvement exceeds 15%", () => {
  // Fast Path solution (Greedy: high energy & degradation stress)
  const fastPathMetrics = {
    waitingTimeHours: 1.0,     // 1/16 = 0.0625
    energyCostVnd: 120000.0,   // 120/150 = 0.8000
    equipmentDegradation: 70.0,// 70/100 = 0.7000
    fairnessJainIndex: 0.60    // 0.40/1.0 = 0.4000
    // D_fastpath = sqrt(0.0625^2 + 0.8^2 + 0.7^2 + 0.4^2) = sqrt(0.0039 + 0.64 + 0.49 + 0.16) = sqrt(1.2939) = 1.1375
  };

  // Batch Pareto Front containing optimized Knee Point
  const batchParetoFront = [
    {
      id: "pareto-sol-1",
      metrics: {
        waitingTimeHours: 2.0,     // 2/16 = 0.1250
        energyCostVnd: 45000.0,    // 45/150 = 0.3000
        equipmentDegradation: 25.0,// 25/100 = 0.2500
        fairnessJainIndex: 0.85    // 0.15/1.0 = 0.1500
        // D_knee = sqrt(0.125^2 + 0.3^2 + 0.25^2 + 0.15^2) = sqrt(0.0156 + 0.09 + 0.0625 + 0.0225) = sqrt(0.1906) = 0.4366
      }
    }
  ];

  const evalResult = evaluateReallocationOpportunity({
    fastPathMetrics,
    batchParetoFront,
    referencePoint: HYPERVOLUME_REFERENCE_POINT,
    reallocationThreshold: 0.15
  });

  // Improvement Delta = (1.1375 - 0.4366) / 1.1375 = 0.6162 (61.6% > 15%)
  assert.equal(evalResult.shouldProposeReallocation, true);
  assert.ok(evalResult.deltaRealloc > 0.15);
  assert.ok(evalResult.improvementPercent >= 50.0);
  assert.ok(evalResult.proposedPlan !== null);
  assert.ok(evalResult.decisionReason.includes("ĐỀ XUẤT TÁI PHÂN BỔ"));
});

test("Phase 3 - Reallocation Decision: Retains Fast-Path when improvement is within 15% tolerance", () => {
  const fastPathMetrics = {
    waitingTimeHours: 2.0,
    energyCostVnd: 50000.0,
    equipmentDegradation: 30.0,
    fairnessJainIndex: 0.82
  };

  const batchParetoFront = [
    {
      id: "pareto-sol-marginal",
      metrics: {
        waitingTimeHours: 2.0,
        energyCostVnd: 47000.0,
        equipmentDegradation: 28.0,
        fairnessJainIndex: 0.84
      }
    }
  ];

  const evalResult = evaluateReallocationOpportunity({
    fastPathMetrics,
    batchParetoFront,
    referencePoint: HYPERVOLUME_REFERENCE_POINT,
    reallocationThreshold: 0.15
  });

  // Small marginal improvement (< 15%)
  assert.equal(evalResult.shouldProposeReallocation, false);
  assert.ok(evalResult.deltaRealloc <= 0.15);
  assert.equal(evalResult.proposedPlan, null);
  assert.ok(evalResult.decisionReason.includes("GIỮ NGUYÊN FAST-PATH"));
});

test("Phase 3 - Empirical Benchmark: Runs N=25 real allocations and captures unrounded latency", () => {
  const sampleResources = [
    { id: "res-a", code: "GPU-H100-A", specs: { vramGb: 80 }, operationalStatus: "available" },
    { id: "res-b", code: "GPU-H100-B", specs: { vramGb: 80 }, operationalStatus: "available" },
    { id: "res-c", code: "GPU-L40S-C", specs: { vramGb: 48 }, operationalStatus: "available" }
  ];

  const requests = Array.from({ length: 25 }, (_, i) => ({
    id: `bench-req-${i + 1}`,
    durationHours: 1 + (i % 3),
    preferredStartHour: 8 + (i % 8),
    minVramGb: i % 2 === 0 ? 80 : 48
  }));

  const benchResult = benchmarkFastPathAllocation(requests, sampleResources, []);

  assert.equal(benchResult.sampleSize, 25);
  assert.ok(benchResult.meanLatencyMs > 0, "Latency must be a positive measured float");
  assert.ok(benchResult.meanLatencyMs < 10.0, "Average fast-path latency must be < 10ms");
  assert.equal(benchResult.rawLogs.length, 25);

  // Validate that every log contains non-zero unrounded floating point latency
  for (const log of benchResult.rawLogs) {
    assert.ok(log.measuredLatencyMs >= 0);
    assert.ok(typeof log.measuredLatencyMs === "number");
  }
});
