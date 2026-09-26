import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { listSystemAuditEvents } from "../services/systemAuditService.js";

const router = express.Router();

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  action: z.string().trim().max(64).optional(),
  targetType: z.string().trim().max(64).optional(),
  targetId: z.string().trim().optional(),
  actorId: z.string().trim().optional(),
  labId: z.string().trim().optional(),
  resourceId: z.string().trim().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
}).strict();

router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const validatedQuery = querySchema.parse(req.query);
    const result = await listSystemAuditEvents(prisma, req.user, validatedQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
