import { apiRequest } from "../api.js";
export interface ResourceOperation { id: string; bookingId: string; loadPercent: number; occupants: number | null; startedAt: string; endedAt: string | null; stopReason: string | null }
export interface CareResource {
  id: string; code: string; name: string; category: string; capacity: number; operationalStatus: string; inspectionRequired: boolean;
  laboratory: { id: string; name: string } | null;
  profile: { roomId: string | null; intervalDays: number | null; intervalHours: number | null; intervalUses: number | null; warningPercent: number; servicedAt: string; lastMaintenanceId: string | null } | null;
  parts: Array<{ id: string; name: string; condition: string; notes: string }>;
  incidents: Array<{ id: string; title: string; status: string }>;
  maintenance: Array<{ id: string; title: string; status: string; endAt: string }>;
  checkedOutBooking: { id: string; bookingCode: string | null; endAt: string } | null;
  activeOperation: ResourceOperation | null; history: ResourceOperation[];
  lifetime: { hours: number; equivalentLoadHours: number }; sinceService: { hours: number; uses: number };
  custodyHours: number; dutyPercent: number | null;
  care: { configured: boolean; due: boolean; nearDue: boolean; progressPercent: number; dueAt: string | null; remainingHours: number | null; remainingUses: number | null };
}
export interface CareSnapshot { generatedAt: string; items: CareResource[] }
export const readResourceCare = (signal?: AbortSignal): Promise<CareSnapshot> => apiRequest("/resource-care", { signal });
export const sendResourceCare = (id: string, command: Record<string, unknown>) => apiRequest(`/resource-care/${encodeURIComponent(id)}/commands`, { method: "POST", body: JSON.stringify(command) });
