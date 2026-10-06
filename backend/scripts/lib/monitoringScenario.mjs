import { deriveTelemetryState, evaluateTelemetryConditions, resolveMonitoringThresholds } from "../../src/services/telemetryService.js";

/** Isolated preview: no Prisma, ingestion, network, credentials or business writes. */
export function buildMonitoringScenario({ now = new Date(), intervalSeconds = 5 } = {}) {
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(intervalSeconds) || intervalSeconds < 3 || intervalSeconds > 10) {
    throw new Error("Scenario requires a valid time and a 3–10 second interval");
  }
  const resource = {
    id: "simulation-preview-room",
    operationalStatus: "AVAILABLE",
    monitoringThreshold: { temperatureWarningC: 32, temperatureCriticalC: 40 },
    laboratory: { monitoringThreshold: { humidityMinPercent: 30, humidityMaxPercent: 70, staleMinutes: 15 } }
  };
  const resolution = resolveMonitoringThresholds(resource);
  const phases = [
    { scenario: "STANDBY", active: false, temperatureC: 25, online: true },
    { scenario: "USAGE", active: true, temperatureC: 28, online: true },
    { scenario: "OVERHEAT", active: true, temperatureC: 41, online: true },
    { scenario: "DISCONNECTED", active: true, temperatureC: 28, online: false },
    { scenario: "RECOVERED", active: true, temperatureC: 28, online: true },
    { scenario: "ENDED", active: false, temperatureC: 25, online: true }
  ];
  let elapsedUsageSeconds = 0;
  const frames = phases.map((phase, index) => {
    if (index > 0 && phases[index - 1].active) elapsedUsageSeconds += intervalSeconds;
    const timestamp = new Date(now.getTime() + index * intervalSeconds * 1000);
    const sample = { sampledAt: timestamp, temperatureC: phase.temperatureC, humidityPercent: 50, online: phase.online, verifiedSignals: [] };
    return {
      provenance: "SIMULATION_PREVIEW",
      scenario: phase.scenario,
      hypotheticalUsageActive: phase.active,
      simulatedElapsedUsageSeconds: elapsedUsageSeconds,
      sample: { ...sample, sampledAt: timestamp.toISOString() },
      monitoring: deriveTelemetryState(resource, sample, timestamp, resolution),
      previewConditions: evaluateTelemetryConditions(sample, resolution.values)
    };
  });
  return {
    provenance: "SIMULATION_PREVIEW",
    disclaimer: "Synthetic scenario only. No hardware readings, persisted alerts, incidents, bookings or physical state changes.",
    intervalSeconds,
    thresholds: resolution,
    inputOperationalStatus: resource.operationalStatus,
    frames
  };
}
