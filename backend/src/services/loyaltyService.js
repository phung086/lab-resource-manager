import { z } from "zod";
import { ADMIN, CUSTOMER } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { recordSystemAuditEvent } from "./systemAuditService.js";

export const DEFAULT_LOYALTY_POLICY = Object.freeze({
  id: "SYSTEM", enabled: false, plusThreshold: 1500000, priorityThreshold: 5000000,
  plusDiscountBps: 300, priorityDiscountBps: 500, version: 0
});

export const loyaltyPolicySchema = z.object({
  enabled: z.boolean(),
  plusThreshold: z.number().int().min(1).max(2000000000),
  priorityThreshold: z.number().int().min(1).max(2000000000),
  plusDiscountBps: z.number().int().min(0).max(5000),
  priorityDiscountBps: z.number().int().min(0).max(5000),
  expectedVersion: z.number().int().min(0).max(2147483646)
}).strict().refine(policy => policy.priorityThreshold > policy.plusThreshold, {
  path: ["priorityThreshold"], message: "Priority threshold must exceed Plus threshold"
});

export async function getLoyaltyPolicy(client, { lock = false } = {}) {
  if (lock) await client.$queryRaw`SELECT id FROM loyalty_policy WHERE id = 'SYSTEM' FOR SHARE`;
  return await client.loyaltyPolicy.findUnique({ where: { id: "SYSTEM" } }) || { ...DEFAULT_LOYALTY_POLICY };
}

// Legacy user loyalty fields are compatibility data, never a pricing authority.
export function deriveLoyalty({ totalSpendVnd = 0, completedBookings = 0, role = CUSTOMER }, policy) {
  const tier = totalSpendVnd >= policy.priorityThreshold ? "LAB_PRIORITY"
    : totalSpendVnd >= policy.plusThreshold ? "LAB_PLUS" : "LAB_STANDARD";
  const discountBps = policy.enabled && role === CUSTOMER
    ? tier === "LAB_PRIORITY" ? policy.priorityDiscountBps : tier === "LAB_PLUS" ? policy.plusDiscountBps : 0
    : 0;
  const nextTier = tier === "LAB_STANDARD" ? "LAB_PLUS" : tier === "LAB_PLUS" ? "LAB_PRIORITY" : null;
  const nextThreshold = tier === "LAB_STANDARD" ? policy.plusThreshold : tier === "LAB_PLUS" ? policy.priorityThreshold : null;
  const previousThreshold = tier === "LAB_PLUS" ? policy.plusThreshold : 0;
  const progress = nextThreshold === null ? 100
    : Math.max(0, Math.min(100, (totalSpendVnd - previousThreshold) / (nextThreshold - previousThreshold) * 100));
  return {
    tier, points: Math.floor(totalSpendVnd / 10000), discountBps, totalSpendVnd, completedBookings,
    basis: "SPEND", progress, nextTier, nextThreshold,
    remainingToNext: nextThreshold === null ? 0 : Math.max(0, nextThreshold - totalSpendVnd),
    policyVersion: policy.version, enabled: policy.enabled
  };
}

export async function getVerifiedSpend(client, userId) {
  // Settlement evidence must belong to this owner and a real, eligible booking.
  // Float legacy money rows are constrained to integral, matching VND fees.
  const [stats] = await client.$queryRaw`
    SELECT COALESCE(SUM(p.amount), 0)::double precision AS "totalSpendVnd",
      COUNT(*)::integer AS "successfulPayments", MAX(p."paidAt") AS "lastPaidAt"
    FROM payment_transactions p JOIN bookings b ON b.id = p."bookingId"
    WHERE p."userId" = ${userId} AND b."requestedById" = ${userId}
      AND p.status = 'success' AND p.currency = 'VND' AND p."paidAt" IS NOT NULL
      AND p.provider IN ('vnpay', 'vietqr') AND p."reconciliationStatus" = 'none'
      AND b.status NOT IN ('CANCELLED', 'REJECTED')
      AND p.amount > 0 AND p.amount <= 2000000000 AND p.amount = b."feeAmountVnd"
  `;
  const totalSpendVnd = Number(stats.totalSpendVnd);
  if (!Number.isSafeInteger(totalSpendVnd) || totalSpendVnd < 0) {
    throw new HttpError(503, "Verified spending is unavailable", undefined, "LOYALTY_UNAVAILABLE");
  }
  return { totalSpendVnd, successfulPayments: Number(stats.successfulPayments), lastPaidAt: stats.lastPaidAt || null };
}

export async function getUserLoyalty(client, userId, { lockPolicy = false } = {}) {
  const user = await client.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true, deletedAt: true } });
  if (!user || !user.isActive || user.deletedAt) throw new HttpError(401, "Account is inactive", undefined, "ACCOUNT_INACTIVE");
  const [policy, spending, completedBookings] = await Promise.all([
    getLoyaltyPolicy(client, { lock: lockPolicy }), getVerifiedSpend(client, userId),
    client.booking.count({ where: { requestedById: userId, status: "COMPLETED" } })
  ]);
  return deriveLoyalty({ ...spending, completedBookings, role: user.role }, policy);
}

export async function updateLoyaltyPolicy(client, actor, input) {
  if (actor?.role !== ADMIN) throw new HttpError(403, "Administrator access required", undefined, "FORBIDDEN");
  const { expectedVersion, ...data } = loyaltyPolicySchema.parse(input);
  return client.$transaction(async tx => {
    // Use the same lock as account changes so role/session revocation cannot race
    // between the current administrator check and the audited policy mutation.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('lrm-account-security'))::text`;
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    if (!current || !current.isActive || current.deletedAt || current.authVersion !== actor.authVersion) {
      throw new HttpError(401, "Session has changed", undefined, "AUTH_INVALID");
    }
    if (current.role !== ADMIN) throw new HttpError(403, "Administrator access required", undefined, "FORBIDDEN");
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('loyalty_policy:SYSTEM', 0))::text AS locked`;
    await tx.loyaltyPolicy.upsert({ where: { id: "SYSTEM" }, create: DEFAULT_LOYALTY_POLICY, update: {} });
    await tx.$queryRaw`SELECT id FROM loyalty_policy WHERE id = 'SYSTEM' FOR UPDATE`;
    const before = await getLoyaltyPolicy(tx);
    if (before.version !== expectedVersion) {
      throw new HttpError(409, "Loyalty policy changed; refresh before saving", { policy: before }, "LOYALTY_POLICY_CHANGED");
    }
    const policy = await tx.loyaltyPolicy.update({ where: { id: "SYSTEM" }, data: { ...data, version: { increment: 1 } } });
    await recordSystemAuditEvent(tx, {
      actor: current, action: "LOYALTY_POLICY_CHANGED", targetType: "LOYALTY_POLICY", targetId: "SYSTEM",
      beforeState: Object.fromEntries(Object.keys(DEFAULT_LOYALTY_POLICY).map(key => [key, before[key]])),
      afterState: Object.fromEntries(Object.keys(DEFAULT_LOYALTY_POLICY).map(key => [key, policy[key]])),
      metadata: { basis: "SPEND" }
    });
    return policy;
  });
}
