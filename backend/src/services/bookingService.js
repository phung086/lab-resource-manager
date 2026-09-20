import crypto from "crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import {
  PENDING_APPROVAL,
  CONFIRMED,
  CHECKED_OUT,
  RETURNED,
  COMPLETED,
  REJECTED,
  CANCELLED,
  ACTIVE_BOOKING_STATUSES,
  isValidTransition,
  isTerminalStatus
} from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";
import {
  getResourceAvailability,
  assertResourceAvailable,
  checkLabPolicyCompliance
} from "./availabilityService.js";
import { applyOperationalStatusChange } from "./resourceService.js";
import {
  scheduleBookingReminders,
  cancelPendingBookingReminders
} from "./notificationService.js";

const HARD_UNAVAILABLE_RESOURCE_STATES = new Set([
  "MAINTENANCE",
  "CALIBRATION",
  "BROKEN",
  "RETIRED",
  "OFFLINE"
]);

const STAFF_OPERATION_TARGETS = new Set([
  CONFIRMED,
  REJECTED,
  CHECKED_OUT,
  RETURNED,
  COMPLETED
]);

const bookingInclude = {
  resource: {
    include: {
      laboratory: {
        select: { id: true, code: true, name: true }
      }
    }
  },
  requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
  approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
};

function normalizeText(value) {
  return String(value || "").trim() || null;
}

async function assertStaffScopeInTransaction(tx, { actorId, actorRole, resource }) {
  if (actorRole === ADMIN) return;
  if (actorRole !== LAB_STAFF) {
    throw new HttpError(403, "Only ADMIN or LAB_STAFF can perform this booking operation", undefined, "FORBIDDEN");
  }
  if (!resource.laboratoryId) {
    throw new HttpError(403, "LAB_STAFF cannot operate bookings for resources without a laboratory assignment", undefined, "FORBIDDEN");
  }
  const assignment = await tx.userLabAssignment.findUnique({
    where: { userId_laboratoryId: { userId: actorId, laboratoryId: resource.laboratoryId } },
    select: { userId: true }
  });
  if (!assignment) {
    throw new HttpError(403, "Access denied: you are not assigned to this resource's laboratory", undefined, "FORBIDDEN");
  }
}

async function createApprovalNotification(tx, booking, toStatus, now) {
  if (![CONFIRMED, REJECTED].includes(toStatus)) return;
  const approved = toStatus === CONFIRMED;
  const type = approved ? "BOOKING_APPROVED" : "BOOKING_REJECTED";
  const messageParams = {
    bookingId: booking.id,
    title: booking.title,
    resourceCode: booking.resource.code,
    resourceName: booking.resource.name
  };
  await tx.notification.create({
    data: {
      id: crypto.randomUUID(),
      userId: booking.requestedById,
      type,
      title: approved ? "Yêu cầu đặt lịch đã được duyệt" : "Yêu cầu đặt lịch đã bị từ chối",
      message: approved
        ? `Lịch ${booking.title} cho ${booking.resource.code} đã được xác nhận.`
        : `Lịch ${booking.title} cho ${booking.resource.code} đã bị từ chối.`,
      titleKey: approved ? "booking.approved.title" : "booking.rejected.title",
      messageKey: approved ? "booking.approved.message" : "booking.rejected.message",
      messageParams,
      severity: approved ? "success" : "danger",
      channel: "in_app",
      sentAt: now,
      dedupeKey: `booking:${booking.id}:${type}`
    }
  });
}

/**
 * Application-level slot conflict check using canonical fields.
 * This is a pre-check only; the GiST exclusion constraint is the final authority.
 * No mockStore fallback — DB error = explicit error.
 */
export async function checkSlotConflict(resourceId, startAt, endAt, excludeBookingId = null, client = prisma) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (start >= end) {
    throw new HttpError(400, "Start time must be before end time", undefined, "VALIDATION_ERROR");
  }

  const whereClause = {
    resourceId,
    status: { in: ACTIVE_BOOKING_STATUSES },
    startAt: { lt: end },
    endAt: { gt: start }
  };

  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  const conflictingBooking = await client.booking.findFirst({
    where: whereClause,
    select: { id: true, title: true, startAt: true, endAt: true, status: true }
  });

  return conflictingBooking;
}

/**
 * Creates a new booking with canonical field names and status.
 *
 * - approval-required resource → PENDING_APPROVAL
 * - immediate resource → CONFIRMED
 * - No payment dependency
 * - No mockStore fallback — Prisma error = explicit error
 * - Uses operationalStatus for availability check
 */
