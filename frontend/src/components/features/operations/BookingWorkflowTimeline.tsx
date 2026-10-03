import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { BookingHistoryEvent, BookingRecord, BookingStatus } from "../../../types/booking.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

const STATUS_ORDER: BookingStatus[] = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "COMPLETED"];
const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_APPROVAL: "ui.requested_2ff978a2", CONFIRMED: "ui.approved_e7881844", CHECKED_OUT: "ui.handed_over_216b5cbb",
  RETURNED: "ui.returned_fd3eb4fb", COMPLETED: "ui.completed_b0484236", REJECTED: "ui.reject_b61a0ebc", CANCELLED: "ui.cancelled_2f777a90"
};
const ACTION_LABEL: Record<string, string> = {
  REQUEST: "ui.request_created_a7754180", APPROVE: "ui.approve_booking_99c61da3", REJECT: "ui.booking_rejected_b6508764",
  CHECK_OUT: "ui.hand_over_resource_2b919047", RETURN: "ui.return_received_1cd8fdf1",
  COMPLETE: "ui.complete_workflow_519742b0", CANCEL: "ui.cancel_booking_c68ed93d", STATUS_CHANGE: "ui.update_resource_status_5410b084"
};

export interface BookingWorkflowTimelineProps {
  booking: BookingRecord;
  timeline: BookingHistoryEvent[];
}

export const BookingWorkflowTimeline: React.FC<BookingWorkflowTimelineProps> = ({ booking, timeline }) => {
  const { tr } = useLocale();
  const terminal = booking.status === "REJECTED" || booking.status === "CANCELLED";
  const currentIndex = STATUS_ORDER.indexOf(booking.status);

  return (
    <section className="operation-timeline" aria-label={tr("ui.booking_history_1045c541")}>
      <div className="operation-progress" aria-label={translate("ui.current_status_e5f7e588", { value0: tr(STATUS_LABEL[booking.status]) })}>
        {terminal ? (
          <div className="operation-terminal-state"><Circle size={14} aria-hidden="true" /><span>{tr(STATUS_LABEL[booking.status])}</span></div>
        ) : STATUS_ORDER.map((status, index) => {
          const reached = currentIndex >= index;
          const current = booking.status === status;
          return (
            <div key={status} className={`operation-progress-step ${reached ? "is-reached" : ""} ${current ? "is-current" : ""}`}>
              {reached ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
              <span>{tr(STATUS_LABEL[status])}</span>
            </div>
          );
        })}
      </div>

      <div className="operation-history-list">
        {timeline.length === 0 ? <p className="operation-empty-inline">{tr("ui.no_operational_history_recorded_b2e6863e")}</p> : timeline.map((event) => (
          <article className="operation-history-event" key={event.id}>
            <div className="operation-history-icon"><Clock3 size={14} aria-hidden="true" /></div>
            <div className="operation-history-content">
              <div className="operation-history-heading">
                <strong>{tr(ACTION_LABEL[event.action]) || event.action}</strong>
                <time dateTime={event.createdAt}>{formatVietnamDateTime(event.createdAt)}</time>
              </div>
              <div className="operation-history-meta">
                {event.actor?.fullName && <span>{event.actor.fullName} · {event.actor.role}</span>}
                {event.fromStatus && event.toStatus && <span>{tr(STATUS_LABEL[event.fromStatus])} → {tr(STATUS_LABEL[event.toStatus])}</span>}
              </div>
              {event.reason && <p><b>{tr("ui.reason_3596071b")}</b> {event.reason}</p>}
              {event.conditionBefore && <p><b>{tr("ui.condition_before_f25700f8")}</b> {event.conditionBefore}</p>}
              {event.conditionAfter && <p><b>{tr("ui.condition_after_6a93d4e7")}</b> {event.conditionAfter}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
