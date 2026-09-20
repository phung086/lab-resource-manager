import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { createIncident, incidentScopeWhere, transitionIncident } from "../services/incidentService.js";

const router = express.Router();

const incidentCreateSchema = z.object({
  resourceId: z.string().uuid(),
  bookingId: z.string().uuid().nullable().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  category: z.string().trim().max(100).nullable().optional(),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(3).max(4000),
  detectedAt: z.coerce.date().optional()
}).strict();

const incidentListSchema = z.object({
  status: z.enum(["reported", "triaged", "assigned", "investigating", "resolved", "verified", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  resourceId: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(100).default(50)
});

const triageSchema = z.object({
  assigneeId: z.string().uuid().optional()
}).strict();

const resolveSchema = z.object({
  resolution: z.string().trim().min(3).max(4000)
}).strict();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = incidentListSchema.parse(req.query);
    const incidents = await prisma.incident.findMany({
      where: {
        ...incidentScopeWhere(req.user),
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.resourceId ? { resourceId: query.resourceId } : {})
      },
      include: {
        resource: { select: { id: true, code: true, name: true, laboratoryId: true, operationalStatus: true } },
        reportedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: [{ detectedAt: "desc" }, { createdAt: "desc" }],
      take: query.take
    });
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const incident = await prisma.incident.findFirst({
      where: { id: req.params.id, ...incidentScopeWhere(req.user) },
      include: {
        resource: { select: { id: true, code: true, name: true, laboratoryId: true, operationalStatus: true } },
        reportedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
        comments: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!incident) throw new HttpError(404, "Incident not found", undefined, "NOT_FOUND");
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = incidentCreateSchema.parse(req.body);
    const incident = await prisma.$transaction((tx) => createIncident(tx, {
      actor: req.user,
      ...data,
      detectedAt: data.detectedAt || new Date()
    }));
    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/triage", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const data = triageSchema.parse(req.body || {});
    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true, role: true, isActive: true }
      });
      if (!assignee || !assignee.isActive || ![ADMIN, LAB_STAFF].includes(assignee.role)) {
        throw new HttpError(400, "Assignee must be an active ADMIN or LAB_STAFF user", { field: "assigneeId" }, "VALIDATION_ERROR");
      }
    }
    const incident = await prisma.$transaction((tx) => transitionIncident(tx, {
      incidentId: req.params.id,
      actor: req.user,
      action: "triage",
      assigneeId: data.assigneeId || null
    }));
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/investigate", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const incident = await prisma.$transaction((tx) => transitionIncident(tx, {
      incidentId: req.params.id,
      actor: req.user,
      action: "investigate"
    }));
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/resolve", requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const data = resolveSchema.parse(req.body);
    const incident = await prisma.$transaction((tx) => transitionIncident(tx, {
      incidentId: req.params.id,
      actor: req.user,
      action: "resolve",
      resolution: data.resolution
    }));
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

export default router;
