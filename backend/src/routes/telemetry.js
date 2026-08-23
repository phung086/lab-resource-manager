import express from "express";
import { z } from "zod";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { observeTelemetry } from "../metrics.js";
import {
  normalizeResourceCode,
  normalizeTemperature,
  normalizeText,
  normalizePercent,
  serializeResource,
  serializeTelemetrySample
} from "../utils/dataContract.js";

const router = express.Router();

const percentSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.coerce.number().min(0).max(100).nullable().optional()
).transform((value) => value === null || value === undefined ? value : normalizePercent(value));

const temperatureSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.coerce.number().min(-40).max(125).nullable().optional()
).transform((value) => value === null || value === undefined ? value : normalizeTemperature(value));

const telemetrySchema = z.object({
  resourceCode: z.string().transform(normalizeResourceCode),
  cpuPercent: percentSchema,
  gpuPercent: percentSchema,
  gpuMemoryPercent: percentSchema,
  ramPercent: percentSchema,
  diskPercent: percentSchema,
  temperatureC: temperatureSchema,
  online: z.boolean().default(true),
  source: z.string().default("agent").transform(normalizeText).refine((value) => value.length >= 2 && value.length <= 80)
});

router.get("/latest", requireAuth, async (_req, res, next) => {
  try {
    const resources = await prisma.resource.findMany({
      include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 1 } },
      orderBy: { code: "asc" }
    });
    res.json(resources.map((resource) => {
      const latestTelemetry = resource.telemetrySamples[0] || null;
      return {
        resource: serializeResource(resource, latestTelemetry),
        latestTelemetry: serializeTelemetrySample(latestTelemetry)
      };
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/samples", requireTelemetryIngest, async (req, res, next) => {
  try {
    const data = telemetrySchema.parse(req.body);
    const resource = await prisma.resource.findUnique({ where: { code: data.resourceCode } });
    if (!resource) throw new HttpError(404, "Resource code was not found", undefined, "TELEMETRY_RESOURCE_CODE_NOT_FOUND");

    const sample = await prisma.telemetrySample.create({
      data: {
        resourceId: resource.id,
        cpuPercent: data.cpuPercent,
        gpuPercent: data.gpuPercent,
        gpuMemoryPercent: data.gpuMemoryPercent,
        ramPercent: data.ramPercent,
        diskPercent: data.diskPercent,
        temperatureC: data.temperatureC,
        online: data.online,
        source: data.source
      }
    });

    const status = data.online && resource.status === "offline" ? "available" : data.online ? resource.status : "offline";
    if (status !== resource.status) {
      await prisma.resource.update({ where: { id: resource.id }, data: { status } });
    }

    observeTelemetry(resource, sample);
    res.status(201).json({
      sample: serializeTelemetrySample(sample),
      resource: serializeResource({ ...resource, status })
    });
  } catch (error) {
    next(error);
  }
});

function requireTelemetryIngest(req, res, next) {
  const telemetryKey = req.headers["x-telemetry-key"];
  if (config.telemetryApiKey && telemetryKey === config.telemetryApiKey) {
    return next();
  }

  return requireAuth(req, res, (authError) => {
    if (authError) {
      return res.status(401).json({ code: "AUTH_INVALID_OR_EXPIRED", message: "Invalid telemetry key or bearer token" });
    }
    if (!["admin", "lab_staff"].includes(req.user.role)) {
      return res.status(403).json({ code: "AUTH_FORBIDDEN", message: "Insufficient permission" });
    }
    return next();
  });
}

export default router;
