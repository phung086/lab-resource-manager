import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { bookingTransitions } from "../metrics.js";
import { assertResourceAvailable, getResourceAvailability, buildBlockingIntervals } from "../services/availabilityService.js";
import { assertUserEligible, checkUserEligibility } from "../services/eligibilityService.js";
import { findAlternativeSlots, findAlternativeEquipment } from "../services/alternativeService.js";
import {
  bookingStatuses,
  normalizeMultilineText,
  normalizeSearchQuery,
  normalizeText,
  optionalNormalizedText,
  serializeBooking
} from "../utils/dataContract.js";
import { notify, notifyAdminsAndStaff } from "../utils/notifications.js";
import { sendBookingStatusEmail } from "../services/emailService.js";

const router = express.Router();

const MIN_BOOKING_MINUTES = 15;
const MAX_BOOKING_MINUTES = 14 * 24 * 60;
const CHECKOUT_EARLY_WINDOW_MINUTES = 30;
const emptyToUndefined = (schema) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const normalizedText = (min, max) => z.string().transform(normalizeText).refine((value) => value.length >= min && value.length <= max);
const normalizedMultilineText = (min, max) => z.string().transform(normalizeMultilineText).refine((value) => value.length >= min && value.length <= max);
const optionalNote = (max) => z.preprocess((value) => optionalNormalizedText(value), z.string().max(max).optional());
const dateQuery = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.date().optional());
const booleanQuery = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}, z.boolean().optional());

const createBookingSchema = z.object({
  resourceId: z.string().uuid(),
  title: normalizedText(3, 255),
  purpose: normalizedMultilineText(10, 4000),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  notes: optionalNote(1000)
});

const decisionSchema = z.object({
  notes: optionalNote(1000)
});

const rejectionSchema = z.object({
  notes: normalizedMultilineText(3, 1000)
});

const conditionSchema = z.object({
  condition: normalizedMultilineText(3, 1000)
});

