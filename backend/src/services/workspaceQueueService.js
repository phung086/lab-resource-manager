import { z } from "zod";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { ALL_BOOKING_STATUSES, CHECKED_OUT, TERMINAL_STATUSES } from "../constants/bookingStatus.js";
import { incidentScopeWhere, OPEN_INCIDENT_STATUSES } from "./incidentService.js";

const pageFields = {
  page: z.coerce.number().int().min(1).max(1_000_000),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  resourceId: z.string().min(1).max(255).optional()
};
// Existing persisted identifiers include text IDs as well as newly generated UUIDs.
export const bookingListSchema = z.object({
  resourceId: pageFields.resourceId,
  status: z.preprocess(value => typeof value === "string" ? value.toUpperCase() : value, z.enum(ALL_BOOKING_STATUSES).optional())
});
export const bookingPageSchema = z.object({
  ...pageFields,
  status: z.enum(ALL_BOOKING_STATUSES).optional(),
  filter: z.enum(["ALL", "HISTORY", ...ALL_BOOKING_STATUSES]).default("ALL")
}).strict().refine(query => !query.status || query.filter === "ALL", { message: "Use either status or filter" });
export const incidentPageSchema = z.object({
  ...pageFields,
  status: z.enum(["reported", "triaged", "assigned", "investigating", "resolved", "verified", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  filter: z.enum(["ALL", "OPEN", "RESOLVED"]).default("ALL")
}).strict().refine(query => !query.status || query.filter === "ALL", { message: "Use either status or filter" });

function bookingScopeWhere(actor) {
  if (actor.role === ADMIN) return {};
  if (actor.role === LAB_STAFF) {
    // Resolve assignments inside every database query, including totals.
    return { resource: { laboratory: { staffAssignments: { some: { userId: actor.id } } } } };
  }
  return { requestedById: actor.id };
}

export async function listLegacyBookings(db, actor, query, include) {
  return db.booking.findMany({
    where: { ...bookingScopeWhere(actor), ...(query.resourceId ? { resourceId: query.resourceId } : {}), ...(query.status ? { status: query.status } : {}) },
    include, orderBy: [{ startAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 100
  });
}

function statusCounts(groups) {
  return Object.fromEntries(groups.map(group => [group.status, group._count._all]));
}
function sum(counts, statuses = Object.keys(counts)) {
  return statuses.reduce((total, status) => total + (counts[status] || 0), 0);
}
function pagination(query, total) {
  return { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}

export async function listBookingPage(db, actor, query, include) {
  const scope = { ...bookingScopeWhere(actor), ...(query.resourceId ? { resourceId: query.resourceId } : {}) };
  const filter = query.status || query.filter;
  const statuses = filter === "HISTORY" ? TERMINAL_STATUSES : filter === "ALL" ? ALL_BOOKING_STATUSES : [filter];
  const orderBy = filter === CHECKED_OUT
    ? [{ endAt: "asc" }, { createdAt: "asc" }, { id: "asc" }]
    : filter === "ALL" || filter === "HISTORY" || TERMINAL_STATUSES.includes(filter)
      ? [{ startAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
      : [{ startAt: "asc" }, { createdAt: "asc" }, { id: "asc" }];
  const asOf = new Date();
  return db.$transaction(async tx => {
    const counts = statusCounts(await tx.booking.groupBy({ by: ["status"], where: scope, _count: { _all: true } }));
    const overdue = await tx.booking.count({ where: { ...scope, status: CHECKED_OUT, endAt: { lt: asOf } } });
    const items = await tx.booking.findMany({
      where: { ...scope, status: { in: statuses } }, include, orderBy,
      take: query.pageSize, skip: (query.page - 1) * query.pageSize
    });
    return {
      items, pagination: pagination(query, sum(counts, statuses)),
      summary: { total: sum(counts), byStatus: counts, history: sum(counts, TERMINAL_STATUSES), overdue, asOf: asOf.toISOString() }
    };
  }, { isolationLevel: "RepeatableRead" });
}

export async function listIncidentPage(db, actor, query, include) {
  const scope = {
    ...incidentScopeWhere(actor),
    ...(query.resourceId ? { resourceId: query.resourceId } : {}),
    ...(query.severity ? { severity: query.severity } : {})
  };
  const status = query.status ? query.status : query.filter === "OPEN"
    ? { in: OPEN_INCIDENT_STATUSES } : query.filter === "RESOLVED" ? { notIn: OPEN_INCIDENT_STATUSES } : undefined;
  return db.$transaction(async tx => {
    const counts = statusCounts(await tx.incident.groupBy({ by: ["status"], where: scope, _count: { _all: true } }));
    const open = sum(counts, OPEN_INCIDENT_STATUSES), total = sum(counts);
    const filteredTotal = query.status ? counts[query.status] || 0 : query.filter === "OPEN" ? open : query.filter === "RESOLVED" ? total - open : total;
    const items = await tx.incident.findMany({
      where: { ...scope, ...(status ? { status } : {}) }, include,
      orderBy: [{ detectedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: query.pageSize, skip: (query.page - 1) * query.pageSize
    });
    return { items, pagination: pagination(query, filteredTotal), summary: { total, open, resolved: total - open, byStatus: counts } };
  }, { isolationLevel: "RepeatableRead" });
}
