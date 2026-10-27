import React from "react";
import { useLocale } from "../providers/LocaleProvider";
import { BOOKING_STATUS_LEGEND_ORDER, BOOKING_STATUS_BADGE_STYLE, BOOKING_STATUS_LABEL_KEY } from "./bookingStatusTokens";

/**
 * Collapsible legend for the seven canonical booking statuses.
 * Colors and labels come from BookingStatusBadge so badge and legend can never drift apart.
 */
export const BookingStatusLegend: React.FC = () => {
  const { tr } = useLocale();
  return (
    <details className="booking-status-legend">
      <summary>{tr("ui.bookings.statusLegend")}</summary>
      <div className="booking-status-legend-items">
        {BOOKING_STATUS_LEGEND_ORDER.map(status => {
          const style = BOOKING_STATUS_BADGE_STYLE(status);
          const labelKey = BOOKING_STATUS_LABEL_KEY(status);
          if (!style || !labelKey) return null;
          return <span key={status} className="booking-status-legend-chip" style={style}>{tr(labelKey)}</span>;
        })}
      </div>
    </details>
  );
};
