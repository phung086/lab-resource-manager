import { bookingCareUsage } from "./resourceCareModel.js";
import { dispatchMaintenanceNotices } from "./resourceCareNoticeService.js";
import { stopResourceOperation } from "./resourceCareAccounting.js";

export async function enforceOperationLimits(client, now = new Date()) {
  const active = await client.resourceOperation.findMany({ where: { endedAt: null }, select: { resourceId: true } });
  for (const { resourceId } of active) await client.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
    const current = await tx.resourceOperation.findUnique({ where: { activeResourceId: resourceId }, include: { booking: true, resource: { include: { careProfile: { include: { room: true } } } } } });
    if (!current) return;
    const { booking, resource } = current, profile = resource.careProfile;
    const cutoffs = [{ time: booking.endAt, reason: "BOOKING_ENDED" }];
    if (booking.actualEndAt) cutoffs.push({ time: booking.actualEndAt, reason: "BOOKING_RETURNED" });
    if (profile?.intervalDays) cutoffs.push({ time: new Date(+profile.servicedAt + profile.intervalDays * 86400000), reason: "MAINTENANCE_DUE" });
    if (profile?.intervalHours) {
      const bookings = await tx.booking.findMany({ where: { resourceId, actualStartAt: { not: null } }, select: { id: true, actualStartAt: true, actualEndAt: true } });
      const used = bookingCareUsage(bookings.filter(b => b.id !== booking.id), now, profile.servicedAt).hours;
      cutoffs.push({ time: new Date(Math.max(+booking.actualStartAt, +profile.servicedAt) + Math.max(0, profile.intervalHours - used) * 3600000), reason: "MAINTENANCE_DUE" });
    }
    if (resource.operationalStatus !== "IN_USE" || booking.status !== "CHECKED_OUT") cutoffs.push({ time: now, reason: "RESOURCE_UNAVAILABLE" });
    if (profile?.room && ["BROKEN", "MAINTENANCE", "CALIBRATION", "RETIRED", "OFFLINE"].includes(profile.room.operationalStatus)) cutoffs.push({ time: now, reason: "ROOM_UNAVAILABLE" });
    const first = cutoffs.sort((a, b) => +a.time - +b.time)[0];
    if (+first.time <= +now) await stopResourceOperation(tx, resourceId, first.reason, new Date(Math.max(+current.startedAt, +first.time)));
  });
}

export function startResourceOperationScheduler(client) {
  let pending = null, stopped = false;
  let lastNotices = 0;
  const tick = () => { if (!stopped && !pending) pending = (async () => { await enforceOperationLimits(client); if (Date.now() - lastNotices >= 30000) { await dispatchMaintenanceNotices(client); lastNotices = Date.now(); } })().catch(() => console.error("Resource operation limit enforcement failed")).finally(() => { pending = null; }); };
  tick(); const timer = setInterval(tick, 5000); timer.unref?.();
  return async () => { stopped = true; clearInterval(timer); await pending; };
}
