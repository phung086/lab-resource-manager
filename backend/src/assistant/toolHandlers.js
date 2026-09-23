import { prisma } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { assertBookingAccess } from "../middleware/labScope.js";
import {
  checkLabPolicyCompliance,
  buildAvailabilityResult,
} from "../services/availabilityService.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import { serializeTelemetry } from "../services/telemetryService.js";

const str = { type: "string", minLength: 1, maxLength: 120 };
const id = { type: "string", minLength: 1, maxLength: 100 };
const date = { type: "string", format: "date-time", maxLength: 40 };
const limit = { type: "integer", minimum: 1, maximum: 20 };
const categories = [
  "ROOM",
  "EQUIPMENT",
  "MACHINE",
  "EXPERIMENT_KIT",
  "MATERIAL",
];
const statuses = [
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "CALIBRATION",
  "BROKEN",
  "RETIRED",
  "OFFLINE",
];
const bookingStatuses = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_OUT",
  "RETURNED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];
const search = {
  query: str,
  category: { type: "string", enum: categories },
  subtype: {
    type: "string",
    enum: [
      "ROOM",
      "GPU_SERVER",
      "RASPBERRY_PI",
      "UAV",
      "CAMERA",
      "KIT",
      "MATERIAL",
      "OTHER",
    ],
  },
  operationalStatus: { type: "string", enum: statuses },
  limit,
};
const resourceSelect = {
  id: true,
  code: true,
  name: true,
  category: true,
  subtype: true,
  operationalStatus: true,
  bookingState: true,
  location: true,
  laboratoryId: true,
  requiresApproval: true,
  specs: true,
};
const bookingSelect = {
  id: true,
  title: true,
  status: true,
  startAt: true,
  endAt: true,
  resource: { select: { id: true, code: true, name: true } },
};
const tool = (name, description, properties, required, handler) => ({
  name,
  description,
  inputSchema: {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  },
  readOnly: true,
  handler,
});
export const assistantTools = [
  tool(
    "get_operational_summary",
    "Counts from persisted data within actor scope.",
    {},
    [],
    summary,
  ),
  tool(
    "search_resources",
    "Search canonical resource category, subtype and operational state.",
    search,
    [],
    searchResources,
  ),
  tool(
    "get_resource_detail",
    "Read resource and its persisted laboratory booking policy.",
    { resourceId: id },
    ["resourceId"],
    resourceDetail,
  ),
  tool(
    "find_available_slots",
    "Find candidate slots checked against real lab policy, bookings and maintenance. UTC+7; final booking is validated again.",
    {
      resourceId: id,
      query: str,
      from: date,
      to: date,
      durationMinutes: { type: "integer", minimum: 15, maximum: 480 },
      limit,
    },
    [],
    findSlots,
  ),
  tool(
    "check_booking_conflicts",
    "Check half-open interval without revealing foreign requester or booking identity.",
    { resourceId: id, startAt: date, endAt: date },
    ["resourceId", "startAt", "endAt"],
    conflicts,
  ),
  tool(
    "get_my_bookings",
    "Read only the authenticated actor bookings.",
    { status: { type: "string", enum: bookingStatuses }, limit },
    [],
    myBookings,
  ),
  tool(
    "get_booking_detail",
    "Read authorized booking detail; students/lecturers only their own.",
    { bookingId: id },
    ["bookingId"],
    bookingDetail,
  ),
  tool(
    "list_notifications",
    "Read own persisted notifications.",
    { unreadOnly: { type: "boolean" }, limit },
    [],
    notifications,
  ),
  tool(
    "search_knowledge_base",
    "Search persisted active document chunks; only stored source metadata, no generated citations.",
    { query: str, resourceId: id, limit },
    ["query"],
    knowledge,
  ),
  tool(
    "recommend_equipment",
    "Filter real resources by text and documented VRAM. Missing specifications are not inferred.",
    {
      query: str,
      minVramGb: { type: "number", minimum: 0, maximum: 10000 },
      limit,
    },
    [],
    recommend,
  ),
  tool(
    "check_user_eligibility",
    "Read booking state, lab policy and persisted training requirements for current actor.",
    { resourceId: id },
    ["resourceId"],
    eligibility,
  ),
  tool(
    "get_incidents",
    "Read incidents within lab scope or personally reported incidents.",
    { limit },
    [],
    incidents,
  ),
  tool(
    "get_monitoring_summary",
    "Staff/admin telemetry within assigned scope; missing samples remain NO_DATA.",
    { limit },
    [],
    monitoring,
  ),
];
export async function resourceScope(actor) {
  return actor.role === "LAB_STAFF"
    ? { laboratory: { staffAssignments: { some: { userId: actor.id } } } }
    : {};
}
async function scopedResource(actor, resourceId) {
  const row = await prisma.resource.findFirst({
    where: { id: resourceId, ...(await resourceScope(actor)) },
    include: {
      laboratory: { include: { labPolicy: true } },
      trainingRequirements: {
        include: { course: { select: { id: true, name: true, code: true } } },
      },
    },
  });
  if (!row)
    throw new HttpError(
      404,
      "Không tìm thấy tài nguyên trong phạm vi được phép.",
      undefined,
      "NOT_FOUND",
    );
  return row;
}
const projectResource = (r) =>
  Object.fromEntries(Object.keys(resourceSelect).map((k) => [k, r[k]]));
