/**
 * ConflictService — xây dựng Conflict Object chuẩn theo blueprint §6.
 *
 * Phân loại conflict types và severity:
 *   HARD   → booking bị từ chối
 *   SOFT   → cảnh báo, không block
 *   WARNING → thông tin
 */

import { activeBookingStatuses } from "../utils/bookingOverlap.js";

export const ConflictType = {
  EQUIPMENT_CONFLICT: "EQUIPMENT_CONFLICT",
  USER_CONFLICT: "USER_CONFLICT",
  ROOM_CONFLICT: "ROOM_CONFLICT",
  MAINTENANCE_CONFLICT: "MAINTENANCE_CONFLICT",
  CALIBRATION_CONFLICT: "CALIBRATION_CONFLICT",
  TRAINING_CONFLICT: "TRAINING_CONFLICT",
  ELIGIBILITY_CONFLICT: "ELIGIBILITY_CONFLICT",
  QUOTA_CONFLICT: "QUOTA_CONFLICT",
  OPERATING_HOURS_CONFLICT: "OPERATING_HOURS_CONFLICT",
};

export const ConflictSeverity = {
  HARD: "HARD",
  SOFT: "SOFT",
  WARNING: "WARNING",
};

/**
 * Tạo conflict object chuẩn blueprint §6.4
 */
export function makeConflict({ type, severity, resourceId, conflictingBookingId, maintenanceWindowId, message, suggestedActions = [] }) {
  return {
    type,
    severity,
    resourceId,
    ...(conflictingBookingId ? { conflictingBookingId } : {}),
    ...(maintenanceWindowId ? { maintenanceWindowId } : {}),
    message,
    suggestedActions
  };
}

/**
 * Phân tích tất cả conflicts cho một booking request.
 *
 * @param {object} client - prisma client (tx hoặc prisma)
 * @param {object} params
 * @returns {{ hasHardConflict: boolean, conflicts: Array, warnings: Array }}
 */
export async function analyzeBookingConflicts(client, { resourceId, startAt, endAt, excludeBookingId, resource }) {
  const conflicts = [];

  // 1. Equipment status conflict
  if (resource.operationalStatus === "maintenance") {
    conflicts.push(makeConflict({
      type: ConflictType.MAINTENANCE_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      message: "Equipment is currently marked as under maintenance",
      suggestedActions: ["USE_ALTERNATIVE_EQUIPMENT"]
    }));
  } else if (resource.operationalStatus === "calibration") {
    conflicts.push(makeConflict({
      type: ConflictType.CALIBRATION_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      message: "Equipment is currently under calibration",
      suggestedActions: ["USE_ALTERNATIVE_EQUIPMENT", "MOVE_TIME"]
    }));
  } else if (["broken", "retired", "offline"].includes(resource.operationalStatus)) {
    conflicts.push(makeConflict({
      type: ConflictType.ELIGIBILITY_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      message: `Equipment is ${resource.operationalStatus} and cannot be booked`,
      suggestedActions: ["USE_ALTERNATIVE_EQUIPMENT"]
    }));
  }

  // 2. Booking state conflict
  if (resource.bookingState === "non_bookable") {
    conflicts.push(makeConflict({
      type: ConflictType.ELIGIBILITY_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      message: "Equipment is currently not available for booking",
      suggestedActions: ["USE_ALTERNATIVE_EQUIPMENT"]
    }));
  }

  // 3. Existing bookings overlap
  const overlappingBookings = await client.booking.findMany({
    where: {
      resourceId,
      status: { in: activeBookingStatuses() },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    },
    orderBy: { startAt: "asc" }
  });

  for (const booking of overlappingBookings) {
    conflicts.push(makeConflict({
      type: ConflictType.EQUIPMENT_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      conflictingBookingId: booking.id,
      message: "Equipment is already booked in the requested period",
      suggestedActions: ["MOVE_TIME", "USE_ALTERNATIVE_EQUIPMENT"]
    }));
  }

  // 4. Maintenance window overlap
  const overlappingMaintenance = await client.maintenanceWindow.findMany({
    where: {
      resourceId,
      status: { in: ["scheduled", "in_progress"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    },
    orderBy: { startAt: "asc" }
  });

  for (const mw of overlappingMaintenance) {
    const isCalibration = mw.kind === "calibration";
    conflicts.push(makeConflict({
      type: isCalibration ? ConflictType.CALIBRATION_CONFLICT : ConflictType.MAINTENANCE_CONFLICT,
      severity: ConflictSeverity.HARD,
      resourceId,
      maintenanceWindowId: mw.id,
      message: isCalibration
        ? "Equipment is scheduled for calibration in the requested period"
        : "Equipment is scheduled for maintenance in the requested period",
      suggestedActions: ["MOVE_TIME", "USE_ALTERNATIVE_EQUIPMENT"]
    }));
  }

  const warnings = conflicts.filter((c) => c.severity === ConflictSeverity.WARNING);
  const hardConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.HARD);

  return {
    hasHardConflict: hardConflicts.length > 0,
    conflicts: hardConflicts,
    softConflicts: conflicts.filter((c) => c.severity === ConflictSeverity.SOFT),
    warnings
  };
}
