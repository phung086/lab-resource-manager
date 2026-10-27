import { useLocale } from '../providers/LocaleProvider';
import React from "react";
import { STATUS_CONFIG } from "./bookingStatusTokens";

export interface BookingStatusBadgeProps {
  status?: string;
  paymentDueAt?: string | null;
  occupancy?: string;
  className?: string;
}

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
  paymentDueAt,
  occupancy,
  className = ""
}) => {
  const { tr } = useLocale();
  // If canonical status is provided, use it
  if (status && STATUS_CONFIG[status]) {
    const config = status === 'PENDING_APPROVAL' && paymentDueAt ? { ...STATUS_CONFIG.PENDING_APPROVAL, label: 'ui.paymentHold.pending' } : STATUS_CONFIG[status];
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
