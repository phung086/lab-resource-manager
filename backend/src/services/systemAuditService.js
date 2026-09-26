import crypto from "node:crypto";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

export const AUDIT_ACTIONS = Object.freeze({
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  USER_ACTIVATION_CHANGED: "USER_ACTIVATION_CHANGED",
  LAB_ASSIGNMENT_ADDED: "LAB_ASSIGNMENT_ADDED",
  LAB_ASSIGNMENT_REMOVED: "LAB_ASSIGNMENT_REMOVED",
  RESOURCE_PRICING_CHANGED: "RESOURCE_PRICING_CHANGED",
  GUEST_ACCOUNT_CREATED: "GUEST_ACCOUNT_CREATED",
  GUEST_ACCOUNT_REUSED: "GUEST_ACCOUNT_REUSED",
  PAYMENT_CHARGE_CREATED: "PAYMENT_CHARGE_CREATED"
});

export const AUDIT_TARGET_TYPES = Object.freeze({
  USER: "USER",
  LAB_ASSIGNMENT: "LAB_ASSIGNMENT",
  RESOURCE: "RESOURCE",
  PRICING_RULE: "PRICING_RULE",
  PAYMENT: "PAYMENT"
});

/**
 * Sanitizes state and metadata objects before persistence to guarantee
 * passwords, OTP hashes, auth tokens and provider secrets can never enter
 * the audit trail.
 */
export function sanitizeAuditData(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeAuditData);
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (/password|secret|token|otp|codeHash|hash/i.test(key)) continue;
    result[key] = typeof value === "object" && value !== null ? sanitizeAuditData(value) : value;
  }
  return result;
}

/**
 * Persists an immutable system audit record inside the given Prisma transaction.
 * Security principle: if audit insertion fails, the entire transaction rolls back.
 */
export async function recordSystemAuditEvent(tx, {
  actor,
  action,
  targetType,
  targetId,
  labId = null,
  resourceId = null,
  beforeState = null,
  afterState = null,
  reason = null,
  metadata = {}
}) {
  if (!tx || typeof tx.systemAuditEvent?.create !== "function") {
    throw new Error("Active database transaction is required to write system audit events");
  }

  const actorId = actor?.id || null;
  const actorRoleSnapshot = actor?.role || null;

  return tx.systemAuditEvent.create({
    data: {
      id: crypto.randomUUID(),
      actorId,
      actorRoleSnapshot,
      action,
      targetType,
      targetId: String(targetId),
      labId,
      resourceId,
      beforeState: beforeState ? sanitizeAuditData(beforeState) : null,
      afterState: afterState ? sanitizeAuditData(afterState) : null,
      reason: reason ? String(reason).trim().slice(0, 500) : null,
      metadata: metadata ? sanitizeAuditData(metadata) : {}
    }
  });
}

/**
 * Lists audit records with strict RBAC:
 * - ADMIN: full access across system.
 * - LAB_STAFF: access strictly scoped to their assigned laboratories.
 * - Ordinary users: fail closed with 403 FORBIDDEN.
 */
export async function listSystemAuditEvents(client, actor, query = {}) {
  if (actor.role !== ADMIN && actor.role !== LAB_STAFF) {
    throw new HttpError(403, "Access denied: audit logs require administrative privileges", undefined, "FORBIDDEN");
  }

  const where = {};

  if (actor.role === LAB_STAFF) {
    const assignments = await client.userLabAssignment.findMany({
      where: { userId: actor.id },
      select: { laboratoryId: true }
    });
    const assignedLabIds = assignments.map(a => a.laboratoryId);
    if (assignedLabIds.length === 0) {
      throw new HttpError(403, "Access denied: you have no assigned laboratories", undefined, "NO_ASSIGNED_LABS");
    }

    if (query.labId) {
      if (!assignedLabIds.includes(query.labId)) {
        throw new HttpError(403, "Access denied: laboratory is outside your assigned scope", undefined, "FORBIDDEN");
      }
      where.labId = query.labId;
    } else {
      where.labId = { in: assignedLabIds };
    }
  } else if (query.labId) {
    where.labId = query.labId;
  }

  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;
  if (query.targetId) where.targetId = query.targetId;
  if (query.actorId) where.actorId = query.actorId;
  if (query.resourceId) where.resourceId = query.resourceId;

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    client.systemAuditEvent.count({ where }),
    client.systemAuditEvent.findMany({
      where,
      include: {
        actor: { select: { id: true, fullName: true, role: true } },
        laboratory: { select: { id: true, code: true, name: true } },
        resource: { select: { id: true, code: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    })
  ]);

  return {
    events: rows.map(row => ({
      id: row.id,
      actorId: row.actorId,
      actorRoleSnapshot: row.actorRoleSnapshot,
      actor: row.actor ? { id: row.actor.id, fullName: row.actor.fullName, role: row.actor.role } : null,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      labId: row.labId,
      laboratory: row.laboratory ? { id: row.laboratory.id, code: row.laboratory.code, name: row.laboratory.name } : null,
      resourceId: row.resourceId,
      resource: row.resource ? { id: row.resource.id, code: row.resource.code, name: row.resource.name } : null,
      beforeState: row.beforeState,
      afterState: row.afterState,
      reason: row.reason,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString()
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
