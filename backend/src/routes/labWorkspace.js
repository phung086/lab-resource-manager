import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import * as workspace from "../services/labWorkspaceService.js";

const router = express.Router();
router.use(requireAuth);
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const id = z.string().uuid();
const text = (min, max) => z.string().trim().min(min).max(max);
const stock = z.object({ id, resourceId: id, unit: text(1, 30), kind: z.enum(["RECEIPT", "ISSUE", "ADJUSTMENT"]), quantity: z.number().int().min(-1000000).max(1000000), reason: text(5, 500), reference: text(2, 120), maintenanceId: id.optional() }).strict().refine(d => d.quantity !== 0 && (d.kind === "ADJUSTMENT" || d.quantity > 0), { message: "Receipt and issue quantities must be positive; adjustments cannot be zero." });
router.get("/stock", route(async (req, res) => res.json(await workspace.listStock(req.user))));
router.get("/stock/:resourceId", route(async (req, res) => res.json(await workspace.stockHistory(req.user, id.parse(req.params.resourceId)))));
router.post("/stock", route(async (req, res) => res.status(201).json(await workspace.recordStock(req.user, stock.parse(req.body)))));
router.get("/groups", route(async (req, res) => res.json(await workspace.listTeachingGroups(req.user))));
router.get("/groups/:id", route(async (req, res) => res.json(await workspace.teachingGroupDetail(req.user, id.parse(req.params.id)))));
export default router;
