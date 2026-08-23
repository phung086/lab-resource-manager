import express from "express";
import { calculatePriorityScore, findBumpProposals } from "../services/prioritySchedulerService.js";
import { analyzeResourceHealth } from "../services/predictiveMaintenanceService.js";
import { estimateJobImpact } from "../services/jobEstimatorService.js";
import { prisma } from "../db.js";

const router = express.Router();

// 1. Calculate Priority Score & Get Bump Proposals
router.post("/priority-score", async (req, res, next) => {
  try {
    const { userRole, projectUrgency, noShowRate, recentUsageHours } = req.body;
    const score = calculatePriorityScore({ userRole, projectUrgency, noShowRate, recentUsageHours });
    res.json({ ok: true, data: score });
  } catch (err) {
    next(err);
  }
});

router.post("/bump-proposals", async (req, res, next) => {
  try {
    const { targetBookingId, userRole, projectUrgency } = req.body;
    const existingBookings = await prisma.booking.findMany({
      include: { requestedBy: true, resource: true }
    });

    const result = findBumpProposals({
      targetBooking: { id: targetBookingId, userRole, projectUrgency },
      existingBookings
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 2. Predictive Maintenance Health Report
router.get("/predictive-maintenance", async (_req, res, next) => {
  try {
    const resources = await prisma.resource.findMany({
      include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 10 } }
    });

    const reports = resources.map((r) => {
      const health = analyzeResourceHealth(r.telemetrySamples || []);
      return {
        resourceId: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        status: r.status,
        predictiveHealth: health
      };
    });

    res.json({ ok: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// 3. Green AI & Carbon Estimator
router.post("/estimate-job", async (req, res, next) => {
  try {
    const { modelType, durationHours, gpuCount } = req.body;
    const result = estimateJobImpact({ modelType, durationHours, gpuCount });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
