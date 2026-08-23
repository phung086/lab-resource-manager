/**
 * Shipments Router — Giao Hàng Nhanh (GHN Express) Integration
 *
 * POST /shipments/ghn/create-order
 * GET  /shipments/ghn/track/:trackingCode
 * GET  /shipments/history
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createGhnShipment, trackGhnShipment } from "../services/ghnService.js";

const router = express.Router();
router.use(requireAuth);

const createShipmentSchema = z.object({
  bookingId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  recipientName: z.string().min(2).max(100),
  recipientPhone: z.string().min(8).max(20),
  recipientAddress: z.string().min(5).max(500),
  senderAddress: z.string().max(500).optional()
});

// ─── Create GHN Delivery Order ────────────────────────────────────────────────

router.post("/ghn/create-order", async (req, res, next) => {
  try {
    const data = createShipmentSchema.parse(req.body);

    const result = await createGhnShipment({
      bookingId: data.bookingId,
      resourceId: data.resourceId,
      userId: req.user.id,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientAddress: data.recipientAddress,
      senderAddress: data.senderAddress
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── Track Shipment Order ─────────────────────────────────────────────────────

router.get("/ghn/track/:trackingCode", async (req, res, next) => {
  try {
    const shipment = await trackGhnShipment(req.params.trackingCode);
    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment order not found" });
    }
    res.json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
});

// ─── User Shipment History ────────────────────────────────────────────────────

router.get("/history", async (req, res, next) => {
  try {
    const isStaff = ["admin", "lab_staff"].includes(req.user.role);
    const where = isStaff ? {} : { userId: req.user.id };

    const shipments = await prisma.shipmentOrder.findMany({
      where,
      include: {
        resource: { select: { id: true, code: true, name: true } },
        booking: { select: { id: true, title: true, bookingCode: true } },
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: shipments });
  } catch (error) {
    next(error);
  }
});

export default router;
