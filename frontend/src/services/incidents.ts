import { apiRequest } from "../api.js";
import type { IncidentRecord, IncidentSeverity } from "../types/incident";

export async function listIncidents(): Promise<IncidentRecord[]> {
  const data = await apiRequest("/incidents");
  return Array.isArray(data) ? data : [];
}

export async function reportIncident(input: {
  resourceId: string;
  bookingId?: string | null;
  severity: IncidentSeverity;
  category?: string | null;
  title: string;
  description: string;
}): Promise<IncidentRecord> {
  return apiRequest("/incidents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function triageIncident(id: string): Promise<IncidentRecord> {
  return apiRequest(`/incidents/${id}/triage`, { method: "POST", body: JSON.stringify({}) });
}

export async function investigateIncident(id: string): Promise<IncidentRecord> {
  return apiRequest(`/incidents/${id}/investigate`, { method: "POST", body: JSON.stringify({}) });
}

export async function resolveIncident(id: string, resolution: string): Promise<IncidentRecord> {
  return apiRequest(`/incidents/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution })
  });
}
