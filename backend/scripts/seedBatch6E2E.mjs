import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
const database = databaseUrl.pathname.slice(1);
assert.match(database, /^lab_resources_b6_monitoring_[a-z0-9_]+$/, "Refusing to seed a non-Batch-6 database");
assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname), "Only local PostgreSQL is allowed");

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Batch6E2E!Pass", 4);
const now = new Date();

const ids = {
  campus: "b6000000-0000-4000-8000-000000000001",
  building: "b6000000-0000-4000-8000-000000000002",
  assignedLab: "b6000000-0000-4000-8000-000000000003",
  foreignLab: "b6000000-0000-4000-8000-000000000004",
  policyAssigned: "b6000000-0000-4000-8000-000000000005",
  policyForeign: "b6000000-0000-4000-8000-000000000006",
  admin: "b6000000-0000-4000-8000-000000000011",
  staff: "b6000000-0000-4000-8000-000000000012",
  foreignStaff: "b6000000-0000-4000-8000-000000000013",
  student: "b6000000-0000-4000-8000-000000000014",
  resources: {
    healthy: "b6000000-0000-4000-8000-000000000021",
    warning: "b6000000-0000-4000-8000-000000000022",
    stale: "b6000000-0000-4000-8000-000000000023",
    offline: "b6000000-0000-4000-8000-000000000024",
    noData: "b6000000-0000-4000-8000-000000000025",
    foreign: "b6000000-0000-4000-8000-000000000026"
  },
  incidents: {
    assigned: "b6000000-0000-4000-8000-000000000031",
    foreign: "b6000000-0000-4000-8000-000000000032"
  },
  notifications: {
    visible: "b6000000-0000-4000-8000-000000000041",
    future: "b6000000-0000-4000-8000-000000000042"
  },
  booking: "b6000000-0000-4000-8000-000000000051"
};

const specs = {
  telemetryStaleMinutes: 15,
  temperatureWarningC: 75,
  humidityMinPercent: 20,
  humidityMaxPercent: 80,
  utilizationWarningPercent: 90
};

