import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { getAssistantSupportTranscript } from '../assistant/assistantService.js';
import { supportService, SUPPORT_CATEGORIES, SUPPORT_STATUSES } from '../services/supportService.js';

const router = express.Router();
const uuid = z.string().uuid();
const requestSchema = z.object({ requestId: uuid, laboratoryId: uuid, category: z.enum(SUPPORT_CATEGORIES), message: z.string().trim().min(3).max(2000), conversationId: uuid.optional() }).strict();
const listSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(SUPPORT_STATUSES).optional(), laboratoryId: uuid.optional() }).strict();
const cursor = z.coerce.number().int().min(0).max(2147483647);
const route = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60_000, limit: 180, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, _res, next) => next(new HttpError(429, 'SUPPORT_RATE_LIMITED', undefined, 'SUPPORT_RATE_LIMITED')) }));
const writes = rateLimit({ windowMs: 60_000, limit: 60, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, _res, next) => next(new HttpError(429, 'SUPPORT_RATE_LIMITED', undefined, 'SUPPORT_RATE_LIMITED')) });
router.get('/metadata', route(async (req, res) => res.json(await supportService.metadata(req.user))));
router.get('/assistant-context/:id', route(async (req, res) => {
  const messages = getAssistantSupportTranscript(uuid.parse(req.params.id), { authorization: req.headers.authorization, actorId: req.user.id, actorRole: req.user.role });
  res.json({ message: messages.filter(row => row.kind === 'CUSTOMER').at(-1)?.body || '', messageCount: messages.length });
}));
router.get('/sessions', route(async (req, res) => res.json(await supportService.list(req.user, listSchema.parse(req.query)))));
router.post('/presence', writes, route(async (req, res) => {
  const data = z.object({ accepting: z.boolean().optional() }).strict().parse(req.body || {});
  res.json(await supportService.heartbeat(req.user, data.accepting));
}));
router.post('/sessions', writes, route(async (req, res) => {
  const data = requestSchema.parse(req.body);
  const transcript = () => data.conversationId ? getAssistantSupportTranscript(data.conversationId, { authorization: req.headers.authorization, actorId: req.user.id, actorRole: req.user.role }) : [];
  res.status(201).json(await supportService.request(req.user, data, transcript));
}));
router.get('/sessions/:id', route(async (req, res) => {
  const query = z.object({ after: cursor.default(0), before: cursor.optional() }).strict().parse(req.query);
  res.json(await supportService.detail(req.user, uuid.parse(req.params.id), query.after, query.before));
}));
router.post('/sessions/:id/messages', writes, route(async (req, res) => {
  const data = z.object({ messageId: uuid, body: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
  res.status(201).json(await supportService.send(req.user, uuid.parse(req.params.id), data));
}));
for (const action of ['finish', 'cancel', 'requeue']) router.post(`/sessions/:id/${action}`, writes, route(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3).max(500) }).strict().parse(req.body);
  res.json(await supportService.transition(req.user, uuid.parse(req.params.id), action, reason));
}));
export default router;
