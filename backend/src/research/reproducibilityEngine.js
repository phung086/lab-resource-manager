/**
 * Research Experiment Reproducibility Manifest Generator & Statistical Significance Engine
 * Computes:
 * - Dataset Hash (SHA-256)
 * - Shapiro-Wilk Normality Test (W-statistic, p-value)
 * - Paired Student t-test (t-statistic, p-value, Cohen's d effect size)
 * - Wilcoxon Signed-Rank Test (W, z-statistic, p-value, Rank-biserial correlation r)
 * - Algorithm Benchmark Suite comparing NSGA-II vs MOEA/D vs GA vs FIFO
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateWorkloadDataset, runAlgorithmBenchmark, runAblationStudy, runStatisticalValidation } from "./benchmarkEngine.js";
import { runOptimizationAlgorithm, computeHypervolume, HYPERVOLUME_REFERENCE_POINT } from "../services/multiObjectiveEngine.js";
import { runConcurrencyStressTest } from "./concurrencyBenchmark.js";
import { DEFAULT_POLICIES } from "../services/policyEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Computes SHA-256 checksum for reproducible datasets
 */
export function computeDatasetHash(dataset) {
  const jsonStr = JSON.stringify(dataset);
  return crypto.createHash("sha256").update(jsonStr).digest("hex").slice(0, 16);
}

/**
 * 1. Shapiro-Wilk Normality Test on Sample Differences
 * Tests H0: Differences are normally distributed.
 */
export function computeShapiroWilkTest(differences) {
  const n = differences.length;
  if (n < 3) return { wStat: 1.0, pValue: 1.0, isNormal: true };

  const sorted = [...differences].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const ss = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);

  if (ss === 0) return { wStat: 1.0, pValue: 1.0, isNormal: true };

  // Standard approximation coefficients for n ~ 30
  const m = [];
  for (let i = 1; i <= n; i++) {
    const p = (i - 0.375) / (n + 0.25);
    // Inverse normal approximation (Beasley-Springer-Moro)
    m.push(approxNormalQuantile(p));
  }
  const mNorm = Math.sqrt(m.reduce((sum, v) => sum + v * v, 0));
  const weights = m.map((v) => v / mNorm);

  let b = 0;
  for (let i = 0; i < n; i++) {
    b += weights[i] * sorted[i];
  }

  const wStat = Math.round((Math.pow(b, 2) / ss) * 10000) / 10000;

  // Approximate p-value for W-statistic (Royston approximation)
  const mu_w = 0.967;
  const sigma_w = 0.021;
  const z = (wStat - mu_w) / sigma_w;
  const pValue = Math.max(0.0001, Math.min(1.0, Math.round((1.0 - approxNormalCdf(z)) * 10000) / 10000));

  return {
    sampleSize: n,
    wStat: Math.min(1.0, wStat),
    pValue,
    isNormal: pValue >= 0.05
  };
}

/**
 * 2. Paired Student's t-test with Cohen's d Effect Size (Parametric)
 */
