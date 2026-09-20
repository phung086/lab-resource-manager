import jwt from "jsonwebtoken";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { isCanonicalRole, CANONICAL_ROLES } from "../constants/roles.js";

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
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
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
  try {
    user = await prisma.user.findUnique({ where: { id: payload.sub } });
  } catch (dbErr) {
    // Database failure must NOT fall back to mock/memory — explicit error
    console.error("Auth DB lookup failed:", dbErr.message);
    return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Authentication service unavailable" } });
  }

  if (!user) {
    return res.status(401).json({ error: { code: "AUTH_INVALID", message: "User not found" } });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: { code: "ACCOUNT_INACTIVE", message: "User account is inactive" } });
  }

  // Reject unsupported role values
  if (!isCanonicalRole(user.role)) {
    console.error(`User ${user.id} has unsupported role: ${user.role}. Expected one of: ${CANONICAL_ROLES.join(", ")}`);
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "User role is not recognized" } });
  }

  req.user = user;
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

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (payload?.sub) {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user && user.isActive && isCanonicalRole(user.role)) {
        req.user = user;
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
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

