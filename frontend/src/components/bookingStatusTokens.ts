import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import type React from "react";

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING_APPROVAL: {
    label: CANONICAL_BOOKING_STATUS_LABELS.PENDING_APPROVAL,
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a"
  },
  CONFIRMED: {
    label: "ui.confirmed_e72d13e3",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0"
  },
  CHECKED_OUT: {
    label: "ui.in_use_a07a3647",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  RETURNED: {
    label: "ui.returned_fd3eb4fb",
    bg: "#eef2ff",
    text: "#3730a3",
    border: "#c7d2fe"
  },
  COMPLETED: {
    label: "ui.completed_b0484236",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1"
  },
  REJECTED: {
    label: "ui.reject_b61a0ebc",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca"
  },
  CANCELLED: {
    label: "ui.cancelled_2f777a90",
    bg: "#f8fafc",
    text: "#475569",
    border: "#e2e8f0"
  },
  // Compatibility lowercase mappings
  pending: {
    label: "ui.pending_approval_6af96613",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a"
  },
  approved: {
    label: "ui.confirmed_e72d13e3",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0"
  },
  checked_out: {
    label: "ui.in_use_a07a3647",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  completed: {
    label: "ui.completed_b0484236",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1"
  },
  rejected: {
    label: "ui.reject_b61a0ebc",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca"
  },
  cancelled: {
    label: "ui.cancelled_2f777a90",
    bg: "#f8fafc",
    text: "#475569",
    border: "#e2e8f0"
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
