import crypto from "crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import {
  PENDING_APPROVAL,
  CONFIRMED,
  CANCELLED,
  ACTIVE_BOOKING_STATUSES,
  isValidTransition,
  isTerminalStatus
} from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";

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
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    }

    const blockedStatuses = ["MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"];
    if (blockedStatuses.includes(resource.operationalStatus)) {
      throw new HttpError(400, "Resource is not available for booking", undefined, "RESOURCE_UNAVAILABLE");
    }

    const conflict = await checkSlotConflict(resourceId, start, end, null, tx);
    if (conflict) {
      throw new HttpError(
        409,
        "Time slot conflicts with an existing booking",
        { conflictingBookingId: conflict.id },
        "BOOKING_CONFLICT"
      );
    }

    const initialStatus = resource.requiresApproval ? PENDING_APPROVAL : CONFIRMED;
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
      include: {
        resource: true,
        requestedBy: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
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
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { resource: true }
    });

    if (!booking) {
      throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
    }
    if (!isValidTransition(booking.status, toStatus)) {
      throw new HttpError(
        409,
        `Cannot transition from ${booking.status} to ${toStatus}`,
        { currentStatus: booking.status, requestedStatus: toStatus },
        "BOOKING_INVALID_TRANSITION"
      );
    }

    const updateData = { status: toStatus };
    if (toStatus === CONFIRMED && booking.status === PENDING_APPROVAL) {
      updateData.approvedById = actorId;
      updateData.approvedAt = new Date();
    }
    if (toStatus === "RETURNED") updateData.returnedAt = new Date();
    if (toStatus === "COMPLETED") updateData.completedAt = new Date();
    if (toStatus === "CHECKED_OUT") updateData.actualStartAt = new Date();
    if (conditionBefore) updateData.handoverCondition = conditionBefore;
    if (conditionAfter) updateData.returnCondition = conditionAfter;

    const actionMap = {
      CONFIRMED: booking.status === PENDING_APPROVAL ? "APPROVE" : "STATUS_CHANGE",
      REJECTED: "REJECT",
      CANCELLED: "CANCEL",
      CHECKED_OUT: "CHECK_OUT",
      RETURNED: "RETURN",
      COMPLETED: "COMPLETE"
    };
    const action = actionMap[toStatus] || "STATUS_CHANGE";

    const result = await tx.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        resource: true,
        requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
      }
    });

    // Create audit log entry
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
        reason: reason || null,
        conditionBefore: conditionBefore || null,
        conditionAfter: conditionAfter || null,
        message: `Booking transitioned from ${booking.status} to ${toStatus}`,
        messageKey: `booking_${action.toLowerCase()}`
      }
    });

    return result;
  });
}

/**
 * Returns bookings for the specified user (own bookings).
 * No mockStore fallback.
 */
export async function getUserBookings(userId) {
  return prisma.booking.findMany({
    where: { requestedById: userId },
    include: {
      resource: true,
      requestedBy: { select: { id: true, fullName: true, email: true, role: true } }
    },
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
