import express from "express";
import { getTransactionsLedger, getVietQrData, mockConfirmPayment } from "../services/paymentService.js";
import { config } from "../config.js";
import { ADMIN } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertBookingAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";

const router = express.Router();

// GET /vietqr/:booking_id - VietQR Napas 24/7 payment information
router.get("/vietqr/:booking_id", requireAuth, async (req, res, next) => {
  try {
    await assertBookingAccess(req.user, req.params.booking_id);
    const data = await getVietQrData(req.params.booking_id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /mock-confirm/:booking_id - Simulate instant payment callback from bank
router.post("/mock-confirm/:booking_id", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    if (config.isProduction) {
      throw new HttpError(404, "Route not found", undefined, "NOT_FOUND");
    }
    const result = await mockConfirmPayment(req.params.booking_id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/transactions - Revenue ledger & transaction records
router.get("/admin/transactions", requireAuth, requireRole(ADMIN), async (_req, res, next) => {
  try {
    const ledger = await getTransactionsLedger();
    res.json(ledger);
  } catch (error) {
    next(error);
  }
});

// GET /transactions - Alias for admin ledger
router.get("/transactions", requireAuth, requireRole(ADMIN), async (_req, res, next) => {
  try {
    const ledger = await getTransactionsLedger();
    res.json(ledger);
  } catch (error) {
    next(error);
  }
});

export default router;
