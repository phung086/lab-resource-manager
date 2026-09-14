import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  User,
  Zap,
  Layers,
  ArrowUpRight,
  QrCode
} from "lucide-react";

export interface SmartCalendarViewProps {
  onOpenQuickBooking: (slot?: any) => void;
  onOpenCheckIn: (booking?: any) => void;
  onOpenVietQR: (booking?: any) => void;
}

export const SmartCalendarView: React.FC<SmartCalendarViewProps> = ({
  onOpenQuickBooking,
  onOpenCheckIn,
  onOpenVietQR
}) => {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const daysOfWeek = [
    { name: "Thứ 2", date: "07/09", fullDate: "2026-09-07" },
    { name: "Thứ 3", date: "08/09", fullDate: "2026-09-08" },
    { name: "Thứ 4", date: "09/09", fullDate: "2026-09-09" },
    { name: "Thứ 5", date: "10/09", fullDate: "2026-09-10", isToday: true },
    { name: "Thứ 6", date: "11/09", fullDate: "2026-09-11" },
    { name: "Thứ 7", date: "12/09", fullDate: "2026-09-12" },
    { name: "Chủ Nhật", date: "13/09", fullDate: "2026-09-13" }
  ];

  const timeHours = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00"
  ];

  // Mock appointments across the week
  const mockBookings: Record<string, any> = {
    "2026-09-07_09:00": { id: "b1", user: "ThS. Hoàng Long", title: "Thị giác máy tính", resource: "GPU-H100", type: "booked" },
    "2026-09-07_14:00": { id: "b2", user: "NCS. Trần Tiến Dũng", title: "Fine-tune LLM Paper Q1", resource: "GPU-H100", type: "booked" },
    "2026-09-08_10:00": { id: "b3", user: "Ca của bạn", title: "Đồ án Tốt nghiệp AI", resource: "Phòng Lab A1", type: "mine", amount: 150000 },
    "2026-09-08_15:00": { id: "b4", user: "GS.TS Nguyễn Văn A", title: "Họp Hội đồng Khoa học", resource: "Phòng Họp", type: "booked" },
    "2026-09-09_13:00": { id: "b5", user: "Nhóm Robotics 02", title: "Thử nghiệm Drone RTK", resource: "Khu Test", type: "booked" },
    "2026-09-10_09:00": { id: "b6", user: "Ca của bạn (ĐANG DIỄN RA)", title: "Huấn Luyện DeepSeek-R1", resource: "GPU-H100", type: "mine", isLive: true, amount: 150000 },
    "2026-09-10_14:00": { id: "b7", user: "KSTN. Lê Hoàng Yến", title: "NLP Tiếng Việt Y Tế", resource: "GPU-H100", type: "booked" },
    "2026-09-10_18:00": { id: "b8", user: "SV. Mai Phương", title: "Seminar Nghiên cứu sinh", resource: "Phòng Họp", type: "booked" },
    "2026-09-11_10:00": { id: "b9", user: "ThS. Trần Bách", title: "Kiểm thử Edge AI Orin", resource: "Khu Test", type: "booked" },
    "2026-09-11_15:00": { id: "b10", user: "Ca của bạn", title: "Benchmark Hiệu Năng VRAM", resource: "GPU-H100", type: "mine", amount: 150000 },
    "2026-09-12_09:00": { id: "b11", user: "Lab AI Core", title: "Bảo dưỡng định kỳ GPU", resource: "GPU-H100", type: "maintenance" }
  };

  const filterOptions = [
    { id: "all", label: "Tất Cả Tài Nguyên" },
    { id: "gpu", label: "Cụm GPU NVIDIA H100" },
    { id: "room", label: "Phòng Lab AI A1" },
    { id: "meeting", label: "Phòng Họp Thông Minh" },
    { id: "edge", label: "Khu Thử Nghiệm Edge AI" }
  ];

  function handleSlotClick(day: any, hour: string) {
    const key = `${day.fullDate}_${hour}`;
    const booking = mockBookings[key];

    if (booking) {
      if (booking.type === "mine") {
        onOpenCheckIn(booking);
      }
    } else {
      // Empty slot - trigger quick booking
      onOpenQuickBooking({
        date: day.fullDate,
        time: hour,
        resourceId: selectedFilter === "gpu" ? "res-01" : "res-02"
      });
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Banner: Calendar Control Bar */}
      <div className="card-glass-2026 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Navigation & Date Heading */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentWeekOffset(0)}
              className="px-3 py-1 text-xs font-mono font-bold text-cyan-300 hover:text-white transition-all"
            >
              HÔM NAY
            </button>
            <button
              type="button"
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Tuần sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <h2 className="text-base lg:text-lg font-bold font-heading text-white flex items-center gap-2">
              <span>Tuần 37 • Tháng 09, 2026</span>
              <span className="font-mono text-xs text-cyan-400 font-normal bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                Lịch Điều Phối Trực Quan
              </span>
            </h2>
          </div>
        </div>

        {/* Center: View Switcher (Day / Week / Month) */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              viewMode === "day"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Ngày
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              viewMode === "week"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              viewMode === "month"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tháng
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              onOpenQuickBooking({
                date: "2026-09-10",
                time: "14:00",
                resourceId: "res-01"
              })
            }
            className="px-3 py-2 bg-violet-950/60 border border-violet-500/40 hover:border-violet-400 text-violet-300 hover:text-white text-xs font-mono rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Sparkles size={14} className="text-violet-400" />
            <span>AI Đề Xuất Slot Tốt Nhất</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickBooking()}
            className="btn-cyan-gradient px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
          >
            <Plus size={15} />
            <span>Đặt Khung Giờ Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter size={13} className="text-cyan-400" />
            <span>Lọc:</span>
          </span>
          {filterOptions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedFilter === f.id
                  ? "bg-cyan-500/15 border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                  : "bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:border-white/25"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/20 border border-cyan-400/50" />
            <span>Trống (Khả dụng)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-white/20" />
            <span>Đã có người đặt</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 border border-cyan-300" />
            <strong className="text-cyan-300 font-bold">Ca của bạn</strong>
          </span>
        </div>
      </div>

      {/* Main Calendar Grid (Week View) */}
      <div className="card-glass-2026 p-4 overflow-x-auto">
        <div className="calendar-week-grid min-w-[900px]">
          {/* Header Row: Time Empty Top-Left Cell */}
          <div className="p-3 text-center font-mono text-xs text-slate-500 border-b border-white/10 flex items-center justify-center">
            <Clock size={14} className="text-slate-400" />
          </div>

          {/* Header Row: 7 Days */}
          {daysOfWeek.map((day) => (
            <div
              key={day.fullDate}
              className={`p-3 text-center border-b border-white/10 flex flex-col items-center justify-center gap-0.5 ${
                day.isToday
                  ? "bg-cyan-950/30 border-b-2 border-b-cyan-400"
                  : ""
              }`}
            >
              <span className={`text-xs font-bold font-sans ${day.isToday ? "text-cyan-300" : "text-white"}`}>
                {day.name}
              </span>
              <span className={`font-mono text-xs ${day.isToday ? "text-cyan-400 font-bold" : "text-slate-400"}`}>
                {day.date}
              </span>
              {day.isToday && (
                <span className="text-[9px] font-mono uppercase bg-cyan-400 text-obsidian font-black px-1.5 py-0.2 rounded mt-0.5">
                  HÔM NAY
                </span>
              )}
            </div>
          ))}

          {/* Hour Rows */}
          {timeHours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Hour Label Axis */}
              <div className="p-2 text-right pr-3 font-mono text-xs text-slate-400 border-t border-white/5 flex items-center justify-end">
                {hour}
              </div>

              {/* 7 Day Slot Cells for this hour */}
              {daysOfWeek.map((day) => {
                const key = `${day.fullDate}_${hour}`;
                const booking = mockBookings[key];

                if (booking?.type === "mine") {
                  return (
                    <div
                      key={key}
                      onClick={() => handleSlotClick(day, hour)}
                      className="time-slot-card time-slot-mine border-t border-white/5 relative group"
                      title="Bấm để xem mã Check-in QR hoặc thanh toán"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-cyan-300" />
                          <span>CA CỦA BẠN</span>
                        </span>
                        {booking.isLive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Đang trong khung giờ ca" />
                        )}
                      </div>
                      <div className="font-semibold text-white text-[11px] leading-tight my-0.5 truncate">
                        {booking.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-200">
                        <span>{booking.resource}</span>
                        <QrCode size={11} className="text-cyan-300" />
                      </div>
                    </div>
                  );
                }

                if (booking?.type === "booked") {
                  return (
                    <div
                      key={key}
                      className="time-slot-card time-slot-booked border-t border-white/5 select-none"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-mono flex items-center gap-1">
                          <Lock size={10} className="text-slate-500" />
                          <span>ĐÃ ĐẶT</span>
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px] font-medium truncate my-0.5">
                        {booking.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {booking.user}
                      </div>
                    </div>
                  );
                }

                if (booking?.type === "maintenance") {
                  return (
                    <div
                      key={key}
                      className="time-slot-card bg-amber-950/20 border border-amber-500/20 text-amber-400 border-t border-white/5 cursor-not-allowed"
                    >
                      <span className="text-[10px] font-mono font-bold">BẢO TRÌ ĐỊNH KỲ</span>
                      <span className="text-[11px] text-slate-400 truncate">{booking.title}</span>
                    </div>
                  );
                }

                // Available slot
                return (
                  <div
                    key={key}
                    onClick={() => handleSlotClick(day, hour)}
                    className="time-slot-card time-slot-available border-t border-white/5 group"
                    title={`Bấm để đặt slot ${hour} - ${day.name}`}
                  >
                    <div className="flex items-center justify-between text-slate-500 group-hover:text-cyan-400">
                      <span className="font-mono text-[10px]">Trống</span>
                      <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 group-hover:text-cyan-300 transition-colors">
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
