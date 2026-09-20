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
    text: "#b45309",
    border: "rgba(245, 158, 11, 0.3)"
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#047857",
    border: "rgba(16, 185, 129, 0.3)"
  },
  CHECKED_OUT: {
    label: "Đang sử dụng",
    bg: "rgba(14, 165, 233, 0.12)",
    text: "#0369a1",
    border: "rgba(14, 165, 233, 0.3)"
  },
  RETURNED: {
    label: "Đã hoàn trả",
    bg: "rgba(99, 102, 241, 0.12)",
    text: "#4338ca",
    border: "rgba(99, 102, 241, 0.3)"
  },
  COMPLETED: {
    label: "Hoàn tất",
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#334155",
    border: "rgba(100, 116, 139, 0.3)"
  },
  REJECTED: {
    label: "Từ chối",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#b91c1c",
    border: "rgba(239, 68, 68, 0.3)"
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "rgba(148, 163, 184, 0.12)",
    text: "#475569",
    border: "rgba(148, 163, 184, 0.3)"
  },
  // Compatibility lowercase mappings
  pending: {
    label: "Chờ duyệt",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#b45309",
    border: "rgba(245, 158, 11, 0.3)"
  },
  approved: {
    label: "Đã xác nhận",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#047857",
    border: "rgba(16, 185, 129, 0.3)"
  },
  checked_out: {
    label: "Đang sử dụng",
    bg: "rgba(14, 165, 233, 0.12)",
    text: "#0369a1",
    border: "rgba(14, 165, 233, 0.3)"
  },
  completed: {
    label: "Hoàn tất",
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#334155",
    border: "rgba(100, 116, 139, 0.3)"
  },
  rejected: {
    label: "Từ chối",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#b91c1c",
    border: "rgba(239, 68, 68, 0.3)"
  },
  cancelled: {
    label: "Đã hủy",
    bg: "rgba(148, 163, 184, 0.12)",
    text: "#475569",
    border: "rgba(148, 163, 184, 0.3)"
  }
};

const OCCUPANCY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  BOOKED: {
    label: "Đã đặt",
    bg: "rgba(219, 234, 254, 0.8)",
    text: "#1e40af",
    border: "#bfdbfe"
  },
  MAINTENANCE: {
    label: "Bảo trì",
    bg: "rgba(254, 226, 226, 0.8)",
    text: "#991b1b",
    border: "#fecaca"
  },
  AVAILABLE: {
    label: "Trống",
    bg: "rgba(220, 252, 231, 0.8)",
    text: "#166534",
    border: "#bbf7d0"
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
