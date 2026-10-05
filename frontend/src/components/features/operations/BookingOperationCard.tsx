import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { CalendarClock, ClipboardCheck, History, Loader2, PackageCheck, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { BookingStatusBadge } from "../../BookingStatusBadge.js";
import type { BookingAction, BookingRecord } from "../../../types/booking.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

export interface BookingOperationCardProps {
  booking: BookingRecord;
  isStaff: boolean;
  isOwner?: boolean;
  busy?: boolean;
  onAction: (action: BookingAction, booking: BookingRecord) => void;
  onOpenHistory: (booking: BookingRecord) => void;
  onCancel?: (booking: BookingRecord) => void;
  onPayment?: (booking: BookingRecord) => void;
}

export const BookingOperationCard: React.FC<BookingOperationCardProps> = ({
  booking, isStaff, isOwner = false, busy = false, onAction, onOpenHistory, onCancel, onPayment
}) => {
  const { tr } = useLocale();
  return (
  <article className="operation-card">
    <header className="operation-card-header">
      <div className="operation-card-title-group">
        <span className="operation-resource-code">{booking.resource?.code || "RESOURCE"}</span>
        <h3>{booking.title}</h3>
        <p>{booking.resource?.name}</p>
      </div>
      <BookingStatusBadge status={booking.status} />
    </header>

    <div className="operation-card-grid">
      <div><span className="operation-label">{tr("ui.booked_by_0600af3f")}</span><strong>{booking.requestedBy?.fullName || "—"}</strong><small>{booking.requestedBy?.role || ""}</small></div>
      <div><span className="operation-label">{tr("ui.scheduled_time_a5418be4")}</span><strong>{formatVietnamDateTime(booking.startAt)}</strong><small>{tr("ui.to_80b69c87")}{formatVietnamDateTime(booking.endAt)}</small></div>
      <div><span className="operation-label">{tr("ui.lab_room_34bf22b1")}</span><strong>{booking.resource?.laboratory?.name || tr("ui.not_assigned_ebe3cb5d")}</strong><small>{booking.resource?.laboratory?.code || ""}</small></div>
    </div>

    {(booking.handoverCondition || booking.returnCondition || booking.actualStartAt || booking.actualEndAt) && (
      <div className="operation-evidence-grid">
        {booking.handoverCondition && <div><span>{tr("ui.condition_before_use_282cd45b")}</span><p>{booking.handoverCondition}</p>{booking.actualStartAt && <time dateTime={booking.actualStartAt}>{tr("ui.handover_3c0bcaae")}{formatVietnamDateTime(booking.actualStartAt)}</time>}</div>}
        {booking.returnCondition && <div><span>{tr("ui.condition_after_use_ad476ecd")}</span><p>{booking.returnCondition}</p>{booking.actualEndAt && <time dateTime={booking.actualEndAt}>{tr("ui.return_ed612db7")}{formatVietnamDateTime(booking.actualEndAt)}</time>}</div>}
      </div>
    )}

    {booking.physicalStateWarning && <div className="alert warning" role="status">{booking.physicalStateWarningKey ? tr(booking.physicalStateWarningKey, { status: { key: `enum.operational.${booking.physicalStateWarningParams?.status}` } }) : booking.physicalStateWarning}</div>}
    {Boolean(booking.feeAmountVnd) && <p>{tr("ui.agreed_usage_fee_38f5f31a")}<strong>{booking.feeAmountVnd?.toLocaleString("vi-VN")} {tr("ui.vnd_bf502a39")}</strong>. {booking.status === "PENDING_APPROVAL" ? tr("ui.payment_is_available_after_approval_f25ebab4") : tr("ui.open_payment_details_to_check_d508cb80")}</p>}

    <footer className="operation-card-actions">
      {onPayment && Boolean(booking.feeAmountVnd) && <button type="button" className="btn btn-secondary" onClick={() => onPayment(booking)} disabled={busy}>{tr("ui.pay_for_booking_317a349c")}</button>}
      <button type="button" className="btn btn-secondary" onClick={() => onOpenHistory(booking)} disabled={busy}><History size={15} /> {tr("ui.history_0a235708")}</button>
      <span className="operation-actions-spacer" aria-hidden="true" />
      {isStaff && booking.status === "PENDING_APPROVAL" && <>
        <button type="button" className="btn btn-primary" onClick={() => onAction("APPROVE", booking)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} {tr("ui.approved_272ec77c")}</button>
        <button type="button" className="btn btn-danger" onClick={() => onAction("REJECT", booking)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} {tr("ui.reject_b61a0ebc")}</button>
      </>}
      {isStaff && booking.status === "CONFIRMED" && <button type="button" className="btn btn-primary" onClick={() => onAction("CHECK_OUT", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />} {tr("ui.checked_out_f1abd0bf")}</button>}
      {isStaff && booking.status === "CHECKED_OUT" && <button type="button" className="btn btn-primary" onClick={() => onAction("RETURN", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} {tr("ui.receive_return_e099755c")}</button>}
      {isOwner && booking.resource?.category === "ROOM" && booking.status === "CHECKED_OUT" && <button type="button" className="btn btn-primary" onClick={() => onAction("SELF_RETURN", booking)} disabled={busy}><RotateCcw size={15} /> {tr("ui.return_room_complete_8e8c6af6")}</button>}
      {isStaff && booking.status === "RETURNED" && <button type="button" className="btn btn-primary" onClick={() => onAction("COMPLETE", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />} {tr("ui.completed_b0484236")}</button>}
      {!isStaff && onCancel && ["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status) && (
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => onCancel(booking)}
          disabled={busy}
        >
          {busy
            ? <Loader2 size={15} className="animate-spin" />
            : <CalendarClock size={15} />}
          {tr("ui.cancel_booking_c68ed93d")}</button>
      )}
    </footer>
  </article>
);
};
