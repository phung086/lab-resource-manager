import { randomUUID } from "node:crypto";
import { careStatus, bookingCareUsage } from "./resourceCareModel.js";

export async function dispatchMaintenanceNotices(client, now = new Date()) {
  const profiles = await client.resourceCareProfile.findMany({ select: { resourceId: true } });
  let created = 0;
  for (const { resourceId } of profiles) created += await client.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
    const profile = await tx.resourceCareProfile.findUnique({ where: { resourceId }, include: { resource: { include: {
      bookings: { where: { actualStartAt: { not: null } }, select: { actualStartAt: true, actualEndAt: true } }
    } } } });
    if (!profile || profile.resource.operationalStatus === "RETIRED") return 0;
    const { resource } = profile;
    const usage = bookingCareUsage(resource.bookings, now, profile.servicedAt);
    const state = careStatus(profile, usage.hours, now, usage.uses);
    const previous = { readAt: null, messageParams: { path: ["resourceId"], equals: resourceId }, titleKey: { in: state.due ? ["care.near.title"] : ["care.near.title", "care.due.title"] } };
    if (!state.due && !state.nearDue) { await tx.notification.updateMany({ where: previous, data: { readAt: now } }); return 0; }
    if (state.due) await tx.notification.updateMany({ where: previous, data: { readAt: now } });
    const stage = state.due ? "due" : "near";
    const recipients = await tx.user.findMany({ where: { isActive: true, OR: [{ role: "ADMIN" }, ...(resource.laboratoryId ? [{ role: "LAB_STAFF", labAssignments: { some: { laboratoryId: resource.laboratoryId } } }] : [])] }, select: { id: true } });
    let count = 0;
    for (const recipient of recipients) {
      const key = `care:${resource.id}:${profile.servicedAt.toISOString()}:${stage}:${recipient.id}`;
      const result = await tx.notification.createMany({ skipDuplicates: true, data: [{ id: randomUUID(), userId: recipient.id, title: state.due ? "Đến hạn bảo trì" : "Sắp đến hạn bảo trì", message: resource.name, titleKey: `care.${stage}.title`, messageKey: "care.message", messageParams: { resourceId: resource.id, laboratoryId: resource.laboratoryId, resourceName: resource.name, progress: Math.round(state.progressPercent), hours: Math.round(usage.hours * 10) / 10, uses: usage.uses }, severity: state.due ? "danger" : "warning", sentAt: now, dedupeKey: key }] });
      count += result.count;
    }
    return count;
  });
  return created;
}
