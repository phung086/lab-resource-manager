import express from "express";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { activeBookingStatuses } from "../utils/bookingOverlap.js";
import { serializeBooking, serializeResource, serializeUsageLog } from "../utils/dataContract.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const bookingVisibility = !["admin", "lab_staff"].includes(req.user.role) ? { requestedById: req.user.id } : {};

    const [
      resourceCounts,
      bookingCounts,
      upcomingBookings,
      pendingBookings,
      latestTelemetryResources,
      recentLogs,
      unreadNotifications
    ] = await Promise.all([
      prisma.resource.groupBy({ by: ["type"], _count: { id: true } }),
      prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.booking.findMany({
        where: {
          status: { in: activeBookingStatuses() },
          startAt: { gte: now, lte: nextWeek },
          ...bookingVisibility
        },
        include: {
          resource: true,
          requestedBy: { select: { id: true, fullName: true, email: true, role: true } }
        },
        orderBy: { startAt: "asc" },
        take: 8
      }),
      prisma.booking.count({ where: { status: "pending", ...bookingVisibility } }),
      prisma.resource.findMany({
        include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 1 } },
        orderBy: { code: "asc" }
      }),
      prisma.usageLog.findMany({
        include: {
          resource: true,
          user: { select: { id: true, fullName: true, role: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } })
    ]);

    const serializedResources = latestTelemetryResources.map((resource) => serializeResource(resource, resource.telemetrySamples[0] || null, now));
    const alerts = serializedResources
      .filter((resource) => resource.operational.attention)
      .map((resource) => ({
        resourceId: resource.id,
        resourceCode: resource.code,
        resourceName: resource.name,
        status: resource.status,
        operational: resource.operational,
        latestTelemetry: resource.latestTelemetry
      }));

    res.json({
      stats: {
        resourcesByType: Object.fromEntries(resourceCounts.map((item) => [item.type, item._count.id])),
        bookingsByStatus: Object.fromEntries(bookingCounts.map((item) => [item.status, item._count.id])),
        pendingBookings,
        unreadNotifications,
        alerts: alerts.length
      },
      upcomingBookings: upcomingBookings.map((booking) => serializeBooking(booking)),
      telemetry: serializedResources.map((resource) => ({
        resource,
        latestTelemetry: resource.latestTelemetry
      })),
      alerts,
      recentLogs: recentLogs.map((log) => serializeUsageLog(log))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
