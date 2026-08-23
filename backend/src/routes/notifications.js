import express from "express";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeNotification } from "../utils/dataContract.js";

const router = express.Router();

const parseLimit = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(1, Math.round(numeric))) : 50;
};

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = parseLimit(req.query.limit);
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    res.json(notifications.map((item) => serializeNotification(item)));
  } catch (error) {
    next(error);
  }
});

router.post("/read-all", async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() }
    });
    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/read", async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { readAt: new Date() }
    });
    res.json(serializeNotification(notification));
  } catch (error) {
    next(error);
  }
});

export default router;
