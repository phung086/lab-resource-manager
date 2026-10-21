import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";

export async function signUserToken(user, { transaction = null } = {}) {
  const now = new Date(), expiresAt = new Date(now.getTime() + config.sessionAbsoluteMs);
  const persist = async tx => {
    // Serialize issuance against credential/activation changes; stale login results fail closed.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR NO KEY UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.isActive || current.deletedAt || current.authVersion !== user.authVersion || current.role !== user.role)
      throw new HttpError(401, "Session is no longer valid", undefined, "AUTH_INVALID");
    await tx.authSession.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } });
    return tx.authSession.create({ data: { id: randomUUID(), userId: user.id, authVersion: current.authVersion,
      createdAt: now, lastActiveAt: now, expiresAt,
      idleExpiresAt: new Date(Math.min(expiresAt.getTime(), now.getTime() + config.sessionIdleMs)) } });
  };
  const session = transaction ? await persist(transaction) : await prisma.$transaction(persist);
  return jwt.sign({ sub: user.id, role: user.role, authVersion: user.authVersion, sid: session.id }, config.jwtSecret, {
    algorithm: "HS256", issuer: config.jwtIssuer, audience: config.jwtAudience,
    expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  });
}

export function verifyUserToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"], issuer: config.jwtIssuer, audience: config.jwtAudience,
    maxAge: Math.floor(config.sessionAbsoluteMs / 1000)
  });
  if (!payload || typeof payload !== "object" || typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.sid !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.sid) ||
      !Number.isInteger(payload.authVersion) || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
      payload.iat > Date.now() / 1000 + 5 || payload.exp <= payload.iat) throw new Error("Invalid token claims");
  return payload;
}

export function validSession(session, user, now = new Date()) {
  return Boolean(session && session.userId === user.id && session.authVersion === user.authVersion &&
    !session.revokedAt && session.expiresAt > now && session.idleExpiresAt > now);
}

export function sessionInfo(session) {
  return { createdAt: session.createdAt, lastActiveAt: session.lastActiveAt,
    idleExpiresAt: session.idleExpiresAt, expiresAt: session.expiresAt,
    idleTimeoutSeconds: config.sessionIdleMs / 1000 };
}

export async function extendSession(user, sessionId) {
  const now = new Date();
  const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
  if (!validSession(session, user, now)) throw new HttpError(401, "Session expired", undefined, "AUTH_EXPIRED");
  const idleExpiresAt = new Date(Math.min(session.expiresAt.getTime(), now.getTime() + config.sessionIdleMs));
  // Conditional write prevents a concurrent logout/timeout from resurrecting the session.
  const result = await prisma.authSession.updateMany({ where: { id: sessionId, userId: user.id,
    authVersion: user.authVersion, revokedAt: null, idleExpiresAt: { gt: now }, expiresAt: { gt: now } },
    data: { lastActiveAt: now, idleExpiresAt } });
  if (result.count !== 1) throw new HttpError(401, "Session expired", undefined, "AUTH_EXPIRED");
  return sessionInfo({ ...session, lastActiveAt: now, idleExpiresAt });
}
