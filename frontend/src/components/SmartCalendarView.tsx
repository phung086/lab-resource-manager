import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../api.js";
import { QuickBookingModal } from "./QuickBookingModal.js";
import { CalendarToolbar } from "./calendar/CalendarToolbar.js";
import { WeekSchedule } from "./calendar/WeekSchedule.js";
import { DaySchedule } from "./calendar/DaySchedule.js";
import { MonthSchedule } from "./calendar/MonthSchedule.js";
import { BookingStatusBadge } from "./BookingStatusBadge.js";
import { X, Clock, Calendar, User } from "lucide-react";

export interface SmartCalendarViewProps {
  onOpenBooking?: (slot?: any) => void;
  onOpenCheckIn?: (booking?: any) => void;
  user?: any;
}

export const SmartCalendarView: React.FC<SmartCalendarViewProps> = ({ user }) => {
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
    const d = new Date();
    if (viewMode === "week") {
      d.setDate(d.getDate() + weekOffset * 7);
    } else if (viewMode === "month") {
      d.setMonth(d.getMonth() + monthOffset);
      d.setDate(1);
    } else if (viewMode === "day") {
      d.setDate(d.getDate() + dayOffset);
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
        const startOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const endOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);

        const queryParams = new URLSearchParams();
        if (selectedResourceId) queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", startOfMonth.toISOString());
        queryParams.set("end", endOfMonth.toISOString());

        const data = await apiRequest(`/calendar/events?${queryParams.toString()}`);
        setEventsData(data.events || []);
      } else if (viewMode === "day") {
        const startOfDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 0, 0, 0);
        const endOfDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59, 59);

        const queryParams = new URLSearchParams();
        if (selectedResourceId) queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", startOfDay.toISOString());
        queryParams.set("end", endOfDay.toISOString());

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
    const startTimeIso = `${dateStr}T${timeStr}:00`;
    const [h, m] = timeStr.split(":").map(Number);
    const endH = String(h + 1).padStart(2, "0");
    const endTimeIso = `${dateStr}T${endH}:${String(m).padStart(2, "0")}:00`;

    setSelectedSlot({
      resourceId: selectedResourceId,
      startAt: startTimeIso,
      endAt: endTimeIso
    });
    setBookingModalOpen(true);
  };

  // Compute title string
  const getHeaderTitle = () => {
    const anchor = getAnchorDate();
    const formattedMonth = anchor.toLocaleDateString("vi-VN", { month: "long" });
    const year = anchor.getFullYear();

    if (viewMode === "day") {
      return `${anchor.toLocaleDateString("vi-VN", { weekday: "long" })}, ${anchor.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    }
    if (viewMode === "month") {
      return `${formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)} năm ${year}`;
    }
    if (slotsData?.daysHeader?.length) {
      const first = slotsData.daysHeader[0]?.dateStr;
      const last = slotsData.daysHeader[6]?.dateStr;
      return `Tuần từ ${first} đến ${last} (${year})`;
    }
    return `Tháng ${anchor.getMonth() + 1}, ${year}`;
  };

  const anchor = getAnchorDate();
  const currentDateStr = anchor.toISOString().split("T")[0];

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
          setSelectedSlot(null);
          setBookingModalOpen(true);
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
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-lg flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  {selectedBooking.title || "Thông tin lịch đặt"}
                </h3>
                <div className="mt-1">
                  <BookingStatusBadge
                    status={selectedBooking.status}
                    occupancy={selectedBooking.occupancy}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              {selectedBooking.resourceName && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="text-slate-400">Tài nguyên:</span>
                  <span className="font-medium text-slate-100">
                    {selectedBooking.resourceName}
                  </span>
                </div>
              )}

              {(selectedBooking.start || selectedBooking.startAt) && (
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-400" />
                  <span className="text-slate-400">Thời gian:</span>
                  <span className="font-medium text-slate-100">
                    {(selectedBooking.start || selectedBooking.startAt)?.slice(0, 10)}{" "}
                    {(selectedBooking.start || selectedBooking.startAt)?.slice(11, 16)} –{" "}
                    {(selectedBooking.end || selectedBooking.endAt)?.slice(11, 16)}
                  </span>
                </div>
              )}

              {selectedBooking.purpose && (
                <div className="mt-1 pt-2 border-t border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Mục đích sử dụng:</span>
                  <span className="text-slate-200">{selectedBooking.purpose}</span>
                </div>
              )}

              {selectedBooking.requestedBy && (
                <div className="mt-1 pt-2 border-t border-slate-700/60 flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="text-slate-400">Người đặt:</span>
                  <span className="text-slate-100">
                    {selectedBooking.requestedBy.fullName || selectedBooking.requestedBy.email}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
