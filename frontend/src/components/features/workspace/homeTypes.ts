import type { ReactNode } from "react";
import type { BookingRecord } from "../../../types/booking";
import type { BookingQueueSummary, IncidentQueueSummary } from "../../../types/queue";

export type HomeNavigate = (tab: string, params?: Record<string, string>) => void;
export interface HomeResource {
  rental?: { hourlyRateVnd: number; currency: string } | null;
  id: string; code: string; name: string; category?: string; operationalStatus: string;
  media?: { kind: string; url: string; alt?: string }[]; capacity?: number; bookingState?: string; laboratory?: { name: string; code: string } | null;
}
export interface HomeNotice {
  id: string; title: string; message: string; readAt?: string; createdAt: string;
  type?: string; titleKey?: string; messageKey?: string; messageParams?: Record<string, unknown>;
}
export interface HomeMaintenance { id: string; title: string; status: string; resource?: { name: string } }
export interface HomeIncident { id: string; title: string; status: string; severity?: string; resource?: { name: string } }
export interface RoleHomeProps {
  user: { id: string; fullName: string; email?: string; role: string };
  bookings: BookingRecord[]; resources: HomeResource[]; notifications: HomeNotice[];
  maintenance: HomeMaintenance[]; incidents: HomeIncident[];
  bookingSummary: BookingQueueSummary | null; incidentSummary: IncidentQueueSummary | null;
  users: { id: string; role: string; isActive: boolean }[];
  dashboard?: { summary: { totalResources: number; criticalIncidentCount: number } } | null;
  onNavigate: HomeNavigate; onSearch: (query: string, category?: string) => void;
  onCalendar: (resourceId?: string) => void;
  analytics?: ReactNode;
}
