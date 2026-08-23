/**
 * Dynamic Priority & Behavioral Reputation Scheduler Engine (Phase 2)
 * Implements Orthogonal Dual-Layer Priority Formulation:
 * 1. BasePriority: Academic Context & Research Demand (Role, Urgency, Current Quota Balance)
 * 2. Multiplier_reputation: Dynamic Behavioral Reputation (Late Cancel, No-Show, Quota Breach, Clean Streak)
 */

import { DEFAULT_POLICIES } from "./policyEngine.js";
import { prisma } from "../db.js";

export const BEHAVIOR_EVENT_TYPES = {
  LATE_CANCEL: "LATE_CANCEL",                       // Hủy lịch < 2h trước giờ bắt đầu (-10 điểm)
  NO_SHOW: "NO_SHOW",                               // Không đến nhận tài nguyên (-25 điểm)
  QUOTA_BREACH: "QUOTA_BREACH",                     // Vượt hạn ngạch 2 tháng liên tiếp (-15 điểm)
  CLEAN_STREAK_RECOVERY: "CLEAN_STREAK_RECOVERY"   // Phục hồi kỷ luật (+2 điểm / 7 ngày tuân thủ)
};

/**
 * Computes BasePriority, Reputation Multiplier, and Final Priority Score
 */
export function calculatePriorityScore({
  userRole = "undergrad_student",
  projectUrgency = "course_project",
  quotaBalancePercent, // % hạn ngạch tháng còn khả dụng (0-100)
  usedQuotaHours,
  allocatedQuotaHours = 20,
  reputationScore = 100,     // Điểm uy tín R in [0, 100]
  policy = DEFAULT_POLICIES.priority
}) {
  const weights = policy.weights || DEFAULT_POLICIES.priority.weights;
  const roleScores = policy.roleScores || DEFAULT_POLICIES.priority.roleScores;
  const urgencyScores = policy.urgencyScores || DEFAULT_POLICIES.priority.urgencyScores;
  const repConfig = policy.reputation || DEFAULT_POLICIES.priority.reputation;

  // 1. Role score S_role in [0, 100]
  const sRole = roleScores[userRole] !== undefined ? roleScores[userRole] : 50;

  // 2. Project urgency score S_urgency in [0, 100]
  const sUrgency = urgencyScores[projectUrgency] !== undefined ? urgencyScores[projectUrgency] : 40;

  // 3. Quota balance score S_quota_balance in [0, 100]
  let sQuota = 100;
  if (quotaBalancePercent !== undefined) {
    sQuota = Math.max(0, Math.min(100, quotaBalancePercent));
  } else if (usedQuotaHours !== undefined && allocatedQuotaHours > 0) {
    sQuota = Math.max(0, Math.min(100, Math.round(100 - (usedQuotaHours / allocatedQuotaHours) * 100)));
  }

  // Base Priority (Academic Need & Context):
  const basePriority = Math.round(
    weights.role * sRole +
    weights.urgency * sUrgency +
    weights.quotaBalance * sQuota
  );

  // 4. Behavioral Reputation Multiplier (Accountability & Discipline):
  const boundedReputation = Math.max(repConfig.minScore || 0, Math.min(repConfig.maxScore || 100, reputationScore));
  const alpha = repConfig.alpha !== undefined ? repConfig.alpha : 0.12;
  const reputationMultiplier = (1.0 - alpha) + alpha * (boundedReputation / 100.0); // in [0.88, 1.00]

  // Final Priority Score (Combining Academic Need with Historical Reputation):
  const finalScore = Math.round(basePriority * reputationMultiplier);

  return {
    totalScore: finalScore, // Backward-compatible identifier
    finalPriorityScore: finalScore,
    basePriority,
    reputationScore: boundedReputation,
    reputationMultiplier: Math.round(reputationMultiplier * 1000) / 1000,
    breakdown: {
      roleScore: Math.round(weights.role * sRole),
      urgencyScore: Math.round(weights.urgency * sUrgency),
      quotaBalanceScore: Math.round(weights.quotaBalance * sQuota),
      rawComponents: {
        sRole,
        sUrgency,
        sQuota
      }
    },
    tier: finalScore >= 80 ? "CRITICAL_PRIORITY" : finalScore >= 60 ? "HIGH_PRIORITY" : "STANDARD_PRIORITY"
  };
}

/**
 * Applies a behavioral event penalty or recovery to a given user's score
 */
