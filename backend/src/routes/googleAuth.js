import { randomBytes } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
import { createGoogleAuthService, googleAuthConfigured } from '../services/googleAuthService.js';
import { publicCustomerUser } from '../services/guestBookingService.js';

const COOKIE = 'lrm_google_challenge', AUDIENCE = 'lab-google-sign-in';
const cookieOptions = { httpOnly:true, secure:config.isProduction, sameSite:'strict', path:'/api/auth/google', maxAge:300000 };
const clearCookieOptions = { httpOnly:true, secure:config.isProduction, sameSite:'strict', path:'/api/auth/google' };
const input = z.object({ credential:z.string().min(20).max(8192), nonce:z.string().regex(/^[A-Za-z0-9_-]{32,128}$/), password:z.string().min(8).max(128).optional() }).strict();
const fail = (code, status = 401) => new HttpError(status, code, undefined, code);

function allowedOrigin(req) {
  let origin = req.get('Origin');
  if (!origin && req.get('Referer')) { try { origin = new URL(req.get('Referer')).origin; } catch { /* Invalid origin fails closed below. */ } }
  if (!origin || !config.corsOrigins.includes(origin)) throw fail('FORBIDDEN', 403);
}

export function createGoogleAuthRouter(authRateLimit, { authenticate = createGoogleAuthService() } = {}) {
  const router = express.Router();
  router.get('/config', (_req, res) => res.json({ enabled:googleAuthConfigured(), clientId:googleAuthConfigured() ? config.googleClientId : null }));
  router.get('/challenge', authRateLimit, (req, res, next) => {
    try {
      if (!googleAuthConfigured()) throw fail('GOOGLE_NOT_CONFIGURED', 503);
      allowedOrigin(req);
      const nonce = randomBytes(32).toString('base64url');
      const challenge = jwt.sign({ nonce }, config.jwtSecret, { algorithm:'HS256', issuer:config.jwtIssuer, audience:AUDIENCE, expiresIn:300 });
      res.cookie(COOKIE, challenge, cookieOptions).json({ nonce });
    } catch (cause) { next(cause); }
  });
  router.post('/', authRateLimit, async (req, res, next) => {
    try {
      if (!googleAuthConfigured()) throw fail('GOOGLE_NOT_CONFIGURED', 503);
      allowedOrigin(req);
      const data = input.parse(req.body);
      const cookies = (req.headers.cookie || '').split(';').map(value => value.trim()).filter(value => value.startsWith(COOKIE + '='));
      if (cookies.length !== 1) throw fail('GOOGLE_INVALID_CREDENTIAL');
      let challenge;
      try { challenge = jwt.verify(cookies[0].slice(COOKIE.length + 1), config.jwtSecret, { algorithms:['HS256'], issuer:config.jwtIssuer, audience:AUDIENCE, maxAge:300 }); }
      catch { throw fail('GOOGLE_INVALID_CREDENTIAL'); }
      if (challenge.nonce !== data.nonce) throw fail('GOOGLE_INVALID_CREDENTIAL');
      const result = await authenticate(data, req.locale);
      res.clearCookie(COOKIE, clearCookieOptions).json({ ...result, user:publicCustomerUser(result.user) });
    } catch (cause) {
      // Keep the short challenge only while asking for explicit legacy-account linking proof.
      if (cause?.code !== 'GOOGLE_LINK_REQUIRED') res.clearCookie(COOKIE, clearCookieOptions);
      next(cause);
    }
  });
  return router;
}
