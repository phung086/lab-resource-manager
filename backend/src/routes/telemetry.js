import crypto from "node:crypto";
import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { observeTelemetry } from "../metrics.js";
import { cameraScopeWhere, recordCameraAccessAttempt, serializeCamera } from "../services/cameraService.js";
import { acknowledgeMonitoringAlert, monitoringScopeWhere, serializeMonitoringAlert } from "../services/monitoringAlertService.js";
import {
  authenticateTelemetrySource,
  createTelemetrySource,
  rotateTelemetrySourceCredential,
  serializeTelemetrySource,
  telemetrySourceInclude
} from "../services/telemetryIdentityService.js";
import { persistTelemetrySample, resolveMonitoringThresholds, serializeTelemetry } from "../services/telemetryService.js";

const router = express.Router();

const signalSchema = z.object({
  code: z.string().trim().min(1).max(100),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  message: z.string().trim().min(1).max(500),
  verified: z.boolean().default(false),
  provenance: z.string().trim().min(1).max(255).optional()
}).strict();

const telemetrySchema = z.object({
  eventId: z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/).optional(),
  labId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  source: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._:-]+$/).optional(),
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

const sourceCreateSchema = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(2).max(255),
  laboratoryId: z.string().uuid(),
  resourceId: z.string().uuid()
}).strict();

const sourceStateSchema = z.object({ isActive: z.boolean() }).strict();

const thresholdSchema = z.object({
  temperatureWarningC: z.number().min(-40).max(125).nullable().optional(),
  temperatureCriticalC: z.number().min(-40).max(125).nullable().optional(),
  humidityMinPercent: z.number().min(0).max(100).nullable().optional(),
  humidityMaxPercent: z.number().min(0).max(100).nullable().optional(),
  staleMinutes: z.number().int().min(1).max(10080).nullable().optional()
}).strict().superRefine((value, ctx) => {
  if (value.temperatureWarningC != null && value.temperatureCriticalC != null && value.temperatureWarningC >= value.temperatureCriticalC) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["temperatureCriticalC"], message: "Critical temperature must exceed warning temperature" });
  }
  if (value.humidityMinPercent != null && value.humidityMaxPercent != null && value.humidityMinPercent > value.humidityMaxPercent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["humidityMaxPercent"], message: "Maximum humidity must be at least minimum humidity" });
  }
});

const listSchema = z.object({
  resourceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

const alertListSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  resourceId: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

const cameraCreateSchema = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(2).max(255),
  laboratoryId: z.string().uuid(),
  resourceId: z.string().uuid(),
  telemetrySourceId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().default(false),
  endpointUrl: z.string().url().max(2000).nullable().optional(),
  status: z.enum(["NOT_CONFIGURED", "UNAVAILABLE", "AVAILABLE"]).default("NOT_CONFIGURED")
}).strict();

const cameraAccessSchema = z.object({ purpose: z.string().trim().min(3).max(500) }).strict();

function sourceCredential(req) {
  return req.get("x-telemetry-source-token") || "";
}

function alertInclude() {
  return {
    source: { select: { id: true, code: true, name: true } },
    resource: { select: { id: true, code: true, name: true } },
    acknowledgedBy: { select: { id: true, fullName: true, role: true } },
    incident: { select: { id: true, severity: true, status: true, category: true } }
  };
}

router.post("/samples", async (req, res, next) => {
  try {
    const payload = telemetrySchema.parse(req.body);
    const source = await authenticateTelemetrySource(prisma, sourceCredential(req));
    const result = await prisma.$transaction((tx) => persistTelemetrySample(tx, { source, payload }));
    const sample = await prisma.telemetrySample.findUnique({
      where: { id: result.sample.id },
      include: { telemetrySource: true }
    });
    const resource = await prisma.resource.findUnique({
      where: { id: source.resourceId },
      include: {
        monitoringThreshold: true,
        laboratory: { include: { monitoringThreshold: true } },
        monitoringAlerts: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          include: alertInclude(),
          orderBy: { openedAt: "desc" }
        }
      }
    });
    observeTelemetry({ code: resource.code, type: resource.subtype }, sample);
    res.status(result.replayed ? 200 : 201).json({
      ...serializeTelemetry(resource, sample),
      replayed: result.replayed,
      acceptedSource: serializeTelemetrySource(
        await prisma.telemetrySource.findUnique({ where: { id: source.id } }),
        new Date(),
        resolveMonitoringThresholds(resource).values.staleMinutes
      )
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.post("/cameras/:id/access", async (req, res, next) => {
  try {
    const data = cameraAccessSchema.parse(req.body);
    const result = await prisma.$transaction((tx) => recordCameraAccessAttempt(tx, {
      cameraId: req.params.id,
      actor: req.user,
      purpose: data.purpose
    }));
    if (!result.allowed) {
      throw new HttpError(403, "Camera access denied", { auditId: result.audit.id }, "FORBIDDEN");
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/cameras", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const cameras = await prisma.camera.findMany({
      where: cameraScopeWhere(req.user),
      orderBy: { code: "asc" }
    });
    res.json(cameras.map(serializeCamera));
  } catch (error) {
    next(error);
  }
});

router.get("/cameras/access-audits", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const audits = await prisma.cameraAccessAudit.findMany({
      where: req.user.role === ADMIN
        ? {}
        : { laboratory: { staffAssignments: { some: { userId: req.user.id } } } },
      include: {
        actor: { select: { id: true, fullName: true, role: true } },
        camera: { select: { id: true, code: true, name: true } }
      },
      orderBy: { startedAt: "desc" },
      take: 200
    });
    res.json(audits);
  } catch (error) {
    next(error);
  }
});

router.post("/cameras", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = cameraCreateSchema.parse(req.body);
    const resource = await prisma.resource.findUnique({ where: { id: data.resourceId }, select: { laboratoryId: true } });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    if (resource.laboratoryId !== data.laboratoryId) {
      throw new HttpError(400, "Camera laboratory must match its resource laboratory", undefined, "TELEMETRY_RESOURCE_SCOPE_MISMATCH");
    }
    if (data.telemetrySourceId) {
      const source = await prisma.telemetrySource.findUnique({ where: { id: data.telemetrySourceId } });
      if (!source || source.resourceId !== data.resourceId || source.laboratoryId !== data.laboratoryId) {
        throw new HttpError(400, "Camera source must match camera resource and laboratory", undefined, "TELEMETRY_RESOURCE_SCOPE_MISMATCH");
      }
    }
    const camera = await prisma.camera.create({ data: { id: crypto.randomUUID(), ...data } });
    res.status(201).json(serializeCamera(camera));
  } catch (error) {
    next(error);
  }
});

