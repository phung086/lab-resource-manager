import crypto from "crypto";

import { prisma } from "../db.js";
import { ADMIN } from "../constants/roles.js";
import {
  STATUS_REASON_REQUIRED,
  compatibilityStatusFor
} from "../constants/resources.js";
import { HttpError } from "../middleware/errors.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import { BLOCKING_MAINTENANCE_STATUSES } from "./availabilityService.js";
import { normalizeSpecs } from "../utils/dataContract.js";

export const BLOCKING_OPERATIONAL_STATUSES = new Set([
  "IN_USE",
  "MAINTENANCE",
  "CALIBRATION",
  "BROKEN",
  "RETIRED",
  "OFFLINE"
]);

export const resourceLaboratorySelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  labPolicy: true
};

export function currentInterval(now = new Date()) {
  return { startAt: now, endAt: new Date(now.getTime() + 1) };
}

export function resourceAvailability(resource, { startAt, endAt } = currentInterval()) {
  let state = "AVAILABLE";
  let source = "resource";

  const now = new Date();
  const intervalIncludesNow = startAt <= now && endAt > now;

  if (BLOCKING_OPERATIONAL_STATUSES.has(resource.operationalStatus)) {
    state = resource.operationalStatus;
    source = "operational_status";
  } else if (resource.operationalStatus === "IN_USE" && intervalIncludesNow) {
    state = "IN_USE";
    source = "operational_status";
  } else if (resource.bookingState !== "bookable") {
    state = resource.bookingState === "restricted" ? "RESTRICTED" : "UNAVAILABLE";
    source = "booking_policy";
  } else if ((resource.maintenanceWindows || []).some((window) => BLOCKING_MAINTENANCE_STATUSES.includes(window.status))) {
    const calibration = resource.maintenanceWindows.some((window) => window.kind === "calibration" && BLOCKING_MAINTENANCE_STATUSES.includes(window.status));
    state = calibration ? "CALIBRATION" : "MAINTENANCE";
    source = "maintenance_window";
  } else if ((resource.bookings || []).some((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status))) {
    state = "RESERVED";
    source = "booking";
  }

  return {
    state,
    available: state === "AVAILABLE",
    source,
    from: startAt.toISOString(),
    to: endAt.toISOString()
  };
}

export function serializeCanonicalResource(resource, interval) {
  const labPolicy = resource.laboratory?.labPolicy || null;
  const effectiveRequiresApproval = Boolean(
    resource.requiresApproval || labPolicy?.requiresApproval
  );

  return {
    id: resource.id,
    code: resource.code,
    name: resource.name,
    description: resource.description || null,
    laboratoryId: resource.laboratoryId || null,
    laboratory: resource.laboratory || null,
    labPolicy,
    category: resource.category || null,
    subtype: resource.subtype,
    operationalStatus: resource.operationalStatus,
    availability: resourceAvailability(resource, interval),
    bookingState: resource.bookingState,
    location: resource.location,
    ownerTeam: resource.ownerTeam || null,
    capacity: resource.capacity,
    requiresApproval: resource.requiresApproval,
    effectiveRequiresApproval,
    serialNumber: resource.serialNumber || null,
    manufacturer: resource.manufacturer || null,
    model: resource.model || null,
    purchaseDate: resource.purchaseDate?.toISOString() || null,
    warrantyExpiry: resource.warrantyExpiry?.toISOString() || null,
    specs: normalizeSpecs(resource.specs || {}),
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString()
  };
}

function normalizeReason(reason) {
  return String(reason || "").trim() || null;
}

/**
 * Apply one authoritative physical-status mutation inside an existing transaction.
 * The caller owns transaction boundaries and any wider booking/resource locks.
 */
export async function applyOperationalStatusChange(
  tx,
  {
    resourceId,
    operationalStatus,
    reason,
    actor,
    bookingId = null,
    message = "resource.operational_status.changed",
    lockResource = true
  }
) {
  const normalizedReason = normalizeReason(reason);
  if (STATUS_REASON_REQUIRED.has(operationalStatus) && !normalizedReason) {
    throw new HttpError(400, "A reason is required for this operational status", { field: "reason" }, "VALIDATION_ERROR");
  }

  if (lockResource) {
    await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
  }

  const current = await tx.resource.findUnique({ where: { id: resourceId } });
  if (!current) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");

  if (current.operationalStatus === "RETIRED" && operationalStatus !== "RETIRED") {
    if (actor.role !== ADMIN) {
      throw new HttpError(403, "Only ADMIN can restore a retired resource", undefined, "FORBIDDEN");
    }
    if (!normalizedReason) {
      throw new HttpError(400, "A restoration reason is required", { field: "reason" }, "VALIDATION_ERROR");
    }
  }

  if (current.operationalStatus === operationalStatus) {
    return { resource: current, changed: false };
  }

  const updated = await tx.resource.update({
    where: { id: resourceId },
    data: {
      operationalStatus,
      status: compatibilityStatusFor(operationalStatus),
      version: { increment: 1 }
    }
  });

  await tx.resourceStatusHistory.create({
    data: {
      id: crypto.randomUUID(),
      resourceId,
      fromStatus: current.operationalStatus,
      toStatus: operationalStatus,
      reason: normalizedReason,
      changedById: actor.id
    }
  });

  await tx.usageLog.create({
    data: {
      id: crypto.randomUUID(),
      resourceId,
      bookingId,
      userId: actor.id,
      actorType: "USER",
      action: "STATUS_CHANGE",
      message,
      reason: normalizedReason,
      metadata: {
        fromOperationalStatus: current.operationalStatus,
        toOperationalStatus: operationalStatus,
        ...(bookingId ? { bookingId } : {})
      }
    }
  });

  return { resource: updated, changed: true };
}

export async function changeOperationalStatus({ resourceId, operationalStatus, reason, actor, client = prisma }) {
  const work = (tx) => applyOperationalStatusChange(tx, {
    resourceId,
    operationalStatus,
    reason,
    actor
  }).then((result) => result.resource);

  if (typeof client.$transaction === "function") {
    return client.$transaction(work);
  }
  return work(client);
}

export async function auditResourceMutation(tx, { resourceId, actorId, message, reason = null, metadata = {} }) {
  return tx.usageLog.create({
    data: {
      id: crypto.randomUUID(),
      resourceId,
      userId: actorId,
      actorType: "USER",
      action: "STATUS_CHANGE",
      message,
      reason,
      metadata
    }
  });
}
