import type { SystemAuditEvent } from "../../../types/audit";

/** Sensitive keys are stripped by the backend; the UI must not render them either. */
const SENSITIVE_KEY = /password|secret|token|otp|codeHash|hash/i;

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => sanitizeAuditValue(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (SENSITIVE_KEY.test(key)) return;
      out[key] = sanitizeAuditValue(entry);
    });
    return out;
  }
  return value;
}

export function formatAuditState(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const safe = sanitizeAuditValue(value);
  if (safe === null || safe === undefined) return "—";
  if (typeof safe === "string") return safe;
  try {
    return JSON.stringify(safe, null, 2);
  } catch {
    return "—";
  }
}

export function auditTargetLabel(event: SystemAuditEvent): string {
  if (event.resource?.name) return event.resource.name;
  if (event.laboratory?.name) return event.laboratory.name;
  if (event.targetType === "USER" && event.actor?.fullName) return event.actor.fullName;
  return event.targetId || "—";
}

export function auditTargetKind(event: SystemAuditEvent, translateType?: (type: string) => string): string {
  if (event.resource) return event.resource.code;
  if (event.laboratory) return event.laboratory.code;
  return translateType ? translateType(event.targetType) : event.targetType;
}

/** A date input (yyyy-mm-dd) becomes an ISO instant in Vietnam time. */
export function vietnamDateStart(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function vietnamDateEnd(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T23:59:59+07:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
