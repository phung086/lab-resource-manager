import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { serializeCamera } from "./cameraService.js";
import { serializeMonitoringAlert } from "./monitoringAlertService.js";
import { serializeTelemetry } from "./telemetryService.js";

export function dashboardResourceScope(user) {
  if (user.role === ADMIN) return {};
  if (user.role === LAB_STAFF) {
    return {
      laboratory: {
        staffAssignments: { some: { userId: user.id } }
      }
    };
  }
  return { id: { in: [] } };
}

function overlapMinutes(startAt, endAt, windowStart, windowEnd) {
  const start = Math.max(new Date(startAt).getTime(), windowStart.getTime());
  const end = Math.min(new Date(endAt).getTime(), windowEnd.getTime());
  return Math.max(0, (end - start) / 60_000);
}

export async function buildDashboard(client, user, now = new Date()) {
  const resourceWhere = dashboardResourceScope(user);
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const windowEnd = now;

  const [resources, upcomingBookings, periodBookings, incidents, unreadNotifications, cameras] = await Promise.all([
    client.resource.findMany({
      where: resourceWhere,
      include: {
        monitoringThreshold: true,
        laboratory: { include: { monitoringThreshold: true } },
        telemetrySamples: {
          include: { telemetrySource: true },
          orderBy: { sampledAt: "desc" },
          take: 10
        },
        monitoringAlerts: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          include: {
            source: { select: { id: true, code: true, name: true } },
            resource: { select: { id: true, code: true, name: true } },
            acknowledgedBy: { select: { id: true, fullName: true, role: true } },
            incident: { select: { id: true, severity: true, status: true, category: true } }
          },
          orderBy: { openedAt: "desc" }
        }
      },
      orderBy: { code: "asc" }
    }),
    client.booking.findMany({
      where: {
        endAt: { gte: now },
        status: { in: ACTIVE_BOOKING_STATUSES },
        resource: resourceWhere
      },
      include: {
        resource: { select: { id: true, code: true, name: true, laboratoryId: true, operationalStatus: true } },
        requestedBy: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { startAt: "asc" },
      take: 20
    }),
    client.booking.findMany({
      where: {
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
        status: { notIn: ["REJECTED", "CANCELLED"] },
        resource: resourceWhere
      },
      select: { resourceId: true, startAt: true, endAt: true, actualStartAt: true, actualEndAt: true }
    }),
    client.incident.findMany({
      where: { resource: resourceWhere },
      select: { id: true, severity: true, status: true, detectedAt: true, resolvedAt: true }
    }),
    client.notification.count({ where: { userId: user.id, sentAt: { not: null }, readAt: null } }),
    client.camera.findMany({
      where: user.role === ADMIN
        ? {}
        : { laboratory: { staffAssignments: { some: { userId: user.id } } } },
      orderBy: { code: "asc" }
    })
  ]);

  const statusCounts = Object.fromEntries(
    ["AVAILABLE", "IN_USE", "MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"]
      .map((status) => [status, 0])
  );
  for (const resource of resources) {
    statusCounts[resource.operationalStatus] = (statusCounts[resource.operationalStatus] || 0) + 1;
  }

  const totalCapacityMinutes = resources.length * 30 * 24 * 60;
  const scheduledMinutes = periodBookings.reduce(
    (sum, booking) => sum + overlapMinutes(booking.startAt, booking.endAt, windowStart, windowEnd),
    0
  );
  const actualUsageMinutes = periodBookings.reduce((sum, booking) => {
    if (!booking.actualStartAt) return sum;
    return sum + overlapMinutes(booking.actualStartAt, booking.actualEndAt || now, windowStart, windowEnd);
  }, 0);

  const openStatuses = new Set(["reported", "triaged", "assigned", "investigating"]);
  const openIncidents = incidents.filter((incident) => openStatuses.has(incident.status));

  const telemetry = resources.map((resource) => ({
    ...serializeTelemetry(resource, resource.telemetrySamples[0] || null, now),
    history: resource.telemetrySamples.map((sample) => ({
      id: sample.id,
      sourceId: sample.sourceId,
      source: sample.telemetrySource?.code || sample.source,
      sampledAt: sample.sampledAt,
      online: sample.online,
      temperatureC: sample.temperatureC,
      humidityPercent: sample.humidityPercent,
      cpuPercent: sample.cpuPercent,
      gpuPercent: sample.gpuPercent,
      gpuMemoryPercent: sample.gpuMemoryPercent,
      ramPercent: sample.ramPercent,
      diskPercent: sample.diskPercent,
      signals: sample.verifiedSignals || []
    }))
  }));
  const monitoringAlerts = resources
    .flatMap((resource) => resource.monitoringAlerts)
    .sort((left, right) => new Date(right.lastObservedAt) - new Date(left.lastObservedAt))
    .map(serializeMonitoringAlert);
  const telemetrySummary = telemetry.reduce((acc, item) => {
    acc[item.monitoring.state] = (acc[item.monitoring.state] || 0) + 1;
    return acc;
  }, { HEALTHY: 0, WARNING: 0, STALE: 0, UNAVAILABLE: 0, NO_DATA: 0 });

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalResources: resources.length,
      resourcesByOperationalStatus: statusCounts,
      activeBookingsCount: upcomingBookings.length,
      pendingApprovalCount: upcomingBookings.filter((booking) => booking.status === "PENDING_APPROVAL").length,
      checkedOutCount: upcomingBookings.filter((booking) => booking.status === "CHECKED_OUT").length,
      openIncidentCount: openIncidents.length,
      criticalIncidentCount: openIncidents.filter((incident) => incident.severity === "critical").length,
      unreadNotifications,
      activeMonitoringAlertCount: monitoringAlerts.filter((alert) => alert.status === "OPEN").length,
      acknowledgedMonitoringAlertCount: monitoringAlerts.filter((alert) => alert.status === "ACKNOWLEDGED").length
    },
    utilization: {
      windowDays: 30,
      scheduledMinutes: Math.round(scheduledMinutes),
      actualUsageMinutes: Math.round(actualUsageMinutes),
      scheduledUtilizationRate: totalCapacityMinutes
        ? Number(((scheduledMinutes / totalCapacityMinutes) * 100).toFixed(2))
        : 0,
      actualUtilizationRate: totalCapacityMinutes
        ? Number(((actualUsageMinutes / totalCapacityMinutes) * 100).toFixed(2))
        : 0,
      source: "database"
    },
    incidents: {
      total: incidents.length,
      open: openIncidents.length,
      bySeverity: incidents.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, { low: 0, medium: 0, high: 0, critical: 0 })
    },
    telemetrySummary,
    telemetry,
    monitoringAlerts,
    cameras: cameras.map(serializeCamera),
    upcomingBookings
  };
}
