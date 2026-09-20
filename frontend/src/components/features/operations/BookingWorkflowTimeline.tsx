import React from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { BookingHistoryEvent, BookingRecord, BookingStatus } from "../../../types/booking.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

const STATUS_ORDER: BookingStatus[] = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "COMPLETED"];
const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_APPROVAL: "Yêu cầu", CONFIRMED: "Đã duyệt", CHECKED_OUT: "Đã bàn giao",
  RETURNED: "Đã hoàn trả", COMPLETED: "Hoàn tất", REJECTED: "Từ chối", CANCELLED: "Đã hủy"
};
const ACTION_LABEL: Record<string, string> = {
  REQUEST: "Tạo yêu cầu", APPROVE: "Duyệt booking", REJECT: "Từ chối booking",
  CHECK_OUT: "Bàn giao tài nguyên", RETURN: "Tiếp nhận hoàn trả",
  COMPLETE: "Hoàn tất workflow", CANCEL: "Hủy booking", STATUS_CHANGE: "Cập nhật trạng thái tài nguyên"
};

export interface BookingWorkflowTimelineProps {
  booking: BookingRecord;
  timeline: BookingHistoryEvent[];
}

export const BookingWorkflowTimeline: React.FC<BookingWorkflowTimelineProps> = ({ booking, timeline }) => {
  const terminal = booking.status === "REJECTED" || booking.status === "CANCELLED";
  const currentIndex = STATUS_ORDER.indexOf(booking.status);

  return (
    <section className="operation-timeline" aria-label="Lịch sử workflow booking">
      <div className="operation-progress" aria-label={`Trạng thái hiện tại: ${STATUS_LABEL[booking.status]}`}>
        {terminal ? (
          <div className="operation-terminal-state"><Circle size={14} aria-hidden="true" /><span>{STATUS_LABEL[booking.status]}</span></div>
        ) : STATUS_ORDER.map((status, index) => {
          const reached = currentIndex >= index;
          const current = booking.status === status;
          return (
            <div key={status} className={`operation-progress-step ${reached ? "is-reached" : ""} ${current ? "is-current" : ""}`}>
              {reached ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
              <span>{STATUS_LABEL[status]}</span>
            </div>
          );
        })}
      </div>

      <div className="operation-history-list">
        {timeline.length === 0 ? <p className="operation-empty-inline">Chưa có lịch sử vận hành được lưu.</p> : timeline.map((event) => (
          <article className="operation-history-event" key={event.id}>
            <div className="operation-history-icon"><Clock3 size={14} aria-hidden="true" /></div>
            <div className="operation-history-content">
              <div className="operation-history-heading">
                <strong>{ACTION_LABEL[event.action] || event.action}</strong>
                <time dateTime={event.createdAt}>{formatVietnamDateTime(event.createdAt)}</time>
              </div>
              <div className="operation-history-meta">
                {event.actor?.fullName && <span>{event.actor.fullName} · {event.actor.role}</span>}
                {event.fromStatus && event.toStatus && <span>{STATUS_LABEL[event.fromStatus]} → {STATUS_LABEL[event.toStatus]}</span>}
              </div>
              {event.reason && <p><b>Lý do:</b> {event.reason}</p>}
              {event.conditionBefore && <p><b>Tình trạng trước:</b> {event.conditionBefore}</p>}
              {event.conditionAfter && <p><b>Tình trạng sau:</b> {event.conditionAfter}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
