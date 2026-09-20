import React from "react";
import { Plus } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard.js";

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
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 is Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  const cells = [];
  // Prefix blank cells
  for (let i = 0; i < adjustedFirstDay; i++) {
    cells.push(
      <div
        key={`blank-${i}`}
        className="min-h-[85px] bg-slate-900/30 border border-slate-800/40 rounded-lg opacity-40"
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = dayDateStr === todayStr;

    // Filter events for this day
    const dayEvents = events.filter((ev) => {
      const evStart = ev.start?.split("T")[0];
      return evStart === dayDateStr;
    });

    cells.push(
      <div
        key={dayDateStr}
        onClick={() => onSelectSlot(dayDateStr, "09:00")}
        className={`min-h-[95px] p-2 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer group hover:border-sky-500/50 hover:bg-slate-800/60 ${
          isToday
            ? "border-sky-500 bg-sky-950/20"
            : "border-slate-800 bg-slate-900/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              isToday
                ? "text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded font-bold"
                : "text-slate-300"
            }`}
          >
            {day}
          </span>
          <Plus
            size={12}
            className="text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-sky-400 transition-opacity"
          />
        </div>

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
            <span className="text-[10px] text-sky-400 font-medium">
              +{dayEvents.length - 3} lịch khác
            </span>
          )}
        </div>

        <div className="text-[10px] text-slate-500 group-hover:text-sky-400">
          {dayEvents.length === 0 ? "Trống" : `${dayEvents.length} lịch`}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-xs">
      <div className="grid grid-cols-7 gap-2">
        {DAY_NAMES.map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-semibold text-slate-400 py-1.5 border-b border-slate-800"
          >
            {dayName}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
};
