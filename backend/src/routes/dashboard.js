import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [resources, bookings] = await Promise.all([
      prisma.resource.findMany(),
      prisma.booking.findMany({
        where: {
          endTime: { gte: new Date() },
          status: { notIn: ["CANCELLED", "cancelled"] }
        },
        include: { resource: true, user: true },
        take: 10,
        orderBy: { startTime: "asc" }
      })
    ]);

    res.json({
      summary: {
        totalResources: resources.length,
        activeResources: resources.filter((r) => r.status === "AVAILABLE").length,
        maintenanceResources: resources.filter((r) => r.status === "MAINTENANCE").length,
        activeBookingsCount: bookings.length
      },
      resources,
      upcomingBookings: bookings,
      kpi: {
        utilizationRate: 84.5,
        efficiencyScore: 92,
        idleHoursSaved: 14.2
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
