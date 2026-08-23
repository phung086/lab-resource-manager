import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { answerAssistantQuestion, getAssistantSuggestions, listAssistantTools } from "../assistant/assistantService.js";

const router = express.Router();

const chatSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  locale: z.enum(["vi", "en"]).default("vi")
});

router.use(requireAuth);

router.get("/suggestions", (req, res) => {
  const locale = req.query.locale === "en" ? "en" : "vi";
  res.json({ suggestions: getAssistantSuggestions(locale) });
});

router.get("/tools", (_req, res) => {
  res.json({ tools: listAssistantTools() });
});

router.post("/chat", async (req, res, next) => {
  try {
    const data = chatSchema.parse(req.body);
    const response = await answerAssistantQuestion(data, { user: req.user });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
