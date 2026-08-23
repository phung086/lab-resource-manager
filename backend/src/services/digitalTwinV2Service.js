/**
 * Digital Twin V2 & Equipment Health Intelligence Service
 * Phase 5 & 6: 4-Layer Digital Twin, Multi-Factor Health Index, AHP-Derived Readiness Score, and Event Replay.
 */

import { policyEngine, DEFAULT_POLICIES } from "./policyEngine.js";

export const DATA_SOURCE_TYPES = {
  REAL: "REAL",             // From physical hardware MQTT sensor (ESP32)
  SIMULATED: "SIMULATED",   // From physics-based stochastic simulator
  DERIVED: "DERIVED",       // Computed via statistical / machine learning inference
  STALE: "STALE"            // Fallback status when physical sensor connection times out
};

export const HEALTH_TIERS = {
  EXCELLENT: { min: 90, max: 100, label: "Xuất Sắc", tone: "green" },
  HEALTHY: { min: 75, max: 89, label: "Khỏe Mạnh", tone: "blue" },
  DEGRADED: { min: 50, max: 74, label: "Suy Giảm Hiệu Năng", tone: "amber" },
  WARNING: { min: 25, max: 49, label: "Cảnh Báo Cần Bảo Trì", tone: "orange" },
  CRITICAL: { min: 0, max: 24, label: "Nguy Hiểm / Dừng Khẩn Cấp", tone: "red" }
};

/**
 * AHP (Analytic Hierarchy Process) Configuration for Resource Readiness Score:
 * Criteria:
 * C1: Availability (S_avail)
 * C2: Equipment Health Index (H)
 * C3: Energy Efficiency Score (S_energy)
 * C4: Safety / Inverted Failure Risk Score (S_risk)
 *
 * Pairwise Comparison Matrix (Saaty 1-9 scale):
 *           [Avail, Health, Energy, Risk]
 * Avail   : [ 1,     1/2,    2,      2   ]
 * Health  : [ 2,     1,      3,      3   ]
 * Energy  : [ 1/2,   1/3,    1,      1   ]
 * Risk    : [ 1/2,   1/3,    1,      1   ]
 */
export const AHP_READINESS_MODEL = (() => {
  const matrix = [
    [1.0, 0.5, 2.0, 2.0],
    [2.0, 1.0, 3.0, 3.0],
    [0.5, 1.0 / 3.0, 1.0, 1.0],
    [0.5, 1.0 / 3.0, 1.0, 1.0]
  ];

  // Geometric Mean Method for eigenvector calculation
  const n = matrix.length;
  const geomMeans = matrix.map((row) => Math.pow(row.reduce((acc, val) => acc * val, 1.0), 1 / n));
  const sumGeom = geomMeans.reduce((acc, val) => acc + val, 0);
  const weights = geomMeans.map((val) => val / sumGeom);

  // Compute principal eigenvalue lambda_max
  const Aw = matrix.map((row) => row.reduce((sum, val, j) => sum + val * weights[j], 0));
  const lambdaMax = Aw.reduce((sum, val, i) => sum + val / weights[i], 0) / n;

  // Consistency Index (CI) and Consistency Ratio (CR) with RI_4 = 0.90
  const ci = (lambdaMax - n) / (n - 1);
  const ri = 0.90;
  const cr = ci / ri;

  return {
    pairwiseMatrix: matrix,
    weights: {
      availability: Math.round(weights[0] * 1000) / 1000,
      health: Math.round(weights[1] * 1000) / 1000,
      energy: Math.round(weights[2] * 1000) / 1000,
      riskSafety: Math.round(weights[3] * 1000) / 1000
    },
    lambdaMax: Math.round(lambdaMax * 1000) / 1000,
    consistencyIndex: Math.round(ci * 1000) / 1000,
    consistencyRatio: Math.round(cr * 1000) / 1000,
    isConsistent: cr < 0.10 // CR < 0.10 verifies robust transitivity
  };
})();

/**
 * Computes multi-factor Equipment Health Index on normalized [0, 100] scale:
 * H = w_t * H_t (Thermal) + w_p * H_p (Power) + w_v * H_v (Vibration) + w_u * H_u (Utilization)
 */
