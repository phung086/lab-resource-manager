import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { STUDENT } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { sendRequiredEmail } from "./emailService.js";
import { validateVietnamAddress } from "./addressService.js";
import { createBookingWithTransaction } from "./bookingService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "./systemAuditService.js";

const PURPOSE = "GUEST_QUICK_BOOKING";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

let testOtpDelivery = null;
let testAddressValidation = null;

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

async function lockOtpIdentity(tx, email) {
  const key = `${PURPOSE}:${email}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked`;
}

function otpError(status, message, code, details) {
  return { status, message, code, details };
}

function throwOtpError(error) {
  throw new HttpError(error.status, error.message, error.details, error.code);
}

export function configureGuestOtpTestDelivery(handler) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Guest OTP delivery interception is only available when NODE_ENV=test");
  }
  testOtpDelivery = handler;
}

export function configureGuestAddressTestValidation(handler) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Guest address interception is only available when NODE_ENV=test");
  }
  testAddressValidation = handler;
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
    customerTypeSemantics: "SELF_DECLARED_UNVERIFIED",
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

export async function sendGuestBookingOtp({ email, fullName }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new HttpError(400, "Email không hợp lệ.", { field: "email" }, "VALIDATION_ERROR");
  }

  const now = new Date();
  const code = String(crypto.randomInt(100000, 1000000));
  const otp = await prisma.$transaction(async (tx) => {
    await lockOtpIdentity(tx, normalizedEmail);
    const active = await tx.emailOtp.findFirst({
      where: { email: normalizedEmail, purpose: PURPOSE, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" }
    });
    if (active) {
      const retryAfterMs = OTP_RESEND_COOLDOWN_MS - (now.getTime() - active.createdAt.getTime());
      if (retryAfterMs > 0) {
        throw new HttpError(
          429,
          "Vui lòng chờ trước khi yêu cầu mã OTP mới.",
          { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) },
          "OTP_RESEND_TOO_SOON"
        );
      }
    }
    await tx.emailOtp.updateMany({
      where: { email: normalizedEmail, purpose: PURPOSE, consumedAt: null },
      data: { consumedAt: now }
    });
    return tx.emailOtp.create({
      data: {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        purpose: PURPOSE,
        codeHash: codeHash(normalizedEmail, code),
        attempts: 0,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS)
      }
    });
  });

  const name = String(fullName || "bạn").trim() || "bạn";
  const message = {
    to: normalizedEmail,
    subject: "[Lab Resource Manager] Mã xác thực đặt nhanh",
    text: `Mã OTP đặt nhanh LAB của ${name}: ${code}. Mã hết hạn sau 10 phút.`,
    html: `<p>Xin chào <strong>${name}</strong>,</p><p>Mã OTP đặt nhanh LAB của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã hết hạn sau 10 phút. Không chia sẻ mã này cho người khác.</p>`
  };
  const result = testOtpDelivery
    ? await testOtpDelivery({ ...message, code })
    : await sendRequiredEmail(message);
  if (!result?.success) {
    await prisma.emailOtp.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() }
    }).catch(() => null);
    throw new HttpError(503, "Không thể gửi OTP qua email.", undefined, "EMAIL_DELIVERY_FAILED");
  }
  return {
    email: normalizedEmail,
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000
  };
}

function guestProfile(payload, phone, address) {
  return {
    fullName: String(payload.fullName || "").trim(),
    phone,
    organization: String(payload.organization || "").trim() || null,
    customerType: "EXTERNAL",
    defaultAddressLine: address.addressLine,
    defaultAddressProvinceCode: address.provinceCode,
    defaultAddressProvinceName: address.provinceName,
    defaultAddressWardCode: address.wardCode,
    defaultAddressWardName: address.wardName,
    defaultAddressSource: address.source,
    defaultAddressVersion: address.version
  };
}

