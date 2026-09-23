import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { STUDENT } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { sendRequiredEmail } from "./emailService.js";
import { validateVietnamAddress } from "./addressService.js";
import { createBooking } from "./bookingService.js";

const PURPOSE = "GUEST_QUICK_BOOKING";
const OTP_TTL_MS = 10 * 60 * 1000;

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

export async function sendGuestBookingOtp({ email, fullName }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new HttpError(400, "Email không hợp lệ.", { field: "email" }, "VALIDATION_ERROR");
  }
  const code = String(crypto.randomInt(100000, 999999));
  const otp = await prisma.emailOtp.create({
    data: {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      purpose: PURPOSE,
      codeHash: codeHash(normalizedEmail, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    }
  });
  const name = String(fullName || "bạn").trim() || "bạn";
  const result = await sendRequiredEmail({
    to: normalizedEmail,
    subject: "[Lab Resource Manager] Mã xác thực đặt nhanh",
    text: `Mã OTP đặt nhanh LAB của ${name}: ${code}. Mã hết hạn sau 10 phút.`,
    html: `<p>Xin chào <strong>${name}</strong>,</p><p>Mã OTP đặt nhanh LAB của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã hết hạn sau 10 phút. Không chia sẻ mã này cho người khác.</p>`
  });
  if (!result.success) {
    await prisma.emailOtp.delete({ where: { id: otp.id } }).catch(() => null);
    throw new HttpError(503, "Chưa cấu hình SMTP để gửi OTP thật.", undefined, "EMAIL_NOT_CONFIGURED");
  }
  return { email: normalizedEmail, expiresInSeconds: OTP_TTL_MS / 1000 };
}

async function verifyGuestOtp(tx, email, code) {
  const normalizedEmail = normalizeEmail(email);
  const otp = await tx.emailOtp.findFirst({
    where: { email: normalizedEmail, purpose: PURPOSE, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!otp) throw new HttpError(400, "Mã OTP đã hết hạn hoặc không tồn tại.", undefined, "OTP_INVALID");
  if (otp.attempts >= 5) throw new HttpError(429, "Bạn đã nhập sai OTP quá nhiều lần.", undefined, "OTP_LOCKED");
  const expected = codeHash(normalizedEmail, String(code || "").trim());
  if (otp.codeHash !== expected) {
    await tx.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Mã OTP không đúng.", undefined, "OTP_INVALID");
  }
  await tx.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

export async function completeGuestBooking(payload) {
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  if (!phone || phone.length < 9 || phone.length > 20) {
    throw new HttpError(400, "Số điện thoại không hợp lệ.", { field: "phone" }, "VALIDATION_ERROR");
  }
  const address = await validateVietnamAddress(payload.address);
  let user;
  await prisma.$transaction(async tx => {
    await verifyGuestOtp(tx, email, payload.otpCode);
    const existing = await tx.user.findUnique({ where: { email } });
    const profile = {
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
    if (profile.fullName.length < 2 || profile.fullName.length > 255) {
      throw new HttpError(400, "Họ tên không hợp lệ.", { field: "fullName" }, "VALIDATION_ERROR");
    }
    if (existing) {
      if (!existing.isActive) throw new HttpError(401, "Tài khoản này đang bị khóa.", undefined, "ACCOUNT_INACTIVE");
      user = await tx.user.update({ where: { id: existing.id }, data: profile });
      return;
    }
    user = await tx.user.create({
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
  });

  const booking = await createBooking({
    requestedById: user.id,
    resourceId: payload.booking.resourceId,
    title: payload.booking.title,
    purpose: payload.booking.purpose,
    purposeCode: payload.booking.purposeCode,
    acceptedQuote: payload.booking.acceptedQuote,
    startAt: payload.booking.startAt,
    endAt: payload.booking.endAt
  });
  return {
    accessToken: authToken(user),
    tokenType: "Bearer",
    user: publicCustomerUser(user),
    booking
  };
}
