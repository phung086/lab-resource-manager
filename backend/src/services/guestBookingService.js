import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { STUDENT } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { sendRequiredEmail } from "./emailService.js";
import { validateVietnamAddress } from "./addressService.js";
import { createBookingInTransaction } from "./bookingService.js";

const PURPOSE = "GUEST_QUICK_BOOKING";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").trim().replace(/[^\d+]/g, "");
}

function codeHash(email, code) {
  return crypto.createHmac("sha256", config.jwtSecret).update(`${email}:${code}`).digest("hex");
}

function authToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.tokenExpiresIn
  });
}

export function publicCustomerUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    studentId: user.studentId || null,
    department: user.department || null,
    phone: user.phone || null,
    customerType: user.customerType || "INTERNAL",
    organization: user.organization || null,
    passwordResetRequired: Boolean(user.passwordResetRequired),
    defaultAddress: user.defaultAddressProvinceCode ? {
      addressLine: user.defaultAddressLine,
      provinceCode: user.defaultAddressProvinceCode,
      provinceName: user.defaultAddressProvinceName,
      wardCode: user.defaultAddressWardCode,
      wardName: user.defaultAddressWardName,
      source: user.defaultAddressSource,
      version: user.defaultAddressVersion
    } : null,
    loyalty: {
      tier: user.loyaltyTier || "LAB_STANDARD",
      points: user.loyaltyPoints || 0,
      discountBps: user.loyaltyDiscountBps || 0,
      priorityBoost: user.priorityBoost || 0
    }
  };
}

export async function sendGuestBookingOtp({ email, fullName }, dependencies = {}) {
  const db = dependencies.db || prisma;
  const mailer = dependencies.mailer || sendRequiredEmail;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new HttpError(400, "Email không hợp lệ.", { field: "email" }, "VALIDATION_ERROR");
  }

  const now = new Date();
  const recent = await db.emailOtp.findFirst({
    where: {
      email: normalizedEmail,
      purpose: PURPOSE,
      createdAt: { gt: new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS) }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (recent) {
    throw new HttpError(
      429,
      "Vui lòng chờ trước khi yêu cầu mã OTP mới.",
      { retryAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 },
      "OTP_RESEND_COOLDOWN"
    );
  }

  const code = String(crypto.randomInt(100000, 999999));
  const otp = await db.emailOtp.create({
    data: {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      purpose: PURPOSE,
      codeHash: codeHash(normalizedEmail, code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS)
    }
  });

  const name = String(fullName || "bạn").trim() || "bạn";
  const result = await mailer({
    to: normalizedEmail,
    subject: "[Lab Resource Manager] Mã xác thực đặt nhanh",
    text: `Mã OTP đặt nhanh LAB của ${name}: ${code}. Mã hết hạn sau 10 phút.`,
    html: `<p>Xin chào <strong>${name}</strong>,</p><p>Mã OTP đặt nhanh LAB của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã hết hạn sau 10 phút. Không chia sẻ mã này cho người khác.</p>`
  });

  if (!result.success) {
    await db.emailOtp.delete({ where: { id: otp.id } }).catch(() => null);
    throw new HttpError(503, "Chưa cấu hình SMTP để gửi OTP thật.", undefined, "EMAIL_NOT_CONFIGURED");
  }

  await db.emailOtp.updateMany({
    where: {
      id: { not: otp.id },
      email: normalizedEmail,
      purpose: PURPOSE,
      consumedAt: null
    },
    data: { consumedAt: new Date() }
  });

  return {
    email: normalizedEmail,
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000
  };
}

async function findAndLockOtp(tx, otpId) {
  await tx.$queryRaw`SELECT id FROM public.email_otps WHERE id = ${otpId} FOR UPDATE`;
  return tx.emailOtp.findUnique({ where: { id: otpId } });
}

async function verifyGuestOtpAttempt(db, email, code) {
  const normalizedEmail = normalizeEmail(email);
  const submittedHash = codeHash(normalizedEmail, String(code || "").trim());

  const outcome = await db.$transaction(async (tx) => {
    const candidate = await tx.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose: PURPOSE,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!candidate) return { ok: false, code: "OTP_INVALID", status: 400 };
    const otp = await findAndLockOtp(tx, candidate.id);
    if (!otp || otp.consumedAt || otp.expiresAt <= new Date()) {
      return { ok: false, code: "OTP_INVALID", status: 400 };
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, code: "OTP_LOCKED", status: 429 };
    }
    if (otp.codeHash !== submittedHash) {
      const updated = await tx.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true }
      });
      return {
        ok: false,
        code: updated.attempts >= OTP_MAX_ATTEMPTS ? "OTP_LOCKED" : "OTP_INVALID",
        status: updated.attempts >= OTP_MAX_ATTEMPTS ? 429 : 400
      };
    }
    return { ok: true, otpId: otp.id };
  });

  if (!outcome.ok) {
    if (outcome.code === "OTP_LOCKED") {
      throw new HttpError(429, "Bạn đã nhập sai OTP quá nhiều lần.", undefined, "OTP_LOCKED");
    }
    throw new HttpError(400, "Mã OTP không đúng, đã hết hạn hoặc không tồn tại.", undefined, "OTP_INVALID");
  }
  return outcome.otpId;
}

