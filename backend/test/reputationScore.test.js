import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePriorityScore,
  applyBehaviorEvent,
  calculateCleanStreakRecovery,
  BEHAVIOR_EVENT_TYPES
} from "../src/services/prioritySchedulerService.js";
import { DEFAULT_POLICIES } from "../src/services/policyEngine.js";

test("Phase 2 - Reputation Penalty: Deducts correct points per violation type", () => {
  // 1. Late cancel (-10 points)
  const lateCancel = applyBehaviorEvent({
    currentScore: 100,
    eventType: BEHAVIOR_EVENT_TYPES.LATE_CANCEL
  });
  assert.equal(lateCancel.scoreDelta, -10);
  assert.equal(lateCancel.newScore, 90);

  // 2. No-show (-25 points)
  const noShow = applyBehaviorEvent({
    currentScore: 90,
    eventType: BEHAVIOR_EVENT_TYPES.NO_SHOW
  });
  assert.equal(noShow.scoreDelta, -25);
  assert.equal(noShow.newScore, 65);

  // 3. Quota breach (-15 points)
  const quotaBreach = applyBehaviorEvent({
    currentScore: 65,
    eventType: BEHAVIOR_EVENT_TYPES.QUOTA_BREACH
  });
  assert.equal(quotaBreach.scoreDelta, -15);
  assert.equal(quotaBreach.newScore, 50);
});

test("Phase 2 - Reputation Recovery: Clean streak awards +2 points per 7 consecutive compliant days", () => {
  // 14 clean days -> 2 cycles -> +4 points
  const recovery14 = calculateCleanStreakRecovery(14, 75);
  assert.equal(recovery14.completedCycles, 2);
  assert.equal(recovery14.recoveredPoints, 4);
  assert.equal(recovery14.newScore, 79);

  // 21 clean days -> 3 cycles -> +6 points
  const recovery21 = calculateCleanStreakRecovery(21, 80);
  assert.equal(recovery21.completedCycles, 3);
  assert.equal(recovery21.recoveredPoints, 6);
  assert.equal(recovery21.newScore, 86);

  // 5 clean days -> 0 completed 7-day cycles -> 0 points
  const recovery5 = calculateCleanStreakRecovery(5, 70);
  assert.equal(recovery5.completedCycles, 0);
  assert.equal(recovery5.recoveredPoints, 0);
  assert.equal(recovery5.newScore, 70);
});

test("Phase 2 - Boundary Invariant: Reputation score strictly clamped to [0, 100]", () => {
  // Cannot drop below 0
  const floorTest = applyBehaviorEvent({
    currentScore: 10,
    eventType: BEHAVIOR_EVENT_TYPES.NO_SHOW // -25
  });
  assert.equal(floorTest.newScore, 0, "Reputation score must not drop below 0");

  // Cannot exceed 100
  const ceilingTest = calculateCleanStreakRecovery(60, 98); // 8 cycles -> +16 pts
  assert.equal(ceilingTest.newScore, 100, "Reputation score must not exceed 100");
});

test("Phase 2 - Priority Multiplier: 12% alpha never inverts academic hierarchy (PhD urgent vs Undergrad standard)", () => {
  // Case A: PhD Researcher with Paper Deadline and LOW reputation (R = 0)
  const phdLowRep = calculatePriorityScore({
    userRole: "phd_researcher",      // S_role = 85
    projectUrgency: "paper_deadline", // S_urgency = 100
    quotaBalancePercent: 80,         // S_quota = 80
    reputationScore: 0               // R = 0 -> multiplier = 0.88
  });

  // BasePriority = 0.50*85 + 0.35*100 + 0.15*80 = 42.5 + 35 + 12 = 89.5 -> 90
  assert.equal(phdLowRep.basePriority, 90);
  assert.equal(phdLowRep.reputationMultiplier, 0.88);
  // FinalPriorityScore = round(90 * 0.88) = 79
  assert.equal(phdLowRep.finalPriorityScore, 79);

  // Case B: Undergrad Student with Personal Learning and PERFECT reputation (R = 100)
  const undergradHighRep = calculatePriorityScore({
    userRole: "undergrad_student",     // S_role = 50
    projectUrgency: "personal_learning", // S_urgency = 30
    quotaBalancePercent: 100,          // S_quota = 100
    reputationScore: 100               // R = 100 -> multiplier = 1.00
  });

  // BasePriority = 0.50*50 + 0.35*30 + 0.15*100 = 25 + 10.5 + 15 = 50.5 -> 51
  assert.equal(undergradHighRep.basePriority, 51);
  assert.equal(undergradHighRep.reputationMultiplier, 1.00);
  // FinalPriorityScore = round(51 * 1.00) = 51
  assert.equal(undergradHighRep.finalPriorityScore, 51);

  // Assert PhD with R=0 still dominates Undergrad with R=100 (79 > 51)
  assert.ok(
    phdLowRep.finalPriorityScore > undergradHighRep.finalPriorityScore,
    `PhD urgent priority (${phdLowRep.finalPriorityScore}) must strictly exceed Undergrad personal learning (${undergradHighRep.finalPriorityScore})`
  );
  assert.ok(phdLowRep.finalPriorityScore - undergradHighRep.finalPriorityScore >= 25, "Priority gap is significant (>= 25 pts)");
});

