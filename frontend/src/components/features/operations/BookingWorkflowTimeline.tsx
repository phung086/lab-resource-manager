import { useLocale } from '../../../providers/LocaleProvider';
import React from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { BookingHistoryEvent, BookingRecord, BookingStatus } from "../../../types/booking.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";
import "../../../styles/redesign/operations.css";

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

function lastLifecycleIndex(timeline: BookingHistoryEvent[]) {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const fromStatus = timeline[index].fromStatus;
    if (fromStatus && STATUS_ORDER.includes(fromStatus)) return STATUS_ORDER.indexOf(fromStatus);
    const toStatus = timeline[index].toStatus;
    if (toStatus && STATUS_ORDER.includes(toStatus)) return STATUS_ORDER.indexOf(toStatus);
  }
  return -1;
}

export interface BookingWorkflowTimelineProps {
  booking: BookingRecord;
  timeline: BookingHistoryEvent[];
}

export const BookingWorkflowTimeline: React.FC<BookingWorkflowTimelineProps> = ({ booking, timeline }) => {
  const { tr } = useLocale();
  const terminal = booking.status === "REJECTED" || booking.status === "CANCELLED";
  const currentIndex = STATUS_ORDER.indexOf(booking.status);
  const progressIndex = terminal ? lastLifecycleIndex(timeline) : currentIndex;
  const currentStatusLabel = tr(STATUS_LABEL[booking.status]);
  const currentStatusText = tr("ui.current_status_e5f7e588", { value0: currentStatusLabel });

  return (
    <section className="operation-timeline lrm-operation-redesign" aria-label={tr("ui.booking_history_1045c541")}>
      <div className="operation-timeline-state">
        {terminal && (
          <div className="operation-terminal-state" data-status={booking.status} role="status">
            <Circle size={16} aria-hidden="true" />
            <strong>{currentStatusText}</strong>
          </div>
        )}

        <div className="operation-progress" aria-label={currentStatusText}>
          {STATUS_ORDER.map((status, index) => {
            const current = !terminal && booking.status === status;
            const reached = progressIndex >= index;
            return (
              <div
                key={status}
                className={`operation-progress-step ${reached ? "is-reached" : ""} ${current ? "is-current" : ""}`}
                aria-current={current ? "step" : undefined}
              >
                {current ? <Clock3 size={16} aria-hidden="true" /> : reached ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                <span>{tr(STATUS_LABEL[status])}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="operation-history-region">
        <div className="operation-history-region-header">
          <strong>{tr("ui.booking_history_1045c541")}</strong>
        </div>

        <div className="operation-history-list">
          {timeline.length === 0 ? (
            <div className="operation-empty-inline">
              <Clock3 size={17} aria-hidden="true" />
              <p>{tr("ui.no_operational_history_recorded_b2e6863e")}</p>
            </div>
          ) : timeline.map((event) => {
            const actionKey = ACTION_LABEL[event.action];
            const actionLabel = actionKey ? tr(actionKey) : event.action;
            return (
              <article className="operation-history-event" key={event.id}>
                <div className="operation-history-icon"><Clock3 size={14} aria-hidden="true" /></div>
                <div className="operation-history-content">
                  <div className="operation-history-heading">
                    <strong>{actionLabel}</strong>
                    <time dateTime={event.createdAt}>{formatVietnamDateTime(event.createdAt)}</time>
                  </div>
                  <div className="operation-history-meta">
                    {event.actor?.fullName && <span>{event.actor.fullName} · {event.actor.role}</span>}
                    {event.fromStatus && event.toStatus && <span className="operation-history-transition">{tr(STATUS_LABEL[event.fromStatus])} → {tr(STATUS_LABEL[event.toStatus])}</span>}
                  </div>
                  {(event.reason || event.conditionBefore || event.conditionAfter) && (
                    <div className="operation-history-details">
                      {event.reason && <div><span>{tr("ui.reason_3596071b")}</span><p>{event.reason}</p></div>}
                      {event.conditionBefore && <div><span>{tr("ui.condition_before_f25700f8")}</span><p>{event.conditionBefore}</p></div>}
                      {event.conditionAfter && <div><span>{tr("ui.condition_after_6a93d4e7")}</span><p>{event.conditionAfter}</p></div>}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
