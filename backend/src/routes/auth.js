import bcrypt from "bcryptjs";
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { CUSTOMER, isCanonicalRole } from "../constants/roles.js";
import { publicCustomerUser } from "../services/guestBookingService.js";
import { forgetAssistantSession } from "../assistant/assistantService.js";
import { enqueueRegistrationEmail } from "../services/emailAutomationService.js";

const router = express.Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isProduction ? 10 : 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many authentication attempts" } }
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8)
}).strict();

const registerSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128)
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128)
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  message: "New password must be different from the current password",
  path: ["newPassword"]
});

/**
 * Returns a safe public representation of a user.
 * Role is returned in canonical uppercase. No nonexistent fields are fabricated.
 */
function publicUser(user) {
  return publicCustomerUser(user);
}

/**
 * POST /register — Create a new user account.
 * Database-backed only. No mockStore fallback.
 */
router.post("/register", authRateLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Pre-check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new HttpError(409, "Email already registered", { field: "email" }, "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: data.email,
          fullName: "",
          role: CUSTOMER, // Canonical uppercase
          passwordHash,
          customerType: "EXTERNAL",
          passwordResetRequired: false,
          isActive: true
        }
      });
      await enqueueRegistrationEmail(tx, created, req.locale);
      return created;
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
      algorithm: "HS256",
      expiresIn: config.tokenExpiresIn
    });

    res.status(201).json({ accessToken: token, tokenType: "Bearer", user: publicUser(user) });
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: { code: "DUPLICATE_EMAIL", message: "Email already registered", details: { field: "email" } } });
    }
    next(error);
  }
});

/**
 * POST /login — Authenticate with email and password.
 * Database-backed only. No mockStore fallback.
 * DB failure = explicit error, NOT a successful login.
 */
router.post("/login", authRateLimit, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: data.email } });
    } catch (dbErr) {
      // Database outage must fail explicitly, not authenticate anyone
      console.error("Login DB lookup failed:", dbErr.message);
      throw new HttpError(503, "Authentication service unavailable", undefined, "DATABASE_UNAVAILABLE");
    }

    if (!user) {
      throw new HttpError(401, "Email or password is incorrect", undefined, "AUTH_INVALID_CREDENTIALS");
    }

    // Real password verification — always required
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    // A guest's initial phone-based credential is usable only inside the
    // email-verified setup session, never as proof of identity at login.
    if (!isValid || (user.customerType === "EXTERNAL" && user.passwordResetRequired)) {
      throw new HttpError(401, "Email or password is incorrect", undefined, "AUTH_INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new HttpError(401, "User account is inactive", undefined, "ACCOUNT_INACTIVE");
    }

    // Validate canonical role
    if (!isCanonicalRole(user.role)) {
      console.error(`User ${user.id} has unsupported role: ${user.role}`);
      throw new HttpError(403, "User role is not recognized", undefined, "FORBIDDEN");
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
      algorithm: "HS256",
      expiresIn: config.tokenExpiresIn
    });

    res.json({ accessToken: token, tokenType: "Bearer", user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /me — Return the current authenticated user's profile.
 */
router.get("/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// Bearer tokens are stateless. Logout acknowledges a valid session; the client
// remains responsible for discarding its token.
router.post("/logout", requireAuth, (req, res) => {
  forgetAssistantSession({ actorId: req.user.id, authorization: req.headers.authorization });
  res.status(204).end();
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const currentMatches = await bcrypt.compare(data.currentPassword, req.user.passwordHash);
    if (!currentMatches) {
      throw new HttpError(400, "Current password is incorrect", { field: "currentPassword" }, "CURRENT_PASSWORD_INVALID");
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash, passwordResetRequired: false } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
