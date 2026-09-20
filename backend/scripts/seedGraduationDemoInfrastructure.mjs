import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const databaseName = databaseUrl.pathname.replace(/^\//, "");
const allowedHosts = new Set(["127.0.0.1", "localhost", "postgres"]);

assert.equal(process.env.DEMO_MODE, "true", "DEMO_MODE=true is required");
assert.ok(databaseName.includes("_demo"), "Demo bootstrap refuses databases without an _demo marker");
assert.ok(allowedHosts.has(databaseUrl.hostname), "Demo bootstrap refuses non-local/non-compose database hosts");

const prisma = new PrismaClient();

const CAMPUS_ID = "b7000000-0000-4000-8000-000000000001";
const BUILDING_ID = "b7000000-0000-4000-8000-000000000002";
const LAB_ID = "b7000000-0000-4000-8000-000000000003";
const POLICY_ID = "b7000000-0000-4000-8000-000000000004";

try {
  await prisma.campus.upsert({
    where: { code: "DEMO-CAMPUS" },
    update: {
      name: "Cơ sở Demo Đồ án",
      address: "Môi trường demo cục bộ"
    },
    create: {
      id: CAMPUS_ID,
      code: "DEMO-CAMPUS",
      name: "Cơ sở Demo Đồ án",
      address: "Môi trường demo cục bộ"
    }
  });

  await prisma.building.upsert({
    where: { code: "DEMO-BLDG-A" },
    update: {
      campusId: CAMPUS_ID,
      name: "Tòa nhà Demo A"
    },
    create: {
      id: BUILDING_ID,
      campusId: CAMPUS_ID,
      code: "DEMO-BLDG-A",
      name: "Tòa nhà Demo A"
    }
  });

  await prisma.laboratory.upsert({
    where: { code: "DEMO-LAB-A" },
    update: {
      buildingId: BUILDING_ID,
      name: "Phòng thí nghiệm Demo A",
      description: "Hạ tầng tối thiểu cho kịch bản bảo vệ đồ án",
      capacity: 30,
      openingTime: "08:00",
      closingTime: "20:00",
      isActive: true
    },
    create: {
      id: LAB_ID,
      buildingId: BUILDING_ID,
      code: "DEMO-LAB-A",
      name: "Phòng thí nghiệm Demo A",
      description: "Hạ tầng tối thiểu cho kịch bản bảo vệ đồ án",
      capacity: 30,
      openingTime: "08:00",
      closingTime: "20:00",
      isActive: true
    }
  });

  await prisma.labPolicy.upsert({
    where: { laboratoryId: LAB_ID },
    update: {
      maxBookingMinutes: 480,
      minBookingMinutes: 15,
      maxAdvanceBookingDays: 30,
      checkInGraceMinutes: 20,
      requiresApproval: true,
      allowWeekend: true,
      workDayStartHour: 8,
      workDayEndHour: 20
    },
    create: {
      id: POLICY_ID,
      laboratoryId: LAB_ID,
      maxBookingMinutes: 480,
      minBookingMinutes: 15,
      maxAdvanceBookingDays: 30,
      checkInGraceMinutes: 20,
      requiresApproval: true,
      allowWeekend: true,
      workDayStartHour: 8,
      workDayEndHour: 20
    }
  });

  console.log(`Graduation demo infrastructure ready in ${databaseName}: DEMO-LAB-A`);
} finally {
  await prisma.$disconnect();
}
