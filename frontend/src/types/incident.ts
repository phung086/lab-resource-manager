export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "reported" | "triaged" | "assigned" | "investigating" | "resolved" | "verified" | "closed";

export interface IncidentRecord {
  id: string;
  resourceId: string;
  bookingId?: string | null;
  reportedById?: string | null;
  assignedToId?: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category?: string | null;
  title: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
  resource?: {
    id: string;
    code: string;
    name: string;
    laboratoryId?: string | null;
    operationalStatus?: string;
  };
  reportedBy?: { id: string; fullName: string; role: string };
  assignedTo?: { id: string; fullName: string; role: string } | null;
}
