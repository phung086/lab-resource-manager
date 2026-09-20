import crypto from "crypto";

import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

export const OPEN_INCIDENT_STATUSES = ["reported", "triaged", "assigned", "investigating"];

export function incidentScopeWhere(user) {
  if (user.role === ADMIN) return {};
  if (user.role === LAB_STAFF) {
    return {
      resource: {
        laboratory: { staffAssignments: { some: { userId: user.id } } }
      }
    };
  }
  return { reportedById: user.id };
}

async function assertIncidentOperatorScope(tx, incident, actor) {
  if (actor.role === ADMIN) return;
  if (actor.role !== LAB_STAFF) {
    throw new HttpError(403, "Only ADMIN or LAB_STAFF can operate incidents", undefined, "FORBIDDEN");
  }
  const resource = await tx.resource.findUnique({
    where: { id: incident.resourceId },
    select: { laboratoryId: true }
  });
  if (!resource?.laboratoryId) {
    throw new HttpError(403, "Incident resource has no laboratory assignment", undefined, "FORBIDDEN");
  }
  const assignment = await tx.userLabAssignment.findUnique({
    where: {
      userId_laboratoryId: {
        userId: actor.id,
        laboratoryId: resource.laboratoryId
      }
    },
    select: { userId: true }
  });
  if (!assignment) {
    throw new HttpError(403, "Access denied: incident is outside your assigned laboratories", undefined, "FORBIDDEN");
  }
}

export async function createIncident(tx, {
  actor,
  resourceId,
  bookingId = null,
  severity,
  category = null,
  title,
  description,
  detectedAt
}) {
  const resource = await tx.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, code: true, laboratoryId: true }
  });
  if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");

  if (actor.role === LAB_STAFF) {
    await assertIncidentOperatorScope(tx, { resourceId }, actor);
  }

  if (bookingId) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, resourceId: true, requestedById: true }
    });
    if (!booking || booking.resourceId !== resourceId) {
      throw new HttpError(400, "bookingId does not belong to the incident resource", { field: "bookingId" }, "VALIDATION_ERROR");
    }
    if (![ADMIN, LAB_STAFF].includes(actor.role) && booking.requestedById !== actor.id) {
      throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
    }
  }

  const incident = await tx.incident.create({
    data: {
      id: crypto.randomUUID(),
      resourceId,
      bookingId,
      reportedById: actor.id,
      severity,
      category,
      title,
      description,
      detectedAt
    },
    include: {
      resource: { select: { id: true, code: true, name: true, laboratoryId: true, operationalStatus: true } },
      reportedBy: { select: { id: true, fullName: true, role: true } },
      assignedTo: { select: { id: true, fullName: true, role: true } }
    }
  });

  await tx.usageLog.create({
    data: {
      id: crypto.randomUUID(),
      resourceId,
      bookingId,
      userId: actor.id,
      actorType: "USER",
      action: "INCIDENT_REPORTED",
      message: "incident.reported",
      messageKey: "incident.reported",
      reason: description,
      metadata: {
        incidentId: incident.id,
        severity,
        category
      }
    }
  });

  return incident;
}

export async function transitionIncident(tx, {
  incidentId,
  actor,
  action,
  resolution = null,
  assigneeId = null
}) {
  await tx.$queryRaw\`SELECT id FROM incidents WHERE id = \${incidentId} FOR UPDATE\`;
  const incident = await tx.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new HttpError(404, "Incident not found", undefined, "NOT_FOUND");

  await assertIncidentOperatorScope(tx, incident, actor);

  const now = new Date();
  let data;
  let message;

  if (action === "triage") {
    if (!["reported", "triaged"].includes(incident.status)) {
      throw new HttpError(409, \`Cannot triage incident from status \${incident.status}\`, undefined, "INCIDENT_INVALID_TRANSITION");
    }
    data = {
      status: assigneeId ? "assigned" : "triaged",
      assignedToId: assigneeId || incident.assignedToId || actor.id
    };
    message = "incident.triaged";
  } else if (action === "investigate") {
    if (!["triaged", "assigned", "investigating"].includes(incident.status)) {
      throw new HttpError(409, \`Cannot investigate incident from status \${incident.status}\`, undefined, "INCIDENT_INVALID_TRANSITION");
    }
    data = { status: "investigating", assignedToId: incident.assignedToId || actor.id };
    message = "incident.investigating";
  } else if (action === "resolve") {
    if (!["reported", "triaged", "assigned", "investigating"].includes(incident.status)) {
      throw new HttpError(409, \`Cannot resolve incident from status \${incident.status}\`, undefined, "INCIDENT_INVALID_TRANSITION");
    }
    if (!String(resolution || "").trim()) {
      throw new HttpError(400, "Resolution is required", { field: "resolution" }, "VALIDATION_ERROR");
    }
    data = { status: "resolved", resolution: String(resolution).trim(), resolvedAt: now };
    message = "incident.resolved";
  } else {
    throw new HttpError(400, "Unknown incident action", undefined, "VALIDATION_ERROR");
  }

  const updated = await tx.incident.update({
    where: { id: incidentId },
    data,
    include: {
      resource: { select: { id: true, code: true, name: true, laboratoryId: true, operationalStatus: true } },
      reportedBy: { select: { id: true, fullName: true, role: true } },
      assignedTo: { select: { id: true, fullName: true, role: true } }
    }
  });

  await tx.usageLog.create({
    data: {
      id: crypto.randomUUID(),
      resourceId: incident.resourceId,
      bookingId: incident.bookingId,
      userId: actor.id,
      actorType: "USER",
      action: "STATUS_CHANGE",
      message,
      reason: action === "resolve" ? data.resolution : null,
      metadata: {
        incidentId,
        fromIncidentStatus: incident.status,
        toIncidentStatus: updated.status
      }
    }
  });

  return updated;
}
