import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
const route = operation => async (req, res, next) => { try { await operation(req, res); } catch (error) { next(error); } };
const oauthRoute = operation => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { await operation(req, res); }
  catch (error) {
    const standardFields = new Set(['client_uri', 'logo_uri', 'tos_uri', 'policy_uri', 'contacts', 'jwks_uri', 'jwks',
      'software_id', 'software_version', 'prompt', 'response_mode', 'audience', 'request', 'request_uri', 'nonce']);
    // Diagnostic categories only: never log the request URL, code, state, body,
    // tokens, credentials, field values or arbitrary user-provided field names.
    console.warn(JSON.stringify({ event: 'chatgpt_oauth_rejected', code: error.oauthError || error.code || 'invalid_request',
      issues: error instanceof z.ZodError ? error.issues.slice(0, 8).map(issue => ({ code: issue.code,
        field: String(issue.path[0] || 'metadata').slice(0, 40),
        extraStandardFields: (issue.keys || []).filter(key => standardFields.has(key)).slice(0, 8) })) : undefined }));
    res.status(error.status || (error instanceof z.ZodError ? 400 : 503)).json({ error: error.oauthError ||
      (error instanceof z.ZodError ? 'invalid_request' : error.status < 500 ? 'invalid_grant' : 'temporarily_unavailable') });
  }
};
export function createBridgeOAuthRouters({ oauth, requireAuth }) {
  const publicRouter = express.Router(), adminRouter = express.Router();
  const limit = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
  publicRouter.use('/oauth/chatgpt', limit, express.urlencoded({ extended: false, limit: '8kb', parameterLimit: 20 }));
  publicRouter.get('/.well-known/oauth-authorization-server', oauthRoute((_req, res) => res.json(oauth.metadata())));
  for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp/support-bridge'])
    publicRouter.get(path, oauthRoute((_req, res) => res.json(oauth.resourceMetadata())));
  publicRouter.post('/oauth/chatgpt/register', oauthRoute(async (req, res) => res.status(201).json(await oauth.register(req.body))));
  publicRouter.get('/oauth/chatgpt/authorize', oauthRoute(async (req, res) => res.redirect(302, await oauth.beginAuthorization(req.query))));
  publicRouter.post('/oauth/chatgpt/token', oauthRoute(async (req, res) => res.json(await oauth.exchange(req.body))));
  publicRouter.post('/oauth/chatgpt/revoke', oauthRoute(async (req, res) => { await oauth.revokeToken(req.body); res.sendStatus(200); }));
  adminRouter.use(requireAuth, requireRole('ADMIN'), (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  adminRouter.get('/connections', route(async (req, res) => res.json(await oauth.listConnections(req.user))));
  adminRouter.get('/authorization', route(async (req, res) => res.json(await oauth.inspectConsent(req.query.ticket, req.user))));
  adminRouter.post('/authorize', route(async (req, res) => {
    const data = z.object({ ticket: z.string().max(256), approved: z.boolean() }).strict().parse(req.body);
    res.json(await oauth.consent(data.ticket, req.user, data.approved));
  }));
  adminRouter.delete('/connections/:id', route(async (req, res) => { await oauth.revokeGrant(req.params.id, req.user); res.sendStatus(204); }));
  return { publicRouter, adminRouter };
}
