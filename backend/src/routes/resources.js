import crypto from "crypto";
import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  assertLabStaffLaboratoryAccess,
  assertLabStaffResourceAccess
} from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import {
  BOOKING_STATES,
  OPERATIONAL_STATUSES,
  RESOURCE_CATEGORIES,
  RESOURCE_SUBTYPES,
  compatibilityStatusFor
} from "../constants/resources.js";
import {
  auditResourceMutation,
  changeOperationalStatus,
  currentInterval,
  resourceAvailability,
  resourceLaboratorySelect,
  serializeCanonicalResource
} from "../services/resourceService.js";
import { BLOCKING_MAINTENANCE_STATUSES } from "../services/availabilityService.js";
import { normalizeResourceCode, normalizeSpecs, normalizeText } from "../utils/dataContract.js";

const router = express.Router();
const MAX_SCHEDULE_DAYS = 180;

const uppercaseEnum = (values) => z.preprocess(
  (value) => typeof value === "string" ? value.trim().toUpperCase() : value,
  z.enum(values)
);
const optionalText = (max) => z.preprocess(
  (value) => value === undefined ? undefined : normalizeText(value) || null,
  z.string().max(max).nullable().optional()
);
const optionalDate = z.preprocess(
  (value) => value === undefined || value === "" || value === null ? null : value,
  z.coerce.date().nullable().optional()
);
const categoryValue = z.preprocess(
  (value) => value === "" ? null : typeof value === "string" ? value.trim().toUpperCase() : value,
  z.enum(RESOURCE_CATEGORIES).nullable()
);

const resourceCreateSchema = z.object({
  code: z.string().min(1).max(64).transform(normalizeResourceCode)
    .refine((value) => /^[A-Z0-9][A-Z0-9._-]*$/.test(value), "Code contains unsupported characters"),
  name: z.string().min(2).max(255).transform(normalizeText),
  description: optionalText(2000),
  laboratoryId: z.string().min(1),
  category: categoryValue.optional(),
  subtype: uppercaseEnum(RESOURCE_SUBTYPES),
  operationalStatus: uppercaseEnum(OPERATIONAL_STATUSES).default("AVAILABLE"),
  bookingState: z.enum(BOOKING_STATES).default("bookable"),
  location: z.string().min(1).max(255).transform(normalizeText),
  ownerTeam: z.string().max(255).transform(normalizeText).default(""),
  capacity: z.coerce.number().int().min(1).max(100000).default(1),
  requiresApproval: z.boolean().default(false),
  serialNumber: optionalText(255),
  manufacturer: optionalText(255),
  model: optionalText(255),
  purchaseDate: optionalDate,
  warrantyExpiry: optionalDate,
  specs: z.record(z.unknown()).default({})
}).strict();

const resourceUpdateSchema = resourceCreateSchema
  .omit({ operationalStatus: true })
  .partial()
  .extend({
    laboratoryId: z.union([z.string().min(1), z.null()]).optional(),
    category: categoryValue.optional(),
    changeReason: optionalText(500)
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "changeReason"), "At least one mutable field is required");

const statusUpdateSchema = z.object({
  operationalStatus: uppercaseEnum(OPERATIONAL_STATUSES),
  reason: optionalText(500)
}).strict();
const retireSchema = z.object({ reason: z.string().min(3).max(500).transform(normalizeText) }).strict();

const resourceListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  laboratoryId: z.string().min(1).optional(),
  category: uppercaseEnum(RESOURCE_CATEGORIES).optional(),
  subtype: uppercaseEnum(RESOURCE_SUBTYPES).optional(),
  operationalStatus: uppercaseEnum(OPERATIONAL_STATUSES).optional(),
  classification: z.enum(["ALL", "UNRESOLVED"]).default("ALL"),
  availability: z.enum(["AVAILABLE", "RESERVED", "UNAVAILABLE"]).optional(),
  availableFrom: z.coerce.date().optional(),
  availableTo: z.coerce.date().optional()
}).strict().superRefine((value, ctx) => {
  if (Boolean(value.availableFrom) !== Boolean(value.availableTo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "availableFrom and availableTo must be provided together" });
  }
  if (value.availableFrom && value.availableTo) validateInterval(value.availableFrom, value.availableTo, ctx);
});

const scheduleQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).strict().superRefine((value, ctx) => {
  const from = value.from || new Date();
  const to = value.to || new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  validateInterval(from, to, ctx);
});

function validateInterval(startAt, endAt, ctx) {
  if (startAt >= endAt) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interval end must be after start" });
  if (endAt.getTime() - startAt.getTime() > MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Interval cannot exceed ${MAX_SCHEDULE_DAYS} days` });
  }
}

function overlapWhere(startAt, endAt) {
  return { startAt: { lt: endAt }, endAt: { gt: startAt } };
}

function availabilityInclude(startAt, endAt) {
  return {
    media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    laboratory: { select: resourceLaboratorySelect },
    bookings: {
      where: { status: { in: ACTIVE_BOOKING_STATUSES }, ...overlapWhere(startAt, endAt) },
      select: { id: true, status: true, startAt: true, endAt: true }
    },
    maintenanceWindows: {
      where: { status: { in: BLOCKING_MAINTENANCE_STATUSES }, ...overlapWhere(startAt, endAt) },
      select: { id: true, kind: true, status: true, title: true, startAt: true, endAt: true }
    }
  };
}

async function loadCanonicalResource(id, interval = currentInterval()) {
  return prisma.resource.findUnique({ where: { id }, include: availabilityInclude(interval.startAt, interval.endAt) });
}

function availabilityMatches(resource, requested, interval) {
  if (!requested) return true;
  const state = resourceAvailability(resource, interval).state;
  if (requested === "AVAILABLE") return state === "AVAILABLE";
  if (requested === "RESERVED") return state === "RESERVED";
  return !["AVAILABLE", "RESERVED"].includes(state);
}

router.get("/", async (req, res, next) => {
  try {
    const query = resourceListQuerySchema.parse(req.query);
    const interval = query.availableFrom ? { startAt: query.availableFrom, endAt: query.availableTo } : currentInterval();
    const search = query.search ? normalizeText(query.search) : null;
    const resources = await prisma.resource.findMany({
      where: {
        ...(query.laboratoryId ? { laboratoryId: query.laboratoryId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.classification === "UNRESOLVED" ? { category: null } : {}),
        ...(query.subtype ? { subtype: query.subtype } : {}),
        ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
        ...(search ? { OR: [
          { code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { laboratory: { name: { contains: search, mode: "insensitive" } } }
        ] } : {})
      },
      include: availabilityInclude(interval.startAt, interval.endAt),
      orderBy: [{ operationalStatus: "asc" }, { name: "asc" }],
      take: 250
    });
    res.json(resources
      .filter((resource) => availabilityMatches(resource, query.availability, interval))
      .map((resource) => serializeCanonicalResource(resource, interval)));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const data = resourceCreateSchema.parse(req.body);
    const laboratory = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
    if (!laboratory) throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
    if (!laboratory.isActive) throw new HttpError(409, "Laboratory is inactive", undefined, "LABORATORY_INACTIVE");
    if (req.user.role === LAB_STAFF) await assertLabStaffLaboratoryAccess(req.user.id, data.laboratoryId);

    const created = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({ data: {
        ...data,
        id: crypto.randomUUID(),
        category: data.category ?? null,
        description: data.description ?? null,
        serialNumber: data.serialNumber ?? null,
        manufacturer: data.manufacturer ?? null,
        model: data.model ?? null,
        purchaseDate: data.purchaseDate ?? null,
        warrantyExpiry: data.warrantyExpiry ?? null,
        specs: normalizeSpecs(data.specs),
        status: compatibilityStatusFor(data.operationalStatus)
      } });
      await auditResourceMutation(tx, {
        resourceId: resource.id,
        actorId: req.user.id,
        message: "resource.created",
        metadata: { code: resource.code, laboratoryId: resource.laboratoryId, category: resource.category, subtype: resource.subtype }
      });
      return resource;
    });
    res.status(201).json(serializeCanonicalResource(await loadCanonicalResource(created.id)));
  } catch (error) {
    next(error);
  }
});

router.get("/:id/schedule", async (req, res, next) => {
  try {
    const query = scheduleQuerySchema.parse(req.query);
    const startAt = query.from || new Date();
    const endAt = query.to || new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        laboratory: { select: resourceLaboratorySelect },
        bookings: { where: overlapWhere(startAt, endAt), select: { id: true, status: true, startAt: true, endAt: true }, orderBy: { startAt: "asc" } },
        maintenanceWindows: { where: overlapWhere(startAt, endAt), select: { id: true, kind: true, status: true, title: true, startAt: true, endAt: true }, orderBy: { startAt: "asc" } }
      }
    });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    const blockingView = {
      ...resource,
      bookings: resource.bookings.filter((row) => ACTIVE_BOOKING_STATUSES.includes(row.status)),
      maintenanceWindows: resource.maintenanceWindows.filter((row) => BLOCKING_MAINTENANCE_STATUSES.includes(row.status))
    };
    res.json({
      resource: serializeCanonicalResource(blockingView, { startAt, endAt }),
      interval: { from: startAt.toISOString(), to: endAt.toISOString(), semantics: "[from,to)" },
      bookings: resource.bookings.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() })),
      maintenanceWindows: resource.maintenanceWindows.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/history", requireAuth, async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id }, select: { id: true, code: true, name: true } });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    const [statusRows, usageRows, bookings, maintenance, incidents] = await Promise.all([
      prisma.resourceStatusHistory.findMany({ where: { resourceId: resource.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.usageLog.findMany({ where: { resourceId: resource.id }, include: { user: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.booking.findMany({ where: { resourceId: resource.id }, select: { id: true, status: true, startAt: true, endAt: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.maintenanceWindow.findMany({ where: { resourceId: resource.id }, select: { id: true, kind: true, status: true, title: true, startAt: true, endAt: true, createdAt: true, createdBy: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.incident.findMany({ where: { resourceId: resource.id }, select: { id: true, severity: true, status: true, title: true, detectedAt: true, reportedBy: { select: { id: true, fullName: true, role: true } } }, orderBy: { detectedAt: "desc" }, take: 100 })
    ]);
    const actorIds = [...new Set(statusRows.map((row) => row.changedById).filter(Boolean))];
    const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, role: true } }) : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const timeline = [
      ...statusRows.map((row) => ({ id: row.id, timestamp: row.createdAt.toISOString(), eventType: "OPERATIONAL_STATUS_CHANGED", source: "resource_status_history", actor: actorById.get(row.changedById) || null, reference: { resourceStatusHistoryId: row.id }, data: { fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason || null } })),
      ...usageRows.map((row) => ({ id: row.id, timestamp: row.createdAt.toISOString(), eventType: row.action, source: "usage_log", actor: row.user || null, reference: { usageLogId: row.id, bookingId: row.bookingId || null }, data: { message: row.message, reason: row.reason || null, metadata: row.metadata || {} } })),
      ...bookings.map((row) => ({ id: `booking:${row.id}`, timestamp: row.createdAt.toISOString(), eventType: "BOOKING_RECORDED", source: "booking", actor: null, reference: { bookingId: row.id }, data: { status: row.status, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(), updatedAt: row.updatedAt.toISOString() } })),
      ...maintenance.map((row) => ({ id: `maintenance:${row.id}`, timestamp: row.createdAt.toISOString(), eventType: "MAINTENANCE_RECORDED", source: "maintenance_window", actor: row.createdBy || null, reference: { maintenanceWindowId: row.id }, data: { kind: row.kind, status: row.status, title: row.title, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() } })),
      ...incidents.map((row) => ({ id: `incident:${row.id}`, timestamp: row.detectedAt.toISOString(), eventType: "INCIDENT_RECORDED", source: "incident", actor: row.reportedBy || null, reference: { incidentId: row.id }, data: { severity: row.severity, status: row.status, title: row.title } }))
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json({ resource, timeline });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const now = new Date();
    const interval = currentInterval(now);
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        laboratory: { select: resourceLaboratorySelect },
        bookings: { where: { endAt: { gte: now }, status: { in: ACTIVE_BOOKING_STATUSES } }, select: { id: true, startAt: true, endAt: true, status: true }, orderBy: { startAt: "asc" }, take: 10 },
        maintenanceWindows: { where: { endAt: { gte: now }, status: { in: BLOCKING_MAINTENANCE_STATUSES } }, select: { id: true, kind: true, status: true, title: true, startAt: true, endAt: true }, orderBy: { startAt: "asc" }, take: 10 },
        _count: { select: { bookings: true, maintenanceWindows: true, incidents: true, usageLogs: true } }
      }
    });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    res.json({
      ...serializeCanonicalResource(resource, interval),
      counts: resource._count,
      upcomingSchedule: {
        bookings: resource.bookings.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() })),
        maintenanceWindows: resource.maintenanceWindows.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const parsed = resourceUpdateSchema.parse(req.body);
    const { changeReason, ...data } = parsed;
    const current = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    if (req.user.role === LAB_STAFF) {
      await assertLabStaffResourceAccess(req.user.id, current.id);
      if (data.laboratoryId === null) throw new HttpError(403, "LAB_STAFF cannot unassign a resource laboratory", undefined, "FORBIDDEN");
      if (data.category === null) throw new HttpError(403, "LAB_STAFF cannot clear a reviewed category", undefined, "FORBIDDEN");
      if (data.laboratoryId && data.laboratoryId !== current.laboratoryId) await assertLabStaffLaboratoryAccess(req.user.id, data.laboratoryId);
    }
    if (data.laboratoryId) {
      const targetLab = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
      if (!targetLab) throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
      if (!targetLab.isActive) throw new HttpError(409, "Laboratory is inactive", undefined, "LABORATORY_INACTIVE");
    }
    const normalizedData = { ...data, ...(data.specs ? { specs: normalizeSpecs(data.specs) } : {}), version: { increment: 1 } };
    const changedFields = Object.keys(data).filter((field) => JSON.stringify(current[field]) !== JSON.stringify(data[field]));
    const updated = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.update({ where: { id: current.id }, data: normalizedData });
      await auditResourceMutation(tx, {
        resourceId: current.id,
        actorId: req.user.id,
        message: "resource.updated",
        reason: changeReason || null,
        metadata: { changedFields, category: { from: current.category, to: resource.category }, laboratoryId: { from: current.laboratoryId, to: resource.laboratoryId } }
      });
      return resource;
    });
    res.json(serializeCanonicalResource(await loadCanonicalResource(updated.id)));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/operational-status", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const data = statusUpdateSchema.parse(req.body);
    if (req.user.role === LAB_STAFF) await assertLabStaffResourceAccess(req.user.id, req.params.id);
    const updated = await changeOperationalStatus({ resourceId: req.params.id, operationalStatus: data.operationalStatus, reason: data.reason, actor: req.user });
    res.json(serializeCanonicalResource(await loadCanonicalResource(updated.id)));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/retire", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const { reason } = retireSchema.parse(req.body);
    if (req.user.role === LAB_STAFF) await assertLabStaffResourceAccess(req.user.id, req.params.id);
    const updated = await changeOperationalStatus({ resourceId: req.params.id, operationalStatus: "RETIRED", reason, actor: req.user });
    res.json(serializeCanonicalResource(await loadCanonicalResource(updated.id)));
  } catch (error) {
    next(error);
  }
});

export default router;