try {
  await prisma.campus.upsert({
    where: { code: "B6-E2E-CAMPUS" },
    update: {},
    create: { id: ids.campus, code: "B6-E2E-CAMPUS", name: "Batch 6 E2E Campus" }
  });
  await prisma.building.upsert({
    where: { code: "B6-E2E-BUILDING" },
    update: {},
    create: { id: ids.building, campusId: ids.campus, code: "B6-E2E-BUILDING", name: "Batch 6 E2E Building" }
  });

  for (const [id, code, name] of [
    [ids.assignedLab, "B6-E2E-LAB-A", "Phòng giám sát A"],
    [ids.foreignLab, "B6-E2E-LAB-B", "Phòng giám sát B"]
  ]) {
    await prisma.laboratory.upsert({
      where: { code },
      update: { name, isActive: true },
      create: { id, buildingId: ids.building, code, name, isActive: true }
    });
  }

  for (const [id, laboratoryId] of [
    [ids.policyAssigned, ids.assignedLab],
    [ids.policyForeign, ids.foreignLab]
  ]) {
    await prisma.labPolicy.upsert({
      where: { laboratoryId },
      update: {
        minBookingMinutes: 15,
        maxBookingMinutes: 480,
        maxAdvanceBookingDays: 3650,
        allowWeekend: true,
        workDayStartHour: 0,
        workDayEndHour: 23
      },
      create: {
        id,
        laboratoryId,
        minBookingMinutes: 15,
        maxBookingMinutes: 480,
        maxAdvanceBookingDays: 3650,
        allowWeekend: true,
        workDayStartHour: 0,
        workDayEndHour: 23
      }
    });
  }

  for (const [id, email, fullName, role] of [
    [ids.admin, "b6.admin@lab.test", "Batch 6 Admin", "ADMIN"],
    [ids.staff, "b6.staff@lab.test", "Batch 6 Staff", "LAB_STAFF"],
    [ids.foreignStaff, "b6.foreign.staff@lab.test", "Batch 6 Foreign Staff", "LAB_STAFF"],
    [ids.student, "b6.student@lab.test", "Batch 6 Student", "STUDENT"]
  ]) {
    await prisma.user.upsert({
      where: { email },
      update: { fullName, role, passwordHash, isActive: true },
      create: { id, email, fullName, role, passwordHash, isActive: true }
    });
  }

  for (const [userId, laboratoryId] of [
    [ids.staff, ids.assignedLab],
    [ids.foreignStaff, ids.foreignLab]
  ]) {
    await prisma.userLabAssignment.upsert({
      where: { userId_laboratoryId: { userId, laboratoryId } },
      update: {},
      create: { userId, laboratoryId }
    });
  }

  const resourceRows = [
    [ids.resources.healthy, ids.assignedLab, "B6-E2E-HEALTHY", "Máy đo môi trường A", "EQUIPMENT"],
    [ids.resources.warning, ids.assignedLab, "B6-E2E-WARNING", "Máy chủ nhiệt độ cao", "MACHINE"],
    [ids.resources.stale, ids.assignedLab, "B6-E2E-STALE", "Thiết bị dữ liệu cũ", "EQUIPMENT"],
    [ids.resources.offline, ids.assignedLab, "B6-E2E-OFFLINE", "Thiết bị đang ngoại tuyến", "EQUIPMENT"],
    [ids.resources.noData, ids.assignedLab, "B6-E2E-NODATA", "Thiết bị chưa có telemetry", "EQUIPMENT"],
    [ids.resources.foreign, ids.foreignLab, "B6-E2E-FOREIGN", "Thiết bị phòng B", "EQUIPMENT"]
  ];
  for (const [id, laboratoryId, code, name, category] of resourceRows) {
    await prisma.resource.upsert({
      where: { code },
      update: {
        laboratoryId, name, category, subtype: "OTHER", location: laboratoryId === ids.assignedLab ? "A-601" : "B-601",
        operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable", specs
      },
      create: {
        id, laboratoryId, code, name, category, subtype: "OTHER", location: laboratoryId === ids.assignedLab ? "A-601" : "B-601",
        operationalStatus: "AVAILABLE", status: "available", bookingState: "bookable", specs
      }
    });
  }

  await prisma.telemetrySample.deleteMany({ where: { resourceId: { in: Object.values(ids.resources) } } });
  await prisma.telemetrySample.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        resourceId: ids.resources.healthy,
        temperatureC: 29,
        humidityPercent: 52,
        cpuPercent: 30,
        online: true,
        source: "b6-e2e-agent",
        sampledAt: now
      },
      {
        id: crypto.randomUUID(),
        resourceId: ids.resources.warning,
        temperatureC: 81,
        humidityPercent: 54,
        cpuPercent: 45,
        online: true,
        source: "b6-e2e-agent",
        verifiedSignals: [{ code: "thermal", severity: "warning", message: "Verified sensor threshold", verified: true, provenance: "b6-e2e-sensor" }],
        sampledAt: now
      },
      {
        id: crypto.randomUUID(),
        resourceId: ids.resources.stale,
        temperatureC: 31,
        humidityPercent: 48,
        online: true,
        source: "b6-e2e-agent",
        sampledAt: new Date(now.getTime() - 30 * 60_000)
      },
      {
        id: crypto.randomUUID(),
        resourceId: ids.resources.offline,
        temperatureC: 28,
        humidityPercent: 50,
        online: false,
        source: "b6-e2e-agent",
        sampledAt: now
      },
      {
        id: crypto.randomUUID(),
        resourceId: ids.resources.foreign,
        temperatureC: 27,
        humidityPercent: 49,
        online: true,
        source: "b6-e2e-agent",
        sampledAt: now
      }
    ]
  });

  await prisma.incident.deleteMany({ where: { id: { in: Object.values(ids.incidents) } } });
  await prisma.incident.createMany({
    data: [
      {
        id: ids.incidents.assigned,
        resourceId: ids.resources.warning,
        reportedById: ids.student,
        severity: "high",
        status: "reported",
        category: "hardware",
        title: "Batch 6 quạt làm mát bất thường",
        description: "Ghi nhận tiếng ồn và rung bất thường tại cụm làm mát.",
        detectedAt: now
      },
      {
        id: ids.incidents.foreign,
        resourceId: ids.resources.foreign,
        reportedById: ids.student,
        severity: "medium",
        status: "reported",
        category: "network",
        title: "Batch 6 sự cố phòng B",
        description: "Sự cố chỉ thuộc phạm vi phòng B.",
        detectedAt: now
      }
    ]
  });

  await prisma.notification.deleteMany({ where: { id: { in: Object.values(ids.notifications) } } });
  await prisma.notification.createMany({
    data: [
      {
        id: ids.notifications.visible,
        userId: ids.student,
        type: "BOOKING_UPCOMING",
        title: "Batch 6 lịch sắp bắt đầu",
        message: "Thông báo E2E đã đến hạn và phải hiển thị cho đúng người dùng.",
        severity: "info",
        channel: "in_app",
        scheduledAt: new Date(now.getTime() - 60_000),
        sentAt: now,
        dedupeKey: "b6:e2e:visible"
      },
      {
        id: ids.notifications.future,
        userId: ids.student,
        type: "RETURN_REMINDER",
        title: "Batch 6 nhắc trả trong tương lai",
        message: "Thông báo này chưa đến hạn và không được hiển thị.",
        severity: "warning",
        channel: "in_app",
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60_000),
        sentAt: null,
        dedupeKey: "b6:e2e:future"
      }
    ]
  });

  const startAt = new Date(now.getTime() + 2 * 24 * 60 * 60_000);
  const endAt = new Date(startAt.getTime() + 90 * 60_000);
  await prisma.booking.deleteMany({ where: { id: ids.booking } });
  await prisma.booking.create({
    data: {
      id: ids.booking,
      resourceId: ids.resources.healthy,
      requestedById: ids.student,
      title: "Batch 6 dashboard booking",
      purpose: "Dashboard E2E",
      startAt,
      endAt,
      status: "CONFIRMED"
    }
  });

  console.log(\`Seeded Batch 6 E2E fixtures in \${database}\`);
} finally {
  await prisma.$disconnect();
}
