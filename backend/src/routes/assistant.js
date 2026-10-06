import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { answerAssistantQuestion, getAssistantSuggestions, listAssistantTools, suggestionKeys, removeAssistantConversation, assistantConversationLimits } from '../assistant/assistantService.js';
import { config } from '../config.js';
const router = express.Router(), timestamp = z.string().datetime({ offset: true });
const chat = z.object({ message: z.string().trim().min(2).max(2000), locale: z.enum(['vi', 'en']).optional(), conversationId: z.string().uuid().optional(), workspace: z.string().max(50).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/).optional(), resourceId: z.string().min(1).max(100).optional(), startAt: timestamp.optional(), endAt: timestamp.optional(), durationMinutes: z.number().int().min(15).max(480).optional() }).strict().refine(data => Boolean(data.startAt) === Boolean(data.endAt) && (!data.startAt || Date.parse(data.startAt) < Date.parse(data.endAt)), { path: ['endAt'], message: 'INVALID_BOOKING_TIME' });
router.use(requireAuth);
const limiter = rateLimit({ windowMs: 60000, limit: config.assistantRateLimit, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false, handler: (req, _res, next) => next(new HttpError(429, 'ASSISTANT_RATE_LIMITED', { retryAfterSeconds: Math.max(1, Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + 60000) - Date.now()) / 1000)) }, 'ASSISTANT_RATE_LIMITED')) });
router.get('/suggestions', (req, res) => res.json({ suggestionKeys, suggestions: getAssistantSuggestions(req.locale), locale: req.locale, mode: config.openaiApiKey && config.openaiModel ? 'OPENAI_WITH_LOCAL_FALLBACK' : 'LOCAL_GROUNDED', persistence: 'EPHEMERAL', conversation: { enabled: true, modelRoutingEnabled: config.assistantConversationEnabled, maxTurns: assistantConversationLimits.maxTurns, idleMinutes: assistantConversationLimits.ttlMs / 60000 }, configuration: { hasApiKey: Boolean(config.openaiApiKey), hasModel: Boolean(config.openaiModel), status: !config.openaiApiKey ? 'MISSING_KEY' : !config.openaiModel ? 'MISSING_MODEL' : 'CONFIGURED_UNVERIFIED' } }));
router.get('/tools', (_req, res) => res.json({ tools: listAssistantTools() }));
router.delete('/conversations/:id', limiter, (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    removeAssistantConversation(id, { authorization: req.headers.authorization, actorId: req.user.id, actorRole: req.user.role });
    res.status(204).end();
  } catch (error) { next(error); }
});
router.post('/chat', limiter, async (req, res, next) => {
  const controller = new globalThis.AbortController();
  const cancel = () => { if (!res.writableEnded) controller.abort(new HttpError(499, 'ASSISTANT_CANCELLED', undefined, 'ASSISTANT_CANCELLED')); };
  res.on('close', cancel); req.on('aborted', cancel);
  try {
    const data = chat.parse(req.body);
    const response = await answerAssistantQuestion({ ...data, locale: data.locale || req.locale }, { authorization: req.headers.authorization, actorId: req.user.id, actorRole: req.user.role, signal: controller.signal });
    if (!res.destroyed && !res.writableEnded) res.json(response);
  } catch (error) { if (!res.destroyed && !res.writableEnded) next(error); }
  finally { res.off('close', cancel); req.off('aborted', cancel); }
});
export default router;
