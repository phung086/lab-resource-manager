/**
 * Payments Router — VNPay & PayOS Integration
 *
 * POST /payments/vnpay/create-url
 * GET  /payments/vnpay/return
 * GET  /payments/vnpay/ipn
 * GET  /payments/history
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { createVnPayPaymentUrl, verifyVnPayReturn } from "../services/vnpayService.js";

const router = express.Router();

const createPaymentSchema = z.object({
  bookingId: z.string().uuid().optional(),
  amount: z.number().positive(),
  orderInfo: z.string().max(255).optional(),
  bankCode: z.string().max(20).optional()
});

// ─── Generate VNPay Payment URL ──────────────────────────────────────────────

router.post("/vnpay/create-url", requireAuth, async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    const result = await createVnPayPaymentUrl({
      bookingId: data.bookingId,
      userId: req.user.id,
      amount: data.amount,
      orderInfo: data.orderInfo,
      ipAddr,
      bankCode: data.bankCode
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── VNPay Return URL (User Redirect) ─────────────────────────────────────────

router.get("/vnpay/return", async (req, res, next) => {
  try {
    const verification = await verifyVnPayReturn(req.query);

    if (req.accepts("html")) {
      const redirectUrl = `${process.env.VITE_APP_URL || "http://localhost:5173"}?paymentStatus=${verification.isSuccess ? "success" : "failed"}&txnRef=${verification.txnRef}`;
      return res.redirect(redirectUrl);
    }

    res.json({
      success: verification.isSuccess,
      data: verification
    });
  } catch (error) {
    next(error);
  }
});

// ─── VNPay IPN Webhook (Server-to-Server Confirmation) ───────────────────────

router.get("/vnpay/ipn", async (req, res) => {
  try {
    const verification = await verifyVnPayReturn(req.query);

    if (!verification.isValidChecksum) {
      return res.json({ RspCode: "97", Message: "Invalid Checksum" });
    }

    if (!verification.transaction) {
      return res.json({ RspCode: "01", Message: "Order Not Found" });
    }

    res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    res.json({ RspCode: "99", Message: "Unknown Error" });
  }
});

// ─── User Payment History ─────────────────────────────────────────────────────

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const isStaff = ["admin", "lab_staff"].includes(req.user.role);
    const where = isStaff ? {} : { userId: req.user.id };

    const payments = await prisma.paymentTransaction.findMany({
      where,
      include: {
        booking: { select: { id: true, title: true, bookingCode: true } },
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
});

export default router;
