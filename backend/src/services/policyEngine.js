/**
 * Policy-Driven Architecture Engine (Smart Lab V2)
 * Phase 1.1: Manages dynamic versioned policies for Energy, Priority, Fairness, Maintenance, and Safety.
 * Eliminates all hardcoded tariffs and magic numbers from application logic.
 */

// Default Seed Policies (Used when DB policy is not yet initialized or for offline testing)
export const DEFAULT_POLICIES = {
  energy: {
    version: "2026.1",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    tariffs: {
      offPeakVnd: 1100, // 22:00 - 04:00
      standardVnd: 1685, // Standard daytime
      peakVnd: 3190      // 09:30 - 11:30, 17:00 - 20:00
    },
    gridEmissionFactorKgPerKwh: 0.722, // Vietnam Grid standard
    nightEmissionFactorKgPerKwh: 0.410  // Hydro/Renewables off-peak
  },
  priority: {
    version: "2026.2",
    weights: {
      role: 0.50,
      urgency: 0.35,
      quotaBalance: 0.15
    },
    roleScores: {
      admin: 100,
      lab_staff: 90,
      phd_researcher: 85,
      master_student: 70,
      undergrad_student: 50,
      guest: 30
    },
    urgencyScores: {
      paper_deadline: 100,
      thesis_defense: 90,
      course_project: 60,
      personal_learning: 30
    },
    reputation: {
      alpha: 0.12,                  // Trọng số điều chỉnh uy tín (tối đa 12%)
      initialScore: 100,            // Điểm khởi tạo
      minScore: 0,
      maxScore: 100,
      lateCancelPenalty: 10,        // Trừ 10 điểm khi hủy < 2h
      noShowPenalty: 25,            // Trừ 25 điểm khi no-show
      quotaBreachPenalty: 15,       // Trừ 15 điểm khi vượt hạn ngạch 2 tháng liên tiếp
      recoveryPerWeek: 2,           // Phục hồi +2 điểm / 7 ngày tuân thủ
      lateCancelWindowHours: 2      // Ngưỡng hủy trễ (< 2 giờ)
    }
  },
  fairness: {
    version: "2026.1",
    targetJainIndex: 0.85,
    maxWeeklyHoursPerStudent: 20,
    bumpCompensationQuotaHours: 4,
    minPriorityGapForBump: 25
  },
  maintenance: {
    version: "2026.1",
    thermalWarningThresholdC: 75.0,
    thermalCriticalThresholdC: 85.0,
    vibrationWarningMmS: 0.50,
    vibrationCriticalMmS: 1.50,
    rulWarningDays: 45,
    rulCriticalDays: 14
  },
  safety: {
    version: "2026.1",
    quizPassScorePercent: 80,
    certificationValidityDays: 365,
    mandatoryGpuCertCourseCode: "GPU-SAFETY-101",
    mandatoryUavCertCourseCode: "UAV-FLIGHT-101"
  }
};

class PolicyEngine {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Retrieves the active policy of a given type at a specified timestamp
   */
  async getActivePolicy(policyType, timestamp = new Date(), prismaClient = null) {
    const time = new Date(timestamp);

    // Try to fetch from DB if client provided
    if (prismaClient) {
      try {
        const policyRecord = await prismaClient.policyVersion.findFirst({
          where: {
            policyType,
            isActive: true,
            effectiveFrom: { lte: time },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: time } }
            ]
          },
          orderBy: { effectiveFrom: "desc" }
        });

        if (policyRecord && policyRecord.configuration) {
          return {
            policyType,
            version: policyRecord.version,
            ...policyRecord.configuration
          };
        }
      } catch (err) {
        // Fallback to default in-memory policy
      }
    }

    return DEFAULT_POLICIES[policyType] || DEFAULT_POLICIES.energy;
  }

  /**
   * Calculates electricity tariff (VND/kWh) dynamically according to the active energy policy
   */
  calculateTariff(hour, energyPolicy = DEFAULT_POLICIES.energy) {
    const tariffs = energyPolicy.tariffs || DEFAULT_POLICIES.energy.tariffs;

    // EVN 2026 Time-of-Use Schedule
    if (hour >= 22 || hour < 4) {
      return { tariffVnd: tariffs.offPeakVnd, tier: "OFF_PEAK_GREEN", isOffPeak: true };
    }
    if ((hour >= 9.5 && hour < 11.5) || (hour >= 17 && hour < 20)) {
      return { tariffVnd: tariffs.peakVnd, tier: "PEAK_STRESS", isOffPeak: false };
    }
    return { tariffVnd: tariffs.standardVnd, tier: "STANDARD", isOffPeak: false };
  }

  /**
   * Computes Jain's Fairness Index across allocated hours
   * Formula: J = (sum(x_i))^2 / (n * sum(x_i^2))
   */
  calculateJainsFairnessIndex(userAllocatedHours = []) {
    if (!userAllocatedHours.length) return 1.0;
    const n = userAllocatedHours.length;
    const sum = userAllocatedHours.reduce((acc, h) => acc + h, 0);
    if (sum === 0) return 1.0;

    const sumSquares = userAllocatedHours.reduce((acc, h) => acc + Math.pow(h, 2), 0);
    const jainIndex = Math.pow(sum, 2) / (n * sumSquares);

    return Math.round(jainIndex * 1000) / 1000;
  }
}

export const policyEngine = new PolicyEngine();