export function computeEquipmentHealthIndex({
  temperatureC = 55,
  powerWatts = 250,
  vibrationMmS = 0.15,
  gpuPercent = 40,
  policy = DEFAULT_POLICIES.maintenance
}) {
  const weights = { temp: 0.35, power: 0.25, vibration: 0.25, util: 0.15 };

  // Sub-index H_t (Thermal Health) in [0, 100]
  const hTemp = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, (temperatureC - 55) * 2.5))));

  // Sub-index H_p (Power Stability) in [0, 100]
  const nominalPower = 350;
  const powerDeviation = Math.abs(powerWatts - nominalPower) / nominalPower;
  const hPower = Math.max(20, Math.min(100, Math.round(100 - powerDeviation * 50)));

  // Sub-index H_v (Mechanical Vibration) in [0, 100]
  const hVibration = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, (vibrationMmS - 0.2) * 55))));

  // Sub-index H_u (Duty Cycle Stress) in [0, 100]
  const hUtil = Math.max(20, Math.round(100 - (gpuPercent > 85 ? 30 : 0)));

  const totalHealth = Math.round(
    weights.temp * hTemp +
    weights.power * hPower +
    weights.vibration * hVibration +
    weights.util * hUtil
  );

  let tier = HEALTH_TIERS.HEALTHY;
  if (totalHealth < 30 || temperatureC >= 85 || vibrationMmS >= 2.0) tier = HEALTH_TIERS.CRITICAL;
  else if (totalHealth < 50 || temperatureC >= 75) tier = HEALTH_TIERS.WARNING;
  else if (totalHealth < 75) tier = HEALTH_TIERS.DEGRADED;
  else if (totalHealth < 90) tier = HEALTH_TIERS.HEALTHY;
  else tier = HEALTH_TIERS.EXCELLENT;

  const riskScore = Math.round((1 - totalHealth / 100) * 100) / 100;
  const remainingUsefulLifeDays = Math.max(2, Math.round((totalHealth / 100) * 180));

  return {
    healthIndex: totalHealth,
    tier: tier.label,
    tierTone: tier.tone,
    riskScore,
    remainingUsefulLifeDays,
    breakdown: {
      thermalHealth: hTemp,
      powerHealth: hPower,
      vibrationHealth: hVibration,
      utilizationHealth: hUtil
    },
    requiresImmediateMaintenance: totalHealth < 40
  };
}

/**
 * Computes Resource Readiness Score normalized in [0, 100] using AHP weights
 * S_readiness = w_avail * S_avail + w_health * S_health + w_energy * S_energy + w_risk * S_risk
 */
export function computeResourceReadinessScore(resource, liveTelemetry, requirement = {}) {
  const healthData = computeEquipmentHealthIndex({
    temperatureC: liveTelemetry?.metrics?.temperatureC || 50,
    powerWatts: liveTelemetry?.metrics?.powerWatts || 200,
    vibrationMmS: liveTelemetry?.metrics?.vibrationMmS || 0.12,
    gpuPercent: liveTelemetry?.metrics?.gpuPercent || 30
  });

  // 1. Normalized Availability Score S_avail in [0, 100]
  const sAvail = resource.operationalStatus === "available" ? 100 : (resource.operationalStatus === "in_use" ? 50 : 0);

  // 2. Normalized Health Score S_health in [0, 100]
  const sHealth = healthData.healthIndex;

  // 3. Normalized Energy Efficiency Score S_energy in [0, 100]
  const currentWatts = liveTelemetry?.metrics?.powerWatts || 250;
  const sEnergy = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, (currentWatts - 150) * 0.18))));

  // 4. Normalized Safety / Low Risk Score S_risk in [0, 100]
  const sRiskSafety = Math.max(0, Math.min(100, Math.round((1 - healthData.riskScore) * 100)));

  // Weighted Linear Combination with AHP weights
  const w = AHP_READINESS_MODEL.weights;
  const readinessScore = Math.round(
    w.availability * sAvail +
    w.health * sHealth +
    w.energy * sEnergy +
    w.riskSafety * sRiskSafety
  );

  return {
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    healthData,
    ahpMetadata: {
      weights: w,
      consistencyRatio: AHP_READINESS_MODEL.consistencyRatio,
      isAHPValid: AHP_READINESS_MODEL.isConsistent,
      normalizedComponents: {
        availabilityScore: sAvail,
        healthScore: sHealth,
        energyEfficiencyScore: sEnergy,
        safetyScore: sRiskSafety
      }
    },
    isRecommendedForScheduling: readinessScore >= 60 && !healthData.requiresImmediateMaintenance
  };
}

/**
 * Digital Twin Historical Replay Engine
 * Recreates historical sensor states, allocations, and incidents over a given time window
 */
export function generateDigitalTwinReplay(resource, startTime, endTime, stepMinutes = 15) {
  const replayFrames = [];
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  for (let t = start; t <= end; t += stepMinutes * 60 * 1000) {
    const frameDate = new Date(t);
    const hour = frameDate.getHours();
    
    // Simulate diurnal temperature curve
    const load = (hour >= 9 && hour <= 19) ? 0.72 : 0.18;
    const temp = 45 + load * 32 + (Math.sin(t / 100000) * 3);
    const power = 180 + load * 350;

    const health = computeEquipmentHealthIndex({ temperatureC: temp, powerWatts: power });

    replayFrames.push({
      timestamp: frameDate.toISOString(),
      timeFormatted: frameDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      temperatureC: Math.round(temp * 10) / 10,
      powerWatts: Math.round(power),
      healthIndex: health.healthIndex,
      dataSource: DATA_SOURCE_TYPES.SIMULATED,
      status: temp > 85 ? "broken" : (load > 0.5 ? "in_use" : "available")
    });
  }

  return replayFrames;
}
