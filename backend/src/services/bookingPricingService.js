import crypto from "node:crypto";
import { HttpError } from "../middleware/errors.js";
import { config } from "../config.js";

export const PURPOSE_CODES = ["STUDY", "TEACHING", "RESEARCH", "SERVICE"];

export async function quoteBooking(tx, { resourceId, purposeCode, startAt, endAt }) {
  const resource = await tx.resource.findUnique({ where: { id: resourceId }, select: { id: true } });
  if (!resource) throw new HttpError(404, "Không tìm thấy tài nguyên.", undefined, "NOT_FOUND");
  const rules = await tx.resourcePricingRule.findMany({ where: { resourceId } });
  if (!rules.length) return { amountVnd: 0, currency: "VND", purposeCode: purposeCode || null, version: 0, hourlyRateVnd: 0, label: "Miễn phí", minutes: null };
  const rule = rules.find(row => row.purposeCode === purposeCode);
  if (!rule) throw new HttpError(400, "Vui lòng chọn mục đích có trong bảng giá của tài nguyên.", undefined, "PRICING_PURPOSE_REQUIRED");
  const duration = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(duration) || duration <= 0 || duration % 60000 !== 0) throw new HttpError(400, "Khung giờ tính phí phải hợp lệ và tròn phút.", undefined, "VALIDATION_ERROR");
  const minutes = duration / 60000;
  const amountVnd = Math.ceil(rule.hourlyRateVnd * minutes / 60);
  if (!Number.isSafeInteger(amountVnd) || amountVnd > 2000000000) throw new HttpError(400, "Số tiền vượt giới hạn booking.", undefined, "VALIDATION_ERROR");
  if (amountVnd > 0 && !config.paymentsEnabled) throw new HttpError(503, "Tài nguyên có thu phí nhưng thanh toán chưa được bật. Vui lòng liên hệ cán bộ lab.", undefined, "PAYMENT_NOT_CONFIGURED");
  return { amountVnd, currency: "VND", purposeCode, version: rule.version, hourlyRateVnd: rule.hourlyRateVnd, label: rule.label, minutes };
}

export function verifyAcceptedQuote(quote, acceptedQuote) {
  if (quote.version === 0) return;
  if (!acceptedQuote || acceptedQuote.amountVnd !== quote.amountVnd || acceptedQuote.version !== quote.version) {
    throw new HttpError(409, "Bảng giá đã thay đổi hoặc chưa được xác nhận. Vui lòng xem lại phí trước khi đặt.", { quote }, "PRICING_CHANGED");
  }
}

export async function ensureBookingCharge(tx, booking) {
  if (booking.feeAmountVnd <= 0 || booking.status !== "CONFIRMED") return;
  const existing = await tx.paymentTransaction.findFirst({ where: { bookingId: booking.id, status: { in: ["pending", "success"] } } });
  if (existing) return existing;
  return tx.paymentTransaction.create({ data: {
    id: crypto.randomUUID(), bookingId: booking.id, userId: booking.requestedById,
    txnRef: crypto.randomBytes(10).toString("hex").toUpperCase(),
    amount: booking.feeAmountVnd, currency: "VND", provider: "unselected", status: "pending",
    description: `Phí sử dụng ${booking.resource.code}: ${booking.title}`.slice(0, 500)
  } });
}
