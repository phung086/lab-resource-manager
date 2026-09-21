import React from "react";

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
    label: "Chờ duyệt",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fbbf24",
    border: "rgba(245, 158, 11, 0.3)"
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#6ee7b7",
    border: "rgba(16, 185, 129, 0.3)"
  },
  CHECKED_OUT: {
    label: "Đang sử dụng",
    bg: "rgba(14, 165, 233, 0.12)",
    text: "#7dd3fc",
    border: "rgba(14, 165, 233, 0.3)"
  },
  RETURNED: {
    label: "Đã hoàn trả",
    bg: "rgba(99, 102, 241, 0.12)",
    text: "#c4b5fd",
    border: "rgba(99, 102, 241, 0.3)"
  },
  COMPLETED: {
    label: "Hoàn tất",
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#cbd5e1",
    border: "rgba(100, 116, 139, 0.3)"
  },
  REJECTED: {
    label: "Từ chối",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#fca5a5",
    border: "rgba(239, 68, 68, 0.3)"
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "rgba(148, 163, 184, 0.12)",
    text: "#cbd5e1",
    border: "rgba(148, 163, 184, 0.3)"
  },
  // Compatibility lowercase mappings
  pending: {
    label: "Chờ duyệt",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fbbf24",
    border: "rgba(245, 158, 11, 0.3)"
  },
  approved: {
    label: "Đã xác nhận",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#6ee7b7",
    border: "rgba(16, 185, 129, 0.3)"
  },
  checked_out: {
    label: "Đang sử dụng",
    bg: "rgba(14, 165, 233, 0.12)",
    text: "#7dd3fc",
    border: "rgba(14, 165, 233, 0.3)"
  },
  completed: {
    label: "Hoàn tất",
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#cbd5e1",
    border: "rgba(100, 116, 139, 0.3)"
  },
  rejected: {
    label: "Từ chối",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#fca5a5",
    border: "rgba(239, 68, 68, 0.3)"
  },
  cancelled: {
    label: "Đã hủy",
    bg: "rgba(148, 163, 184, 0.12)",
    text: "#cbd5e1",
    border: "rgba(148, 163, 184, 0.3)"
  }
};

const OCCUPANCY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  BOOKED: {
    label: "Đã đặt",
    bg: "rgba(37, 99, 235, 0.14)",
    text: "#bfdbfe",
    border: "rgba(96, 165, 250, 0.35)"
  },
  MAINTENANCE: {
    label: "Bảo trì",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fcd34d",
    border: "rgba(245, 158, 11, 0.35)"
  },
  AVAILABLE: {
    label: "Trống",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#6ee7b7",
    border: "rgba(16, 185, 129, 0.35)"
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
