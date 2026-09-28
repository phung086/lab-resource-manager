import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBookingTrainingEligibility,
  getTrainingEligibility
} from "../src/services/trainingEligibilityService.js";

function fakeClient({ requirements = [], certifications = [] } = {}) {
  return {
    trainingRequirement: {
      async findMany() {
        return requirements;
      }
    },
    userCertification: {
      async findMany({ where }) {
        return certifications.filter((row) => {
          if (row.userId !== where.userId) return false;
          if (!where.courseId.in.includes(row.courseId)) return false;
          if (row.status !== "active") return false;
          return row.expiresAt == null || row.expiresAt > where.OR[1].expiresAt.gt;
        });
      }
    }
  };
}

const requirement = (courseId, code, name, isMandatory = true) => ({
  resourceId: "resource-1",
  courseId,
  isMandatory,
  course: { id: courseId, code, name }
});

const certification = ({ userId = "user-1", courseId, status = "active", expiresAt = null }) => ({
  userId,
  courseId,
  status,
  expiresAt
});

test("training eligibility: resource with no mandatory requirement is eligible", async () => {
  const result = await getTrainingEligibility(fakeClient(), {
    userId: "user-1",
    resourceId: "resource-1",
    now: new Date("2026-09-25T00:00:00Z")
  });
  assert.equal(result.eligible, true);
  assert.deepEqual(result.missingTraining, []);
});

test("training eligibility: active non-expired certification satisfies requirement", async () => {
  const now = new Date("2026-09-25T00:00:00Z");
  const result = await getTrainingEligibility(fakeClient({
    requirements: [requirement("course-a", "SAFE-A", "Safety A")],
    certifications: [certification({ courseId: "course-a", expiresAt: new Date("2027-01-01T00:00:00Z") })]
  }), { userId: "user-1", resourceId: "resource-1", now });

  assert.equal(result.eligible, true);
  assert.equal(result.requiredCourses.length, 1);
});

test("training eligibility: expired certification is rejected", async () => {
  const now = new Date("2026-09-25T00:00:00Z");
  const result = await getTrainingEligibility(fakeClient({
    requirements: [requirement("course-a", "SAFE-A", "Safety A")],
    certifications: [certification({ courseId: "course-a", expiresAt: new Date("2026-09-24T23:59:59Z") })]
  }), { userId: "user-1", resourceId: "resource-1", now });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.missingTraining.map((row) => row.code), ["SAFE-A"]);
});

test("training eligibility: revoked certification is rejected", async () => {
  const result = await getTrainingEligibility(fakeClient({
    requirements: [requirement("course-a", "SAFE-A", "Safety A")],
    certifications: [certification({ courseId: "course-a", status: "revoked" })]
  }), { userId: "user-1", resourceId: "resource-1", now: new Date("2026-09-25T00:00:00Z") });

  assert.equal(result.eligible, false);
});

test("training eligibility: another user's certification cannot satisfy requirement", async () => {
  const result = await getTrainingEligibility(fakeClient({
    requirements: [requirement("course-a", "SAFE-A", "Safety A")],
    certifications: [certification({ userId: "user-2", courseId: "course-a" })]
  }), { userId: "user-1", resourceId: "resource-1", now: new Date("2026-09-25T00:00:00Z") });

  assert.equal(result.eligible, false);
});

test("training eligibility: every mandatory course must be active", async () => {
  const client = fakeClient({
    requirements: [
      requirement("course-a", "SAFE-A", "Safety A"),
      requirement("course-b", "SAFE-B", "Safety B")
    ],
    certifications: [certification({ courseId: "course-a" })]
  });

  await assert.rejects(
    () => assertBookingTrainingEligibility(client, {
      userId: "user-1",
      resourceId: "resource-1",
      now: new Date("2026-09-25T00:00:00Z")
    }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, "BOOKING_TRAINING_REQUIRED");
      assert.deepEqual(error.details.missingTraining.map((row) => row.code), ["SAFE-B"]);
      return true;
    }
  );
});
