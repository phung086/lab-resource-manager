import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF, CUSTOMER } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

export async function accountWrite(actor, operation) {
  return prisma.$transaction(async tx => {
    // Serialize credential/account mutations, including the last-admin check.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('lrm-account-security'))::text`;
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    if (!current || !current.isActive || current.deletedAt || current.authVersion !== actor.authVersion)
      throw new HttpError(401, "Session has changed", undefined, "AUTH_INVALID");
    return operation(tx, current);
  });
}

export function canManageTarget(actor, target) {
  return actor.role === ADMIN || (actor.role === LAB_STAFF && target.role === CUSTOMER);
}

export async function lockCurrentAccount(tx, id, expectedVersion) {
  // Serialize account/credential changes while allowing foreign-key references
  // from expiry notifications to another customer's account in the same flow.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR NO KEY UPDATE`;
  const user = await tx.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(401, "Account not found", undefined, "AUTH_INVALID");
  if (!user.isActive || user.deletedAt) throw new HttpError(401, "Account inactive", undefined, "ACCOUNT_INACTIVE");
  if (expectedVersion !== undefined && user.authVersion !== expectedVersion)
    throw new HttpError(401, "Session has changed", undefined, "AUTH_INVALID");
  return user;
}

export async function managedTarget(tx, actor, id, { allowDeleted = false } = {}) {
  const target = await tx.user.findUnique({ where: { id } });
  if (!target || !canManageTarget(actor, target))
    throw new HttpError(404, "Account not found", undefined, "NOT_FOUND");
  if (target.deletedAt && !allowDeleted)
    throw new HttpError(409, "Account removed", undefined, "ACCOUNT_REMOVED");
  return target;
}

export async function protectAdministrator(tx, actor, target, { role = target.role, isActive = target.isActive } = {}) {
  if (target.id === actor.id && (role !== ADMIN || !isActive))
    throw new HttpError(409, "Cannot disable your own administrator account", undefined, "SELF_LOCKOUT_FORBIDDEN");
  if (target.role === ADMIN && target.isActive && (role !== ADMIN || !isActive)) {
    const count = await tx.user.count({ where: { role: ADMIN, isActive: true, deletedAt: null } });
    if (count <= 1) throw new HttpError(409, "An active administrator is required", undefined, "LAST_ADMIN_FORBIDDEN");
  }
}