const bookingListQuerySchema = z.object({
  status: emptyToUndefined(z.enum(bookingStatuses)),
  mine: booleanQuery,
  from: dateQuery,
  to: dateQuery,
  search: z.string().optional().transform((value) => normalizeSearchQuery(value))
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { status, mine, from, to, search } = bookingListQuerySchema.parse(req.query);
    if (from && to && from > to) {
      throw new HttpError(400, "Date range is invalid", undefined, "INVALID_DATE_RANGE");
    }

    const where = {
      ...(status ? { status } : {}),
      ...(mine ? { requestedById: req.user.id } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { purpose: { contains: search, mode: "insensitive" } },
              { resource: { is: { code: { contains: search, mode: "insensitive" } } } },
              { resource: { is: { name: { contains: search, mode: "insensitive" } } } }
            ]
          }
        : {})
    };

    if (!["admin", "lab_staff"].includes(req.user.role) && !mine) {
      where.requestedById = req.user.id;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        resource: true,
        requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { startAt: "asc" }
    });
    res.json(bookings.map((booking) => serializeBooking(booking)));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    validateBookingWindow(data.startAt, data.endAt);

    // Kiểm tra idempotency key (blueprint §7.4)
    if (data.idempotencyKey) {
      const existing = await prisma.booking.findUnique({ where: { idempotencyKey: data.idempotencyKey }, include: bookingInclude });
      if (existing) {
        return res.status(200).json({ ...serializeBooking(existing), _replayed: true });
      }
    }

    let resourceForNotification = null;
    const booking = await prisma.$transaction(async (tx) => {
      // Row-level lock — serialize concurrent booking requests cho cùng resource
      await tx.$queryRaw`
        SELECT 1 FROM resources WHERE id = ${data.resourceId}::uuid FOR UPDATE
      `;
      const resource = await tx.resource.findUnique({ where: { id: data.resourceId } });
      if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");

      // Kiểm tra eligibility / training (blueprint §10)
      const eligibility = await checkUserEligibility(req.user.id, data.resourceId, tx);
      assertUserEligible(eligibility);

      // Kiểm tra availability + conflict (blueprint §7)
      const availability = await getResourceAvailability(tx, {
        resourceId: data.resourceId,
        startAt: data.startAt,
        endAt: data.endAt,
        resource
      });
      assertResourceAvailable(availability);

      resourceForNotification = resource;
      const status = resource.requiresApproval ? "pending" : "approved";
      const durationMinutes = Math.round((data.endAt.getTime() - data.startAt.getTime()) / 60_000);
      // checkin deadline = startAt + checkInGraceMinutes từ lab policy (default 20)
      const checkinDeadline = new Date(data.startAt.getTime() + 20 * 60_000);

      return tx.booking.create({
        data: {
          resourceId: data.resourceId,
          title: data.title,
          purpose: data.purpose,
          startAt: data.startAt,
          endAt: data.endAt,
          notes: data.notes,
          status,
          requestedById: req.user.id,
          checkinDeadline,
          ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
          usageLogs: {
            create: {
              resourceId: data.resourceId,
              userId: req.user.id,
              action: "request",
              message: "booking.request.created",
              messageKey: "request",
              messageParams: { title: data.title, resource: resource.code }
            }
          }
        },
        include: bookingInclude
      });
    });

    await sendNotificationSafely(() => Promise.all([
      notify(req.user.id, "bookingCreated", "bookingCreated", "success", { resource: resourceForNotification.name, title: booking.title }),
      notifyAdminsAndStaff("newBookingRequest", "newBookingRequest", "warning", { user: req.user.fullName, resource: resourceForNotification.name })
    ]));

    res.status(201).json(serializeBooking(booking));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/approve", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = decisionSchema.parse(req.body);
    const booking = await getBooking(req.params.id);
    ensureOperatorIsNotRequester(booking, req.user);

    const updated = await prisma.$transaction(async (tx) => {
      // Lock booking row to prevent concurrent approve/reject/cancel
      const [locked] = await tx.$queryRaw`
        SELECT status FROM bookings WHERE id = ${booking.id}::uuid FOR UPDATE
      `;
      if (!locked || locked.status !== 'pending') {
        throw new HttpError(409, "Only pending bookings can be approved", undefined, "BOOKING_PENDING_APPROVAL_ONLY");
      }

      // Also lock resource to prevent concurrent booking creation
      await tx.$queryRaw`
        SELECT 1 FROM resources WHERE id = ${booking.resourceId}::uuid FOR UPDATE
      `;

      const availability = await getResourceAvailability(tx, {
        resourceId: booking.resourceId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        excludeBookingId: booking.id,
        resource: booking.resource
      });
      assertResourceAvailable(availability);

      const saved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "approved", approvedById: req.user.id, notes: data.notes },
        include: bookingInclude
      });
      await tx.usageLog.create({
        data: {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          userId: req.user.id,
          action: "approve",
          message: "booking.approved",
          messageKey: "approve",
          messageParams: { title: booking.title, resource: booking.resource.code }
        }
      });
      return saved;
    });
    bookingTransitions.inc({ transition: "approve" });
    await sendNotificationSafely(() => Promise.all([
      notify(booking.requestedById, "bookingApproved", "bookingApproved", "success", { resource: booking.resource.name, title: booking.title }),
      sendBookingStatusEmail({
        userEmail: booking.requestedBy.email,
        userName: booking.requestedBy.fullName,
        bookingTitle: booking.title,
        resourceName: booking.resource.name,
        status: "approved",
        startAt: booking.startAt,
        endAt: booking.endAt
      })
    ]));
    res.json(serializeBooking(updated));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reject", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = rejectionSchema.parse(req.body);
    const booking = await getBooking(req.params.id);
    ensureOperatorIsNotRequester(booking, req.user);

    const updated = await prisma.$transaction(async (tx) => {
      // Lock booking row to prevent concurrent status changes
      const [locked] = await tx.$queryRaw`
        SELECT status FROM bookings WHERE id = ${booking.id}::uuid FOR UPDATE
      `;
      if (!locked || locked.status !== 'pending') {
        throw new HttpError(409, "Only pending bookings can be rejected", undefined, "BOOKING_PENDING_REJECTION_ONLY");
      }

      const saved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "rejected", approvedById: req.user.id, notes: data.notes },
        include: bookingInclude
      });
      await tx.usageLog.create({
        data: {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          userId: req.user.id,
          action: "reject",
          message: "booking.rejected",
          messageKey: "reject",
          messageParams: { title: booking.title, resource: booking.resource.code }
        }
      });
      return saved;
    });
    bookingTransitions.inc({ transition: "reject" });
    await sendNotificationSafely(() => Promise.all([
      notify(booking.requestedById, "bookingRejected", "bookingRejected", "danger", { reason: data.notes || booking.title }),
      sendBookingStatusEmail({
        userEmail: booking.requestedBy.email,
        userName: booking.requestedBy.fullName,
        bookingTitle: booking.title,
        resourceName: booking.resource.name,
        status: "rejected",
        startAt: booking.startAt,
        endAt: booking.endAt,
        reason: data.notes
      })
    ]));
    res.json(serializeBooking(updated));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/check-out", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = conditionSchema.parse(req.body);
    const booking = await getBooking(req.params.id);
    ensureOperatorIsNotRequester(booking, req.user);
    ensureCheckoutWindow(booking);

    const updated = await prisma.$transaction(async (tx) => {
      // Lock booking row to prevent concurrent check-out
      const [locked] = await tx.$queryRaw`
        SELECT status FROM bookings WHERE id = ${booking.id}::uuid FOR UPDATE
      `;
      if (!locked || locked.status !== 'approved') {
        throw new HttpError(409, "Only approved bookings can be checked out", undefined, "BOOKING_APPROVED_CHECKOUT_ONLY");
      }

      const saved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "checked_out", handoverCondition: data.condition },
        include: bookingInclude
      });
      await tx.resource.update({ where: { id: booking.resourceId }, data: { status: "in_use" } });
      await tx.usageLog.create({
        data: {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          userId: req.user.id,
          action: "check_out",
          message: "booking.checked_out",
          messageKey: "check_out",
          messageParams: { title: booking.title, resource: booking.resource.code },
          conditionBefore: data.condition
        }
      });
      return saved;
    });

    bookingTransitions.inc({ transition: "check_out" });
    await sendNotificationSafely(() => notify(booking.requestedById, "resourceCheckedOut", "resourceCheckedOut", "info", { resource: booking.resource.name }));
    res.json(serializeBooking(updated));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/check-in", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = conditionSchema.parse(req.body);
    const booking = await getBooking(req.params.id);
    ensureOperatorIsNotRequester(booking, req.user);

    const updated = await prisma.$transaction(async (tx) => {
      // Lock booking row to prevent concurrent check-in
      const [locked] = await tx.$queryRaw`
        SELECT status FROM bookings WHERE id = ${booking.id}::uuid FOR UPDATE
      `;
      if (!locked || locked.status !== 'checked_out') {
        throw new HttpError(409, "Only checked-out bookings can be checked in", undefined, "BOOKING_CHECKED_OUT_CHECKIN_ONLY");
      }

      const saved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "completed", returnCondition: data.condition },
        include: bookingInclude
      });
      await tx.resource.update({ where: { id: booking.resourceId }, data: { status: "available" } });
      await tx.usageLog.create({
        data: {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          userId: req.user.id,
          action: "check_in",
          message: "booking.checked_in",
          messageKey: "check_in",
          messageParams: { title: booking.title, resource: booking.resource.code },
          conditionAfter: data.condition
        }
      });
      return saved;
    });

    bookingTransitions.inc({ transition: "check_in" });
    await sendNotificationSafely(() => notify(booking.requestedById, "bookingReturned", "bookingReturned", "success", { resource: booking.resource.name }));
    res.json(serializeBooking(updated));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const data = decisionSchema.parse(req.body);
    const booking = await getBooking(req.params.id);
    const isRequester = booking.requestedById === req.user.id;
    const isOperator = ["admin", "lab_staff"].includes(req.user.role);
    if (!isRequester && !isOperator) {
      throw new HttpError(403, "Only the requester or lab staff can cancel this booking", undefined, "BOOKING_CANCEL_FORBIDDEN");
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Lock booking row to prevent concurrent cancel/approve/reject
      const [locked] = await tx.$queryRaw`
        SELECT status FROM bookings WHERE id = ${booking.id}::uuid FOR UPDATE
      `;
      if (!locked || !['pending', 'approved'].includes(locked.status)) {
        throw new HttpError(409, "Only pending or approved bookings can be cancelled", undefined, "BOOKING_CANCEL_ACTIVE_ONLY");
      }

      const saved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled", notes: data.notes },
        include: bookingInclude
      });
      await tx.usageLog.create({
        data: {
          resourceId: booking.resourceId,
          bookingId: booking.id,
          userId: req.user.id,
          action: "status_change",
          message: "booking.cancelled",
          messageKey: "cancel",
          messageParams: { title: booking.title, resource: booking.resource.code }
        }
      });
      return saved;
    });
    bookingTransitions.inc({ transition: "cancel" });

    if (isRequester) {
      await sendNotificationSafely(() => notifyAdminsAndStaff("bookingCancelled", "bookingCancelled", "info", { user: req.user.fullName, resource: booking.resource.name, title: booking.title }));
    } else {
      await sendNotificationSafely(() => notify(booking.requestedById, "bookingCancelled", "bookingCancelled", "warning", { user: req.user.fullName, resource: booking.resource.name, title: booking.title }));
    }

    res.json(serializeBooking(updated));
  } catch (error) {
    next(error);
  }
});

