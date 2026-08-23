import { activeBookingStatuses } from "../utils/bookingOverlap.js";
import { HttpError } from "../middleware/errors.js";

export const maintenanceKinds = ["maintenance", "calibration"];
export const maintenanceStatuses = ["scheduled", "in_progress", "completed", "cancelled"];

export const BLOCKING_RESOURCE_STATUSES = ["maintenance", "offline"];
export const BLOCKING_MAINTENANCE_STATUSES = ["scheduled", "in_progress"];

export function maintenanceOverlapWhere({ resourceId, startAt, endAt, excludeMaintenanceId }) {
  return {
    resourceId,
    status: { in: BLOCKING_MAINTENANCE_STATUSES },
    ...(excludeMaintenanceId ? { id: { not: excludeMaintenanceId } } : {}),
    startAt: { lt: endAt },
    endAt: { gt: startAt }
  };
}

export async function getResourceAvailability(client, { resourceId, startAt, endAt, excludeBookingId, resource = null }) {
  const selectedResource = resource || await client.resource.findUnique({ where: { id: resourceId } });
  if (!selectedResource) {
    throw new HttpError(404, "Resource not found", undefined, "RESOURCE_NOT_FOUND");
  }

  const [bookings, maintenanceWindows] = await Promise.all([
    client.booking.findMany({
      where: {
        resourceId,
        status: { in: activeBookingStatuses() },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt }
      },
      orderBy: { startAt: "asc" }
    }),
    client.maintenanceWindow.findMany({
      where: maintenanceOverlapWhere({ resourceId, startAt, endAt }),
      orderBy: { startAt: "asc" }
    })
  ]);

  return buildAvailabilityResult({
    resource: selectedResource,
    startAt,
    endAt,
    bookings,
    maintenanceWindows
  });
}

export function assertResourceAvailable(availability) {
  if (availability.available) return;
  throw new HttpError(
    409,
    "Resource is not available in the requested period",
    {
      conflicts: availability.conflicts,
      unavailableIntervals: availability.unavailableIntervals
    },
    getAvailabilityErrorCode(availability.conflicts)
  );
}

export function buildAvailabilityResult({ resource, startAt, endAt, bookings = [], maintenanceWindows = [] }) {
  const conflicts = [
    buildResourceStatusConflict(resource, startAt, endAt),
    ...bookings.map((booking) => buildBookingConflict(booking)),
    ...maintenanceWindows
      .filter((window) => BLOCKING_MAINTENANCE_STATUSES.includes(window.status))
      .map((window) => buildMaintenanceConflict(window))
  ].filter(Boolean);

  const unavailableIntervals = buildBlockingIntervals({ resource, startAt, endAt, bookings, maintenanceWindows });

  return {
    resourceId: resource.id,
    window: {
      startAt: toIso(startAt),
      endAt: toIso(endAt)
    },
    available: !conflicts.some((conflict) => conflict.severity === "HARD"),
    conflicts,
    unavailableIntervals
  };
}