export async function createBooking({ requestedById, resourceId, title, purpose, startAt, endAt }) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (start >= end) {
    throw new HttpError(400, "Start time must be before end time", undefined, "VALIDATION_ERROR");
  }

  return prisma.$transaction(async (tx) => {
    const resource = await tx.resource.findUnique({
      where: { id: resourceId },
      include: { laboratory: { include: { labPolicy: true } } }
    });
    if (!resource) {
      throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    }

    if (HARD_UNAVAILABLE_RESOURCE_STATES.has(resource.operationalStatus)) {
      throw new HttpError(400, "Resource is not available for booking", undefined, "RESOURCE_UNAVAILABLE");
    }

    if (resource.laboratory?.labPolicy) {
      checkLabPolicyCompliance({
        policy: resource.laboratory.labPolicy,
        startAt: start,
        endAt: end
      });
    }

    const availability = await getResourceAvailability(tx, {
      resourceId,
      startAt: start,
      endAt: end,
      resource
    });

    assertResourceAvailable(availability);

    const initialStatus = (resource.requiresApproval || resource.laboratory?.labPolicy?.requiresApproval) ? PENDING_APPROVAL : CONFIRMED;
    const booking = await tx.booking.create({
      data: {
        id: crypto.randomUUID(),
        resourceId,
        requestedById,
        title: title || `Booking: ${resource.name}`,
        purpose: purpose || "",
        startAt: start,
        endAt: end,
        status: initialStatus
      },
      include: bookingInclude
    });

    await tx.usageLog.create({
      data: {
        id: crypto.randomUUID(),
        resourceId,
        bookingId: booking.id,
        userId: requestedById,
        actorType: "USER",
        action: "REQUEST",
        fromStatus: null,
        toStatus: initialStatus,
        message: `Booking created with status ${initialStatus}`,
        messageKey: "booking_created"
      }
    });

    if (initialStatus === CONFIRMED) {
      await scheduleBookingReminders(tx, booking);
    }

    return booking;
  });
}

/**
 * Transition a booking through the canonical state machine.
 *
 * Validates transition legality before persistence.
 * Records actor, timestamp, reason, and conditions in audit trail.
 */
