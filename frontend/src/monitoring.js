import { monitoringDefaults } from "./constants.js";
import { defaultLocale, getDictionary } from "./i18n.js";
import { clampPercent, formatDateTime, formatPercent } from "./utils.js";

const defaultDictionary = getDictionary(defaultLocale);

function getMetricDefinitions(copy = defaultDictionary) {
  return [
    {
      key: "cpuPercent",
      label: copy.monitoring.cpu,
      issue: copy.monitoringIssues.cpu,
      warningSpec: "cpuWarningPercent",
      criticalSpec: "cpuCriticalPercent",
      warningDefault: "utilizationWarningPercent",
      criticalDefault: "utilizationCriticalPercent",
      unit: "percent"
    },
    {
      key: "gpuPercent",
      label: copy.monitoring.gpu,
      issue: copy.monitoringIssues.gpu,
      warningSpec: "gpuWarningPercent",
      criticalSpec: "gpuCriticalPercent",
      warningDefault: "utilizationWarningPercent",
      criticalDefault: "utilizationCriticalPercent",
      unit: "percent"
    },
    {
      key: "gpuMemoryPercent",
      label: copy.monitoring.gpuMemory,
      issue: copy.monitoringIssues.gpuMemory,
      warningSpec: "gpuMemoryWarningPercent",
      criticalSpec: "gpuMemoryCriticalPercent",
      warningDefault: "utilizationWarningPercent",
      criticalDefault: "utilizationCriticalPercent",
      unit: "percent"
    },
    {
      key: "ramPercent",
      label: copy.monitoring.ram,
      issue: copy.monitoringIssues.ram,
      warningSpec: "ramWarningPercent",
      criticalSpec: "ramCriticalPercent",
      warningDefault: "utilizationWarningPercent",
      criticalDefault: "utilizationCriticalPercent",
      unit: "percent"
    },
    {
      key: "diskPercent",
      label: copy.monitoring.disk,
      issue: copy.monitoringIssues.disk,
      warningSpec: "diskWarningPercent",
      criticalSpec: "diskCriticalPercent",
      warningDefault: "diskWarningPercent",
      criticalDefault: "diskCriticalPercent",
      unit: "percent"
    },
    {
      key: "temperatureC",
      label: copy.monitoring.temperature,
      issue: copy.monitoringIssues.temperature,
      warningSpec: "temperatureWarningC",
      criticalSpec: "temperatureCriticalC",
      warningDefault: "temperatureWarningC",
      criticalDefault: "temperatureCriticalC",
      unit: "temperature"
    }
  ];
}

export function buildMonitoringRows(resource, sample, copy = defaultDictionary) {
  return getMetricDefinitions(copy).map((definition) => {
    const warning = readThreshold(resource?.specs, definition.warningSpec, definition.warningDefault);
    const critical = readThreshold(resource?.specs, definition.criticalSpec, definition.criticalDefault);
    const value = sample?.[definition.key];
    const level = metricLevel(value, warning, critical);

    return {
      ...definition,
      value,
      warning,
      critical,
      level,
      displayValue: formatMetricValue(value, definition.unit)
    };
  });
}

export function getMonitoringSummary(resource, sample, copy = defaultDictionary) {
  if (!sample) {
    return {
      state: "unknown",
      label: copy.monitoringStates.unknown,
      score: null,
      issues: [copy.monitoringIssues.noTelemetry],
      lastUpdate: copy.monitoring.notMeasured
    };
  }

  if (sample.online === false) {
    return {
      state: "offline",
      label: copy.monitoringStates.offline,
      score: 0,
      issues: [copy.monitoringIssues.offline],
      lastUpdate: formatDateTime(sample.sampledAt, copy.localeCode)
    };
  }

  const rows = buildMonitoringRows(resource, sample, copy);
  const issues = rows.filter((row) => row.level !== "stable").map((row) => row.issue);
  const stale = isTelemetryStale(sample, resource?.specs);
  const criticalCount = rows.filter((row) => row.level === "critical").length;
  const warningCount = rows.filter((row) => row.level === "warning").length;
  const penalty = criticalCount * 18 + warningCount * 8 + (stale ? 20 : 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  if (stale) issues.unshift(copy.monitoringIssues.stale);

  return {
    state: stale ? "stale" : criticalCount ? "critical" : warningCount ? "warning" : "stable",
    label: stale ? copy.monitoringStates.stale : criticalCount ? copy.monitoringStates.critical : warningCount ? copy.monitoringStates.warning : copy.monitoringStates.stable,
    score,
    issues: issues.length ? issues : [copy.monitoring.noIssue],
    lastUpdate: formatDateTime(sample.sampledAt, copy.localeCode)
  };
}

export function formatMetricValue(value, unit) {
  if (value === null || value === undefined) return "-";
  if (unit === "temperature") return `${Math.round(value)}°C`;
  return formatPercent(value);
}

function metricLevel(value, warning, critical) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "unknown";
  if (Number(value) >= critical) return "critical";
  if (Number(value) >= warning) return "warning";
  return "stable";
}

function readThreshold(specs = {}, specKey, defaultKey) {
  const raw = specs?.[specKey];
  const value = Number(raw);
  return Number.isFinite(value) ? value : monitoringDefaults[defaultKey];
}

function isTelemetryStale(sample, specs = {}) {
  if (!sample.sampledAt) return false;
  const staleMinutes = readThreshold(specs, "staleMinutes", "staleMinutes");
  const sampledAt = new Date(sample.sampledAt).getTime();
  return Number.isFinite(sampledAt) && Date.now() - sampledAt > staleMinutes * 60_000;
}

export function toBarWidth(value) {
  return `${clampPercent(value)}%`;
}
