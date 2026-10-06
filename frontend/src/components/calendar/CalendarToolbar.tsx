import { useLocale } from '../../providers/LocaleProvider';
import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Plus } from "lucide-react";

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
  const { tr } = useLocale();

  return (
    <div className="calendar-toolbar">
      {/* Control bar */}
      <div className="calendar-toolbar-row">
        {/* 1. Resource Selector (FIRST obvious control in workflow) */}
        <div className="calendar-resource-filter">
          <label htmlFor="calendar-resource-select" className="calendar-filter-label font-semibold">
            {tr("ui.resource_8315fccb")}</label>
          <select
            id="calendar-resource-select"
            value={selectedResourceId}
            onChange={(e) => onResourceChange(e.target.value)}
            aria-label={tr("ui.choose_a_resource_1ba6fed9")}
            disabled={resources.length === 0}
          >
            {resources.length === 0 ? (
              <option value="">{tr("ui.no_available_resources_161fcec4")}</option>
            ) : (
              resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
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
              {tr("ui.today_e6747a82")}</button>
            <button
              type="button"
              onClick={onPrev}
              className="calendar-nav-btn"
              title={tr("ui.previous_period_b5ef94e1")}
              aria-label={tr("ui.previous_period_b5ef94e1")}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="calendar-nav-btn"
              title={tr("ui.next_period_117cfb3c")}
              aria-label={tr("ui.next_period_117cfb3c")}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="calendar-title-group">
            <h2 className="calendar-period-title">
              <span>{headerTitle}</span>
              {loading && <RefreshCw size={14} className="calendar-loading-spin" aria-label={tr("ui.loading_465b1987")} />}
            </h2>
            <button
              type="button"
              onClick={onRefresh}
              className="calendar-refresh-btn"
              title={tr("ui.refresh_calendar_5cd617b0")}
              aria-label={tr("ui.refresh_calendar_5cd617b0")}
            >
              <RefreshCw size={13} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 3. View Switcher (Day / Week / Month) */}
        <div role="group" aria-label={tr("ui.calendar_view_6ff1148e")} className="calendar-view-switcher">
          <button
            type="button"
            onClick={() => onViewModeChange("day")}
            aria-pressed={viewMode === "day"}
          >
            {tr("ui.day_c4c3ca76")}</button>
          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            aria-pressed={viewMode === "week"}
          >
            {tr("ui.week_a10b97df")}</button>
          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            aria-pressed={viewMode === "month"}
          >
            {tr("ui.month_10276db1")}</button>
        </div>

        {/* 4. Action: New Booking */}
        <button
          type="button"
          onClick={onNewBooking}
          disabled={!selectedResourceId || resources.length === 0}
          className="btn btn-primary calendar-new-booking-btn disabled:opacity-50 disabled:cursor-not-allowed"
          title={!selectedResourceId ? tr("ui.choose_a_resource_before_booking_3cc84f6f") : tr("ui.book_a_time_slot_3ea4909d")}
        >
          <Plus size={14} aria-hidden="true" />
          <span>{tr("ui.book_a_time_slot_0003e14b")}</span>
        </button>
      </div>

      {/* Filter & Legend bar */}
      <div className="calendar-filter-bar">
        {/* Legend */}
        <div className="calendar-legend" aria-label={tr("ui.calendar_legend_1a59e6ae")}>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-available" aria-hidden="true" />
            <span>{tr("ui.available_b99ed3dd")}</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-mine" aria-hidden="true" />
            <span>{tr("ui.your_booking_72ef015d")}</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-booked" aria-hidden="true" />
            <span>{tr("ui.reserved_f20b6ee2")}</span>
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch is-maintenance" aria-hidden="true" />
            <span>{tr("ui.maintenance_calibration_79fdebcb")}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
