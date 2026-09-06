import express from "express";
import { calculatePriorityScore, findBumpProposals } from "../services/prioritySchedulerService.js";
import { analyzeResourceHealth } from "../services/predictiveMaintenanceService.js";
import { estimateJobImpact } from "../services/jobEstimatorService.js";
import { runOptimizationAlgorithm, HYPERVOLUME_REFERENCE_POINT } from "../services/multiObjectiveEngine.js";
import { prisma } from "../db.js";

const router = express.Router();

// 1. Calculate Priority Score & Get Bump Proposals
router.post("/priority-score", async (req, res, next) => {
  try {
    const {
      userRole,
      projectUrgency,
      noShowRate,
      recentUsageHours,
      quotaBalancePercent,
      usedQuotaHours,
      allocatedQuotaHours,
      reputationScore
    } = req.body;

    const repScore = reputationScore !== undefined
      ? Number(reputationScore)
      : (noShowRate !== undefined ? Math.max(0, Math.min(100, Math.round(100 - Number(noShowRate) * 100))) : 100);

    const score = calculatePriorityScore({
      userRole,
      projectUrgency,
      quotaBalancePercent,
      usedQuotaHours: usedQuotaHours !== undefined ? Number(usedQuotaHours) : (recentUsageHours !== undefined ? Number(recentUsageHours) : undefined),
      allocatedQuotaHours: allocatedQuotaHours ? Number(allocatedQuotaHours) : 20,
      reputationScore: repScore
    });

    const enriched = {
      ...score,
      factors: {
        roleWeight: score.breakdown?.roleScore ?? 0,
        urgencyWeight: score.breakdown?.urgencyScore ?? 0,
        quotaBalanceScore: score.breakdown?.quotaBalanceScore ?? 0,
        noShowMultiplier: score.reputationMultiplier,
        usageMultiplier: score.reputationMultiplier,
        reputationScore: score.reputationScore,
        basePriority: score.basePriority
      }
    };

    res.json({ ok: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

router.post("/bump-proposals", async (req, res, next) => {
  try {
    const { targetBookingId, userRole, projectUrgency, reputationScore } = req.body;
    const existingBookings = await prisma.booking.findMany({
      include: { requestedBy: true, resource: true }
    });

    const result = findBumpProposals({
      targetBooking: {
        id: targetBookingId || "new-target-request",
        userRole: userRole || "phd_researcher",
        projectUrgency: projectUrgency || "paper_deadline",
        reputationScore: reputationScore !== undefined ? Number(reputationScore) : 100
      },
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
      const isCritical = health.thermalStressLevel === "HIGH" || health.status === "CRITICAL_MAINTENANCE_REQUIRED";
      const isWarning = health.thermalStressLevel === "MODERATE" || health.status === "WARNING_DEGRADATION";
      const riskLevel = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "OPTIMAL";

      return {
        resourceId: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        status: r.status,
        predictiveHealth: {
          ...health,
          riskLevel,
          analysis: `Health Index: ${health.healthIndex}/100 | Nhiệt TB: ${health.metrics?.avgTemp ?? 45}°C | RUL: ~${health.estimatedRulDays ?? 180} ngày`
        }
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
    const result = estimateJobImpact({
      modelType,
      durationHours: Number(durationHours) || 4,
      gpuCount: Number(gpuCount) || 2
    });

    const enriched = {
      ...result,
      totalKwh: result.energyKwh,
      carbonEmissionsKg: result.carbonFootprintKg,
      optimizedCarbonKg: Math.max(0, Math.round((result.carbonFootprintKg - (result.greenRecommendation?.potentialCarbonSavingsKg || 0)) * 10) / 10),
      costSavingsVnd: Math.round(result.energyKwh * (2500 - 1100))
    };

    res.json({ ok: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// 4. Multi-Objective Pareto Frontier Explorer
router.post("/pareto-frontier", async (req, res, next) => {
  try {
    const { algorithm = "NSGA2", populationSize = 35, generations = 20 } = req.body || {};

    let resources = await prisma.resource.findMany({
      where: { operationalStatus: "available" }
    });
    if (!resources.length) {
      resources = await prisma.resource.findMany({ take: 6 });
    }

    const existingBookings = await prisma.booking.findMany({
      where: { status: { in: ["approved", "pending"] } },
      include: { requestedBy: true, resource: true },
      take: 12
    });

    let requests = [];
    if (existingBookings.length > 0) {
      requests = existingBookings.map((b, idx) => {
        const start = new Date(b.startAt);
        const end = new Date(b.endAt);
        const dur = Math.max(1, Math.round((end - start) / (1000 * 3600))) || 2;
        return {
          id: b.id,
          title: b.title || `Ca sử dụng #${idx + 1}`,
          userName: b.requestedBy?.fullName || "Researcher",
          userRole: b.requestedBy?.role || "undergrad_student",
          projectUrgency: b.projectUrgency || "course_project",
          durationHours: dur,
          powerWatts: b.resource?.type === "gpu_server" ? 500 : 180,
          preferredStartHour: start.getHours() || 9,
          noShowRate: 0.05,
          recentUsageHours: 10
        };
      });
    }

    if (requests.length < 6) {
      const presets = [
        { title: "Huấn luyện Mô hình LLM 70B", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 4, powerWatts: 600, preferredStartHour: 9 },
        { title: "Fine-tune Thị giác YOLOV11", userRole: "master_student", projectUrgency: "thesis_defense", durationHours: 3, powerWatts: 450, preferredStartHour: 10 },
        { title: "Thực hành Deep Learning", userRole: "undergrad_student", projectUrgency: "course_project", durationHours: 2, powerWatts: 280, preferredStartHour: 13 },
        { title: "Test Bay UAV Tự Hành", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 3, powerWatts: 200, preferredStartHour: 14 },
        { title: "Nghiên cứu Mô hình Diffusion", userRole: "undergrad_student", projectUrgency: "personal_learning", durationHours: 2, powerWatts: 300, preferredStartHour: 16 },
        { title: "Benchmark Vi Điều Khiển IoT", userRole: "undergrad_student", projectUrgency: "course_project", durationHours: 2, powerWatts: 80, preferredStartHour: 11 }
      ];
      presets.forEach((p, idx) => {
        if (requests.length < 8) {
          requests.push({
            id: `req-workload-${idx + 1}`,
            ...p,
            userName: `Nghiên cứu viên #${idx + 1}`,
            noShowRate: 0.04,
            recentUsageHours: 8
          });
        }
      });
    }

    const optResult = runOptimizationAlgorithm({
      algorithm: algorithm.toUpperCase() === "MOEAD" ? "MOEAD" : "NSGA2",
      requests,
      resources,
      config: {
        populationSize: Math.min(60, Math.max(15, Number(populationSize) || 35)),
        generations: Math.min(40, Math.max(10, Number(generations) || 20))
      }
    });

    const paretoPoints = (optResult.paretoFrontier || []).map((p, i) => {
      const wait = p.objectives.waitingTimeHours;
      const energy = p.objectives.energyCostVnd;
      const fair = p.objectives.jainsFairnessIndex;
      let tag = "Cân Bằng Đa Mục Tiêu";
      if (energy <= 50000) tag = "Green AI Schedule";
      else if (wait <= 1.2) tag = "Ưu Tiên Deadline";
      else if (fair >= 0.9) tag = "Fair-Share Maximum";
      else if (i === 0) tag = "Knee-Point Tối Ưu";

      return {
        id: p.solutionId || `p-${i + 1}`,
        name: `Phương Án ${i + 1} (${tag})`,
        objectives: p.objectives,
        tag,
        crowdingDistance: p.crowdingDistance
      };
    });

    res.json({
      ok: true,
      data: {
        algorithm: optResult.algorithm,
        hypervolume: optResult.hypervolume,
        referencePoint: optResult.referencePoint || HYPERVOLUME_REFERENCE_POINT,
        paretoFrontier: paretoPoints,
        metrics: optResult.metrics,
        runtimeMs: optResult.runtimeMs,
        datasetSize: requests.length
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
