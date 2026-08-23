/**
 * Hybrid Online/Batch Dispatching Service (Phase 3)
 * Layer 2 (Decision Making Layer) on top of Layer 1 (Pareto Optimization Engine)
 * 
 * Architecture:
 * 1. Online Fast-Path Allocator: Immediate greedy allocation for urgent requests satisfying all hard constraints.
 * 2. Compromise Programming Decision Layer: Evaluates reallocation opportunities using Normalized Euclidean Distance D(x, Z*).
 * 3. Human-in-the-Loop Reallocation Trigger: Recommends swap only when delta_realloc > 15%.
 */

import { HYPERVOLUME_REFERENCE_POINT } from "./multiObjectiveEngine.js";

export const DISPATCH_MODES = {
  FAST_PATH: "FAST_PATH",
  BATCH_OPTIMIZED: "BATCH_OPTIMIZED",
  REALLOCATION_PROPOSED: "REALLOCATION_PROPOSED"
};

/**
 * Fast-Path Greedy Online Allocator
 * Allocates earliest compatible resource slot in O(R * S) time satisfying all hard constraints.
 */
export function fastPathGreedyAllocate({
  request,
  resources = [],
  existingBookings = [],
  maintenanceWindows = [],
  userCertifications = []
}) {
  const startPerf = performance.now();

  const reqDurationHours = request.durationHours || 2;
  const reqStartHour = request.preferredStartHour !== undefined ? request.preferredStartHour : 8;
  const requiredVram = request.minVramGb || 0;
  const requiredCert = request.requiredCertification;

  // 1. Filter resources satisfying hard capabilities and user certifications
  const eligibleResources = resources.filter((res) => {
    // Operational status check
    if (res.operationalStatus && res.operationalStatus !== "available" && res.operationalStatus !== "in_use") {
      return false;
    }

    // VRAM capacity check
    const resVram = res.specs?.vramGb || res.vramGb || 0;
    if (requiredVram > 0 && resVram < requiredVram) {
      return false;
    }

    // Safety certification check
    if (requiredCert) {
      const hasCert = userCertifications.some(
        (c) => (c.courseCode === requiredCert || c.certificationType === requiredCert) && c.status !== "expired"
      );
      if (!hasCert) return false;
    }

    return true;
  });

  if (eligibleResources.length === 0) {
    const endPerf = performance.now();
    return {
      success: false,
      reason: "NO_CAPABLE_RESOURCE_FOUND",
      latencyMs: endPerf - startPerf,
      allocation: null
    };
  }

  // 2. Find earliest non-overlapping slot across eligible resources
  let bestAllocation = null;

  for (const resource of eligibleResources) {
    for (let hour = reqStartHour; hour <= 22 - reqDurationHours; hour++) {
      const slotStart = hour;
      const slotEnd = hour + reqDurationHours;

      // Check maintenance collision
      const hasMaintenanceOverlap = maintenanceWindows.some((mw) => {
        if (mw.resourceId !== resource.id) return false;
        const mStart = typeof mw.startHour === "number" ? mw.startHour : (mw.startTime ? new Date(mw.startTime).getUTCHours() : 0);
        const mEnd = typeof mw.endHour === "number" ? mw.endHour : (mw.endTime ? new Date(mw.endTime).getUTCHours() : 24);
        return slotStart < mEnd && slotEnd > mStart;
      });
      if (hasMaintenanceOverlap) continue;

      // Check existing booking collision (Non-overlapping GiST logic)
      const hasBookingOverlap = existingBookings.some((b) => {
        if (b.resourceId !== resource.id) return false;
        if (b.status === "cancelled" || b.status === "rejected") return false;
        const bStart = typeof b.startHour === "number" ? b.startHour : new Date(b.startTime).getHours();
        const bEnd = typeof b.endHour === "number" ? b.endHour : new Date(b.endTime).getHours();
        return slotStart < bEnd && slotEnd > bStart;
      });
      if (hasBookingOverlap) continue;

      // Found valid slot
      bestAllocation = {
        requestId: request.id,
        resourceId: resource.id,
        resourceCode: resource.code,
        resourceName: resource.name,
        startHour: slotStart,
        endHour: slotEnd,
        durationHours: reqDurationHours,
        dispatchMode: DISPATCH_MODES.FAST_PATH,
        allocatedAt: new Date().toISOString()
      };
      break;
    }
    if (bestAllocation) break;
  }

  const endPerf = performance.now();
  const latencyMs = Math.round((endPerf - startPerf) * 1000) / 1000; // Exact floating ms

  if (!bestAllocation) {
    return {
      success: false,
      reason: "ALL_SLOTS_OCCUPIED",
      latencyMs,
      allocation: null
    };
  }

  return {
    success: true,
    allocation: bestAllocation,
    latencyMs,
    hardConstraintsSatisfied: {
      vram: true,
      certifications: true,
      maintenanceSafe: true,
      nonOverlapping: true
    }
  };
}

