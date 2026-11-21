import crypto from "crypto";
import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertLabStaffResourceAccess, requireLabAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import {
  BLOCKING_MAINTENANCE_STATUSES,
  buildBookingConflict,
  maintenanceKinds,
  maintenanceStatuses
} from "../services/availabilityService.js";
import { bookingOverlapWhere } from "../utils/bookingOverlap.js";
import { expireResourcePaymentHolds } from "../services/bookingPaymentHoldService.js";
import { assertResourceMutationScope, lockResourceForMutation } from "../services/resourceService.js";
import { lockCurrentAccount } from "../services/accountAccess.js";
import { recordSystemAuditEvent } from "../services/systemAuditService.js";
import {
  maintenanceKinds as dataContractMaintenanceKinds,
  maintenanceStatuses as dataContractMaintenanceStatuses,
  normalizeText,
  optionalNormalizedText,
  serializeMaintenanceWindow
} from "../utils/dataContract.js";

const router = express.Router();

const MIN_MAINTENANCE_MINUTES = 15;
const MAX_MAINTENANCE_MINUTES = 90 * 24 * 60;
const normalizedText = (min, max) => z.string().transform(normalizeText).refine((value) => value.length >= min && value.length <= max);
const optionalNote = (max) => z.preprocess((value) => optionalNormalizedText(value), z.string().max(max).optional());
const emptyToUndefined = (schema) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const dateQuery = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.date().optional());

const maintenanceWindowSchema = z.object({
  resourceId: z.string().uuid(),
  kind: z.enum(maintenanceKinds).default("maintenance"),
  status: z.enum(maintenanceStatuses).default("scheduled"),
  title: normalizedText(3, 255),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  notes: optionalNote(2000)
}).strict();

const maintenanceWindowUpdateSchema = maintenanceWindowSchema
  .partial()
  .extend({
    changeReason: optionalNote(500),
    expectedUpdatedAt: z.string().datetime({ offset: true }).transform((value) => new Date(value))
  }).strict();

const maintenanceListQuerySchema = z.object({
  resourceId: emptyToUndefined(z.string().uuid()),
  kind: emptyToUndefined(z.enum(dataContractMaintenanceKinds)),
  status: emptyToUndefined(z.enum(dataContractMaintenanceStatuses)),
  from: dateQuery,
  to: dateQuery
});

router.use(requireAuth);

router.get("/impact", requireRole(ADMIN, LAB_STAFF), requireLabAccess("query.resourceId"), async (req, res, next) => {
  try {
    const data = z.object({ resourceId: z.string().uuid(), startAt: z.coerce.date(), endAt: z.coerce.date() }).strict().parse(req.query);
    validateMaintenanceWindow(data.startAt, data.endAt);
    const rows = await prisma.$transaction(async (tx) => {
      await lockResourceForMutation(tx, req.user, data.resourceId);
      await expireResourcePaymentHolds(tx, data.resourceId);
      return tx.booking.findMany({ where: bookingOverlapWhere(data), select: { id: true, title: true, startAt: true, endAt: true, status: true }, orderBy: { startAt: "asc" } });
    });
    res.json({ conflicts: rows });
  } catch (error) { next(error); }
});

