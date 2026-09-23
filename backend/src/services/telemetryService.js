import crypto from "node:crypto";

import { HttpError } from "../middleware/errors.js";
import { serializeTelemetrySource } from "./telemetryIdentityService.js";

export const TELEMETRY_STATES = Object.freeze({
  HEALTHY: "HEALTHY",
  WARNING: "WARNING",
  STALE: "STALE",
  UNAVAILABLE: "UNAVAILABLE",
  NO_DATA: "NO_DATA"
});

export const SYSTEM_MONITORING_DEFAULTS = Object.freeze({
  temperatureWarningC: 75,
  temperatureCriticalC: 90,
  humidityMinPercent: 20,
  humidityMaxPercent: 80,
  staleMinutes: 15,
  utilizationWarningPercent: 90
});

function thresholdValue(resourceValue, laboratoryValue, defaultValue, field) {
  if (resourceValue !== null && resourceValue !== undefined) {
    return { value: Number(resourceValue), source: "RESOURCE_OVERRIDE", field };
  }
  if (laboratoryValue !== null && laboratoryValue !== undefined) {
    return { value: Number(laboratoryValue), source: "LABORATORY", field };
  }
  return { value: defaultValue, source: "SYSTEM_DEFAULT", field };
}

export function resolveMonitoringThresholds(resource) {
  const resourcePolicy = resource?.monitoringThreshold || {};
  const laboratoryPolicy = resource?.laboratory?.monitoringThreshold || {};
  const fields = [
    "temperatureWarningC",
    "temperatureCriticalC",
    "humidityMinPercent",
    "humidityMaxPercent",
    "staleMinutes"
  ];
  const resolved = Object.fromEntries(fields.map((field) => {
    const item = thresholdValue(resourcePolicy[field], laboratoryPolicy[field], SYSTEM_MONITORING_DEFAULTS[field], field);
    return [field, item];
  }));
  resolved.utilizationWarningPercent = {
    value: SYSTEM_MONITORING_DEFAULTS.utilizationWarningPercent,
    source: "SYSTEM_DEFAULT",
    field: "utilizationWarningPercent"
  };
  return {
    values: Object.fromEntries(Object.entries(resolved).map(([field, item]) => [field, item.value])),
    sourceByField: Object.fromEntries(Object.entries(resolved).map(([field, item]) => [field, item.source]))
  };
}

export function deriveTelemetryState(resource, sample, now = new Date(), thresholdResolution = resolveMonitoringThresholds(resource)) {
  const thresholds = thresholdResolution.values;
  if (!sample) {
    return { state: TELEMETRY_STATES.NO_DATA, reasons: ["NO_ACCEPTED_SAMPLE"], staleMinutes: thresholds.staleMinutes };
  }
  if (sample.online === false) {
    return { state: TELEMETRY_STATES.UNAVAILABLE, reasons: ["SOURCE_REPORTED_OFFLINE"], staleMinutes: thresholds.staleMinutes };
  }

  const ageMs = now.getTime() - new Date(sample.sampledAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > thresholds.staleMinutes * 60_000) {
    return { state: TELEMETRY_STATES.STALE, reasons: ["SAMPLE_STALE"], staleMinutes: thresholds.staleMinutes };
  }

  const reasons = [];
  if (sample.temperatureC != null && sample.temperatureC >= thresholds.temperatureCriticalC) reasons.push("TEMPERATURE_CRITICAL");
  else if (sample.temperatureC != null && sample.temperatureC >= thresholds.temperatureWarningC) reasons.push("TEMPERATURE_THRESHOLD");
  if (sample.humidityPercent != null && (sample.humidityPercent < thresholds.humidityMinPercent || sample.humidityPercent > thresholds.humidityMaxPercent)) {
    reasons.push("HUMIDITY_THRESHOLD");
  }
  for (const key of ["cpuPercent", "gpuPercent", "gpuMemoryPercent", "ramPercent", "diskPercent"]) {
    const value = sample[key];
    if (value !== null && value !== undefined && value >= thresholds.utilizationWarningPercent) {
      reasons.push(`${key.toUpperCase()}_THRESHOLD`);
    }
  }
  const signals = Array.isArray(sample.verifiedSignals) ? sample.verifiedSignals : [];
  if (signals.some((signal) => signal?.verified === true && ["warning", "critical"].includes(String(signal.severity || "").toLowerCase()))) {
    reasons.push("VERIFIED_WARNING_SIGNAL");
  }
  return reasons.length
    ? { state: TELEMETRY_STATES.WARNING, reasons, staleMinutes: thresholds.staleMinutes }
    : { state: TELEMETRY_STATES.HEALTHY, reasons: [], staleMinutes: thresholds.staleMinutes };
}

