import React from "react";
import { Plus } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard.js";
import { toVietnamDateString, getVietnamTodayDateString } from "../../utils/timezone.js";

export interface MonthScheduleProps {
  anchorDate: Date;
  events: any[];
  onSelectSlot: (dateStr: string, timeStr: string) => void;
  onSelectBooking: (booking: any) => void;
}

const DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

export const MonthSchedule: React.FC<MonthScheduleProps> = ({
  anchorDate,
  events,
  onSelectSlot,
  onSelectBooking
}) => {
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();

  const firstDayIndex = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 is Sun
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 is Mon
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const todayStr = getVietnamTodayDateString();

  const cells = [];
  // Prefix blank cells
  for (let i = 0; i < adjustedFirstDay; i++) {
    cells.push(
      <div
        key={`blank-${i}`}
        className="calendar-month-blank"
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = dayDateStr === todayStr;

    // Filter events for this day in Vietnam time
    const dayEvents = events.filter((ev) => {
      const evDate = toVietnamDateString(ev.start);
      return evDate === dayDateStr;
    });

    cells.push(
      <div
        key={dayDateStr}
        className={`calendar-month-cell ${isToday ? "is-today" : ""} p-2 rounded-lg border flex flex-col justify-between group`}
      >

        <button type="button" onClick={() => onSelectSlot(dayDateStr, "09:00")} aria-label={`Đặt lịch ngày ${dayDateStr}`} className="calendar-month-day-action flex items-center justify-between w-full text-left">
          <span
            className={`calendar-month-date text-xs font-semibold ${isToday ? "is-today" : ""}`}
          >
            {day}
          </span>
          <Plus
            size={12}
            className="calendar-month-add"
          />
        </button>

        <div className="flex flex-col gap-1 my-1 overflow-hidden">
          {dayEvents.slice(0, 3).map((ev) => (
            <CalendarEventCard
              key={ev.id}
              event={ev}
              onClick={onSelectBooking}
              compact={true}
            />
          ))}
          {dayEvents.length > 3 && (
            <span className="calendar-month-more text-[10px] font-medium">
              +{dayEvents.length - 3} lịch khác
            </span>
          )}
        </div>

        <div className="calendar-month-count text-[10px]">
          {dayEvents.length === 0 ? "Trống" : `${dayEvents.length} lịch`}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-month-frame">
      <div className="calendar-month-scroll">
      <div className="calendar-month-grid">
        {DAY_NAMES.map((dayName) => (
          <div
            key={dayName}
            className="calendar-month-weekday text-center text-xs font-semibold py-1.5"
          >
            {dayName}
          </div>
        ))}
        {cells}
      </div>
      </div>
    </div>
  );
};
