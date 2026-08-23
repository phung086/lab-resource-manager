import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { getResourceAvailability } from "../services/availabilityService.js";
import {
  normalizeResourceCode,
  normalizeSearchQuery,
  normalizeSpecs,
  normalizeText,
  resourceStatuses,
  resourceTypes,
  serializeBooking,
  serializeResource,
  serializeTelemetrySample
} from "../utils/dataContract.js";

const router = express.Router();

const emptyToUndefined = (schema) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const dateQuery = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.date().optional());
const normalizedText = (min, max) => z.string().transform(normalizeText).refine((value) => value.length >= min && value.length <= max);
const resourceCodeSchema = z.string()
  .transform(normalizeResourceCode)
  .refine((value) => /^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(value), "Resource code must use letters, numbers, dot, dash, or underscore");

const resourceSchema = z.object({
  code: resourceCodeSchema,
  name: normalizedText(2, 255),
  type: z.enum(resourceTypes),
  location: normalizedText(2, 255),
  status: z.enum(resourceStatuses),
  ownerTeam: normalizedText(2, 255),
  capacity: z.number().int().positive(),
  requiresApproval: z.boolean(),
  specs: z.record(z.any()).default({}).transform(normalizeSpecs)
});

const resourceUpdateSchema = resourceSchema
  .partial()
  .extend({
    changeReason: z.string().trim().min(3).max(500).optional()
  });

const resourceListQuerySchema = z.object({
  type: emptyToUndefined(z.enum(resourceTypes)),
  status: emptyToUndefined(z.enum(resourceStatuses)),
  search: z.string().optional().transform((value) => normalizeSearchQuery(value))
});

const availabilityQuerySchema = z.object({
  from: dateQuery,
  to: dateQuery
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { type, status, search } = resourceListQuerySchema.parse(req.query);
    const resources = await prisma.resource.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: String(search), mode: "insensitive" } },
                { code: { contains: String(search), mode: "insensitive" } },
                { location: { contains: String(search), mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        telemetrySamples: {
          orderBy: { sampledAt: "desc" },
          take: 1
        },
        _count: { select: { bookings: true } }
      },
      orderBy: [{ type: "asc" }, { code: "asc" }]
    });
    res.json(resources.map((resource) => serializeResource(resource, resource.telemetrySamples[0] || null)));
  } catch (error) {
    next(error);
  }
});

router.get("/:id/availability", async (req, res, next) => {
  try {
    const { from, to } = availabilityQuerySchema.parse(req.query);
    const startAt = from || new Date();
    const endAt = to || new Date(startAt.getTime() + 24 * 60 * 60_000);
    validateAvailabilityWindow(startAt, endAt);

    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        telemetrySamples: {
          orderBy: { sampledAt: "desc" },
          take: 1
        }
      }
    });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");

    const availability = await getResourceAvailability(prisma, {
      resourceId: resource.id,
      startAt,
      endAt,
      resource
    });

    res.json({
      ...availability,
      resource: serializeResource(resource, resource.telemetrySamples[0] || null)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          orderBy: { startAt: "desc" },
          take: 20,
          include: { requestedBy: { select: { id: true, fullName: true, email: true, role: true } } }
        },
        telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 20 }
      }
    });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");
    res.json({
      ...serializeResource(resource, resource.telemetrySamples[0] || null),
      bookings: resource.bookings.map((booking) => serializeBooking(booking)),
      telemetrySamples: resource.telemetrySamples.map((sample) => serializeTelemetrySample(sample))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = resourceSchema.parse(req.body);
    const resource = await prisma.resource.create({ data });
    res.status(201).json(serializeResource(resource));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = resourceUpdateSchema.parse(req.body);
    const { changeReason, ...resourceData } = data;
    const current = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");

    if (resourceData.status && resourceData.status !== current.status && !changeReason) {
      throw new HttpError(400, "Status change reason is required", undefined, "RESOURCE_STATUS_REASON_REQUIRED");
    }

    const resource = await prisma.resource.update({ where: { id: req.params.id }, data: resourceData });
    const statusChanged = resource.status !== current.status;
    await prisma.usageLog.create({
      data: {
        resourceId: resource.id,
        userId: req.user.id,
        action: "status_change",
        message: statusChanged ? "resource.status.updated" : "resource.updated",
        messageKey: statusChanged ? "status_change" : "update_resource",
        messageParams: {
          resource: resource.code,
          fromStatus: current.status,
          toStatus: resource.status,
          reason: changeReason || ""
        }
      }
    });
    res.json(serializeResource(resource));
  } catch (error) {
    next(error);
  }
});

function validateAvailabilityWindow(startAt, endAt) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    throw new HttpError(400, "Availability time range is invalid", undefined, "INVALID_DATE_RANGE");
  }
}

export default router;
