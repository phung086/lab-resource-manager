import crypto from "node:crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "./systemAuditService.js";
import { enqueuePaymentReceipt } from "./emailAutomationService.js";
import { config } from '../config.js';
import { isPaymentHold, effectivePaymentDeadline, lockPaymentBooking, expirePaymentHolds, expireLockedPaymentHold, confirmPaidBooking } from './bookingPaymentHoldService.js';
import { scheduleBookingReminders } from './notificationService.js';
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
      endAt: true,
      startAt: true,
      paymentDueAt: true,
      resourceId: true,
      requestedById: true,
      resource: { select: { id: true, name: true, code: true, laboratoryId: true } },
    },
  },
  user: { select: { id: true, fullName: true } },
};
const VNPAY_SESSION_TTL_MS = 15 * 60 * 1000;
const RETRYABLE_PAYMENT_STATUSES = new Set(["failed", "expired"]);
function publicPayment(row) {
  if (!row) return row;
  const { paymentUrl: _paymentUrl, ...safe } = row;
  return safe.booking?.paymentDueAt ? { ...safe, booking: { ...safe.booking, paymentDueAt: effectivePaymentDeadline(safe.booking) } } : safe;
}
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

function replacementChargeData(row) {
  return {
    id: crypto.randomUUID(),
    bookingId: row.bookingId,
    userId: row.userId,
    txnRef: crypto.randomBytes(10).toString("hex").toUpperCase(),
    amount: row.amount,
    currency: row.currency,
    provider: "unselected",
    status: "pending",
    description: row.description,
  };
}

