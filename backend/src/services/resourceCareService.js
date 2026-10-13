import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { recordSystemAuditEvent } from "./systemAuditService.js";
import { applyOperationalStatusChange } from "./resourceService.js";
import { createIncident, OPEN_INCIDENT_STATUSES } from "./incidentService.js";
import { careStatus, operationTotals, bookingCareUsage } from "./resourceCareModel.js";
import { assertCareReady, stopResourceOperation } from "./resourceCareAccounting.js";

const categories = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT"];
const fail = (code, message) => { throw new HttpError(409, message, undefined, code); };
const scope = actor => actor.role === "ADMIN" ? {} : { laboratory: { staffAssignments: { some: { userId: actor.id } } } };
function operator(actor) {
  if (!["ADMIN", "LAB_STAFF"].includes(actor.role)) throw new HttpError(403, "Operator access required", undefined, "FORBIDDEN");
}
async function access(tx, actor, resourceId) {
  operator(actor);
  const resource = await tx.resource.findFirst({ where: { id: resourceId, ...scope(actor) } });
  if (!resource || !categories.includes(resource.category) || resource.specs?.monitoringSimulation) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
  return resource;
}
export async function listResourceCare(actor, client = prisma) {
  operator(actor);
  const now = new Date();
  const resources = await client.resource.findMany({ where: { category: { in: categories }, ...scope(actor) }, orderBy: { code: "asc" }, include: {
    laboratory: { select: { id: true, name: true } }, careProfile: true, parts: { orderBy: { name: "asc" } },
    operationSessions: { orderBy: { startedAt: "desc" } },
    bookings: { where: { actualStartAt: { not: null } }, select: { id: true, bookingCode: true, status: true, actualStartAt: true, actualEndAt: true, endAt: true } },
    incidents: { where: { status: { in: OPEN_INCIDENT_STATUSES }, origin: { not: "SIMULATED" } }, select: { id: true, title: true, status: true } },
    maintenanceWindows: { where: { status: { in: ["scheduled", "in_progress", "completed"] } }, orderBy: { endAt: "desc" }, take: 20 }
  } });
  return { generatedAt: now, items: resources.filter(r => !r.specs?.monitoringSimulation).map(r => {
    const lifetime = operationTotals(r.operationSessions, now);
    const sinceService = bookingCareUsage(r.bookings, now, r.careProfile?.servicedAt || new Date(0));
    const custodyHours = bookingCareUsage(r.bookings, now).hours;
    return { id: r.id, code: r.code, name: r.name, category: r.category, capacity: r.capacity, operationalStatus: r.operationalStatus, laboratory: r.laboratory,
      profile: r.careProfile, inspectionRequired: r.careInspectionRequired, parts: r.parts, incidents: r.incidents, maintenance: r.maintenanceWindows,
      checkedOutBooking: r.bookings.find(b => b.status === "CHECKED_OUT") || null,
      activeOperation: r.operationSessions.find(s => !s.endedAt) || null,
      history: r.operationSessions.slice(0, 20), lifetime, sinceService, custodyHours,
      dutyPercent: custodyHours > 0 ? Math.min(100, lifetime.hours / custodyHours * 100) : null,
      care: careStatus(r.careProfile, sinceService.hours, now, sinceService.uses) };
  }) };
}