/**
 * Computes Normalized Compromise Distance D(x, Z*) to the Ideal Point Z* = (0, 0, 0, 0)
 * Uses explicit reference point R = (Wait_max=16h, Energy_max=150.000d, Deg_max=100, InvertedFairness_max=1.0)
 */
export function calculateCompromiseDistance(metrics, referencePoint = HYPERVOLUME_REFERENCE_POINT) {
  const waitMax = referencePoint.waitingTimeHours || 16.0;
  const energyMax = referencePoint.energyCostVnd || 150000.0;
  const degMax = referencePoint.equipmentDegradation || 100.0;
  const fairMax = referencePoint.invertedFairness || 1.0;

  // Normalized coordinates in [0, 1]
  const f1Prime = Math.max(0, Math.min(1, (metrics.waitingTimeHours || 0) / waitMax));
  const f2Prime = Math.max(0, Math.min(1, (metrics.energyCostVnd || 0) / energyMax));
  const f3Prime = Math.max(0, Math.min(1, (metrics.equipmentDegradation || 0) / degMax));
  const jainIndex = metrics.fairnessJainIndex !== undefined ? metrics.fairnessJainIndex : (1.0 - (metrics.invertedFairness || 0));
  const f4Prime = Math.max(0, Math.min(1, (1.0 - jainIndex) / fairMax));

  // Euclidean norm to Z* = (0, 0, 0, 0)
  const distance = Math.sqrt(
    Math.pow(f1Prime, 2) +
    Math.pow(f2Prime, 2) +
    Math.pow(f3Prime, 2) +
    Math.pow(f4Prime, 2)
  );

  return {
    distance: Math.round(distance * 10000) / 10000,
    normalizedVector: {
      f1_wait: Math.round(f1Prime * 1000) / 1000,
      f2_energy: Math.round(f2Prime * 1000) / 1000,
      f3_degradation: Math.round(f3Prime * 1000) / 1000,
      f4_fairnessDeficit: Math.round(f4Prime * 1000) / 1000
    }
  };
}

/**
 * Finds the Compromise Programming Knee Point from a Batch Pareto Front
 */
export function findParetoKneePoint(paretoFront = [], referencePoint = HYPERVOLUME_REFERENCE_POINT) {
  if (!paretoFront || paretoFront.length === 0) return null;

  let bestSolution = null;
  let minDistance = Infinity;
  const scoredSolutions = [];

  for (const sol of paretoFront) {
    const metrics = sol.metrics || sol;
    const { distance, normalizedVector } = calculateCompromiseDistance(metrics, referencePoint);

    scoredSolutions.push({
      solution: sol,
      distance,
      normalizedVector
    });

    if (distance < minDistance) {
      minDistance = distance;
      bestSolution = sol;
    }
  }

  return {
    kneeSolution: bestSolution,
    minDistance: Math.round(minDistance * 10000) / 10000,
    scoredSolutions
  };
}

