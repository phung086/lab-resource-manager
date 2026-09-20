import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b5_operations_[a-z0-9_]+$/, "Refusing to seed a non-Batch-5 database");
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname), "Only local PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch5E2E!Pass", 4);
const ids = {
  campus: "b5000000-0000-4000-8000-000000000001",
  building: "b5000000-0000-4000-8000-000000000002",
  assignedLab: "b5000000-0000-4000-8000-000000000003",
  foreignLab: "b5000000-0000-4000-8000-000000000004",
  policyAssigned: "b5000000-0000-4000-8000-000000000005",
  policyForeign: "b5000000-0000-4000-8000-000000000006",
  resource: "b5000000-0000-4000-8000-000000000007",
  foreignResource: "b5000000-0000-4000-8000-000000000008",
  admin: "b5000000-0000-4000-8000-000000000011",
  staff: "b5000000-0000-4000-8000-000000000012",
  foreignStaff: "b5000000-0000-4000-8000-000000000013",
  student: "b5000000-0000-4000-8000-000000000014",
  lecturer: "b5000000-0000-4000-8000-000000000015",
  bookingLifecycle: "b5000000-0000-4000-8000-000000000021",
  bookingReject: "b5000000-0000-4000-8000-000000000022",
  bookingForeign: "b5000000-0000-4000-8000-000000000023"
};

const startAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
startAt.setUTCHours(3, 0, 0, 0);
const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
const secondStart = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);
const secondEnd = new Date(secondStart.getTime() + 60 * 60 * 1000);

try {
  await prisma.notification.deleteMany({ where: { userId: { in: [ids.student, ids.lecturer] } } });
  await prisma.usageLog.deleteMany({ where: { bookingId: { in: [ids.bookingLifecycle, ids.bookingReject, ids.bookingForeign] } } });
  await prisma.booking.deleteMany({ where: { id: { in: [ids.bookingLifecycle, ids.bookingReject, ids.bookingForeign] } } });

  await prisma.campus.upsert({
    where: { code: "B5-E2E-CAMPUS" }, update: {},
    create: { id: ids.campus, name: "Batch 5 E2E Campus", code: "B5-E2E-CAMPUS" }
  });
  await prisma.building.upsert({
    where: { code: "B5-E2E-BUILDING" }, update: {},
    create: { id: ids.building, campusId: ids.campus, name: "Batch 5 E2E Building", code: "B5-E2E-BUILDING" }
  });

  for (const [id, code, name] of [
    [ids.assignedLab, "B5-E2E-LAB-A", "Phòng thí nghiệm vận hành A"],
    [ids.foreignLab, "B5-E2E-LAB-B", "Phòng thí nghiệm vận hành B"]
  ]) {
    await prisma.laboratory.upsert({
      where: { code },
      update: { name, isActive: true },
      create: { id, buildingId: ids.building, code, name, isActive: true }
    });
  }

  for (const [id, laboratoryId] of [[ids.policyAssigned, ids.assignedLab], [ids.policyForeign, ids.foreignLab]]) {
    await prisma.labPolicy.upsert({
      where: { laboratoryId },
      update: { minBookingMinutes: 15, maxBookingMinutes: 480, maxAdvanceBookingDays: 3650, allowWeekend: true, workDayStartHour: 0, workDayEndHour: 23 },
      create: { id, laboratoryId, minBookingMinutes: 15, maxBookingMinutes: 480, maxAdvanceBookingDays: 3650, allowWeekend: true, workDayStartHour: 0, workDayEndHour: 23 }
    });
  }

  for (const [id, email, fullName, role] of [
    [ids.admin, "b5.admin@lab.test", "Batch 5 Admin", "ADMIN"],
    [ids.staff, "b5.staff@lab.test", "Batch 5 Staff", "LAB_STAFF"],
    [ids.foreignStaff, "b5.foreign.staff@lab.test", "Batch 5 Foreign Staff", "LAB_STAFF"],
    [ids.student, "b5.student@lab.test", "Batch 5 Student", "STUDENT"],
    [ids.lecturer, "b5.lecturer@lab.test", "Batch 5 Lecturer", "LECTURER"]
  ]) {
    await prisma.user.upsert({
      where: { email },
      update: { fullName, role, passwordHash, isActive: true },
      create: { id, email, fullName, role, passwordHash, isActive: true }
    });
  }

  for (const [userId, laboratoryId] of [[ids.staff, ids.assignedLab], [ids.foreignStaff, ids.foreignLab]]) {
    await prisma.userLabAssignment.upsert({
      where: { userId_laboratoryId: { userId, laboratoryId } },
      update: {},
      create: { userId, laboratoryId }
    });
  }

  for (const resource of [
    { id: ids.resource, laboratoryId: ids.assignedLab, code: "B5-E2E-ROBOT-01", name: "Cánh tay robot bàn giao thử nghiệm", subtype: "OTHER", category: "EQUIPMENT", location: "Lab A - Bench 5", requiresApproval: true },
    { id: ids.foreignResource, laboratoryId: ids.foreignLab, code: "B5-E2E-CNC-FOREIGN", name: "Máy CNC ngoài phạm vi cán bộ A", subtype: "OTHER", category: "MACHINE", location: "Lab B - Bay 2", requiresApproval: true }
  ]) {
    await prisma.resource.upsert({
      where: { code: resource.code },
      update: { ...resource, operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable" },
      create: { ...resource, operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable" }
    });
  }

  await prisma.booking.createMany({
    data: [
      { id: ids.bookingLifecycle, resourceId: ids.resource, requestedById: ids.student, title: "Batch 5 lifecycle booking", purpose: "E2E approval, handover, return and completion", startAt, endAt, status: "PENDING_APPROVAL" },
      { id: ids.bookingReject, resourceId: ids.resource, requestedById: ids.lecturer, title: "Batch 5 rejection booking", purpose: "E2E rejection reason and notification", startAt: secondStart, endAt: secondEnd, status: "PENDING_APPROVAL" },
      { id: ids.bookingForeign, resourceId: ids.foreignResource, requestedById: ids.student, title: "Batch 5 foreign lab booking", purpose: "E2E lab scope denial", startAt, endAt, status: "PENDING_APPROVAL" }
    ]
  });

  for (const [bookingId, resourceId, userId, message] of [
    [ids.bookingLifecycle, ids.resource, ids.student, "Batch 5 lifecycle request"],
    [ids.bookingReject, ids.resource, ids.lecturer, "Batch 5 rejection request"],
    [ids.bookingForeign, ids.foreignResource, ids.student, "Batch 5 foreign request"]
  ]) {
    await prisma.usageLog.create({
      data: {
        id: crypto.randomUUID(),
        resourceId,
        bookingId,
        userId,
        actorType: "USER",
        action: "REQUEST",
        toStatus: "PENDING_APPROVAL",
        message,
        messageKey: "booking_created"
      }
    });
  }

  console.log(`Seeded Batch 5 E2E fixtures in ${database}`);
} finally {
  await prisma.$disconnect();
}
