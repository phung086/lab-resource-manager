import { lockCurrentAccount } from "./accountAccess.js";
import { policySnapshot } from './planning/policyModel.js';
import { PAYMENT_HOLD_MS, expirePaymentHolds, expireResourcePaymentHolds, isPaymentHold } from './bookingPaymentHoldService.js';
import { bookingContact } from "./bookingContactService.js";
import { bookingFulfillmentSnapshot, assertHandoverWindow, assertBookingPaid, assertHandoverReady } from './bookingFulfillmentService.js';
import crypto from "crypto";
import { assertCareReady } from "./resourceCareAccounting.js";
import { recordSystemAuditEvent } from "./systemAuditService.js";
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
  isValidTransition
} from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";
import {
  getResourceAvailability,
  assertResourceAvailable,
  checkLabPolicyCompliance
} from "./availabilityService.js";
import { applyOperationalStatusChange } from "./resourceService.js";
import { notifyBookingEvent } from "./bookingEventService.js";
import { quoteBooking, verifyAcceptedQuote, ensureBookingCharge } from "./bookingPricingService.js";
import { assertBookingTrainingEligibility } from "./trainingEligibilityService.js";
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
        select: { id: true, code: true, name: true, isActive: true, labPolicy: true }
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
  const assignments = await tx.$queryRaw`SELECT "userId" FROM user_lab_assignments WHERE "userId" = ${actorId} AND "laboratoryId" = ${resource.laboratoryId} FOR SHARE`;
  if (!assignments.length) {
    throw new HttpError(403, "Access denied: you are not assigned to this resource's laboratory", undefined, "FORBIDDEN");
  }
}

async function lockBookingActor(tx, actorId, actorRole, expectedAuthVersion) {
  const actor = await lockCurrentAccount(tx, actorId, expectedAuthVersion);
  if (actor.role !== actorRole) throw new HttpError(401, 'Session has changed', undefined, 'AUTH_INVALID');
  return actor;
}

