import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import {
  BLOCKING_MAINTENANCE_STATUSES,
  buildBookingConflict,
  maintenanceKinds,
  maintenanceStatuses
} from "../services/availabilityService.js";
import { bookingOverlapWhere } from "../utils/bookingOverlap.js";
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
});

const maintenanceWindowUpdateSchema = maintenanceWindowSchema
  .partial()
  .extend({
    changeReason: optionalNote(500)
  });

const maintenanceListQuerySchema = z.object({
  resourceId: emptyToUndefined(z.string().uuid()),
  kind: emptyToUndefined(z.enum(dataContractMaintenanceKinds)),
  status: emptyToUndefined(z.enum(dataContractMaintenanceStatuses)),
  from: dateQuery,
  to: dateQuery
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { resourceId, kind, status, from, to } = maintenanceListQuerySchema.parse(req.query);
    if (from && to && from > to) {
      throw new HttpError(400, "Date range is invalid", undefined, "INVALID_DATE_RANGE");
    }

    const windows = await prisma.maintenanceWindow.findMany({
      where: {
        ...(resourceId ? { resourceId } : {}),
        ...(kind ? { kind } : {}),
        ...(status ? { status } : {}),
        ...overlapDateRangeWhere(from, to)
      },
      include: maintenanceInclude,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
    });

    res.json(windows.map((window) => serializeMaintenanceWindow(window)));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = maintenanceWindowSchema.parse(req.body);
    validateMaintenanceWindow(data.startAt, data.endAt);

    const window = await prisma.$transaction(async (tx) => {
      // Lock resource row to serialize concurrent maintenance + booking operations
      await tx.$queryRaw`SELECT 1 FROM resources WHERE id = ${data.resourceId}::uuid FOR UPDATE`;

      const resource = await tx.resource.findUnique({ where: { id: data.resourceId } });
      if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");

      await ensureNoBookingConflictTx(tx, {
        resourceId: data.resourceId,
        startAt: data.startAt,
        endAt: data.endAt,
        status: data.status
      });

      const created = await tx.maintenanceWindow.create({
        data: {
          ...data,
          createdById: req.user.id
        },
        include: maintenanceInclude
      });
      await tx.usageLog.create({
        data: {
          resourceId: data.resourceId,
          userId: req.user.id,
          action: "status_change",
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

router.patch("/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = maintenanceWindowUpdateSchema.parse(req.body);
    const { changeReason: _changeReason, ...windowData } = data;
    if (!Object.keys(windowData).length) {
      throw new HttpError(400, "No maintenance changes were provided", undefined, "VALIDATION_ERROR");
    }

    const current = await prisma.maintenanceWindow.findUnique({
      where: { id: req.params.id },
      include: maintenanceInclude
    });
    if (!current) throw new HttpError(404, "Maintenance window not found", undefined, "MAINTENANCE_NOT_FOUND");

    const nextResourceId = windowData.resourceId || current.resourceId;
    const nextStartAt = windowData.startAt || current.startAt;
    const nextEndAt = windowData.endAt || current.endAt;
    const nextStatus = windowData.status || current.status;
    validateMaintenanceWindow(nextStartAt, nextEndAt);

    const updated = await prisma.$transaction(async (tx) => {
      // Lock resource row to serialize concurrent operations
      await tx.$queryRaw`SELECT 1 FROM resources WHERE id = ${nextResourceId}::uuid FOR UPDATE`;

      if (windowData.resourceId && windowData.resourceId !== current.resourceId) {
        const resource = await tx.resource.findUnique({ where: { id: windowData.resourceId } });
        if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");
      }

      await ensureNoBookingConflictTx(tx, {
        resourceId: nextResourceId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        status: nextStatus
      });

      const saved = await tx.maintenanceWindow.update({
        where: { id: current.id },
        data: windowData,
        include: maintenanceInclude
      });
      await tx.usageLog.create({
        data: {
          resourceId: nextResourceId,
          userId: req.user.id,
          action: "status_change",
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
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
  if (durationMinutes < MIN_MAINTENANCE_MINUTES || durationMinutes > MAX_MAINTENANCE_MINUTES) {
    throw new HttpError(400, "Maintenance duration is outside the allowed range", undefined, "INVALID_MAINTENANCE_TIME");
  }
}

export default router;