export async function transitionBooking({
  bookingId,
  toStatus,
  actorId,
  actorRole,
  reason = null,
  conditionBefore = null,
  conditionAfter = null
}) {
  const normalizedReason = normalizeText(reason);
  const normalizedConditionBefore = normalizeText(conditionBefore);
  const normalizedConditionAfter = normalizeText(conditionAfter);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });

    if (!booking) throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");

    if (STAFF_OPERATION_TARGETS.has(toStatus)) {
      await assertStaffScopeInTransaction(tx, { actorId, actorRole, resource: booking.resource });
    }

    if (!isValidTransition(booking.status, toStatus)) {
      throw new HttpError(
        409,
        `Cannot transition from ${booking.status} to ${toStatus}`,
        { currentStatus: booking.status, requestedStatus: toStatus },
        "BOOKING_INVALID_TRANSITION"
      );
    }

    if (toStatus === REJECTED && !normalizedReason) {
      throw new HttpError(400, "Rejection reason is required", { field: "reason" }, "VALIDATION_ERROR");
    }
    if (toStatus === CHECKED_OUT && !normalizedConditionBefore) {
      throw new HttpError(400, "Condition before handover is required", { field: "conditionBefore" }, "VALIDATION_ERROR");
    }
    if (toStatus === RETURNED && !normalizedConditionAfter) {
      throw new HttpError(400, "Condition after return is required", { field: "conditionAfter" }, "VALIDATION_ERROR");
    }

    const now = new Date();
    let physicalStateWarning = null;

    if (toStatus === CHECKED_OUT) {
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${booking.resourceId} FOR UPDATE`;
      const physical = await tx.resource.findUnique({ where: { id: booking.resourceId } });
      if (!physical) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
      if (physical.operationalStatus !== "AVAILABLE") {
        throw new HttpError(
          409,
          `Resource cannot be handed over while operational status is ${physical.operationalStatus}`,
          { operationalStatus: physical.operationalStatus },
          "RESOURCE_STATE_CONFLICT"
        );
      }
      await applyOperationalStatusChange(tx, {
        resourceId: booking.resourceId,
        operationalStatus: "IN_USE",
        reason: `Booking ${booking.id} checked out`,
        actor: { id: actorId, role: actorRole },
        bookingId: booking.id,
        message: "booking.resource.checked_out",
        lockResource: false
      });
    }

    if (toStatus === RETURNED) {
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${booking.resourceId} FOR UPDATE`;
      const physical = await tx.resource.findUnique({ where: { id: booking.resourceId } });
      if (!physical) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
      if (physical.operationalStatus === "IN_USE") {
        await applyOperationalStatusChange(tx, {
          resourceId: booking.resourceId,
          operationalStatus: "AVAILABLE",
          reason: `Booking ${booking.id} returned`,
          actor: { id: actorId, role: actorRole },
          bookingId: booking.id,
          message: "booking.resource.returned",
          lockResource: false
        });
      } else if (HARD_UNAVAILABLE_RESOURCE_STATES.has(physical.operationalStatus)) {
        physicalStateWarning = `Resource remains ${physical.operationalStatus}; return was recorded without overriding the physical state.`;
      }
    }

    const updateData = { status: toStatus };
    if (toStatus === CONFIRMED && booking.status === PENDING_APPROVAL) {
      updateData.approvedById = actorId;
      updateData.approvedAt = now;
    }
    if (toStatus === CHECKED_OUT) {
      updateData.actualStartAt = now;
      updateData.handoverCondition = normalizedConditionBefore;
    }
    if (toStatus === RETURNED) {
      updateData.returnedAt = now;
      updateData.actualEndAt = now;
      updateData.returnCondition = normalizedConditionAfter;
    }
    if (toStatus === COMPLETED) updateData.completedAt = now;

    const actionMap = {
      [CONFIRMED]: booking.status === PENDING_APPROVAL ? "APPROVE" : "STATUS_CHANGE",
      [REJECTED]: "REJECT",
      [CANCELLED]: "CANCEL",
      [CHECKED_OUT]: "CHECK_OUT",
      [RETURNED]: "RETURN",
      [COMPLETED]: "COMPLETE"
    };
    const action = actionMap[toStatus] || "STATUS_CHANGE";

    const result = await tx.booking.update({ where: { id: bookingId }, data: updateData, include: bookingInclude });

    await tx.usageLog.create({
      data: {
        id: crypto.randomUUID(),
        resourceId: booking.resourceId,
        bookingId: booking.id,
        userId: actorId,
        actorType: "USER",
        action,
        fromStatus: booking.status,
        toStatus,
        reason: normalizedReason,
        conditionBefore: toStatus === CHECKED_OUT ? normalizedConditionBefore : null,
        conditionAfter: toStatus === RETURNED ? normalizedConditionAfter : null,
        message: `Booking transitioned from ${booking.status} to ${toStatus}`,
        messageKey: `booking_${action.toLowerCase()}`,
        metadata: physicalStateWarning ? { physicalStateWarning } : {}
      }
    });

    if (booking.status === PENDING_APPROVAL && [CONFIRMED, REJECTED].includes(toStatus)) {
      await createApprovalNotification(tx, booking, toStatus, now);
    }

    if (toStatus === CONFIRMED) {
      await scheduleBookingReminders(tx, result, now);
    } else if (toStatus === CHECKED_OUT) {
      await cancelPendingBookingReminders(tx, booking.id, ["BOOKING_UPCOMING"]);
    } else if ([REJECTED, CANCELLED].includes(toStatus)) {
      await cancelPendingBookingReminders(tx, booking.id);
    } else if ([RETURNED, COMPLETED].includes(toStatus)) {
      await cancelPendingBookingReminders(tx, booking.id, ["RETURN_REMINDER"]);
    }

    return physicalStateWarning ? { ...result, physicalStateWarning } : result;
  });
}

/** Returns bookings for the specified user (own bookings). */
export async function getUserBookings(userId) {
  return prisma.booking.findMany({
    where: { requestedById: userId },
    include: bookingInclude,
    orderBy: { startAt: "desc" }
  });
}

/**
 * Cancel a booking with canonical state machine validation.
 * - Staff/admin can cancel any booking with reason
 * - Owner can cancel own booking under policy
 * No mockStore fallback.
 */
export async function cancelBooking(bookingId, actorId, actorRole, reason = null) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
  }

  if (actorRole === LAB_STAFF && booking.requestedById !== actorId) {
    await assertLabStaffResourceAccess(actorId, booking.resourceId);
  } else if (actorRole !== ADMIN && actorRole !== LAB_STAFF && booking.requestedById !== actorId) {
    throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
  }

  // Terminal bookings cannot be cancelled again
  if (isTerminalStatus(booking.status)) {
    throw new HttpError(
      409,
      `Cannot cancel a booking with status ${booking.status}`,
      { currentStatus: booking.status },
      "BOOKING_INVALID_TRANSITION"
    );
  }

  return transitionBooking({
    bookingId,
    toStatus: CANCELLED,
    actorId,
    actorRole,
    reason: reason || "Cancelled by user"
  });
}
