import crypto from "node:crypto";
import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { PURPOSE_CODES, quoteBooking } from "../services/bookingPricingService.js";

const router = express.Router();
router.use(requireAuth);
router.get("/:resourceId", async (req, res, next) => {
  try { res.json(await prisma.resourcePricingRule.findMany({ where: { resourceId: req.params.resourceId }, orderBy: { purposeCode: "asc" } })); }
  catch (error) { next(error); }
});
router.put("/:resourceId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = z.object({ purposeCode: z.enum(PURPOSE_CODES), label: z.string().trim().min(2).max(100), hourlyRateVnd: z.number().int().min(0).max(100000000) }).strict().parse(req.body);
    res.json(await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM resources WHERE id = ${req.params.resourceId} FOR UPDATE`;
      const rule = await tx.resourcePricingRule.upsert({
        where: { resourceId_purposeCode: { resourceId: req.params.resourceId, purposeCode: data.purposeCode } },
        create: { id: crypto.randomUUID(), resourceId: req.params.resourceId, ...data },
        update: { ...data, version: { increment: 1 } }
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
