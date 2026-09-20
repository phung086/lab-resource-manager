import React from "react";
import { CheckCircle2, Lock, Wrench, Plus, Clock } from "lucide-react";

export interface WeekScheduleProps {
  slotsData: any;
  onSelectSlot: (dateStr: string, timeStr: string) => void;
  onSelectBooking?: (booking: any) => void;
}

export const WeekSchedule: React.FC<WeekScheduleProps> = ({
  slotsData,
  onSelectSlot,
  onSelectBooking
}) => {
  if (!slotsData || !slotsData.daysHeader || !slotsData.grid) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
        Đang tải lịch tuần...
      </div>
    );
  }

  const daysHeader = slotsData.daysHeader || [];
  const grid = slotsData.grid || [];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <div
          className="grid gap-px bg-slate-800/80 min-w-[760px]"
          style={{ gridTemplateColumns: "70px repeat(7, minmax(100px, 1fr))" }}
        >
          {/* Top Left corner: Time Header */}
          <div className="bg-slate-900 p-2.5 flex items-center justify-center font-medium text-xs text-slate-400">
            <Clock size={13} className="mr-1 text-slate-500" />
            <span>Giờ</span>
          </div>

          {/* Days Header */}
          {daysHeader.map((d: any) => (
            <div
              key={d.dateStr}
              className={`p-2.5 text-center flex flex-col items-center justify-center transition-colors ${
                d.isToday
                  ? "bg-sky-950/40 text-sky-200 font-semibold"
                  : "bg-slate-900 text-slate-300 font-medium"
              }`}
            >
              <span className="text-xs uppercase tracking-wider">{d.name}</span>
              <span
                className={`text-xs mt-0.5 ${
                  d.isToday ? "text-sky-300 font-bold" : "text-slate-400"
                }`}
              >
                {d.dateStr}
              </span>
            </div>
          ))}

          {/* Time Rows */}
          {grid.map((row: any) => (
            <React.Fragment key={row.hour}>
              {/* Hour Column */}
              <div className="bg-slate-900/95 p-2 flex items-start justify-center border-t border-slate-800/60 font-mono text-xs text-slate-400">
                {row.time}
              </div>

              {/* Day Cells */}
              {row.days.map((slot: any, idx: number) => {
                const dayHeader = daysHeader[idx];

                if (slot.status === "booked") {
                  return (
                    <div
                      key={`${row.hour}-${idx}`}
                      onClick={() => onSelectBooking && onSelectBooking(slot)}
                      className={`p-2 rounded-xs border-t border-slate-800/60 flex flex-col justify-between transition-colors select-none ${
                        slot.isMine
                          ? "bg-emerald-950/40 hover:bg-emerald-900/50 border-l-2 border-l-emerald-400 cursor-pointer"
                          : "bg-slate-800/60 hover:bg-slate-800/80 border-l-2 border-l-slate-500 cursor-pointer"
                      }`}
                      title={slot.title || "Đã đặt"}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold flex items-center gap-1 ${
                            slot.isMine ? "text-emerald-300" : "text-slate-400"
                          }`}
                        >
                          {slot.isMine ? <CheckCircle2 size={10} /> : <Lock size={10} />}
                          <span>{slot.label}</span>
                        </span>
                      </div>
                      <div className="text-slate-200 text-xs font-medium truncate my-0.5">
                        {slot.title || "Đã đặt"}
                      </div>
                    </div>
                  );
                }

                if (slot.status === "maintenance") {
                  return (
                    <div
                      key={`${row.hour}-${idx}`}
                      className="p-2 bg-amber-950/30 border-t border-slate-800/60 border-l-2 border-l-amber-500 text-amber-300 cursor-not-allowed select-none"
                      title={slot.details || "Bảo trì định kỳ"}
                    >
                      <span className="text-[10px] font-semibold flex items-center gap-1">
                        <Wrench size={10} /> {slot.label}
                      </span>
                      <span className="text-[10px] text-amber-200/70 truncate block">
                        {slot.details}
                      </span>
                    </div>
                  );
                }

                if (slot.status === "offline") {
                  return (
                    <div
                      key={`${row.hour}-${idx}`}
                      className="p-2 bg-rose-950/20 border-t border-slate-800/60 border-l-2 border-l-rose-500 text-rose-400 cursor-not-allowed select-none"
                      title={slot.details || "Thiết bị tạm ngừng"}
                    >
                      <span className="text-[10px] font-semibold block">{slot.label}</span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {slot.details}
                      </span>
                    </div>
                  );
                }

                // Available slot
                return (
                  <div
                    key={`${row.hour}-${idx}`}
                    onClick={() => onSelectSlot(dayHeader?.fullDate, row.time)}
                    className="p-2 bg-slate-900/40 hover:bg-sky-950/30 border-t border-slate-800/60 group cursor-pointer transition-colors flex flex-col justify-between"
                    title={`Bấm để đặt khung giờ ${row.time} ngày ${dayHeader?.name || ""}`}
                  >
                    <div className="flex items-center justify-between text-slate-500 group-hover:text-sky-400">
                      <span className="text-[10px] font-medium">Trống</span>
                      <Plus size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[10px] text-slate-500 group-hover:text-sky-300 transition-colors">
                      + Đặt ngay
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
