import assert from "node:assert/strict";
import test from "node:test";

import { solveGeneticScheduling, getElectricityTariff, EVN_TARIFFS } from "../src/services/geneticSchedulerService.js";

test("EVN Tariffs: Correctly identifies off-peak, peak, and standard hours", () => {
  assert.equal(getElectricityTariff(23), EVN_TARIFFS.OFF_PEAK, "23h should be off-peak");
  assert.equal(getElectricityTariff(2), EVN_TARIFFS.OFF_PEAK, "02h should be off-peak");
  assert.equal(getElectricityTariff(10), EVN_TARIFFS.PEAK, "10h should be peak hours");
  assert.equal(getElectricityTariff(18), EVN_TARIFFS.PEAK, "18h should be peak hours");
  assert.equal(getElectricityTariff(14), EVN_TARIFFS.STANDARD, "14h should be standard hours");
});

test("Genetic Algorithm: Solves multi-objective resource scheduling problem with positive fitness", () => {
  const requests = [
    { id: "req-1", title: "Job A (PhD Defense)", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 3, powerWatts: 500 },
    { id: "req-2", title: "Job B (Master Thesis)", userRole: "master_student", projectUrgency: "thesis_defense", durationHours: 2, powerWatts: 400 },
    { id: "req-3", title: "Job C (Course Lab)", userRole: "undergrad_student", projectUrgency: "course_project", durationHours: 2, powerWatts: 250 },
    { id: "req-4", title: "Job D (Self Study)", userRole: "undergrad_student", projectUrgency: "personal_learning", durationHours: 2, powerWatts: 150 }
  ];

  const resources = [
    { id: "res-gpu-1", code: "GPU-H100-01", name: "NVIDIA H100 Server" },
    { id: "res-gpu-2", code: "GPU-L40S-01", name: "NVIDIA L40S Server" }
  ];

  const result = solveGeneticScheduling({
    requests,
    resources,
    populationSize: 30,
    maxGenerations: 20,
    weights: { priority: 0.6, energy: 0.3, fairness: 0.1 }
  });

  assert.equal(result.success, true);
  assert.equal(result.optimalSchedule.length, 4, "All 4 requests must be scheduled");
  assert.equal(result.generationHistory.length, 20, "Must record 20 generations of evolution");
  
  // Best fitness should be greater than or equal to generation 1
  const gen1Fitness = result.generationHistory[0].bestFitness;
  const genLastFitness = result.generationHistory[19].bestFitness;
  assert.ok(genLastFitness >= gen1Fitness, `Final generation fitness (${genLastFitness}) should be >= generation 1 fitness (${gen1Fitness})`);

  // Baseline comparison
  assert.ok(result.baselineComparison.gaScore >= 0);
  assert.ok(result.executionTimeMs >= 0);
});

test("Genetic Algorithm: Handles empty requests gracefully", () => {
  const result = solveGeneticScheduling({ requests: [], resources: [] });
  assert.equal(result.success, true);
  assert.equal(result.optimalSchedule.length, 0);
});
