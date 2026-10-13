import { getUserLoyalty, getVerifiedSpend } from '../services/loyaltyService.js';
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { prisma } from "../db.js";
import { config } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, CANONICAL_ROLES, LAB_STAFF, CUSTOMER } from "../constants/roles.js";
import { safeUserSelect } from "../services/userService.js";
import { canManageTarget } from "../services/accountAccess.js";
import { createAccount, editAccount, changeAccountRole, changeAccountActive, removeAccount, staffCustomerSelect } from "../services/accountManagementService.js";
import { requestPasswordOtp, confirmPasswordOtp } from "../services/passwordSecurityService.js";
import { validateVietnamAddress } from "../services/addressService.js";
import { publicCustomerUser } from "../services/guestBookingService.js";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, recordSystemAuditEvent } from "../services/systemAuditService.js";

const router = express.Router();
const accountLimit = rateLimit({ windowMs: 60000, limit: config.isProduction ? 30 : 120, keyGenerator: req => req.user.id,
  standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many account changes" } } });
const phoneSchema = z.string().trim().max(20).refine(value => !value || /^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(value));

const addressSchema = z.object({
  addressLine: z.string().trim().min(5).max(300),
  provinceCode: z.union([z.string(), z.number()]),
  wardCode: z.union([z.string(), z.number()])
}).strict();

const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(20).refine(value => !value || /^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(value)).optional(),
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
  return prisma.$transaction(async tx => {
  const [paymentStats, bookingStats, userCerts, loyalty] = await Promise.all([
    getVerifiedSpend(tx, user.id),
    tx.booking.groupBy({
      by: ["status"],
      where: { requestedById: user.id },
      _count: { _all: true }
    }),
    tx.userCertification.findMany({
      where: { userId: user.id },
      include: {
        course: { select: { id: true, code: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    getUserLoyalty(tx, user.id)
  ]);
  const bookingCounts = Object.fromEntries(bookingStats.map(row => [row.status, row._count._all]));
  const totalSpendVnd = paymentStats.totalSpendVnd;
  const completedBookings = bookingCounts.COMPLETED || 0;
  return {
    ...publicCustomerUser(user),
    createdAt: user.createdAt,
    certifications: userCerts.map((c) => ({
      id: c.id,
      courseId: c.courseId,
      code: c.course.code,
      name: c.course.name,
      status: c.status,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt
    })),
    spending: {
      totalSpendVnd,
      successfulPayments: paymentStats.successfulPayments,
      lastPaidAt: paymentStats.lastPaidAt,
      paidCurrency: "VND"
    },
    bookingSummary: {
      total: Object.values(bookingCounts).reduce((sum, value) => sum + value, 0),
      completed: completedBookings,
      active: (bookingCounts.PENDING_APPROVAL || 0) + (bookingCounts.CONFIRMED || 0) + (bookingCounts.CHECKED_OUT || 0) + (bookingCounts.RETURNED || 0),
      byStatus: bookingCounts
    },
    loyalty
  };
  }, { isolationLevel: "RepeatableRead" });
}

/**
 * GET /me — Current user profile with Open LAB identity, default address,
 * persisted spending totals, and LAB loyalty signals. No mockStore fallback.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    return res.json(await buildProfileResponse(user, req.locale));
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
    return res.json(await buildProfileResponse(user, req.locale));
  } catch (error) {
    next(error);
  }
});

/**
 * GET / — Admin: List all users.
 * Requires ADMIN role. No mockStore fallback.
 */
router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: req.user.role === LAB_STAFF ? { role: CUSTOMER } : {},
      select: {
        ...(req.user.role === ADMIN ? safeUserSelect : staffCustomerSelect),
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
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(2).max(255),
  role: z.enum(CANONICAL_ROLES).default("CUSTOMER"),
  isActive: z.boolean().default(true),
  studentId: z.string().trim().max(50).optional(),
  department: z.string().trim().max(100).optional(),
  phone: phoneSchema.optional(),
  organization: z.string().trim().max(160).optional(),
  customerType: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL")
}).strict();

router.post("/", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const created = await createAccount(req.user, data, req.locale);
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

router.get("/:id", requireAuth, requireRole(ADMIN, LAB_STAFF), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...(req.user.role === ADMIN ? safeUserSelect : staffCustomerSelect),
        _count: { select: { bookings: true } }
      }
    });
    if (!user || !canManageTarget(req.user, user)) throw new HttpError(404, "User not found", undefined, "NOT_FOUND");
    res.json(user);
  } catch (error) {
    next(error);
  }
});


const editAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: phoneSchema.optional(),
  organization: z.string().trim().max(160).optional().nullable()
}).strict().refine(value => Object.keys(value).length > 0, { message: "Specify a field to update" });
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
const assistedConfirmSchema = z.object({ challengeId: z.string().uuid(), otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128) }).strict();

router.patch("/:id", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try {
    const data = editAccountSchema.parse(req.body);
    if (data.phone === "") data.phone = null;
    if (data.organization === "") data.organization = null;
    res.json(await editAccount(req.user, req.params.id, data));
  } catch (error) { next(error); }
});
router.delete("/:id", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try { const { reason } = reasonSchema.parse(req.body); res.json(await removeAccount(req.user, req.params.id, reason)); }
  catch (error) { next(error); }
});
router.post("/:id/password-otp/request", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try {
    const { reason } = reasonSchema.parse(req.body);
    res.json(await requestPasswordOtp(req.user, { targetUserId: req.params.id, reason, locale: req.locale }));
  } catch (error) { next(error); }
});
router.post("/:id/password-otp/confirm", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try {
    const data = assistedConfirmSchema.parse(req.body);
    await confirmPasswordOtp(req.user, { ...data, targetUserId: req.params.id });
    res.json({ success: true });
  } catch (error) { next(error); }
});
const updateRoleSchema = z.object({ role: z.enum(CANONICAL_ROLES) }).strict();
router.patch("/:id/role", requireAuth, requireRole(ADMIN), accountLimit, async (req, res, next) => {
  try { const { role } = updateRoleSchema.parse(req.body); res.json(await changeAccountRole(req.user, req.params.id, role)); }
  catch (error) { next(error); }
});
const updateActiveSchema = z.object({ isActive: z.boolean() }).strict();
router.patch("/:id/active", requireAuth, requireRole(ADMIN, LAB_STAFF), accountLimit, async (req, res, next) => {
  try { const { isActive } = updateActiveSchema.parse(req.body); res.json(await changeAccountActive(req.user, req.params.id, isActive)); }
  catch (error) { next(error); }
});

export default router;
