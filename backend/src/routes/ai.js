import express from "express";
import { z } from "zod";

import { getSmartRecommendations, handleCopilotChat } from "../services/advisoryService.js";
import { getDensityHeatmap, getKpiSummary } from "../services/efficiencyService.js";

const router = express.Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000)
});

// GET /efficiency-kpi - 4 Hero KPIs & Before/After comparison
router.get("/efficiency-kpi", async (_req, res, next) => {
  try {
    const summary = await getKpiSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /density-heatmap - 7x12 heatmap density matrix
router.get("/density-heatmap", async (req, res, next) => {
  try {
    const { resource_id } = req.query;
    const heatmap = await getDensityHeatmap(resource_id);
    res.json({
      title: "BIỂU ĐỒ NHIỆT MẬT ĐỘ ĐẶT LỊCH (HEATMAP MATRIX)",
      subtitle: "THỨ TRONG TUẦN × KHUNG GIỜ (08:00 - 20:00)",
      matrix: heatmap
    });
  } catch (error) {
    next(error);
  }
});

// GET /advisory-cards - Proactive AI Advisory cards
router.get("/advisory-cards", async (req, res, next) => {
  try {
    const cards = await getSmartRecommendations(req.user?.id || null);
    res.json(cards);
  } catch (error) {
    next(error);
  }
});

// POST /copilot-chat - AI Copilot interactive chat query
router.post("/copilot-chat", async (req, res, next) => {
  try {
    const { message } = chatSchema.parse(req.body);
    const answer = await handleCopilotChat(message, req.user?.id || null);
    res.json(answer);
  } catch (error) {
    next(error);
  }
});

export default router;
