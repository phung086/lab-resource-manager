import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import type React from "react";

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING_APPROVAL: {
    label: CANONICAL_BOOKING_STATUS_LABELS.PENDING_APPROVAL,
    bg: "var(--state-attention-bg, #fff4df)",
    text: "var(--state-attention-ink, #875313)",
    border: "var(--state-attention-line, #ebd5a6)"
  },
  CONFIRMED: {
    label: "ui.confirmed_e72d13e3",
    bg: "var(--state-positive-bg, #e8f6ee)",
    text: "var(--state-positive-ink, #17613d)",
    border: "var(--state-positive-line, #bfe3cc)"
  },
  CHECKED_OUT: {
    label: "ui.in_use_a07a3647",
    bg: "var(--state-info-bg, #eaf1ff)",
    text: "var(--state-info-ink, #2357ab)",
    border: "var(--state-info-line, #c7d8f5)"
  },
  RETURNED: {
    label: "ui.returned_fd3eb4fb",
    bg: "var(--state-violet-bg, #f0ebfc)",
    text: "var(--state-violet-ink, #6545a3)",
    border: "var(--state-violet-line, #d9ccef)"
  },
  COMPLETED: {
    label: "ui.completed_b0484236",
    bg: "var(--state-neutral-bg, #f0f3f8)",
    text: "var(--state-neutral-ink, #526176)",
    border: "var(--state-neutral-line, #d9e0eb)"
  },
  REJECTED: {
    label: "ui.reject_b61a0ebc",
    bg: "var(--state-danger-bg, #fcecef)",
    text: "var(--state-danger-ink, #a3374b)",
    border: "var(--state-danger-line, #eec7d0)"
  },
  CANCELLED: {
    label: "ui.cancelled_2f777a90",
    bg: "var(--state-neutral-bg, #f0f3f8)",
    text: "var(--state-neutral-ink, #526176)",
    border: "var(--state-neutral-line, #d9e0eb)"
  },
  // Compatibility lowercase mappings
  pending: {
    label: "ui.pending_approval_6af96613",
    bg: "var(--state-attention-bg, #fff4df)",
    text: "var(--state-attention-ink, #875313)",
    border: "var(--state-attention-line, #ebd5a6)"
  },
  approved: {
    label: "ui.confirmed_e72d13e3",
    bg: "var(--state-positive-bg, #e8f6ee)",
    text: "var(--state-positive-ink, #17613d)",
    border: "var(--state-positive-line, #bfe3cc)"
  },
  checked_out: {
    label: "ui.in_use_a07a3647",
    bg: "var(--state-info-bg, #eaf1ff)",
    text: "var(--state-info-ink, #2357ab)",
    border: "var(--state-info-line, #c7d8f5)"
  },
  completed: {
    label: "ui.completed_b0484236",
    bg: "var(--state-neutral-bg, #f0f3f8)",
    text: "var(--state-neutral-ink, #526176)",
    border: "var(--state-neutral-line, #d9e0eb)"
  },
  rejected: {
    label: "ui.reject_b61a0ebc",
    bg: "var(--state-danger-bg, #fcecef)",
    text: "var(--state-danger-ink, #a3374b)",
    border: "var(--state-danger-line, #eec7d0)"
  },
  cancelled: {
    label: "ui.cancelled_2f777a90",
    bg: "var(--state-neutral-bg, #f0f3f8)",
    text: "var(--state-neutral-ink, #526176)",
    border: "var(--state-neutral-line, #d9e0eb)"
  }
};

// Canonical order for the shared status legend; single source is STATUS_CONFIG above.
export const BOOKING_STATUS_LEGEND_ORDER = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_OUT",
  "RETURNED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED"
] as const;

export const BOOKING_STATUS_BADGE_STYLE = (status: string): React.CSSProperties | null => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return { backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` };
};

export const BOOKING_STATUS_LABEL_KEY = (status: string): string | null => STATUS_CONFIG[status]?.label ?? null;
