import { apiRequest } from "../api.js";
import type { AuditEventFilters, SystemAuditEventPage } from "../types/audit";

const AUDIT_ACTIONS = [
  "USER_CREATED",
  "USER_PROFILE_CHANGED",
  "USER_REMOVED",
  "PASSWORD_VERIFICATION_REQUESTED",
  "ACCOUNT_CREDENTIAL_CHANGED",
  "LOYALTY_POLICY_CHANGED",
  "USER_ROLE_CHANGED",
  "USER_ACTIVATION_CHANGED",
  "LAB_ASSIGNMENT_ADDED",
  "LAB_ASSIGNMENT_REMOVED",
  "RESOURCE_PRICING_CHANGED",
  "LAB_BOOKING_POLICY_CHANGED",
  "GUEST_ACCOUNT_CREATED",
  "GUEST_ACCOUNT_REUSED",
  "PAYMENT_CHARGE_CREATED",
  "PAYMENT_RECONCILIATION_RESOLVED"
] as const;

const AUDIT_TARGET_TYPES = [
  "LOYALTY_POLICY",
  "LABORATORY",
  "USER",
  "LAB_ASSIGNMENT",
  "RESOURCE",
  "PRICING_RULE",
  "PAYMENT"
] as const;

export const AUDIT_ACTION_OPTIONS: readonly string[] = AUDIT_ACTIONS;
export const AUDIT_TARGET_TYPE_OPTIONS: readonly string[] = AUDIT_TARGET_TYPES;

export const AUDIT_PAGE_SIZE = 20;

export function buildAuditQuery(filters: AuditEventFilters, page: number, limit = AUDIT_PAGE_SIZE): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("limit", String(Math.max(1, Math.min(100, limit))));
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) params.set(key, value.trim());
  });
  return params.toString();
}

export async function listAuditEvents(filters: AuditEventFilters, page: number, signal?: AbortSignal, limit: number = AUDIT_PAGE_SIZE): Promise<SystemAuditEventPage> {
  const data = await apiRequest(`/audit-events?${buildAuditQuery(filters, page, limit)}`, { signal });
  const body = (data || {}) as Partial<SystemAuditEventPage>;
  const pagination = body.pagination || { page, limit: AUDIT_PAGE_SIZE, total: 0, totalPages: 0 };
  return {
    events: Array.isArray(body.events) ? body.events : [],
    pagination: {
      page: Number(pagination.page) || page,
      limit: Number(pagination.limit) || AUDIT_PAGE_SIZE,
      total: Number(pagination.total) || 0,
      totalPages: Number(pagination.totalPages) || 0
    }
  };
}
