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
}) => (
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
      <div><span className="operation-label">Người đặt</span><strong>{booking.requestedBy?.fullName || "—"}</strong><small>{booking.requestedBy?.role || ""}</small></div>
      <div><span className="operation-label">Lịch dự kiến</span><strong>{formatVietnamDateTime(booking.startAt)}</strong><small>đến {formatVietnamDateTime(booking.endAt)}</small></div>
      <div><span className="operation-label">Phòng lab</span><strong>{booking.resource?.laboratory?.name || "Chưa gán"}</strong><small>{booking.resource?.laboratory?.code || ""}</small></div>
    </div>

    {(booking.handoverCondition || booking.returnCondition || booking.actualStartAt || booking.actualEndAt) && (
      <div className="operation-evidence-grid">
        {booking.handoverCondition && <div><span>Tình trạng trước sử dụng</span><p>{booking.handoverCondition}</p>{booking.actualStartAt && <time dateTime={booking.actualStartAt}>Bàn giao: {formatVietnamDateTime(booking.actualStartAt)}</time>}</div>}
        {booking.returnCondition && <div><span>Tình trạng sau sử dụng</span><p>{booking.returnCondition}</p>{booking.actualEndAt && <time dateTime={booking.actualEndAt}>Hoàn trả: {formatVietnamDateTime(booking.actualEndAt)}</time>}</div>}
      </div>
    )}

    {booking.physicalStateWarning && <div className="alert warning" role="status">{booking.physicalStateWarning}</div>}
    {Boolean(booking.feeAmountVnd) && <p>Phí sử dụng đã chốt: <strong>{booking.feeAmountVnd?.toLocaleString("vi-VN")} đ</strong>. {booking.status === "PENDING_APPROVAL" ? "Thanh toán sau khi lịch được duyệt." : "Xem chi tiết thanh toán để kiểm tra trạng thái đối soát."}</p>}

    <footer className="operation-card-actions">
      {onPayment && Boolean(booking.feeAmountVnd) && <button type="button" className="btn btn-secondary" onClick={() => onPayment(booking)} disabled={busy}>Thanh toán lịch đặt</button>}
      <button type="button" className="btn btn-secondary" onClick={() => onOpenHistory(booking)} disabled={busy}><History size={15} /> Lịch sử</button>
      <span className="operation-actions-spacer" aria-hidden="true" />
      {isStaff && booking.status === "PENDING_APPROVAL" && <>
        <button type="button" className="btn btn-primary" onClick={() => onAction("APPROVE", booking)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Duyệt
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onAction("REJECT", booking)} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Từ chối
        </button>
      </>}
      {isStaff && booking.status === "CONFIRMED" && <button type="button" className="btn btn-primary" onClick={() => onAction("CHECK_OUT", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />} Bàn giao
      </button>}
      {isStaff && booking.status === "CHECKED_OUT" && <button type="button" className="btn btn-primary" onClick={() => onAction("RETURN", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Nhận hoàn trả
      </button>}
      {isOwner && booking.resource?.category === "ROOM" && booking.status === "CHECKED_OUT" && <button type="button" className="btn btn-primary" onClick={() => onAction("SELF_RETURN", booking)} disabled={busy}><RotateCcw size={15} /> Trả phòng và hoàn tất</button>}
      {isStaff && booking.status === "RETURNED" && <button type="button" className="btn btn-primary" onClick={() => onAction("COMPLETE", booking)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />} Hoàn tất
      </button>}
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
          Hủy booking
        </button>
      )}
    </footer>
  </article>
);
