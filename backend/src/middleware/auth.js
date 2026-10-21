import { verifyUserToken, validSession } from "../services/authTokens.js";
import { prisma } from "../db.js";
import { isCanonicalRole, CANONICAL_ROLES } from "../constants/roles.js";

const PASSWORD_RESET_ALLOWLIST = new Set([
  "GET /api/auth/me",
  "GET /api/users/me",
  "POST /api/auth/change-password",
  "POST /api/auth/password-otp/request",
  "POST /api/auth/logout",
  "GET /api/auth/session", "POST /api/auth/activity", "POST /api/auth/logout-all"
]);

function passwordResetRouteKey(req) {
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  return `${String(req.method || "GET").toUpperCase()} ${path}`;
}

/**
 * Requires a valid, database-backed authenticated user.
 *
 * - No mockStore fallback: DB failure → explicit 503.
 * - Inactive users are rejected.
 * - Unsupported role values are rejected.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  const token = match?.[1] || "";

  if (!token) {
    return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Missing bearer token" } });
  }

  let payload;
  try {
    payload = verifyUserToken(token);
  } catch (error) {
    const expired = error?.name === "TokenExpiredError";
    return res.status(401).json({
      error: {
        code: expired ? "AUTH_EXPIRED" : "AUTH_INVALID",
        message: expired ? "Authentication token has expired" : "Invalid authentication token"
      }
    });
  }

  if (!payload || !payload.sub) {
    return res.status(401).json({ error: { code: "AUTH_INVALID", message: "Invalid token payload" } });
  }

  let user;
  let session;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.sub } });
    session = await prisma.authSession.findUnique({ where: { id: payload.sid } });
  } catch (dbErr) {
    // Database failure must NOT fall back to mock/memory — explicit error
    console.error("Auth DB lookup failed", { code: dbErr?.code || "UNKNOWN" });
    return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Authentication service unavailable" } });
  }

  if (!user) {
    return res.status(401).json({ error: { code: "AUTH_INVALID", message: "User not found" } });
  }

  if (!user.isActive || user.deletedAt) {
    return res.status(401).json({ error: { code: "ACCOUNT_INACTIVE", message: "User account is inactive" } });
  }

  if (!Number.isInteger(payload.authVersion ?? 0) || (payload.authVersion ?? 0) !== user.authVersion) {
    return res.status(401).json({ error: { code: "AUTH_INVALID", message: "Session is no longer valid" } });
  }

  if (!validSession(session, user)) {
    return res.status(401).json({ error: { code: "AUTH_EXPIRED", message: "Session expired or revoked" } });
  }

  // Reject unsupported role values
  if (!isCanonicalRole(user.role)) {
    console.error(`User ${user.id} has unsupported role: ${user.role}. Expected one of: ${CANONICAL_ROLES.join(", ")}`);
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "User role is not recognized" } });
  }

  req.user = user;
  req.authSession = session;
  res.set("Cache-Control", "no-store");
  if (user.passwordResetRequired && !PASSWORD_RESET_ALLOWLIST.has(passwordResetRouteKey(req))) {
    return res.status(403).json({
      error: {
        code: "PASSWORD_RESET_REQUIRED",
        message: "Set a new password before accessing this endpoint"
      }
    });
  }
  next();
}

/**
 * Optional authentication: populates req.user if a valid token is present,
 * but does not reject unauthenticated requests.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  const token = match?.[1] || "";

  if (!token) {
    req.user = null;
    return next();
  }

  let payload;
  try {
    payload = verifyUserToken(token);
  } catch {
    req.user = null;
    return next();
  }

  if (!payload?.sub) {
    req.user = null;
    return next();
  }

  let user;
  let session;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.sub } });
    session = await prisma.authSession.findUnique({ where: { id: payload.sid } });
  } catch (dbErr) {
    console.error("Optional auth DB lookup failed", { code: dbErr?.code || "UNKNOWN" });
    return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Authentication service unavailable" } });
  }

  req.user = user && validSession(session, user) && user.isActive && !user.deletedAt && isCanonicalRole(user.role) &&
    Number.isInteger(payload.authVersion ?? 0) && (payload.authVersion ?? 0) === user.authVersion ? user : null;
  if (req.user) { req.authSession = session; res.set("Cache-Control", "no-store"); }
  return next();
}

/**
 * Requires the authenticated user to have one of the specified canonical roles.
 * Role comparison uses exact canonical uppercase values only.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Authentication required" } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permission" } });
    }
    next();
  };
}
