import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createCharge,
  listPayments,
  bookingPayments,
  getPayment,
  initiatePayment,
  processVnpayIpn,
  paymentReceipt,
} from "../services/paymentService.js";
import { verifyVnpay } from "../services/paymentProviders.js";
import { prisma } from "../db.js";
import { config } from "../config.js";
const router = express.Router();
const route = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};
const charge = z
  .object({
    bookingId: z.string().min(1).max(100),
    amount: z.number().int().positive().max(9999999999),
    description: z.string().trim().min(3).max(500),
  })
  .strict();
const filters = z
  .object({
    bookingId: z.string().min(1).max(100).optional(),
    status: z.enum(["pending", "success", "failed", "refunded"]).optional(),
    provider: z.enum(["unselected", "vnpay", "vietqr"]).optional(),
    search: z.string().max(100).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
router.get("/vnpay/ipn", async (req, res) => {
  try {
    res.json(await processVnpayIpn(req.query));
  } catch (error) {
    const codes = {
      INVALID_SIGNATURE: "97",
      TRANSACTION_NOT_FOUND: "01",
      AMOUNT_MISMATCH: "04",
      INVALID_PROVIDER_CALLBACK: "99",
      PAYMENT_NOT_CONFIGURED: "99",
    };
    res.json({
      RspCode: codes[error.code] || "99",
      Message: codes[error.code] ? error.code : "PROVIDER_UNAVAILABLE",
    });
  }
});
// Return is presentation only. It cannot write payment status.
router.get(
  "/vnpay/return",
  route(async (req, res) => {
    verifyVnpay(req.query);
    const transaction = await prisma.paymentTransaction.findUnique({ where: { txnRef: req.query.vnp_TxnRef }, select: { bookingId: true } });
    const appOrigin = process.env.PAYMENT_APP_URL || config.corsOrigins[0];
    const target = new URL(appOrigin);
    if (!["https:", "http:"].includes(target.protocol) || (config.isProduction && target.protocol !== "https:")) {
      throw new Error("PAYMENT_APP_URL must be a valid application URL");
    }
    target.hash = transaction?.bookingId
      ? `#/workspace/thanh-toan?booking=${encodeURIComponent(transaction.bookingId)}`
      : "#/workspace/thanh-toan";
    res
      .type("html")
      .send(
        `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Quay lại lịch đặt LAB</title><main><h1>Đã trở về từ VNPAY</h1><p>Hệ thống đang chờ thông báo xác thực giao dịch. Mở lịch đặt để xem kết quả đã lưu.</p><a href="${target.toString().replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">Xem thanh toán lịch đặt</a></main></html>`,
      );
  }),
);
router.use(requireAuth);
router.post(
  "/charges",
  requireRole("ADMIN"),
  route(async (req, res) =>
    res.status(201).json(await createCharge(req.user, charge.parse(req.body))),
  ),
);
router.get(
  "/my",
  route(async (req, res) =>
    res.json(await listPayments(req.user, filters.parse(req.query))),
  ),
);
router.get(
  "/admin/transactions",
  requireRole("ADMIN"),
  route(async (req, res) =>
    res.json(await listPayments(req.user, filters.parse(req.query), true)),
  ),
);
router.get(
  "/booking/:bookingId",
  route(async (req, res) =>
    res.json(await bookingPayments(req.params.bookingId, req.user)),
  ),
);
router.get(
  "/:id/receipt",
  route(async (req, res) =>
    res.json(await paymentReceipt(req.params.id, req.user)),
  ),
);
router.get(
  "/:id",
  route(async (req, res) =>
    res.json(await getPayment(req.params.id, req.user)),
  ),
);
for (const provider of ["vnpay", "vietqr"])
  router.post(
    `/:id/${provider}`,
    route(async (req, res) => {
      z.object({})
        .strict()
        .parse(req.body || {});
      res.json(
        await initiatePayment(req.params.id, req.user, provider, req.ip),
      );
    }),
  );
export default router;
