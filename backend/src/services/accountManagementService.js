import { ADMIN, LAB_STAFF, CUSTOMER } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { accountWrite, managedTarget, protectAdministrator } from "./accountAccess.js";
import { createManagedUser, safeUserSelect } from "./userService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "./systemAuditService.js";
import { enqueueRegistrationEmail } from "./emailAutomationService.js";

export const staffCustomerSelect = Object.freeze({
  id: true, email: true, fullName: true, role: true, isActive: true,
  deletedAt: true, phone: true, organization: true, createdAt: true,
});
const selectFor = actor => actor.role === ADMIN ? safeUserSelect : staffCustomerSelect;

async function lockAccountRemoval(tx, id) {
  // Dispatch/request uses this lock too; a removed account cannot enter the queue.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('support:dispatch'))::text`;
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  const open = await tx.supportSession.count({ where: { status: { in: ["WAITING", "ACTIVE"] },
    OR: [{ requesterId: id }, { assignedStaffId: id }] } });
  if (open) throw new HttpError(409, "Resolve open support first", undefined, "ACCOUNT_HAS_OPEN_SUPPORT");
}

export function createAccount(actor, input, locale) {
  return accountWrite(actor, async (tx, current) => {
    if (![ADMIN, LAB_STAFF].includes(current.role) || (current.role === LAB_STAFF && input.role !== CUSTOMER))
      throw new HttpError(403, "Cannot create this account role", undefined, "FORBIDDEN");
    const created = await createManagedUser(tx, input);
    await recordSystemAuditEvent(tx, { actor: current, action: AUDIT_ACTIONS.USER_CREATED, targetType: AUDIT_TARGET_TYPES.USER, targetId: created.id,
      afterState: { email: created.email, role: created.role, isActive: created.isActive } });
    await enqueueRegistrationEmail(tx, created, locale);
    return tx.user.findUnique({ where: { id: created.id }, select: selectFor(current) });
  });
}

export function editAccount(actor, id, changes) {
  return accountWrite(actor, async (tx, current) => {
    const target = await managedTarget(tx, current, id);
    const saved = await tx.user.update({ where: { id }, data: changes, select: selectFor(current) });
    const before = Object.fromEntries(Object.keys(changes).map(key => [key, target[key]]));
    await recordSystemAuditEvent(tx, { actor: current, action: AUDIT_ACTIONS.USER_PROFILE_CHANGED, targetType: AUDIT_TARGET_TYPES.USER, targetId: id,
      beforeState: before, afterState: changes });
    return saved;
  });
}

export function changeAccountRole(actor, id, role) {
  return accountWrite(actor, async (tx, current) => {
    if (current.role !== ADMIN) throw new HttpError(403, "Forbidden", undefined, "FORBIDDEN");
    const target = await managedTarget(tx, current, id);
    await protectAdministrator(tx, current, target, { role });
    if (role !== target.role) await lockAccountRemoval(tx, id);
    const saved = await tx.user.update({ where: { id }, data: { role, ...(role !== target.role ? { authVersion: { increment: 1 } } : {}) }, select: safeUserSelect });
    if (role !== LAB_STAFF) await tx.userLabAssignment.deleteMany({ where: { userId: id } });
    await recordSystemAuditEvent(tx, { actor: current, action: AUDIT_ACTIONS.USER_ROLE_CHANGED, targetType: AUDIT_TARGET_TYPES.USER, targetId: id,
      beforeState: { role: target.role }, afterState: { role }, metadata: { source: "admin_user_management" } });
    return saved;
  });
}

export function changeAccountActive(actor, id, isActive) {
  return accountWrite(actor, async (tx, current) => {
    const target = await managedTarget(tx, current, id);
    if (!isActive) await lockAccountRemoval(tx, id);
    if (current.role === ADMIN) await protectAdministrator(tx, current, target, { isActive });
    const saved = await tx.user.update({ where: { id }, data: { isActive,
      ...(isActive !== target.isActive ? { authVersion: { increment: 1 } } : {}) }, select: selectFor(current) });
    await recordSystemAuditEvent(tx, { actor: current, action: AUDIT_ACTIONS.USER_ACTIVATION_CHANGED, targetType: AUDIT_TARGET_TYPES.USER, targetId: id,
      beforeState: { isActive: target.isActive }, afterState: { isActive }, metadata: { source: "account_management" } });
    return saved;
  });
}

export function removeAccount(actor, id, reason) {
  return accountWrite(actor, async (tx, current) => {
    const target = await managedTarget(tx, current, id);
    await lockAccountRemoval(tx, id);
    if (current.role === ADMIN) await protectAdministrator(tx, current, target, { isActive: false });
    const active = await tx.booking.count({ where: { requestedById: id, status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"] } } });
    if (active) throw new HttpError(409, "Resolve active bookings first", undefined, "ACCOUNT_HAS_ACTIVE_BOOKINGS");
    const deletedAt = new Date();
    const saved = await tx.user.update({ where: { id }, data: { deletedAt, isActive: false, authVersion: { increment: 1 } }, select: selectFor(current) });
    await tx.passwordChallenge.updateMany({ where: { targetUserId: id, consumedAt: null }, data: { consumedAt: deletedAt } });
    await recordSystemAuditEvent(tx, { actor: current, action: AUDIT_ACTIONS.USER_REMOVED, targetType: AUDIT_TARGET_TYPES.USER, targetId: id, reason,
      beforeState: { isActive: target.isActive, deletedAt: null }, afterState: { isActive: false, deletedAt: deletedAt.toISOString() } });
    return saved;
  });
}
