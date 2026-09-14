import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { mockStore } from "../services/store.js";

const router = express.Router();

const adjustQuotaSchema = z.object({
  additionalHours: z.number().optional(),
  monthlyQuotaHours: z.number().optional(),
  resetReputation: z.boolean().optional()
});

// Current user profile
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (user) {
      return res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: String(user.role).toLowerCase(),
        monthlyQuotaHours: user.monthlyQuotaHours,
        usedQuotaHours: user.usedQuotaHours,
        reputationScore: user.reputationScore,
        department: user.department,
        studentId: user.studentId
      });
    }
  } catch (_e) {}

  const fallback = mockStore.users.find((u) => u.id === req.user?.id) || mockStore.users[0];
  return res.json(fallback);
});

// Admin: Get all users with quota & reputation stats
router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        monthlyQuotaHours: true,
        usedQuotaHours: true,
        reputationScore: true,
        isActive: true,
        createdAt: true,
        department: true,
        studentId: true,
        _count: { select: { bookings: true } }
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }]
    });
    if (users && users.length > 0) {
      return res.json(users);
    }
  } catch (_e) {}

  return res.json(mockStore.users);
});

// Admin: Adjust user quota hours or reputation score
router.patch("/:id/quota", async (req, res, next) => {
  try {
    const data = adjustQuotaSchema.parse(req.body);

    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (user) {
        let newQuota = user.monthlyQuotaHours;
        if (typeof data.monthlyQuotaHours === "number") {
          newQuota = data.monthlyQuotaHours;
        } else if (typeof data.additionalHours === "number") {
          newQuota += data.additionalHours;
        }

        let newReputation = user.reputationScore;
        if (data.resetReputation) {
          newReputation = 100;
        }

        const updated = await prisma.user.update({
          where: { id: req.params.id },
          data: {
            monthlyQuotaHours: newQuota,
            reputationScore: newReputation
          }
        });

        return res.json({
          success: true,
          message: "Đã cập nhật hạn ngạch người dùng thành công",
          user: updated
        });
      }
    } catch (_e) {}

    // Mock store update
    const memUser = mockStore.users.find((u) => u.id === req.params.id);
    if (memUser) {
      if (typeof data.monthlyQuotaHours === "number") memUser.monthlyQuotaHours = data.monthlyQuotaHours;
      if (typeof data.additionalHours === "number") memUser.monthlyQuotaHours += data.additionalHours;
      if (data.resetReputation) memUser.reputationScore = 100;
      return res.json({
        success: true,
        message: "Đã cập nhật hạn ngạch người dùng thành công",
        user: memUser
      });
    }

    throw new HttpError(404, "Không tìm thấy người dùng");
  } catch (error) {
    next(error);
  }
});

export default router;