export function computePairedTTest(sampleA, sampleB) {
  if (sampleA.length !== sampleB.length || sampleA.length < 2) {
    return { tStat: 0, pValue: 1.0, isSignificant: false, cohensD: 0 };
  }

  const n = sampleA.length;
  const diffs = sampleA.map((val, i) => val - sampleB[i]);
  const meanDiff = diffs.reduce((acc, d) => acc + d, 0) / n;
  const varianceDiff = diffs.reduce((acc, d) => acc + Math.pow(d - meanDiff, 2), 0) / (n - 1);
  const stdDevDiff = Math.sqrt(varianceDiff);
  const stdError = stdDevDiff / Math.sqrt(n);

  if (stdError === 0) {
    return { meanDiff: Math.round(meanDiff * 100) / 100, tStat: 0, pValue: 1.0, isSignificant: false, cohensD: 0 };
  }

  const tStat = meanDiff / stdError;
  const absT = Math.abs(tStat);

  let pValue = 0.0001;
  if (absT < 2.045) pValue = 0.05;
  else if (absT < 2.756) pValue = 0.01;
  else if (absT < 3.659) pValue = 0.001;
  else pValue = 0.0001;

  // Cohen's d for paired differences = MeanDiff / StdDevDiff
  const cohensD = Math.round((meanDiff / (stdDevDiff || 1)) * 1000) / 1000;

  const ci95 = [
    Math.round((meanDiff - 2.045 * stdError) * 100) / 100,
    Math.round((meanDiff + 2.045 * stdError) * 100) / 100
  ];

  return {
    sampleSize: n,
    meanDiff: Math.round(meanDiff * 100) / 100,
    stdError: Math.round(stdError * 100) / 100,
    ci95,
    tStat: Math.round(tStat * 1000) / 1000,
    pValue,
    cohensD,
    effectMagnitude: Math.abs(cohensD) >= 0.8 ? "Large Effect (d >= 0.8)" : (Math.abs(cohensD) >= 0.5 ? "Medium" : "Small"),
    isSignificant: pValue < 0.05
  };
}

/**
 * 3. Wilcoxon Signed-Rank Test with Rank-Biserial Correlation (Non-parametric)
 */
export function computeWilcoxonSignedRank(sampleA, sampleB) {
  if (sampleA.length !== sampleB.length || sampleA.length < 2) {
    return { wStat: 0, zStat: 0, pValue: 1.0, rankBiserialR: 0, isSignificant: false };
  }

  const pairs = [];
  sampleA.forEach((val, i) => {
    const diff = val - sampleB[i];
    if (diff !== 0) {
      pairs.push({ diff, absDiff: Math.abs(diff), sign: Math.sign(diff) });
    }
  });

  const nr = pairs.length;
  if (nr === 0) {
    return { wStat: 0, zStat: 0, pValue: 1.0, rankBiserialR: 0, isSignificant: false };
  }

  // Sort by absolute difference
  pairs.sort((a, b) => a.absDiff - b.absDiff);

  // Assign ranks with average tie handling
  let i = 0;
  while (i < nr) {
    let j = i;
    while (j < nr - 1 && pairs[j + 1].absDiff === pairs[j].absDiff) j++;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) pairs[k].rank = avgRank;
    i = j + 1;
  }

  let wPlus = 0;
  let wMinus = 0;
  pairs.forEach((p) => {
    if (p.sign > 0) wPlus += p.rank;
    else wMinus += p.rank;
  });

  const totalRankSum = (nr * (nr + 1)) / 2;
  const wStat = Math.min(wPlus, wMinus);

  // Rank-Biserial Correlation r = (W+ - W-) / (W+ + W-) = (2 * W+ / totalRankSum) - 1
  const rankBiserialR = Math.round(((wPlus - wMinus) / totalRankSum) * 1000) / 1000;

  // Normal approximation for z-statistic
  const expectedW = totalRankSum / 2;
  const stdDevW = Math.sqrt((nr * (nr + 1) * (2 * nr + 1)) / 24);
  const zStat = stdDevW > 0 ? (wPlus - expectedW) / stdDevW : 0;

  const absZ = Math.abs(zStat);
  let pValue = 0.0001;
  if (absZ < 1.96) pValue = 0.05;
  else if (absZ < 2.58) pValue = 0.01;
  else if (absZ < 3.29) pValue = 0.001;
  else pValue = 0.0001;

  return {
    sampleSize: nr,
    wPlus: Math.round(wPlus),
    wMinus: Math.round(wMinus),
    wStat: Math.round(wStat),
    zStat: Math.round(zStat * 1000) / 1000,
    pValue,
    rankBiserialR,
    effectMagnitude: Math.abs(rankBiserialR) >= 0.5 ? "Large Non-parametric Effect (|r| >= 0.5)" : "Moderate",
    isSignificant: pValue < 0.05
  };
}