async function notifyPayment(tx, row, event, { reconciliation = false, now = new Date() } = {}) {
  const booking = event === 'SUCCESS' && !reconciliation && row.bookingId
    ? await tx.booking.findUnique({ where: { id: row.bookingId }, include: { resource: true } }) : null;
  const mode = booking?.fulfillmentSnapshot?.mode || (booking?.resource.category === 'ROOM' ? 'ROOM_SELF_SERVICE' : 'LAB_PICKUP');
  const roomAccessReady = mode === 'ROOM_SELF_SERVICE' && booking
    ? Boolean((await tx.resourceFulfillment.findUnique({ where: { resourceId: booking.resourceId }, select: { roomPasswordCiphertext: true } }))?.roomPasswordCiphertext) : false;
  const guidanceMode = mode === 'ROOM_SELF_SERVICE' && !roomAccessReady ? 'ROOM_ACCESS_PENDING' : mode;
  const definitions = [{
    userId: row.userId,
    key: `payment:${row.id}:${event}:owner`,
    title: event === "SUCCESS" ? "Thanh toán đã được xác minh" : event === "FAILED" ? "Thanh toán chưa thành công" : "Phiên thanh toán đã hết hạn",
    message: booking ? mode === 'ROOM_SELF_SERVICE' ? roomAccessReady ? 'Biên lai và mật khẩu phòng đã sẵn sàng. Check-in từ 30 phút trước lịch.' : 'Đã thanh toán. Liên hệ LAB để hoàn tất cấu hình truy cập phòng.'
      : mode === 'HOME_DELIVERY' ? 'Đã nhận yêu cầu giao thiết bị. Nhân viên LAB sẽ liên hệ bàn giao.'
      : `Đến LAB gặp nhân viên để kiểm tra và nhận thiết bị: ${booking.fulfillmentSnapshot?.pickupInstructions || booking.resource.location}`
      : `${row.txnRef} · ${Math.trunc(row.amount).toLocaleString("vi-VN")} VND`,
    severity: event === "SUCCESS" ? "success" : "warning",
  }];
  if (reconciliation) {
    const admins = await tx.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    definitions.push(...admins.map((admin) => ({
      userId: admin.id,
      key: `payment:${row.id}:MANUAL_REVIEW:${admin.id}`,
      title: "Thanh toán cần đối soát thủ công",
      message: `${row.txnRef} · booking đã kết thúc trước khi VNPAY xác nhận thành công`,
      severity: "warning",
    })));
  }
  for (const definition of definitions) {
    await tx.notification.upsert({
      where: { dedupeKey: definition.key },
      update: {},
      create: {
        id: crypto.randomUUID(),
        userId: definition.userId,
        title: definition.title,
        message: definition.message,
        titleKey: definition.userId === row.userId ? `payment.${event.toLowerCase()}.title` : null,
        messageKey: booking && definition.userId === row.userId ? `fulfillment.${guidanceMode}.message` : null,
        messageParams: { paymentId: row.id, bookingId: row.bookingId, event, location: booking?.fulfillmentSnapshot?.pickupInstructions || booking?.resource.location || '' },
        severity: definition.severity,
        channel: "in_app",
        sentAt: now,
        dedupeKey: definition.key,
      },
    });
  }
  if (booking) await scheduleBookingReminders(tx, booking, now);
}
export async function getPayment(id, actor) {
  let row = await prisma.paymentTransaction.findUnique({
    where: { id },
    include,
  });
  assertOwner(row, actor);
  if (row.bookingId) {
    await expirePaymentHolds(prisma, { bookingId: row.bookingId });
    row = await prisma.paymentTransaction.findUnique({ where: { id }, include });
  }
  return publicPayment(row);
}
export async function listPayments(actor, filters = {}, admin = false) {
  if (admin && actor.role !== "ADMIN")
    throw new HttpError(
      403,
      "Chỉ quản trị viên được xem sổ giao dịch.",
      undefined,
      "PAYMENT_FORBIDDEN",
    );
  await expirePaymentHolds(prisma, admin ? {} : { userId: actor.id });
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
  const transactions = await prisma.paymentTransaction.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  return {
    transactions: transactions.map(publicPayment),
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
  await expirePaymentHolds(prisma, { bookingId });
  const rows = await prisma.paymentTransaction.findMany({
    where: { bookingId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(publicPayment);
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
    if (
      booking.feeAmountVnd <= 0 ||
      booking.status !== "CONFIRMED" ||
      (data.amount != null && data.amount !== booking.feeAmountVnd)
    ) {
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
    const transaction = await tx.paymentTransaction.create({
      data: {
        bookingId: data.bookingId,
        description: data.description,
        amount: booking.feeAmountVnd,
        id: crypto.randomUUID(),
        userId: booking.requestedById,
        txnRef: crypto.randomBytes(10).toString("hex").toUpperCase(),
        provider: "unselected",
        currency: "VND",
        status: "pending",
      },
      include,
    });
    await recordSystemAuditEvent(tx, {
      actor,
      action: AUDIT_ACTIONS.PAYMENT_CHARGE_CREATED,
      targetType: AUDIT_TARGET_TYPES.PAYMENT,
      targetId: transaction.id,
      afterState: {
        amount: booking.feeAmountVnd,
        bookingId: data.bookingId,
        status: "pending"
      },
      metadata: {
        bookingId: data.bookingId,
        source: "admin_charge"
      }
    });
    return transaction;
  });
}
export async function initiatePayment(id, actor, provider, ip, appOrigin) {
  if (provider === "vietqr") requireVietqr();
  const payable = await prisma.paymentTransaction.findUnique({ where: { id }, include });
  assertOwner(payable, actor, false);
  if (payable.bookingId) await expirePaymentHolds(prisma, { bookingId: payable.bookingId });
  const row = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${id}`}))::text`;
    let current = await tx.paymentTransaction.findUnique({
      where: { id },
      include,
    });
    assertOwner(current, actor, false);
    if (current.bookingId) {
      await lockPaymentBooking(tx, current.bookingId);
      current = await tx.paymentTransaction.findUnique({ where: { id }, include });
    }
    if (current.booking && current.booking.status !== 'CONFIRMED' && !isPaymentHold(current.booking)) {
      throw new HttpError(409, "Lịch đặt chưa được duyệt hoặc đã kết thúc yêu cầu; không thể thanh toán.", undefined, "BOOKING_PAYMENT_INVALID");
    }
    if (current.booking?.endAt <= new Date()) throw new HttpError(409, 'Lịch sử dụng đã kết thúc.', undefined, 'BOOKING_HANDOVER_EXPIRED');
    if (current.status === "success") assertPending(current);

    const now = new Date();
    if (isPaymentHold(current.booking) && +effectivePaymentDeadline(current.booking) <= +now) throw new HttpError(409, 'Hết thời gian giữ chỗ thanh toán.', undefined, 'PAYMENT_HOLD_EXPIRED');
    const sessionExpired = current.status === "pending" && current.paymentUrl &&
      (!current.paymentUrlExpiresAt || current.paymentUrlExpiresAt <= now);
    if (sessionExpired) {
      await tx.paymentTransaction.update({
        where: { id: current.id },
        data: { status: "expired" },
      });
      await notifyPayment(tx, current, "EXPIRED", { now });
      current = { ...current, status: "expired" };
    }

    if (RETRYABLE_PAYMENT_STATUSES.has(current.status)) {
      const active = current.bookingId
        ? await tx.paymentTransaction.findFirst({
            where: { bookingId: current.bookingId, status: { in: ["pending", "success"] } },
            include,
            orderBy: { createdAt: "desc" },
          })
        : null;
      if (active?.status === "success") assertPending(active);
      current = active || await tx.paymentTransaction.create({
        data: replacementChargeData(current),
        include,
      });
    }

    assertPending(current);
    // A sent payment cannot switch providers: an older signed callback may still arrive.
    if (!["unselected", provider].includes(current.provider))
      throw new HttpError(
        409,
        "Phương thức đã được chọn; không thể đổi khi đang chờ kết quả.",
        undefined,
        "PAYMENT_PROVIDER_LOCKED",
      );
    if (
      current.provider === provider &&
      current.paymentUrl &&
      current.paymentUrlExpiresAt &&
      current.paymentUrlExpiresAt > now &&
      (!isPaymentHold(current.booking) || +current.paymentUrlExpiresAt <= +effectivePaymentDeadline(current.booking))
    ) return current;
    const expiresAt = new Date(Math.min(now.getTime() + VNPAY_SESSION_TTL_MS, current.booking?.paymentDueAt ? +effectivePaymentDeadline(current.booking) : Infinity));
    const url = provider === "vnpay" ? buildVnpayUrl(current, ip, now, expiresAt) : null;
    const updated = await tx.paymentTransaction.updateMany({
      where: { id: current.id, status: "pending", provider: current.provider },
      data: {
        provider,
        ...(config.corsOrigins.includes(appOrigin) ? { appOrigin } : {}),
        ...(url ? {
          paymentUrl: url,
          paymentUrlCreatedAt: now,
          paymentUrlExpiresAt: expiresAt,
        } : {}),
      },
    });
    if (updated.count !== 1)
      throw new HttpError(
        409,
        "Giao dịch vừa thay đổi. Hãy tải lại.",
        undefined,
        "PAYMENT_INVALID_STATE",
      );
    return tx.paymentTransaction.findUnique({ where: { id: current.id }, include });
  });
  return provider === "vietqr"
    ? { transaction: publicPayment(row), vietqr: await buildVietqr(row) }
    : { transaction: publicPayment(row), paymentUrl: row.paymentUrl, mode: "SANDBOX" };
}
export async function processVnpayIpn(query) {
  verifyVnpay(query);
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
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`vnpay:${query.vnp_TxnRef}`}))::text`;
    let row = await tx.paymentTransaction.findUnique({
      where: { txnRef: query.vnp_TxnRef },
      include,
    });
    if (!row) throw missing();
    if (row.provider !== "vnpay" || !row.paymentUrl || row.currency !== "VND")
      throw new HttpError(
        400,
        "Provider giao dịch không khớp.",
        undefined,
        "INVALID_PROVIDER_CALLBACK",
      );
    if (!Number.isSafeInteger(row.amount) || Number(query.vnp_Amount) !== row.amount * 100)
      throw new HttpError(
        400,
        "Số tiền callback không khớp.",
        undefined,
        "AMOUNT_MISMATCH",
      );
    if (row.status === "success" || row.status === "refunded")
      return { RspCode: "02", Message: "Order already confirmed" };

    if (row.bookingId) {
      await lockPaymentBooking(tx, row.bookingId);
      row = await tx.paymentTransaction.findUnique({ where: { id: row.id }, include });
      await expireLockedPaymentHold(tx, row.booking, new Date());
      row = await tx.paymentTransaction.findUnique({ where: { id: row.id }, include });
    }

    if (success) {
      const transactionNoOwner = await tx.paymentTransaction.findFirst({
        where: { vnpTransactionNo: query.vnp_TransactionNo, id: { not: row.id } },
        select: { id: true },
      });
      if (transactionNoOwner)
        throw new HttpError(400, "Mã giao dịch provider đã được sử dụng.", undefined, "INVALID_PROVIDER_CALLBACK");
      const otherSuccess = row.bookingId
        ? await tx.paymentTransaction.findFirst({
            where: { bookingId: row.bookingId, status: "success", id: { not: row.id } },
            select: { id: true },
          })
        : null;
      const terminalBooking = row.booking && ["CANCELLED", "REJECTED"].includes(row.booking.status);
      const bookingMismatch = row.booking && (row.amount !== row.booking.feeAmountVnd || row.userId !== row.booking.requestedById);
      const reconciliation = terminalBooking || Boolean(otherSuccess) || Boolean(bookingMismatch);
      const reconciliationReason = terminalBooking
        ? `Provider success received after booking entered ${row.booking.status}.`
        : otherSuccess
          ? "Provider success duplicates an existing settled payment for the booking."
          : bookingMismatch ? 'Payment does not match the booking owner and accepted fee.' : null;
      const saved = await tx.paymentTransaction.update({
        where: { id: row.id },
        data: {
          status: "success",
          paidAt,
          vnpResponseCode: query.vnp_ResponseCode,
          vnpTransactionNo: query.vnp_TransactionNo,
          bankCode: query.vnp_BankCode || null,
          cardType: query.vnp_CardType || null,
          ...(reconciliation ? {
            reconciliationStatus: "manual_review",
            reconciliationReason,
          } : {}),
        },
      });
      if (!reconciliation && row.booking && saved.amount === row.booking.feeAmountVnd && saved.userId === row.booking.requestedById) await confirmPaidBooking(tx, row.booking);
      await notifyPayment(tx, saved, "SUCCESS", { reconciliation, now: new Date() });
      await enqueuePaymentReceipt(tx, saved);
      return { RspCode: "00", Message: "Confirm Success" };
    }

    if (row.status !== "pending")
      return { RspCode: "02", Message: "Order already confirmed" };
    const saved = await tx.paymentTransaction.update({
      where: { id: row.id },
      data: {
        status: "failed",
        paidAt: null,
        vnpResponseCode: query.vnp_ResponseCode,
        vnpTransactionNo: query.vnp_TransactionNo || null,
        bankCode: query.vnp_BankCode || null,
        cardType: query.vnp_CardType || null,
      },
    });
    await notifyPayment(tx, saved, "FAILED");
    return { RspCode: "00", Message: "Confirm Success" };
  });
}

export async function resolvePaymentReconciliation(id, actor, reason) {
  if (actor.role !== "ADMIN")
    throw new HttpError(403, "Chỉ quản trị viên được xử lý đối soát.", undefined, "PAYMENT_FORBIDDEN");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${id} FOR UPDATE`;
    const row = await tx.paymentTransaction.findUnique({ where: { id }, include });
    if (!row) throw missing();
    if (row.reconciliationStatus !== "manual_review")
      throw new HttpError(409, "Giao dịch không có ngoại lệ đối soát đang mở.", undefined, "PAYMENT_RECONCILIATION_INVALID_STATE");
    const now = new Date();
    const saved = await tx.paymentTransaction.update({
      where: { id },
      data: {
        reconciliationStatus: "resolved",
        reconciliationReason: reason,
        reconciledAt: now,
        reconciledById: actor.id,
      },
      include,
    });
    await recordSystemAuditEvent(tx, {
      actor,
      action: AUDIT_ACTIONS.PAYMENT_RECONCILIATION_RESOLVED,
      targetType: AUDIT_TARGET_TYPES.PAYMENT,
      targetId: id,
      labId: row.booking?.resource?.laboratoryId || null,
      resourceId: row.booking?.resource?.id || null,
      beforeState: { paymentStatus: row.status, reconciliationStatus: row.reconciliationStatus },
      afterState: { paymentStatus: saved.status, reconciliationStatus: saved.reconciliationStatus },
      reason,
      metadata: { bookingId: row.bookingId, source: "admin_manual_reconciliation" },
    });
    return publicPayment(saved);
  });
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
    transaction: publicPayment(row),
    generatedAt: new Date().toISOString(),
  };
}
