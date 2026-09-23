import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

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
  const assignment = await tx.userLabAssignment.findUnique({
    where: { userId_laboratoryId: { userId: actor.id, laboratoryId: alert.laboratoryId } },
    select: { userId: true }
  });
  if (!assignment) {
    throw new HttpError(403, "Monitoring alert is outside assigned laboratories", undefined, "FORBIDDEN");
  }
}

export async function acknowledgeMonitoringAlert(tx, { alertId, actor }) {
  await tx.$queryRaw`SELECT id FROM monitoring_alerts WHERE id = ${alertId} FOR UPDATE`;
  const alert = await tx.monitoringAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new HttpError(404, "Monitoring alert not found", undefined, "NOT_FOUND");
  await assertAlertScope(tx, alert, actor);
  if (alert.status === "RESOLVED") {
    throw new HttpError(409, "Resolved monitoring alerts cannot be acknowledged", undefined, "MONITORING_ALERT_INVALID_TRANSITION");
  }
  if (alert.status === "ACKNOWLEDGED") return alert;
  return tx.monitoringAlert.update({
    where: { id: alertId },
    data: { status: "ACKNOWLEDGED", acknowledgedById: actor.id, acknowledgedAt: new Date() }
  });
}

export function serializeMonitoringAlert(alert) {
  return {
    id: alert.id,
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
