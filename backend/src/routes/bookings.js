import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertBookingAccess, assertLabStaffResourceAccess, requireBookingLabAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import {
  cancelBooking,
  createBooking,
  getUserBookings,
  transitionBooking
} from "../services/bookingService.js";
import { getResourceAvailability } from "../services/availabilityService.js";
import { ADMIN, LAB_STAFF, STAFF_ROLES } from "../constants/roles.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";

const router = express.Router();

const createBookingSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(2).max(255),
  purpose: z.string().max(2000).optional().default(""),
  startAt: z.string().or(z.date()),
  endAt: z.string().or(z.date())
}).strict();

const transitionSchema = z.object({
  reason: z.string().max(1000).optional(),
  conditionBefore: z.string().max(2000).optional(),
  conditionAfter: z.string().max(2000).optional()
}).strict();

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
      include: {
        resource: true,
        requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { startAt: "desc" },
      take: 50
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
    if (start >= end) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "startAt must be before endAt" }
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

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    await assertBookingAccess(req.user, req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        resource: true,
        requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
      }
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
      startAt: data.startAt,
      endAt: data.endAt
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/approve - PENDING_APPROVAL → CONFIRMED
router.post("/:id/approve", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = transitionSchema.parse(req.body || {});
    const booking = await transitionBooking({
      bookingId: req.params.id,
      toStatus: "CONFIRMED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/reject - PENDING_APPROVAL → REJECTED
router.post("/:id/reject", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = transitionSchema.parse(req.body || {});
    const booking = await transitionBooking({
      bookingId: req.params.id,
      toStatus: "REJECTED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason: reason || "Rejected by operator"
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/check-out - CONFIRMED → CHECKED_OUT
router.post("/:id/check-out", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason, conditionBefore } = transitionSchema.parse(req.body || {});
    const booking = await transitionBooking({
      bookingId: req.params.id,
      toStatus: "CHECKED_OUT",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason,
      conditionBefore
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/return - CHECKED_OUT → RETURNED
router.post("/:id/return", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason, conditionAfter } = transitionSchema.parse(req.body || {});
    const booking = await transitionBooking({
      bookingId: req.params.id,
      toStatus: "RETURNED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason,
      conditionAfter
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/complete - RETURNED → COMPLETED
router.post("/:id/complete", requireAuth, requireRole(ADMIN, LAB_STAFF), requireBookingLabAccess(), async (req, res, next) => {
  try {
    const { reason } = transitionSchema.parse(req.body || {});
    const booking = await transitionBooking({
      bookingId: req.params.id,
      toStatus: "COMPLETED",
      actorId: req.user.id,
      actorRole: req.user.role,
      reason
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /:id/cancel - Cancel booking
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const { reason } = transitionSchema.parse(req.body || {});
    const booking = await cancelBooking(req.params.id, req.user.id, req.user.role, reason);
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

export default router;