// All writers use resource -> booking order, including payment/expiry/creation.
async function lockBooking(tx, bookingId) {
  const pointer = await tx.booking.findUnique({ where: { id: bookingId }, select: { resourceId: true } });
  if (!pointer) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
  await tx.$queryRaw`SELECT id FROM resources WHERE id = ${pointer.resourceId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
  return tx.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
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

  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start >= end) {
    throw new HttpError(400, "Start time must be before end time", undefined, "VALIDATION_ERROR");
  }

  const whereClause = {
    resourceId,
    schedulingReleasedAt: null,
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
 * - free eligible resource → CONFIRMED automatically
 * - positive fee → payment verification hold, at most 15 minutes and before start
 * - No mockStore fallback — Prisma error = explicit error
 * - Uses operationalStatus for availability check
 */
async function assertBookingReadiness(tx, { requestedById, resourceId, resource, start, end }) {
    await assertCareReady(tx, resourceId);
    if (resource.maxBookingMinutes != null && (end - start) / 60000 > resource.maxBookingMinutes) throw new HttpError(400, "Duration exceeds the resource rental limit", { maxBookingMinutes: resource.maxBookingMinutes }, "RESOURCE_DURATION_LIMIT");

    if (HARD_UNAVAILABLE_RESOURCE_STATES.has(resource.operationalStatus)) {
      throw new HttpError(400, "Resource is not available for booking", undefined, "RESOURCE_UNAVAILABLE");
    }

    await assertBookingTrainingEligibility(tx, {
      userId: requestedById,
      resourceId,
      now: new Date()
    });

    checkLabPolicyCompliance({
      policy: resource.laboratory?.labPolicy,
      startAt: start,
      endAt: end
    });

    const availability = await getResourceAvailability(tx, {
      resourceId,
      startAt: start,
      endAt: end,
      resource
    });

    assertResourceAvailable(availability);

}

export async function preflightBooking(actor, { resourceId, startAt, endAt, purposeCode }) {
  if (actor.role === LAB_STAFF) await assertLabStaffResourceAccess(actor.id, resourceId);
  await expirePaymentHolds(prisma, { resourceId });
  return prisma.$transaction(async tx => {
    await lockCurrentAccount(tx, actor.id, actor.authVersion);
    const quote = await quoteBooking(tx, { resourceId, startAt, endAt, purposeCode }, { userId: actor.id });
    const resource = await tx.resource.findUnique({ where: { id: resourceId }, include: { laboratory: { include: { labPolicy: true } } } });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    await assertBookingReadiness(tx, { requestedById: actor.id, resourceId, resource, start: new Date(startAt), end: new Date(endAt) });
    return { ready: true, checkedAt: new Date().toISOString(), quote, finalValidationRequired: true };
  }, { timeout: 8000 });
}

export async function createBookingWithTransaction(tx, { requestedById, resourceId, title, purpose, startAt, endAt, purposeCode, acceptedQuote, contact, fulfillment, applyLoyalty = true, expectedAuthVersion }) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start >= end) {
    throw new HttpError(400, "Start time must be before end time", undefined, "VALIDATION_ERROR");
  }

  const requester = await lockCurrentAccount(tx, requestedById, expectedAuthVersion);
  await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
  if (requester.role === LAB_STAFF) {
    const scopedResource = await tx.resource.findUnique({ where: { id: resourceId }, select: { laboratoryId: true } });
    if (!scopedResource) throw new HttpError(404, 'Resource not found', undefined, 'NOT_FOUND');
    await assertStaffScopeInTransaction(tx, { actorId: requester.id, actorRole: requester.role, resource: scopedResource });
  }
  await expireResourcePaymentHolds(tx, resourceId);
    const quote = await quoteBooking(tx, { resourceId, purposeCode, startAt, endAt }, { userId: applyLoyalty ? requestedById : null, lockPolicy: true });
    verifyAcceptedQuote(quote, acceptedQuote);
    const resource = await tx.resource.findUnique({
      where: { id: resourceId },
      include: { laboratory: { include: { labPolicy: true } } }
    });
    if (!resource) {
      throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    }

    await assertBookingReadiness(tx, { requestedById, resourceId, resource, start, end });

    const contactSnapshot = await bookingContact(tx, requestedById, contact);
    const fulfillmentSnapshot = await bookingFulfillmentSnapshot(tx, resource, fulfillment);
    const now = new Date();
    checkLabPolicyCompliance({ policy: resource.laboratory?.labPolicy, startAt: start, endAt: end, now });
    const initialStatus = quote.amountVnd > 0 ? PENDING_APPROVAL : CONFIRMED;
    const booking = await tx.booking.create({
      data: {
        id: crypto.randomUUID(),
        resourceId,
        requestedById,
        title: title || `Booking: ${resource.name}`,
        purpose: purpose || "",
        startAt: start,
        endAt: end,
        status: initialStatus,
        createdAt: now,
        approvedAt: initialStatus === CONFIRMED ? now : null,
        paymentDueAt: quote.amountVnd > 0 ? new Date(Math.min(+now + PAYMENT_HOLD_MS, +start)) : null,
        feeAmountVnd: quote.amountVnd,
        contactSnapshot: contactSnapshot || undefined,
        fulfillmentSnapshot,
        feeSnapshot: quote,
        policySnapshot: policySnapshot(resource.laboratory?.labPolicy)
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
        message: initialStatus === CONFIRMED ? 'Booking automatically confirmed after policy checks' : 'Slot held pending verified payment',
        metadata: { automaticConfirmation: initialStatus === CONFIRMED, paymentDueAt: booking.paymentDueAt?.toISOString() },
        messageKey: "booking_created"
      }
    });

    await ensureBookingCharge(tx, booking);
    if (initialStatus === CONFIRMED) {
      await scheduleBookingReminders(tx, booking);
      await tx.notification.create({ data: { id: crypto.randomUUID(), userId: requestedById, type: "BOOKING_APPROVED", title: "Đặt lịch đã xác nhận", message: booking.resource.name, titleKey: "booking.auto_confirmed.title", messageKey: "booking.auto_confirmed.message", messageParams: { bookingId: booking.id, resourceName: booking.resource.name }, severity: "success", sentAt: new Date(), dedupeKey: `booking:${booking.id}:auto-confirmed` } });
    }

    if (initialStatus === CONFIRMED) await notifyBookingEvent(tx, booking, 'CONFIRMED');

  return booking;
}

export async function createBooking(input) {
  return prisma.$transaction((tx) => createBookingWithTransaction(tx, input));
}

export async function rescheduleBooking({ bookingId, actor, startAt, endAt, expectedStartAt, reason }) {
  return prisma.$transaction(async tx => {
    await lockBookingActor(tx, actor.id, actor.role, actor.authVersion);
    const booking = await lockBooking(tx, bookingId);
    if (!booking) throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
    await assertStaffScopeInTransaction(tx, { actorId: actor.id, actorRole: actor.role, resource: booking.resource });
    if (booking.status !== CONFIRMED) throw new HttpError(409, "Only a confirmed booking can move", undefined, "BOOKING_INVALID_TRANSITION");
    if (+booking.startAt !== +expectedStartAt) throw new HttpError(409, "Booking changed; refresh before moving", undefined, "BOOKING_CHANGED");
    if (+startAt === +booking.startAt && +endAt === +booking.endAt) return booking;
    if (+endAt - +startAt !== +booking.endAt - +booking.startAt) throw new HttpError(400, "Moving preserves booked duration and fee", undefined, "BOOKING_MOVE_DURATION");
    await tx.$queryRaw`SELECT id FROM laboratories WHERE id = ${booking.resource.laboratoryId} FOR SHARE`;
    const laboratory = booking.resource.laboratoryId ? await tx.laboratory.findUnique({ where: { id: booking.resource.laboratoryId }, include: { labPolicy: true } }) : null;
    const resource = { ...booking.resource, laboratory }, currentPolicy = laboratory?.labPolicy;
    await assertCareReady(tx, booking.resourceId);
    if (booking.resource.maxBookingMinutes != null && (endAt-startAt)/60000 > booking.resource.maxBookingMinutes) throw new HttpError(400,"Duration exceeds resource rental limit",undefined,"RESOURCE_DURATION_LIMIT");
    await assertBookingTrainingEligibility(tx,{userId:booking.requestedById,resourceId:booking.resourceId,now:new Date()});
    checkLabPolicyCompliance({ policy: currentPolicy, startAt, endAt });
    if (+startAt < Date.now()) throw new HttpError(400, "Cannot move into the past", undefined, "POLICY_VIOLATION");
    const availability = await getResourceAvailability(tx, { resourceId: booking.resourceId, startAt, endAt, excludeBookingId: bookingId, resource });
    assertResourceAvailable(availability);
    checkLabPolicyCompliance({ policy: currentPolicy, startAt, endAt });
    const updated = await tx.booking.update({ where: { id: bookingId }, data: { startAt, endAt, checkinDeadline: null, policySnapshot: policySnapshot(currentPolicy) }, include: bookingInclude });
    await tx.usageLog.create({ data: { id: crypto.randomUUID(), resourceId: booking.resourceId, bookingId, userId: actor.id, action: "STATUS_CHANGE", message: "booking.rescheduled", reason, metadata: { previousStartAt: booking.startAt.toISOString(), previousEndAt: booking.endAt.toISOString(), startAt: startAt.toISOString(), endAt: endAt.toISOString() } } });
    await recordSystemAuditEvent(tx, { actor, action: "BOOKING_RESCHEDULED", targetType: "BOOKING", targetId: bookingId, resourceId: booking.resourceId, labId: booking.resource.laboratoryId, beforeState: { startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString() }, afterState: { startAt: startAt.toISOString(), endAt: endAt.toISOString() }, reason });
    await scheduleBookingReminders(tx, updated);
    await notifyBookingEvent(tx, updated, "RESCHEDULED", { includeOwner: true });
    return updated;
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
  expectedAuthVersion,
  reason = null,
  conditionBefore = null,
  conditionAfter = null
}) {
  const normalizedReason = normalizeText(reason);
  const normalizedConditionBefore = normalizeText(conditionBefore);
  const normalizedConditionAfter = normalizeText(conditionAfter);

  return prisma.$transaction(async (tx) => {
    await lockBookingActor(tx, actorId, actorRole, expectedAuthVersion);
    const booking = await lockBooking(tx, bookingId);

    if (!booking) throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");

    if (STAFF_OPERATION_TARGETS.has(toStatus)) {
      await assertStaffScopeInTransaction(tx, { actorId, actorRole, resource: booking.resource });
    }
    if (toStatus === CANCELLED && booking.requestedById !== actorId) {
      if (![ADMIN, LAB_STAFF].includes(actorRole)) throw new HttpError(404, 'Booking not found', undefined, 'NOT_FOUND');
      await assertStaffScopeInTransaction(tx, { actorId, actorRole, resource: booking.resource });
    }

    if (isPaymentHold(booking) && [CONFIRMED, REJECTED, CHECKED_OUT].includes(toStatus)) {
      throw new HttpError(409, 'Lịch đang chờ xác minh thanh toán.', undefined, 'BOOKING_PAYMENT_REQUIRED');
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
    let physicalStateWarningParams;

    if (toStatus === CHECKED_OUT) {
      assertHandoverWindow(booking, now);
      await assertBookingPaid(tx, booking);
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${booking.resourceId} FOR UPDATE`;
      const physical = await tx.resource.findUnique({ where: { id: booking.resourceId } });
      if (!physical) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
      await assertCareReady(tx, booking.resourceId, now);
      await assertHandoverReady(tx, booking, now);
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
        physicalStateWarningParams = { status: physical.operationalStatus };
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
      updateData.schedulingReleasedAt = now;
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
      await ensureBookingCharge(tx, result);
      await scheduleBookingReminders(tx, result, now);
    } else if (toStatus === CHECKED_OUT) {
      await cancelPendingBookingReminders(tx, booking.id, ["BOOKING_UPCOMING"]);
    } else if ([REJECTED, CANCELLED].includes(toStatus)) {
      await cancelPendingBookingReminders(tx, booking.id);
    } else if ([RETURNED, COMPLETED].includes(toStatus)) {
      await cancelPendingBookingReminders(tx, booking.id, ["RETURN_REMINDER"]);
    }

    await notifyBookingEvent(tx, result, toStatus, { includeOwner: true, now });
    return physicalStateWarning ? { ...result, physicalStateWarning, physicalStateWarningKey: "api.RETURN_RECORDED_PHYSICAL_STATE", physicalStateWarningParams } : result;
  });
}

