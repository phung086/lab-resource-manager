import jwt from "jsonwebtoken";

import { config } from "../config.js";
import { prisma } from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ code: "AUTH_MISSING_TOKEN", message: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ code: "AUTH_INACTIVE_OR_MISSING", message: "User is inactive or missing" });
    }
    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ code: "AUTH_INVALID_OR_EXPIRED", message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: "AUTH_FORBIDDEN", message: "Insufficient permission" });
    }
    next();
  };
}
