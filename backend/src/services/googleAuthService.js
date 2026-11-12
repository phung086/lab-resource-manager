import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { CUSTOMER, isCanonicalRole } from '../constants/roles.js';
import { signUserToken } from './authTokens.js';
import { enqueueRegistrationEmail } from './emailAutomationService.js';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from './systemAuditService.js';

const client = new OAuth2Client({ transporterOptions: { timeout:10000, retry:false } });
const failure = (code, status = 401) => new HttpError(status, code, undefined, code);
export const googleAuthConfigured = () => /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(config.googleClientId);

export function validateGoogleClaims(claims, nonce, now = Date.now()) {
  if (!claims || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 ||
      claims.email_verified !== true || typeof claims.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) ||
      typeof nonce !== 'string' || nonce.length < 32 || claims.nonce !== nonce ||
      !Number.isFinite(claims.exp) || claims.exp * 1000 <= now ||
      !Number.isFinite(claims.iat) || claims.iat * 1000 > now + 60000) throw failure('GOOGLE_INVALID_CREDENTIAL');
  const email = claims.email.trim().toLowerCase();
  return { subject:claims.sub, email, fullName:typeof claims.name === 'string' ? claims.name.trim().slice(0, 120) : '',
    authoritative:email.endsWith('@gmail.com') || (typeof claims.hd === 'string' && Boolean(claims.hd)) };
}

export async function verifyGoogleCredential(credential, nonce, verifier = client) {
  try {
    const ticket = await verifier.verifyIdToken({ idToken:credential, audience:config.googleClientId, maxExpiry:3600 });
    return validateGoogleClaims(ticket.getPayload(), nonce);
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw failure(cause?.code || cause?.response ? 'GOOGLE_UNAVAILABLE' : 'GOOGLE_INVALID_CREDENTIAL', cause?.code || cause?.response ? 503 : 401);
  }
}

function assertActive(user) {
  if (!user.isActive || user.deletedAt) throw failure('ACCOUNT_INACTIVE');
  if (!isCanonicalRole(user.role)) throw failure('FORBIDDEN', 403);
}

// Verification stays outside the DB transaction. Identity linking and session issuance are atomic.
export function createGoogleAuthService({ db = prisma, verify = verifyGoogleCredential, issueToken = signUserToken,
  welcome = enqueueRegistrationEmail, audit = recordSystemAuditEvent } = {}) {
  return async ({ credential, nonce, password }, locale = 'vi') => {
    const identity = await verify(credential, nonce);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await db.$transaction(async tx => {
          let user = await tx.user.findUnique({ where:{ googleSubject:identity.subject } });
          if (!user) user = await tx.user.findUnique({ where:{ email:identity.email } });
          if (user) {
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR NO KEY UPDATE`;
            user = await tx.user.findUnique({ where:{ id:user.id } });
            if (!user) throw failure('AUTH_INVALID');
            assertActive(user);
            if (user.email !== identity.email) throw failure('GOOGLE_EMAIL_CHANGED', 409);
            if (user.googleSubject && user.googleSubject !== identity.subject) throw failure('GOOGLE_IDENTITY_CONFLICT', 409);
            if (!user.googleSubject) {
              if (!password) throw failure('GOOGLE_LINK_REQUIRED', 409);
              if (user.passwordResetRequired || user.passwordLoginEnabled === false || !(await bcrypt.compare(password, user.passwordHash)))
                throw failure('AUTH_INVALID_CREDENTIALS');
              user = await tx.user.update({ where:{ id:user.id }, data:{ googleSubject:identity.subject, authVersion:{ increment:1 } } });
              await audit(tx, { actor:user, action:AUDIT_ACTIONS.ACCOUNT_CREDENTIAL_CHANGED, targetType:AUDIT_TARGET_TYPES.USER,
                targetId:user.id, reason:'Linked verified Google identity with existing password', metadata:{ provider:'google' } });
            }
          } else {
            // Third-party email verification by Google can be stale; require Gmail/Workspace authority for auto-registration.
            if (!identity.authoritative) throw failure('GOOGLE_EMAIL_UNVERIFIED', 403);
            user = await tx.user.create({ data:{ id:randomUUID(), email:identity.email, fullName:identity.fullName,
              googleSubject:identity.subject, role:CUSTOMER, isActive:true,
              passwordHash:await bcrypt.hash(randomBytes(48).toString('base64url'), 12), passwordLoginEnabled:false, passwordResetRequired:false } });
            await welcome(tx, user, locale);
          }
          return { user, accessToken:await issueToken(user, { transaction:tx }), tokenType:'Bearer' };
        });
      } catch (cause) {
        if (cause?.code === 'P2002' && attempt === 0) continue;
        throw cause;
      }
    }
    throw failure('GOOGLE_IDENTITY_CONFLICT', 409);
  };
}
