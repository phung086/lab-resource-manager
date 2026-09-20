import express from "express";
import { prisma } from "../db.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF, STAFF_ROLES } from "../constants/roles.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(optionalAuth);

/**
 * Helper to determine if user can view operational details for a resource
 */
async function canViewResourceOperations(user, resource) {
  if (!user) return false;
  if (user.role === ADMIN) return true;
  if (user.role === LAB_STAFF) {
    if (!resource.laboratoryId) return false;
    const assignment = await prisma.userLabAssignment.findFirst({
      where: { userId: user.id, laboratoryId: resource.laboratoryId }
    });
    return Boolean(assignment);
  }
  return false;
}

/**
 * GET /slots?start_date=...&end_date=...&resource_id=...&laboratory_id=...
 * Returns weekly time slots (7 Days x 13 Hours, 08:00 to 20:00) with privacy-safe occupancy states
 */
router.get("/slots", async (req, res, next) => {
  try {
    const { resource_id, start_date, startDate, laboratory_id, lab_id } = req.query;
    const targetLabId = laboratory_id || lab_id;

    const resourceWhere = {};
    if (resource_id) resourceWhere.id = String(resource_id);
    if (targetLabId) resourceWhere.laboratoryId = String(targetLabId);

    const resources = await prisma.resource.findMany({
      where: resourceWhere,
      include: { laboratory: { select: { id: true, name: true, code: true } } },
      orderBy: { code: "asc" }
    });

    let existingBookings = [];
    let maintenanceWindows = [];

    const selectedResource = resources.find((r) => r.id === resource_id) || resources[0] || null;
    const activeResourceId = selectedResource?.id || resource_id || null;

    // Determine target anchor date
    const dateInput = start_date || startDate;
    const now = new Date();
    const anchorDate = dateInput ? new Date(dateInput) : now;
    const safeAnchor = Number.isNaN(anchorDate.getTime()) ? now : anchorDate;

    // Compute dates for Monday -> Sunday
    const currentDayOfWeek = safeAnchor.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const monday = new Date(safeAnchor);
    monday.setDate(safeAnchor.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = [
      { key: "mon", name: "Thứ 2", offset: 0 },
      { key: "tue", name: "Thứ 3", offset: 1 },
      { key: "wed", name: "Thứ 4", offset: 2 },
      { key: "thu", name: "Thứ 5", offset: 3 },
      { key: "fri", name: "Thứ 6", offset: 4 },
      { key: "sat", name: "Thứ 7", offset: 5 },
      { key: "sun", name: "Chủ Nhật", offset: 6 }
    ].map((d) => {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + d.offset);
      return {
        ...d,
        dateStr: `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}`,
        fullDate: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`,
        isToday: dateObj.toDateString() === now.toDateString()
      };
    });

    if (activeResourceId) {
      const weekStart = new Date(monday);
      const weekEnd = new Date(monday);
      weekEnd.setDate(monday.getDate() + 7);

      [existingBookings, maintenanceWindows] = await Promise.all([
        prisma.booking.findMany({
          where: {
            resourceId: activeResourceId,
            status: { in: ACTIVE_BOOKING_STATUSES },
            startAt: { lt: weekEnd },
            endAt: { gt: weekStart }
          },
          select: {
            id: true,
            resourceId: true,
            requestedById: true,
            title: true,
            startAt: true,
            endAt: true,
            status: true
          }
        }),
        prisma.maintenanceWindow.findMany({
          where: {
            resourceId: activeResourceId,
            status: { in: ["scheduled", "in_progress"] },
            startAt: { lt: weekEnd },
            endAt: { gt: weekStart }
          }
        })
      ]);
    }

    const isStaff = selectedResource ? await canViewResourceOperations(req.user, selectedResource) : false;
    const currentUserId = req.user?.id || null;

    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    const grid = hours.map((hour) => {
      const timeLabel = `${String(hour).padStart(2, "0")}:00`;

      const daySlots = days.map((day) => {
        const slotStart = new Date(`${day.fullDate}T${String(hour).padStart(2, "0")}:00:00`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        const opStatus = selectedResource?.operationalStatus || (selectedResource?.status ? String(selectedResource.status).toUpperCase() : "AVAILABLE");

        if (opStatus === "MAINTENANCE" || opStatus === "CALIBRATION") {
          return {
            status: "maintenance",
            label: "BẢO TRÌ ĐỊNH KỲ",
            details: "Đang bảo dưỡng kỹ thuật"
          };
        }

        if (opStatus === "OFFLINE" || opStatus === "BROKEN" || opStatus === "RETIRED") {
          return {
            status: "offline",
            label: "TẠM NGỪNG",
            details: "Thiết bị không khả dụng"
          };
        }

        const maintenance = maintenanceWindows.find((window) => {
          const windowStart = new Date(window.startAt);
          const windowEnd = new Date(window.endAt);
          return slotStart < windowEnd && slotEnd > windowStart;
        });
        if (maintenance) {
          return {
            status: "maintenance",
            label: maintenance.kind === "calibration" ? "HIỆU CHUẨN" : "BẢO TRÌ",
            details: maintenance.title,
            maintenanceWindowId: maintenance.id
          };
        }

        // Check booking match
        const match = existingBookings.find((b) => {
          const bStart = new Date(b.startAt);
          const bEnd = new Date(b.endAt);
          return slotStart < bEnd && slotEnd > bStart;
        });

        if (match) {
          const isMine = currentUserId && match.requestedById === currentUserId;
          return {
            status: "booked",
            label: isMine ? "LỊCH CỦA BẠN" : "ĐÃ ĐẶT",
            title: isMine || isStaff ? match.title : "Đã đặt",
            resourceId: activeResourceId,
            bookingId: match.id,
            isMine: Boolean(isMine)
          };
        }

        return {
          status: "available",
          label: "Trống",
          action: "+ Đặt ngay",
          resourceId: activeResourceId,
          date: day.fullDate,
          time: timeLabel
        };
      });

      return {
        time: timeLabel,
        hour,
        days: daySlots
      };
    });

    return res.json({
      selectedResource: selectedResource
        ? {
            id: selectedResource.id,
            name: selectedResource.name,
            code: selectedResource.code,
            type: selectedResource.subtype || selectedResource.type,
            category: selectedResource.category,
            status: selectedResource.status,
            operationalStatus: selectedResource.operationalStatus,
            requiresApproval: selectedResource.requiresApproval,
            laboratory: selectedResource.laboratory
          }
        : null,
      availableResources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        type: r.subtype || r.type,
        category: r.category,
        status: r.status,
        operationalStatus: r.operationalStatus,
        requiresApproval: r.requiresApproval
      })),
      daysHeader: days,
      grid,
      range: {
        start: monday.toISOString(),
        end: new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events?start=...&end=...&resource_id=...&laboratory_id=...
 * Returns calendar events with strict privacy protection across any arbitrary date range.
 */
router.get("/events", async (req, res, next) => {
  try {
    const { start, start_date, startDate, end, end_date, endDate, resource_id, laboratory_id } = req.query;

    const startInput = start || start_date || startDate;
    const endInput = end || end_date || endDate;

    const fromDate = startInput ? new Date(startInput) : new Date();
    const toDate = endInput ? new Date(endInput) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (fromDate >= toDate) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Start date must precede end date" } });
    }

    const resourceWhere = {};
    if (resource_id) resourceWhere.id = String(resource_id);
    if (laboratory_id) resourceWhere.laboratoryId = String(laboratory_id);

    const [bookings, maintenanceWindows, staffAssignments] = await Promise.all([
      prisma.booking.findMany({
        where: {
          resource: resourceWhere,
          status: { in: ACTIVE_BOOKING_STATUSES },
          startAt: { lt: toDate },
          endAt: { gt: fromDate }
        },
        include: {
          resource: { select: { id: true, name: true, code: true, laboratoryId: true } },
          requestedBy: { select: { id: true, fullName: true, email: true, role: true } }
        },
        orderBy: { startAt: "asc" }
      }),
      prisma.maintenanceWindow.findMany({
        where: {
          resource: resourceWhere,
          status: { in: ["scheduled", "in_progress"] },
          startAt: { lt: toDate },
          endAt: { gt: fromDate }
        },
        include: {
          resource: { select: { id: true, name: true, code: true, laboratoryId: true } }
        },
        orderBy: { startAt: "asc" }
      }),
      req.user?.role === LAB_STAFF
        ? prisma.userLabAssignment.findMany({ where: { userId: req.user.id }, select: { laboratoryId: true } })
        : Promise.resolve([])
    ]);

    const staffLabIds = new Set(staffAssignments.map((a) => a.laboratoryId));
    const isGlobalAdmin = req.user?.role === ADMIN;
    const currentUserId = req.user?.id || null;

    const events = [];

    // Map bookings respecting privacy contract
    for (const b of bookings) {
      const isMine = currentUserId && b.requestedById === currentUserId;
      const isStaffForLab = isGlobalAdmin || (req.user?.role === LAB_STAFF && b.resource?.laboratoryId && staffLabIds.has(b.resource.laboratoryId));

      if (isStaffForLab) {
        events.push({
          id: b.id,
          resourceId: b.resourceId,
          resourceName: b.resource?.name,
          resourceCode: b.resource?.code,
          title: b.title,
          purpose: b.purpose,
          start: b.startAt.toISOString(),
          end: b.endAt.toISOString(),
          occupancy: "BOOKED",
          status: b.status,
          type: "booking",
          isMine: Boolean(isMine),
          bookingCode: b.bookingCode,
          requestedBy: b.requestedBy
        });
      } else if (isMine) {
        events.push({
          id: b.id,
          resourceId: b.resourceId,
          resourceName: b.resource?.name,
          resourceCode: b.resource?.code,
          title: b.title,
          purpose: b.purpose,
          start: b.startAt.toISOString(),
          end: b.endAt.toISOString(),
          occupancy: "BOOKED",
          status: b.status,
          type: "booking",
          isMine: true,
          bookingCode: b.bookingCode
        });
      } else {
        // Sanitized public/other student view: ZERO personal info leaked, no fabricated status
        events.push({
          id: b.id,
          resourceId: b.resourceId,
          resourceName: b.resource?.name,
          resourceCode: b.resource?.code,
          title: "Đã đặt",
          start: b.startAt.toISOString(),
          end: b.endAt.toISOString(),
          occupancy: "BOOKED",
          type: "booking",
          isMine: false
        });
      }
    }

    // Map maintenance windows
    for (const m of maintenanceWindows) {
      events.push({
        id: m.id,
        resourceId: m.resourceId,
        resourceName: m.resource?.name,
        resourceCode: m.resource?.code,
        title: m.kind === "calibration" ? `Hiệu chuẩn: ${m.title}` : `Bảo trì: ${m.title}`,
        start: m.startAt.toISOString(),
        end: m.endAt.toISOString(),
        status: m.status,
        kind: m.kind,
        type: m.kind === "calibration" ? "calibration" : "maintenance"
      });
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return res.json({
      range: {
        start: fromDate.toISOString(),
        end: toDate.toISOString()
      },
      events
    });
  } catch (error) {
    next(error);
  }
});

export default router;
