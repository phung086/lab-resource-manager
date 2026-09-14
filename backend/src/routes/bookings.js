import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { cancelBooking, checkinBooking, createBooking, getUserBookings } from "../services/bookingService.js";

const router = express.Router();

const createBookingSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(2).max(255),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  attendeesCount: z.number().int().positive().optional().default(1)
});

const checkinSchema = z.object({
  checkinCode: z.string().optional()
});

// GET / - List bookings with optional user filter
router.get("/", async (req, res, next) => {
  try {
    const { resourceId, status } = req.query;
    const bookings = await prisma.booking.findMany({
      where: {
        ...(resourceId ? { resourceId: String(resourceId) } : {}),
        ...(status ? { status: String(status).toUpperCase() } : {})
      },
      include: {
        resource: true,
        user: { select: { id: true, fullName: true, email: true, role: true } },
        transactions: true
      },
      orderBy: { startTime: "desc" },
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

// POST / - Create a new booking
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await createBooking({
      userId: req.user.id,
      resourceId: data.resourceId,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      attendeesCount: data.attendeesCount
    });

    res.status(201).json({
      success: true,
      message: "Tạo ca đặt chỗ thành công. Vui lòng thanh toán VietQR để hoàn tất.",
      booking
    });
  } catch (error) {
    next(error);
  }
});

// POST /:id/checkin - Optical QR Code Check-in
router.post("/:id/checkin", async (req, res, next) => {
  try {
    const { checkinCode } = checkinSchema.parse(req.body || {});
    const booking = await checkinBooking(req.params.id, checkinCode);

    res.json({
      success: true,
      message: "Xác thực mã QR Check-in thành công. Bạn được cộng +2 điểm tín nhiệm cá nhân!",
      booking
    });
  } catch (error) {
    next(error);
  }
});

// POST /:id/cancel - Cancel booking
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const isAdmin = ["admin", "ADMIN"].includes(req.user.role);
    const booking = await cancelBooking(req.params.id, req.user.id, isAdmin);

    res.json({
      success: true,
      message: "Đã hủy ca đặt chỗ thành công.",
      booking
    });
  } catch (error) {
    next(error);
  }
});

export default router;
