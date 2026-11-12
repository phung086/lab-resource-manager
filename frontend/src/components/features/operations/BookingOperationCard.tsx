import { BookingReference } from "../../base/BookingReference";
import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { ArrowUpRight, CalendarDays, DoorOpen, Microscope, UserRound } from "lucide-react";
import { BookingStatusBadge } from "../../BookingStatusBadge.js";
import type { BookingRecord } from "../../../types/booking.js";
import { formatVietnamDateTime, toVietnamTimeString } from "../../../utils/timezone.js";

export interface BookingOperationCardProps {
  booking: BookingRecord;
  busy?: boolean;
  isSelected?: boolean;
  onSelect: (booking: BookingRecord) => void;
}

export const BookingOperationCard: React.FC<BookingOperationCardProps> = ({ booking, busy = false, isSelected = false, onSelect }) => {
  const { tr } = useLocale();
  const Icon = booking.resource?.category === 'ROOM' ? DoorOpen : Microscope;
  const person = booking.requestedBy?.fullName || booking.contactSnapshot?.fullName;
  return (
    <article className={`operation-card${isSelected ? " is-selected" : ""}`} data-booking-id={booking.id}>
      <button type="button" className="operation-card-select" aria-pressed={isSelected} onClick={() => onSelect(booking)} disabled={busy}>
        <span className="operation-card-identity"><BookingReference booking={booking} /><BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt} /></span>
        <span className="booking-record-identity"><span className="booking-record-avatar"><Icon size={25} aria-hidden="true" /></span><span><strong className="operation-card-resource">{booking.resource?.name || booking.title}</strong><small>{booking.resource?.code}</small></span></span>
        <span className="operation-card-time"><CalendarDays size={15} aria-hidden="true" /><time dateTime={booking.startAt}>{formatVietnamDateTime(booking.startAt)}</time> – <time dateTime={booking.endAt}>{toVietnamTimeString(booking.endAt)}</time></span>
        {booking.title && booking.title !== booking.resource?.name && <span className="booking-record-purpose">{booking.title}</span>}
        <span className="booking-record-footer">{person && <span className="booking-record-person"><UserRound size={14} aria-hidden="true" />{person}</span>}<span className="operation-card-inspect">{tr("ui.home.customer.viewDetails")}<ArrowUpRight size={16} aria-hidden="true" /></span></span>
      </button>
    </article>
  );
};