router.get("/", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const { resourceId, kind, status, from, to } = maintenanceListQuerySchema.parse(req.query);
    if (from && to && from > to) {
      throw new HttpError(400, "Date range is invalid", undefined, "INVALID_DATE_RANGE");
    }

    let scopeWhere = {};
    if (req.user.role === LAB_STAFF) {
      if (resourceId) {
        await assertLabStaffResourceAccess(req.user.id, resourceId);
      } else {
        scopeWhere = {
          resource: {
            laboratory: { staffAssignments: { some: { userId: req.user.id } } }
          }
        };
      }
    }

    const windows = await prisma.maintenanceWindow.findMany({
      where: {
        ...(resourceId ? { resourceId } : {}),
        ...(kind ? { kind } : {}),
        ...(status ? { status } : {}),
        ...overlapDateRangeWhere(from, to),
        ...scopeWhere
      },
      include: maintenanceInclude,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
    });

    res.json(windows.map((window) => serializeMaintenanceWindow(window)));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole(ADMIN, LAB_STAFF), requireLabAccess("body.resourceId"), async (req, res, next) => {
  try {
    const data = maintenanceWindowSchema.parse(req.body);
    if (data.status !== "scheduled") throw new HttpError(400, "New maintenance must start as scheduled.", undefined, "MAINTENANCE_INVALID_TRANSITION");
    validateMaintenanceWindow(data.startAt, data.endAt);

    const window = await prisma.$transaction(async (tx) => {
      const { resource } = await lockResourceForMutation(tx, req.user, data.resourceId);

      await ensureNoBookingConflictTx(tx, {
        resourceId: data.resourceId,
        startAt: data.startAt,
        endAt: data.endAt,
        status: data.status
      });

      const created = await tx.maintenanceWindow.create({
        data: {
          id: crypto.randomUUID(),
          ...data,
          createdById: req.user.id
        },
        include: maintenanceInclude
      });
      await tx.usageLog.create({
        data: {
          id: crypto.randomUUID(),
          resourceId: data.resourceId,
          userId: req.user.id,
          action: "STATUS_CHANGE",
          message: "maintenance.window.created",
          messageKey: data.kind === "calibration" ? "calibration_schedule" : "maintenance_schedule",
          messageParams: { title: data.title, resource: resource.code }
        }
      });
      return created;
    });

    res.status(201).json(serializeMaintenanceWindow(window));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const data = maintenanceWindowUpdateSchema.parse(req.body);
    const { changeReason: _changeReason, expectedUpdatedAt, ...windowData } = data;
    if (!Object.keys(windowData).length) {
      throw new HttpError(400, "No maintenance changes were provided", undefined, "VALIDATION_ERROR");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const actor = await lockCurrentAccount(tx, req.user.id, req.user.authVersion);
      await tx.$queryRaw`SELECT id FROM maintenance_windows WHERE id = ${req.params.id} FOR UPDATE`;
      const fresh = await tx.maintenanceWindow.findUnique({ where: { id: req.params.id } });
      if (!fresh) throw new HttpError(404, "Maintenance window not found", undefined, "NOT_FOUND");

      const nextResourceId = windowData.resourceId || fresh.resourceId;
      // Use a consistent order when two jobs move between the same resources.
      for (const resourceId of [...new Set([fresh.resourceId, nextResourceId])].sort()) {
        await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
        const resource = await tx.resource.findUnique({ where: { id: resourceId }, select: { laboratoryId: true } });
        if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
        await assertResourceMutationScope(tx, actor, resource.laboratoryId);
      }
      if (+fresh.updatedAt !== +expectedUpdatedAt) throw new HttpError(409, "Maintenance changed. Reload before editing.", undefined, "MAINTENANCE_CHANGED");
      const nextStartAt = windowData.startAt || fresh.startAt;
      const nextEndAt = windowData.endAt || fresh.endAt;
      const nextStatus = windowData.status || fresh.status;
      validateMaintenanceWindow(nextStartAt, nextEndAt);
      if (["completed", "cancelled"].includes(fresh.status)) throw new HttpError(409, "Completed or cancelled maintenance is read-only.", undefined, "MAINTENANCE_CLOSED");
      if ((windowData.startAt || windowData.endAt || windowData.resourceId || (windowData.status && windowData.status !== fresh.status)) && (!_changeReason || _changeReason.length < 5)) throw new HttpError(400, "Explain the schedule or status change (at least 5 characters).", undefined, "MAINTENANCE_REASON_REQUIRED");
      if (fresh.status === "in_progress" && nextResourceId !== fresh.resourceId) throw new HttpError(409, "Work in progress cannot move to another resource.", undefined, "MAINTENANCE_RESOURCE_LOCKED");
      if (windowData.status && windowData.status !== fresh.status && !({ scheduled: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"] }[fresh.status] || []).includes(windowData.status)) throw new HttpError(409, "Invalid maintenance transition", undefined, "MAINTENANCE_INVALID_TRANSITION");
      // The booked interval can end while the borrower still has the resource.
      // Use the same resource lock as checkout and return before starting work.
      if (nextStatus !== fresh.status && ["in_progress", "completed"].includes(nextStatus)) {
        const checkedOut = await tx.booking.findFirst({
          where: { resourceId: nextResourceId, status: "CHECKED_OUT" },
          select: { id: true }
        });
        if (checkedOut) throw new HttpError(409, "Receive the resource before maintenance", undefined, "RESOURCE_RETURN_REQUIRED");
      }

      await ensureNoBookingConflictTx(tx, {
        resourceId: nextResourceId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        status: nextStatus
      });

      const saved = await tx.maintenanceWindow.update({
        where: { id: fresh.id },
        data: { ...windowData, updatedAt: new Date(Math.max(Date.now(), +fresh.updatedAt + 1)) },
        include: maintenanceInclude
      });
      await recordSystemAuditEvent(tx, { actor, action: "MAINTENANCE_UPDATED", targetType: "MAINTENANCE", targetId: saved.id, labId: saved.resource.laboratoryId, resourceId: saved.resourceId, beforeState: { startAt: fresh.startAt.toISOString(), endAt: fresh.endAt.toISOString(), status: fresh.status }, afterState: { startAt: saved.startAt.toISOString(), endAt: saved.endAt.toISOString(), status: saved.status }, reason: _changeReason });
      await tx.usageLog.create({
        data: {
          id: crypto.randomUUID(),
          resourceId: nextResourceId,
          userId: req.user.id,
          action: "STATUS_CHANGE",
          message: "maintenance.window.updated",
          messageKey: saved.kind === "calibration" ? "calibration_update" : "maintenance_update",
          messageParams: { title: saved.title, resource: saved.resource.code, status: saved.status }
        }
      });
      return saved;
    });

    res.json(serializeMaintenanceWindow(updated));
  } catch (error) {
    next(error);
  }
});

const maintenanceInclude = {
  resource: true,
  createdBy: { select: { id: true, fullName: true, email: true, role: true, isActive: true } }
};

async function ensureNoBookingConflictTx(tx, { resourceId, startAt, endAt, status }) {
  if (!BLOCKING_MAINTENANCE_STATUSES.includes(status)) return;
  await expireResourcePaymentHolds(tx, resourceId);
  const conflicts = await tx.booking.findMany({
    where: bookingOverlapWhere({ resourceId, startAt, endAt }),
    orderBy: { startAt: "asc" }
  });
  if (!conflicts.length) return;
  throw new HttpError(
    409,
    "Maintenance window conflicts with active bookings",
    { conflicts: conflicts.map((booking) => buildBookingConflict(booking)) },
    "MAINTENANCE_BOOKING_CONFLICT"
  );
}

function overlapDateRangeWhere(from, to) {
  if (!from && !to) return {};
  if (from && to) {
    return { startAt: { lt: to }, endAt: { gt: from } };
  }
  if (from) return { endAt: { gt: from } };
  return { startAt: { lt: to } };
}

function validateMaintenanceWindow(startAt, endAt) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new HttpError(400, "Maintenance time is invalid", undefined, "INVALID_MAINTENANCE_TIME");
  }
  if (startAt >= endAt) {
    throw new HttpError(400, "Maintenance start time must be before end time", undefined, "INVALID_MAINTENANCE_TIME");
  }
  const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (durationMinutes < MIN_MAINTENANCE_MINUTES || durationMinutes > MAX_MAINTENANCE_MINUTES) {
    throw new HttpError(400, "Maintenance duration is outside the allowed range", undefined, "INVALID_MAINTENANCE_TIME");
  }
}

export default router;
