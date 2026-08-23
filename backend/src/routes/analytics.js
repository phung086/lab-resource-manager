/**
 * Analytics Routes — KPI Dashboard
 * Blueprint §36, §37, §19.9
 *
 * GET /analytics/overview
 * GET /analytics/equipment-utilization
 * GET /analytics/conflicts
 * GET /analytics/no-shows
 * GET /analytics/maintenance
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin", "lab_staff"));

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
}

// ─── Overview ────────────────────────────────────────────────────────────────

router.get("/overview", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const range = from && to ? { from, to } : getDefaultRange();

    const [
      totalResources,
      totalBookings,
      pendingBookings,
      approvedBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      totalIncidents,
      openIncidents,
      scheduledMaintenance
    ] = await Promise.all([
      prisma.resource.count({ where: { operationalStatus: { not: "retired" } } }),
      prisma.booking.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      prisma.booking.count({ where: { status: "pending" } }),
      prisma.booking.count({ where: { status: "approved" } }),
      prisma.booking.count({ where: { status: "completed", updatedAt: { gte: range.from, lte: range.to } } }),
      prisma.booking.count({ where: { status: "cancelled", updatedAt: { gte: range.from, lte: range.to } } }),
      prisma.booking.count({ where: { status: "no_show", updatedAt: { gte: range.from, lte: range.to } } }),
      prisma.incident.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      prisma.incident.count({ where: { status: { notIn: ["resolved", "verified", "closed"] } } }),
      prisma.maintenanceWindow.count({ where: { status: { in: ["scheduled", "in_progress"] } } })
    ]);

    const completionRate = approvedBookings + completedBookings > 0
      ? completedBookings / (approvedBookings + completedBookings)
      : 0;

    const noShowRate = (approvedBookings + completedBookings + noShowBookings) > 0
      ? noShowBookings / (approvedBookings + completedBookings + noShowBookings)
      : 0;

    res.json({
      success: true,
      data: {
        range: { from: range.from, to: range.to },
        resources: { total: totalResources },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          approved: approvedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          noShow: noShowBookings,
          completionRate: +completionRate.toFixed(4),
          noShowRate: +noShowRate.toFixed(4)
        },
        incidents: { total: totalIncidents, open: openIncidents },
        maintenance: { scheduled: scheduledMaintenance }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Equipment Utilization ──────────────────────────────────────────────────

router.get("/equipment-utilization", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const range = from && to ? { from, to } : getDefaultRange();

    const resources = await prisma.resource.findMany({
      where: { operationalStatus: { not: "retired" } },
      select: {
        id: true, code: true, name: true, type: true, location: true,
        bookings: {
          where: {
            status: { in: ["completed", "checked_out"] },
            startAt: { gte: range.from },
            endAt: { lte: range.to }
          },
          select: { startAt: true, endAt: true }
        }
      }
    });

    const windowMs = range.to.getTime() - range.from.getTime();

    const utilization = resources.map((r) => {
      const usedMs = r.bookings.reduce((sum, b) => {
        const bStart = Math.max(new Date(b.startAt).getTime(), range.from.getTime());
        const bEnd = Math.min(new Date(b.endAt).getTime(), range.to.getTime());
        return sum + Math.max(0, bEnd - bStart);
      }, 0);

      const utilizationRate = windowMs > 0 ? usedMs / windowMs : 0;

      return {
        resourceId: r.id,
        resourceCode: r.code,
        resourceName: r.name,
        resourceType: r.type,
        location: r.location,
        completedBookings: r.bookings.length,
        totalUsedMinutes: Math.round(usedMs / 60_000),
        utilizationRate: +utilizationRate.toFixed(4)
      };
    });

    utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);

    res.json({ success: true, data: { range, utilization } });
  } catch (error) {
    next(error);
  }
});

// ─── Conflict Analytics ──────────────────────────────────────────────────────

router.get("/conflicts", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const range = from && to ? { from, to } : getDefaultRange();

    const [totalRequests, rejectedBookings, conflictLogs] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      prisma.booking.count({
        where: { status: "rejected", updatedAt: { gte: range.from, lte: range.to } }
      }),
      prisma.usageLog.count({
        where: {
          action: "reject",
          createdAt: { gte: range.from, lte: range.to }
        }
      })
    ]);

    const conflictRate = totalRequests > 0 ? rejectedBookings / totalRequests : 0;

    res.json({
      success: true,
      data: {
        range,
        totalRequests,
        rejectedBookings,
        conflictRate: +conflictRate.toFixed(4),
        conflictLogCount: conflictLogs
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── No-show Analytics ───────────────────────────────────────────────────────

router.get("/no-shows", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const range = from && to ? { from, to } : getDefaultRange();

    const [approved, noShows] = await Promise.all([
      prisma.booking.count({
        where: { status: { in: ["approved", "completed", "no_show"] }, updatedAt: { gte: range.from, lte: range.to } }
      }),
      prisma.booking.count({
        where: { status: "no_show", updatedAt: { gte: range.from, lte: range.to } }
      })
    ]);

    // Top no-show users
    const noShowByUser = await prisma.booking.groupBy({
      by: ["requestedById"],
      where: { status: "no_show", updatedAt: { gte: range.from, lte: range.to } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10
    });

    const noShowRate = approved > 0 ? noShows / approved : 0;

    res.json({
      success: true,
      data: {
        range,
        totalScheduled: approved,
        noShows,
        noShowRate: +noShowRate.toFixed(4),
        topNoShowUsers: noShowByUser.map((r) => ({ userId: r.requestedById, count: r._count.id }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Maintenance Analytics ────────────────────────────────────────────────────

router.get("/maintenance", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const range = from && to ? { from, to } : getDefaultRange();

    const windows = await prisma.maintenanceWindow.findMany({
      where: {
        OR: [
          { startAt: { gte: range.from, lte: range.to } },
          { endAt: { gte: range.from, lte: range.to } }
        ]
      },
      include: { resource: { select: { id: true, code: true, name: true } } }
    });

    const totalDowntimeMs = windows
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => {
        const s = Math.max(new Date(w.startAt).getTime(), range.from.getTime());
        const e = Math.min(new Date(w.endAt).getTime(), range.to.getTime());
        return sum + Math.max(0, e - s);
      }, 0);

    const scheduled = windows.filter((w) => w.status === "scheduled").length;
    const inProgress = windows.filter((w) => w.status === "in_progress").length;
    const completed = windows.filter((w) => w.status === "completed").length;

    res.json({
      success: true,
      data: {
        range,
        total: windows.length,
        scheduled,
        inProgress,
        completed,
        totalDowntimeMinutes: Math.round(totalDowntimeMs / 60_000)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
