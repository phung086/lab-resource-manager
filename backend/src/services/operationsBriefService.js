import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { dashboardResourceScope } from "./dashboardService.js";
import { OPEN_INCIDENT_STATUSES } from "./incidentService.js";

const previewSize = 3;
const resourceSummary = { select: { id: true, name: true, code: true } };

export async function buildOperationsBrief(client, user, { laboratoryId, now = new Date() } = {}) {
  if (![ADMIN, LAB_STAFF].includes(user.role)) {
    throw new HttpError(403, "Insufficient permission", undefined, "FORBIDDEN");
  }
  const nextDay = new Date(now.getTime() + 86_400_000);
  const confirmedNext = { status: "CONFIRMED", startAt: { gte: now, lt: nextDay } };
  const resourceScope = {
    ...dashboardResourceScope(user),
    ...(laboratoryId ? { laboratoryId } : {})
  };
  const bookingPreview = {
    orderBy: [{ endAt: "asc" }, { id: "asc" }],
    select: { id: true, endAt: true, resource: {
      select: { ...resourceSummary.select, bookings: {
        where: confirmedNext, orderBy: [{ startAt: "asc" }, { id: "asc" }], take: 1,
        select: { id: true, startAt: true }
      } }
    } }
  };

  return client.$transaction(async tx => {
    const laboratories = await tx.laboratory.findMany({
      where: user.role === ADMIN ? {} : { staffAssignments: { some: { userId: user.id } } },
      orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true }
    });
    if (laboratoryId && !laboratories.some(lab => lab.id === laboratoryId)) {
      throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
    }
    const simulated = await tx.resource.findMany({
      where: { ...resourceScope, specs: { path: ["monitoringSimulation"], equals: true } }, select: { id: true }
    });
    const resource = { ...resourceScope, id: { notIn: simulated.map(row => row.id) } };
    const overdue = { status: "CHECKED_OUT", endAt: { lt: now }, resource };
    const atRisk = { ...overdue, resource: { ...resource, bookings: { some: confirmedNext } } };
    const withoutNext = { ...overdue, resource: { ...resource, bookings: { none: confirmedNext } } };
    const incidents = {
      status: { in: OPEN_INCIDENT_STATUSES }, severity: { in: ["high", "critical"] },
      origin: { not: "SIMULATED" }, resource
    };
    const maintenance = {
      status: { in: ["scheduled", "in_progress"] }, startAt: { lt: nextDay }, endAt: { gt: now }, resource
    };
    const [overdueTotal, atRiskTotal, urgentLoans, incidentTotal, incidentRows, maintenanceTotal, maintenanceRows] = await Promise.all([
      tx.booking.count({ where: overdue }),
      tx.booking.count({ where: atRisk }),
      tx.booking.findMany({ ...bookingPreview, where: atRisk, take: previewSize }),
      tx.incident.count({ where: incidents }),
      tx.incident.findMany({
        where: incidents, orderBy: [{ severity: "desc" }, { detectedAt: "desc" }, { id: "asc" }], take: previewSize,
        select: { id: true, severity: true, detectedAt: true, resource: resourceSummary }
      }),
      tx.maintenanceWindow.count({ where: maintenance }),
      tx.maintenanceWindow.findMany({
        where: maintenance, orderBy: [{ startAt: "asc" }, { id: "asc" }], take: previewSize,
        select: { id: true, title: true, kind: true, startAt: true, endAt: true, resource: resourceSummary }
      })
    ]);
    const remaining = previewSize - urgentLoans.length;
    const otherLoans = remaining && overdueTotal > urgentLoans.length
      ? await tx.booking.findMany({ ...bookingPreview, where: withoutNext, take: remaining })
      : [];
    const loanRows = [...urgentLoans, ...otherLoans].map(({ resource: { bookings, ...record }, ...loan }) => ({
      ...loan, resource: record, nextBooking: bookings[0] ?? null
    }));
    return {
      generatedAt: now, horizonHours: 24, laboratories,
      overdue: { total: overdueTotal, withNextBooking: atRiskTotal, items: loanRows },
      incidents: { total: incidentTotal, items: incidentRows },
      maintenance: { total: maintenanceTotal, items: maintenanceRows }
    };
  }, { isolationLevel: "RepeatableRead" });
}
