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
    label: "Đã xác nhận",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0"
  },
  CHECKED_OUT: {
    label: "Đang sử dụng",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  RETURNED: {
    label: "Đã hoàn trả",
    bg: "#eef2ff",
    text: "#3730a3",
    border: "#c7d2fe"
  },
  COMPLETED: {
    label: "Hoàn tất",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1"
  },
  REJECTED: {
    label: "Từ chối",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca"
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "#f8fafc",
    text: "#475569",
    border: "#e2e8f0"
  },
  // Compatibility lowercase mappings
  pending: {
    label: "Chờ duyệt",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a"
  },
  approved: {
    label: "Đã xác nhận",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0"
  },
  checked_out: {
    label: "Đang sử dụng",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  completed: {
    label: "Hoàn tất",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1"
  },
  rejected: {
    label: "Từ chối",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca"
  },
  cancelled: {
    label: "Đã hủy",
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
    label: "Đã đặt",
    bg: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  MAINTENANCE: {
    label: "Bảo trì",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a"
  },
  AVAILABLE: {
    label: "Trống",
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
        {config.label}
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
        {config.label}
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
