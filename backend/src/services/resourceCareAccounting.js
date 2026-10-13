import { HttpError } from "../middleware/errors.js";
import { careStatus, bookingCareUsage } from "./resourceCareModel.js";

export async function assertCareReady(tx, resourceId, now = new Date()) {
  const resource = await tx.resource.findUnique({ where: { id: resourceId }, select: { careInspectionRequired: true } });
  if (resource?.careInspectionRequired) throw new HttpError(409, "Post-maintenance inspection is required", undefined, "RESOURCE_INSPECTION_REQUIRED");
  const profile = await tx.resourceCareProfile.findUnique({ where: { resourceId } });
  if (!profile) return;
  if (profile.roomId) {
    const room = await tx.resource.findUnique({ where: { id: profile.roomId }, select: { operationalStatus: true, careInspectionRequired: true } });
    if (!room || room.careInspectionRequired || ["BROKEN", "MAINTENANCE", "CALIBRATION", "RETIRED", "OFFLINE"].includes(room.operationalStatus)) throw new HttpError(409, "Containing room unavailable", undefined, "RESOURCE_ROOM_UNAVAILABLE");
  }
  const bookings = await tx.booking.findMany({ where: { resourceId, actualStartAt: { not: null }, OR: [{ actualEndAt: null }, { actualEndAt: { gt: profile.servicedAt } }, { actualStartAt: { gte: profile.servicedAt } }] }, select: { actualStartAt: true, actualEndAt: true } });
  const usage = bookingCareUsage(bookings, now, profile.servicedAt);
  if (careStatus(profile, usage.hours, now, usage.uses).due) throw new HttpError(409, "Resource maintenance is due before further use", undefined, "RESOURCE_MAINTENANCE_DUE");
  if (await tx.resourcePart.count({ where: { resourceId, condition: "BROKEN" } })) throw new HttpError(409, "A resource component is broken", undefined, "RESOURCE_COMPONENT_BROKEN");
}

// Caller holds the resource row lock. Stops run accounting on return or physical-state change.
export async function stopResourceOperation(tx, resourceId, reason, now = new Date()) {
  await tx.resourceOperation.updateMany({ where: { resourceId, endedAt: null }, data: { endedAt: now, activeResourceId: null, stopReason: reason } });
}