async function assertAndConsumeOtpInTransaction(tx, { otpId, email, code }) {
  const otp = await findAndLockOtp(tx, otpId);
  const normalizedEmail = normalizeEmail(email);
  if (
    !otp ||
    otp.email !== normalizedEmail ||
    otp.purpose !== PURPOSE ||
    otp.consumedAt ||
    otp.expiresAt <= new Date() ||
    otp.attempts >= OTP_MAX_ATTEMPTS ||
    otp.codeHash !== codeHash(normalizedEmail, String(code || "").trim())
  ) {
    throw new HttpError(400, "Mã OTP không còn hợp lệ.", undefined, "OTP_INVALID");
  }
  await tx.emailOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() }
  });
}

export async function completeGuestBooking(payload, dependencies = {}) {
  const db = dependencies.db || prisma;
  const addressValidator = dependencies.addressValidator || validateVietnamAddress;
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  if (!phone || phone.length < 9 || phone.length > 20) {
    throw new HttpError(400, "Số điện thoại không hợp lệ.", { field: "phone" }, "VALIDATION_ERROR");
  }

  const profile = {
    fullName: String(payload.fullName || "").trim(),
    phone,
    organization: String(payload.organization || "").trim() || null
  };
  if (profile.fullName.length < 2 || profile.fullName.length > 255) {
    throw new HttpError(400, "Họ tên không hợp lệ.", { field: "fullName" }, "VALIDATION_ERROR");
  }

  const otpId = await verifyGuestOtpAttempt(db, email, payload.otpCode);
  const address = await addressValidator(payload.address);

  const result = await db.$transaction(async (tx) => {
    await assertAndConsumeOtpInTransaction(tx, {
      otpId,
      email,
      code: payload.otpCode
    });

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && !existing.isActive) {
      throw new HttpError(401, "Tài khoản này đang bị khóa.", undefined, "ACCOUNT_INACTIVE");
    }

    const addressData = {
      defaultAddressLine: address.addressLine,
      defaultAddressProvinceCode: address.provinceCode,
      defaultAddressProvinceName: address.provinceName,
      defaultAddressWardCode: address.wardCode,
      defaultAddressWardName: address.wardName,
      defaultAddressSource: address.source,
      defaultAddressVersion: address.version
    };

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { ...profile, ...addressData }
        })
      : await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            role: STUDENT,
            passwordHash: await bcrypt.hash(phone, 12),
            passwordResetRequired: true,
            isActive: true,
            customerType: "EXTERNAL",
            ...profile,
            ...addressData
          }
        });

    const booking = await createBookingInTransaction(tx, {
      requestedById: user.id,
      resourceId: payload.booking.resourceId,
      title: payload.booking.title,
      purpose: payload.booking.purpose,
      purposeCode: payload.booking.purposeCode,
      acceptedQuote: payload.booking.acceptedQuote,
      startAt: payload.booking.startAt,
      endAt: payload.booking.endAt
    });

    return { user, booking };
  });

  return {
    accessToken: authToken(result.user),
    tokenType: "Bearer",
    user: publicCustomerUser(result.user),
    booking: result.booking
  };
}