router.get("/sources", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const sources = await prisma.telemetrySource.findMany({
      where: req.user.role === ADMIN
        ? {}
        : { laboratory: { staffAssignments: { some: { userId: req.user.id } } } },
      include: telemetrySourceInclude(),
      orderBy: { code: "asc" }
    });
    res.json(sources.map((source) => serializeTelemetrySource(
      source,
      new Date(),
      resolveMonitoringThresholds(source.resource).values.staleMinutes
    )));
  } catch (error) {
    next(error);
  }
});

router.post("/sources", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = sourceCreateSchema.parse(req.body);
    const created = await prisma.$transaction((tx) => createTelemetrySource(tx, data));
    res.status(201).json({ source: serializeTelemetrySource(created.source), credential: created.token });
  } catch (error) {
    next(error);
  }
});

router.post("/sources/:id/rotate", requireRole(ADMIN), async (req, res, next) => {
  try {
    const rotated = await prisma.$transaction((tx) => rotateTelemetrySourceCredential(tx, req.params.id));
    res.json({ source: serializeTelemetrySource(rotated.source), credential: rotated.token });
  } catch (error) {
    next(error);
  }
});

router.patch("/sources/:id/active", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = sourceStateSchema.parse(req.body);
    const source = await prisma.telemetrySource.update({ where: { id: req.params.id }, data });
    res.json(serializeTelemetrySource(source));
  } catch (error) {
    next(error);
  }
});

router.put("/thresholds/laboratories/:id", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = thresholdSchema.parse(req.body);
    const laboratory = await prisma.laboratory.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!laboratory) throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
    const threshold = await prisma.laboratoryMonitoringThreshold.upsert({
      where: { laboratoryId: laboratory.id },
      update: data,
      create: { id: crypto.randomUUID(), laboratoryId: laboratory.id, ...data }
    });
    res.json(threshold);
  } catch (error) {
    next(error);
  }
});

router.put("/thresholds/resources/:id", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = thresholdSchema.parse(req.body);
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
    const threshold = await prisma.resourceMonitoringThreshold.upsert({
      where: { resourceId: resource.id },
      update: data,
      create: { id: crypto.randomUUID(), resourceId: resource.id, ...data }
    });
    res.json(threshold);
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const query = alertListSchema.parse(req.query);
    if (req.user.role === LAB_STAFF && query.resourceId) {
      await assertLabStaffResourceAccess(req.user.id, query.resourceId);
    }
    const alerts = await prisma.monitoringAlert.findMany({
      where: {
        ...monitoringScopeWhere(req.user),
        ...(query.status ? { status: query.status } : {}),
        ...(query.resourceId ? { resourceId: query.resourceId } : {})
      },
      include: alertInclude(),
      orderBy: [{ lastObservedAt: "desc" }, { openedAt: "desc" }],
      take: query.take
    });
    res.json(alerts.map(serializeMonitoringAlert));
  } catch (error) {
    next(error);
  }
});

router.post("/alerts/:id/acknowledge", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    await prisma.$transaction((tx) => acknowledgeMonitoringAlert(tx, { alertId: req.params.id, actor: req.user }));
    const alert = await prisma.monitoringAlert.findUnique({ where: { id: req.params.id }, include: alertInclude() });
    res.json(serializeMonitoringAlert(alert));
  } catch (error) {
    next(error);
  }
});

router.get("/", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
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
      where: { ...resourceWhere, ...(query.resourceId ? { id: query.resourceId } : {}) },
      include: {
        monitoringThreshold: true,
        laboratory: { include: { monitoringThreshold: true } },
        monitoringAlerts: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          include: alertInclude(),
          orderBy: { openedAt: "desc" }
        },
        telemetrySamples: {
          where: {
            ...(query.from ? { sampledAt: { gte: query.from } } : {}),
            ...(query.to ? { sampledAt: { ...(query.from ? { gte: query.from } : {}), lt: query.to } } : {})
          },
          include: { telemetrySource: true },
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
        sourceId: sample.sourceId,
        source: sample.telemetrySource?.code || sample.source,
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