// ─── GET /bookings/:id/conflicts ─────────────────────────────────────────────
// Blueprint §6.4: trả về Conflict Object chi tiết
router.get("/:id/conflicts", async (req, res, next) => {
  try {
    const booking = await getBooking(req.params.id);
    ensureCanViewBooking(booking, req.user);

    const resource = await prisma.resource.findUnique({ where: { id: booking.resourceId } });
    const availability = await getResourceAvailability(prisma, {
      resourceId: booking.resourceId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      excludeBookingId: booking.id,
      resource
    });

    const eligibility = await checkUserEligibility(booking.requestedById, booking.resourceId);

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        available: availability.available && eligibility.eligible,
        conflicts: [
          ...availability.conflicts,
          ...eligibility.conflicts
        ],
        warnings: eligibility.warnings,
        unavailableIntervals: availability.unavailableIntervals
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /bookings/:id/alternatives ─────────────────────────────────────────
// Blueprint §9: tìm slot và thiết bị thay thế
router.get("/:id/alternatives", async (req, res, next) => {
  try {
    const booking = await getBooking(req.params.id);
    ensureCanViewBooking(booking, req.user);

    const durationMinutes = Math.round(
      (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60_000
    );

    const [alternativeSlots, alternativeEquipment] = await Promise.all([
      findAlternativeSlots(prisma, {
        resourceId: booking.resourceId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        durationMinutes
      }),
      findAlternativeEquipment(prisma, {
        resourceId: booking.resourceId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        durationMinutes
      })
    ]);

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        alternativeSlots,
        alternativeEquipment
      }
    });
  } catch (error) {
    next(error);
  }
});

const bookingInclude = {
  resource: true,
  requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
  approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
};

async function getBooking(id) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new HttpError(404, "Booking not found", undefined, "BOOKING_NOT_FOUND");
  return booking;
}

