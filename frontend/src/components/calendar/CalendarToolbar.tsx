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
  const selectedResource = resources.find((r) => r.id === selectedResourceId) || null;

  return (
    <div className="calendar-toolbar">
      {/* Control bar */}
      <div className="calendar-toolbar-row">
        {/* 1. Resource Selector (FIRST obvious control in workflow) */}
        <div className="calendar-resource-filter">
          <Filter size={13} className="calendar-filter-icon" aria-hidden="true" />
          <label htmlFor="calendar-resource-select" className="calendar-filter-label font-semibold">
            Tài nguyên:
          </label>
          <select
            id="calendar-resource-select"
            value={selectedResourceId}
            onChange={(e) => onResourceChange(e.target.value)}
            aria-label="Chọn tài nguyên lịch"
            disabled={resources.length === 0}
          >
            {resources.length === 0 ? (
              <option value="">(Chưa có tài nguyên khả dụng)</option>
            ) : (
              resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. Navigation & Header Title */}
        <div className="calendar-nav-group">
          <div className="calendar-nav-controls">
            <button
              type="button"
              onClick={onToday}
              className="calendar-today-btn"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={onPrev}
              className="calendar-nav-btn"
              title="Khoảng trước"
              aria-label="Khoảng trước"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="calendar-nav-btn"
              title="Khoảng sau"
              aria-label="Khoảng sau"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="calendar-title-group">
            <h2 className="calendar-period-title">
              <span>{headerTitle}</span>
              {loading && <RefreshCw size={14} className="calendar-loading-spin" aria-label="Đang tải" />}
            </h2>
            <button
              type="button"
              onClick={onRefresh}
              className="calendar-refresh-btn"
              title="Làm mới lịch"
              aria-label="Làm mới lịch"
            >
              <RefreshCw size={13} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 3. View Switcher (Day / Week / Month) */}
        <div role="group" aria-label="Chế độ xem lịch" className="calendar-view-switcher">
          <button
            type="button"
            onClick={() => onViewModeChange("day")}
            aria-pressed={viewMode === "day"}
          >
            Ngày
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            aria-pressed={viewMode === "week"}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            aria-pressed={viewMode === "month"}
          >
            Tháng
          </button>
        </div>

        {/* 4. Action: New Booking */}
        <button
          type="button"
          onClick={onNewBooking}
          disabled={!selectedResourceId || resources.length === 0}
          className="btn btn-primary calendar-new-booking-btn disabled:opacity-50 disabled:cursor-not-allowed"
          title={!selectedResourceId ? "Vui lòng chọn tài nguyên trước khi đặt lịch" : "Đặt khung giờ mới"}
        >
          <Plus size={14} aria-hidden="true" />
          <span>Đặt Khung Giờ Mới</span>
        </button>
      </div>

      {/* Filter & Legend bar */}
      <div className="calendar-filter-bar">
        <div className="calendar-active-resource-badge text-xs">
          {selectedResource ? (
            <span>
              Đang xem lịch: <strong className="text-blue-700">{selectedResource.name}</strong> ({selectedResource.code})
            </span>
          ) : (
            <span className="text-amber-700 font-medium">
              Chưa có tài nguyên được chọn
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="calendar-legend" aria-label="Chú thích màu sắc lịch">
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-available" aria-hidden="true" />
            <span>Trống</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-mine" aria-hidden="true" />
            <span>Lịch của bạn</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-booked" aria-hidden="true" />
            <span>Đã đặt</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-maintenance" aria-hidden="true" />
            <span>Bảo trì / Hiệu chuẩn</span>
          </span>
        </div>
      </div>
    </div>
  );
};
