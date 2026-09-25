import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

const FULL_HISTORY_ROLES = new Set([ADMIN, LAB_STAFF]);

export async function getResourceHistory(client, resourceId) {
  const resource = await client.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, code: true, name: true, laboratoryId: true }
  });
  if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");

  const [statusRows, usageRows, bookings, maintenance, incidents] = await Promise.all([
    client.resourceStatusHistory.findMany({ where: { resourceId }, orderBy: { createdAt: "desc" }, take: 100 }),
    client.usageLog.findMany({
      where: { resourceId },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    client.booking.findMany({
      where: { resourceId },
      select: { id: true, requestedById: true, status: true, startAt: true, endAt: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    client.maintenanceWindow.findMany({
      where: { resourceId },
      select: {
        id: true, kind: true, status: true, title: true, startAt: true, endAt: true, createdAt: true,
        createdBy: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    client.incident.findMany({
      where: { resourceId },
      select: {
        id: true, severity: true, status: true, title: true, detectedAt: true,
        reportedBy: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { detectedAt: "desc" },
      take: 100
    })
  ]);

  const actorIds = [...new Set(statusRows.map((row) => row.changedById).filter(Boolean))];
  const actors = actorIds.length
    ? await client.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, role: true } })
    : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  const timeline = [
    ...statusRows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      eventType: "OPERATIONAL_STATUS_CHANGED",
      source: "resource_status_history",
      actor: actorById.get(row.changedById) || null,
      reference: { resourceStatusHistoryId: row.id },
      data: { fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason || null }
    })),
    ...usageRows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      eventType: row.action,
      source: "usage_log",
      actor: row.user || null,
      ownerId: row.userId,
      reference: { usageLogId: row.id, bookingId: row.bookingId || null },
      data: { message: row.message, reason: row.reason || null, metadata: row.metadata || {} }
    })),
    ...bookings.map((row) => ({
      id: `booking:${row.id}`,
      timestamp: row.createdAt.toISOString(),
      eventType: "BOOKING_RECORDED",
      source: "booking",
      actor: null,
      ownerId: row.requestedById,
      reference: { bookingId: row.id },
      data: { status: row.status, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
    })),
    ...maintenance.map((row) => ({
      id: `maintenance:${row.id}`,
      timestamp: row.createdAt.toISOString(),
      eventType: "MAINTENANCE_RECORDED",
      source: "maintenance_window",
      actor: row.createdBy || null,
      reference: { maintenanceWindowId: row.id },
      data: { kind: row.kind, status: row.status, title: row.title, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() }
    })),
    ...incidents.map((row) => ({
      id: `incident:${row.id}`,
      timestamp: row.detectedAt.toISOString(),
      eventType: "INCIDENT_RECORDED",
      source: "incident",
      actor: row.reportedBy || null,
      reference: { incidentId: row.id },
      data: { severity: row.severity, status: row.status, title: row.title }
    }))
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { resource, timeline };
}

function safeEventId(event, index) {
  return `safe:${event.eventType}:${event.timestamp}:${index}`;
}

function projectSafeEvent(event, actor, index) {
  if (event.source === "resource_status_history") {
    return {
      id: safeEventId(event, index), timestamp: event.timestamp, eventType: event.eventType,
      source: "operational_status", actor: null, reference: {},
      data: { fromStatus: event.data.fromStatus, toStatus: event.data.toStatus }
    };
  }
  if (event.source === "maintenance_window") {
    return {
      id: safeEventId(event, index), timestamp: event.timestamp, eventType: event.eventType,
      source: "maintenance_window", actor: null, reference: {},
      data: {
        kind: event.data.kind, status: event.data.status,
        startAt: event.data.startAt, endAt: event.data.endAt
      }
    };
  }
  if (event.source === "booking" && event.ownerId === actor.id) {
    return {
      id: safeEventId(event, index), timestamp: event.timestamp, eventType: event.eventType,
      source: "booking", actor: null,
      reference: { bookingId: event.reference.bookingId }, data: { ...event.data }
    };
  }
  if (event.source === "usage_log" && event.ownerId === actor.id && event.reference.bookingId) {
    return {
      id: safeEventId(event, index), timestamp: event.timestamp, eventType: event.eventType,
      source: "booking_activity", actor: null,
      reference: { bookingId: event.reference.bookingId }, data: {}
    };
  }
  return null;
}

export function projectResourceHistoryForActor(rawHistory, actor, { staffHasAccess = false } = {}) {
  if (actor.role === LAB_STAFF && !staffHasAccess) {
    throw new HttpError(403, "Access denied: resource is outside your assigned laboratories", undefined, "FORBIDDEN");
  }
  if (FULL_HISTORY_ROLES.has(actor.role)) {
    return {
      resource: rawHistory.resource,
      projection: "FULL_OPERATIONAL_PROVENANCE",
      timeline: rawHistory.timeline.map(({ ownerId: _ownerId, ...event }) => event)
    };
  }

  return {
    resource: { id: rawHistory.resource.id, code: rawHistory.resource.code, name: rawHistory.resource.name },
    projection: "SAFE_OPERATIONAL_TIMELINE",
    timeline: rawHistory.timeline.map((event, index) => projectSafeEvent(event, actor, index)).filter(Boolean)
  };
}
