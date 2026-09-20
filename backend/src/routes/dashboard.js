import express from "express";

import { prisma } from "../db.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildDashboard } from "../services/dashboardService.js";
import { dispatchDueNotifications } from "../services/notificationService.js";

const router = express.Router();

router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    await dispatchDueNotifications(prisma, new Date(), req.user.id);
    res.json(await buildDashboard(prisma, req.user));
  } catch (error) {
    next(error);
  }
});

export default router;
