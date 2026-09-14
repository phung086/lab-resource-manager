import express from "express";
import { prisma } from "../db.js";
import { mockStore } from "../services/store.js";

const router = express.Router();

/**
 * GET /slots?start_date=...&end_date=...&resource_id=...
 * Returns weekly time slots (7 Days x 13 Hours, 08:00 to 20:00) with occupancy states
 */
router.get("/slots", async (req, res) => {
  const { resource_id } = req.query;
  const currentUserId = req.user?.id || null;

  let resources = mockStore.resources;
  let existingBookings = mockStore.bookings;

  try {
    const dbResources = await prisma.resource.findMany({
      where: resource_id ? { id: String(resource_id) } : {},
      orderBy: { hourlyRateVnd: "desc" }
    });
    if (dbResources && dbResources.length > 0) {
      resources = dbResources;
    }
  } catch (_e) {}

  const activeResourceId = resource_id || resources[0]?.id || "NODE-DGX-01";
  const selectedResource = resources.find((r) => r.id === activeResourceId) || resources[0];

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
      fullDate: dateObj.toISOString().slice(0, 10),
      isToday: dateObj.toDateString() === now.toDateString()
    };
  });

  try {
    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 7);

    const dbBookings = await prisma.booking.findMany({
      where: {
        resourceId: activeResourceId,
        status: { notIn: ["CANCELLED", "cancelled"] },
        startTime: { gte: weekStart, lt: weekEnd }
      },
      include: { user: true }
    });
    if (dbBookings && dbBookings.length > 0) {
      existingBookings = dbBookings;
    }
  } catch (_e) {}

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const grid = hours.map((hour) => {
    const timeLabel = `${String(hour).padStart(2, "0")}:00`;

    const daySlots = days.map((day) => {
      const slotStart = new Date(`${day.fullDate}T${String(hour).padStart(2, "0")}:00:00`);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      if (String(selectedResource?.status).toUpperCase() === "MAINTENANCE") {
        return {
          status: "maintenance",
          label: "BẢO TRÌ ĐỊNH KỲ",
          details: "Đang bảo dưỡng kỹ thuật"
        };
      }

      // Check booking match
      const match = existingBookings.find((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (match) {
        const isMine = currentUserId && match.userId === currentUserId;
        return {
          status: isMine ? "mine" : "booked",
          bookingId: match.id,
          label: isMine ? "CA CỦA BẠN" : "ĐÃ ĐẶT",
          title: match.title,
          booker: match.user?.fullName || "ThS. Hoàng Long",
          resourceId: activeResourceId
        };
      }

      return {
        status: "available",
        label: "Trống",
        action: "+ Đặt ngay",
        resourceId: activeResourceId,
        hourlyRate: selectedResource?.hourlyRateVnd || 180000
      };
    });

    return {
      time: timeLabel,
      hour,
      days: daySlots
    };
  });

  return res.json({
    selectedResource: {
      id: selectedResource?.id,
      name: selectedResource?.name,
      hourlyRateVnd: selectedResource?.hourlyRateVnd,
      status: selectedResource?.status
    },
    availableResources: resources.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      hourlyRateVnd: r.hourlyRateVnd
    })),
    daysHeader: days,
    grid
  });
});

export default router;
