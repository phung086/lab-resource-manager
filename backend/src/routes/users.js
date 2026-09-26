import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, CANONICAL_ROLES, LAB_STAFF } from "../constants/roles.js";
import { createManagedUser, safeUserSelect } from "../services/userService.js";
import { validateVietnamAddress } from "../services/addressService.js";
import { publicCustomerUser } from "../services/guestBookingService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "../services/systemAuditService.js";

const router = express.Router();

const addressSchema = z.object({
  addressLine: z.string().trim().min(5).max(300),
  provinceCode: z.union([z.string(), z.number()]),
  wardCode: z.union([z.string(), z.number()])
}).strict();

const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  organization: z.string().trim().max(160).optional().nullable(),
  customerType: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  address: addressSchema.optional()
}).strict();

function addressData(address) {
  if (!address) return {};
  return {
    defaultAddressLine: address.addressLine,
    defaultAddressProvinceCode: address.provinceCode,
    defaultAddressProvinceName: address.provinceName,
    defaultAddressWardCode: address.wardCode,
    defaultAddressWardName: address.wardName,
    defaultAddressSource: address.source,
    defaultAddressVersion: address.version
  };
}

async function buildProfileResponse(user) {
  const [paymentStats, bookingStats] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      where: { userId: user.id, status: "success" },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { paidAt: true }
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { requestedById: user.id },
      _count: { _all: true }
    })
  ]);
  const bookingCounts = Object.fromEntries(bookingStats.map(row => [row.status, row._count._all]));
  const totalSpendVnd = Number(paymentStats._sum.amount || 0);
  const completedBookings = bookingCounts.COMPLETED || 0;
  const earnedPoints = Math.floor(totalSpendVnd / 10000) + completedBookings * 10;
  const suggestedTier = totalSpendVnd >= 5000000 || completedBookings >= 10
    ? "LAB_PRIORITY"
    : totalSpendVnd >= 1500000 || completedBookings >= 4
      ? "LAB_PLUS"
      : "LAB_STANDARD";
  return {
    ...publicCustomerUser(user),
    createdAt: user.createdAt,
    spending: {
      totalSpendVnd,
      successfulPayments: paymentStats._count._all,
      lastPaidAt: paymentStats._max.paidAt || null,
      paidCurrency: "VND"
    },
    bookingSummary: {
      total: Object.values(bookingCounts).reduce((sum, value) => sum + value, 0),
      completed: completedBookings,
      active: (bookingCounts.PENDING_APPROVAL || 0) + (bookingCounts.CONFIRMED || 0) + (bookingCounts.CHECKED_OUT || 0) + (bookingCounts.RETURNED || 0),
      byStatus: bookingCounts
    },
    loyalty: {
      tier: user.loyaltyTier || suggestedTier,
      configuredTier: user.loyaltyTier || "LAB_STANDARD",
      suggestedTier,
      points: Math.max(user.loyaltyPoints || 0, earnedPoints),
      earnedPoints,
      discountBps: user.loyaltyDiscountBps || 0,
      priorityBoost: user.priorityBoost || 0,
      basis: "Tính từ thanh toán thành công và booking hoàn tất trong database"
    }
  };
}

/**
 * GET /me — Current user profile with Open LAB identity, default address,
 * persisted spending totals, and LAB loyalty signals. No mockStore fallback.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    return res.json(await buildProfileResponse(user));
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateOwnProfileSchema.parse(req.body);
    const verifiedAddress = data.address ? await validateVietnamAddress(data.address) : null;
    const update = {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.organization !== undefined ? { organization: data.organization || null } : {}),
      ...(data.customerType !== undefined ? { customerType: data.customerType } : {}),
      ...addressData(verifiedAddress)
    };
    const user = await prisma.user.update({ where: { id: req.user.id }, data: update });
    return res.json(await buildProfileResponse(user));
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


const createUserSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(2).max(255),
  role: z.enum(CANONICAL_ROLES).default("STUDENT"),
  isActive: z.boolean().default(true),
  studentId: z.string().trim().max(50).optional(),
  department: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  organization: z.string().trim().max(160).optional(),
  customerType: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL")
}).strict();

router.post("/", requireAuth, requireRole(ADMIN), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const created = await createManagedUser(prisma, data);
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === "P2002") {
      return next(new HttpError(409, "Email already registered", { field: "email" }, "DUPLICATE_EMAIL"));
    }
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

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.userLabAssignment.create({
        data: { userId: user.id, laboratoryId },
        include: { laboratory: true }
      });
      await recordSystemAuditEvent(tx, {
        actor: req.user,
        action: AUDIT_ACTIONS.LAB_ASSIGNMENT_ADDED,
        targetType: AUDIT_TARGET_TYPES.LAB_ASSIGNMENT,
        targetId: `${user.id}:${laboratoryId}`,
        labId: laboratoryId,
        afterState: { userId: user.id, laboratoryId, laboratoryCode: laboratory.code },
        metadata: { source: "admin_user_management" }
      });
      return created;
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
    await prisma.$transaction(async (tx) => {
      await tx.userLabAssignment.delete({
        where: {
          userId_laboratoryId: {
            userId: req.params.id,
            laboratoryId: req.params.laboratoryId
          }
        }
      });
      await recordSystemAuditEvent(tx, {
        actor: req.user,
        action: AUDIT_ACTIONS.LAB_ASSIGNMENT_REMOVED,
        targetType: AUDIT_TARGET_TYPES.LAB_ASSIGNMENT,
        targetId: `${req.params.id}:${req.params.laboratoryId}`,
        labId: req.params.laboratoryId,
        beforeState: { userId: req.params.id, laboratoryId: req.params.laboratoryId },
        metadata: { source: "admin_user_management" }
      });
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
      await recordSystemAuditEvent(tx, {
        actor: req.user,
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        targetType: AUDIT_TARGET_TYPES.USER,
        targetId: saved.id,
        beforeState: { role: user.role },
        afterState: { role: saved.role },
        metadata: { source: "admin_user_management" }
      });
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

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: req.params.id },
        data: { isActive: data.isActive }
      });
      await recordSystemAuditEvent(tx, {
        actor: req.user,
        action: AUDIT_ACTIONS.USER_ACTIVATION_CHANGED,
        targetType: AUDIT_TARGET_TYPES.USER,
        targetId: saved.id,
        beforeState: { isActive: user.isActive },
        afterState: { isActive: saved.isActive },
        metadata: { source: "admin_user_management" }
      });
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
    if (error.code === "P2025") {
      return next(new HttpError(404, "User not found", undefined, "NOT_FOUND"));
    }
    next(error);
  }
});

export default router;
