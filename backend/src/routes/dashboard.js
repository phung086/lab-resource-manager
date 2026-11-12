import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildDashboard } from "../services/dashboardService.js";
import { buildOperationsReport } from "../services/operationsReportService.js";
import { buildOperationsBrief } from "../services/operationsBriefService.js";
import { dispatchDueNotifications } from "../services/notificationService.js";

import { buildWorkspaceTrends } from '../services/workspaceTrendsService.js';
import { config } from '../config.js';

const router = express.Router();
router.get("/operations-brief", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const { laboratoryId } = z.object({ laboratoryId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).optional() }).strict().parse(req.query);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await buildOperationsBrief(prisma, req.user, { laboratoryId }));
  } catch (error) {
    next(error);
  }
});

router.get('/trends', requireAuth, requireRole(ADMIN, LAB_STAFF), async (req,res,next) => {
  try {
    const { period } = z.object({period:z.enum(['day','week','month']).default('week')}).strict().parse(req.query);
    res.setHeader('Cache-Control','private, no-store');
    res.json(await buildWorkspaceTrends(prisma,req.user,{period,paymentsEnabled:config.paymentsEnabled}));
  } catch(error) { next(error); }
});

router.get("/report", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const { days } = z.object({ days: z.enum(["7", "30"]).default("30") }).strict().parse(req.query);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await buildOperationsReport(prisma, req.user, { days: Number(days) }));
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const includeTelemetry = z.enum(["true", "false"]).optional().parse(req.query.includeTelemetry) !== "false";
    await dispatchDueNotifications(prisma, new Date(), req.user.id);
    res.json(await buildDashboard(prisma, req.user, new Date(), { includeTelemetry }));
  } catch (error) {
    next(error);
  }
});

export default router;