export function buildBlockingIntervals({ resource = null, startAt = null, endAt = null, bookings = [], maintenanceWindows = [] }) {
  const intervals = [
    ...(resource && BLOCKING_RESOURCE_STATUSES.includes(resource.status) && startAt && endAt
      ? [{
          type: resource.status === "maintenance" ? "MAINTENANCE_CONFLICT" : "ELIGIBILITY_CONFLICT",
          source: "resource_status",
          resourceId: resource.id,
          startAt: toIso(startAt),
          endAt: toIso(endAt),
          label: resource.status
        }]
      : []),
    ...bookings.map((booking) => ({
      type: "EQUIPMENT_CONFLICT",
      source: "booking",
      resourceId: booking.resourceId,
      bookingId: booking.id,
      startAt: toIso(booking.startAt),
      endAt: toIso(booking.endAt),
      label: booking.title
    })),
    ...maintenanceWindows
      .filter((window) => BLOCKING_MAINTENANCE_STATUSES.includes(window.status))
      .map((window) => ({
        type: window.kind === "calibration" ? "CALIBRATION_CONFLICT" : "MAINTENANCE_CONFLICT",
        source: "maintenance_window",
        resourceId: window.resourceId,
        maintenanceWindowId: window.id,
        startAt: toIso(window.startAt),
        endAt: toIso(window.endAt),
        label: window.title
      }))
  ];

  return intervals.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function buildAvailableSlotsForResource(resource, blockingIntervals, from, to, durationMinutes, options = {}) {
  if (BLOCKING_RESOURCE_STATUSES.includes(resource.status)) return [];

  const workDayStartHour = Number(options.workDayStartHour ?? 8);
  const workDayEndHour = Number(options.workDayEndHour ?? 18);
  const slots = [];
  const blocks = normalizeBlockingIntervals(blockingIntervals);

  for (const dayStart of eachDay(from, to)) {
    const open = new Date(dayStart);
    open.setHours(workDayStartHour, 0, 0, 0);
    const close = new Date(dayStart);
    close.setHours(workDayEndHour, 0, 0, 0);

    let cursor = maxDate(open, from);
    const dayEnd = minDate(close, to);
    if (cursor >= dayEnd) continue;

    const dayBlocks = blocks
      .filter((block) => block.startAt < dayEnd && block.endAt > cursor)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    for (const block of dayBlocks) {
      if (minutesBetween(cursor, block.startAt) >= durationMinutes) {
        slots.push(slot(resource, cursor, addMinutes(cursor, durationMinutes)));
      }
      cursor = maxDate(cursor, block.endAt);
      if (cursor >= dayEnd) break;
    }

    if (minutesBetween(cursor, dayEnd) >= durationMinutes) {
      slots.push(slot(resource, cursor, addMinutes(cursor, durationMinutes)));
    }
  }

  return slots;
}

export function buildBookingConflict(booking) {
  return {
    type: "EQUIPMENT_CONFLICT",
    severity: "HARD",
    resourceId: booking.resourceId,
    conflictingBookingId: booking.id,
    message: "Resource is already booked in the requested period",
    startAt: toIso(booking.startAt),
    endAt: toIso(booking.endAt),
    suggestedActions: ["MOVE_TIME", "USE_ALTERNATIVE_EQUIPMENT"]
  };
}

export function buildMaintenanceConflict(window) {
  const isCalibration = window.kind === "calibration";
  return {
    type: isCalibration ? "CALIBRATION_CONFLICT" : "MAINTENANCE_CONFLICT",
    severity: "HARD",
    resourceId: window.resourceId,
    maintenanceWindowId: window.id,
    message: isCalibration
      ? "Resource is scheduled for calibration in the requested period"
      : "Resource is scheduled for maintenance in the requested period",
    startAt: toIso(window.startAt),
    endAt: toIso(window.endAt),
    suggestedActions: ["MOVE_TIME", "USE_ALTERNATIVE_EQUIPMENT"]
  };
}

function buildResourceStatusConflict(resource, startAt, endAt) {
  if (!BLOCKING_RESOURCE_STATUSES.includes(resource.status)) return null;
  const isMaintenance = resource.status === "maintenance";
  return {
    type: isMaintenance ? "MAINTENANCE_CONFLICT" : "ELIGIBILITY_CONFLICT",
    severity: "HARD",
    resourceId: resource.id,
    message: isMaintenance
      ? "Resource is currently marked as under maintenance"
      : "Resource is currently offline and cannot be booked",
    startAt: toIso(startAt),
    endAt: toIso(endAt),
    suggestedActions: ["USE_ALTERNATIVE_EQUIPMENT"]
  };
}

function getAvailabilityErrorCode(conflicts) {
  if (conflicts.some((conflict) => conflict.type === "EQUIPMENT_CONFLICT")) return "BOOKING_CONFLICT";
  if (conflicts.some((conflict) => conflict.type === "CALIBRATION_CONFLICT")) return "CALIBRATION_CONFLICT";
  if (conflicts.some((conflict) => conflict.type === "MAINTENANCE_CONFLICT")) return "MAINTENANCE_CONFLICT";
  return "RESOURCE_UNAVAILABLE";
}

function normalizeBlockingIntervals(intervals) {
  return intervals
    .map((interval) => ({
      ...interval,
      startAt: new Date(interval.startAt),
      endAt: new Date(interval.endAt)
    }))
    .filter((interval) => !Number.isNaN(interval.startAt.getTime()) && !Number.isNaN(interval.endAt.getTime()) && interval.startAt < interval.endAt);
}

function slot(resource, startAt, endAt) {
  return {
    resourceId: resource.id,
    resourceCode: resource.code,
    resourceName: resource.name,
    resourceType: resource.type,
    location: resource.location,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  };
}

function eachDay(from, to) {
  const days = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesBetween(startAt, endAt) {
  return Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
}

function maxDate(a, b) {
  return a > b ? a : b;
}

function minDate(a, b) {
  return a < b ? a : b;
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
