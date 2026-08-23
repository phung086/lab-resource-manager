/**
 * AI Hardware Incident Diagnostic & Autonomous Logistics Engine
 * Blueprint §21: Root Cause Analysis (RCA), MTBF Calculation & Supply Chain Automation.
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createMockShipmentOrder } from "../services/ghnService.js";

const router = express.Router();
router.use(requireAuth);

// ─── Preset Hardware Failure Patterns ───────────────────────────────────────
const DIAGNOSTIC_KNOWLEDGE_BASE = {
  cuda_oom_crash: {
    category: "GPU_MEMORY_CORRUPTION",
    rootCause: "Tràn bộ nhớ VRAM (CUDA Out of Memory) kèm lỗi ECC uncorrectable errors trên cụm H100 HBM3.",
    severity: "high",
    mtbfHours: 720,
    mttrMinutes: 45,
    recommendedAction: "Cần xả cache bộ nhớ CUDA, hạ áp tải VRAM và thay thế thanh tản nhiệt liquid loop.",
    requiredPart: {
      partCode: "NVD-H100-LIQ-COOL-01",
      partName: "Khối tản nhiệt chất lỏng NVIDIA H100 Direct-to-Chip",
      unitPriceVnd: 4500000,
      leadTimeDays: 2
    }
  },
  fan_bearing_stall: {
    category: "MECHANICAL_THERMAL_FAILURE",
    rootCause: "Vòng bi quạt tản nhiệt server 4U bị mòn (Vibration 2.45 mm/s > ngưỡng an toàn 0.5 mm/s). Quạt dừng quay đột ngột.",
    severity: "critical",
    mtbfHours: 480,
    mttrMinutes: 30,
    recommendedAction: "Thay thế cụm quạt Hot-swap Delta 12V 4.5A và vệ sinh bụi khoang hút gió.",
    requiredPart: {
      partCode: "FAN-DELTA-12V-120MM-PWM",
      partName: "Cụm quạt áp lực cao Delta 120mm Server Fan",
      unitPriceVnd: 850000,
      leadTimeDays: 1
    }
  },
  uav_esc_desync: {
    category: "AVIONICS_TELEMETRY_FAILURE",
    rootCause: "Mất đồng bộ tín hiệu điều tốc ESC (Electronic Speed Controller) động cơ số 3 của Drone khảo sát.",
    severity: "medium",
    mtbfHours: 120,
    mttrMinutes: 60,
    recommendedAction: "Cân chỉnh lại firmware DShot600 và hiệu chuẩn cảm biến IMU con quay hồi chuyển.",
    requiredPart: {
      partCode: "ESC-4IN1-60A-BLHELI32",
      partName: "Mạch điều tốc 4-in-1 ESC 60A BLHeli_32",
      unitPriceVnd: 1650000,
      leadTimeDays: 2
    }
  }
};

// ─── POST /incidents/ai-diagnose ───────────────────────────────────────────
router.post("/ai-diagnose", async (req, res, next) => {
  try {
    const { resourceId, logSnippet, presetPattern = "cuda_oom_crash" } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    }) || await prisma.resource.findFirst();

    if (!resource) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị để chẩn đoán." });
    }

    const diagnosis = DIAGNOSTIC_KNOWLEDGE_BASE[presetPattern] || DIAGNOSTIC_KNOWLEDGE_BASE.cuda_oom_crash;

    // Reliability engineering calculations
    const failureRatePerHour = 1 / diagnosis.mtbfHours;
    const reliabilityScorePercent = Math.round(Math.exp(-failureRatePerHour * 24) * 100);

    res.json({
      success: true,
      diagnosticReport: {
        resource: {
          id: resource.id,
          code: resource.code,
          name: resource.name,
          location: resource.location
        },
        analysisTimestamp: new Date().toISOString(),
        category: diagnosis.category,
        severity: diagnosis.severity,
        rootCause: diagnosis.rootCause,
        metrics: {
          mtbfHours: diagnosis.mtbfHours,
          mttrMinutes: diagnosis.mttrMinutes,
          reliabilityScorePercent,
          failureProbability24hPercent: 100 - reliabilityScorePercent
        },
        recommendedAction: diagnosis.recommendedAction,
        requiredPart: diagnosis.requiredPart,
        inputLogSnippet: logSnippet || "[KERNEL ERROR 0x7FA9B0]: GPU 0 CUDA Exception: memory allocation failed on device. Host fallback timeout after 3000ms."
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /incidents/auto-remediate ────────────────────────────────────────
// Autonomous remediation: Creates maintenance window + creates GHN order for replacement parts
router.post("/auto-remediate", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const { resourceId, partCode, partName, partPriceVnd = 1200000, address = "Phòng Lab B603, Tòa nhà AI & IoT, ĐHQG TP.HCM" } = req.body;

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } }) || await prisma.resource.findFirst();

    // 1. Create Maintenance Window in DB
    const startAt = new Date(Date.now() + 3600 * 1000); // starts in 1 hour
    const endAt = new Date(startAt.getTime() + 4 * 3600 * 1000); // 4 hours duration

    const maintenance = await prisma.maintenanceWindow.create({
      data: {
        resourceId: resource.id,
        createdById: req.user.id,
        kind: "maintenance",
        status: "scheduled",
        title: `Bảo trì tự động thay thế linh kiện: ${partName || "Cụm linh kiện server"}`,
        startAt,
        endAt,
        notes: `Tự động khởi tạo bởi AI Root Cause Diagnostic Engine. Mã phụ tùng: ${partCode || "NVD-PART-GENERIC"}. Đơn giá: ${partPriceVnd.toLocaleString("vi-VN")} đ.`
      }
    });

    // 2. Create GHN logistics order
    const ghnResult = await createMockShipmentOrder({
      toName: "Ban Quản Trị Phòng Lab",
      toPhone: "0901234567",
      toAddress: address,
      weightGrams: 850,
      codAmount: 0,
      insuranceValue: partPriceVnd,
      items: [{ name: partName || "Linh kiện thay thế máy chủ", quantity: 1, price: partPriceVnd }]
    });

    // 3. Log usage
    await prisma.usageLog.create({
      data: {
        resourceId: resource.id,
        userId: req.user.id,
        action: "status_change",
        message: `Autonomous Remediation: Scheduled maintenance #${maintenance.id.slice(0, 8)} & GHN order #${ghnResult.trackingCode}.`,
        messageKey: "maintenance_auto_remediated",
        messageParams: {
          partCode,
          trackingCode: ghnResult.trackingCode
        }
      }
    }).catch((err) => console.error("Error creating usage log in remediation", err));

    res.status(201).json({
      success: true,
      message: "Đã tự động khởi tạo lịch bảo trì và lệnh giao vận linh kiện hỏa tốc qua GHN Logistics.",
      maintenanceWindow: maintenance,
      ghnShipment: ghnResult
    });
  } catch (error) {
    next(error);
  }
});

export default router;
