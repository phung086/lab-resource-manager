import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting domain data seed...");

  // 1. Users
  const passwordHash = await bcrypt.hash("AdminPass123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@lab.local" },
    update: { fullName: "Quản trị viên Hệ thống", role: "admin", passwordHash, isActive: true },
    create: { email: "admin@lab.local", fullName: "Quản trị viên Hệ thống", role: "admin", passwordHash, isActive: true }
  });

  const staffHash = await bcrypt.hash("StaffPass123!", 12);
  const staff = await prisma.user.upsert({
    where: { email: "staff@lab.local" },
    update: { fullName: "Kỹ thuật viên Lab", role: "lab_staff", passwordHash: staffHash, isActive: true },
    create: { email: "staff@lab.local", fullName: "Kỹ thuật viên Lab", role: "lab_staff", passwordHash: staffHash, isActive: true }
  });

  const studentHash = await bcrypt.hash("StudentPass123!", 12);
  const student = await prisma.user.upsert({
    where: { email: "student@lab.local" },
    update: { fullName: "Sinh viên Nguyễn Văn A", role: "student", passwordHash: studentHash, isActive: true, studentId: "SV20260001" },
    create: { email: "student@lab.local", fullName: "Sinh viên Nguyễn Văn A", role: "student", passwordHash: studentHash, isActive: true, studentId: "SV20260001" }
  });

  console.log("✅ Users created:", admin.email, staff.email, student.email);

  // 2. Campus, Building & Laboratory Hierarchy
  const campus = await prisma.campus.upsert({
    where: { code: "CAMPUS_MAIN" },
    update: {},
    create: {
      code: "CAMPUS_MAIN",
      name: "Cơ sở Chính - Trường Đại Học",
      address: "123 Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM"
    }
  });

  const building = await prisma.building.upsert({
    where: { code: "BLDG_A" },
    update: {},
    create: {
      campusId: campus.id,
      code: "BLDG_A",
      name: "Tòa nhà Công nghệ A"
    }
  });

  const labAI = await prisma.laboratory.upsert({
    where: { code: "LAB_AI_01" },
    update: {},
    create: {
      buildingId: building.id,
      code: "LAB_AI_01",
      name: "Phòng Thí Nghiệm Trí Tuệ Nhân Tạo & Thống Kê Dữ Liệu",
      description: "Phòng lab phục vụ nghiên cứu Deep Learning, GPU Server và IoT",
      capacity: 30,
      openingTime: "08:00",
      closingTime: "21:00",
      isActive: true,
      labPolicy: {
        create: {
          maxBookingMinutes: 480,
          minBookingMinutes: 30,
          maxAdvanceBookingDays: 14,
          checkInGraceMinutes: 20,
          requiresApproval: true,
          workDayStartHour: 8,
          workDayEndHour: 21
        }
      }
    }
  });

  const labRobotics = await prisma.laboratory.upsert({
    where: { code: "LAB_ROBOTICS_02" },
    update: {},
    create: {
      buildingId: building.id,
      code: "LAB_ROBOTICS_02",
      name: "Phòng Thí Nghiệm Robot & Thiết Bị Tự Hành",
      description: "Phòng lab nghiên cứu UAV, Drone, và Cảm biến",
      capacity: 20,
      openingTime: "08:00",
      closingTime: "18:00",
      isActive: true,
      labPolicy: {
        create: {
          maxBookingMinutes: 240,
          minBookingMinutes: 30,
          maxAdvanceBookingDays: 7,
          checkInGraceMinutes: 15,
          requiresApproval: true,
          workDayStartHour: 8,
          workDayEndHour: 18
        }
      }
    }
  });

  console.log("✅ Campus, Building & Labs created");

  // 3. Equipment / Resources
  const gpuServer1 = await prisma.resource.upsert({
    where: { code: "GPU-NODE-01" },
    update: { laboratoryId: labAI.id },
    create: {
      code: "GPU-NODE-01",
      name: "NVIDIA DGX A100 High-Performance Workstation",
      type: "gpu_server",
      location: "Khu vực Server Rack 01 - Phòng LAB_AI_01",
      laboratoryId: labAI.id,
      operationalStatus: "available",
      bookingState: "bookable",
      status: "available",
      capacity: 1,
      requiresApproval: true,
      manufacturer: "NVIDIA",
      model: "DGX A100 80GB",
      description: "Server huấn luyện mô hình AI/LLM hiệu năng cực cao với 8x A100 GPUs.",
      specs: { gpu: "8x NVIDIA A100 80GB", vram: "640GB", cpu: "AMD EPYC 7742 128-Core", ram: "1TB DDR4" }
    }
  });

  const uavDrone = await prisma.resource.upsert({
    where: { code: "UAV-MATRICE-300" },
    update: { laboratoryId: labRobotics.id },
    create: {
      code: "UAV-MATRICE-300",
      name: "DJI Matrice 300 RTK Industrial Drone",
      type: "uav",
      location: "Tủ thiết bị bay - Phòng LAB_ROBOTICS_02",
      laboratoryId: labRobotics.id,
      operationalStatus: "available",
      bookingState: "bookable",
      status: "available",
      capacity: 1,
      requiresApproval: true,
      manufacturer: "DJI",
      model: "Matrice 300 RTK",
      description: "Thiết bị bay trinh sát và đo đạc địa hình công nghiệp tịnh tiến cao cấp.",
      specs: { flightTime: "55 mins", maxPayload: "2.7kg", range: "15km" }
    }
  });

  const raspPiKit = await prisma.resource.upsert({
    where: { code: "RPI-KIT-05" },
    update: { laboratoryId: labAI.id },
    create: {
      code: "RPI-KIT-05",
      name: "Bộ Thí Nghiệm Raspberry Pi 5 8GB & Sensor Array",
      type: "raspberry_pi",
      location: "Tủ Bàn 3 - Phòng LAB_AI_01",
      laboratoryId: labAI.id,
      operationalStatus: "available",
      bookingState: "bookable",
      status: "available",
      capacity: 1,
      requiresApproval: false,
      manufacturer: "Raspberry Pi Foundation",
      model: "Raspberry Pi 5 8GB",
      description: "Bộ kit thực hành nhúng và xử lý tín hiệu cạnh IoT.",
      specs: { ram: "8GB", storage: "128GB NVMe", OS: "Ubuntu Server 24.04 LTS" }
    }
  });

  console.log("✅ Equipment Resources created");

  // 4. Equipment Capabilities
  await prisma.resourceCapability.upsert({
    where: { resourceId_key: { resourceId: gpuServer1.id, key: "gpu_architecture" } },
    update: { value: "Ampere", unit: "" },
    create: { resourceId: gpuServer1.id, key: "gpu_architecture", value: "Ampere", unit: "" }
  });
  await prisma.resourceCapability.upsert({
    where: { resourceId_key: { resourceId: gpuServer1.id, key: "vram_total_gb" } },
    update: { value: "640", unit: "GB" },
    create: { resourceId: gpuServer1.id, key: "vram_total_gb", value: "640", unit: "GB" }
  });

  // 5. Training Courses & Requirements
  const courseSafety = await prisma.trainingCourse.upsert({
    where: { code: "SAFE-101" },
    update: {},
    create: {
      code: "SAFE-101",
      name: "An Toàn Lao Động & Quy Tắc Sử Dụng Phòng Thí Nghiệm",
      description: "Khoá học bắt buộc về an toàn điện, phòng chống cháy nổ và nội quy chung.",
      durationHours: 2,
      isRequired: true
    }
  });

  const courseUAV = await prisma.trainingCourse.upsert({
    where: { code: "UAV-PILOT-201" },
    update: {},
    create: {
      code: "UAV-PILOT-201",
      name: "Chứng Chỉ Vận Hành Thiết Bị Bay Không Người Lái (UAV Safety & Operation)",
      description: "Quy trình điều khiển bay an toàn, cấp phép độ cao và xử lý khẩn cấp.",
      durationHours: 8,
      isRequired: true
    }
  });

  // Gắn requirement cho UAV
  await prisma.trainingRequirement.upsert({
    where: { resourceId_courseId: { resourceId: uavDrone.id, courseId: courseUAV.id } },
    update: {},
    create: { resourceId: uavDrone.id, courseId: courseUAV.id, isMandatory: true }
  });

  // Cấp chứng chỉ cho Student (học khoá an toàn)
  await prisma.userCertification.upsert({
    where: { userId_courseId: { userId: student.id, courseId: courseSafety.id } },
    update: { status: "active" },
    create: { userId: student.id, courseId: courseSafety.id, status: "active" }
  });

  // Create additional academic roles
  const phd = await prisma.user.upsert({
    where: { email: "phd@lab.local" },
    update: { fullName: "NCS. Trần Tiến Dũng (PhD)", role: "student", passwordHash: studentHash, isActive: true, studentId: "NCS202601" },
    create: { email: "phd@lab.local", fullName: "NCS. Trần Tiến Dũng (PhD)", role: "student", passwordHash: studentHash, isActive: true, studentId: "NCS202601" }
  });

  const master = await prisma.user.upsert({
    where: { email: "master@lab.local" },
    update: { fullName: "ThS. Lê Hoàng Yến (Master)", role: "student", passwordHash: studentHash, isActive: true, studentId: "CH202602" },
    create: { email: "master@lab.local", fullName: "ThS. Lê Hoàng Yến (Master)", role: "student", passwordHash: studentHash, isActive: true, studentId: "CH202602" }
  });

  console.log("✅ Users created:", admin.email, staff.email, student.email, phd.email, master.email);

  // 6. Seed Policy Versions (Smart Lab V2)
  const energyPolicy = await prisma.policyVersion.upsert({
    where: { id: "policy-energy-2026" },
    update: {},
    create: {
      id: "policy-energy-2026",
      policyType: "energy",
      version: "2026.1",
      name: "Biểu Giá Điện & Khung Giờ Xanh EVN 2026",
      configuration: {
        tariffs: { offPeakVnd: 1100, standardVnd: 1685, peakVnd: 3190 },
        gridEmissionFactorKgPerKwh: 0.722,
        nightEmissionFactorKgPerKwh: 0.410
      }
    }
  });

  const fairnessPolicy = await prisma.policyVersion.upsert({
    where: { id: "policy-fairness-2026" },
    update: {},
    create: {
      id: "policy-fairness-2026",
      policyType: "fairness",
      version: "2026.1",
      name: "Chính Sách Hạn Mức Công Bằng Fair-share & Jain Index",
      configuration: {
        targetJainIndex: 0.85,
        maxWeeklyHoursPerStudent: 20,
        minPriorityGapForBump: 25
      }
    }
  });

  console.log("✅ Policy Versions seeded:", energyPolicy.name, fairnessPolicy.name);

  // 7. Seed Initial Orchestration Run & Proposed Allocation (Golden Flow Seed)
  const optRun = await prisma.optimizationRun.create({
    data: {
      algorithm: "NSGA2",
      algorithmVersion: "2.0",
      datasetVersion: "thesis-baseline-v2",
      policyVersionId: energyPolicy.id,
      populationSize: 40,
      generations: 25,
      runtimeMs: 18,
      objectiveWeights: { priority: 0.4, energy: 0.3, fairness: 0.2 },
      metricsSummary: { conflicts: 0, jainsIndex: 0.94, greenSlotRatio: 75 }
    }
  });

  const req1 = await prisma.resourceRequirement.create({
    data: {
      userId: phd.id,
      resourceType: "gpu_server",
      minVramGb: 80,
      durationMinutes: 240,
      priorityScore: 92,
      projectUrgency: "paper_deadline"
    }
  });

  const startAt = new Date();
  startAt.setHours(22, 0, 0, 0); // 22:00 Off-peak green hour
  const endAt = new Date(startAt.getTime() + 4 * 3600 * 1000);

  const alloc1 = await prisma.resourceAllocation.create({
    data: {
      requirementId: req1.id,
      resourceId: gpuServer1.id,
      startAt,
      endAt,
      allocationStatus: "proposed",
      optimizationRunId: optRun.id,
      totalScore: 92,
      energyScore: 95,
      fairnessScore: 88,
      healthScore: 94,
      explanation: {
        priorityContribution: 92,
        energySavingScore: 25,
        fairnessGain: 12,
        humanExplanation: "Phân bổ tối ưu vào khung giờ Xanh (22:00 - 1.100 đ/kWh), tiết kiệm 65% điện năng và ưu tiên cao cho Nghiên cứu sinh (Bài báo Q1)."
      }
    }
  });

  await prisma.optimizationDecision.create({
    data: {
      runId: optRun.id,
      allocationId: alloc1.id,
      objectiveVector: [0, 4400, 1.2, 0.94],
      paretoRank: 1,
      crowdingDistance: 1.25,
      explanation: "Nghiệm Pareto Rank 1 cân bằng giữa chi phí điện năng và thời gian chờ."
    }
  });

  console.log("✅ Orchestration Golden Flow demo seed created:", alloc1.id);
  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
