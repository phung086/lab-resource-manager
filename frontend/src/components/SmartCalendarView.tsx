import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../api.js";
import { QuickBookingModal } from "./QuickBookingModal.js";
import { CalendarToolbar } from "./calendar/CalendarToolbar.js";
import { WeekSchedule } from "./calendar/WeekSchedule.js";
import { DaySchedule } from "./calendar/DaySchedule.js";
import { MonthSchedule } from "./calendar/MonthSchedule.js";
import { BookingStatusBadge } from "./BookingStatusBadge.js";
import { BaseModal2026 } from "./BaseModal2026.js";
import { Clock, Calendar, User } from "lucide-react";
import { formatVietnamDateTime, getVietnamTodayDateString, vietnamTimeToIso } from "../utils/timezone.js";

export interface SmartCalendarViewProps {
  onOpenBooking?: (slot?: any) => void;
  onOpenCheckIn?: (booking?: any) => void;
  user?: any;
}

export const SmartCalendarView: React.FC<SmartCalendarViewProps> = ({ user, onOpenBooking }) => {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [resources, setResources] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Slots state for Week View
  const [slotsData, setSlotsData] = useState<any>(null);

  // Events state for Month and Day Views
  const [eventsData, setEventsData] = useState<any[]>([]);

  // Modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // 1. Fetch available resources
  useEffect(() => {
    apiRequest("/resources")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || [];
        setResources(list);
        if (list.length > 0 && !selectedResourceId) {
          setSelectedResourceId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load resources for calendar", err);
      });
  }, []);

  // Compute reference anchor dates
  const getAnchorDate = useCallback(() => {
    // A UTC-midnight date is used only as a calendar-date carrier. The date itself
    // comes from Vietnam time, so browser timezone cannot change the selected day.
    const d = new Date(`${getVietnamTodayDateString()}T00:00:00Z`);
    if (viewMode === "week") {
      d.setUTCDate(d.getUTCDate() + weekOffset * 7);
    } else if (viewMode === "month") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + monthOffset);
    } else if (viewMode === "day") {
      d.setUTCDate(d.getUTCDate() + dayOffset);
    }
    return d;
  }, [viewMode, weekOffset, monthOffset, dayOffset]);

  // 2. Fetch Calendar Data whenever dependencies change
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const anchor = getAnchorDate();
      const dateStr = anchor.toISOString().split("T")[0];

      if (viewMode === "week") {
        const queryParams = new URLSearchParams();
        if (selectedResourceId) queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start_date", dateStr);

        const data = await apiRequest(`/calendar/slots?${queryParams.toString()}`);
        setSlotsData(data);
      } else if (viewMode === "month") {
        const startDate = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}-01`;
        const nextMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
        const endDate = nextMonth.toISOString().slice(0, 10);

        const queryParams = new URLSearchParams();
        if (selectedResourceId) queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", vietnamTimeToIso(startDate, "00:00"));
        queryParams.set("end", vietnamTimeToIso(endDate, "00:00"));

        const data = await apiRequest(`/calendar/events?${queryParams.toString()}`);
        setEventsData(data.events || []);
      } else if (viewMode === "day") {
        const nextDay = new Date(anchor);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const queryParams = new URLSearchParams();
        if (selectedResourceId) queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", vietnamTimeToIso(dateStr, "00:00"));
        queryParams.set("end", vietnamTimeToIso(nextDay.toISOString().slice(0, 10), "00:00"));

        const data = await apiRequest(`/calendar/events?${queryParams.toString()}`);
        setEventsData(data.events || []);
      }
    } catch (err: any) {
      console.error("Error loading calendar data", err);
      setError(err.message || "Không thể tải dữ liệu lịch biểu");
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedResourceId, getAnchorDate]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Handlers for Navigation
  const handlePrev = () => {
    if (viewMode === "week") setWeekOffset((prev) => prev - 1);
    else if (viewMode === "month") setMonthOffset((prev) => prev - 1);
    else if (viewMode === "day") setDayOffset((prev) => prev - 1);
  };

  const handleNext = () => {
    if (viewMode === "week") setWeekOffset((prev) => prev + 1);
    else if (viewMode === "month") setMonthOffset((prev) => prev + 1);
    else if (viewMode === "day") setDayOffset((prev) => prev + 1);
  };

  const handleToday = () => {
    setWeekOffset(0);
    setMonthOffset(0);
    setDayOffset(0);
  };

  // Open booking modal prefilled
  const handleOpenSlotBooking = (dateStr: string, timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const endH = String((h || 9) + 1).padStart(2, "0");
    const mStr = String(m || 0).padStart(2, "0");

    const startAt = vietnamTimeToIso(dateStr, timeStr);
    const endAt = vietnamTimeToIso(dateStr, `${endH}:${mStr}`);

    const slot = {
      resourceId: selectedResourceId,
      startAt,
      endAt
    };

    if (onOpenBooking) {
      onOpenBooking(slot);
    } else {
      setSelectedSlot(slot);
      setBookingModalOpen(true);
    }
  };

  // Compute title string
  const getHeaderTitle = () => {
    const anchor = getAnchorDate();
    const formattedMonth = anchor.toLocaleDateString("vi-VN", { month: "long", timeZone: "UTC" });
    const year = anchor.getUTCFullYear();

    if (viewMode === "day") {
      return `${anchor.toLocaleDateString("vi-VN", { weekday: "long", timeZone: "UTC" })}, ${anchor.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}`;
    }
    if (viewMode === "month") {
      return `${formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)} năm ${year}`;
    }
    if (slotsData?.daysHeader?.length) {
      const first = slotsData.daysHeader[0]?.dateStr;
      const last = slotsData.daysHeader[6]?.dateStr;
      return `Tuần từ ${first} đến ${last} (${year})`;
    }
    return `Tháng ${anchor.getUTCMonth() + 1}, ${year}`;
  };

  const anchor = getAnchorDate();
  const currentDateStr = anchor.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Calendar Toolbar */}
      <CalendarToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        headerTitle={getHeaderTitle()}
        loading={loading}
        onPrev={handlePrev}
        onToday={handleToday}
        onNext={handleNext}
        onRefresh={loadCalendarData}
        onNewBooking={() => {
          const slot = { resourceId: selectedResourceId };
          if (onOpenBooking) {
            onOpenBooking(slot);
          } else {
            setSelectedSlot(slot);
            setBookingModalOpen(true);
          }
        }}
        resources={resources}
        selectedResourceId={selectedResourceId}
        onResourceChange={setSelectedResourceId}
      />

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadCalendarData}
            className="underline ml-2 hover:text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* View Content */}
      {viewMode === "week" && (
        <WeekSchedule
          slotsData={slotsData}
          onSelectSlot={handleOpenSlotBooking}
          onSelectBooking={(b) => setSelectedBooking(b)}
        />
      )}

      {viewMode === "month" && (
        <MonthSchedule
          anchorDate={anchor}
          events={eventsData}
          onSelectSlot={handleOpenSlotBooking}
          onSelectBooking={(b) => setSelectedBooking(b)}
        />
      )}

      {viewMode === "day" && (
        <DaySchedule
          currentDateStr={currentDateStr}
          events={eventsData}
          onSelectSlot={handleOpenSlotBooking}
          onSelectBooking={(b) => setSelectedBooking(b)}
        />
      )}

      {/* Quick Booking Modal */}
      <QuickBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialSlot={selectedSlot}
        resources={resources}
        onConfirmBooking={() => {
          loadCalendarData();
        }}
      />

      {/* Booking Detail Modal (when user clicks an existing event) */}
      <BaseModal2026
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.title || "Thông tin lịch đặt"}
        subtitle={
          selectedBooking
            ? `${selectedBooking.resourceName || ""}`
            : ""
        }
        icon={Calendar}
        iconColor="text-sky-400"
        maxWidth="max-w-md"
        footer={
          <button
            type="button"
            onClick={() => setSelectedBooking(null)}
            className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
          >
            Đóng
          </button>
        }
      >
        {selectedBooking && (
          <div className="flex flex-col gap-3">
            <div className="mt-1">
              <BookingStatusBadge
                status={selectedBooking.status}
                occupancy={selectedBooking.occupancy}
              />
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              {(selectedBooking.start || selectedBooking.startAt) && (
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-400" />
                  <span className="text-slate-400">Thời gian:</span>
                  <span className="font-medium text-slate-100">
                    {formatVietnamDateTime(selectedBooking.start || selectedBooking.startAt)} –{" "}
                    {formatVietnamDateTime(selectedBooking.end || selectedBooking.endAt)}
                  </span>
                </div>
              )}

              {selectedBooking.purpose && (
                <div className="pt-2 border-t border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Mục đích sử dụng:</span>
                  <span className="text-slate-200">{selectedBooking.purpose}</span>
                </div>
              )}

              {selectedBooking.requestedBy && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="text-slate-400">Người đặt:</span>
                  <span className="text-slate-100">
                    {selectedBooking.requestedBy.fullName || selectedBooking.requestedBy.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </BaseModal2026>
    </div>
  );
};
