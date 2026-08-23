export const resourceTypes = ["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"];
export const resourceStatuses = ["available", "reserved", "in_use", "maintenance", "offline"];
export const bookingStatuses = ["pending", "approved", "rejected", "cancelled", "checked_out", "completed"];
export const maintenanceKinds = ["maintenance", "calibration"];
export const maintenanceStatuses = ["scheduled", "in_progress", "completed", "cancelled"];

const DEFAULT_STALE_MINUTES = 15;
const DEFAULT_THRESHOLDS = {
  cpuWarningPercent: 85,
  cpuCriticalPercent: 95,
  gpuWarningPercent: 85,
  gpuCriticalPercent: 95,
  gpuMemoryWarningPercent: 85,
  gpuMemoryCriticalPercent: 95,
  ramWarningPercent: 85,
  ramCriticalPercent: 95,
  diskWarningPercent: 85,
  diskCriticalPercent: 95,
  temperatureWarningC: 75,
  temperatureCriticalC: 85
};

const METRIC_RULES = [
  { key: "cpuPercent", warningKey: "cpuWarningPercent", criticalKey: "cpuCriticalPercent", reason: "cpu_high" },
  { key: "gpuPercent", warningKey: "gpuWarningPercent", criticalKey: "gpuCriticalPercent", reason: "gpu_high" },
  { key: "gpuMemoryPercent", warningKey: "gpuMemoryWarningPercent", criticalKey: "gpuMemoryCriticalPercent", reason: "gpu_memory_high" },
  { key: "ramPercent", warningKey: "ramWarningPercent", criticalKey: "ramCriticalPercent", reason: "ram_high" },
  { key: "diskPercent", warningKey: "diskWarningPercent", criticalKey: "diskCriticalPercent", reason: "disk_high" },
  { key: "temperatureC", warningKey: "temperatureWarningC", criticalKey: "temperatureCriticalC", reason: "temperature_high" }
];

export function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeMultilineText(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .join("\n");
}

export function optionalNormalizedText(value) {
  const text = normalizeMultilineText(value);
  return text || undefined;
}

export function normalizeResourceCode(value) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export function normalizeSearchQuery(value, maxLength = 120) {
  const text = normalizeText(value);
  return text ? text.slice(0, maxLength) : undefined;
}

export function normalizeSpecs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, rawValue]) => [normalizeSpecKey(key), normalizeSpecValue(rawValue)])
      .filter(([key, normalizedValue]) => key && normalizedValue !== undefined)
  );
}

export function normalizePercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, roundMetric(numeric)));
}

export function normalizeTemperature(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return roundMetric(numeric);
}

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive
  };
}

export function serializeTelemetrySample(sample, now = new Date()) {
  if (!sample) return null;
  return {
    id: sample.id,
    cpuPercent: nullableRound(sample.cpuPercent),
    gpuPercent: nullableRound(sample.gpuPercent),
    gpuMemoryPercent: nullableRound(sample.gpuMemoryPercent),
    ramPercent: nullableRound(sample.ramPercent),
    diskPercent: nullableRound(sample.diskPercent),
    temperatureC: nullableRound(sample.temperatureC),
    online: sample.online,
    source: sample.source,
    sampledAt: toIso(sample.sampledAt),
    ageMinutes: ageMinutes(sample.sampledAt, now)
  };
}

export function serializeResource(resource, latestTelemetry = undefined, now = new Date()) {
  if (!resource) return null;
  const sample = latestTelemetry === undefined ? resource.telemetrySamples?.[0] || null : latestTelemetry;
  const specs = normalizeSpecs(resource.specs || {});
  const telemetry = serializeTelemetrySample(sample, now);
  const operational = getResourceOperationalState({ ...resource, specs }, telemetry, now);

  return {
    id: resource.id,
    code: resource.code,
    name: resource.name,
    type: resource.type,
    status: resource.status,
    location: resource.location,
    ownerTeam: resource.ownerTeam,
    capacity: resource.capacity,
    requiresApproval: resource.requiresApproval,
    specs,
    createdAt: toIso(resource.createdAt),
    bookingCount: resource._count?.bookings,
    latestTelemetry: telemetry,
    operational
  };
}

export function serializeBooking(booking, options = {}) {
  if (!booking) return null;
  const includeRequester = options.includeRequester !== false;
  const startAt = new Date(booking.startAt);
  const endAt = new Date(booking.endAt);

  return {
    id: booking.id,
    title: booking.title,
    purpose: booking.purpose,
    status: booking.status,
    notes: booking.notes || null,
    handoverCondition: booking.handoverCondition || null,
    returnCondition: booking.returnCondition || null,
    startAt: toIso(startAt),
    endAt: toIso(endAt),
    durationMinutes: Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60_000)),
    createdAt: toIso(booking.createdAt),
    updatedAt: toIso(booking.updatedAt),
    resource: serializeBookingResource(booking.resource),
    requestedBy: includeRequester ? serializeUser(booking.requestedBy) : null,
    approvedBy: serializeUser(booking.approvedBy)
  };
}