/** Owner declaration releases the slot; staff inspection remains RETURNED -> COMPLETED. */
export async function selfReturnRoom({ bookingId, actorId, actorRole, expectedAuthVersion, conditionAfter }, db = prisma, clock = () => new Date()) {
  const condition = normalizeText(conditionAfter);
  if (!condition || condition.length > 2000) {
    throw new HttpError(400, "Vui lòng mô tả tình trạng phòng sau sử dụng (tối đa 2000 ký tự).", undefined, "VALIDATION_ERROR");
  }
  return db.$transaction(async tx => {
    await lockBookingActor(tx, actorId, actorRole, expectedAuthVersion);
    const booking = await lockBooking(tx, bookingId);
    if (!booking || booking.requestedById !== actorId) throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
    if (booking.resource.category !== "ROOM") {
      throw new HttpError(403, "Thiết bị phải được nhân viên lab tiếp nhận và kiểm tra.", undefined, "FORBIDDEN");
    }
    if ([RETURNED, COMPLETED].includes(booking.status)) {
      const previous = await tx.usageLog.findFirst({ where: { bookingId, action: "RETURN", userId: actorId, metadata: { path: ["selfReturn"], equals: true } } });
      if (previous) return booking;
    }
    if (booking.status !== CHECKED_OUT) throw new HttpError(409, "Chỉ có thể tự trả phòng đang sử dụng.", undefined, "BOOKING_INVALID_TRANSITION");
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${booking.resourceId} FOR UPDATE`;
    const physical = await tx.resource.findUniqueOrThrow({ where: { id: booking.resourceId } });
    const now = clock();
    if (physical.operationalStatus === "IN_USE") {
      await applyOperationalStatusChange(tx, {
        resourceId: booking.resourceId, operationalStatus: "AVAILABLE",
        reason: `Owner returned ROOM booking ${booking.id}`, actor: { id: actorId, role: actorRole },
        bookingId, lockResource: false
      });
    }
    // Preserve the planned interval, releasing only its scheduling hold.
    const result = await tx.booking.update({ where: { id: bookingId }, data: {
      status: RETURNED, returnedAt: now, actualEndAt: now, schedulingReleasedAt: now, returnCondition: condition
    }, include: bookingInclude });
    for (const [action, fromStatus, toStatus] of [["RETURN", CHECKED_OUT, RETURNED]]) {
      await tx.usageLog.create({ data: {
        id: crypto.randomUUID(), bookingId, resourceId: booking.resourceId, userId: actorId,
        actorType: "USER", action, fromStatus, toStatus, conditionAfter: condition,
        message: "Chủ booking tự hoàn trả phòng LAB", createdAt: now,
        metadata: { selfReturn: true, inspectionByStaff: false }
      } });
    }
    await cancelPendingBookingReminders(tx, bookingId);
    await notifyBookingEvent(tx, result, "SELF_RETURN", { includeOwner: true, now });
    return HARD_UNAVAILABLE_RESOURCE_STATES.has(physical.operationalStatus)
      ? { ...result, physicalStateWarning: `Đã ghi nhận trả phòng; tài nguyên vẫn ở trạng thái ${physical.operationalStatus}.`, physicalStateWarningKey: "api.RETURN_RECORDED_PHYSICAL_STATE", physicalStateWarningParams: { status: physical.operationalStatus } }
      : result;
  });
}

/** Returns bookings for the specified user (own bookings). */
export async function getUserBookings(userId) {
  await expirePaymentHolds(prisma, { userId });
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
export async function cancelBooking(bookingId, actorId, actorRole, reason = null, expectedAuthVersion) {
  return transitionBooking({
    bookingId,
    toStatus: CANCELLED,
    actorId,
    actorRole,
    expectedAuthVersion,
    reason: reason || "Cancelled by user"
  });
}