async function searchResources(input, actor) {
  const where = {
    ...(await resourceScope(actor)),
    ...(input.category ? { category: input.category } : {}),
    ...(input.operationalStatus
      ? { operationalStatus: input.operationalStatus }
      : {}),
    ...(input.subtype ? { subtype: input.subtype } : {}),
    ...(input.query
      ? {
          OR: ["name", "code", "description"].map((k) => ({
            [k]: { contains: input.query, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const rows = await prisma.resource.findMany({
    where,
    select: resourceSelect,
    orderBy: { code: "asc" },
    take: input.limit || 10,
  });
  return {
    resources: rows,
    returned: rows.length,
    limit: input.limit || 10,
    source: "database",
  };
}
async function resourceDetail({ resourceId }, actor) {
  const r = await scopedResource(actor, resourceId);
  return {
    resource: projectResource(r),
    policy: r.laboratory?.labPolicy || null,
    source: "database",
  };
}
async function myBookings(input, actor) {
  return {
    bookings: await prisma.booking.findMany({
      where: {
        requestedById: actor.id,
        ...(input.status ? { status: input.status } : {}),
      },
      select: bookingSelect,
      orderBy: { startAt: "desc" },
      take: input.limit || 10,
    }),
    source: "database",
  };
}
async function bookingDetail({ bookingId }, actor) {
  await assertBookingAccess(actor, bookingId);
  return {
    booking: await prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingSelect,
    }),
    source: "database",
  };
}
async function notifications(input, actor) {
  return {
    notifications: await prisma.notification.findMany({
      where: {
        userId: actor.id,
        ...(input.unreadOnly ? { readAt: null } : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: input.limit || 10,
    }),
    source: "database",
  };
}
async function incidents(input, actor) {
  const where =
    actor.role === "ADMIN"
      ? {}
      : actor.role === "LAB_STAFF"
        ? { resource: await resourceScope(actor) }
        : { reportedById: actor.id };
  return {
    incidents: await prisma.incident.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        createdAt: true,
        resource: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: input.limit || 10,
    }),
    source: "database",
  };
}
async function summary(_input, actor) {
  const scope = await resourceScope(actor);
  const bookingWhere =
    actor.role === "ADMIN"
      ? {}
      : actor.role === "LAB_STAFF"
        ? { resource: scope }
        : { requestedById: actor.id };
  const [resources, bookings, unreadNotifications] = await Promise.all([
    prisma.resource.count({ where: scope }),
    prisma.booking.groupBy({
      by: ["status"],
      where: bookingWhere,
      _count: { _all: true },
    }),
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);
  return {
    resources,
    bookings: bookings.map((r) => ({ status: r.status, count: r._count._all })),
    unreadNotifications,
    scope:
      actor.role === "ADMIN"
        ? "global"
        : actor.role === "LAB_STAFF"
          ? "assigned_labs"
          : "own_bookings_public_catalog",
    source: "database",
  };
}
function interval(start, end) {
  const a = new Date(start),
    b = new Date(end);
  if (
    !Number.isFinite(a.getTime()) ||
    !Number.isFinite(b.getTime()) ||
    a >= b ||
    b - a > 30 * 86400000
  )
    throw new HttpError(
      400,
      "Khoảng thời gian không hợp lệ hoặc vượt 30 ngày.",
      undefined,
      "VALIDATION_ERROR",
    );
  return [a, b];
}
async function blocks(resourceId, startAt, endAt) {
  const [bookings, maintenanceWindows] = await Promise.all([
    prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { resourceId: true, startAt: true, endAt: true },
    }),
    prisma.maintenanceWindow.findMany({
      where: {
        resourceId,
        status: { in: ["scheduled", "in_progress"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        resourceId: true,
        startAt: true,
        endAt: true,
        status: true,
        kind: true,
      },
    }),
  ]);
  return { bookings, maintenanceWindows };
}
function policyResult(resource, startAt, endAt, now = new Date()) {
  if (resource.bookingState !== "bookable") return "RESOURCE_NOT_BOOKABLE";
  if (resource.laboratory && !resource.laboratory.isActive)
    return "LAB_INACTIVE";
  if (startAt < now) return "PAST_TIME";
  try {
    checkLabPolicyCompliance({
      policy: resource.laboratory?.labPolicy,
      startAt,
      endAt,
      now,
    });
    return null;
  } catch (error) {
    if (error instanceof HttpError) return error.message;
    throw error;
  }
}
async function conflicts(input, actor) {
  const resource = await scopedResource(actor, input.resourceId);
  const [startAt, endAt] = interval(input.startAt, input.endAt);
  const data = await blocks(resource.id, startAt, endAt);
  const result = buildAvailabilityResult({ resource, startAt, endAt, ...data });
  const policy = policyResult(resource, startAt, endAt);
  return {
    resourceId: resource.id,
    startAt,
    endAt,
    available: result.available && !policy,
    policyReason: policy,
    conflicts: result.conflicts.map((c) => ({
      type: c.type,
      startAt: c.startAt,
      endAt: c.endAt,
      severity: c.severity,
    })),
    source: "database",
    finalValidationRequired: true,
  };
}
async function eligibility({ resourceId }, actor) {
  const r = await scopedResource(actor, resourceId);
  const required = r.trainingRequirements.filter((t) => t.isMandatory);
  const certificates = await prisma.userCertification.findMany({
    where: {
      userId: actor.id,
      courseId: { in: required.map((t) => t.courseId) },
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { courseId: true },
  });
  const missing = required
    .filter((t) => !certificates.some((c) => c.courseId === t.courseId))
    .map((t) => ({ code: t.course.code, name: t.course.name }));
  return {
    resourceId,
    bookable:
      r.bookingState === "bookable" &&
      ["AVAILABLE", "IN_USE"].includes(r.operationalStatus) &&
      r.laboratory?.isActive !== false,
    missingTraining: missing,
    requiresApproval: Boolean(
      r.requiresApproval || r.laboratory?.labPolicy?.requiresApproval,
    ),
    policy: r.laboratory?.labPolicy || null,
    finalValidationRequired: true,
    source: "database",
  };
}
async function findSlots(input, actor) {
  const now = new Date();
  const [from, to] = interval(
    input.from || now.toISOString(),
    input.to || new Date(now.getTime() + 7 * 86400000).toISOString(),
  );
  const duration = input.durationMinutes || 60;
  const resources = input.resourceId
    ? [await scopedResource(actor, input.resourceId)]
    : await prisma.resource.findMany({
        where: {
          ...(await resourceScope(actor)),
          ...(input.query
            ? {
                OR: ["code", "name", "description"].map((k) => ({
                  [k]: { contains: input.query, mode: "insensitive" },
                })),
              }
            : {}),
        },
        include: { laboratory: { include: { labPolicy: true } } },
        orderBy: { code: "asc" },
        take: 20,
      });
  const slots = [];
  for (const resource of resources) {
    const data = await blocks(resource.id, from, to);
    // Fixed 15-minute grid in absolute time (UTC+7 has no DST); canonical policy evaluates VN wall time.
    for (
      let t =
        Math.ceil(Math.max(from.getTime(), now.getTime()) / 900000) * 900000;
      t + duration * 60000 <= to.getTime();
      t += 900000
    ) {
      const startAt = new Date(t),
        endAt = new Date(t + duration * 60000);
      if (policyResult(resource, startAt, endAt, now)) continue;
      const overlap = {
        bookings: data.bookings.filter(
          (b) => b.startAt < endAt && b.endAt > startAt,
        ),
        maintenanceWindows: data.maintenanceWindows.filter(
          (b) => b.startAt < endAt && b.endAt > startAt,
        ),
      };
      if (
        buildAvailabilityResult({ resource, startAt, endAt, ...overlap })
          .available
      ) {
        slots.push({
          resourceId: resource.id,
          resourceCode: resource.code,
          resourceName: resource.name,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          requiresApproval: Boolean(
            resource.requiresApproval ||
              resource.laboratory?.labPolicy?.requiresApproval,
          ),
        });
        t += duration * 60000 - 900000;
      }
      if (slots.length >= (input.limit || 5)) break;
    }
    if (slots.length >= (input.limit || 5)) break;
  }
  return {
    slots,
    resourcesChecked: resources.length,
    source: "database",
    timeZone: "Asia/Ho_Chi_Minh",
    finalValidationRequired: true,
  };
}
async function recommend(input, actor) {
  const data = await searchResources({ query: input.query, limit: 20 }, actor);
  const resources = data.resources
    .filter(
      (r) =>
        input.minVramGb === undefined ||
        (typeof r.specs?.vramGb === "number" &&
          r.specs.vramGb >= input.minVramGb),
    )
    .slice(0, input.limit || 5);
  return {
    resources,
    source: "database",
    recommendation: true,
    reason:
      input.minVramGb !== undefined
        ? "Chỉ khớp thông số vramGb đã lưu; thông số thiếu không được suy đoán."
        : "Khớp nội dung danh mục, cần kiểm tra điều kiện và lịch trước khi đặt.",
  };
}
async function knowledge(input, actor) {
  if (input.resourceId) await scopedResource(actor, input.resourceId);
  const scoped =
    actor.role === "LAB_STAFF"
      ? {
          OR: [
            {
              resource: {
                laboratory: {
                  staffAssignments: { some: { userId: actor.id } },
                },
              },
            },
            {
              laboratory: { staffAssignments: { some: { userId: actor.id } } },
            },
          ],
        }
      : {};
  const rows = await prisma.knowledgeChunk.findMany({
    where: {
      document: {
        isActive: true,
        ...scoped,
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      },
      content: { contains: input.query, mode: "insensitive" },
    },
    select: {
      id: true,
      content: true,
      document: {
        select: {
          id: true,
          title: true,
          sourceType: true,
          version: true,
          fileName: true,
        },
      },
    },
    take: input.limit || 5,
    orderBy: { id: "asc" },
  });
  return {
    sources: rows.map((r) => ({
      chunkId: r.id,
      excerpt: r.content.slice(0, 1500),
      document: r.document,
    })),
    source: "database",
  };
}
async function monitoring(input, actor) {
  if (!["ADMIN", "LAB_STAFF"].includes(actor.role))
    throw new HttpError(
      403,
      "Chỉ cán bộ được xem giám sát vận hành.",
      undefined,
      "FORBIDDEN",
    );
  const rows = await prisma.resource.findMany({
    where: await resourceScope(actor),
    include: {
      monitoringThreshold: true,
      laboratory: { include: { monitoringThreshold: true } },
      telemetrySamples: {
        include: { telemetrySource: true },
        orderBy: { sampledAt: "desc" },
        take: 1,
      },
    },
    take: input.limit || 10,
    orderBy: { code: "asc" },
  });
  return {
    resources: rows.map((r) => {
      const t = serializeTelemetry(r, r.telemetrySamples[0]);
      return {
        resourceId: r.id,
        code: r.code,
        operationalStatus: r.operationalStatus,
        latestTelemetry: t.latestTelemetry,
        monitoring: t.monitoring,
      };
    }),
    source: "database",
  };
}
export async function runAssistantTool(name, input, context) {
  const t = assistantTools.find((t) => t.name === name);
  if (!t)
    throw new HttpError(
      400,
      "Công cụ không được hỗ trợ.",
      undefined,
      "TOOL_NOT_ALLOWED",
    );
  return t.handler(input, context.user);
}
