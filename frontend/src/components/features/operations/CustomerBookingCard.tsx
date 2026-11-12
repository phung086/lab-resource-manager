import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, CreditCard, Hourglass, MapPin } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { BookingStatusBadge } from '../../BookingStatusBadge';
import { BookingReference } from '../../base/BookingReference';
import { formatVietnamDateTime, toVietnamTimeString } from '../../../utils/timezone';
import type { BookingOperationCardProps } from './BookingOperationCard';
import type { BookingRecord } from '../../../types/booking';
import '../../../styles/customer-booking.css';

// Fixed hold deadline: min(paymentDueAt, startAt); null once expired — never a settlement signal.
function useHoldRemaining(paymentDueAt?: string | null, startAt?: string, asOf?: string) {
  const due = paymentDueAt ? Date.parse(paymentDueAt) : NaN;
  const start = startAt ? Date.parse(startAt) : NaN;
  const deadline = Number.isFinite(due) ? (Number.isFinite(start) ? Math.min(due, start) : due) : NaN;
  const [now, setNow] = useState(() => Date.parse(asOf || '') || Date.now());
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const receivedAt = performance.now();
    const serverNow = Date.parse(asOf || '') || Date.now();
    const update = () => setNow(serverNow + performance.now() - receivedAt);
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline, asOf]);
  if (!Number.isFinite(deadline)) return { deadline: null, remaining: null };
  const seconds = Math.ceil((deadline - now) / 1000);
  return { deadline, remaining: seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : null };
}

export function CustomerBookingCard({ booking, busy, isSelected, onSelect, onPayment, asOf }: BookingOperationCardProps & {
  onPayment?: (booking: BookingRecord) => void;
  asOf?: string;
}) {
  const { tr, locale } = useLocale();
  const pendingPayment = booking.status === 'PENDING_APPROVAL' && Boolean(booking.paymentDueAt);
  const { deadline, remaining: holdRemaining } = useHoldRemaining(pendingPayment ? booking.paymentDueAt : null, booking.startAt, asOf);
  const pay = pendingPayment && Boolean(holdRemaining) && onPayment;
  const tone = pendingPayment ? 'payment' : booking.status === 'CHECKED_OUT' ? 'active' : booking.status === 'CONFIRMED' ? 'ready' : 'history';
  const delivery = booking.fulfillmentSnapshot?.mode === 'HOME_DELIVERY';
  const action = booking.status === 'CONFIRMED' && Date.parse(booking.endAt) > (Date.parse(asOf || '') || Date.now())
    ? (delivery ? 'ui.customerBooking.deliveryAction' : 'ui.mySchedule.handoverAction')
    : booking.status === 'CHECKED_OUT' ? 'ui.mySchedule.returnAction' : 'ui.home.customer.viewDetails';
  const date = new Date(booking.startAt);
  const validDate = Number.isFinite(date.getTime());
  const options = { timeZone: 'Asia/Ho_Chi_Minh' };
  const timer = pendingPayment && holdRemaining && <span className="ticket-deadline" role="timer">
    <Hourglass size={13} aria-hidden="true" />{tr('ui.mySchedule.paymentCountdown', { remaining: holdRemaining })}
  </span>;
  return <article className={`operation-card customer-booking-ticket${isSelected ? ' is-selected' : ''}`} data-booking-id={booking.id} data-tone={tone}>
    <button type="button" className="operation-card-select" aria-pressed={isSelected} disabled={busy} onClick={() => onSelect(booking)}>
      <span className="ticket-heading"><BookingReference booking={booking} /><BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt} /></span>
      <span className="ticket-main">
        <time className="ticket-date" dateTime={booking.startAt}>
          <span>{validDate ? date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB', { ...options, month: 'short' }) : '—'}</span>
          <strong>{validDate ? date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB', { ...options, day: '2-digit' }) : '—'}</strong>
          <small>{validDate ? date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB', { ...options, year: 'numeric' }) : '—'}</small>
        </time>
        <span className="ticket-description"><strong className="operation-card-resource">{booking.resource?.name || booking.title}</strong><span className="ticket-time"><Clock3 size={14} aria-hidden="true" />{toVietnamTimeString(booking.startAt)}–{toVietnamTimeString(booking.endAt)}</span><span className="ticket-location"><MapPin size={14} aria-hidden="true" />{booking.resource?.laboratory?.name || tr('ui.not_assigned_ebe3cb5d')}</span></span>
      </span>
      <span className="ticket-footer"><span className="ticket-fee">{!pay && timer}{typeof booking.feeAmountVnd === 'number' && <><small>{tr('ui.bookingStudio.fee')}</small><strong>{new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB').format(booking.feeAmountVnd)} ₫</strong></>}</span><span className="operation-card-inspect">{tr(action)}<ArrowUpRight size={18} aria-hidden="true" /></span></span>
    </button>
    {pay && deadline !== null && <div className="customer-ticket-payment">
      <div className="customer-payment-deadline">
        <time dateTime={new Date(deadline).toISOString()}>{tr('ui.customerBooking.payBefore', { time: formatVietnamDateTime(new Date(deadline).toISOString()) })}</time>
        {timer}
      </div>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => pay(booking)}>
        <CreditCard size={16} aria-hidden="true" />{tr('ui.pay_for_booking_317a349c')}
      </button>
    </div>}
  </article>;
}