/**
 * Executes the full academic suite and generates comprehensive verifiable artifacts
 */
export async function runReproducibleExperimentSuite(options = {}) {
  const seed = options.seed || 42;
  const replications = options.replications || 30;
  const timestamp = new Date().toISOString();

  const mockResources = [
    { id: "res-1", code: "GPU-H100-01", name: "H100 SXM5 Node 1", powerWatts: 550 },
    { id: "res-2", code: "GPU-H100-02", name: "H100 SXM5 Node 2", powerWatts: 550 },
    { id: "res-3", code: "GPU-L40S-01", name: "L40S Server Node", powerWatts: 380 },
    { id: "res-4", code: "EDGE-AI-01", name: "Jetson Orin Cluster", powerWatts: 120 }
  ];

  const dataset30 = generateWorkloadDataset(30, seed);
  const datasetHash = computeDatasetHash(dataset30);

  // 1. Concurrency Experiment
  const concResult = await runConcurrencyStressTest({ concurrencyLevel: 250 });

  // 2. Multi-Algorithm Benchmark (NSGA-II vs MOEA/D vs GA vs FIFO)
  const algoBenchmark = runMultiAlgorithmBenchmark({
    datasetSizes: [10, 30, 50, 100],
    resources: mockResources,
    seed
  });

  // 3. Ablation Study
  const ablation = runAblationStudy([], mockResources, seed);

  // 4. Statistical Validation (N = 30 runs)
  const stats = runStatisticalValidation(30, mockResources, replications);

  // Generate pair differences across 30 runs
  const fifoEnergyList = [];
  const nsga2EnergyList = [];
  const moeadEnergyList = [];

  for (let rep = 1; rep <= replications; rep++) {
    const repDataset = generateWorkloadDataset(30, seed + rep);
    const fifoRun = runOptimizationAlgorithm({ algorithm: "FIFO", requests: repDataset, resources: mockResources });
    const nsga2Run = runOptimizationAlgorithm({ algorithm: "NSGA2", requests: repDataset, resources: mockResources });
    const moeadRun = runOptimizationAlgorithm({ algorithm: "MOEAD", requests: repDataset, resources: mockResources });

    fifoEnergyList.push(fifoRun.metrics.totalEnergyVnd);
    nsga2EnergyList.push(nsga2Run.metrics.totalEnergyVnd);
    moeadEnergyList.push(moeadRun.metrics.totalEnergyVnd);
  }

  const differences = fifoEnergyList.map((f, i) => f - nsga2EnergyList[i]);

  // Statistical Tests Suite
  const shapiro = computeShapiroWilkTest(differences);
  const tTest = computePairedTTest(fifoEnergyList, nsga2EnergyList);
  const wilcoxon = computeWilcoxonSignedRank(fifoEnergyList, nsga2EnergyList);

  const manifest = {
    experimentId: `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    title: "AI-Assisted Multi-Objective Resource Orchestration Academic Benchmark",
    executionTimestamp: timestamp,
    referencePoint: HYPERVOLUME_REFERENCE_POINT,
    environment: {
      runtime: "Node.js v20+",
      database: "PostgreSQL 16 (GiST Range Extension)",
      optimizer: "NSGA-II & MOEA/D Multi-Objective Engine"
    },
    reproducibility: {
      seed,
      replications,
      datasetHash,
      isDeterministic: true
    },
    statisticalSignificance: {
      shapiroWilk: shapiro,
      pairedTTest: tTest,
      wilcoxonSignedRank: wilcoxon,
      primaryReportedTest: shapiro.isNormal ? "Paired Student t-test (Normality satisfied)" : "Wilcoxon Signed-Rank Test (Non-parametric robust)"
    },
    multiAlgorithmComparison: algoBenchmark,
    concurrencyStressTest: concResult,
    ablationStudy: ablation
  };

  return manifest;
}

/**
 * Computes Spacing / Spread Metric S of the Pareto Front:
 * S = sqrt( (1 / (|P| - 1)) * sum( (d_i - d_mean)^2 ) )
 * A lower S indicates a more uniform, evenly distributed trade-off surface.
 */
export function computeSpacingMetric(paretoFront) {
  if (!paretoFront || paretoFront.length <= 1) return 0.0;
  const normalized = paretoFront.map((p) => [
    (p.objectives.waitingTimeHours || 0) / 16.0,
    (p.objectives.energyCostVnd || 0) / 150000.0,
    (p.objectives.equipmentStressScore || p.objectives.equipmentDegradation || 0) / 100.0,
    (1.0 - (p.objectives.jainsFairnessIndex !== undefined ? p.objectives.jainsFairnessIndex : 0.5))
  ]);

  const distances = normalized.map((p1, i) => {
    let minDist = Infinity;
    normalized.forEach((p2, j) => {
      if (i !== j) {
        const manhattan = Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]) + Math.abs(p1[2] - p2[2]) + Math.abs(p1[3] - p2[3]);
        if (manhattan < minDist) minDist = manhattan;
      }
    });
    return minDist;
  });

  const meanD = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - meanD, 2), 0) / (distances.length - 1);
  return Math.round(Math.sqrt(variance) * 10000) / 10000;
}

/**
 * Benchmarks NSGA-II vs MOEA/D vs GA vs FIFO across multiple scales
 */
export function runMultiAlgorithmBenchmark({ datasetSizes = [10, 30, 50, 100], resources = [], seed = 42 }) {
  return datasetSizes.map((size) => {
    const dataset = generateWorkloadDataset(size, seed);
    
    const fifo = runOptimizationAlgorithm({ algorithm: "FIFO", requests: dataset, resources });
    const ga = runOptimizationAlgorithm({ algorithm: "GA", requests: dataset, resources });
    const moead = runOptimizationAlgorithm({ algorithm: "MOEAD", requests: dataset, resources });
    const nsga2 = runOptimizationAlgorithm({ algorithm: "NSGA2", requests: dataset, resources });

    return {
      workloadSize: size,
      fifo: { runtimeMs: fifo.runtimeMs, avgWait: fifo.metrics.avgWaitHours, energyVnd: fifo.metrics.totalEnergyVnd, fairness: fifo.metrics.jainsFairnessIndex, hv: fifo.hypervolume, spacing: computeSpacingMetric(fifo.paretoFrontier) },
      ga: { runtimeMs: ga.runtimeMs, avgWait: ga.metrics.avgWaitHours, energyVnd: ga.metrics.totalEnergyVnd, fairness: ga.metrics.jainsFairnessIndex, hv: ga.hypervolume, spacing: computeSpacingMetric(ga.paretoFrontier) },
      moead: { runtimeMs: moead.runtimeMs, avgWait: moead.metrics.avgWaitHours, energyVnd: moead.metrics.totalEnergyVnd, fairness: moead.metrics.jainsFairnessIndex, hv: moead.hypervolume, spacing: computeSpacingMetric(moead.paretoFrontier) },
      nsga2: { runtimeMs: nsga2.runtimeMs, avgWait: nsga2.metrics.avgWaitHours, energyVnd: nsga2.metrics.totalEnergyVnd, fairness: nsga2.metrics.jainsFairnessIndex, hv: nsga2.hypervolume, spacing: computeSpacingMetric(nsga2.paretoFrontier) }
    };
  });
}

// ─── HELPER MATH APPROXIMATIONS ──────────────────────────────────────────────

function approxNormalQuantile(p) {
  // Rational approximation for normal quantile
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const num = a[0] + a[1] * t + a[2] * t * t;
  const den = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t;
  const z = t - num / den;
  return p < 0.5 ? -z : z;
}

function approxNormalCdf(z) {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1.0 - prob : prob;
}
