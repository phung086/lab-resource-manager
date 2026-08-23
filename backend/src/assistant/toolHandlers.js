import { prisma } from "../db.js";
import {
  buildAvailableSlotsForResource,
  buildBlockingIntervals,
  getResourceAvailability,
  maintenanceOverlapWhere
} from "../services/availabilityService.js";
import { activeBookingStatuses } from "../utils/bookingOverlap.js";
import {
  normalizeResourceCode,
  normalizeSearchQuery,
  serializeBooking,
  serializeNotification,
  serializeResource
} from "../utils/dataContract.js";

import { searchKnowledgeBase, recommendEquipment } from "../services/ragService.js";
import { checkUserEligibility } from "../services/eligibilityService.js";
import { findAlternativeSlots } from "../services/alternativeService.js";

const STAFF_ROLES = ["admin", "lab_staff"];
const WORK_DAY_START_HOUR = 8;
const WORK_DAY_END_HOUR = 18;

export const assistantTools = [
  {
    name: "get_operational_summary",
    description: "Summarize resource inventory, pending bookings, unread notifications, and monitoring alerts.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    readOnly: true,
    handler: getOperationalSummary
  },
  {
    name: "search_resources",
    description: "Search lab resources by code, name, type, status, location, and latest telemetry.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        type: { type: "string", enum: ["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"] },
        status: { type: "string", enum: ["available", "reserved", "in_use", "maintenance", "offline"] },
        limit: { type: "number", minimum: 1, maximum: 30 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: searchResources
  },
  {
    name: "find_available_slots",
    description: "Find available booking slots for one resource or a resource type within an operating window.",
    inputSchema: {
      type: "object",
      properties: {
        resourceCode: { type: "string" },
        resourceType: { type: "string", enum: ["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"] },
        from: { type: "string", description: "ISO datetime. Defaults to now." },
        to: { type: "string", description: "ISO datetime. Defaults to 7 days from now." },
        durationMinutes: { type: "number", minimum: 15, maximum: 720 },
        limit: { type: "number", minimum: 1, maximum: 20 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: findAvailableSlots
  },
  {
    name: "check_booking_conflicts",
    description: "Check whether a specific requested time range conflicts with active bookings.",
    inputSchema: {
      type: "object",
      required: ["resourceCode", "startAt", "endAt"],
      properties: {
        resourceCode: { type: "string" },
        startAt: { type: "string", description: "ISO datetime" },
        endAt: { type: "string", description: "ISO datetime" }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: checkBookingConflicts
  },
  {
    name: "search_bookings",
    description: "Search usage bookings by text, status, date range, and ownership.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: ["pending", "approved", "rejected", "cancelled", "checked_out", "completed"] },
        from: { type: "string", description: "ISO datetime" },
        to: { type: "string", description: "ISO datetime" },
        mine: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: 50 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: searchBookings
  },
  {
    name: "list_notifications",
    description: "List in-app notifications for the authenticated user, optionally filtering by read status.",
    inputSchema: {
      type: "object",
      properties: {
        unreadOnly: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: 50 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: searchNotifications
  },
  {
    name: "search_knowledge_base",
    description: "Search equipment manuals, SOPs, datasheets, and lab safety regulations for grounded answers with citations.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Natural language query or question about equipment specs/manuals" },
        resourceId: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 10 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: searchKnowledgeBaseHandler
  },
  {
    name: "recommend_equipment",
    description: "Recommend suitable lab equipment based on research intent, specs (RAM/VRAM), user eligibility, and availability.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", description: "Task description, e.g. Deep Learning, UAV Mapping" },
        minVramGb: { type: "number" },
        startAt: { type: "string", description: "ISO datetime" },
        endAt: { type: "string", description: "ISO datetime" }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: recommendEquipmentHandler
  },
  {
    name: "check_user_eligibility",
    description: "Check if the current user has the required certifications and qualifications to book a specific resource.",
    inputSchema: {
      type: "object",
      required: ["resourceId"],
      properties: {
        resourceId: { type: "string" }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: checkUserEligibilityHandler
  },
  {
    name: "get_incidents",
    description: "List recent equipment incidents and fault reports.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        severity: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 20 }
      },
      additionalProperties: false
    },
    readOnly: true,
    handler: getIncidentsHandler
  }
];

export function getAssistantTool(name) {
  return assistantTools.find((tool) => tool.name === name);
}

export async function runAssistantTool(name, input, context) {
  const tool = getAssistantTool(name);
  if (!tool) throw new Error(`Unknown assistant tool: ${name}`);
  return tool.handler(normalizeInput(input), context);
}

async function getOperationalSummary(_input, context) {
  const now = new Date();
  const nextWeek = addDays(now, 7);
  const [
    resources,
    bookingCounts,
    upcomingBookings,
    pendingBookings,
    unreadNotifications
  ] = await Promise.all([
    prisma.resource.findMany({
      include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 1 } },
      orderBy: [{ type: "asc" }, { code: "asc" }]
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.booking.findMany({
      where: {
        status: { in: activeBookingStatuses() },
        startAt: { gte: now, lte: nextWeek },
        ...bookingVisibilityWhere(context.user)
      },
      include: bookingInclude(),
      orderBy: { startAt: "asc" },
      take: 8
    }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.notification.count({ where: { userId: context.user.id, readAt: null } })
  ]);

  const alerts = resources
    .map((resource) => summarizeResource(resource, resource.telemetrySamples[0] || null))
    .filter((resource) => resource.operational.attention);

  return {
    generatedAt: now.toISOString(),
    totals: {
      resources: resources.length,
      pendingBookings,
      unreadNotifications,
      alerts: alerts.length
    },
    bookingsByStatus: Object.fromEntries(bookingCounts.map((item) => [item.status, item._count.id])),
    resourcesByType: countBy(resources, "type"),
    alerts,
    upcomingBookings: upcomingBookings.map(summarizeBooking)
  };
}

async function searchResources(input) {
  const limit = clampNumber(input.limit, 1, 30, 12);
  const query = normalizeSearchQuery(input.query);
  const resources = await prisma.resource.findMany({
    where: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
              { ownerTeam: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 1 } },
    orderBy: [{ status: "asc" }, { code: "asc" }],
    take: limit
  });

  return {
    count: resources.length,
    resources: resources.map((resource) => summarizeResource(resource, resource.telemetrySamples[0] || null))
  };
}

async function findAvailableSlots(input) {
  const now = new Date();
  const from = normalizeDate(input.from, now);
  const to = normalizeDate(input.to, addDays(from, 7));
  const durationMinutes = clampNumber(input.durationMinutes, 15, 720, 120);
  const limit = clampNumber(input.limit, 1, 20, 8);
  const resources = await findCandidateResources(input);

  const slots = [];
  for (const resource of resources) {
    const [activeBookings, maintenanceWindows] = await Promise.all([
      prisma.booking.findMany({
        where: {
          resourceId: resource.id,
          status: { in: activeBookingStatuses() },
          startAt: { lt: to },
          endAt: { gt: from }
        },
        orderBy: { startAt: "asc" }
      }),
      prisma.maintenanceWindow.findMany({
        where: maintenanceOverlapWhere({ resourceId: resource.id, startAt: from, endAt: to }),
        orderBy: { startAt: "asc" }
      })
    ]);

    const blockingIntervals = buildBlockingIntervals({ bookings: activeBookings, maintenanceWindows });
    for (const slot of buildAvailableSlotsForResource(resource, blockingIntervals, from, to, durationMinutes, {
      workDayStartHour: WORK_DAY_START_HOUR,
      workDayEndHour: WORK_DAY_END_HOUR
    })) {
      slots.push(slot);
      if (slots.length >= limit) break;
    }
    if (slots.length >= limit) break;
  }

  return {
    window: { from: from.toISOString(), to: to.toISOString(), durationMinutes },
    resourceFilter: { resourceCode: input.resourceCode || null, resourceType: input.resourceType || null },
    count: slots.length,
    slots
  };
}

async function checkBookingConflicts(input) {
  const startAt = normalizeDate(input.startAt);
  const endAt = normalizeDate(input.endAt);
  const resourceCode = input.resourceCode ? normalizeResourceCode(input.resourceCode) : "";
  if (!resourceCode || !startAt || !endAt || startAt >= endAt) {
    return { valid: false, available: false, reason: "invalid_time_or_resource" };
  }

  const resource = await prisma.resource.findUnique({
    where: { code: resourceCode },
    include: { telemetrySamples: { orderBy: { sampledAt: "desc" }, take: 1 } }
  });
  if (!resource) return { valid: false, available: false, reason: "resource_not_found" };

  const availability = await getResourceAvailability(prisma, {
    resourceId: resource.id,
    startAt,
    endAt,
    resource
  });
  const alternativeSlots = availability.available
    ? []
    : (await findAvailableSlots({
        resourceCode: resource.code,
        from: startAt.toISOString(),
        to: addDays(startAt, 7).toISOString(),
        durationMinutes: Math.max(15, Math.round((endAt.getTime() - startAt.getTime()) / 60000)),
        limit: 3
      })).slots;

  return {
    valid: true,
    available: availability.available,
    resource: summarizeResource(resource, resource.telemetrySamples[0] || null),
    requestedWindow: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
    conflicts: availability.conflicts,
    unavailableIntervals: availability.unavailableIntervals,
    alternativeSlots
  };
}

async function searchBookings(input, context) {
  const query = normalizeSearchQuery(input.query);
  const limit = clampNumber(input.limit, 1, 50, 20);
  const from = normalizeDate(input.from, null);
  const to = normalizeDate(input.to, null);
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.mine ? { requestedById: context.user.id } : bookingVisibilityWhere(context.user)),
    ...(from || to
      ? {
          startAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { purpose: { contains: query, mode: "insensitive" } },
            { resource: { is: { code: { contains: query, mode: "insensitive" } } } },
            { resource: { is: { name: { contains: query, mode: "insensitive" } } } }
          ]
        }
      : {})
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude(),
    orderBy: { startAt: "asc" },
    take: limit
  });

  return {
    count: bookings.length,
    bookings: bookings.map((booking) => summarizeBooking(booking, STAFF_ROLES.includes(context.user.role)))
  };
}

async function searchNotifications(input, context) {
  const query = normalizeSearchQuery(input.query);
  const limit = clampNumber(input.limit, 1, 50, 12);
  const notifications = await prisma.notification.findMany({
    where: {
      userId: context.user.id,
      ...(input.unreadOnly ? { readAt: null } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { message: { contains: query, mode: "insensitive" } },
              { titleKey: { contains: query, mode: "insensitive" } },
              { messageKey: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return {
    count: notifications.length,
    unread: notifications.filter((item) => !item.readAt).length,
    notifications: notifications.map((item) => serializeNotification(item))
  };
}

async function searchKnowledgeBaseHandler(rawInput) {
  const input = normalizeInput(rawInput);
  if (!input.query) return { error: "Query is required" };

  const results = await searchKnowledgeBase({
    query: input.query,
    resourceId: input.resourceId,
    limit: clampNumber(input.limit, 1, 10, 5)
  });

  return {
    query: input.query,
    count: results.length,
    results
  };
}

async function recommendEquipmentHandler(rawInput, context) {
  const input = normalizeInput(rawInput);
  const recommendations = await recommendEquipment({
    user: context.user,
    intent: input.intent,
    minVramGb: input.minVramGb,
    startAt: input.startAt,
    endAt: input.endAt
  });

  return {
    count: recommendations.length,
    recommendations
  };
}

async function checkUserEligibilityHandler(rawInput, context) {
  const input = normalizeInput(rawInput);
  if (!input.resourceId) return { error: "resourceId is required" };

  const eligibility = await checkUserEligibility(context.user.id, input.resourceId);
  const resource = await prisma.resource.findUnique({ where: { id: input.resourceId } });

  return {
    resourceId: input.resourceId,
    resourceName: resource?.name,
    eligible: eligibility.eligible,
    conflicts: eligibility.conflicts,
    warnings: eligibility.warnings
  };
}

async function getIncidentsHandler(rawInput, context) {
  const input = normalizeInput(rawInput);
  const limit = clampNumber(input.limit, 1, 20, 10);
  const isStaff = STAFF_ROLES.includes(context.user.role);

  const where = {
    ...(isStaff ? {} : { reportedById: context.user.id }),
    ...(input.status ? { status: input.status } : {}),
    ...(input.severity ? { severity: input.severity } : {})
  };

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      resource: { select: { code: true, name: true } },
      reportedBy: { select: { fullName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return {
    count: incidents.length,
    incidents: incidents.map(i => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      equipment: i.resource?.name,
      reportedBy: i.reportedBy?.fullName,
      createdAt: i.createdAt
    }))
  };
}

async function findCandidateResources(input) {
  const resourceCode = input.resourceCode ? normalizeResourceCode(input.resourceCode) : "";
  const where = {
    ...(resourceCode ? { code: resourceCode } : {}),
    ...(input.resourceType ? { type: input.resourceType } : {}),
    status: { notIn: ["maintenance", "offline"] }
  };
  return prisma.resource.findMany({
    where,
    orderBy: [{ type: "asc" }, { code: "asc" }],
    take: resourceCode ? 1 : 20
  });
}

function summarizeResource(resource, latestTelemetry = null) {
  return serializeResource(resource, latestTelemetry);
}

function summarizeBooking(booking, includeRequester = true) {
  return serializeBooking(booking, { includeRequester });
}

function bookingInclude() {
  return {
    resource: true,
    requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
    approvedBy: { select: { id: true, fullName: true, email: true, role: true } }
  };
}

function bookingVisibilityWhere(user) {
  return STAFF_ROLES.includes(user.role) ? {} : { requestedById: user.id };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function normalizeInput(input) {
  return input && typeof input === "object" ? input : {};
}

function normalizeDate(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
