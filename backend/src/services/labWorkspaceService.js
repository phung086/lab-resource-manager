import crypto from "node:crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { recordSystemAuditEvent } from "./systemAuditService.js";

const fail = (status, code, message) => { throw new HttpError(status, message, undefined, code); };
export const resourceScope = actor => actor.role === "ADMIN" ? {} : { laboratory: { staffAssignments: { some: { userId: actor.id } } } };
const identity = { id: true, fullName: true };
const activityInclude = { booking: { select: { id: true, title: true, startAt: true, endAt: true, status: true, requestedById: true, requestedBy: { select: identity }, resource: { select: { code: true, name: true } } } } };

export async function assertWorkspaceResource(tx, actor, resourceId) {
  if (!["ADMIN", "LAB_STAFF"].includes(actor.role)) fail(403, "FORBIDDEN", "This operation requires LAB staff.");
  const resource = await tx.resource.findFirst({ where: { id: resourceId, ...resourceScope(actor) } });
  if (!resource) fail(403, "FORBIDDEN", "Resource is outside your laboratory scope.");
  return resource;
}

export async function listStock(actor) {
  if (!["ADMIN", "LAB_STAFF"].includes(actor.role)) fail(403, "FORBIDDEN", "Stock is available to LAB staff only.");
  return prisma.resource.findMany({ where: { category: "MATERIAL", ...resourceScope(actor) }, select: { id: true, code: true, name: true, laboratoryId: true, stockItem: true }, orderBy: { code: "asc" } });
}

