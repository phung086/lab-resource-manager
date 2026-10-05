import { useLocale } from '../providers/LocaleProvider';
import React from "react";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";

export interface BookingStatusBadgeProps {
  status?: string;
  occupancy?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
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

const OCCUPANCY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  BOOKED: {
    label: "ui.reserved_f20b6ee2",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  MAINTENANCE: {
    label: "ui.maintenance_8ad424bd",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a"
  },
  AVAILABLE: {
    label: "ui.available_b99ed3dd",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0"
  }
};

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  occupancy,
  className = ""
}) => {
  const { tr } = useLocale();
  // If canonical status is provided, use it
  if (status && STATUS_CONFIG[status]) {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className={`status-badge-inline ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: "1.2",
          backgroundColor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`
        }}
      >
        {tr(config.label)}
      </span>
    );
  }

  // Otherwise, fallback to occupancy badge if provided
  if (occupancy && OCCUPANCY_CONFIG[occupancy]) {
    const config = OCCUPANCY_CONFIG[occupancy];
    return (
      <span
        className={`occupancy-badge-inline ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: "1.2",
          backgroundColor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`
        }}
      >
        {tr(config.label)}
      </span>
    );
  }

  if (status) {
    return (
      <span
        className={`status-badge-inline ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: "1.2",
          backgroundColor: "rgba(100, 116, 139, 0.1)",
          color: "#475569",
          border: "1px solid rgba(100, 116, 139, 0.2)"
        }}
      >
        {status}
      </span>
    );
  }

  return null;
};
