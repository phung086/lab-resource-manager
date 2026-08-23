import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { config } from "../config.js";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(255),
  studentId: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(20).optional()
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    studentId: user.studentId,
    department: user.department
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Pre-check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new HttpError(409, "Email already registered", { field: "email" }, "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: "student",
        passwordHash,
        studentId: data.studentId,
        department: data.department,
        phone: data.phone,
        isActive: true
      }
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
      expiresIn: config.tokenExpiresIn
    });

    res.status(201).json({ accessToken: token, tokenType: "Bearer", user: publicUser(user) });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ code: "DUPLICATE_EMAIL", message: "Email already registered", details: { field: "email" } });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) {
      throw new HttpError(401, "Email or password is incorrect", undefined, "AUTH_INVALID_CREDENTIALS");
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new HttpError(401, "Email or password is incorrect", undefined, "AUTH_INVALID_CREDENTIALS");
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
      expiresIn: config.tokenExpiresIn
    });

    res.json({ accessToken: token, tokenType: "Bearer", user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

export default router;
