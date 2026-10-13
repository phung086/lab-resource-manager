import crypto from "node:crypto";
import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { PURPOSE_CODES, quoteBooking } from "../services/bookingPricingService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "../services/systemAuditService.js";
import { HttpError } from "../middleware/errors.js";

const router = express.Router();
router.put("/:resourceId/tariff", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resourceId = z.string().uuid().parse(req.params.resourceId);
    const data = z.object({ hourlyRateVnd: z.number().int().min(0).max(100000000), maxBookingMinutes: z.number().int().min(15).max(525600) }).strict().parse(req.body);
    res.json(await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR UPDATE`;
      const resource = await tx.resource.findUnique({ where: { id: resourceId } });
      if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
      const before = await tx.resourcePricingRule.findMany({ where: { resourceId } });
      for (const purposeCode of PURPOSE_CODES) await tx.resourcePricingRule.upsert({ where: { resourceId_purposeCode: { resourceId, purposeCode } }, create: { id: crypto.randomUUID(), resourceId, purposeCode, label: "Thuê theo giờ", hourlyRateVnd: data.hourlyRateVnd }, update: { hourlyRateVnd: data.hourlyRateVnd, label: "Thuê theo giờ", version: { increment: 1 } } });
      await tx.resource.update({ where: { id: resourceId }, data: { maxBookingMinutes: data.maxBookingMinutes } });
      await recordSystemAuditEvent(tx, { actor: req.user, action: AUDIT_ACTIONS.RESOURCE_PRICING_CHANGED, targetType: "RESOURCE", targetId: resourceId, resourceId, labId: resource.laboratoryId, beforeState: { rates: before.map(row => ({ purposeCode: row.purposeCode, hourlyRateVnd: row.hourlyRateVnd, version: row.version })), maxBookingMinutes: resource.maxBookingMinutes }, afterState: data, reason: "Cập nhật giá thuê và giới hạn thời lượng" });
      return { ...data, resourceId };
    }));
  } catch (error) { next(error); }
});
router.get("/:resourceId", async (req, res, next) => {
  try { res.json(await prisma.resourcePricingRule.findMany({ where: { resourceId: req.params.resourceId }, orderBy: { purposeCode: "asc" } })); }
  catch (error) { next(error); }
});
router.put("/:resourceId", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = z.object({ purposeCode: z.enum(PURPOSE_CODES), label: z.string().trim().min(2).max(100), hourlyRateVnd: z.number().int().min(0).max(100000000) }).strict().parse(req.body);
    res.json(await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${req.params.resourceId} FOR UPDATE`;
      const existing = await tx.resourcePricingRule.findUnique({
        where: { resourceId_purposeCode: { resourceId: req.params.resourceId, purposeCode: data.purposeCode } }
      });
      const rule = await tx.resourcePricingRule.upsert({
        where: { resourceId_purposeCode: { resourceId: req.params.resourceId, purposeCode: data.purposeCode } },
        create: { id: crypto.randomUUID(), resourceId: req.params.resourceId, ...data },
        update: { ...data, version: { increment: 1 } }
      });
      await recordSystemAuditEvent(tx, {
        actor: req.user,
        action: AUDIT_ACTIONS.RESOURCE_PRICING_CHANGED,
        targetType: AUDIT_TARGET_TYPES.PRICING_RULE,
        targetId: rule.id,
        resourceId: req.params.resourceId,
        beforeState: existing ? { hourlyRateVnd: existing.hourlyRateVnd, version: existing.version, label: existing.label } : null,
        afterState: { hourlyRateVnd: rule.hourlyRateVnd, version: rule.version, purposeCode: rule.purposeCode, label: rule.label },
        metadata: { source: "admin_pricing_management" }
      });
      await tx.usageLog.create({ data: { id: crypto.randomUUID(), resourceId: req.params.resourceId, userId: req.user.id, action: "STATUS_CHANGE", message: "Cập nhật bảng giá sử dụng tài nguyên", metadata: { pricingRuleId: rule.id, purposeCode: rule.purposeCode, hourlyRateVnd: rule.hourlyRateVnd, version: rule.version } } });
      return rule;
    }));
  } catch (error) { next(error); }
});
router.post("/quote", async (req, res, next) => {
  try {
    const data = z.object({ resourceId: z.string().min(1), purposeCode: z.enum(PURPOSE_CODES).optional(), startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }) }).strict().parse(req.body);
    res.json(await quoteBooking(prisma, data));
  } catch (error) { next(error); }
});
export default router;
