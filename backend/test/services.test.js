import assert from "node:assert";
import test from "node:test";

import { analyzeBookingConflicts, ConflictSeverity } from "../src/services/conflictService.js";
import { assertUserEligible, checkUserEligibility } from "../src/services/eligibilityService.js";

test("ConflictService correctly identifies maintenance blocking status", async () => {
  const mockResource = {
    id: "res-1",
    code: "TEST-RES",
    operationalStatus: "maintenance",
    bookingState: "bookable"
  };

  const mockClient = {
    booking: { findMany: async () => [] },
    maintenanceWindow: { findMany: async () => [] }
  };

  const analysis = await analyzeBookingConflicts(mockClient, {
    resourceId: "res-1",
    startAt: new Date("2026-09-01T10:00:00Z"),
    endAt: new Date("2026-09-01T12:00:00Z"),
    resource: mockResource
  });

  assert.strictEqual(analysis.hasHardConflict, true);
  assert.strictEqual(analysis.conflicts.length, 1);
  assert.strictEqual(analysis.conflicts[0].type, "MAINTENANCE_CONFLICT");
  assert.strictEqual(analysis.conflicts[0].severity, ConflictSeverity.HARD);
});

test("EligibilityService blocks user when mandatory training is missing", async () => {
  const mockClient = {
    trainingRequirement: {
      findMany: async () => [
        {
          courseId: "course-101",
          isMandatory: true,
          course: { name: "UAV Safety Course" }
        }
      ]
    },
    userCertification: {
      findUnique: async () => null // User has no cert
    }
  };

  const eligibility = await checkUserEligibility("user-1", "res-uav", mockClient);

  assert.strictEqual(eligibility.eligible, false);
  assert.strictEqual(eligibility.conflicts.length, 1);
  assert.strictEqual(eligibility.conflicts[0].type, "TRAINING_CONFLICT");
  assert.strictEqual(eligibility.conflicts[0].severity, "HARD");

  assert.throws(
    () => {
      assertUserEligible(eligibility);
    },
    (err) => err.status === 403 && err.code === "TRAINING_REQUIRED"
  );
});
