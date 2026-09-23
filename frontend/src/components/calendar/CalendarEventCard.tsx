import React from "react";
import { Clock, User, Calendar } from "lucide-react";
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
  const isMaintenance = event.type === "maintenance" || event.type === "calibration";
  const startTime = toVietnamTimeString(event.start);
  const endTime = toVietnamTimeString(event.end);
  const appearance = event.isMine ? "is-mine" : isMaintenance ? "is-maintenance" : "is-booked";

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(event);
        }}
        className={`calendar-event-card-wrap ${appearance} w-full text-left text-[11px] px-2 py-1 rounded border cursor-pointer truncate`}
        title={`${event.title} (${startTime} - ${endTime})`}
      >
        <span className="font-medium">
          {event.isMine ? <span aria-hidden="true">★ </span> : null}
          {event.title}
        </span>
        {startTime && <span className="calendar-event-time ml-1 text-[10px]">({startTime})</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(event)}
      className={`calendar-event-card-wrap ${appearance} w-full text-left p-3 rounded-lg border cursor-pointer flex flex-col gap-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug">
          {event.isMine && <span aria-hidden="true" className="calendar-own-marker mr-1">●</span>}
          {event.title}
        </h4>
        <BookingStatusBadge status={event.status} occupancy={event.occupancy} />
      </div>

      <div className="calendar-event-meta flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          <span>
            {startTime} – {endTime}
          </span>
        </span>
        {event.resourceName && (
          <span className="flex items-center gap-1 truncate max-w-[200px]">
            <Calendar size={12} />
            <span className="truncate">{event.resourceName}</span>
          </span>
        )}
      </div>

      {event.requestedBy && (
        <div className="calendar-event-owner flex items-center gap-1 text-xs pt-1 border-t">
          <User size={12} />
          <span>{event.requestedBy.fullName || event.requestedBy.email}</span>
        </div>
      )}
    </button>
  );
};