/**
 * Evaluates whether a Fast-Path allocation warrants a Reallocation Proposal based on Batch Knee Point
 * Rule: Delta_realloc = (D_fastpath - D_batchKnee) / D_fastpath > 0.15
 */
export function evaluateReallocationOpportunity({
  fastPathMetrics,
  batchParetoFront = [],
  referencePoint = HYPERVOLUME_REFERENCE_POINT,
  reallocationThreshold = 0.15
}) {
  const fastPathCompromise = calculateCompromiseDistance(fastPathMetrics, referencePoint);
  const dFastPath = fastPathCompromise.distance;

  const kneeResult = findParetoKneePoint(batchParetoFront, referencePoint);
  if (!kneeResult) {
    return {
      shouldProposeReallocation: false,
      reason: "NO_BATCH_PARETO_SOLUTIONS_AVAILABLE",
      dFastPath,
      dBatchKnee: null,
      deltaRealloc: 0
    };
  }

  const dBatchKnee = kneeResult.minDistance;

  // Relative distance improvement (higher is better)
  const deltaRealloc = dFastPath > 0 ? (dFastPath - dBatchKnee) / dFastPath : 0;
  const roundedDelta = Math.round(deltaRealloc * 10000) / 10000;

  const shouldPropose = roundedDelta > reallocationThreshold;

  return {
    shouldProposeReallocation: shouldPropose,
    reallocationThreshold,
    deltaRealloc: roundedDelta,
    improvementPercent: Math.round(roundedDelta * 1000) / 10,
    dFastPath,
    dBatchKnee,
    fastPathVector: fastPathCompromise.normalizedVector,
    kneeVector: kneeResult.kneeSolution?.metrics || kneeResult.kneeSolution,
    proposedPlan: shouldPropose ? kneeResult.kneeSolution : null,
    decisionReason: shouldPropose
      ? `ĐỀ XUẤT TÁI PHÂN BỔ: Nghiệm Batch Knee cải thiện khoảng cách thỏa hiệp ${Math.round(roundedDelta * 100)}% (vượt ngưỡng 15%).`
      : `GIỮ NGUYÊN FAST-PATH: Mức cải thiện (${Math.round(roundedDelta * 100)}%) nằm trong ngưỡng dung sai chấp nhận được (<= 15%).`
  };
}

/**
 * Real Benchmark Runner: Executes N real fast-path allocations and measures physical performance.now() latency
 */
export function benchmarkFastPathAllocation(requests = [], resources = [], existingBookings = []) {
  const executionLogs = [];
  const latencies = [];

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const t0 = performance.now();
    const allocResult = fastPathGreedyAllocate({
      request: req,
      resources,
      existingBookings
    });
    const t1 = performance.now();
    const rawLatencyMs = t1 - t0;

    latencies.push(rawLatencyMs);
    executionLogs.push({
      iteration: i + 1,
      requestId: req.id,
      success: allocResult.success,
      allocatedResource: allocResult.allocation?.resourceCode || "NONE",
      startHour: allocResult.allocation?.startHour ?? -1,
      measuredLatencyMs: rawLatencyMs
    });
  }

  const n = latencies.length;
  const meanLatency = latencies.reduce((sum, v) => sum + v, 0) / (n || 1);
  const sorted = [...latencies].sort((a, b) => a - b);
  const minLatency = sorted[0] || 0;
  const maxLatency = sorted[n - 1] || 0;
  const p95Latency = sorted[Math.floor(n * 0.95)] || maxLatency;

  return {
    sampleSize: n,
    meanLatencyMs: Math.round(meanLatency * 1000) / 1000,
    minLatencyMs: Math.round(minLatency * 1000) / 1000,
    maxLatencyMs: Math.round(maxLatency * 1000) / 1000,
    p95LatencyMs: Math.round(p95Latency * 1000) / 1000,
    rawLogs: executionLogs
  };
}
