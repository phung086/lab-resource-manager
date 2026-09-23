import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertBookingAccess, assertLabStaffResourceAccess, requireBookingLabAccess } from "../middleware/labScope.js";
import {
  cancelBooking,
  createBooking,
  getUserBookings,
  selfReturnRoom,
  transitionBooking
} from "../services/bookingService.js";
import { getResourceAvailability } from "../services/availabilityService.js";
import { ADMIN, LAB_STAFF, STAFF_ROLES } from "../constants/roles.js";

const router = express.Router();

const createBookingSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(2).max(255),
  purpose: z.string().max(2000).optional().default(""),
  purposeCode: z.enum(["STUDY", "TEACHING", "RESEARCH", "SERVICE"]).optional(),
  acceptedQuote: z.object({ amountVnd: z.number().int().min(0), version: z.number().int().min(0) }).strict().optional(),
  startAt: z.string().or(z.date()),
  endAt: z.string().or(z.date())
}).strict();

const optionalReason = z.string().trim().max(1000).optional().transform((value) => value || undefined);
const approveSchema = z.object({ reason: optionalReason }).strict();
// Evidence fields stay syntactically bounded here but are semantically required
// inside transitionBooking *after* current-state validation. This preserves a
// stable 409 BOOKING_INVALID_TRANSITION for illegal state changes, while valid
// transitions with missing/blank evidence still fail 400 VALIDATION_ERROR.
const optionalEvidence = (max) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const rejectSchema = z.object({ reason: optionalEvidence(1000) }).strict();
const checkOutSchema = z.object({
  reason: optionalReason,
  conditionBefore: optionalEvidence(2000)
}).strict();
const returnSchema = z.object({
  reason: optionalReason,
  conditionAfter: optionalEvidence(2000)
}).strict();
const completeSchema = z.object({ reason: optionalReason }).strict();
const cancelSchema = z.object({ reason: optionalReason }).strict();
const selfReturnSchema = z.object({ conditionAfter: z.string().trim().min(1).max(2000) }).strict();

const bookingInclude = {
  resource: {
    include: {
      laboratory: { select: { id: true, code: true, name: true } }
    }
  },
  requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
  approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
};

// GET / - List bookings with optional filters
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { resourceId, status } = req.query;

    let scopeWhere = {};
    if (req.user.role === LAB_STAFF) {
      if (resourceId) {
        await assertLabStaffResourceAccess(req.user.id, String(resourceId));
      }
      const assignments = await prisma.userLabAssignment.findMany({
        where: { userId: req.user.id },
        select: { laboratoryId: true }
      });
      scopeWhere = {
        resource: {
          laboratoryId: { in: assignments.map((assignment) => assignment.laboratoryId) }
        }
      };
    } else if (!STAFF_ROLES.includes(req.user.role)) {
      scopeWhere = { requestedById: req.user.id };
    }

    const where = {
      ...(resourceId ? { resourceId: String(resourceId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...scopeWhere
    };

    const bookings = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
      take: 100
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// GET /my-bookings - List current user's bookings
router.get("/my-bookings", requireAuth, async (req, res, next) => {
  try {
    const bookings = await getUserBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// GET /availability - Pre-check availability for a resource and time window
router.get("/availability", requireAuth, async (req, res, next) => {
  try {
    const { resourceId, startAt, endAt } = req.query;
    if (!resourceId || !startAt || !endAt) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "resourceId, startAt, and endAt are required" }
      });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "startAt must be a valid timestamp before endAt" }
      });
    }

    const availability = await getResourceAvailability(prisma, {
      resourceId: String(resourceId),
      startAt: start,
      endAt: end
    });

    res.json(availability);
  } catch (error) {
    next(error);
  }
});

// GET /:id/history - Persisted booking workflow timeline only.
router.get("/:id/history", requireAuth, async (req, res, next) => {
  try {
    await assertBookingAccess(req.user, req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude
    });
    if (!booking) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
    }

    const rows = await prisma.usageLog.findMany({
      where: { bookingId: booking.id },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });

    res.json({
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        resourceId: booking.resourceId,
        requestedById: booking.requestedById,
        approvedById: booking.approvedById,
        title: booking.title,
        purpose: booking.purpose,
        status: booking.status,
        resource: booking.resource,
        requestedBy: booking.requestedBy,
        approvedBy: booking.approvedBy,
        startAt: booking.startAt,
        endAt: booking.endAt,
        approvedAt: booking.approvedAt,
        actualStartAt: booking.actualStartAt,
        actualEndAt: booking.actualEndAt,
        returnedAt: booking.returnedAt,
        completedAt: booking.completedAt,
        handoverCondition: booking.handoverCondition,
        returnCondition: booking.returnCondition
      },
      timeline: rows.map((row) => ({
        id: row.id,
        bookingId: row.bookingId,
        action: row.action,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        reason: row.reason,
        conditionBefore: row.conditionBefore,
        conditionAfter: row.conditionAfter,
        actor: row.user,
        metadata: row.metadata || {},
        createdAt: row.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    await assertBookingAccess(req.user, req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST / - Create a new booking
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await createBooking({
      requestedById: req.user.id,
      resourceId: data.resourceId,
      title: data.title,
      purpose: data.purpose,
      purposeCode: data.purposeCode,
      acceptedQuote: data.acceptedQuote,
      startAt: data.startAt,
      endAt: data.endAt
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/self-return", requireAuth, async (req, res, next) => {
  try {
    const data = selfReturnSchema.parse(req.body);
    res.json(await selfReturnRoom({ bookingId: req.params.id, actorId: req.user.id, actorRole: req.user.role, ...data }));
  } catch (error) { next(error); }
});

// PENDING_APPROVAL -> CONFIRMED
router.post("/:id/approve", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = approveSchema.parse(req.body || {});
    res.json(await transitionBooking({
      bookingId: req.params.id,
      toStatus: "CONFIRMED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason
    }));
  } catch (error) { next(error); }
});

// PENDING_APPROVAL -> REJECTED
router.post("/:id/reject", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = rejectSchema.parse(req.body || {});
    res.json(await transitionBooking({
      bookingId: req.params.id,
      toStatus: "REJECTED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason
    }));
  } catch (error) { next(error); }
});

// CONFIRMED -> CHECKED_OUT
router.post("/:id/check-out", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason, conditionBefore } = checkOutSchema.parse(req.body || {});
    res.json(await transitionBooking({
      bookingId: req.params.id,
      toStatus: "CHECKED_OUT",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason,
      conditionBefore
    }));
  } catch (error) { next(error); }
});

// CHECKED_OUT -> RETURNED
router.post("/:id/return", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason, conditionAfter } = returnSchema.parse(req.body || {});
    res.json(await transitionBooking({
      bookingId: req.params.id,
      toStatus: "RETURNED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason,
      conditionAfter
    }));
  } catch (error) { next(error); }
});

// RETURNED -> COMPLETED
router.post("/:id/complete", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = completeSchema.parse(req.body || {});
    res.json(await transitionBooking({
      bookingId: req.params.id,
      toStatus: "COMPLETED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason
    }));
  } catch (error) { next(error); }
});

router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const { reason } = cancelSchema.parse(req.body || {});
    res.json(await cancelBooking(req.params.id, req.user.id, req.user.role, reason));
  } catch (error) { next(error); }
});

export default router;
