import { apiRequest } from "../api.js";
import type { DashboardPayload, TelemetryResourceView } from "../types/telemetry";

export async function getDashboard(): Promise<DashboardPayload> {
  return apiRequest("/dashboard");
}

export async function getTelemetry(resourceId?: string): Promise<TelemetryResourceView[]> {
  const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : "";
  const data = await apiRequest(`/telemetry${query}`);
  return Array.isArray(data) ? data : [];
}

export async function acknowledgeMonitoringAlert(alertId: string): Promise<void> {
  await apiRequest(`/telemetry/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
