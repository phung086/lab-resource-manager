import { BookingReference } from "../../base/BookingReference";
import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { ChevronRight } from "lucide-react";
import { BookingStatusBadge } from "../../BookingStatusBadge.js";
import type { BookingRecord } from "../../../types/booking.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

export interface BookingOperationCardProps {
  booking: BookingRecord;
  busy?: boolean;
  isSelected?: boolean;
  onSelect: (booking: BookingRecord) => void;
}

export const BookingOperationCard: React.FC<BookingOperationCardProps> = ({ booking, busy = false, isSelected = false, onSelect }) => {
  const { tr } = useLocale();
  return (
    <article className={`operation-card${isSelected ? " is-selected" : ""}`} data-booking-id={booking.id}>
      <button type="button" className="operation-card-select" aria-pressed={isSelected} onClick={() => onSelect(booking)} disabled={busy}>
        <span className="operation-card-identity"><BookingReference booking={booking} /><BookingStatusBadge status={booking.status} /></span>
        <strong className="operation-card-resource">{booking.resource?.name || booking.title}</strong>
        <span className="operation-card-purpose">{booking.title}</span>
        <span className="operation-card-requester">{booking.requestedBy?.fullName || "—"} · {booking.resource?.code || "—"}</span>
        <span className="operation-card-time"><time dateTime={booking.startAt}>{formatVietnamDateTime(booking.startAt)}</time> {tr("ui.to_80b69c87")} <time dateTime={booking.endAt}>{formatVietnamDateTime(booking.endAt)}</time></span>
        <span className="operation-card-inspect">{tr("ui.home.customer.viewDetails")}<ChevronRight size={16} aria-hidden="true" /></span>
      </button>
    </article>
  );
};