export async function commandResourceCare(actor, resourceId, command, client = prisma) {
  return client.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
    const resource = await access(tx, actor, resourceId);
    const now = new Date();
    const profile = await tx.resourceCareProfile.findUnique({ where: { resourceId } });
    let result;
    if (command.action === "CONFIGURE") {
      if (command.roomId) {
        const room = await access(tx, actor, command.roomId);
        if (room.category !== "ROOM" || room.id === resource.id || room.laboratoryId !== resource.laboratoryId || resource.category === "ROOM") fail("RESOURCE_ROOM_INVALID", "Select a room in the same laboratory");
      }
      // Existing service baseline is never reset by policy edits.
      const policy = { roomId: command.roomId, intervalDays: command.intervalDays, intervalHours: command.intervalHours, ...(command.intervalUses !== undefined ? { intervalUses: command.intervalUses } : {}), ...(command.warningPercent !== undefined ? { warningPercent: command.warningPercent } : {}) };
      result = await tx.resourceCareProfile.upsert({ where: { resourceId }, create: { resourceId, ...policy, servicedAt: now }, update: policy });
    } else if (command.action === "START" || command.action === "LOAD") {
      if (!profile) fail("RESOURCE_CARE_REQUIRED", "Configure the resource maintenance policy first");
      await assertCareReady(tx, resourceId, now);
      if (profile.roomId) {
        const room = await tx.resource.findUnique({ where: { id: profile.roomId } });
        if (!room || ["BROKEN", "MAINTENANCE", "CALIBRATION", "RETIRED", "OFFLINE"].includes(room.operationalStatus)) fail("RESOURCE_ROOM_UNAVAILABLE", "The containing room is unavailable");
      }
      if (resource.operationalStatus !== "IN_USE") fail("RESOURCE_STATE_CONFLICT", "Resource must be handed over before use");
      const booking = await tx.booking.findFirst({ where: { resourceId, status: "CHECKED_OUT", actualStartAt: { not: null } } });
      if (!booking) fail("RESOURCE_HANDOVER_REQUIRED", "No checked-out booking for this resource");
      if (booking.endAt <= now) fail("RESOURCE_BOOKING_OVERDUE", "Return the overdue resource before starting another operation");
      if (await tx.maintenanceWindow.count({ where: { resourceId, status: { in: ["scheduled", "in_progress"] }, startAt: { lte: now }, endAt: { gt: now } } })) fail("RESOURCE_STATE_CONFLICT", "A maintenance window blocks operation");
      const active = await tx.resourceOperation.findUnique({ where: { activeResourceId: resourceId } });
      if (command.action === "START" && active) fail("RESOURCE_ALREADY_RUNNING", "Resource is already running");
      if (command.action === "LOAD" && !active) fail("RESOURCE_NOT_RUNNING", "Resource is not running");
      if (resource.category === "ROOM" && (!Number.isInteger(command.occupants) || command.occupants < 1 || command.occupants > resource.capacity)) fail("RESOURCE_CAPACITY_INVALID", "Room occupancy must be within its capacity");
      const loadPercent = resource.category === "ROOM" ? command.occupants / resource.capacity * 100 : command.loadPercent;
      if (loadPercent == null) fail("RESOURCE_LOAD_REQUIRED", "Set a machine workload percentage");
      await stopResourceOperation(tx, resourceId, "LOAD_CHANGED", now);
      result = await tx.resourceOperation.create({ data: { id: randomUUID(), resourceId, bookingId: booking.id, activeResourceId: resourceId, actorId: actor.id, loadPercent, occupants: resource.category === "ROOM" ? command.occupants : null, startedAt: now } });
    } else if (command.action === "STOP") {
      await stopResourceOperation(tx, resourceId, command.reason, now);
    } else if (command.action === "FAULT") {
      if (resource.operationalStatus === "RETIRED") fail("RESOURCE_STATE_CONFLICT", "Resource is retired");
      const booking = await tx.booking.findFirst({ where: { resourceId, status: "CHECKED_OUT" } });
      if (resource.operationalStatus !== "BROKEN") {
        result = await createIncident(tx, { actor, resourceId, bookingId: booking?.id, severity: "high", category: "RESOURCE_DAMAGE", title: `${resource.code}: ${command.reason.slice(0, 160)}`, description: command.reason, detectedAt: now });
        await applyOperationalStatusChange(tx, { resourceId, operationalStatus: "BROKEN", reason: command.reason, actor, lockResource: false });
      }
    } else if (command.action === "PART") {
      result = await tx.resourcePart.upsert({ where: { resourceId_name: { resourceId, name: command.name } }, create: { id: randomUUID(), resourceId, name: command.name, condition: command.condition, notes: command.reason }, update: { condition: command.condition, notes: command.reason } });
      if (command.condition === "BROKEN" && resource.operationalStatus !== "BROKEN") {
        if (resource.operationalStatus === "RETIRED") fail("RESOURCE_STATE_CONFLICT", "Resource is retired");
        result = await createIncident(tx, { actor, resourceId, severity: "high", category: "COMPONENT_DAMAGE", title: `${resource.code}: ${command.name}`, description: command.reason, detectedAt: now });
        await applyOperationalStatusChange(tx, { resourceId, operationalStatus: "BROKEN", reason: command.reason, actor, lockResource: false });
      }
    } else if (command.action === "BEGIN_MAINTENANCE") {
      const job = await tx.maintenanceWindow.findFirst({ where: { id: command.maintenanceId, resourceId, status: { in: ["scheduled", "in_progress"] }, startAt: { lte: now }, endAt: { gt: now } } });
      if (!job) fail("RESOURCE_MAINTENANCE_REQUIRED", "Select an open maintenance job within its time window");
      if (resource.operationalStatus === "RETIRED") fail("RESOURCE_STATE_CONFLICT", "Resource is retired");
      if (await tx.booking.count({ where: { resourceId, status: "CHECKED_OUT" } })) fail("RESOURCE_RETURN_REQUIRED", "Receive the resource before maintenance");
      await applyOperationalStatusChange(tx, { resourceId, operationalStatus: job.kind === "calibration" ? "CALIBRATION" : "MAINTENANCE", reason: command.reason, actor, lockResource: false });
      // The job workflow remains responsible for work progress and completion.
      result = { maintenanceId: job.id, operationalStatus: job.kind === "calibration" ? "CALIBRATION" : "MAINTENANCE" };
    } else if (command.action === "INSPECT") {
      if (!profile) fail("RESOURCE_CARE_REQUIRED", "Configure maintenance policy first");
      const job = await tx.maintenanceWindow.findFirst({ where: { id: command.maintenanceId, resourceId, status: "completed", updatedAt: { gt: profile.servicedAt } } });
      if (!job || profile.lastMaintenanceId === job.id) fail("RESOURCE_MAINTENANCE_REQUIRED", "Select a newly completed maintenance job");
      if (resource.operationalStatus === "RETIRED") fail("RESOURCE_STATE_CONFLICT", "Restore retired resource separately");
      if (await tx.booking.count({ where: { resourceId, status: "CHECKED_OUT" } })) fail("RESOURCE_RETURN_REQUIRED", "Receive the resource before inspection");
      if (await tx.incident.count({ where: { resourceId, status: { in: OPEN_INCIDENT_STATUSES } } }) || await tx.resourcePart.count({ where: { resourceId, condition: "BROKEN" } })) fail("RESOURCE_REPAIR_INCOMPLETE", "Resolve incidents and repair broken components first");
      await applyOperationalStatusChange(tx, { resourceId, operationalStatus: "AVAILABLE", reason: command.reason, actor, lockResource: false });
      await tx.resource.update({ where: { id: resourceId }, data: { careInspectionRequired: false } });
      result = await tx.resourceCareProfile.update({ where: { resourceId }, data: { servicedAt: now, lastMaintenanceId: job.id } });
      await tx.notification.updateMany({ where: { readAt: null, titleKey: { in: ["care.near.title", "care.due.title"] }, messageParams: { path: ["resourceId"], equals: resourceId } }, data: { readAt: now } });
    }
    await recordSystemAuditEvent(tx, { actor, action: `RESOURCE_CARE_${command.action}`, targetType: "RESOURCE", targetId: resourceId, resourceId, labId: resource.laboratoryId, reason: command.reason, beforeState: profile ? JSON.parse(JSON.stringify(profile)) : null, afterState: result ? JSON.parse(JSON.stringify(result)) : { stopped: true }, metadata: { mode: "VIRTUAL_OPERATION", command } });
    return { ok: true };
  });
}
