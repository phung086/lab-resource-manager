import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b2_auth_[a-z0-9_]+$/, "Refusing to seed a non-Batch-2 database");
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname), "Only local PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch2E2E!Pass", 4);
const ids = {
  campus: "b2000000-0000-4000-8000-000000000001",
  building: "b2000000-0000-4000-8000-000000000002",
  lab: "b2000000-0000-4000-8000-000000000003",
  resource: "b2000000-0000-4000-8000-000000000004",
  admin: "b2000000-0000-4000-8000-000000000011",
  staff: "b2000000-0000-4000-8000-000000000012",
  student: "b2000000-0000-4000-8000-000000000013",
  lecturer: "b2000000-0000-4000-8000-000000000014"
};

try {
  await prisma.campus.upsert({
    where: { code: "B2-E2E-CAMPUS" },
    update: {},
    create: { id: ids.campus, name: "Batch 2 E2E Campus", code: "B2-E2E-CAMPUS" }
  });
  await prisma.building.upsert({
    where: { code: "B2-E2E-BUILDING" },
    update: {},
    create: { id: ids.building, campusId: ids.campus, name: "Batch 2 E2E Building", code: "B2-E2E-BUILDING" }
  });
  await prisma.laboratory.upsert({
    where: { code: "B2-E2E-LAB" },
    update: {},
    create: { id: ids.lab, buildingId: ids.building, name: "Batch 2 E2E Laboratory", code: "B2-E2E-LAB" }
  });
  await prisma.resource.upsert({
    where: { code: "B2-E2E-RESOURCE" },
    update: {},
    create: {
      id: ids.resource, laboratoryId: ids.lab, code: "B2-E2E-RESOURCE", name: "Batch 2 E2E Resource",
      subtype: "OTHER", category: "EQUIPMENT", location: "TEST_ONLY", operationalStatus: "AVAILABLE"
    }
  });
  const users = [
    [ids.admin, "e2e.admin@lab.test", "Batch 2 Admin", "ADMIN"],
    [ids.staff, "e2e.staff@lab.test", "Batch 2 Staff", "LAB_STAFF"],
    [ids.student, "e2e.student@lab.test", "Batch 2 Student", "STUDENT"],
    [ids.lecturer, "e2e.lecturer@lab.test", "Batch 2 Lecturer", "LECTURER"]
  ];
  for (const [id, email, fullName, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { fullName, role, passwordHash, isActive: true },
      create: { id, email, fullName, role, passwordHash, isActive: true }
    });
  }
  await prisma.userLabAssignment.upsert({
    where: { userId_laboratoryId: { userId: ids.staff, laboratoryId: ids.lab } },
    update: {},
    create: { userId: ids.staff, laboratoryId: ids.lab }
  });
  console.log(`Seeded Batch 2 E2E fixtures in ${database}`);
} finally {
  await prisma.$disconnect();
}
