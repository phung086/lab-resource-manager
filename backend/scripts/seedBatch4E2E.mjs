import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b4_booking_[a-z0-9_]+$/, "Refusing to seed a non-Batch-4 database");
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname), "Only local PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch4E2E!Pass", 4);
const ids = {
  campus: "b4000000-0000-4000-8000-000000000001",
  building: "b4000000-0000-4000-8000-000000000002",
  assignedLab: "b4000000-0000-4000-8000-000000000003",
  foreignLab: "b4000000-0000-4000-8000-000000000004",
  policyAssigned: "b4000000-0000-4000-8000-000000000005",
  policyForeign: "b4000000-0000-4000-8000-000000000006",
  immediateResource: "b4000000-0000-4000-8000-000000000007",
  approvalResource: "b4000000-0000-4000-8000-000000000008",
  maintResource: "b4000000-0000-4000-8000-000000000009",
  foreignResource: "b4000000-0000-4000-8000-000000000010",
  admin: "b4000000-0000-4000-8000-000000000011",
  staff: "b4000000-0000-4000-8000-000000000012",
  student: "b4000000-0000-4000-8000-000000000013",
  lecturer: "b4000000-0000-4000-8000-000000000014",
  student2: "b4000000-0000-4000-8000-000000000015",
  maintWindow: "b4000000-0000-4000-8000-000000000020"
};

try {
  await prisma.usageLog.deleteMany({ where: { bookingId: { not: null } } });
  await prisma.booking.deleteMany({});

  await prisma.campus.upsert({
    where: { code: "B4-E2E-CAMPUS" },
    update: {},
    create: { id: ids.campus, name: "Batch 4 E2E Campus", code: "B4-E2E-CAMPUS" }
  });

  await prisma.building.upsert({
    where: { code: "B4-E2E-BUILDING" },
    update: {},
    create: { id: ids.building, campusId: ids.campus, name: "Batch 4 E2E Building", code: "B4-E2E-BUILDING" }
  });

  // Labs
  for (const [id, code, name] of [
    [ids.assignedLab, "B4-E2E-LAB-A", "Batch 4 Assigned Lab"],
    [ids.foreignLab, "B4-E2E-LAB-B", "Batch 4 Foreign Lab"]
  ]) {
    await prisma.laboratory.upsert({
      where: { code },
      update: { name, isActive: true },
      create: { id, buildingId: ids.building, code, name }
    });
  }

  // Lab Policies
  await prisma.labPolicy.upsert({
    where: { laboratoryId: ids.assignedLab },
    update: { minBookingMinutes: 30, maxBookingMinutes: 240, maxAdvanceBookingDays: 30, allowWeekend: true, workDayStartHour: 8, workDayEndHour: 20 },
    create: {
      id: ids.policyAssigned,
      laboratoryId: ids.assignedLab,
      minBookingMinutes: 30,
      maxBookingMinutes: 240,
      maxAdvanceBookingDays: 30,
      allowWeekend: true,
      workDayStartHour: 8,
      workDayEndHour: 20
    }
  });

  await prisma.labPolicy.upsert({
    where: { laboratoryId: ids.foreignLab },
    update: { minBookingMinutes: 30, maxBookingMinutes: 240, maxAdvanceBookingDays: 30, allowWeekend: true, workDayStartHour: 8, workDayEndHour: 20, requiresApproval: true },
    create: {
      id: ids.policyForeign,
      laboratoryId: ids.foreignLab,
      requiresApproval: true,
      minBookingMinutes: 30,
      maxBookingMinutes: 240,
      maxAdvanceBookingDays: 30,
      allowWeekend: true,
      workDayStartHour: 8,
      workDayEndHour: 20
    }
  });

  // Users
  for (const [id, email, fullName, role] of [
    [ids.admin, "b4.admin@lab.test", "Batch 4 Admin", "ADMIN"],
    [ids.staff, "b4.staff@lab.test", "Batch 4 Staff", "LAB_STAFF"],
    [ids.student, "b4.student@lab.test", "Batch 4 Student", "STUDENT"],
    [ids.student2, "b4.student2@lab.test", "Batch 4 Student Two", "STUDENT"],
    [ids.lecturer, "b4.lecturer@lab.test", "Batch 4 Lecturer", "LECTURER"]
  ]) {
    await prisma.user.upsert({
      where: { email },
      update: { fullName, role, passwordHash, isActive: true },
      create: { id, email, fullName, role, passwordHash, isActive: true }
    });
  }

  // Staff assignment to Lab A
  await prisma.userLabAssignment.upsert({
    where: { userId_laboratoryId: { userId: ids.staff, laboratoryId: ids.assignedLab } },
    update: {},
    create: { userId: ids.staff, laboratoryId: ids.assignedLab }
  });

  // Resources
  for (const resource of [
    {
      id: ids.immediateResource,
      laboratoryId: ids.assignedLab,
      code: "B4-E2E-GPU-01",
      name: "Máy trạm AI GPU Node 01",
      subtype: "GPU_SERVER",
      category: "EQUIPMENT",
      location: "Lab A - Rack 1",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    },
    {
      id: ids.approvalResource,
      laboratoryId: ids.assignedLab,
      code: "B4-E2E-ROBOT-01",
      name: "Cánh tay Robot thử nghiệm",
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: "Lab A - Bench 2",
      operationalStatus: "AVAILABLE",
      requiresApproval: true
    },
    {
      id: ids.maintResource,
      laboratoryId: ids.assignedLab,
      code: "B4-E2E-SPECTRO-01",
      name: "Máy quang phổ kiểm tra",
      subtype: "OTHER",
      category: "EQUIPMENT",
      location: "Lab A - Phòng tối",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    },
    {
      id: ids.foreignResource,
      laboratoryId: ids.foreignLab,
      code: "B4-E2E-CNC-01",
      name: "Máy CNC độ chính xác cao",
      subtype: "OTHER",
      category: "MACHINE",
      location: "Lab B - Bay 1",
      operationalStatus: "AVAILABLE",
      requiresApproval: false
    }
  ]) {
    await prisma.resource.upsert({
      where: { code: resource.code },
      update: { ...resource, status: "available", bookingState: "bookable" },
      create: { ...resource, status: "available", bookingState: "bookable" }
    });
  }

  // Maintenance Window on Spectrometer
  const mStart = new Date();
  mStart.setDate(mStart.getDate() + 1);
  mStart.setHours(9, 0, 0, 0);
  const mEnd = new Date(mStart.getTime() + 4 * 60 * 60 * 1000); // 9:00 - 13:00

  await prisma.maintenanceWindow.upsert({
    where: { id: ids.maintWindow },
    update: { startAt: mStart, endAt: mEnd, status: "scheduled" },
    create: {
      id: ids.maintWindow,
      resourceId: ids.maintResource,
      title: "Hiệu chuẩn cảm biến quang học",
      kind: "calibration",
      status: "scheduled",
      startAt: mStart,
      endAt: mEnd
    }
  });

  console.log(`Seeded Batch 4 E2E fixtures in ${database}`);
} finally {
  await prisma.$disconnect();
}
