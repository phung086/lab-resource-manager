export type AuditTargetType =
  | "LOYALTY_POLICY"
  | "LABORATORY"
  | "USER"
  | "LAB_ASSIGNMENT"
  | "RESOURCE"
  | "PRICING_RULE"
  | "PAYMENT";

export interface AuditActorSummary {
  id: string;
  fullName: string;
  role: string;
}

export interface AuditLabSummary {
  id: string;
  code: string;
  name: string;
}

export interface AuditResourceSummary {
  id: string;
  code: string;
  name: string;
}

export interface SystemAuditEvent {
  id: string;
  actorId: string | null;
  actorRoleSnapshot: string | null;
  actor: AuditActorSummary | null;
  action: string;
  targetType: AuditTargetType | string;
  targetId: string | null;
  labId: string | null;
  laboratory: AuditLabSummary | null;
  resourceId: string | null;
  resource: AuditResourceSummary | null;
  beforeState: unknown;
  afterState: unknown;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface SystemAuditEventPage {
  events: SystemAuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditEventFilters {
  action?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  labId?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}
