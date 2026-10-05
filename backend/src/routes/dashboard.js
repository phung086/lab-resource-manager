import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildDashboard } from "../services/dashboardService.js";
import { dispatchDueNotifications } from "../services/notificationService.js";

const router = express.Router();

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