test("Phase 2 - Multi-User Simulation: 5 representative profiles calculate consistent FinalPriorityScores", () => {
  const simulationUsers = [
    {
      id: "u1",
      name: "PhD Urgent Clean (Nguyen Van An)",
      role: "phd_researcher",
      urgency: "paper_deadline",
      quotaBalance: 90,
      reputation: 94,
      expectedBase: 91, // 0.5*85 + 0.35*100 + 0.15*90 = 42.5 + 35 + 13.5 = 91
      expectedMultiplier: 0.993, // 0.88 + 0.12 * 0.94 = 0.9928 -> 0.993
      expectedFinal: 90 // round(91 * 0.9928) = 90
    },
    {
      id: "u2",
      name: "Master Student Thesis (Le Hoang Long)",
      role: "master_student",
      urgency: "thesis_defense",
      quotaBalance: 80,
      reputation: 100,
      expectedBase: 79, // 0.5*70 + 0.35*90 + 0.15*80 = 35 + 31.5 + 12 = 78.5 -> 79
      expectedMultiplier: 1.000,
      expectedFinal: 79 // round(79 * 1.00) = 79
    },
    {
      id: "u3",
      name: "Undergrad Low Rep (Tran Thi Binh)",
      role: "undergrad_student",
      urgency: "course_project",
      quotaBalance: 60,
      reputation: 65,
      expectedBase: 55, // 0.5*50 + 0.35*60 + 0.15*60 = 25 + 21 + 9 = 55
      expectedMultiplier: 0.958, // 0.88 + 0.12 * 0.65 = 0.958
      expectedFinal: 53 // round(55 * 0.958) = 53
    },
    {
      id: "u4",
      name: "PhD Repeated Breach (Pham Quoc Huy)",
      role: "phd_researcher",
      urgency: "course_project",
      quotaBalance: 40,
      reputation: 75,
      expectedBase: 70, // 0.5*85 + 0.35*60 + 0.15*40 = 42.5 + 21 + 6 = 69.5 -> 70
      expectedMultiplier: 0.970, // 0.88 + 0.12 * 0.75 = 0.970
      expectedFinal: 68 // round(70 * 0.97) = 68
    },
    {
      id: "u5",
      name: "Undergrad Exemplary (Do Minh Khang)",
      role: "undergrad_student",
      urgency: "course_project",
      quotaBalance: 100,
      reputation: 100,
      expectedBase: 61, // 0.5*50 + 0.35*60 + 0.15*100 = 25 + 21 + 15 = 61
      expectedMultiplier: 1.000,
      expectedFinal: 61 // round(61 * 1.00) = 61
    }
  ];

  for (const user of simulationUsers) {
    const res = calculatePriorityScore({
      userRole: user.role,
      projectUrgency: user.urgency,
      quotaBalancePercent: user.quotaBalance,
      reputationScore: user.reputation
    });

    assert.equal(res.basePriority, user.expectedBase, `Base priority mismatch for ${user.name}`);
    assert.equal(res.reputationMultiplier, user.expectedMultiplier, `Multiplier mismatch for ${user.name}`);
    assert.equal(res.finalPriorityScore, user.expectedFinal, `Final priority mismatch for ${user.name}`);
  }
});
