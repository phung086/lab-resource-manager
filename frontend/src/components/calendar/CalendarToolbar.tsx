import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Filter } from "lucide-react";

export interface CalendarToolbarProps {
  viewMode: "day" | "week" | "month";
  onViewModeChange: (mode: "day" | "week" | "month") => void;
  headerTitle: string;
  loading: boolean;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onRefresh: () => void;
  onNewBooking: () => void;
  resources: any[];
  selectedResourceId: string;
  onResourceChange: (resourceId: string) => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  viewMode,
  onViewModeChange,
  headerTitle,
  loading,
  onPrev,
  onToday,
  onNext,
  onRefresh,
  onNewBooking,
  resources,
  selectedResourceId,
  onResourceChange
}) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Control bar */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        {/* Navigation & Header Title */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
              title="Khoảng trước"
              aria-label="Khoảng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-2.5 py-1 text-xs font-semibold text-sky-400 hover:text-white transition-colors"
            >
              HÔM NAY
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
              title="Khoảng sau"
              aria-label="Khoảng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              <span>{headerTitle}</span>
              {loading && <RefreshCw size={14} className="animate-spin text-sky-400" />}
            </h2>
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Làm mới lịch"
              aria-label="Làm mới lịch"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* View Switcher (Day / Week / Month) */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("day")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "day"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Ngày
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "week"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "month"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tháng
          </button>
        </div>

        {/* Action: New Booking */}
        <div>
          <button
            type="button"
            onClick={onNewBooking}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>Đặt Khung Giờ Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Filter size={13} className="text-sky-400" />
            <span>Tài nguyên:</span>
          </span>
          <select
            value={selectedResourceId}
            onChange={(e) => onResourceChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 rounded-lg px-2.5 py-1 text-xs outline-none"
            aria-label="Chọn tài nguyên lịch"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                {r.code} - {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-slate-400 shrink-0 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500/20 border border-sky-400/40" />
            <span>Trống</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/20 border border-emerald-400/40" />
            <span>Lịch của bạn</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-600" />
            <span>Đã đặt</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/20 border border-amber-400/40" />
            <span>Bảo trì / Hiệu chuẩn</span>
          </span>
        </div>
      </div>
    </div>
  );
};