export async function stockHistory(actor, resourceId) {
  await assertWorkspaceResource(prisma, actor, resourceId);
  return prisma.stockMovement.findMany({ where: { resourceId }, include: { actor: { select: identity }, maintenance: { select: { id: true, title: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
}

export async function recordStock(actor, data) {
  if (data.kind === "ADJUSTMENT" && actor.role !== "ADMIN") fail(403, "FORBIDDEN", "Only administrators approve inventory count adjustments.");
  return prisma.$transaction(async tx => {
    if (data.maintenanceId) await tx.$queryRaw`SELECT id FROM maintenance_windows WHERE id = ${data.maintenanceId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${data.resourceId} FOR UPDATE`;
    const resource = await assertWorkspaceResource(tx, actor, data.resourceId);
    if (resource.category !== "MATERIAL") fail(400, "STOCK_CATEGORY", "Only consumable materials use the stock ledger. Track equipment through handover and return.");
    const previous = await tx.stockMovement.findUnique({ where: { id: data.id } });
    const delta = data.kind === "ISSUE" ? -data.quantity : data.quantity;
    if (previous) {
      const item = await tx.stockItem.findUnique({ where: { resourceId: previous.resourceId } });
      if (item?.unit !== data.unit || previous.actorId !== actor.id || previous.resourceId !== data.resourceId || previous.kind !== data.kind || previous.delta !== delta || previous.reason !== data.reason || previous.reference !== data.reference || previous.maintenanceId !== (data.maintenanceId || null)) fail(409, "IDEMPOTENCY_CONFLICT", "This request ID was used for another movement.");
      return previous;
    }
    if (data.maintenanceId) {
      const maintenance = await tx.maintenanceWindow.findUnique({ where: { id: data.maintenanceId }, include: { resource: true } });
      if (!maintenance || maintenance.resource.laboratoryId !== resource.laboratoryId || !resource.laboratoryId) fail(400, "MAINTENANCE_SCOPE", "Maintenance and stock must belong to the same laboratory.");
      if (data.kind !== "ISSUE" || !["scheduled", "in_progress"].includes(maintenance.status)) fail(409, "MAINTENANCE_CLOSED", "Only an open maintenance job can receive a material issue.");
    }
    let item = await tx.stockItem.findUnique({ where: { resourceId: data.resourceId } });
    if (!item) {
      if (data.kind !== "RECEIPT") fail(409, "STOCK_NOT_INITIALIZED", "Record the verified opening receipt and its unit first.");
      item = await tx.stockItem.create({ data: { resourceId: data.resourceId, unit: data.unit } });
    }
    if (item.unit !== data.unit) fail(409, "STOCK_UNIT", "The stock unit cannot change after initialization.");
    const balance = item.balance + delta;
    if (balance < 0 || !Number.isSafeInteger(balance) || balance > 2147483647) fail(409, "INSUFFICIENT_STOCK", "The movement would produce an invalid or negative stock balance.");
    await tx.stockItem.update({ where: { resourceId: item.resourceId }, data: { balance } });
    const movement = await tx.stockMovement.create({ data: { id: data.id, resourceId: item.resourceId, actorId: actor.id, kind: data.kind, delta, balanceAfter: balance, reason: data.reason, reference: data.reference, maintenanceId: data.maintenanceId || null } });
    await recordSystemAuditEvent(tx, { actor, action: "STOCK_MOVEMENT_RECORDED", targetType: "STOCK", targetId: movement.id, labId: resource.laboratoryId, resourceId: resource.id, beforeState: { balance: item.balance }, afterState: { balance, delta, unit: item.unit }, reason: data.reason });
    return movement;
  });
}

const groupScope = actor => actor.role === "ADMIN" ? {} : actor.role === "LECTURER" ? { lecturerId: actor.id } : { members: { some: { userId: actor.id } } };
async function groupAccess(tx, actor, groupId, manage = false) {
  if (!["ADMIN", "LECTURER", "STUDENT"].includes(actor.role) || (manage && actor.role === "STUDENT")) fail(403, "FORBIDDEN", "You cannot manage this teaching group.");
  const group = await tx.teachingGroup.findFirst({ where: { id: groupId, ...groupScope(actor) } });
  if (!group) fail(403, "FORBIDDEN", "Teaching group is outside your assigned scope.");
  return group;
}
export async function listTeachingGroups(actor) {
  if (!["ADMIN", "LECTURER", "STUDENT"].includes(actor.role)) fail(403, "FORBIDDEN", "Teaching groups are available to their participants only.");
  return prisma.teachingGroup.findMany({ where: groupScope(actor), include: { lecturer: { select: identity }, _count: { select: { members: true, activities: true } } }, orderBy: { createdAt: "desc" } });
}
export async function teachingGroupDetail(actor, groupId) {
  const group = await groupAccess(prisma, actor, groupId);
  const manager = actor.role !== "STUDENT";
  const [members, activities] = await Promise.all([
    prisma.teachingMembership.findMany({ where: { groupId, ...(manager ? {} : { userId: actor.id }) }, include: { user: { select: identity } }, orderBy: { joinedAt: "asc" } }),
    prisma.teachingActivity.findMany({ where: { groupId, ...(manager ? {} : { booking: { requestedById: actor.id } }) }, include: activityInclude, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return { ...group, members, activities };
}
export async function createTeachingGroup(actor, data) {
  if (actor.role !== "ADMIN") fail(403, "FORBIDDEN", "Only administrators assign teaching groups.");
  return prisma.$transaction(async tx => {
    const lecturer = await tx.user.findFirst({ where: { email: data.lecturerEmail.toLowerCase(), role: "LECTURER", isActive: true } });
    if (!lecturer) fail(400, "LECTURER_NOT_FOUND", "An active lecturer account with this email is required.");
    if (await tx.teachingGroup.findUnique({ where: { code: data.code } })) fail(409, "GROUP_CODE_EXISTS", "This class code is already in use.");
    const group = await tx.teachingGroup.create({ data: { id: crypto.randomUUID(), code: data.code, name: data.name, term: data.term, lecturerId: lecturer.id } });
    await recordSystemAuditEvent(tx, { actor, action: "TEACHING_GROUP_CREATED", targetType: "TEACHING_GROUP", targetId: group.id, afterState: { code: group.code, lecturerId: lecturer.id } });
    return group;
  });
}
export async function changeGroupMember(actor, groupId, data) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teaching_groups WHERE id = ${groupId} FOR UPDATE`;
    const group = await groupAccess(tx, actor, groupId, true);
    if (group.archived) fail(409, "GROUP_ARCHIVED", "This group is archived.");
    const student = await tx.user.findFirst({ where: { email: data.email.toLowerCase(), role: "STUDENT", isActive: true } });
    if (!student) fail(400, "STUDENT_NOT_FOUND", "An active student account with this email is required.");
    const where = { groupId_userId: { groupId, userId: student.id } };
    if (await tx.teachingMembership.findUnique({ where })) return { userId: student.id, fullName: student.fullName };
    await tx.teachingMembership.create({ data: { groupId, userId: student.id } });
    await recordSystemAuditEvent(tx, { actor, action: "TEACHING_MEMBER_ADDED", targetType: "TEACHING_GROUP", targetId: groupId, afterState: { userId: student.id } });
    return { userId: student.id, fullName: student.fullName };
  });
}
export async function submitTeachingActivity(actor, groupId, data) {
  if (actor.role !== "STUDENT") fail(403, "FORBIDDEN", "Students submit their own practical activities.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teaching_groups WHERE id = ${groupId} FOR UPDATE`;
    const group = await groupAccess(tx, actor, groupId);
    if (group.archived) fail(409, "GROUP_ARCHIVED", "This group is archived.");
    const booking = await tx.booking.findFirst({ where: { id: data.bookingId, requestedById: actor.id } });
    if (!booking) fail(403, "FORBIDDEN", "Only your own booking may be submitted.");
    if (["REJECTED", "CANCELLED"].includes(booking.status)) fail(409, "ACTIVITY_BOOKING_CLOSED", "A rejected or cancelled booking cannot start a teaching activity.");
    const previous = await tx.teachingActivity.findUnique({ where: { bookingId: booking.id } });
    if (previous) fail(409, "ACTIVITY_EXISTS", "This booking has already been submitted to a teaching group.");
    const activity = await tx.teachingActivity.create({ data: { id: crypto.randomUUID(), groupId, bookingId: booking.id, learningGoal: data.learningGoal } });
    await recordSystemAuditEvent(tx, { actor, action: "TEACHING_ACTIVITY_SUBMITTED", targetType: "TEACHING_GROUP", targetId: groupId, afterState: { activityId: activity.id, bookingId: booking.id } });
    return activity;
  });
}

export async function reviseTeachingActivity(actor, groupId, activityId, data) {
  if (actor.role !== "STUDENT") fail(403, "FORBIDDEN", "Students revise their own practical activities.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teaching_groups WHERE id = ${groupId} FOR UPDATE`;
    const group = await groupAccess(tx, actor, groupId);
    if (group.archived) fail(409, "GROUP_ARCHIVED", "This group is archived.");
    const activity = await tx.teachingActivity.findFirst({ where: { id: activityId, groupId, booking: { requestedById: actor.id } } });
    if (!activity) fail(403, "FORBIDDEN", "Only your own activity may be revised.");
    if (activity.decision !== "CHANGES_REQUESTED") fail(409, "ACTIVITY_REVISION_NOT_REQUESTED", "This activity is not awaiting revision.");
    const updated = await tx.teachingActivity.update({ where: { id: activityId }, data: { learningGoal: data.learningGoal, decision: "SUBMITTED", feedback: null, reviewedAt: null } });
    await recordSystemAuditEvent(tx, { actor, action: "TEACHING_ACTIVITY_REVISED", targetType: "TEACHING_ACTIVITY", targetId: activityId, beforeState: { learningGoal: activity.learningGoal, feedback: activity.feedback, decision: activity.decision }, afterState: { learningGoal: data.learningGoal, decision: "SUBMITTED" } });
    return updated;
  });
}
export async function reviewTeachingActivity(actor, groupId, activityId, data) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teaching_groups WHERE id = ${groupId} FOR UPDATE`;
    const group = await groupAccess(tx, actor, groupId, true);
    if (group.archived) fail(409, "GROUP_ARCHIVED", "This group is archived.");
    const activity = await tx.teachingActivity.findFirst({ where: { id: activityId, groupId } });
    if (!activity) fail(404, "NOT_FOUND", "Activity was not found in this group.");
    const updated = await tx.teachingActivity.update({ where: { id: activity.id }, data: { ...data, reviewedAt: new Date() } });
    await recordSystemAuditEvent(tx, { actor, action: "TEACHING_ACTIVITY_REVIEWED", targetType: "TEACHING_ACTIVITY", targetId: activity.id, beforeState: { decision: activity.decision }, afterState: { decision: data.decision }, reason: data.feedback });
    return updated;
  });
}
