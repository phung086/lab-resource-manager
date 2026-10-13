import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { bridgeRequests } from '../chatgptBridge/runtime.js';

const router = express.Router();
const limited = limit => rateLimit({ windowMs: 60000, limit, keyGenerator: req => req.user.id,
  standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, 'ASSISTANT_RATE_LIMITED', { retryAfterSeconds: 60 }, 'ASSISTANT_RATE_LIMITED')) });
router.use(requireAuth, requireRole('CUSTOMER'), limited(180));
const mutations = limited(6);
router.post('/requests', mutations, async (req, res, next) => {
  try { res.status(202).json(await bridgeRequests.create(req.user, req.body)); }
  catch (error) { next(error); }
});
router.get('/requests/:id', async (req, res, next) => {
  try { res.json(await bridgeRequests.read(req.user, req.params.id)); } catch (error) { next(error); }
});
router.delete('/requests/:id', mutations, async (req, res, next) => {
  try { await bridgeRequests.cancel(req.user, req.params.id); res.status(204).end(); } catch (error) { next(error); }
});
export default router;