export function validateTelemetryTimestamp(sampledAt, now = new Date()) {
  const timestamp = new Date(sampledAt);
  if (Number.isNaN(timestamp.getTime())) {
    throw new HttpError(400, "Telemetry timestamp is invalid", { field: "timestamp" }, "VALIDATION_ERROR");
  }
  if (timestamp.getTime() > now.getTime() + 5 * 60_000) {
    throw new HttpError(400, "Telemetry timestamp is too far in the future", { field: "timestamp" }, "TELEMETRY_TIMESTAMP_INVALID");
  }
  if (timestamp.getTime() < now.getTime() - 7 * 24 * 60 * 60_000) {
    throw new HttpError(400, "Telemetry timestamp is too old", { field: "timestamp" }, "TELEMETRY_TIMESTAMP_INVALID");
  }
  return timestamp;
}

function normalizeSignals(signals, source) {
  return (signals || []).map((signal) => ({
    code: String(signal.code).trim().toUpperCase(),
    severity: String(signal.severity || "info").toLowerCase(),
    message: String(signal.message).trim(),
    verified: signal.verified === true,
    provenance: `authenticated-source:${source.code}:${source.id}`
  }));
}

function alertConditions(sample, thresholds) {
  const conditions = [];
  if (sample.online === false) {
    conditions.push({ ruleCode: "SOURCE_OFFLINE", severity: "WARNING", message: "Telemetry source explicitly reported offline" });
  }
  if (sample.temperatureC >= thresholds.temperatureCriticalC) {
    conditions.push({
      ruleCode: "TEMPERATURE_CRITICAL",
      severity: "CRITICAL",
      message: "Temperature reached the configured critical threshold",
      observedValue: sample.temperatureC
    });
  } else if (sample.temperatureC >= thresholds.temperatureWarningC) {
    conditions.push({
      ruleCode: "TEMPERATURE_WARNING",
      severity: "WARNING",
      message: "Temperature reached the configured warning threshold",
      observedValue: sample.temperatureC
    });
  }
  if (sample.humidityPercent < thresholds.humidityMinPercent) {
    conditions.push({ ruleCode: "HUMIDITY_LOW", severity: "WARNING", message: "Humidity is below the configured minimum", observedValue: sample.humidityPercent });
  } else if (sample.humidityPercent > thresholds.humidityMaxPercent) {
    conditions.push({ ruleCode: "HUMIDITY_HIGH", severity: "WARNING", message: "Humidity is above the configured maximum", observedValue: sample.humidityPercent });
  }
  const signals = Array.isArray(sample.verifiedSignals) ? sample.verifiedSignals : [];
  for (const signal of signals) {
    if (signal?.verified !== true || !["warning", "critical"].includes(signal.severity)) continue;
    const code = String(signal.code || "SIGNAL").replace(/[^A-Z0-9_-]/gi, "_").toUpperCase();
    const isSafetyEarlyWarning = code.includes("SMOKE") || code.includes("FIRE");
    conditions.push({
      ruleCode: `SIGNAL_${code}`,
      severity: signal.severity === "critical" ? "CRITICAL" : "WARNING",
      message: isSafetyEarlyWarning
        ? `${signal.message} — NON-CERTIFIED EARLY WARNING; NOT A FIRE ALARM`
        : signal.message
    });
  }
  return conditions;
}

