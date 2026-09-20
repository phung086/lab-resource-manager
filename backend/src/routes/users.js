import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";

const router = express.Router();

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  department: true,
  studentId: true,
  phone: true
};

/**
 * GET /me — Current user profile.
 * Returns canonical fields only; no fabricated quota/reputation fields.
 * No mockStore fallback.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    }

    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role, // Canonical uppercase — no lowercasing
      isActive: user.isActive,
      department: user.department || null,
      studentId: user.studentId || null,
      phone: user.phone || null,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET / — Admin: List all users.
 * Requires ADMIN role. No mockStore fallback.
 */
router.get("/", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        ...safeUserSelect,
        _count: { select: { bookings: true } }
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }]
    });

    return res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get("/laboratories", requireAuth, requireRole(ADMIN), async (_req, res, next) => {
  try {
    const laboratories = await prisma.laboratory.findMany({
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    res.json(laboratories);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/lab-assignments", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { ...safeUserSelect, labAssignments: { include: { laboratory: true }, orderBy: { createdAt: "asc" } } }
    });
    if (!user) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    res.json(user.labAssignments.map((assignment) => ({
      userId: assignment.userId,
      laboratoryId: assignment.laboratoryId,
      createdAt: assignment.createdAt,
      laboratory: {
        id: assignment.laboratory.id,
        code: assignment.laboratory.code,
        name: assignment.laboratory.name,
        isActive: assignment.laboratory.isActive
      }
    })));
  } catch (error) {
    next(error);
  }
});

const assignmentSchema = z.object({ laboratoryId: z.string().min(1) }).strict();

router.post("/:id/lab-assignments", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const { laboratoryId } = assignmentSchema.parse(req.body);
    const [user, laboratory] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } }),
      prisma.laboratory.findUnique({ where: { id: laboratoryId }, select: { id: true, code: true, name: true, isActive: true } })
    ]);
    if (!user) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    if (!laboratory) throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
    if (user.role !== LAB_STAFF) {
      throw new HttpError(409, "Only LAB_STAFF users can receive laboratory assignments", undefined, "INVALID_STAFF_ASSIGNMENT");
    }

    const existing = await prisma.userLabAssignment.findUnique({
      where: { userId_laboratoryId: { userId: user.id, laboratoryId } }
    });
    if (existing) {
      throw new HttpError(409, "Laboratory assignment already exists", undefined, "DUPLICATE_ASSIGNMENT");
    }

    const assignment = await prisma.userLabAssignment.create({
      data: { userId: user.id, laboratoryId },
      include: { laboratory: true }
    });
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/lab-assignments/:laboratoryId", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const existing = await prisma.userLabAssignment.findUnique({
      where: {
        userId_laboratoryId: {
          userId: req.params.id,
          laboratoryId: req.params.laboratoryId
        }
      }
    });
    if (!existing) throw new HttpError(404, "Laboratory assignment not found", undefined, "NOT_FOUND");
    await prisma.userLabAssignment.delete({
      where: {
        userId_laboratoryId: {
          userId: req.params.id,
          laboratoryId: req.params.laboratoryId
        }
      }
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...safeUserSelect,
        _count: { select: { bookings: true, labAssignments: true } }
      }
    });
    if (!user) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:id/role — Admin: Update user role.
 * Only ADMIN can change roles.
 */
const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"])
}).strict();

router.patch("/:id/role", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = updateRoleSchema.parse(req.body);

    if (req.params.id === req.user.id && data.role !== ADMIN) {
      throw new HttpError(409, "You cannot remove your own administrator role", undefined, "SELF_LOCKOUT_FORBIDDEN");
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: req.params.id },
        data: { role: data.role }
      });
      if (data.role !== LAB_STAFF) {
        await tx.userLabAssignment.deleteMany({ where: { userId: req.params.id } });
      }
      return saved;
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:id/active — Admin: Activate/deactivate user.
 */
const updateActiveSchema = z.object({
  isActive: z.boolean()
}).strict();

router.patch("/:id/active", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = updateActiveSchema.parse(req.body);

    if (req.params.id === req.user.id && !data.isActive) {
      throw new HttpError(409, "You cannot deactivate your own account", undefined, "SELF_LOCKOUT_FORBIDDEN");
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: data.isActive }
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive
    });
  } catch (error) {
    if (error.code === "P2025") {
      return next(new HttpError(404, "User not found", undefined, "NOT_FOUND"));
    }
    next(error);
  }
});

export default router;
