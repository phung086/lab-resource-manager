import express from "express";
import { prisma } from "../db.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    let resourceWhere = {};
    if (req.user.role === LAB_STAFF) {
      resourceWhere = {
        laboratory: {
          staffAssignments: { some: { userId: req.user.id } }
        }
      };
    }
    const [resources, bookings] = await Promise.all([
      prisma.resource.findMany({
        where: resourceWhere,
        orderBy: { code: "asc" }
      }),
      prisma.booking.findMany({
        where: {
          endAt: { gte: new Date() },
          status: { in: ACTIVE_BOOKING_STATUSES },
          resource: resourceWhere
        },
        include: {
          resource: {
            select: { id: true, code: true, name: true, location: true, operationalStatus: true, status: true }
          },
          requestedBy: {
            select: { id: true, fullName: true, email: true, role: true }
          }
        },
        take: 10,
        orderBy: { startAt: "asc" }
      })
    ]);

    const activeResources = resources.filter((r) => r.operationalStatus === "AVAILABLE").length;

    const maintenanceResources = resources.filter((r) => r.operationalStatus === "MAINTENANCE").length;
    const reservedResourceCount = new Set(bookings.map((booking) => booking.resourceId)).size;

    res.json({
      summary: {
        totalResources: resources.length,
        activeResources,
        maintenanceResources,
        activeBookingsCount: bookings.length
      },
      resources,
      upcomingBookings: bookings,
      kpi: {
        utilizationRate: resources.length ? Number(((reservedResourceCount / resources.length) * 100).toFixed(1)) : 0,
        reservedResourceCount,
        source: "database"
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
