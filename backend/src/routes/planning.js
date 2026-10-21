import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { prisma } from '../db.js';
import { reviewPlan, createBundle, suggestPlan, suggestAlternatives } from '../services/planning/bundleService.js';
import { changePolicy, policyHistory } from '../services/planning/policyService.js';
import { joinWaitlist, cancelWaitlist, listWaitlist } from '../services/planning/waitlistService.js';
import { getDossier, recordChecklist } from '../services/planning/dossierService.js';
import { planningReport } from '../services/planning/reportService.js';

const router = express.Router();
router.use(requireAuth);
const handle = fn => async (req, res, next) => { try { res.json(await fn(req)); } catch (error) { next(error); } };
const id = req => z.string().uuid().parse(req.params.id);
const searchLimit = rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (_req, res, next) => { res.set('Retry-After', '60'); next(new HttpError(429, 'Search limit reached', { retryAfterSeconds: 60 }, 'RATE_LIMITED')); } });
const searching = new Set();
const boundedSearch = fn => handle(async req => {
  if (searching.has(req.user.id) || searching.size >= 3) throw new HttpError(429, 'Search already running', { retryAfterSeconds: 5 }, 'RATE_LIMITED');
  searching.add(req.user.id);
  try { return await fn(req.user, req.body); } finally { searching.delete(req.user.id); }
});
router.post('/review', handle(req => reviewPlan(req.user, req.body)));
router.post('/bundles', handle(req => createBundle(req.user, req.body)));
router.post('/suggestions', searchLimit, boundedSearch(suggestPlan));
router.post('/alternatives', searchLimit, boundedSearch(suggestAlternatives));
router.post('/policies/:id/preview', handle(req => changePolicy(req.user, id(req), req.body, true)));
router.put('/policies/:id', handle(req => changePolicy(req.user, id(req), req.body)));
router.get('/policies/:id/history', handle(req => policyHistory(req.user, id(req))));
router.get('/waitlist', handle(req => listWaitlist(req.user)));
router.post('/waitlist', handle(req => joinWaitlist(req.user, req.body)));
router.delete('/waitlist/:id', handle(req => cancelWaitlist(req.user, id(req))));
router.get('/dossiers/:id', handle(req => getDossier(req.user, id(req))));
router.post('/dossiers/:id/checklist', handle(req => recordChecklist(req.user, id(req), req.body)));
router.get('/report', handle(req => planningReport(req.user, z.coerce.number().int().min(1).max(90).default(30).parse(req.query.days))));
router.get('/bundles', handle(req => prisma.bookingBundle.findMany({ where: { ownerId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50,
  select: { id: true, title: true, createdAt: true, bookings: { select: { id: true, status: true, startAt: true, endAt: true, feeAmountVnd: true, resource: { select: { name: true, code: true } } } } } })));
export default router;
