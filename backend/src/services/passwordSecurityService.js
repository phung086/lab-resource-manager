import bcrypt from "bcryptjs";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { HttpError } from "../middleware/errors.js";
import { accountWrite, managedTarget } from "./accountAccess.js";
import { emailConfiguration, escapeHtml, sendRequiredEmail } from "./emailService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "./systemAuditService.js";

const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const failure = (code, status = 400, details) => ({ code, status, details });
const raise = value => { throw new HttpError(value.status, value.code, value.details, value.code); };

function codeHash(row, code) {
  return createHmac("sha256", config.jwtSecret)
    .update(JSON.stringify([row.id, row.actorId, row.targetUserId, row.email, row.purpose, code])).digest("hex");
}
export function maskedEmail(email) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***${local.length > 2 ? local.slice(-1) : ""}@${domain}`;
}

export async function requestPasswordOtp(actor, { targetUserId = actor.id, currentPassword, reason, locale = "vi" }) {
  const self = targetUserId === actor.id;
  // A missing SMTP service cannot become a delivered or bypassable challenge.
  if (!emailConfiguration().configured) raise(failure("SMTP_NOT_CONFIGURED", 503));
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const now = new Date();
  const challenge = await accountWrite(actor, async (tx, currentActor) => {
    const target = self ? currentActor : await managedTarget(tx, currentActor, targetUserId);
    if (!target.isActive || target.deletedAt) raise(failure("ACCOUNT_INACTIVE", 409));
    if (self && !(await bcrypt.compare(currentPassword || "", target.passwordHash)))
      raise(failure("CURRENT_PASSWORD_INVALID", 400, { field: "currentPassword" }));
    const latest = await tx.passwordChallenge.findFirst({ where: { targetUserId }, orderBy: { createdAt: "desc" } });
    if (latest && now.getTime() - latest.createdAt.getTime() < COOLDOWN_MS)
      raise(failure("OTP_COOLDOWN", 429, { retryAfterSeconds: Math.ceil((COOLDOWN_MS - now.getTime() + latest.createdAt.getTime()) / 1000) }));
    await tx.passwordChallenge.updateMany({ where: { targetUserId, consumedAt: null }, data: { consumedAt: now } });
    const row = { id: randomUUID(), actorId: currentActor.id, targetUserId, email: target.email,
      purpose: self ? "SELF_CHANGE" : "ASSISTED_RESET", actorVersion: currentActor.authVersion,
      targetVersion: target.authVersion, reason: self ? "Self-service password change" : reason,
      expiresAt: new Date(now.getTime() + TTL_MS), createdAt: now };
    return tx.passwordChallenge.create({ data: { ...row, codeHash: codeHash(row, code) } });
  });
  const english = locale === "en";
  const text = english
    ? `Password change verification: ${code}. Valid for 10 minutes. Do not share this code unless you requested assistance. If you did not request a password change, ignore this email.`
    : `Mã xác thực đổi mật khẩu: ${code}. Có hiệu lực 10 phút. Chỉ cung cấp mã khi bạn đã yêu cầu hỗ trợ đổi mật khẩu. Nếu không yêu cầu, hãy bỏ qua email này.`;
  const delivery = await sendRequiredEmail({ to: challenge.email, subject: english ? "LAB password verification" : "LAB — Xác thực đổi mật khẩu",
    text, html: `<p>${escapeHtml(text)}</p>` });
  if (!delivery.success) {
    await prisma.passwordChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    raise(failure("OTP_NOT_SENT", 503));
  }
  await accountWrite(actor, async (tx, currentActor) => {
    const target = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!target?.isActive || target.deletedAt || target.authVersion !== challenge.targetVersion || target.email !== challenge.email ||
        (!self && !canReset(currentActor, target))) raise(failure("OTP_CONTEXT_CHANGED", 409));
    await tx.passwordChallenge.update({ where: { id: challenge.id }, data: { deliveredAt: new Date() } });
    await recordSystemAuditEvent(tx, { actor: currentActor, action: AUDIT_ACTIONS.PASSWORD_VERIFICATION_REQUESTED, targetType: AUDIT_TARGET_TYPES.USER,
      targetId: targetUserId, reason: challenge.reason, metadata: { assisted: !self } });
  });
  return { challengeId: challenge.id, maskedEmail: maskedEmail(challenge.email), expiresAt: challenge.expiresAt,
    resendAfter: new Date(now.getTime() + COOLDOWN_MS) };
}

function canReset(actor, target) {
  return actor.role === "ADMIN" || (actor.role === "LAB_STAFF" && target.role === "CUSTOMER");
}

export async function confirmPasswordOtp(actor, { targetUserId = actor.id, challengeId, otp, newPassword, currentPassword }) {
  const self = targetUserId === actor.id;
  const hash = await bcrypt.hash(newPassword, 12);
  const result = await accountWrite(actor, async (tx, currentActor) => {
    const target = self ? currentActor : await managedTarget(tx, currentActor, targetUserId);
    const row = await tx.passwordChallenge.findUnique({ where: { id: challengeId } });
    if (!row || row.actorId !== currentActor.id || row.targetUserId !== target.id || row.purpose !== (self ? "SELF_CHANGE" : "ASSISTED_RESET"))
      return { error: failure("OTP_INVALID", 400, { field: "otp" }) };
    const now = new Date();
    if (row.consumedAt || row.attempts >= MAX_ATTEMPTS) return { error: failure("OTP_ATTEMPTS_EXCEEDED", 400, { field: "otp" }) };
    if (row.expiresAt <= now) return { error: failure("OTP_EXPIRED", 400, { field: "otp" }) };
    if (!row.deliveredAt) return { error: failure("OTP_NOT_SENT", 409) };
    if (!target.isActive || target.deletedAt || row.email !== target.email || row.targetVersion !== target.authVersion || row.actorVersion !== currentActor.authVersion)
      return { error: failure("OTP_CONTEXT_CHANGED", 409) };
    const provided = Buffer.from(codeHash(row, otp), "hex"), expected = Buffer.from(row.codeHash, "hex");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      const attempts = row.attempts + 1;
      await tx.passwordChallenge.update({ where: { id: row.id }, data: { attempts, ...(attempts >= MAX_ATTEMPTS ? { consumedAt: now } : {}) } });
      return { error: failure(attempts >= MAX_ATTEMPTS ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_INVALID", 400, { field: "otp" }) };
    }
    if (self && !(await bcrypt.compare(currentPassword || "", target.passwordHash)))
      return { error: failure("CURRENT_PASSWORD_INVALID", 400, { field: "currentPassword" }) };
    if (await bcrypt.compare(newPassword, target.passwordHash))
      return { error: failure("PASSWORD_UNCHANGED", 400, { field: "newPassword" }) };
    const saved = await tx.user.update({ where: { id: target.id }, data: { passwordHash: hash, passwordResetRequired: false, authVersion: { increment: 1 } } });
    await tx.passwordChallenge.update({ where: { id: row.id }, data: { consumedAt: now } });
    await recordSystemAuditEvent(tx, { actor: currentActor, action: AUDIT_ACTIONS.ACCOUNT_CREDENTIAL_CHANGED, targetType: AUDIT_TARGET_TYPES.USER, targetId: target.id,
      reason: row.reason, beforeState: { credentialVersion: target.authVersion }, afterState: { credentialVersion: saved.authVersion },
      metadata: { assisted: !self, emailVerification: true } });
    return { user: saved };
  });
  if (result.error) raise(result.error);
  return result.user;
}
