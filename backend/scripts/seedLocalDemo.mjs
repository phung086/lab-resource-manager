import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { validateLocalDemoEnvironment } from "./localDemoGuard.mjs";

const database = validateLocalDemoEnvironment(process.env);
const prisma = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash("LabDemo!2026Pass", 12);
  await prisma.$transaction(async tx => {
    // Serialize repeat invocations; never delete or reset any workflow records.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260922, 410)`;
    const accounts = [
      ["admin", "ADMIN", "LRM Demo Administrator"],
      ["staff", "LAB_STAFF", "LRM Demo Lab Staff"],
      ["lecturer", "LECTURER", "LRM Demo Lecturer"],
      ["student", "STUDENT", "LRM Demo Student"],
    ];
    const users = {};
    for (const [name, role, fullName] of accounts) {
      const email = `${name}@lrm.local`;
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing && (existing.role !== role || existing.fullName !== fullName)) throw new Error(`Refusing to overwrite a conflicting account: ${email}`);
      users[name] = await tx.user.upsert({ where: { email }, update: {}, create: { id: randomUUID(), email, fullName, role, passwordHash, department: "LOCAL DEMO" } });
    }
    const campus = await tx.campus.upsert({ where: { code: "LOCAL-DEMO" }, update: {}, create: { id: randomUUID(), code: "LOCAL-DEMO", name: "Cơ sở thực hành — Local Demo", address: "Môi trường trình diễn cục bộ" } });
    const building = await tx.building.upsert({ where: { code: "LOCAL-DEMO-A" }, update: {}, create: { id: randomUUID(), code: "LOCAL-DEMO-A", name: "Khu thực hành A", campusId: campus.id } });
    const labs = [];
    for (const [index, name] of ["LAB Điện tử & Đo lường", "LAB Chế tạo & Thực nghiệm"].entries()) {
      const code = `LOCAL-LAB-${index + 1}`;
      const lab = await tx.laboratory.upsert({ where: { code }, update: {}, create: { id: randomUUID(), code, name, buildingId: building.id, capacity: 24, openingTime: "08:00", closingTime: "20:00", description: "LOCAL DEMO — dữ liệu cấu hình minh họa, chưa kết nối phần cứng" } });
      labs.push(lab);
      await tx.labPolicy.upsert({ where: { laboratoryId: lab.id }, update: {}, create: { id: randomUUID(), laboratoryId: lab.id, maxBookingMinutes: 480, minBookingMinutes: 15, maxAdvanceBookingDays: 30, requiresApproval: true, allowWeekend: true, workDayStartHour: 8, workDayEndHour: 20 } });
      await tx.userLabAssignment.upsert({ where: { userId_laboratoryId: { userId: users.staff.id, laboratoryId: lab.id } }, update: {}, create: { userId: users.staff.id, laboratoryId: lab.id } });
    }
    const resources = [
      ["ROOM-01", "Phòng thực hành điện tử", "ROOM", "ROOM", 0, "AVAILABLE", 24],
      ["ROOM-02", "Phòng thực hành chế tạo", "ROOM", "ROOM", 1, "AVAILABLE", 20],
      ["EQ-01", "Máy hiện sóng số", "EQUIPMENT", "OTHER", 0, "AVAILABLE", 1],
      ["EQ-02", "Đồng hồ vạn năng số", "EQUIPMENT", "OTHER", 0, "CALIBRATION", 1],
      ["EQ-03", "Camera quan sát thí nghiệm", "EQUIPMENT", "CAMERA", 1, "OFFLINE", 1],
      ["MC-01", "Máy in 3D thực hành", "MACHINE", "OTHER", 1, "AVAILABLE", 1],
      ["MC-02", "Máy khoan bàn thực hành", "MACHINE", "OTHER", 1, "MAINTENANCE", 1],
      ["KIT-01", "Bộ thí nghiệm mạch điện", "EXPERIMENT_KIT", "KIT", 0, "AVAILABLE", 1],
      ["KIT-02", "Bộ thực hành cảm biến", "EXPERIMENT_KIT", "KIT", 1, "AVAILABLE", 1],
      ["MAT-01", "Bộ dây nối mạch thí nghiệm", "MATERIAL", "MATERIAL", 0, "AVAILABLE", 1],
      ["MAT-02", "Cuộn nhựa PLA thực hành", "MATERIAL", "MATERIAL", 1, "AVAILABLE", 1],
    ];
    for (const [suffix, name, category, subtype, labIndex, operationalStatus, capacity] of resources) {
      const code = `LOCAL-${suffix}`;
      await tx.resource.upsert({ where: { code }, update: {}, create: { id: randomUUID(), code, name, category, subtype, laboratoryId: labs[labIndex].id, location: labs[labIndex].name, ownerTeam: "LOCAL DEMO", operationalStatus, status: operationalStatus === "AVAILABLE" ? "available" : operationalStatus === "OFFLINE" ? "offline" : "maintenance", capacity, requiresApproval: true, bookingState: "bookable", description: "LOCAL DEMO — trạng thái cấu hình minh họa, không phải dữ liệu phần cứng thực tế.", specs: { environment: "LOCAL_DEMO" } } });
    }
  }, { timeout: 30000 });
  console.log(`Local demo ready: ${database}; 4 accounts, 2 labs, 11 resources. Existing rows preserved. No bookings, payments, incidents, telemetry or audit events are seeded.`);
} finally {
  await prisma.$disconnect();
}
