import React from "react";
import { Clock, User, Calendar } from "lucide-react";
import { BookingStatusBadge } from "../BookingStatusBadge.js";

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
  const startTime = event.start ? event.start.slice(11, 16) : "";
  const endTime = event.end ? event.end.slice(11, 16) : "";

  if (compact) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(event);
        }}
        className={`text-[11px] px-2 py-1 rounded border transition-colors cursor-pointer truncate ${
          event.isMine
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/50"
            : isMaintenance
            ? "bg-amber-950/40 border-amber-500/40 text-amber-200 hover:bg-amber-900/50"
            : "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800"
        }`}
        title={`${event.title} (${startTime} - ${endTime})`}
      >
        <span className="font-medium">
          {event.isMine ? "★ " : ""}
          {event.title}
        </span>
        {startTime && <span className="ml-1 text-[10px] text-slate-400">({startTime})</span>}
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick && onClick(event)}
      className={`p-3 rounded-lg border transition-colors cursor-pointer flex flex-col gap-2 ${
        event.isMine
          ? "bg-emerald-950/30 border-emerald-600/40 hover:border-emerald-500 hover:bg-emerald-950/40"
          : isMaintenance
          ? "bg-amber-950/30 border-amber-600/40 hover:border-amber-500 hover:bg-amber-950/40"
          : "bg-slate-850 bg-slate-900/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-850"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-100 leading-snug">
          {event.isMine && <span className="text-emerald-400 mr-1">★</span>}
          {event.title}
        </h4>
        <BookingStatusBadge status={event.status} occupancy={event.occupancy} />
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} className="text-slate-500" />
          <span>
            {startTime} – {endTime}
          </span>
        </span>
        {event.resourceName && (
          <span className="flex items-center gap-1 truncate max-w-[200px]">
            <Calendar size={12} className="text-slate-500" />
            <span className="truncate">{event.resourceName}</span>
          </span>
        )}
      </div>

      {event.requestedBy && (
        <div className="flex items-center gap-1 text-xs text-slate-400 pt-1 border-t border-slate-800">
          <User size={12} className="text-slate-500" />
          <span>{event.requestedBy.fullName || event.requestedBy.email}</span>
        </div>
      )}
    </div>
  );
};