function validateBookingWindow(startAt, endAt) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new HttpError(400, "Booking time is invalid", undefined, "INVALID_BOOKING_TIME");
  }
  if (startAt >= endAt) {
    throw new HttpError(400, "Start time must be before end time", undefined, "INVALID_BOOKING_TIME");
  }
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
  if (durationMinutes < MIN_BOOKING_MINUTES) {
    throw new HttpError(400, "Booking duration is too short", undefined, "BOOKING_DURATION_TOO_SHORT");
  }
  if (durationMinutes > MAX_BOOKING_MINUTES) {
    throw new HttpError(400, "Booking duration is too long", undefined, "BOOKING_DURATION_TOO_LONG");
  }
}

function ensureOperatorIsNotRequester(booking, user) {
  if (booking.requestedById === user.id) {
    throw new HttpError(403, "The requester cannot approve, hand over, or receive back their own booking", undefined, "BOOKING_SELF_SERVICE_FORBIDDEN");
  }
}

function ensureCheckoutWindow(booking, now = new Date()) {
  const startAt = new Date(booking.startAt);
  const endAt = new Date(booking.endAt);
  const earliestCheckout = new Date(startAt.getTime() - CHECKOUT_EARLY_WINDOW_MINUTES * 60_000);
  if (now < earliestCheckout) {
    throw new HttpError(409, "Resource handover is too early for the approved booking window", {
      earliestCheckoutAt: earliestCheckout.toISOString()
    }, "BOOKING_CHECKOUT_TOO_EARLY");
  }
  if (now > endAt) {
    throw new HttpError(409, "The approved booking window has expired before handover", undefined, "BOOKING_CHECKOUT_WINDOW_EXPIRED");
  }
}

function ensureCanViewBooking(booking, user) {
  const isStaff = ["admin", "lab_staff"].includes(user.role);
  if (!isStaff && booking.requestedById !== user.id) {
    throw new HttpError(403, "Access forbidden", undefined, "AUTH_FORBIDDEN");
  }
}

async function sendNotificationSafely(task) {
  try {
    await task();
  } catch (error) {
    console.error("Notification delivery failed after booking mutation", error);
  }
}

export default router;
