import assert from "node:assert/strict";
import test from "node:test";

import { policyEngine, DEFAULT_POLICIES } from "../src/services/policyEngine.js";
import { runOptimizationAlgorithm } from "../src/services/multiObjectiveEngine.js";
import { generateWorkloadDataset, runAblationStudy, runStatisticalValidation } from "../src/research/benchmarkEngine.js";

test("Policy Engine: Calculates Jain's Fairness Index accurately", () => {
  // Completely equal distribution: J = 1.0
  assert.equal(policyEngine.calculateJainsFairnessIndex([4, 4, 4, 4]), 1.0);

  // Unequal distribution
  const unequalJain = policyEngine.calculateJainsFairnessIndex([10, 2, 1, 0]);
  assert.ok(unequalJain < 0.6, `Unequal fairness (${unequalJain}) should be below 0.6`);
});

test("Multi-Objective Engine: Runs FIFO, Greedy, and NSGA-II comparing objectives", () => {
  const dataset = generateWorkloadDataset(12, 42);
  const resources = [
    { id: "res-1", code: "GPU-H100", name: "H100 Server" },
    { id: "res-2", code: "GPU-L40S", name: "L40S Server" }
  ];

  const fifoRes = runOptimizationAlgorithm({ algorithm: "FIFO", requests: dataset, resources });
  const greedyRes = runOptimizationAlgorithm({ algorithm: "GREEDY", requests: dataset, resources });
  const nsga2Res = runOptimizationAlgorithm({ algorithm: "NSGA2", requests: dataset, resources });

  assert.equal(fifoRes.success, true);
  assert.equal(greedyRes.success, true);
  assert.equal(nsga2Res.success, true);

  // NSGA-II must return Pareto Frontier
  assert.ok(nsga2Res.paretoFrontier.length >= 1, "NSGA-II must return non-empty Pareto Frontier");
  assert.equal(nsga2Res.schedule.length, 12, "All 12 requests must be scheduled");
  assert.ok(nsga2Res.schedule[0].explanation.humanExplanation.length > 0, "Must provide human explanation");
});

test("Research Engine: Fixed seed dataset generator is 100% reproducible", () => {
  const data1 = generateWorkloadDataset(10, 42);
  const data2 = generateWorkloadDataset(10, 42);
  const dataDiffSeed = generateWorkloadDataset(10, 99);

  assert.deepEqual(data1, data2, "Same seed 42 must generate identical datasets");
  assert.notDeepEqual(data1, dataDiffSeed, "Different seed must generate different requests");
});

test("Research Engine: Ablation study evaluates all 4 objective layers", () => {
  const resources = [{ id: "res-1", code: "GPU-01", name: "GPU 1" }];
  const ablationResults = runAblationStudy([], resources, 42);

  assert.equal(ablationResults.length, 4, "Must test 4 ablation modes");
  assert.equal(ablationResults[0].ablationMode, "A_Priority_Only");
  assert.equal(ablationResults[3].ablationMode, "D_Full_Objectives");
});

test("Research Engine: Statistical Validation computes Mean and StdDev across iterations", () => {
  const resources = [{ id: "res-1", code: "GPU-01", name: "GPU 1" }];
  const stats = runStatisticalValidation(8, resources, 5);

  assert.equal(stats.iterations, 5);
  assert.ok(stats.nsga2Stats.energyVnd.mean > 0);
  assert.ok(stats.nsga2Stats.energyVnd.stdDev >= 0);
});
