import crypto from "node:crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import {
  buildVnpayUrl,
  buildVietqr,
  verifyVnpay,
  providerAvailability,
  requireVietqr,
  vietnamPaymentDate,
} from "./paymentProviders.js";
const include = {
  booking: {
    select: {
      id: true,
      title: true,
      status: true,
      feeAmountVnd: true,
      resource: { select: { id: true, name: true, code: true } },
    },
  },
  user: { select: { id: true, fullName: true } },
};
const missing = () =>
  new HttpError(
    404,
    "Không tìm thấy giao dịch.",
    undefined,
    "TRANSACTION_NOT_FOUND",
  );
function assertOwner(row, actor, allowAdmin = true) {
  if (
    !row ||
    (row.userId !== actor.id && !(allowAdmin && actor.role === "ADMIN"))
  )
    throw missing();
}
function assertPending(row) {
  if (row.status !== "pending")
    throw new HttpError(
      409,
      "Giao dịch không còn chờ thanh toán.",
      undefined,
      row.status === "success"
        ? "PAYMENT_ALREADY_SUCCESS"
        : "PAYMENT_INVALID_STATE",
    );
}
export async function getPayment(id, actor) {
  const row = await prisma.paymentTransaction.findUnique({
    where: { id },
    include,
  });
  assertOwner(row, actor);
  return row;
}
export async function listPayments(actor, filters = {}, admin = false) {
  if (admin && actor.role !== "ADMIN")
    throw new HttpError(
      403,
      "Chỉ quản trị viên được xem sổ giao dịch.",
      undefined,
      "PAYMENT_FORBIDDEN",
    );
  const where = {
    ...(admin ? {} : { userId: actor.id }),
    ...(filters.bookingId ? { bookingId: filters.bookingId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.search
      ? {
          OR: [
            { txnRef: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            {
              booking: {
                title: { contains: filters.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  if (filters.from || filters.to)
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  return {
    transactions: await prisma.paymentTransaction.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    providers: providerAvailability(),
    limit: 100,
  };
}
export async function bookingPayments(bookingId, actor) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { requestedById: true },
  });
  if (
    !booking ||
    (actor.role !== "ADMIN" && booking.requestedById !== actor.id)
  )
    throw missing();
  return prisma.paymentTransaction.findMany({
    where: { bookingId },
    include,
    orderBy: { createdAt: "desc" },
  });
}
export async function createCharge(actor, data) {
  if (actor.role !== "ADMIN")
    throw new HttpError(
      403,
      "Chỉ quản trị viên được tạo yêu cầu thanh toán.",
      undefined,
      "PAYMENT_FORBIDDEN",
    );
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`charge:${data.bookingId}`}))::text`;
    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      select: { requestedById: true, feeAmountVnd: true, status: true },
    });
    if (!booking)
      throw new HttpError(
        404,
        "Không tìm thấy lịch đặt.",
        undefined,
        "BOOKING_NOT_FOUND",
      );
    if (booking.feeAmountVnd > 0 && (booking.status !== "CONFIRMED" || data.amount !== booking.feeAmountVnd)) {
      throw new HttpError(409, "Khoản thu phải khớp phí đã chốt và lịch đã duyệt.", undefined, "BOOKING_PAYMENT_INVALID");
    }
    if (
      await tx.paymentTransaction.findFirst({
        where: {
          bookingId: data.bookingId,
          status: { in: ["pending", "success"] },
        },
      })
    )
      throw new HttpError(
        409,
        "Lịch đặt đã có yêu cầu đang chờ hoặc đã thanh toán.",
        undefined,
        "DUPLICATE_CHARGE",
      );
    return tx.paymentTransaction.create({
      data: {
        ...data,
        id: crypto.randomUUID(),
        userId: booking.requestedById,
        txnRef: crypto.randomBytes(10).toString("hex").toUpperCase(),
        provider: "unselected",
        currency: "VND",
        status: "pending",
      },
      include,
    });
  });
}
export async function initiatePayment(id, actor, provider, ip) {
  if (provider === "vietqr") requireVietqr();
  const row = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${id}`}))::text`;
    const current = await tx.paymentTransaction.findUnique({
      where: { id },
      include,
    });
    assertOwner(current, actor, false);
    assertPending(current);
    if (current.booking && ["PENDING_APPROVAL", "REJECTED", "CANCELLED"].includes(current.booking.status)) {
      throw new HttpError(409, "Lịch đặt chưa được duyệt hoặc đã kết thúc yêu cầu; không thể thanh toán.", undefined, "BOOKING_PAYMENT_INVALID");
    }
    // A sent payment cannot switch providers: an older signed callback may still arrive.
    if (!["unselected", provider].includes(current.provider))
      throw new HttpError(
        409,
        "Phương thức đã được chọn; không thể đổi khi đang chờ kết quả.",
        undefined,
        "PAYMENT_PROVIDER_LOCKED",
      );
    if (current.provider === provider && current.paymentUrl) return current;
    const url = provider === "vnpay" ? buildVnpayUrl(current, ip) : null;
    const updated = await tx.paymentTransaction.updateMany({
      where: { id, status: "pending", provider: current.provider },
      data: { provider, ...(url ? { paymentUrl: url } : {}) },
    });
    if (updated.count !== 1)
      throw new HttpError(
        409,
        "Giao dịch vừa thay đổi. Hãy tải lại.",
        undefined,
        "PAYMENT_INVALID_STATE",
      );
    return tx.paymentTransaction.findUnique({ where: { id }, include });
  });
  return provider === "vietqr"
    ? { transaction: row, vietqr: await buildVietqr(row) }
    : { transaction: row, paymentUrl: row.paymentUrl, mode: "SANDBOX" };
}
export async function processVnpayIpn(query) {
  verifyVnpay(query);
  const row = await prisma.paymentTransaction.findUnique({
    where: { txnRef: query.vnp_TxnRef },
  });
  if (!row) throw missing();
  if (row.provider !== "vnpay" || !row.paymentUrl || row.currency !== "VND")
    throw new HttpError(
      400,
      "Provider giao dịch không khớp.",
      undefined,
      "INVALID_PROVIDER_CALLBACK",
    );
  if (Number(query.vnp_Amount) !== row.amount * 100)
    throw new HttpError(
      400,
      "Số tiền callback không khớp.",
      undefined,
      "AMOUNT_MISMATCH",
    );
  if (row.status !== "pending")
    return { RspCode: "02", Message: "Order already confirmed" };
  const success =
    query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";
  if (
    success &&
    (!/^\d{1,20}$/.test(query.vnp_TransactionNo || "") ||
      !/^\d{14}$/.test(query.vnp_PayDate || ""))
  )
    throw new HttpError(
      400,
      "Thiếu bằng chứng giao dịch.",
      undefined,
      "INVALID_PROVIDER_CALLBACK",
    );
  const p = query.vnp_PayDate;
  const paidAt = success
    ? new Date(
        `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T${p.slice(8, 10)}:${p.slice(10, 12)}:${p.slice(12, 14)}+07:00`,
      )
    : null;
  if (
    success &&
    (Number.isNaN(paidAt.getTime()) || vietnamPaymentDate(paidAt) !== p)
  )
    throw new HttpError(
      400,
      "Thời gian provider không hợp lệ.",
      undefined,
      "INVALID_PROVIDER_CALLBACK",
    );
  const update = await prisma.paymentTransaction.updateMany({
    where: { id: row.id, provider: "vnpay", status: "pending" },
    data: {
      status: success ? "success" : "failed",
      paidAt,
      vnpResponseCode: query.vnp_ResponseCode,
      vnpTransactionNo: query.vnp_TransactionNo || null,
      bankCode: query.vnp_BankCode || null,
      cardType: query.vnp_CardType || null,
    },
  });
  return update.count
    ? { RspCode: "00", Message: "Confirm Success" }
    : { RspCode: "02", Message: "Order already confirmed" };
}
export async function paymentReceipt(id, actor) {
  const row = await getPayment(id, actor);
  if (row.status !== "success" || !row.paidAt)
    throw new HttpError(
      409,
      "Chưa có thanh toán được xác minh để xuất biên nhận.",
      undefined,
      "PAYMENT_NOT_VERIFIED",
    );
  return {
    title: "Biên nhận thanh toán nội bộ",
    disclaimer: "Không thay thế hóa đơn điện tử/tài chính theo quy định.",
    transaction: row,
    generatedAt: new Date().toISOString(),
  };
}
