/**
 * EligibilityService — kiểm tra user có đủ điều kiện sử dụng thiết bị.
 *
 * Theo blueprint §10: kiểm tra training/certification trước khi tạo booking.
 * Hard constraint nếu thiếu → throw HttpError TRAINING_REQUIRED.
 * Soft constraint nếu sắp hết hạn → trả về warning.
 */

import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";

/**
 * Kiểm tra user có đủ chứng chỉ để sử dụng resource không.
 *
 * @param {string} userId
 * @param {string} resourceId
 * @param {object} [client] - Prisma transaction client (tuỳ chọn)
 * @returns {{ eligible: boolean, conflicts: Array, warnings: Array }}
 */
export async function checkUserEligibility(userId, resourceId, client = prisma) {
  const requirements = await client.trainingRequirement.findMany({
    where: { resourceId },
    include: { course: true }
  });

  if (requirements.length === 0) {
    return { eligible: true, conflicts: [], warnings: [] };
  }

  const now = new Date();
  const conflicts = [];
  const warnings = [];

  for (const req of requirements) {
    const cert = await client.userCertification.findUnique({
      where: { userId_courseId: { userId, courseId: req.courseId } }
    });

    if (!cert || cert.status !== "active") {
      if (req.isMandatory) {
        conflicts.push({
          type: "TRAINING_CONFLICT",
          severity: "HARD",
          courseId: req.courseId,
          courseName: req.course.name,
          message: `User lacks required certification: ${req.course.name}`,
          suggestedActions: ["COMPLETE_TRAINING"]
        });
      } else {
        warnings.push({
          type: "TRAINING_CONFLICT",
          severity: "WARNING",
          courseId: req.courseId,
          courseName: req.course.name,
          message: `Recommended certification missing: ${req.course.name}`
        });
      }
      continue;
    }

    // Chứng chỉ đang active — kiểm tra sắp hết hạn (warning trong 14 ngày)
    if (cert.expiresAt) {
      const daysUntilExpiry = Math.ceil((cert.expiresAt.getTime() - now.getTime()) / 86_400_000);
      if (daysUntilExpiry < 0) {
        // Đã hết hạn
        if (req.isMandatory) {
          conflicts.push({
            type: "TRAINING_CONFLICT",
            severity: "HARD",
            courseId: req.courseId,
            courseName: req.course.name,
            message: `Certification expired: ${req.course.name}`,
            suggestedActions: ["RENEW_CERTIFICATION"]
          });
        }
      } else if (daysUntilExpiry <= 14) {
        warnings.push({
          type: "TRAINING_CONFLICT",
          severity: "WARNING",
          courseId: req.courseId,
          courseName: req.course.name,
          message: `Certification expiring in ${daysUntilExpiry} days: ${req.course.name}`
        });
      }
    }
  }

  const eligible = !conflicts.some((c) => c.severity === "HARD");
  return { eligible, conflicts, warnings };
}

/**
 * Assert user eligible — throw HttpError nếu không đủ điều kiện.
 */
export function assertUserEligible(eligibility) {
  if (eligibility.eligible) return;
  const hardConflict = eligibility.conflicts.find((c) => c.severity === "HARD");
  const errorCode = hardConflict?.courseName ? "TRAINING_REQUIRED" : "ELIGIBILITY_CONFLICT";
  throw new HttpError(
    403,
    hardConflict?.message || "User is not eligible to book this resource",
    { conflicts: eligibility.conflicts },
    errorCode
  );
}
