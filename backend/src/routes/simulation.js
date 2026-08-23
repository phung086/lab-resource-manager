/**
 * Lab Scenario Simulation & Live Telemetry Stream Engine
 * Blueprint §20: Advanced Simulation Studio for Real-World Lab Operations & Defense Demos.
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { solveGeneticScheduling } from "../services/geneticSchedulerService.js";
import { generateResourceTelemetry, generate24HourTelemetryHistory } from "../services/telemetryStreamService.js";
import { analyzeResourceHealth } from "../services/predictiveMaintenanceService.js";
import { mqttSubscriberService } from "../services/mqttSubscriberService.js";
import { DATA_SOURCE_TYPES } from "../services/digitalTwinV2Service.js";

const router = express.Router();
router.use(requireAuth);

// ─── 1. SCENARIO 1: RUSH HOUR CONTEST SIMULATION ─────────────────────────────
router.post("/scenario/rush-hour", async (req, res, next) => {
  try {
    const { requestCount = 24, weights } = req.body;

    // Fetch active resources
    const resources = await prisma.resource.findMany({
      where: { operationalStatus: "available" }
    });

    if (!resources.length) {
      return res.status(400).json({ success: false, message: "Không tìm thấy thiết bị khả dụng trong cơ sở dữ liệu." });
    }

    // Generate realistic student/researcher workloads
    const projectTypes = [
      { urgency: "paper_deadline", role: "phd_researcher", title: "Huấn luyện LLM 70B (Paper CVPR/NeurIPS)", watts: 650, duration: 4 },
      { urgency: "thesis_defense", role: "master_student", title: "Fine-tune Thị giác máy tính YOLOV11 (ĐATN)", watts: 450, duration: 3 },
      { urgency: "course_project", role: "undergrad_student", title: "Thực hành bài tập lớn Deep Learning", watts: 280, duration: 2 },
      { urgency: "personal_learning", role: "undergrad_student", title: "Nghiên cứu mô hình Khuếch tán Diffusion", watts: 320, duration: 2 }
    ];

    const generatedRequests = Array.from({ length: Math.min(40, requestCount) }, (_, i) => {
      const type = projectTypes[i % projectTypes.length];
      const studentNames = ["Nguyễn Văn An", "Trần Thị Mai", "Lê Hoàng Long", "Phạm Quốc Bảo", "Đặng Thùy Dung", "Vũ Minh Khôi", "Hoàng Gia Hưng", "Bùi Đức Thịnh"];
      return {
        id: `sim-req-${i + 1}`,
        title: `${type.title} #${i + 1}`,
        userName: studentNames[i % studentNames.length],
        userRole: type.role,
        projectUrgency: type.urgency,
        durationHours: type.duration,
        powerWatts: type.watts,
        preferredStartHour: 8 + (i % 8),
        noShowRate: Math.round(Math.random() * 0.08 * 100) / 100,
        recentUsageHours: (i * 3) % 20
      };
    });

    // Execute Multi-Objective Genetic Algorithm Solver
    const solverResult = solveGeneticScheduling({
      requests: generatedRequests,
      resources,
      populationSize: 45,
      maxGenerations: 25,
      weights: weights || { priority: 0.5, energy: 0.3, fairness: 0.2 }
    });

    // Record summary in UsageLog for audit trail
    const adminUser = req.user;
    if (resources[0]) {
      await prisma.usageLog.create({
        data: {
          resourceId: resources[0].id,
          userId: adminUser.id,
          action: "status_change",
          message: `Simulation Studio executed: Rush Hour Contest with ${generatedRequests.length} requests. GA conflicts resolved: ${solverResult.metrics.conflicts}.`,
          messageKey: "simulation_rush_hour",
          messageParams: {
            requests: generatedRequests.length,
            energySavedPercent: solverResult.baselineComparison.energySavedPercent
          }
        }
      }).catch((err) => console.error("Log error in simulation", err));
    }

    res.json({
      success: true,
      scenarioName: "Cơn Sốt Đồ Án Cuối Kỳ (Rush Hour Multi-Resource Allocation)",
      description: "Mô phỏng 24-40 sinh viên & nghiên cứu sinh đồng thời tranh chấp cụm máy chủ GPU. Thuật toán GA tự động phân bổ đa mục tiêu loại bỏ 100% xung đột và tối ưu chi phí điện EVN.",
      data: solverResult
    });
  } catch (error) {
    next(error);
  }
});

// ─── 2. SCENARIO 2: THERMAL RUNAWAY & FAILOVER SIMULATION ────────────────────
router.post("/scenario/thermal-runaway", async (req, res, next) => {
  try {
    const { resourceId } = req.body;

    // Pick GPU server or first available
    let targetResource = null;
    if (resourceId) {
      targetResource = await prisma.resource.findUnique({ where: { id: resourceId } });
    }
    if (!targetResource) {
      targetResource = await prisma.resource.findFirst({
        where: { type: "gpu_server" }
      }) || await prisma.resource.findFirst();
    }

    if (!targetResource) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị để mô phỏng sự cố." });
    }

    // Pick alternative resource for failover
    const backupResource = await prisma.resource.findFirst({
      where: {
        id: { not: targetResource.id },
        operationalStatus: "available"
      }
    }) || { id: "backup-node", code: "AI-GPU-BACKUP-01", name: "Máy chủ dự phòng L40S Node 2" };

    // Telemetry burst with anomaly
    const criticalTelemetry = generateResourceTelemetry(targetResource, {
      forceAnomaly: true,
      anomalyType: "thermal_runaway"
    });

    const healthAnalysis = analyzeResourceHealth([
      { temperatureC: 68, powerWatts: 240, fanPercent: 55 },
      { temperatureC: 76, powerWatts: 380, fanPercent: 70 },
      { temperatureC: 84, powerWatts: 510, fanPercent: 88 },
      { temperatureC: 92.4, powerWatts: 620, fanPercent: 99 } // Thermal spike
    ]);

    // Timeline event logs
    const eventTimeline = [
      { time: "00:00.000", event: "Sensor Alert", level: "WARNING", msg: `Nhiệt độ cụm GPU ${targetResource.code} vượt ngưỡng 80°C.` },
      { time: "00:01.200", event: "Thermal Runaway", level: "CRITICAL", msg: `Phát hiện quá nhiệt nguy hiểm (92.4°C, quạt đạt tải đỉnh 5500 RPM). Rủi ro cháy nổ chip bán dẫn.` },
      { time: "00:02.100", event: "Auto E-Stop & State Lock", level: "CRITICAL", msg: `Bộ điều khiển tự động khóa thiết bị sang trạng thái Broken / Non-bookable.` },
      { time: "00:02.800", event: "Autonomous Failover", level: "SUCCESS", msg: `Tự động di chuyển 3 tác vụ AI đang chạy sang ${backupResource.name} (${backupResource.code}). Không mất mát dữ liệu checkpoint.` },
      { time: "00:03.500", event: "Incident & Logistics", level: "INFO", msg: `Đã tự động khởi tạo Ticket Sự cố #INC-2026-SPIKE và kích hoạt lịch bảo trì kỹ thuật viên trong 24h.` }
    ];

    res.json({
      success: true,
      scenarioName: "Sự Cố Quá Nhiệt Cụm GPU & Tự Động Chuyển Tải (Thermal Runaway & Failover)",
      targetResource: {
        id: targetResource.id,
        code: targetResource.code,
        name: targetResource.name
      },
      backupResource: {
        id: backupResource.id,
        code: backupResource.code,
        name: backupResource.name
      },
      criticalTelemetry,
      healthAnalysis,
      eventTimeline
    });
  } catch (error) {
    next(error);
  }
});

// ─── 3. SCENARIO 3: GREEN COMPUTING TIME-SHIFTING ───────────────────────────
router.post("/scenario/green-shift", async (req, res, next) => {
  try {
    const { batchHours = 8, clusterGpuCount = 8 } = req.body;

    const totalKw = clusterGpuCount * 0.45; // 450W per GPU = 3.6 kW
    const peakTariff = 3190;
    const offPeakTariff = 1100;

    const peakCostVnd = Math.round(totalKw * batchHours * peakTariff);
    const greenCostVnd = Math.round(totalKw * batchHours * offPeakTariff);
    const savedVnd = peakCostVnd - greenCostVnd;
    const percentSaved = Math.round((savedVnd / peakCostVnd) * 100);

    const totalKwh = totalKw * batchHours;
    const carbonEmissionsPeakKg = Math.round(totalKwh * 0.722 * 100) / 100;
    const carbonEmissionsGreenKg = Math.round(totalKwh * 0.410 * 100) / 100; // Greener hydro/solar night grid
    const carbonSavedKg = Math.round((carbonEmissionsPeakKg - carbonEmissionsGreenKg) * 100) / 100;

    res.json({
      success: true,
      scenarioName: "Tối Ưu Hóa Năng Lượng Xanh (Green Computing & Carbon Arbitrage)",
      metrics: {
        clusterSize: `${clusterGpuCount}x NVIDIA H100/L40S GPUs (${Math.round(totalKw * 10) / 10} kW)`,
        batchDuration: `${batchHours} giờ liên tục`,
        peakHourRun: {
          timeWindow: "09:30 - 17:30 (Giờ Cao Điểm)",
          tariffVndPerKwh: peakTariff,
          costVnd: peakCostVnd,
          carbonKg: carbonEmissionsPeakKg
        },
        greenHourRun: {
          timeWindow: "22:00 - 06:00 (Giờ Thấp Điểm / Năng Lượng Tái Tạo)",
          tariffVndPerKwh: offPeakTariff,
          costVnd: greenCostVnd,
          carbonKg: carbonEmissionsGreenKg
        },
        savings: {
          moneySavedVnd: savedVnd,
          percentCostReduction: `${percentSaved}%`,
          carbonReductionKg: carbonSavedKg,
          treesEquivalent: Math.round(carbonSavedKg / 21) // 1 tree absorbs ~21kg CO2/year
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── 4. LIVE LAB TELEMETRY MATRIX & HEATMAP STREAM ─────────────────────────
router.get("/live-matrix", async (req, res, next) => {
  try {
    const resources = await prisma.resource.findMany({
      include: { laboratory: true }
    });

    const liveNodes = resources.map((resource, index) => {
      const simulated = generateResourceTelemetry(resource);
      
      // Check if real physical IoT hardware telemetry exists from MQTT
      const physicalTelemetry = mqttSubscriberService.getDeviceTelemetry(resource.code);

      const effectiveTelemetry = physicalTelemetry ? {
        ...simulated,
        source: physicalTelemetry.source,
        isPhysicalSensor: true,
        metrics: {
          ...simulated.metrics,
          temperatureC: physicalTelemetry.temperatureC,
          powerWatts: physicalTelemetry.powerWatts,
          gpuPercent: physicalTelemetry.gpuPercent,
          vibrationMmS: physicalTelemetry.vibrationMmS,
          thermalStatus: physicalTelemetry.temperatureC >= 85 ? "CRITICAL" : physicalTelemetry.temperatureC >= 72 ? "WARNING" : "OPTIMAL"
        },
        staleInfo: physicalTelemetry.isStale ? {
          isStale: true,
          elapsedSeconds: physicalTelemetry.staleElapsedSeconds,
          warning: physicalTelemetry.warning
        } : null
      } : {
        ...simulated,
        source: DATA_SOURCE_TYPES.SIMULATED,
        isPhysicalSensor: false,
        staleInfo: null
      };

      // Compute floor coordinates for 2D Digital Twin (Grid positions)
      const col = index % 3;
      const row = Math.floor(index / 3);
      const posX = 120 + col * 260;
      const posY = 100 + row * 180;

      return {
        ...effectiveTelemetry,
        locationCoordinates: { x: posX, y: posY },
        heatIntensity: Math.min(1.0, Math.max(0.1, (effectiveTelemetry.metrics.temperatureC - 30) / 60))
      };
    });

    const totalPowerKw = Math.round(liveNodes.reduce((acc, n) => acc + n.metrics.powerWatts, 0) / 100) / 10;
    const avgTemp = Math.round(liveNodes.reduce((acc, n) => acc + n.metrics.temperatureC, 0) / Math.max(1, liveNodes.length) * 10) / 10;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalNodesOnline: liveNodes.length,
        physicalNodesCount: liveNodes.filter((n) => n.isPhysicalSensor).length,
        totalPowerConsumptionKw: totalPowerKw,
        averageLabTemperatureC: avgTemp,
        labPueIndex: 1.18 // Power Usage Effectiveness
      },
      nodes: liveNodes
    });
  } catch (error) {
    next(error);
  }
});

// ─── 4.1 INGEST PHYSICAL SENSOR TELEMETRY VIA HTTP/MQTT BRIDGE ────────────
router.post("/mqtt/ingest", async (req, res, next) => {
  try {
    const { deviceId = "GPU-H100-01", temperatureC = 55.0, humidityPercent = 50.0, powerWatts = 300, vibrationMmS } = req.body;
    const topic = `labtwin/${deviceId}/telemetry`;
    const payload = JSON.stringify({
      deviceId,
      temperatureC: parseFloat(temperatureC),
      humidityPercent: parseFloat(humidityPercent),
      powerWatts: parseFloat(powerWatts),
      vibrationMmS: vibrationMmS !== undefined ? parseFloat(vibrationMmS) : (temperatureC > 80 ? 1.45 : 0.15),
      source: "ESP32_PHYSICAL_SENSOR",
      timestamp: new Date().toISOString()
    });

    const sample = mqttSubscriberService.ingestTelemetryPayload(topic, payload);
    if (!sample) {
      return res.status(400).json({ success: false, message: "Dữ liệu cảm biến không hợp lệ." });
    }

    res.json({ success: true, message: "Đã nạp telemetry cảm biến vật lý thành công", sample });
  } catch (error) {
    next(error);
  }
});

// ─── 5. CUSTOM GENETIC ALGORITHM SOLVER ENDPOINT ───────────────────────────
router.post("/solve-ga", async (req, res, next) => {
  try {
    const schema = z.object({
      populationSize: z.number().min(10).max(100).default(40),
      maxGenerations: z.number().min(5).max(50).default(25),
      crossoverRate: z.number().min(0.1).max(1.0).default(0.85),
      mutationRate: z.number().min(0.01).max(0.5).default(0.15),
      weights: z.object({
        priority: z.number().default(0.5),
        energy: z.number().default(0.3),
        fairness: z.number().default(0.2)
      }).default({ priority: 0.5, energy: 0.3, fairness: 0.2 }),
      requests: z.array(z.any()).optional()
    });

    const config = schema.parse(req.body);

    const resources = await prisma.resource.findMany();
    
    // Use user-provided requests or generate realistic ones
    let requests = config.requests;
    if (!requests || !requests.length) {
      requests = [
        { id: "req-1", title: "Huấn Luyện Llama-3 8B", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 4, powerWatts: 500, preferredStartHour: 9 },
        { id: "req-2", title: "Fine-tune BERT Y tế", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 3, powerWatts: 420, preferredStartHour: 10 },
        { id: "req-3", title: "Test Bay UAV Tự Hành", userRole: "master_student", projectUrgency: "thesis_defense", durationHours: 2, powerWatts: 150, preferredStartHour: 14 },
        { id: "req-4", title: "Xử Lý Ảnh Depth 3D", userRole: "undergrad_student", projectUrgency: "course_project", durationHours: 2, powerWatts: 200, preferredStartHour: 11 },
        { id: "req-5", title: "Benchmark Vi điều khiển ESP32", userRole: "undergrad_student", projectUrgency: "course_project", durationHours: 2, powerWatts: 80, preferredStartHour: 15 },
        { id: "req-6", title: "Chạy Mô Hình Phân Lớp Âm Thanh", userRole: "master_student", projectUrgency: "thesis_defense", durationHours: 3, powerWatts: 350, preferredStartHour: 13 },
        { id: "req-7", title: "Nghiên Cứu RL Robotics", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 5, powerWatts: 600, preferredStartHour: 8 },
        { id: "req-8", title: "Thực Hành Thị Giác Máy Tính", userRole: "undergrad_student", projectUrgency: "personal_learning", durationHours: 2, powerWatts: 250, preferredStartHour: 16 }
      ];
    }

    const result = solveGeneticScheduling({
      requests,
      resources,
      populationSize: config.populationSize,
      maxGenerations: config.maxGenerations,
      crossoverRate: config.crossoverRate,
      mutationRate: config.mutationRate,
      weights: config.weights
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── 6. WHAT-IF & COUNTERFACTUAL SIMULATION ENDPOINT ──────────────────────
router.post("/what-if", async (req, res, next) => {
  try {
    const { runWhatIfSimulation } = await import("../services/whatIfService.js");
    const { scenarioType = "EXTRA_GPUS", modifier = {} } = req.body;

    const resources = await prisma.resource.findMany();
    const result = runWhatIfSimulation({
      scenarioType,
      baseResources: resources,
      modifier
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── 7. DIGITAL TWIN REPLAY ENDPOINT ──────────────────────────────────────
router.get("/digital-twin/replay", async (req, res, next) => {
  try {
    const { generateDigitalTwinReplay } = await import("../services/digitalTwinV2Service.js");
    const { resourceId, hours = 12 } = req.query;

    const resource = await prisma.resource.findFirst({
      where: resourceId ? { id: resourceId } : {}
    });

    if (!resource) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị." });

    const now = Date.now();
    const startTime = new Date(now - parseInt(hours) * 3600 * 1000);
    const endTime = new Date(now);

    const replayFrames = generateDigitalTwinReplay(resource, startTime, endTime, 15);

    res.json({
      success: true,
      resource: { id: resource.id, code: resource.code, name: resource.name },
      timeRange: { start: startTime.toISOString(), end: endTime.toISOString(), totalFrames: replayFrames.length },
      frames: replayFrames
    });
  } catch (error) {
    next(error);
  }
});

// ─── 8. RESEARCH BENCHMARK RUNNER ENDPOINT ─────────────────────────────────
router.post("/research/benchmark", async (req, res, next) => {
  try {
    const { runAlgorithmBenchmark, runAblationStudy } = await import("../research/benchmarkEngine.js");
    const { mode = "compare", seed = 42 } = req.body;

    const resources = await prisma.resource.findMany();

    if (mode === "ablation") {
      const ablationResults = runAblationStudy([], resources, seed);
      return res.json({ success: true, mode: "ablation", seed, results: ablationResults });
    }

    const benchmarkResults = runAlgorithmBenchmark({
      datasetSizes: [10, 30, 50],
      resources,
      seed
    });

    res.json(benchmarkResults);
  } catch (error) {
    next(error);
  }
});

export default router;
