import { useLocale } from '../../providers/LocaleProvider';
import React from "react";
import { Clock, User, Calendar, Wrench } from "lucide-react";
import { BookingStatusBadge } from "../BookingStatusBadge.js";
import { toVietnamTimeString } from "../../utils/timezone.js";

export interface CalendarEventCardProps {
  event: any;
  onClick?: (event: any) => void;
  compact?: boolean;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  event,
  onClick,
  compact = false
}) => {
  const { tr } = useLocale();
  const title = event.titleKey ? tr(event.titleKey, event.titleParams) : event.title;
  const isMaintenance = event.type === "maintenance" || event.type === "calibration";
  const startTime = toVietnamTimeString(event.start || event.startAt);
  const endTime = toVietnamTimeString(event.end || event.endAt);
  const appearance = event.isMine ? "is-mine" : isMaintenance ? "is-maintenance" : "is-booked";
  const maintenanceLabel = tr(
    event.type === "calibration" ? "ui.calibration_a71e17c8" : "ui.maintenance_8ad424bd"
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(event);
        }}
        className={`calendar-event-card-wrap calendar-event-card-compact ${appearance} w-full text-left`}
        title={`${title} (${startTime} - ${endTime})`}
      >
        <span className="calendar-event-compact-heading">
          <span className="calendar-event-title">
            {event.isMine ? <span aria-hidden="true" className="calendar-own-marker">●</span> : null}
            <span>{title}</span>
          </span>
          <span className="calendar-event-time">{startTime}</span>
        </span>
        <span className="calendar-event-compact-status">
          {isMaintenance ? (
            <span className="calendar-event-kind-label">
              <Wrench size={11} aria-hidden="true" />
              <span>{maintenanceLabel}</span>
            </span>
          ) : (
            <BookingStatusBadge
              status={event.status}
              occupancy={event.occupancy}
              className="calendar-event-status-badge"
            />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(event)}
      className={`calendar-event-card-wrap calendar-event-card-full ${appearance} w-full text-left`}
    >
      <span className="calendar-event-heading">
        <span className="calendar-event-title-block">
          <span className="calendar-event-title">
            {event.isMine && <span aria-hidden="true" className="calendar-own-marker">●</span>}
            <span>{title}</span>
          </span>
          {isMaintenance && (
            <span className="calendar-event-kind-label">
              <Wrench size={12} aria-hidden="true" />
              <span>{maintenanceLabel}</span>
            </span>
          )}
        </span>
        {!isMaintenance && (
          <BookingStatusBadge
            status={event.status}
            occupancy={event.occupancy}
            className="calendar-event-status-badge"
          />
        )}
      </span>

      <span className="calendar-event-meta">
        <span className="calendar-event-meta-item">
          <Clock size={13} aria-hidden="true" />
          <span className="calendar-event-time-range">
            {startTime} – {endTime}
          </span>
        </span>
        {event.resourceName && (
          <span className="calendar-event-meta-item calendar-event-resource">
            <Calendar size={13} aria-hidden="true" />
            <span>{event.resourceName}</span>
          </span>
        )}
      </span>

      {event.requestedBy && (
        <span className="calendar-event-owner">
          <User size={13} aria-hidden="true" />
          <span>{event.requestedBy.fullName || event.requestedBy.email}</span>
        </span>
      )}
    </button>
  );
};
