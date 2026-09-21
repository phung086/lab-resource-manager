import React from "react";
import { Plus, Clock, AlertCircle } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard.js";
import { toVietnamHour } from "../../utils/timezone.js";

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
    <div className="calendar-day-frame">
      <div className="flex flex-col gap-2.5">
        {HOURS.map((hour) => {
          const hourStr = `${String(hour).padStart(2, "0")}:00`;

          // Match events covering this hour in Vietnam time
          const matchedEvents = events.filter((ev) => {
            if (!ev.start || !ev.end) return false;
            const startHour = toVietnamHour(ev.start);
            const endHour = toVietnamHour(ev.end);
            return (hour >= startHour && hour < endHour) || startHour === hour;
          });

          return (
            <div
              key={hour}
              className="calendar-day-row flex items-start gap-4"
            >
              {/* Hour badge */}
              <div className="calendar-day-time w-16 font-mono text-xs font-semibold flex items-center gap-1 shrink-0 pt-1">
                <Clock size={12} />
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
                  <button
                    type="button"
                    onClick={() => onSelectSlot(currentDateStr, hourStr)}
                    className="calendar-day-available w-full text-left py-2 px-3 rounded border border-dashed text-xs flex items-center justify-between transition-colors group"
                    aria-label={`Đặt khung giờ ${hourStr} ngày ${currentDateStr}`}
                  >
                    <span>Khung giờ trống — Bấm để đặt</span>
                    <Plus size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
