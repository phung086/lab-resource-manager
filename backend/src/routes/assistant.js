import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  answerAssistantQuestion,
  getAssistantSuggestions,
  listAssistantTools,
} from "../assistant/assistantService.js";
import { config } from "../config.js";
const router = express.Router();
const timestamp = z.string().datetime({ offset: true });
const chat = z
  .object({
    message: z.string().trim().min(2).max(2000),
    resourceId: z.string().min(1).max(100).optional(),
    startAt: timestamp.optional(),
    endAt: timestamp.optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
  })
  .strict();
router.use(requireAuth);
router.get("/suggestions", (_req, res) =>
  res.json({
    suggestions: getAssistantSuggestions(),
    mode:
      config.openaiApiKey && config.openaiModel
        ? "OPENAI_WITH_LOCAL_FALLBACK"
        : "LOCAL_GROUNDED",
    persistence: "EPHEMERAL",
  }),
);
router.get("/tools", (_req, res) => res.json({ tools: listAssistantTools() }));
router.post("/chat", async (req, res, next) => {
  try {
    res.json(
      await answerAssistantQuestion(chat.parse(req.body), {
        authorization: req.headers.authorization,
      }),
    );
  } catch (error) {
    next(error);
  }
});
export default router;
