import React from "react";
import { Plus, Clock, AlertCircle } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard.js";

export interface DayScheduleProps {
  currentDateStr: string;
  events: any[];
  onSelectSlot: (dateStr: string, timeStr: string) => void;
  onSelectBooking: (booking: any) => void;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const DaySchedule: React.FC<DayScheduleProps> = ({
  currentDateStr,
  events,
  onSelectSlot,
  onSelectBooking
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-xs">
      <div className="flex flex-col gap-2.5">
        {HOURS.map((hour) => {
          const hourStr = `${String(hour).padStart(2, "0")}:00`;

          // Match events covering this hour
          const matchedEvents = events.filter((ev) => {
            if (!ev.start || !ev.end) return false;
            const startHour = new Date(ev.start).getHours();
            const endHour = new Date(ev.end).getHours();
            return (hour >= startHour && hour < endHour) || startHour === hour;
          });

          return (
            <div
              key={hour}
              className="flex items-start gap-4 p-2.5 bg-slate-850 bg-slate-900/40 rounded-lg border border-slate-800/80 hover:border-slate-700/80 transition-colors"
            >
              {/* Hour badge */}
              <div className="w-16 font-mono text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 pt-1">
                <Clock size={12} className="text-slate-500" />
                <span>{hourStr}</span>
              </div>

              {/* Event Cards or Available Slot */}
              <div className="flex-1 flex flex-col gap-2">
                {matchedEvents.length > 0 ? (
                  matchedEvents.map((ev) => (
                    <CalendarEventCard
                      key={ev.id}
                      event={ev}
                      onClick={onSelectBooking}
                    />
                  ))
                ) : (
                  <div
                    onClick={() => onSelectSlot(currentDateStr, hourStr)}
                    className="py-2 px-3 rounded border border-dashed border-slate-700/70 text-slate-400 hover:text-sky-300 hover:border-sky-500/50 hover:bg-sky-950/20 cursor-pointer text-xs flex items-center justify-between transition-colors group"
                  >
                    <span>Khung giờ trống — Bấm để đặt</span>
                    <Plus size={13} className="text-slate-500 group-hover:text-sky-400" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
