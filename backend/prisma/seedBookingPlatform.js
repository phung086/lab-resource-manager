import bcrypt from "bcryptjs";
import { prisma } from "../src/db.js";

async function main() {
  console.log("🌱 Seeding Smart Booking & AI Advisory Platform (2026)...");

  try {
    const passwordHash = await bcrypt.hash("admin123", 10);
    const studentPasswordHash = await bcrypt.hash("student123", 10);

    // 1. Seed Users
    const admin = await prisma.user.upsert({
      where: { email: "admin@lab.local" },
      update: {},
      create: {
        email: "admin@lab.local",
        fullName: "TS. Nguyễn Hoàng Minh",
        passwordHash,
        role: "ADMIN",
        monthlyQuotaHours: 200.0,
        usedQuotaHours: 18.0,
        reputationScore: 100,
        department: "Trung tâm Điều phối AI Lab 2026",
        studentId: "GV-AI-01",
        isActive: true
      }
    });

    const lecturer = await prisma.user.upsert({
      where: { email: "hung.nv@lab-ai.edu.vn" },
      update: {},
      create: {
        email: "hung.nv@lab-ai.edu.vn",
        fullName: "TS. Nguyễn Văn Hùng",
        passwordHash,
        role: "INSTRUCTOR",
        monthlyQuotaHours: 60.0,
        usedQuotaHours: 42.0,
        reputationScore: 99,
        department: "Khoa Công Nghệ Thông Tin",
        studentId: "GV-IT-04",
        isActive: true
      }
    });

    const researcher = await prisma.user.upsert({
      where: { email: "long.lh@lab-ai.edu.vn" },
      update: {},
      create: {
        email: "long.lh@lab-ai.edu.vn",
        fullName: "Lê Hoàng Long",
        passwordHash: studentPasswordHash,
        role: "RESEARCHER",
        monthlyQuotaHours: 80.0,
        usedQuotaHours: 58.0,
        reputationScore: 97,
        department: "Viện Nghiên cứu Trí tuệ Nhân tạo",
        studentId: "NCS-AI-02",
        isActive: true
      }
    });

    const student = await prisma.user.upsert({
      where: { email: "student@lab.local" },
      update: {},
      create: {
        email: "student@lab.local",
        fullName: "Phạm Minh Khôi",
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        monthlyQuotaHours: 30.0,
        usedQuotaHours: 28.0,
        reputationScore: 88,
        department: "KSTN Trí Tuệ Nhân Tạo K66",
        studentId: "20261088",
        isActive: true
      }
    });

    // 2. Seed Resources
    const resources = [
      {
        id: "NODE-DGX-01",
        name: "Cụm GPU NVIDIA DGX H100 SXM5",
        category: "GPU_CLUSTER",
        hourlyRateVnd: 180000,
        capacity: 8,
        location: "Phòng Máy Chủ AI Tầng 4",
        status: "AVAILABLE",
        specsJson: {
          gpu: "8x NVIDIA H100 80GB SXM5",
          vram: "640 GB HBM3 (3.35 TB/s bandwidth)",
          cpu: "Dual AMD EPYC 9654 (192 Cores)",
          ram: "2 TB DDR5-4800 ECC"
        }
      },
      {
        id: "ROOM-IMM-301",
        name: "Phòng Hội Thảo & Lab AI Immersive",
        category: "LAB_ROOM",
        hourlyRateVnd: 250000,
        capacity: 24,
        location: "Tòa Nhà R&D Tầng 3",
        status: "AVAILABLE",
        specsJson: {
          seats: 24,
          displays: "Dual 4K Ultra-Wide 120Hz Interactive",
          audio: "Beamforming Microphone Array",
          network: "10 Gbps Low-Latency Optical Fiber"
        }
      },
      {
        id: "WS-L40S-04",
        name: "Trạm L40S Enterprise Workstation",
        category: "GPU_CLUSTER",
        hourlyRateVnd: 95000,
        capacity: 4,
        location: "Lab Thị Giác Máy Tính 202",
        status: "AVAILABLE",
        specsJson: {
          gpu: "4x NVIDIA L40S 48GB Ada Lovelace",
          vram: "192 GB GDDR6 with ECC",
          cpu: "Intel Xeon W9-3495X (56 Cores)",
          ram: "512 GB DDR5"
        }
      },
      {
        id: "EDGE-ORIN-02",
        name: "Cụm Thử Nghiệm Edge Jetson AGX Orin",
        category: "EDGE_KIT",
        hourlyRateVnd: 60000,
        capacity: 12,
        location: "Lab Robotics & UAV",
        status: "MAINTENANCE",
        specsJson: {
          nodes: "12x Jetson AGX Orin 64GB Industrial",
          compute: "275 TOPS AI Performance each",
          sensors: "LiDAR Livox Mid-360 + RealSense D435i"
        }
      }
    ];

    for (const r of resources) {
      await prisma.resource.upsert({
        where: { id: r.id },
        update: r,
        create: r
      });
    }

    // 3. Seed Sample Bookings
    const today = new Date();
    const slot1Start = new Date(today);
    slot1Start.setHours(9, 0, 0, 0);
    const slot1End = new Date(today);
    slot1End.setHours(11, 0, 0, 0);

    const b1 = await prisma.booking.create({
      data: {
        resourceId: "NODE-DGX-01",
        userId: researcher.id,
        title: "Huấn luyện DeepSeek-R1 Distill (Paper CVPR)",
        startTime: slot1Start,
        endTime: slot1End,
        status: "CONFIRMED",
        totalPriceVnd: 360000,
        checkinCode: "214ae7c1",
        attendeesCount: 2
      }
    });

    await prisma.vietQrTransaction.create({
      data: {
        bookingId: b1.id,
        amountVnd: 360000,
        paymentContent: `LABPAY ${b1.checkinCode.toUpperCase()}`,
        bankCode: "MBBank",
        accountNumber: "99882826888",
        status: "SUCCESS",
        paidAt: new Date()
      }
    });

    // 4. Seed Efficiency Metrics
    await prisma.aiEfficiencyMetric.create({
      data: {
        date: new Date(),
        resourceId: "NODE-DGX-01",
        utilizationRate: 0.845,
        idleHoursSaved: 14.2,
        carbonOffsetKg: 42.5
      }
    });

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.warn("Notice during seeding:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
