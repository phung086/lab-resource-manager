import type { BookingRecord } from "../../../types/booking";
import type { BookingQueueSummary, IncidentQueueSummary } from "../../../types/queue";

export type HomeNavigate = (tab: string, params?: Record<string, string>) => void;
export interface HomeResource {
  id: string; code: string; name: string; category?: string; operationalStatus: string;
  capacity?: number; bookingState?: string; laboratory?: { name: string; code: string } | null;
}
export interface TeachingGroup {
  id: string; code: string; name: string; term: string;
  lecturer: { fullName: string }; _count: { members: number; activities: number };
}
export interface HomeNotice {
  id: string; title: string; message: string; readAt?: string; createdAt: string;
  type?: string; titleKey?: string; messageKey?: string; messageParams?: Record<string, unknown>;
}
export interface HomeMaintenance { id: string; title: string; status: string; resource?: { name: string } }
export interface HomeIncident { id: string; title: string; status: string; severity?: string; resource?: { name: string } }
export interface RoleHomeProps {
  user: { id: string; fullName: string; role: string };
  bookings: BookingRecord[]; resources: HomeResource[]; notifications: HomeNotice[];
  maintenance: HomeMaintenance[]; incidents: HomeIncident[];
  bookingSummary: BookingQueueSummary | null; incidentSummary: IncidentQueueSummary | null;
  users: { id: string; role: string; isActive: boolean }[];
  dashboard?: { summary: { totalResources: number; criticalIncidentCount: number } } | null;
  groups: TeachingGroup[]; groupsLoading: boolean; groupsError: string; onRetryGroups: () => void;
  onNavigate: HomeNavigate; onSearch: (query: string, category?: string) => void;
  onCalendar: (resourceId?: string) => void;
}
