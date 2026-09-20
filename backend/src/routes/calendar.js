import express from "express";
import { prisma } from "../db.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";

const router = express.Router();

/**
 * GET /slots?start_date=...&end_date=...&resource_id=...
 * Returns weekly time slots (7 Days x 13 Hours, 08:00 to 20:00) with occupancy states
 */
router.get("/slots", async (req, res, next) => {
  try {
    const { resource_id } = req.query;

    const resources = await prisma.resource.findMany({
      where: resource_id ? { id: String(resource_id) } : {},
      orderBy: { code: "asc" }
    });
    let existingBookings = [];
    let maintenanceWindows = [];

  const selectedResource = resources.find((r) => r.id === resource_id) || resources[0] || null;
  const activeResourceId = selectedResource?.id || resource_id || null;

  // Compute dates for current week Monday -> Sunday
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
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
          select: { startAt: true, endAt: true, status: true }
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
        return {
          status: "booked",
          label: "ĐÃ ĐẶT",
          resourceId: activeResourceId
        };
      }

      return {
        status: "available",
        label: "Trống",
        action: "+ Đặt ngay",
        resourceId: activeResourceId
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
          operationalStatus: selectedResource.operationalStatus
        }
      : null,
    availableResources: resources.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      type: r.subtype || r.type,
      category: r.category,
      status: r.status,
      operationalStatus: r.operationalStatus
    })),
    daysHeader: days,
    grid
    });
  } catch (error) {
    next(error);
  }
});

export default router;
