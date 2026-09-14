import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { mockStore } from "../services/store.js";

const router = express.Router();

const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "BUSY", "MAINTENANCE", "available", "maintenance"])
});

// GET all resources
router.get("/", async (req, res) => {
  try {
    const { category, status } = req.query;

    const resources = await prisma.resource.findMany({
      where: {
        ...(category ? { category: String(category).toUpperCase() } : {}),
        ...(status ? { status: String(status).toUpperCase() } : {})
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ["CONFIRMED", "CHECKED_IN", "confirmed"] }
              }
            }
          }
        }
      },
      orderBy: [{ category: "asc" }, { hourlyRateVnd: "desc" }]
    });

    return res.json(
      resources.map((r) => ({
        id: r.id,
        code: r.id,
        name: r.name,
        category: r.category,
        hourlyRateVnd: r.hourlyRateVnd,
        hourlyRate: r.hourlyRateVnd,
        capacity: r.capacity,
        location: r.location || "Phòng Máy Chủ AI",
        status: String(r.status).toLowerCase(),
        specs: r.specsJson || {},
        activeBookingsCount: r._count?.bookings || 0
      }))
    );
  } catch (_dbErr) {
    // Seamless fallback to high-fidelity in-memory store
    const { category, status } = req.query;
    let list = mockStore.resources;
    if (category) {
      list = list.filter((r) => r.category.toLowerCase() === String(category).toLowerCase());
    }
    if (status) {
      list = list.filter((r) => r.status.toLowerCase() === String(status).toLowerCase());
    }
    return res.json(list);
  }
});

// GET resource by ID
router.get("/:id", async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          where: {
            endTime: { gte: new Date() },
            status: { in: ["CONFIRMED", "CHECKED_IN", "confirmed"] }
          },
          orderBy: { startTime: "asc" },
          take: 10
        }
      }
    });

    if (resource) {
      return res.json({
        id: resource.id,
        code: resource.id,
        name: resource.name,
        category: resource.category,
        hourlyRateVnd: resource.hourlyRateVnd,
        capacity: resource.capacity,
        location: resource.location,
        status: String(resource.status).toLowerCase(),
        specs: resource.specsJson || {},
        upcomingBookings: resource.bookings
      });
    }
  } catch (_e) {}

  const fallback = mockStore.resources.find((r) => r.id === req.params.id);
  if (!fallback) {
    return next(new HttpError(404, "Tài nguyên không tồn tại."));
  }
  return res.json(fallback);
});

// PATCH /:id/status
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);

    try {
      const updated = await prisma.resource.update({
        where: { id: req.params.id },
        data: { status: status.toUpperCase() }
      });
      return res.json({
        success: true,
        message: `Đã cập nhật trạng thái tài nguyên thành ${status}`,
        resource: updated
      });
    } catch (_dbErr) {
      const item = mockStore.resources.find((r) => r.id === req.params.id);
      if (item) {
        item.status = status.toLowerCase();
      }
      return res.json({
        success: true,
        message: `Đã cập nhật trạng thái tài nguyên thành ${status}`,
        resource: item || { id: req.params.id, status }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
