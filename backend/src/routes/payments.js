import express from "express";
import { getTransactionsLedger, getVietQrData, mockConfirmPayment } from "../services/paymentService.js";

const router = express.Router();

// GET /vietqr/:booking_id - VietQR Napas 24/7 payment information
router.get("/vietqr/:booking_id", async (req, res, next) => {
  try {
    const data = await getVietQrData(req.params.booking_id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /mock-confirm/:booking_id - Simulate instant payment callback from bank
router.post("/mock-confirm/:booking_id", async (req, res, next) => {
  try {
    const result = await mockConfirmPayment(req.params.booking_id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/transactions - Revenue ledger & transaction records
router.get("/admin/transactions", async (_req, res, next) => {
  try {
    const ledger = await getTransactionsLedger();
    res.json(ledger);
  } catch (error) {
    next(error);
  }
});

// GET /transactions - Alias for admin ledger
router.get("/transactions", async (_req, res, next) => {
  try {
    const ledger = await getTransactionsLedger();
    res.json(ledger);
  } catch (error) {
    next(error);
  }
});

export default router;
