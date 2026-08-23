/**
 * Incident Management Routes
 * Blueprint §12, §19.7
 *
 * POST   /incidents
 * GET    /incidents
 * GET    /incidents/:id
 * PATCH  /incidents/:id
 * POST   /incidents/:id/assign
 * POST   /incidents/:id/resolve
 * POST   /incidents/:id/close
 * POST   /incidents/:id/comments
 */

import express from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { notify, notifyAdminsAndStaff } from "../utils/notifications.js";

const router = express.Router();
router.use(requireAuth);

// ─── Schemas ────────────────────────────────────────────────────────────────

const createIncidentSchema = z.object({
  resourceId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(4000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  category: z.string().max(100).optional(),
  detectedAt: z.coerce.date().optional()
});

const updateIncidentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).max(4000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().max(100).optional()
});

const resolveSchema = z.object({
  resolution: z.string().min(10).max(4000)
});

const commentSchema = z.object({
  content: z.string().min(1).max(2000)
});

const incidentInclude = {
  resource: { select: { id: true, code: true, name: true, type: true } },
  reportedBy: { select: { id: true, fullName: true, email: true, role: true } },
  assignedTo: { select: { id: true, fullName: true, email: true, role: true } },
  comments: { orderBy: { createdAt: "asc" } }
};

// ─── List Incidents ───────────────────────────────────────────────────────────

router.get("/", async (req, res, next) => {
  try {
    const isStaff = ["admin", "lab_staff"].includes(req.user.role);
    const where = isStaff ? {} : { reportedById: req.user.id };

    const { status, severity, resourceId } = req.query;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (resourceId) where.resourceId = resourceId;

    const incidents = await prisma.incident.findMany({
      where,
      include: incidentInclude,
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data: incidents });
  } catch (error) {
    next(error);
  }
});

// ─── Get Incident ─────────────────────────────────────────────────────────────

router.get("/:id", async (req, res, next) => {
  try {
    const incident = await getIncident(req.params.id);
    ensureCanViewIncident(incident, req.user);
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
});

// ─── Create Incident ─────────────────────────────────────────────────────────

router.post("/", async (req, res, next) => {
  try {
    const data = createIncidentSchema.parse(req.body);

    const resource = await prisma.resource.findUnique({ where: { id: data.resourceId } });
    if (!resource) throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");

    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          ...data,
          reportedById: req.user.id,
          status: "reported"
        },
        include: incidentInclude
      });

      // Auto-restrict thiết bị nếu severity là CRITICAL (blueprint §12)
      if (data.severity === "critical") {
        await tx.resource.update({
          where: { id: data.resourceId },
          data: {
            operationalStatus: "broken",
            bookingState: "non_bookable",
            status: "offline"
          }
        });
        await tx.usageLog.create({
          data: {
            resourceId: data.resourceId,
            userId: req.user.id,
            action: "status_change",
            message: `Equipment auto-restricted due to CRITICAL incident: ${data.title}`,
            messageKey: "incident_reported",
            messageParams: { incidentId: created.id, severity: "critical" }
          }
        });
      }

      return created;
    });

    // Notify staff
    await sendNotificationSafely(() =>
      notifyAdminsAndStaff(
        "Sự cố mới được báo cáo",
        "newIncidentReported",
        "warning",
        { resource: resource.name, severity: data.severity, title: data.title }
      )
    );

    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
});

// ─── Update Incident ─────────────────────────────────────────────────────────

router.patch("/:id", async (req, res, next) => {
  try {
    const data = updateIncidentSchema.parse(req.body);
    const incident = await getIncident(req.params.id);
    ensureCanManageIncident(incident, req.user);

    if (["resolved", "verified", "closed"].includes(incident.status)) {
      throw new HttpError(409, "Incident is already closed", undefined, "INCIDENT_ALREADY_CLOSED");
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data,
      include: incidentInclude
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── Assign Incident ─────────────────────────────────────────────────────────

router.post("/:id/assign", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const { assignedToId } = z.object({ assignedToId: z.string().uuid() }).parse(req.body);
    const incident = await getIncident(req.params.id);

    if (incident.status === "closed") {
      throw new HttpError(409, "Cannot assign a closed incident", undefined, "INCIDENT_ALREADY_CLOSED");
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        assignedToId,
        status: "assigned"
      },
      include: incidentInclude
    });

    await sendNotificationSafely(() =>
      notify(assignedToId, "Bạn được phân công xử lý sự cố", "incidentAssigned", "warning", {
        resource: incident.resource.name,
        title: incident.title
      })
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── Resolve Incident ─────────────────────────────────────────────────────────

router.post("/:id/resolve", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const { resolution } = resolveSchema.parse(req.body);
    const incident = await getIncident(req.params.id);

    if (["resolved", "verified", "closed"].includes(incident.status)) {
      throw new HttpError(409, "Incident is already resolved", undefined, "INCIDENT_ALREADY_RESOLVED");
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: "resolved",
        resolution,
        resolvedAt: new Date()
      },
      include: incidentInclude
    });

    await sendNotificationSafely(() =>
      notify(incident.reportedById, "Sự cố đã được giải quyết", "incidentResolved", "success", {
        resource: incident.resource.name,
        title: incident.title
      })
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── Close Incident ───────────────────────────────────────────────────────────

router.post("/:id/close", requireRole("admin", "lab_staff"), async (req, res, next) => {
  try {
    const incident = await getIncident(req.params.id);

    if (incident.status === "closed") {
      throw new HttpError(409, "Incident is already closed", undefined, "INCIDENT_ALREADY_CLOSED");
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: { status: "closed" },
      include: incidentInclude
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── Add Comment ──────────────────────────────────────────────────────────────

router.post("/:id/comments", async (req, res, next) => {
  try {
    const { content } = commentSchema.parse(req.body);
    const incident = await getIncident(req.params.id);
    ensureCanViewIncident(incident, req.user);

    const comment = await prisma.incidentComment.create({
      data: {
        incidentId: incident.id,
        authorId: req.user.id,
        content
      }
    });
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getIncident(id) {
  const incident = await prisma.incident.findUnique({ where: { id }, include: incidentInclude });
  if (!incident) throw new HttpError(404, "Incident not found", undefined, "INCIDENT_NOT_FOUND");
  return incident;
}

function ensureCanViewIncident(incident, user) {
  const isStaff = ["admin", "lab_staff"].includes(user.role);
  if (!isStaff && incident.reportedById !== user.id) {
    throw new HttpError(403, "Access forbidden", undefined, "AUTH_FORBIDDEN");
  }
}

function ensureCanManageIncident(incident, user) {
  const isStaff = ["admin", "lab_staff"].includes(user.role);
  if (!isStaff) {
    throw new HttpError(403, "Only staff can manage incidents", undefined, "AUTH_FORBIDDEN");
  }
}

async function sendNotificationSafely(task) {
  try {
    await task();
  } catch (error) {
    console.error("Notification delivery failed after incident mutation", error);
  }
}

export default router;
