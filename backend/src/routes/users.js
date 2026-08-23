import bcrypt from "bcryptjs";
import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { notify } from "../utils/notifications.js";

const router = express.Router();

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  role: z.enum(["admin", "lab_staff", "lecturer", "student"]),
  password: z.string().min(8),
  isActive: z.boolean().default(true)
});

const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({ password: z.string().min(8).optional() });

router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { bookings: true, notifications: true } }
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }]
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Pre-check email uniqueness (better UX than generic constraint error)
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new HttpError(409, "Email already registered", { field: "email" }, "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        passwordHash,
        isActive: data.isActive
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true }
    });
    await notify(user.id, "accountCreated", "accountCreated", "success");
    res.status(201).json(user);
  } catch (error) {
    // Handle race condition: another request created the same email between check and create
    if (error.code === 'P2002' && error.meta?.target?.includes?.('email')) {
      return res.status(409).json({ code: "DUPLICATE_EMAIL", message: "Email already registered", details: { field: "email" } });
    }
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);
    if (req.params.id === req.user.id && data.isActive === false) {
      throw new HttpError(409, "Cannot lock the currently signed-in account", undefined, "USER_SELF_LOCK_FORBIDDEN");
    }
    const { password, ...rest } = data;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