export function applyBehaviorEvent({
  currentScore = 100,
  eventType,
  customDelta = null,
  reason = "",
  metadata = {},
  policy = DEFAULT_POLICIES.priority.reputation
}) {
  let delta = 0;

  if (customDelta !== null) {
    delta = customDelta;
  } else {
    switch (eventType) {
      case BEHAVIOR_EVENT_TYPES.LATE_CANCEL:
        delta = -(policy.lateCancelPenalty || 10);
        break;
      case BEHAVIOR_EVENT_TYPES.NO_SHOW:
        delta = -(policy.noShowPenalty || 25);
        break;
      case BEHAVIOR_EVENT_TYPES.QUOTA_BREACH:
        delta = -(policy.quotaBreachPenalty || 15);
        break;
      case BEHAVIOR_EVENT_TYPES.CLEAN_STREAK_RECOVERY:
        delta = +(policy.recoveryPerWeek || 2);
        break;
      default:
        delta = 0;
    }
  }

  const boundedCurrent = Math.max(0, Math.min(100, currentScore));
  const newScore = Math.max(0, Math.min(100, Math.round((boundedCurrent + delta) * 10) / 10));

  return {
    previousScore: boundedCurrent,
    newScore,
    scoreDelta: delta,
    eventType,
    reason: reason || getEventDefaultReason(eventType, delta),
    metadata
  };
}

/**
 * Computes recovery over N clean days without violation (+2 pts / 7 days, max 100)
 */
export function calculateCleanStreakRecovery(daysWithoutViolation, currentScore, policy = DEFAULT_POLICIES.priority.reputation) {
  const cycles = Math.floor(Math.max(0, daysWithoutViolation) / 7);
  const recoveryRate = policy.recoveryPerWeek || 2;
  const totalRecovery = cycles * recoveryRate;
  const newScore = Math.min(100, Math.max(0, currentScore + totalRecovery));

  return {
    daysWithoutViolation,
    completedCycles: cycles,
    recoveredPoints: totalRecovery,
    previousScore: currentScore,
    newScore
  };
}

function getEventDefaultReason(eventType, delta) {
  switch (eventType) {
    case BEHAVIOR_EVENT_TYPES.LATE_CANCEL:
      return `Hủy lịch muộn (< 2 giờ trước phiên làm việc): Trừ ${Math.abs(delta)} điểm uy tín.`;
    case BEHAVIOR_EVENT_TYPES.NO_SHOW:
      return `Vắng mặt không nhận máy (No-show): Trừ ${Math.abs(delta)} điểm uy tín nghiêm khắc.`;
    case BEHAVIOR_EVENT_TYPES.QUOTA_BREACH:
      return `Vượt hạn ngạch giờ sử dụng liên tục 2 tháng: Trừ ${Math.abs(delta)} điểm uy tín.`;
    case BEHAVIOR_EVENT_TYPES.CLEAN_STREAK_RECOVERY:
      return `Duy trì kỷ luật tuân thủ tốt: Cộng phục hồi +${delta} điểm uy tín.`;
    default:
      return `Biến động điểm uy tín: ${delta > 0 ? "+" : ""}${delta} điểm.`;
  }
}

/**
 * Finds candidate swap/bump proposals based on priority gap
 */
export function findBumpProposals({ targetBooking, existingBookings }) {
  const targetScore = calculatePriorityScore({
    userRole: targetBooking.userRole || "phd_researcher",
    projectUrgency: targetBooking.projectUrgency || "paper_deadline",
    reputationScore: targetBooking.reputationScore || 100
  }).totalScore;

  const candidateBumps = existingBookings
    .filter((b) => b.status === "approved" || b.status === "pending")
    .map((b) => {
      const bScore = calculatePriorityScore({
        userRole: b.requestedBy?.role || "undergrad_student",
        projectUrgency: b.projectUrgency || "personal_learning",
        reputationScore: b.requestedBy?.behaviorScore?.currentScore || 100
      }).totalScore;

      return {
        bookingId: b.id,
        title: b.title,
        requestedBy: b.requestedBy?.fullName,
        currentScore: bScore,
        scoreDelta: targetScore - bScore,
        canBump: targetScore - bScore >= 25, // Significant priority gap required
        compensationQuotaHours: 4
      };
    })
    .filter((c) => c.canBump)
    .sort((a, b) => b.scoreDelta - a.scoreDelta);

  return {
    targetPriorityScore: targetScore,
    proposalsFound: candidateBumps.length,
    candidates: candidateBumps
  };
}
