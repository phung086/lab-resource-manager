import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b3_resource_[a-z0-9_]+$/, "Refusing to seed a non-Batch-3 database");
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname), "Only local PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch3E2E!Pass", 4);
const ids = {
  campus: "b3000000-0000-4000-8000-000000000001",
  building: "b3000000-0000-4000-8000-000000000002",
  assignedLab: "b3000000-0000-4000-8000-000000000003",
  foreignLab: "b3000000-0000-4000-8000-000000000004",
  assignedResource: "b3000000-0000-4000-8000-000000000005",
  foreignResource: "b3000000-0000-4000-8000-000000000006",
  unresolvedResource: "b3000000-0000-4000-8000-000000000007",
  admin: "b3000000-0000-4000-8000-000000000011",
  staff: "b3000000-0000-4000-8000-000000000012",
  student: "b3000000-0000-4000-8000-000000000013",
  lecturer: "b3000000-0000-4000-8000-000000000014"
};

try {
  await prisma.campus.upsert({ where: { code: "B3-E2E-CAMPUS" }, update: {}, create: { id: ids.campus, name: "Batch 3 E2E Campus", code: "B3-E2E-CAMPUS" } });
  await prisma.building.upsert({ where: { code: "B3-E2E-BUILDING" }, update: {}, create: { id: ids.building, campusId: ids.campus, name: "Batch 3 E2E Building", code: "B3-E2E-BUILDING" } });
  for (const [id, code, name] of [
    [ids.assignedLab, "B3-E2E-LAB-A", "Batch 3 Assigned Lab"],
    [ids.foreignLab, "B3-E2E-LAB-B", "Batch 3 Foreign Lab"]
  ]) {
    await prisma.laboratory.upsert({ where: { code }, update: { name, isActive: true }, create: { id, buildingId: ids.building, code, name } });
  }

  for (const [id, email, fullName, role] of [
    [ids.admin, "b3.admin@lab.test", "Batch 3 Admin", "ADMIN"],
    [ids.staff, "b3.staff@lab.test", "Batch 3 Staff", "LAB_STAFF"],
    [ids.student, "b3.student@lab.test", "Batch 3 Student", "STUDENT"],
    [ids.lecturer, "b3.lecturer@lab.test", "Batch 3 Lecturer", "LECTURER"]
  ]) {
    await prisma.user.upsert({
      where: { email },
      update: { fullName, role, passwordHash, isActive: true },
      create: { id, email, fullName, role, passwordHash, isActive: true }
    });
  }
  await prisma.userLabAssignment.upsert({
    where: { userId_laboratoryId: { userId: ids.staff, laboratoryId: ids.assignedLab } },
    update: {}, create: { userId: ids.staff, laboratoryId: ids.assignedLab }
  });

  for (const resource of [
    { id: ids.assignedResource, laboratoryId: ids.assignedLab, code: "B3-E2E-MICROSCOPE", name: "Kính hiển vi điện tử E2E", subtype: "OTHER", category: "EQUIPMENT", location: "Lab A - Bench 1", description: "Thiết bị kiểm tra luồng resource thật" },
    { id: ids.foreignResource, laboratoryId: ids.foreignLab, code: "B3-E2E-CNC", name: "Máy CNC phòng lab khác", subtype: "OTHER", category: "MACHINE", location: "Lab B - Bay 2", description: "Tài nguyên kiểm tra foreign-lab denial" },
    { id: ids.unresolvedResource, laboratoryId: ids.assignedLab, code: "B3-E2E-UNRESOLVED", name: "Camera chờ phân loại E2E", subtype: "CAMERA", category: null, location: "Lab A - Review", description: "Không được tự động suy đoán category" }
  ]) {
    await prisma.resource.upsert({
      where: { code: resource.code },
      update: { ...resource, operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable" },
      create: { ...resource, operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable" }
    });
  }
  console.log(`Seeded Batch 3 E2E fixtures in ${database}`);
} finally {
  await prisma.$disconnect();
}
