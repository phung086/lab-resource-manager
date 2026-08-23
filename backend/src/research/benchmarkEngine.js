/**
 * Research Benchmark & Experiment Engine (Smart Lab V2)
 * Phase 4: Rigorous comparative benchmarking, ablation studies, and statistical validation.
 */

import { runOptimizationAlgorithm } from "../services/multiObjectiveEngine.js";
import { DEFAULT_POLICIES } from "../services/policyEngine.js";

// Pseudo-random linear congruential generator for reproducible seeds
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates reproducible research datasets based on user count and fixed random seed
 */
export function generateWorkloadDataset(userCount = 30, seed = 42) {
  const rng = seededRandom(seed);
  const roles = ["phd_researcher", "master_student", "undergrad_student", "undergrad_student"];
  const urgencies = ["paper_deadline", "thesis_defense", "course_project", "personal_learning"];

  const dataset = [];
  for (let i = 0; i < userCount; i++) {
    const role = roles[Math.floor(rng() * roles.length)];
    const urgency = urgencies[Math.floor(rng() * urgencies.length)];
    const duration = 1 + Math.floor(rng() * 4); // 1-4 hours
    const preferredStart = Math.floor(rng() * 16) + 8; // 8h to 23h
    const power = role === "phd_researcher" ? 650 : (role === "master_student" ? 450 : 280);

    dataset.push({
      id: `req-${seed}-${i + 1}`,
      title: `Job ${role} #${i + 1}`,
      userName: `Researcher ${i + 1}`,
      userRole: role,
      projectUrgency: urgency,
      durationHours: duration,
      powerWatts: power,
      preferredStartHour: preferredStart,
      noShowRate: Math.round(rng() * 0.06 * 100) / 100,
      recentUsageHours: Math.floor(rng() * 20)
    });
  }

  return dataset;
}

/**
 * Executes a comparative benchmark across all 4 algorithms on a given dataset
 */
export function runAlgorithmBenchmark({
  datasetSizes = [10, 30, 50, 100],
  resources = [],
  seed = 42,
  policy = DEFAULT_POLICIES
}) {
  const algorithms = ["FIFO", "GREEDY", "GA", "NSGA2"];
  const benchmarkResults = [];

  datasetSizes.forEach((size) => {
    const dataset = generateWorkloadDataset(size, seed);

    algorithms.forEach((algo) => {
      const run = runOptimizationAlgorithm({
        algorithm: algo,
        requests: dataset,
        resources,
        policy
      });

      benchmarkResults.push({
        datasetSize: size,
        seed,
        algorithm: algo,
        runtimeMs: run.runtimeMs,
        conflicts: run.metrics.conflicts || 0,
        avgWaitHours: run.metrics.avgWaitHours || 0,
        totalEnergyCostVnd: run.metrics.totalEnergyVnd || 0,
        jainsFairnessIndex: run.metrics.jainsFairnessIndex || 0,
        totalPriorityScore: run.metrics.totalPriorityScore || 0
      });
    });
  });

  return {
    success: true,
    benchmarkTimestamp: new Date().toISOString(),
    seed,
    results: benchmarkResults
  };
}

/**
 * Executes an Ablation Study proving the impact of each objective layer
 */
export function runAblationStudy(requests = [], resources = [], seed = 42) {
  const ablationConfigs = [
    { mode: "A_Priority_Only", weights: { priority: 1.0, energy: 0.0, fairness: 0.0 } },
    { mode: "B_Priority_Energy", weights: { priority: 0.6, energy: 0.4, fairness: 0.0 } },
    { mode: "C_Priority_Energy_Fairness", weights: { priority: 0.5, energy: 0.3, fairness: 0.2 } },
    { mode: "D_Full_Objectives", weights: { priority: 0.4, energy: 0.3, fairness: 0.2 } }
  ];

  const dataset = requests.length ? requests : generateWorkloadDataset(30, seed);

  return ablationConfigs.map((config) => {
    const run = runOptimizationAlgorithm({
      algorithm: "NSGA2",
      requests: dataset,
      resources,
      config: { weights: config.weights }
    });

    return {
      ablationMode: config.mode,
      weights: config.weights,
      conflicts: run.metrics.conflicts,
      avgWaitHours: run.metrics.avgWaitHours,
      totalEnergyVnd: run.metrics.totalEnergyVnd,
      jainsFairnessIndex: run.metrics.jainsFairnessIndex,
      greenRatioPercent: run.metrics.greenSlotRatioPercent
    };
  });
}

/**
 * Runs Statistical Validation over N iterations (e.g. N = 30 runs) to compute Mean & StdDev
 */
export function runStatisticalValidation(userCount = 30, resources = [], iterations = 30) {
  const results = {
    FIFO: { energies: [], waits: [], runtimes: [] },
    NSGA2: { energies: [], waits: [], runtimes: [], fairness: [] }
  };

  for (let iter = 1; iter <= iterations; iter++) {
    const seed = 40 + iter;
    const dataset = generateWorkloadDataset(userCount, seed);

    const fifoRun = runOptimizationAlgorithm({ algorithm: "FIFO", requests: dataset, resources });
    const nsgaRun = runOptimizationAlgorithm({ algorithm: "NSGA2", requests: dataset, resources });

    results.FIFO.energies.push(fifoRun.metrics.totalEnergyVnd);
    results.FIFO.waits.push(fifoRun.metrics.avgWaitHours);
    results.FIFO.runtimes.push(fifoRun.runtimeMs);

    results.NSGA2.energies.push(nsgaRun.metrics.totalEnergyVnd);
    results.NSGA2.waits.push(nsgaRun.metrics.avgWaitHours);
    results.NSGA2.runtimes.push(nsgaRun.runtimeMs);
    results.NSGA2.fairness.push(nsgaRun.metrics.jainsFairnessIndex);
  }

  function computeStats(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      min: Math.min(...arr),
      max: Math.max(...arr)
    };
  }

  return {
    iterations,
    userCount,
    fifoStats: {
      energyVnd: computeStats(results.FIFO.energies),
      waitHours: computeStats(results.FIFO.waits),
      runtimeMs: computeStats(results.FIFO.runtimes)
    },
    nsga2Stats: {
      energyVnd: computeStats(results.NSGA2.energies),
      waitHours: computeStats(results.NSGA2.waits),
      runtimeMs: computeStats(results.NSGA2.runtimes),
      fairness: computeStats(results.NSGA2.fairness)
    }
  };
}
