import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { validateLocalDemoEnvironment } from "./localDemoGuard.mjs";

const database = validateLocalDemoEnvironment(process.env);
const prisma = new PrismaClient();

function commonsFile(fileName, width = 1200) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;
}

function commonsSource(fileName) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
}

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
    const illustrativeMedia = [
      ["LOCAL-ROOM-01", "IMAGE", "Phòng thực hành điện tử minh họa", "Không gian phòng lab điện tử với bàn thao tác và thiết bị đo.", "Electronics_Lab_in_realraum.jpg", "Stefan2904 / Wikimedia Commons", "CC BY-SA 4.0", 0],
      ["LOCAL-ROOM-02", "IMAGE", "Không gian chế tạo minh họa", "Phòng workshop giáo dục có máy in 3D và bàn thực hành.", "3D_printer_in_a_school_workshop.jpg", "Bex Walton / Wikimedia Commons", "CC BY-SA 4.0", 0],
      ["LOCAL-EQ-01", "IMAGE", "Máy hiện sóng số minh họa", "Màn hình máy hiện sóng số đang đo tín hiệu điện.", "Digital_oscilloscope_in_use.jpg", "Radarvector / Wikimedia Commons", "CC BY-SA 4.0", 0],
      ["LOCAL-EQ-02", "IMAGE", "Đồng hồ vạn năng minh họa", "Đồng hồ vạn năng số dùng trong thực hành đo điện.", "Digital_Multimeter_Aka.jpg", "Aka / Wikimedia Commons", "CC BY-SA 2.5", 0],
      ["LOCAL-EQ-03", "IMAGE", "Camera quan sát minh họa", "Camera giám sát dùng để minh họa thiết bị quan sát trong phòng lab.", "Security_camera_(1).jpg", "Wikimedia Commons", "Public domain", 0],
      ["LOCAL-MC-01", "IMAGE", "Máy in 3D minh họa", "Máy in 3D FDM đang in một mẫu vật.", "3D_Printing_an_Object_using_FDM_Printer.jpg", "ZMorph3D / Wikimedia Commons", "CC BY-SA 4.0", 0],
      ["LOCAL-MC-02", "IMAGE", "Máy khoan bàn minh họa", "Máy khoan bàn trong khu gia công, dùng làm hình minh họa.", "Harpers_Ferry_gun_smith_shop_-_drill_press_-_01.jpg", "Fæ / Wikimedia Commons", "CC BY 4.0", 0],
      ["LOCAL-KIT-01", "IMAGE", "Bộ Arduino thí nghiệm minh họa", "Bộ linh kiện Arduino dùng cho thực hành mạch điện.", "ARDX_-_Arduino_Experimentation_Kit_(Inside_the_box).jpg", "Arduino Experimentation Kit / Wikimedia Commons", "CC BY-SA 2.0", 0],
      ["LOCAL-KIT-01", "VIDEO", "Video thí nghiệm mạch timer minh họa", "Video ngắn minh họa mạch timer dùng tụ điện.", "Experiment_with_Timer.webm", "Kofani1997 / Wikimedia Commons", "CC0 1.0", 1],
      ["LOCAL-KIT-02", "IMAGE", "Bộ dây jumper minh họa", "Các dây jumper nhiều màu dùng cho thí nghiệm cảm biến và breadboard.", "A_few_Jumper_Wires.jpg", "Windell Oskay / Wikimedia Commons", "CC BY 2.0", 0],
      ["LOCAL-MAT-01", "IMAGE", "Dây nối mạch minh họa", "Dây jumper nhiều màu dùng trong thí nghiệm điện tử.", "A_few_Jumper_Wires.jpg", "Windell Oskay / Wikimedia Commons", "CC BY 2.0", 0],
    ];
    for (const [code, kind, title, altText, fileName, credit, license, sortOrder] of illustrativeMedia) {
      const resource = await tx.resource.findUnique({ where: { code }, select: { id: true } });
      if (!resource) continue;
      const sourceUrl = commonsSource(fileName);
      const existing = await tx.resourceMedia.findFirst({ where: { resourceId: resource.id, sourceUrl, title } });
      if (!existing) {
        await tx.resourceMedia.create({ data: {
          id: randomUUID(),
          resourceId: resource.id,
          kind,
          url: commonsFile(fileName, kind === "VIDEO" ? 1280 : 1400),
          title,
          altText,
          sourceUrl,
          credit,
          license,
          sortOrder
        } });
      }
    }
    const paymentDemoRoom = await tx.resource.findUniqueOrThrow({ where: { code: "LOCAL-ROOM-01" }, select: { id: true } });
    const existingPricing = await tx.resourcePricingRule.count({ where: { resourceId: paymentDemoRoom.id } });
    if (existingPricing === 0) {
      await tx.resourcePricingRule.create({ data: {
        id: randomUUID(), resourceId: paymentDemoRoom.id, purposeCode: "STUDY",
        label: "Học tập / thực hành (giá local demo)", hourlyRateVnd: 50000,
      } });
    }
  }, { timeout: 30000 });
  console.log(`Local demo ready: ${database}; 4 accounts, 2 labs, 11 resources. LOCAL-ROOM-01 gets a 50,000 VND/hour STUDY demo price only when it has no pricing rules. Illustrative media is inserted idempotently from credited external sources. Existing rows preserved. No bookings, payments, incidents, telemetry or audit events are seeded.`);
} finally {
  await prisma.$disconnect();
}
