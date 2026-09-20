import crypto from "crypto";
import express from "express";
import { z } from "zod";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { observeTelemetry } from "../metrics.js";
import { persistTelemetrySample, serializeTelemetry } from "../services/telemetryService.js";

const router = express.Router();

const signalSchema = z.object({
  code: z.string().trim().min(1).max(100),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  message: z.string().trim().min(1).max(500),
  verified: z.boolean(),
  provenance: z.string().trim().min(1).max(255)
}).strict();

const telemetrySchema = z.object({
  labId: z.string().uuid(),
  resourceId: z.string().uuid(),
  source: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  timestamp: z.coerce.date(),
  temperatureC: z.number().min(-40).max(125),
  humidityPercent: z.number().min(0).max(100),
  online: z.boolean(),
  cpuPercent: z.number().min(0).max(100).optional(),
  gpuPercent: z.number().min(0).max(100).optional(),
  gpuMemoryPercent: z.number().min(0).max(100).optional(),
  ramPercent: z.number().min(0).max(100).optional(),
  diskPercent: z.number().min(0).max(100).optional(),
  signals: z.array(signalSchema).max(20).optional()
}).strict();

const listSchema = z.object({
  resourceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireTelemetryKey(req, _res, next) {
  const supplied = req.get("x-telemetry-api-key") || "";
  if (!config.telemetryApiKey || !timingSafeEqualString(supplied, config.telemetryApiKey)) {
    return next(new HttpError(401, "Telemetry ingestion credential is invalid", undefined, "UNAUTHORIZED"));
  }
  next();
}

router.post("/samples", requireTelemetryKey, async (req, res, next) => {
  try {
    const payload = telemetrySchema.parse(req.body);
    const resource = await prisma.resource.findUnique({
      where: { id: payload.resourceId },
      select: {
        id: true,
        code: true,
        name: true,
        laboratoryId: true,
        operationalStatus: true,
        subtype: true,
        specs: true
      }
    });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");

    const sample = await prisma.$transaction((tx) => persistTelemetrySample(tx, { resource, payload }));
    observeTelemetry({ code: resource.code, type: resource.subtype }, sample);
    res.status(201).json(serializeTelemetry(resource, sample));
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth, requireRole(ADMIN, LAB_STAFF));

router.get("/", async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    if (query.from && query.to && query.from >= query.to) {
      throw new HttpError(400, "Telemetry date range is invalid", undefined, "VALIDATION_ERROR");
    }
    if (req.user.role === LAB_STAFF && query.resourceId) {
      await assertLabStaffResourceAccess(req.user.id, query.resourceId);
    }

    const resourceWhere = req.user.role === ADMIN
      ? {}
      : { laboratory: { staffAssignments: { some: { userId: req.user.id } } } };

    const resources = await prisma.resource.findMany({
      where: {
        ...resourceWhere,
        ...(query.resourceId ? { id: query.resourceId } : {})
      },
      include: {
        telemetrySamples: {
          where: {
            ...(query.from ? { sampledAt: { gte: query.from } } : {}),
            ...(query.to ? {
              sampledAt: {
                ...(query.from ? { gte: query.from } : {}),
                lt: query.to
              }
            } : {})
          },
          orderBy: { sampledAt: "desc" },
          take: query.take
        }
      },
      orderBy: { code: "asc" }
    });

    res.json(resources.map((resource) => ({
      ...serializeTelemetry(resource, resource.telemetrySamples[0] || null),
      history: resource.telemetrySamples.map((sample) => ({
        id: sample.id,
        source: sample.source,
        sampledAt: sample.sampledAt,
        online: sample.online,
        temperatureC: sample.temperatureC,
        humidityPercent: sample.humidityPercent,
        cpuPercent: sample.cpuPercent,
        gpuPercent: sample.gpuPercent,
        gpuMemoryPercent: sample.gpuMemoryPercent,
        ramPercent: sample.ramPercent,
        diskPercent: sample.diskPercent,
        signals: sample.verifiedSignals || []
      }))
    })));
  } catch (error) {
    next(error);
  }
});

export default router;
