import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { applyOperationalStatusChange } from "../src/services/resourceService.js";
import { recordSystemAuditEvent } from "../src/services/systemAuditService.js";
import { localDemoCatalog } from "./localDemoCatalog.mjs";

// Internal tariff chosen for this catalogue, not a market-price claim. Safe to repeat.
const settings = {
  "ROOM-01": [50000,480,300,100], "ROOM-02": [70000,480,300,100], "ROOM-03": [90000,480,300,100],
  "ROOM-04": [60000,480,300,100], "ROOM-05": [100000,480,300,100], "ROOM-06": [80000,480,300,100],
  "EQ-01": [30000,480,200,80], "EQ-02": [10000,720,300,150], "EQ-03": [25000,720,300,120],
  "EQ-04": [15000,720,250,100], "EQ-05": [20000,720,250,100], "EQ-06": [10000,720,300,150],
  "EQ-07": [20000,480,200,100], "EQ-08": [25000,480,200,80], "EQ-09": [10000,720,300,150],
  "EQ-10": [180000,120,120,50], "MC-01": [70000,240,150,50], "MC-02": [40000,120,150,50],
  "MC-03": [250000,120,100,40], "MC-04": [15000,480,200,100],
  "KIT-01": [5000,720,300,150], "KIT-02": [10000,720,250,120], "KIT-03": [25000,480,200,80],
  "MAT-01": [2000,720,null,null], "MAT-02": [5000,720,null,null]
};
const url = new URL(process.env.DATABASE_URL || "");
if (url.pathname !== "/lab_resources_local_demo" || !["postgres", "localhost", "127.0.0.1"].includes(url.hostname) || process.env.NODE_ENV === "production") throw new Error("Refuse every non-local catalogue database");
const client = new PrismaClient();
try {
  if ((await client.$queryRaw`SELECT current_database() AS name`)[0].name !== "lab_resources_local_demo") throw new Error("Database mismatch");
  const actor = await client.user.findFirst({ where: { email: "admin@lrm.local", role: "ADMIN", isActive: true } });
  if (!actor) throw new Error("Active local administrator required");
  const totals = { resources: 0, prices: 0, restoredInitialStates: 0 };
  await client.$transaction(async tx => {
    for (const item of localDemoCatalog) {
      const resource = await tx.resource.findUniqueOrThrow({ where: { code: item.code }, include: { laboratory: true, _count: { select: { bookings: true, incidents: true, maintenanceWindows: true, statusHistory: true } } } });
      if (resource.specs?.environment !== "LOCAL_DEMO") throw new Error(`Not a local resource: ${item.code}`);
      const [hourlyRateVnd,maxBookingMinutes,intervalHours,intervalUses] = settings[item.code.replace("LOCAL-", "")];
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resource.id} FOR UPDATE`;
      for (const purposeCode of ["STUDY", "TEACHING", "RESEARCH", "SERVICE"]) {
        const previous = await tx.resourcePricingRule.findUnique({ where: { resourceId_purposeCode: { resourceId: resource.id, purposeCode } } });
        if (previous?.hourlyRateVnd === hourlyRateVnd) continue;
        const next = await tx.resourcePricingRule.upsert({ where: { resourceId_purposeCode: { resourceId: resource.id, purposeCode } }, create: { id: randomUUID(), resourceId: resource.id, purposeCode, label: "Thuê theo giờ", hourlyRateVnd }, update: { hourlyRateVnd, label: "Thuê theo giờ", version: { increment: 1 } } });
        await recordSystemAuditEvent(tx, { actor, action: "RESOURCE_PRICING_CHANGED", targetType: "PRICING_RULE", targetId: next.id, resourceId: resource.id, labId: resource.laboratoryId, beforeState: previous, afterState: { hourlyRateVnd, purposeCode, version: next.version }, reason: "Áp dụng bảng giá thuê theo tài nguyên theo yêu cầu người dùng" });
        totals.prices++;
      }
      const description = item.description.replace(/ Dữ liệu mẫu LOCAL DEMO; không đại diện cho tài sản thật\./, "").replace(/; cấu hình hiện đang bảo trì và chưa sẵn sàng sử dụng\./, ".");
      const specs = { ...resource.specs, usageGuide: { beforeUse: ["Kiểm tra phụ kiện khi nhận."], steps: ["Sử dụng đúng mục đích; báo nhân viên khi có bất thường."], afterUse: ["Vệ sinh và hoàn trả đủ phụ kiện."], safetyNotes: "Dừng sử dụng khi có bất thường." } };
      await tx.resource.update({ where: { id: resource.id }, data: { requiresApproval: false, maxBookingMinutes, description, specs } });
      // Clear only untouched artificial starting states; never clear actual faults or service jobs.
      if (["LOCAL-EQ-02", "LOCAL-EQ-03", "LOCAL-MC-02"].includes(item.code) && ["OFFLINE", "CALIBRATION", "MAINTENANCE"].includes(resource.operationalStatus) && Object.values(resource._count).every(count => count === 0)) {
        await applyOperationalStatusChange(tx, { resourceId: resource.id, operationalStatus: "AVAILABLE", reason: "Bỏ trạng thái chặn khởi tạo; không có sự cố, lượt sử dụng hoặc phiếu bảo trì", actor, lockResource: false });
        await tx.resource.update({ where: { id: resource.id }, data: { careInspectionRequired: false } });
        totals.restoredInitialStates++;
      }
      if (resource.category !== "MATERIAL") {
        const previous = await tx.resourceCareProfile.findUnique({ where: { resourceId: resource.id } });
        const policy = { intervalHours, intervalUses, intervalDays: 90, warningPercent: 80 };
        await tx.resourceCareProfile.upsert({ where: { resourceId: resource.id }, create: { resourceId: resource.id, ...policy }, update: policy });
        await recordSystemAuditEvent(tx, { actor, action: "RESOURCE_CARE_CONFIGURE", targetType: "RESOURCE", targetId: resource.id, resourceId: resource.id, labId: resource.laboratoryId, beforeState: previous ? JSON.parse(JSON.stringify(previous)) : null, afterState: { ...policy, maxBookingMinutes }, reason: "Áp dụng chu kỳ bảo trì và thời lượng thuê theo danh mục" });
      }
      totals.resources++;
    }
    await tx.labPolicy.updateMany({ where: { laboratory: { code: { startsWith: "LOCAL-LAB-" } } }, data: { requiresApproval: false, maxBookingMinutes: 720 } });
  }, { timeout: 30000 });
  console.log(JSON.stringify(totals));
} finally { await client.$disconnect(); }