async function reconcileAlerts(tx, { source, sample, thresholdResolution, now }) {
  const thresholds = thresholdResolution.values;
  const conditions = alertConditions(sample, thresholds);
  const activeKeys = [];
  const alerts = [];

  for (const condition of conditions) {
    const activeDedupeKey = `${source.id}:${condition.ruleCode}`;
    activeKeys.push(activeDedupeKey);
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${activeDedupeKey}))) AS lock_row`;
    const existing = await tx.monitoringAlert.findUnique({ where: { activeDedupeKey } });
    const data = {
      sourceId: source.id,
      resourceId: source.resourceId,
      laboratoryId: source.laboratoryId,
      sampleId: sample.id,
      ruleCode: condition.ruleCode,
      severity: condition.severity,
      message: condition.message,
      observedValue: condition.observedValue ?? null,
      thresholdSnapshot: thresholdResolution,
      lastObservedAt: now
    };
    const alert = existing
      ? await tx.monitoringAlert.update({ where: { id: existing.id }, data })
      : await tx.monitoringAlert.create({
        data: {
          id: crypto.randomUUID(),
          activeDedupeKey,
          conditionKey: activeDedupeKey,
          ...data,
          openedAt: now
        }
      });
    alerts.push(alert);

    if (alert.severity === "CRITICAL") {
      const linked = await tx.incident.findUnique({ where: { monitoringAlertId: alert.id }, select: { id: true } });
      if (!linked) {
        await tx.incident.create({
          data: {
            id: crypto.randomUUID(),
            resourceId: source.resourceId,
            reportedById: null,
            telemetrySourceId: source.id,
            telemetrySampleId: sample.id,
            monitoringAlertId: alert.id,
            severity: "critical",
            status: "reported",
            category: condition.ruleCode.includes("SMOKE") || condition.ruleCode.includes("FIRE")
              ? "NON_CERTIFIED_SAFETY_EARLY_WARNING"
              : "MONITORING_ALERT",
            title: `Monitoring alert: ${condition.ruleCode}`,
            description: condition.message,
            detectedAt: sample.sampledAt,
            provenance: {
              telemetrySourceId: source.id,
              telemetrySampleId: sample.id,
              monitoringAlertId: alert.id,
              ruleCode: condition.ruleCode
            }
          }
        });
        await tx.usageLog.create({
          data: {
            id: crypto.randomUUID(),
            resourceId: source.resourceId,
            actorType: "SERVICE",
            actorRef: source.id,
            action: "INCIDENT_REPORTED",
            message: "incident.monitoring_alert_reported",
            messageKey: "incident.monitoring_alert_reported",
            reason: condition.message,
            metadata: { monitoringAlertId: alert.id, telemetrySampleId: sample.id, ruleCode: condition.ruleCode }
          }
        });
      }
    }
  }

  const obsolete = await tx.monitoringAlert.findMany({
    where: {
      sourceId: source.id,
      activeDedupeKey: { not: null },
      ...(activeKeys.length ? { activeDedupeKey: { notIn: activeKeys } } : {})
    },
    select: { id: true }
  });
  if (obsolete.length) {
    await tx.monitoringAlert.updateMany({
      where: { id: { in: obsolete.map((row) => row.id) } },
      data: {
        activeDedupeKey: null,
        status: "RESOLVED",
        resolvedAt: now,
        resolution: "CONDITION_CLEARED"
      }
    });
  }
  return alerts;
}

export async function persistTelemetrySample(tx, { source, payload, now = new Date() }) {
  const sampledAt = validateTelemetryTimestamp(payload.timestamp, now);
  if (payload.labId && payload.labId !== source.laboratoryId) {
    throw new HttpError(403, "Telemetry source cannot submit for another laboratory", { field: "labId" }, "TELEMETRY_SOURCE_SCOPE_MISMATCH");
  }
  if (payload.resourceId && payload.resourceId !== source.resourceId) {
    throw new HttpError(403, "Telemetry source cannot submit for another resource", { field: "resourceId" }, "TELEMETRY_SOURCE_SCOPE_MISMATCH");
  }
  if (payload.source && String(payload.source).trim().toUpperCase() !== source.code) {
    throw new HttpError(403, "Telemetry source identity cannot be overridden", { field: "source" }, "TELEMETRY_SOURCE_SCOPE_MISMATCH");
  }

  await tx.$queryRaw`SELECT id FROM telemetry_sources WHERE id = ${source.id} FOR UPDATE`;
  const currentSource = await tx.telemetrySource.findUnique({ where: { id: source.id } });
  if (!currentSource?.isActive) {
    throw new HttpError(403, "Telemetry source is inactive", undefined, "TELEMETRY_SOURCE_INACTIVE");
  }

  if (payload.eventId) {
    const prior = await tx.telemetrySample.findUnique({
      where: { sourceId_externalId: { sourceId: source.id, externalId: payload.eventId } }
    });
    if (prior) {
      await tx.telemetrySource.update({ where: { id: source.id }, data: { lastSeenAt: now } });
      return { sample: prior, alerts: [], replayed: true };
    }
  }

  const verifiedSignals = normalizeSignals(payload.signals, source);
  const sample = await tx.telemetrySample.create({
    data: {
      id: crypto.randomUUID(),
      sourceId: source.id,
      externalId: payload.eventId || null,
      resourceId: source.resourceId,
      cpuPercent: payload.cpuPercent ?? null,
      gpuPercent: payload.gpuPercent ?? null,
      gpuMemoryPercent: payload.gpuMemoryPercent ?? null,
      ramPercent: payload.ramPercent ?? null,
      diskPercent: payload.diskPercent ?? null,
      temperatureC: payload.temperatureC,
      humidityPercent: payload.humidityPercent,
      online: payload.online,
      source: source.code,
      verifiedSignals,
      sampledAt
    }
  });

  const isNewest = !currentSource.lastSampleAt || sampledAt >= currentSource.lastSampleAt;
  await tx.telemetrySource.update({
    where: { id: source.id },
    data: {
      lastSeenAt: now,
      ...(isNewest ? { lastSampleAt: sampledAt, reportedOnline: payload.online } : {})
    }
  });

  const thresholdResolution = resolveMonitoringThresholds(source.resource);
  const alerts = isNewest
    ? await reconcileAlerts(tx, { source, sample, thresholdResolution, now })
    : [];
  return { sample, alerts, replayed: false };
}

export function serializeTelemetry(resource, sample, now = new Date()) {
  const thresholdResolution = resolveMonitoringThresholds(resource);
  const derived = deriveTelemetryState(resource, sample, now, thresholdResolution);
  const source = sample?.telemetrySource || null;
  return {
    resource: {
      id: resource.id,
      code: resource.code,
      name: resource.name,
      laboratoryId: resource.laboratoryId,
      operationalStatus: resource.operationalStatus,
      specs: resource.specs || {}
    },
    sourceHealth: source
      ? serializeTelemetrySource(source, now, thresholdResolution.values.staleMinutes)
      : null,
    latestTelemetry: sample ? {
      id: sample.id,
      sourceId: sample.sourceId,
      source: source?.code || sample.source,
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
    } : null,
    thresholds: thresholdResolution,
    monitoring: derived,
    activeAlerts: resource.monitoringAlerts || []
  };
}