async function validateOtpInTransaction(tx, email, code, now) {
  await lockOtpIdentity(tx, email);
  const otp = await tx.emailOtp.findFirst({
    where: { email, purpose: PURPOSE },
    orderBy: { createdAt: "desc" }
  });
  if (!otp) return { error: otpError(400, "Mã OTP không tồn tại.", "OTP_INVALID") };
  if (otp.consumedAt) {
    return { error: otpError(409, "Mã OTP đã được sử dụng hoặc thay thế.", "OTP_ALREADY_USED") };
  }
  if (otp.expiresAt <= now) return { error: otpError(400, "Mã OTP đã hết hạn.", "OTP_EXPIRED") };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { error: otpError(429, "Bạn đã nhập sai OTP quá nhiều lần.", "OTP_ATTEMPTS_EXCEEDED") };
  }

  const expected = codeHash(email, String(code || "").trim());
  if (!crypto.timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(expected))) {
    const updated = await tx.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true }
    });
    return {
      error: updated.attempts >= OTP_MAX_ATTEMPTS
        ? otpError(429, "Bạn đã nhập sai OTP quá nhiều lần.", "OTP_ATTEMPTS_EXCEEDED")
        : otpError(400, "Mã OTP không đúng.", "OTP_INVALID", { attemptsRemaining: OTP_MAX_ATTEMPTS - updated.attempts })
    };
  }
  return { otp };
}

export async function completeGuestBooking(payload) {
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  if (!phone || phone.length < 9 || phone.length > 20) {
    throw new HttpError(400, "Số điện thoại không hợp lệ.", { field: "phone" }, "VALIDATION_ERROR");
  }
  const address = testAddressValidation
    ? await testAddressValidation(payload.address)
    : await validateVietnamAddress(payload.address);
  const profile = guestProfile(payload, phone, address);
  if (profile.fullName.length < 2 || profile.fullName.length > 255) {
    throw new HttpError(400, "Họ tên không hợp lệ.", { field: "fullName" }, "VALIDATION_ERROR");
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const verified = await validateOtpInTransaction(tx, email, payload.otpCode, new Date());
    if (verified.error) return verified;

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && !existing.isActive) {
      throw new HttpError(401, "Tài khoản này đang bị khóa.", undefined, "ACCOUNT_INACTIVE");
    }
    const user = existing || await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        role: STUDENT,
        passwordHash: await bcrypt.hash(phone, 12),
        passwordResetRequired: true,
        isActive: true,
        ...profile
      }
    });

    const booking = await createBookingWithTransaction(tx, {
      requestedById: user.id,
      resourceId: payload.booking.resourceId,
      title: payload.booking.title,
      purpose: payload.booking.purpose,
      purposeCode: payload.booking.purposeCode,
      acceptedQuote: payload.booking.acceptedQuote,
      startAt: payload.booking.startAt,
      endAt: payload.booking.endAt
    });

    const consumed = await tx.emailOtp.updateMany({
      where: {
        id: verified.otp.id,
        consumedAt: null,
        attempts: { lt: OTP_MAX_ATTEMPTS },
        expiresAt: { gt: new Date() }
      },
      data: { consumedAt: new Date(), userId: user.id }
    });
    if (consumed.count !== 1) {
      throw new HttpError(409, "Mã OTP đã được sử dụng.", undefined, "OTP_ALREADY_USED");
    }

    if (!existing) {
      await recordSystemAuditEvent(tx, {
        actor: null,
        action: AUDIT_ACTIONS.GUEST_ACCOUNT_CREATED,
        targetType: AUDIT_TARGET_TYPES.USER,
        targetId: user.id,
        resourceId: payload.booking.resourceId,
        afterState: {
          role: user.role,
          customerType: user.customerType,
          customerTypeSemantics: "SELF_DECLARED_UNVERIFIED",
          passwordResetRequired: true
        },
        metadata: {
          bookingId: booking.id,
          source: "guest_booking"
        }
      });
    } else {
      await recordSystemAuditEvent(tx, {
        actor: null,
        action: AUDIT_ACTIONS.GUEST_ACCOUNT_REUSED,
        targetType: AUDIT_TARGET_TYPES.USER,
        targetId: user.id,
        resourceId: payload.booking.resourceId,
        beforeState: {
          customerType: user.customerType
        },
        afterState: {
          customerType: user.customerType
        },
        metadata: {
          bookingId: booking.id,
          source: "guest_booking"
        }
      });
    }

    return { user, booking, accountCreated: !existing };
  });

  if (outcome.error) throwOtpError(outcome.error);
  return {
    ...(outcome.accountCreated ? {
      accessToken: authToken(outcome.user),
      tokenType: "Bearer"
    } : {
      accessToken: null,
      tokenType: null,
      requiresLogin: true
    }),
    user: outcome.accountCreated ? publicCustomerUser(outcome.user) : null,
    booking: outcome.booking
  };
}
