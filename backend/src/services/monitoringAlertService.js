import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";
import { lockCurrentAccount } from './accountAccess.js';

export const SOURCE_STALE_RULE = 'SOURCE_STALE';
export const staleNoticePrefix = alertId => `monitoring:stale:${alertId}:`;

export const monitoringAlertInclude = {
  source: { select: { id: true, code: true, name: true } },
  resource: { select: { id: true, code: true, name: true } },
  acknowledgedBy: { select: { id: true, fullName: true, role: true } },
  incident: { select: { id: true, severity: true, status: true, category: true } }
};

export function monitoringScopeWhere(user) {
  if (user.role === ADMIN) return {};
  if (user.role === LAB_STAFF) {
    return { laboratory: { staffAssignments: { some: { userId: user.id } } } };
  }
  return { id: { in: [] } };
}

async function assertAlertScope(tx, alert, actor) {
  if (actor.role === ADMIN) return;
  if (actor.role !== LAB_STAFF) {
    throw new HttpError(403, "Only ADMIN or LAB_STAFF can acknowledge monitoring alerts", undefined, "FORBIDDEN");
  }
  const assignments = await tx.$queryRaw`SELECT "userId" FROM user_lab_assignments WHERE "userId" = ${actor.id} AND "laboratoryId" = ${alert.laboratoryId} FOR SHARE`;
  if (!assignments.length) {
    throw new HttpError(403, "Monitoring alert is outside assigned laboratories", undefined, "FORBIDDEN");
  }
}

export async function acknowledgeMonitoringAlert(tx, { alertId, actor }) {
  const current = await lockCurrentAccount(tx, actor.id, actor.authVersion);
  await tx.$queryRaw`SELECT id FROM monitoring_alerts WHERE id = ${alertId} FOR UPDATE`;
  const alert = await tx.monitoringAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new HttpError(404, "Monitoring alert not found", undefined, "NOT_FOUND");
  await assertAlertScope(tx, alert, current);
  if (alert.status === "RESOLVED") {
    throw new HttpError(409, "Resolved monitoring alerts cannot be acknowledged", undefined, "MONITORING_ALERT_INVALID_TRANSITION");
  }
  if (alert.status === "ACKNOWLEDGED") return alert;
  return tx.monitoringAlert.update({
    where: { id: alertId },
    data: { status: "ACKNOWLEDGED", acknowledgedById: actor.id, acknowledgedAt: new Date() }
  });
}

// Called after the same source row has been locked by ingestion.
export async function resolveStaleSourceAlert(tx, { source, sample, now, staleMinutes }) {
  if (!sample.online || now - sample.sampledAt > staleMinutes * 60_000) return;
  const alert = await tx.monitoringAlert.findUnique({
    where: { activeDedupeKey: `${source.id}:${SOURCE_STALE_RULE}` },
    select: { id: true, sample: { select: { sampledAt: true } } }
  });
  if (!alert || sample.sampledAt <= alert.sample.sampledAt) return;
  await tx.monitoringAlert.update({ where: { id: alert.id }, data: {
    activeDedupeKey: null, status: 'RESOLVED', resolvedAt: now, resolution: 'FRESH_SAMPLE_RECEIVED'
  } });
  await tx.notification.updateMany({ where: { dedupeKey: { startsWith: staleNoticePrefix(alert.id) }, readAt: null }, data: { readAt: now } });
}

export function serializeMonitoringAlert(alert) {
  return {
    id: alert.id,
    origin: alert.origin || "EXTERNAL",
    sourceId: alert.sourceId,
    sourceCode: alert.source?.code,
    resourceId: alert.resourceId,
    resourceCode: alert.resource?.code,
    laboratoryId: alert.laboratoryId,
    sampleId: alert.sampleId,
    ruleCode: alert.ruleCode,
    severity: alert.severity,
    status: alert.status,
    message: alert.message,
    observedValue: alert.observedValue,
    thresholdSnapshot: alert.thresholdSnapshot,
    openedAt: alert.openedAt,
    lastObservedAt: alert.lastObservedAt,
    acknowledgedBy: alert.acknowledgedBy || null,
    acknowledgedAt: alert.acknowledgedAt,
    resolvedAt: alert.resolvedAt,
    resolution: alert.resolution,
    incident: alert.incident || null
  };
}
