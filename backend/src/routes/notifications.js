import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { getUserNotifications } from "../services/notificationService.js";

const router = express.Router();

const listSchema = z.object({
  unreadOnly: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false),
  take: z.coerce.number().int().min(1).max(100).default(50)
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const notifications = await getUserNotifications(req.user.id, query);
    res.json(notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      titleKey: notification.titleKey,
      messageKey: notification.messageKey,
      messageParams: notification.messageParams,
      channel: notification.channel,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      isUnread: !notification.readAt
    })));
  } catch (error) {
    next(error);
  }
});

router.get("/unread-count", async (req, res, next) => {
  try {
    const notifications = await getUserNotifications(req.user.id, { unreadOnly: true, take: 100 });
    res.json({ unread: notifications.length });
  } catch (error) {
    next(error);
  }
});

router.post("/read-all", async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, sentAt: { not: null }, readAt: null },
      data: { readAt: new Date() }
    });
    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/read", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id, sentAt: { not: null } }
    });
    if (!notification) {
      throw new HttpError(404, "Notification not found", undefined, "NOT_FOUND");
    }
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() }
    });
    res.json({ id: updated.id, readAt: updated.readAt });
  } catch (error) {
    next(error);
  }
});

export default router;
