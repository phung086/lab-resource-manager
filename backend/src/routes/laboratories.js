import crypto from "crypto";
import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertLabStaffLaboratoryAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { normalizeResourceCode, normalizeText } from "../utils/dataContract.js";

const router = express.Router();

const optionalText = (max) => z.preprocess(
  (value) => value === undefined ? undefined : normalizeText(value) || null,
  z.string().max(max).nullable().optional()
);
const timeValue = z.preprocess(
  (value) => value === undefined || value === "" ? null : value,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional()
);
const laboratoryCreateSchema = z.object({
  buildingId: z.string().min(1),
  code: z.string().min(1).max(64).transform(normalizeResourceCode),
  name: z.string().min(2).max(255).transform(normalizeText),
  description: optionalText(2000),
  capacity: z.coerce.number().int().min(0).max(100000).default(0),
  openingTime: timeValue,
  closingTime: timeValue,
  isActive: z.boolean().default(true)
}).strict();
const laboratoryUpdateSchema = laboratoryCreateSchema.partial().strict()
  .refine((value) => Object.keys(value).length > 0, "At least one mutable field is required");

const laboratorySelect = {
  id: true,
  buildingId: true,
  code: true,
  name: true,
  description: true,
  capacity: true,
  openingTime: true,
  closingTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  building: { select: { id: true, code: true, name: true, campus: { select: { id: true, code: true, name: true } } } },
  _count: { select: { resources: true, staffAssignments: true } }
};

router.use(requireAuth);

function visibilityWhere(user) {
  if (user.role === ADMIN) return {};
  if (user.role === LAB_STAFF) return { staffAssignments: { some: { userId: user.id } } };
  return { isActive: true };
}

router.get("/", async (req, res, next) => {
  try {
    const laboratories = await prisma.laboratory.findMany({
      where: visibilityWhere(req.user),
      select: laboratorySelect,
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    });
    res.json(laboratories);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = laboratoryCreateSchema.parse(req.body);
    const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
    if (!building) throw new HttpError(404, "Building not found", undefined, "NOT_FOUND");
    const laboratory = await prisma.laboratory.create({ data: { ...data, id: crypto.randomUUID() }, select: laboratorySelect });
    res.status(201).json(laboratory);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (req.user.role === LAB_STAFF) await assertLabStaffLaboratoryAccess(req.user.id, req.params.id);
    const laboratory = await prisma.laboratory.findFirst({
      where: { id: req.params.id, ...visibilityWhere(req.user) },
      select: laboratorySelect
    });
    if (!laboratory) throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
    res.json(laboratory);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = laboratoryUpdateSchema.parse(req.body);
    if (data.buildingId) {
      const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
      if (!building) throw new HttpError(404, "Building not found", undefined, "NOT_FOUND");
    }
    const laboratory = await prisma.laboratory.update({ where: { id: req.params.id }, data, select: laboratorySelect });
    res.json(laboratory);
  } catch (error) {
    next(error);
  }
});

export default router;
