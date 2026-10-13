import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listResourceCare, commandResourceCare } from "../services/resourceCareService.js";
import { monitoringOperatorBudget } from "../middleware/monitoringLimits.js";

const reason = z.string().trim().min(5).max(500);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONFIGURE"), intervalDays: z.number().int().min(1).max(3650).nullable(), intervalHours: z.number().min(1).max(100000).nullable(), intervalUses: z.number().int().min(1).max(100000).nullable().optional(), warningPercent: z.number().int().min(1).max(99).optional(), roomId: z.string().uuid().nullable(), reason }).strict(),
  ...["START", "LOAD"].map(action => z.object({ action: z.literal(action), loadPercent: z.number().min(0).max(100).optional(), occupants: z.number().int().min(1).optional(), reason }).strict()),
  ...["STOP", "FAULT"].map(action => z.object({ action: z.literal(action), reason }).strict()),
  z.object({ action: z.literal("PART"), name: z.string().trim().min(2).max(100), condition: z.enum(["OK", "WORN", "BROKEN"]), reason }).strict(),
  ...["INSPECT", "BEGIN_MAINTENANCE"].map(action => z.object({ action: z.literal(action), maintenanceId: z.string().uuid(), reason }).strict())
]).refine(data => data.action !== "CONFIGURE" || data.intervalDays != null || data.intervalHours != null || data.intervalUses != null, { message: "A maintenance interval is required" });
const router = express.Router();
router.use(requireAuth, requireRole("ADMIN", "LAB_STAFF"), monitoringOperatorBudget);
router.get("/", async (req, res, next) => { try { res.set("Cache-Control", "private, no-store").json(await listResourceCare(req.user)); } catch (e) { next(e); } });
router.post("/:id/commands", async (req, res, next) => { try { res.json(await commandResourceCare(req.user, z.string().uuid().parse(req.params.id), schema.parse(req.body))); } catch (e) { next(e); } });
export default router;
