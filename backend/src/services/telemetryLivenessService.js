import { randomUUID } from 'node:crypto';
import { localize } from '../locales/index.js';
import { ADMIN, LAB_STAFF } from '../constants/roles.js';
import { SOURCE_STALE_RULE, staleNoticePrefix } from './monitoringAlertService.js';
import { resolveMonitoringThresholds, SYSTEM_MONITORING_DEFAULTS } from './telemetryService.js';
import { telemetrySourceInclude } from './telemetryIdentityService.js';

const BATCH_SIZE = 40;
const INTERVAL_MS = 15_000;

async function recordStaleSource(tx, sourceId, now) {
  // Shared with ingestion so a concurrent fresh sample can never be missed.
  await tx.$queryRaw`SELECT id FROM telemetry_sources WHERE id = ${sourceId} FOR UPDATE`;
  const source = await tx.telemetrySource.findUnique({ where: { id: sourceId }, include: telemetrySourceInclude() });
  if (!source?.isActive || source.kind !== 'EXTERNAL' || source.reportedOnline !== true || !source.lastSampleAt) return false;
  const { resource } = source;
  if (!resource.laboratory?.isActive || resource.laboratoryId !== source.laboratoryId || resource.operationalStatus === 'RETIRED') return false;
  const thresholdSnapshot = resolveMonitoringThresholds(resource);
  const minutes = thresholdSnapshot.values.staleMinutes;
  if (now - source.lastSampleAt <= minutes * 60_000) return false;

  const activeDedupeKey = `${source.id}:${SOURCE_STALE_RULE}`;
  if (await tx.monitoringAlert.findUnique({ where: { activeDedupeKey }, select: { id: true } })) return false;
  const sample = await tx.telemetrySample.findFirst({
    where: { sourceId, resourceId: resource.id, sampledAt: source.lastSampleAt, online: true, origin: 'EXTERNAL' },
    select: { id: true }
  });
  if (!sample) return false;

  const alertId = randomUUID();
  const titleKey = 'monitoring.stale.title', messageKey = 'monitoring.stale.message';
  const params = { alertId, resourceId: resource.id, resourceName: resource.name, resourceCode: resource.code, sourceCode: source.code, minutes };
  const message = localize('vi', `notification.${messageKey}`, params);
  await tx.monitoringAlert.create({ data: {
    id: alertId, activeDedupeKey, conditionKey: activeDedupeKey, sourceId,
    resourceId: resource.id, laboratoryId: source.laboratoryId, sampleId: sample.id,
    origin: 'EXTERNAL', ruleCode: SOURCE_STALE_RULE, severity: 'WARNING', message,
    thresholdSnapshot, openedAt: now, lastObservedAt: source.lastSampleAt
  } });
  const recipients = await tx.user.findMany({
    where: { isActive: true, deletedAt: null, OR: [{ role: ADMIN }, { role: LAB_STAFF, labAssignments: { some: { laboratoryId: source.laboratoryId } } }] },
    select: { id: true }
  });
  if (recipients.length) await tx.notification.createMany({ data: recipients.map(user => ({
    id: randomUUID(), userId: user.id, title: localize('vi', `notification.${titleKey}`), message,
    titleKey, messageKey, messageParams: params, severity: 'warning', sentAt: now,
    dedupeKey: `${staleNoticePrefix(alertId)}${user.id}`
  })) });
  return true;
}

export async function scanStaleTelemetrySources(db, now = new Date()) {
  // Filter due sources before LIMIT. Fresh sources and already open episodes
  // cannot crowd a different overdue source out of the batch.
  const due = await db.$queryRaw`
    SELECT s.id FROM telemetry_sources s
    JOIN resources r ON r.id = s."resourceId" AND r."laboratoryId" = s."laboratoryId"
    JOIN laboratories l ON l.id = s."laboratoryId"
    LEFT JOIN resource_monitoring_thresholds rt ON rt."resourceId" = r.id
    LEFT JOIN laboratory_monitoring_thresholds lt ON lt."laboratoryId" = l.id
    WHERE s.kind = 'EXTERNAL' AND s."isActive" AND s."reportedOnline"
      AND l."isActive" AND r."operationalStatus" <> 'RETIRED'
      AND s."lastSampleAt" < ${now} - make_interval(mins => COALESCE(rt."staleMinutes", lt."staleMinutes", ${SYSTEM_MONITORING_DEFAULTS.staleMinutes}::int))
      AND NOT EXISTS (SELECT 1 FROM monitoring_alerts a WHERE a."activeDedupeKey" = s.id || ':' || ${SOURCE_STALE_RULE})
    ORDER BY s."lastSampleAt", s.id LIMIT ${BATCH_SIZE}`;
  let opened = 0;
  for (const { id } of due) {
    if (await db.$transaction(tx => recordStaleSource(tx, id, now))) opened++;
  }
  return opened;
}

export function startTelemetryLivenessScheduler(db, enabled) {
  if (!enabled) return () => Promise.resolve();
  let pending;
  function tick() {
    if (pending) return;
    pending = scanStaleTelemetrySources(db)
      .catch(error => console.error('Telemetry liveness scan failed', { code: error?.code || 'UNKNOWN' }))
      .finally(() => { pending = undefined; });
  }
  tick();
  const timer = setInterval(tick, INTERVAL_MS);
  timer.unref();
  return () => { clearInterval(timer); return pending || Promise.resolve(); };
}
