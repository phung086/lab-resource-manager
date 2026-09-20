import crypto from "crypto";

import { HttpError } from "../middleware/errors.js";

export const TELEMETRY_STATES = Object.freeze({
  HEALTHY: "HEALTHY",
  WARNING: "WARNING",
  STALE: "STALE",
  UNAVAILABLE: "UNAVAILABLE",
  NO_DATA: "NO_DATA"
});

const DEFAULTS = Object.freeze({
  staleMinutes: 15,
  temperatureWarningC: 75,
  humidityMinPercent: 20,
  humidityMaxPercent: 80,
  utilizationWarningPercent: 90
});

function numberSpec(specs, key, fallback) {
  const value = Number(specs?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function deriveTelemetryState(resource, sample, now = new Date()) {
  if (!sample) {
    return { state: TELEMETRY_STATES.NO_DATA, reasons: ["NO_ACCEPTED_SAMPLE"] };
  }
  if (sample.online === false) {
    return { state: TELEMETRY_STATES.UNAVAILABLE, reasons: ["SOURCE_REPORTED_OFFLINE"] };
  }

  const specs = resource?.specs || {};
  const staleMinutes = numberSpec(specs, "telemetryStaleMinutes", numberSpec(specs, "staleMinutes", DEFAULTS.staleMinutes));
  const ageMs = now.getTime() - new Date(sample.sampledAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > staleMinutes * 60_000) {
    return { state: TELEMETRY_STATES.STALE, reasons: ["SAMPLE_STALE"], staleMinutes };
  }

  const reasons = [];
  const temperatureWarningC = numberSpec(specs, "temperatureWarningC", DEFAULTS.temperatureWarningC);
  const humidityMinPercent = numberSpec(specs, "humidityMinPercent", DEFAULTS.humidityMinPercent);
  const humidityMaxPercent = numberSpec(specs, "humidityMaxPercent", DEFAULTS.humidityMaxPercent);
  const utilizationWarningPercent = numberSpec(specs, "utilizationWarningPercent", DEFAULTS.utilizationWarningPercent);

  if (sample.temperatureC >= temperatureWarningC) reasons.push("TEMPERATURE_THRESHOLD");
  if (sample.humidityPercent < humidityMinPercent || sample.humidityPercent > humidityMaxPercent) reasons.push("HUMIDITY_THRESHOLD");

  for (const key of ["cpuPercent", "gpuPercent", "gpuMemoryPercent", "ramPercent", "diskPercent"]) {
    const value = sample[key];
    if (value !== null && value !== undefined && value >= utilizationWarningPercent) {
      reasons.push(\`\${key.toUpperCase()}_THRESHOLD\`);
    }
  }

  const signals = Array.isArray(sample.verifiedSignals) ? sample.verifiedSignals : [];
  if (signals.some((signal) => signal?.verified === true && ["warning", "critical"].includes(String(signal.severity || "").toLowerCase()))) {
    reasons.push("VERIFIED_WARNING_SIGNAL");
  }

  return reasons.length
    ? { state: TELEMETRY_STATES.WARNING, reasons }
    : { state: TELEMETRY_STATES.HEALTHY, reasons: [] };
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

export async function persistTelemetrySample(tx, { resource, payload }) {
  const sampledAt = validateTelemetryTimestamp(payload.timestamp);
  if (!resource.laboratoryId || resource.laboratoryId !== payload.labId) {
    throw new HttpError(400, "Telemetry labId does not match the resource laboratory", { field: "labId" }, "TELEMETRY_RESOURCE_SCOPE_MISMATCH");
  }

  return tx.telemetrySample.create({
    data: {
      id: crypto.randomUUID(),
      resourceId: resource.id,
      cpuPercent: payload.cpuPercent ?? null,
      gpuPercent: payload.gpuPercent ?? null,
      gpuMemoryPercent: payload.gpuMemoryPercent ?? null,
      ramPercent: payload.ramPercent ?? null,
      diskPercent: payload.diskPercent ?? null,
      temperatureC: payload.temperatureC,
      humidityPercent: payload.humidityPercent,
      online: payload.online,
      source: payload.source,
      verifiedSignals: payload.signals || [],
      sampledAt
    }
  });
}

export function serializeTelemetry(resource, sample, now = new Date()) {
  const derived = deriveTelemetryState(resource, sample, now);
  return {
    resource: {
      id: resource.id,
      code: resource.code,
      name: resource.name,
      laboratoryId: resource.laboratoryId,
      operationalStatus: resource.operationalStatus,
      specs: resource.specs || {}
    },
    latestTelemetry: sample ? {
      id: sample.id,
      source: sample.source,
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
    monitoring: derived
  };
}
