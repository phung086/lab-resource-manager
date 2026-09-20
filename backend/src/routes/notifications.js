import express from "express";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = express.Router();

// Require auth on all notification routes — users see only their own
router.use(requireAuth);

/**
 * GET / — List notifications for the authenticated user.
 * Database-backed. No in-memory fallback.
 */
router.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      readAt: n.readAt,
      createdAt: n.createdAt,
      isUnread: !n.readAt
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /read-all — Mark all notifications as read for the authenticated user.
 */
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

/**
 * POST /:id/read — Mark a single notification as read.
 */
router.post("/:id/read", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) {
      throw new HttpError(404, "Notification not found", undefined, "NOT_FOUND");
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() }
    });

    res.json({
      id: updated.id,
      readAt: updated.readAt
    });
  } catch (error) {
    next(error);
  }
});

export default router;