export function serializeMaintenanceWindow(window) {
  if (!window) return null;
  return {
    id: window.id,
    kind: window.kind,
    status: window.status,
    title: window.title,
    notes: window.notes || null,
    startAt: toIso(window.startAt),
    endAt: toIso(window.endAt),
    createdAt: toIso(window.createdAt),
    updatedAt: toIso(window.updatedAt),
    resource: serializeBookingResource(window.resource),
    createdBy: serializeUser(window.createdBy)
  };
}

export function serializeNotification(notification) {
  if (!notification) return null;
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    titleKey: notification.titleKey,
    messageKey: notification.messageKey,
    messageParams: normalizeMessageParams(notification.messageParams),
    severity: notification.severity,
    readAt: toIso(notification.readAt),
    createdAt: toIso(notification.createdAt),
    isUnread: !notification.readAt
  };
}

export function serializeUsageLog(log) {
  if (!log) return null;
  return {
    id: log.id,
    action: log.action,
    message: log.message,
    messageKey: log.messageKey,
    messageParams: normalizeMessageParams(log.messageParams),
    conditionBefore: log.conditionBefore,
    conditionAfter: log.conditionAfter,
    createdAt: toIso(log.createdAt),
    resource: serializeBookingResource(log.resource),
    booking: log.booking ? serializeBooking(log.booking, { includeRequester: false }) : null,
    user: serializeUser(log.user)
  };
}

export function getResourceOperationalState(resource, telemetry, now = new Date()) {
  const specs = normalizeSpecs(resource.specs || {});
  const reasons = [];
  let severityRank = 0;
  let score = 100;

  if (resource.status === "maintenance") {
    reasons.push("maintenance");
    severityRank = Math.max(severityRank, 2);
  }

  if (resource.status === "offline") {
    reasons.push("resource_offline");
    severityRank = Math.max(severityRank, 3);
    score = Math.min(score, 20);
  }

  if (!telemetry) {
    reasons.push("telemetry_missing");
    score = resource.status === "available" ? Math.min(score, 72) : score;
    return {
      state: severityRank >= 3 ? "critical" : severityRank >= 2 ? "warning" : "unknown",
      score: severityRank >= 3 ? score : null,
      attention: severityRank >= 2,
      reasons,
      telemetryAgeMinutes: null
    };
  }

  const staleMinutes = Number(specs.staleMinutes ?? DEFAULT_STALE_MINUTES);
  if (telemetry.online === false) {
    reasons.push("telemetry_offline");
    severityRank = Math.max(severityRank, 3);
    score = Math.min(score, 15);
  }

  if (Number.isFinite(telemetry.ageMinutes) && telemetry.ageMinutes > staleMinutes) {
    reasons.push("telemetry_stale");
    severityRank = Math.max(severityRank, 2);
    score = Math.min(score, 80);
  }

  for (const rule of METRIC_RULES) {
    const value = telemetry[rule.key];
    if (value === null || value === undefined) continue;
    const warning = Number(specs[rule.warningKey] ?? DEFAULT_THRESHOLDS[rule.warningKey]);
    const critical = Number(specs[rule.criticalKey] ?? DEFAULT_THRESHOLDS[rule.criticalKey]);
    if (value >= critical) {
      reasons.push(`${rule.reason}_critical`);
      severityRank = Math.max(severityRank, 3);
      score = Math.min(score, Math.max(0, Math.round(100 - value)));
    } else if (value >= warning) {
      reasons.push(`${rule.reason}_warning`);
      severityRank = Math.max(severityRank, 2);
      score = Math.min(score, Math.max(45, Math.round(100 - value / 2)));
    }
  }

  return {
    state: severityRank >= 3 ? "critical" : severityRank >= 2 ? "warning" : "stable",
    score,
    attention: severityRank >= 2,
    reasons,
    telemetryAgeMinutes: telemetry.ageMinutes
  };
}

function serializeBookingResource(resource) {
  if (!resource) return null;
  return {
    id: resource.id,
    code: resource.code,
    name: resource.name,
    type: resource.type,
    status: resource.status,
    location: resource.location
  };
}

function normalizeSpecKey(key) {
  return normalizeText(key)
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 80);
}

function normalizeSpecValue(value) {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const list = value.map(normalizeSpecValue).filter((item) => item !== undefined);
    return list.length ? list : undefined;
  }
  if (typeof value === "object") {
    const nested = normalizeSpecs(value);
    return Object.keys(nested).length ? nested : undefined;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? roundMetric(value) : undefined;

  const text = normalizeText(value);
  if (!text) return undefined;
  if (/^(true|yes|co|1)$/i.test(text)) return true;
  if (/^(false|no|khong|0)$/i.test(text)) return false;
  if (/^-?\d+([.,]\d+)?$/.test(text)) return roundMetric(Number(text.replace(",", ".")));
  return text;
}

function normalizeMessageParams(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function nullableRound(value) {
  return value === null || value === undefined ? null : roundMetric(value);
}

function roundMetric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100) / 100;
}

function ageMinutes(value, now) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
