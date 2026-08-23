/**
 * Laboratory Routes — quản lý campus/building/laboratory hierarchy
 * Blueprint §4.1, §17.2, §19.3
 *
 * GET  /labs                   — list all labs
 * POST /labs                   — create lab (admin)
 * GET  /labs/:id               — get lab detail
 * PATCH /labs/:id              — update lab (admin/lab_staff)
 * GET  /labs/:id/equipment     — list equipment in lab
 *
 * GET  /campuses               — list campuses
 * GET  /buildings              — list buildings
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = express.Router();
router.use(requireAuth);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const campusSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(1).max(50),
  address: z.string().max(500).optional()
});

const buildingSchema = z.object({
  campusId: z.string().uuid(),
  name: z.string().min(2).max(255),
  code: z.string().min(1).max(50)
});

const labSchema = z.object({
  buildingId: z.string().uuid(),
  name: z.string().min(2).max(255),
  code: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  capacity: z.number().int().min(0).default(0),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().default(true)
});

const labPolicySchema = z.object({
  maxBookingMinutes: z.number().int().min(15).default(480),
  minBookingMinutes: z.number().int().min(15).default(15),
  maxAdvanceBookingDays: z.number().int().min(1).default(30),
  checkInGraceMinutes: z.number().int().min(0).default(20),
  requiresApproval: z.boolean().default(false),
  allowWeekend: z.boolean().default(false),
  workDayStartHour: z.number().int().min(0).max(23).default(8),
  workDayEndHour: z.number().int().min(1).max(24).default(18)
});

// ─── Campuses ─────────────────────────────────────────────────────────────────

router.get("/campuses", async (_req, res, next) => {
  try {
    const campuses = await prisma.campus.findMany({
      include: { _count: { select: { buildings: true } } },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: campuses });
  } catch (error) {
    next(error);
  }
});

router.post("/campuses", requireRole("admin"), async (req, res, next) => {
  try {
    const data = campusSchema.parse(req.body);
    const campus = await prisma.campus.create({ data });
    res.status(201).json({ success: true, data: campus });
  } catch (error) {
    next(error);
  }
});

// ─── Buildings ────────────────────────────────────────────────────────────────

router.get("/buildings", async (req, res, next) => {
  try {
    const { campusId } = req.query;
    const where = campusId ? { campusId } : {};
    const buildings = await prisma.building.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true, code: true } },
        _count: { select: { laboratories: true } }
      },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: buildings });
  } catch (error) {
    next(error);
  }
});

router.post("/buildings", requireRole("admin"), async (req, res, next) => {
  try {
    const data = buildingSchema.parse(req.body);
    const building = await prisma.building.create({ data });
    res.status(201).json({ success: true, data: building });
  } catch (error) {
    next(error);
  }
});

// ─── Laboratories ─────────────────────────────────────────────────────────────

router.get("/", async (req, res, next) => {
  try {
    const { buildingId, isActive } = req.query;
    const where = {};
    if (buildingId) where.buildingId = buildingId;
    if (isActive !== undefined) where.isActive = isActive !== "false";

    const labs = await prisma.laboratory.findMany({
      where,
      include: {
        building: {
          include: { campus: { select: { id: true, name: true, code: true } } }
        },
        labPolicy: true,
        _count: { select: { resources: true } }
      },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: labs });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const data = labSchema.parse(req.body);
    const lab = await prisma.laboratory.create({
      data,
      include: { building: true }
    });
    res.status(201).json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const lab = await getLab(req.params.id);
    res.json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = labSchema.partial().parse(req.body);
    const updated = await prisma.laboratory.update({
      where: { id: req.params.id },
      data,
      include: { building: true, labPolicy: true }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/// List equipment in a laboratory
router.get("/:id/equipment", async (req, res, next) => {
  try {
    await getLab(req.params.id); // ensure exists
    const equipment = await prisma.resource.findMany({
      where: { laboratoryId: req.params.id },
      include: { capabilities: true },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
});

/// Upsert lab policy
router.put("/:id/policy", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    await getLab(req.params.id);
    const data = labPolicySchema.parse(req.body);
    const policy = await prisma.labPolicy.upsert({
      where: { laboratoryId: req.params.id },
      update: data,
      create: { laboratoryId: req.params.id, ...data }
    });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getLab(id) {
  const lab = await prisma.laboratory.findUnique({
    where: { id },
    include: {
      building: { include: { campus: true } },
      labPolicy: true,
      _count: { select: { resources: true } }
    }
  });
  if (!lab) throw new HttpError(404, "Laboratory not found", undefined, "RESOURCE_NOT_FOUND");
  return lab;
}

export default router;
