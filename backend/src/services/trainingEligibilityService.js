import { HttpError } from "../middleware/errors.js";

export async function getTrainingEligibility(client, { userId, resourceId, now = new Date() }) {
  const requirements = await client.trainingRequirement.findMany({
    where: { resourceId, isMandatory: true },
    include: {
      course: {
        select: { id: true, code: true, name: true }
      }
    },
    orderBy: [{ course: { code: "asc" } }, { courseId: "asc" }]
  });

  if (requirements.length === 0) {
    return {
      eligible: true,
      requiredCourses: [],
      missingTraining: []
    };
  }

  const courseIds = requirements.map((requirement) => requirement.courseId);
  const certifications = await client.userCertification.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    select: { courseId: true, expiresAt: true }
  });

  const activeCourseIds = new Set(certifications.map((certification) => certification.courseId));
  const missingTraining = requirements
    .filter((requirement) => !activeCourseIds.has(requirement.courseId))
    .map((requirement) => ({
      courseId: requirement.course.id,
      code: requirement.course.code,
      name: requirement.course.name
    }));

  return {
    eligible: missingTraining.length === 0,
    requiredCourses: requirements.map((requirement) => ({
      courseId: requirement.course.id,
      code: requirement.course.code,
      name: requirement.course.name
    })),
    missingTraining
  };
}

export async function assertBookingTrainingEligibility(client, { userId, resourceId, now = new Date() }) {
  const result = await getTrainingEligibility(client, { userId, resourceId, now });
  if (!result.eligible) {
    throw new HttpError(
      403,
      "Required laboratory training or certification is missing, expired, or revoked",
      {
        resourceId,
        missingTraining: result.missingTraining
      },
      "BOOKING_TRAINING_REQUIRED"
    );
  }
  return result;
}
