/**
 * Training & Certification Routes
 * Blueprint §10, §19.8
 *
 * GET    /training/courses
 * POST   /training/courses              (admin/lab_staff)
 * PATCH  /training/courses/:id          (admin/lab_staff)
 * DELETE /training/courses/:id          (admin)
 *
 * GET    /training/requirements
 * POST   /training/requirements         (admin/lab_staff)
 * DELETE /training/requirements/:id     (admin/lab_staff)
 *
 * GET    /training/certifications       (mine)
 * POST   /training/certifications       (admin/lab_staff — grant cert)
 * PATCH  /training/certifications/:id   (admin/lab_staff)
 * DELETE /training/certifications/:id   (admin)
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { notify } from "../utils/notifications.js";

const router = express.Router();
router.use(requireAuth);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const courseSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  durationHours: z.number().positive().optional(),
  isRequired: z.boolean().default(false)
});

const requirementSchema = z.object({
  resourceId: z.string().uuid(),
  courseId: z.string().uuid(),
  isMandatory: z.boolean().default(true)
});

const certificationSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  status: z.enum(["pending", "active", "expired", "revoked"]).default("active"),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional()
});

// ─── Courses ─────────────────────────────────────────────────────────────────

router.get("/courses", async (req, res, next) => {
  try {
    const courses = await prisma.trainingCourse.findMany({ orderBy: { name: "asc" } });
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
});

router.post("/courses", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = courseSchema.parse(req.body);
    const course = await prisma.trainingCourse.create({ data });
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

router.patch("/courses/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = courseSchema.partial().parse(req.body);
    const course = await prisma.trainingCourse.update({
      where: { id: req.params.id },
      data
    });
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

router.delete("/courses/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.trainingCourse.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── Requirements (Equipment → Course mapping) ───────────────────────────────

router.get("/requirements", async (req, res, next) => {
  try {
    const { resourceId } = req.query;
    const where = resourceId ? { resourceId } : {};
    const requirements = await prisma.trainingRequirement.findMany({
      where,
      include: { course: true, resource: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: "asc" }
    });
    res.json({ success: true, data: requirements });
  } catch (error) {
    next(error);
  }
});

router.post("/requirements", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = requirementSchema.parse(req.body);
    const req_ = await prisma.trainingRequirement.create({
      data,
      include: { course: true, resource: { select: { id: true, code: true, name: true } } }
    });
    res.status(201).json({ success: true, data: req_ });
  } catch (error) {
    next(error);
  }
});

router.delete("/requirements/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    await prisma.trainingRequirement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── User Certifications ──────────────────────────────────────────────────────

/// Lấy chứng chỉ của user hiện tại
router.get("/certifications/me", async (req, res, next) => {
  try {
    const certs = await prisma.userCertification.findMany({
      where: { userId: req.user.id },
      include: { course: true },
      orderBy: { issuedAt: "desc" }
    });
    res.json({ success: true, data: certs });
  } catch (error) {
    next(error);
  }
});

/// Lấy chứng chỉ của user bất kỳ (staff only)
router.get("/certifications", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const { userId, courseId, status } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    const certs = await prisma.userCertification.findMany({
      where,
      include: {
        course: true,
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { issuedAt: "desc" }
    });
    res.json({ success: true, data: certs });
  } catch (error) {
    next(error);
  }
});

/// User hoàn thành và vượt qua bài thi trắc nghiệm trực tuyến (Tất cả role đều được gọi)
router.post("/quiz-pass", async (req, res, next) => {
  try {
    const { courseId, score, answers } = z.object({
      courseId: z.string().uuid(),
      score: z.number().min(0).max(100),
      answers: z.record(z.string()).optional()
    }).parse(req.body);

    if (score < 80) {
      throw new HttpError(400, "Điểm thi chưa đạt yêu cầu tối thiểu (>= 80%)", undefined, "QUIZ_SCORE_INSUFFICIENT");
    }

    const course = await prisma.trainingCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new HttpError(404, "Khóa học không tồn tại", undefined, "COURSE_NOT_FOUND");

    const expiresAt = new Date(Date.now() + 365 * 86_400_000); // 1 year validity

    const cert = await prisma.userCertification.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      update: {
        status: "active",
        issuedAt: new Date(),
        expiresAt,
        notes: `Cấp tự động qua bài thi trắc nghiệm trực tuyến (Điểm: ${score}%)`,
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        courseId,
        status: "active",
        issuedAt: new Date(),
        expiresAt,
        notes: `Cấp tự động qua bài thi trắc nghiệm trực tuyến (Điểm: ${score}%)`
      },
      include: { course: true }
    });

    await sendNotificationSafely(() =>
      notify(req.user.id, "Chứng chỉ đã được cấp thành công", "certificationGranted", "success", {
        course: course.name,
        score: `${score}%`
      })
    );

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
});

/// Cấp chứng chỉ cho user (admin/lab_staff)
router.post("/certifications", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = certificationSchema.parse(req.body);
    const cert = await prisma.userCertification.upsert({
      where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
      update: { ...data, issuedById: req.user.id, updatedAt: new Date() },
      create: { ...data, issuedById: req.user.id },
      include: { course: true }
    });

    // Notify user
    await sendNotificationSafely(() =>
      notify(data.userId, "Bạn đã nhận được chứng chỉ mới", "certificationGranted", "success", {
        course: cert.course.name
      })
    );

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
});

/// Thu hồi/cập nhật chứng chỉ
router.patch("/certifications/:id", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const data = z.object({
      status: z.enum(["pending", "active", "expired", "revoked"]).optional(),
      expiresAt: z.coerce.date().optional(),
      notes: z.string().max(1000).optional()
    }).parse(req.body);

    const cert = await prisma.userCertification.update({
      where: { id: req.params.id },
      data,
      include: { course: true, user: { select: { id: true, fullName: true } } }
    });
    res.json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
});

async function sendNotificationSafely(task) {
  try {
    await task();
  } catch (error) {
    console.error("Notification failed in training route", error);
  }
}

export default router;
