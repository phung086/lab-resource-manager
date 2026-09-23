import React from "react";
import { Plus, Clock } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard.js";
import { vietnamTimeToIso } from "../../utils/timezone.js";

export interface DayScheduleProps {
  currentDateStr: string;
  events: any[];
  selectedResourceName?: string;
  blocked?: boolean;
  onSelectSlot: (dateStr: string, timeStr: string) => void;
  onSelectBooking: (booking: any) => void;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const DaySchedule: React.FC<DayScheduleProps> = ({
  currentDateStr,
  events,
  selectedResourceName,
  blocked = false,
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
            const slotStart = new Date(vietnamTimeToIso(currentDateStr, hourStr)).getTime();
            const slotEnd = slotStart + 60 * 60 * 1000;
            return new Date(ev.start).getTime() < slotEnd && new Date(ev.end).getTime() > slotStart;
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
                ) : blocked ? <span className="section-description">Tài nguyên đang tạm ngừng nhận lịch</span> : (
                  <button
                    type="button"
                    onClick={() => onSelectSlot(currentDateStr, hourStr)}
                    className="calendar-day-available w-full text-left py-2 px-3 rounded text-xs flex items-center justify-between transition-colors cursor-pointer"
                    aria-label={
                      selectedResourceName
                        ? `Đặt ${selectedResourceName} lúc ${hourStr} ngày ${currentDateStr}`
                        : `Đặt khung giờ ${hourStr} ngày ${currentDateStr}`
                    }
                    title={
                      selectedResourceName
                        ? `Đặt ${selectedResourceName} lúc ${hourStr} ngày ${currentDateStr}`
                        : `Đặt khung giờ ${hourStr} ngày ${currentDateStr}`
                    }
                  >
                    <span className="calendar-day-slot-idle" aria-hidden="true">
                      <span className="calendar-day-idle-dot" />
                    </span>
                    <span className="calendar-day-slot-hover font-medium">
                      + Đặt {hourStr}
                    </span>
                    <Plus size={13} className="calendar-day-slot-icon" aria-hidden="true" />
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
