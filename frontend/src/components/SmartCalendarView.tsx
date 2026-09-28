import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../api.js";
import { QuickBookingModal } from "./QuickBookingModal.js";
import { CalendarToolbar } from "./calendar/CalendarToolbar.js";
import { WeekSchedule } from "./calendar/WeekSchedule.js";
import { DaySchedule } from "./calendar/DaySchedule.js";
import { MonthSchedule } from "./calendar/MonthSchedule.js";
import { BookingStatusBadge } from "./BookingStatusBadge.js";
import { BaseModal2026 } from "./BaseModal2026.js";
import { Clock, Calendar, User, AlertCircle } from "lucide-react";
import { formatVietnamDateTime, getVietnamTodayDateString, toVietnamDateString, vietnamTimeToIso } from "../utils/timezone.js";

export interface SmartCalendarViewProps {
  onOpenBooking?: (slot?: any) => void;
  onOpenCheckIn?: (booking?: any) => void;
  user?: any;
  initialResourceId?: string;
  refreshKey?: number;
}

export const SmartCalendarView: React.FC<SmartCalendarViewProps> = ({ user, onOpenBooking, initialResourceId = "", refreshKey = 0 }) => {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedResourceId, setSelectedResourceId] = useState<string>(initialResourceId);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calendarRequest = useRef(0);

  // Slots state for Week View
  const [slotsData, setSlotsData] = useState<any>(null);

  // Events state for Month and Day Views
  const [eventsData, setEventsData] = useState<any[]>([]);

  // Modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // 1. Fetch available resources with explicit states
  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    setResourcesError("");
    try {
      const data = await apiRequest("/resources");
      const list = Array.isArray(data) ? data : data.items || [];
      setResources(list);
      if (list.length > 0) {
        setSelectedResourceId((prev) => {
          if (prev && list.some((r: any) => r.id === prev)) {
            return prev;
          }
          return list[0].id;
        });
      } else {
        setSelectedResourceId("");
        setSlotsData(null);
        setEventsData([]);
      }
    } catch (err: any) {
      console.error("Failed to load resources for calendar", err);
      setResourcesError(err?.message || "Không thể tải danh sách tài nguyên phòng thí nghiệm.");
      setResources([]);
      setSelectedResourceId("");
      setSlotsData(null);
      setEventsData([]);
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

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

  // 2. Fetch Calendar Data whenever dependencies change (guarded by selectedResourceId)
  const loadCalendarData = useCallback(async () => {
    const version = ++calendarRequest.current;
    if (!selectedResourceId) {
      setSlotsData(null);
      setEventsData([]);
      return;
    }

    setLoading(true);
    setSlotsData(null);
    setEventsData([]);
    setError("");
    try {
      const anchor = getAnchorDate();
      const dateStr = toVietnamDateString(anchor);

      if (viewMode === "week") {
        const queryParams = new URLSearchParams();
        queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start_date", dateStr);

        const data = await apiRequest(`/calendar/slots?${queryParams.toString()}`);
        if (version === calendarRequest.current) setSlotsData(data);
      } else if (viewMode === "month") {
        const startDate = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}-01`;
        const nextMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
        const endDate = toVietnamDateString(nextMonth);

        const queryParams = new URLSearchParams();
        queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", vietnamTimeToIso(startDate, "00:00"));
        queryParams.set("end", vietnamTimeToIso(endDate, "00:00"));

        const data = await apiRequest(`/calendar/events?${queryParams.toString()}`);
        if (version === calendarRequest.current) setEventsData(data.events || []);
      } else if (viewMode === "day") {
        const nextDay = new Date(anchor);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const queryParams = new URLSearchParams();
        queryParams.set("resource_id", selectedResourceId);
        queryParams.set("start", vietnamTimeToIso(dateStr, "00:00"));
        queryParams.set("end", vietnamTimeToIso(toVietnamDateString(nextDay), "00:00"));

        const data = await apiRequest(`/calendar/events?${queryParams.toString()}`);
        if (version === calendarRequest.current) setEventsData(data.events || []);
      }
    } catch (err: any) {
      console.error("Error loading calendar data", err);
      if (version === calendarRequest.current) setError(err.message || "Không thể tải dữ liệu lịch biểu");
    } finally {
      if (version === calendarRequest.current) setLoading(false);
    }
  }, [viewMode, selectedResourceId, getAnchorDate]);

  useEffect(() => {
    loadCalendarData();
    return () => { calendarRequest.current += 1; };
  }, [loadCalendarData, refreshKey]);

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

  // Open booking modal prefilled (strictly guarded by selectedResourceId)
  const handleOpenSlotBooking = (dateStr: string, timeStr: string) => {
    if (!selectedResourceId) return;

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
  const currentDateStr = toVietnamDateString(anchor);
  const selectedResource = resources.find((r) => r.id === selectedResourceId) || null;

  const blocked = selectedResource && (!["AVAILABLE", "IN_USE"].includes(selectedResource.operationalStatus) || selectedResource.bookingState !== "bookable");

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
        onRefresh={() => {
          loadResources();
          loadCalendarData();
        }}
        onNewBooking={() => {
          if (!selectedResourceId) return;
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

      {/* Resource Load Error Notice with Retry */}
      {resourcesError && (
        <div className="alert danger text-xs flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
            <span>{resourcesError}</span>
          </div>
          <button
            type="button"
            onClick={loadResources}
            className="btn btn-secondary text-xs px-2.5 py-1"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Calendar Data Error Notice */}
      {error && !resourcesError && (
        <div className="alert danger text-xs flex items-center justify-between" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadCalendarData}
            className="underline ml-2"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Resource Loading State */}
      {resourcesLoading && (
        <div aria-live="polite" className="calendar-week-loading">
          Đang tải danh sách tài nguyên phòng thí nghiệm...
        </div>
      )}

      {/* Honest Empty State when zero resources exist */}
      {!resourcesLoading && !resourcesError && resources.length === 0 && (
        <div className="calendar-empty-resources-card card p-8 sm:p-12 text-center flex flex-col items-center justify-center my-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Calendar size={28} aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Chưa có tài nguyên khả dụng
          </h3>
          <p className="text-sm text-slate-600 max-w-md mb-3">
            Hiện chưa có phòng hoặc thiết bị để xem lịch và đặt chỗ.
          </p>
          <div className="text-xs text-slate-500 max-w-md bg-slate-50 border border-slate-200 rounded-lg p-3">
            {user?.role === "ADMIN" || user?.role === "LAB_STAFF" ? (
              <span>
                Vui lòng cấu hình và kích hoạt tài nguyên trong mục <strong>Quản lý tài nguyên</strong> trước khi sử dụng lịch biểu.
              </span>
            ) : (
              <span>
                Vui lòng liên hệ quản trị viên hoặc cán bộ phòng thí nghiệm để được cấp quyền truy cập tài nguyên.
              </span>
            )}
          </div>
        </div>
      )}

      {/* View Content (only rendered when a valid resource exists) */}
      {loading && <p className="empty-state" role="status">Đang tải lịch của tài nguyên…</p>}
      {!loading && !error && !resourcesLoading && !resourcesError && resources.length > 0 && selectedResourceId && (
        <>
          {viewMode === "week" && (
            <WeekSchedule
              slotsData={slotsData}
              selectedResourceName={selectedResource?.name}
              onSelectSlot={handleOpenSlotBooking}
              onSelectBooking={(b) => setSelectedBooking(b)}
            />
          )}

          {viewMode === "month" && (
            <MonthSchedule
              blocked={Boolean(blocked)}
              anchorDate={anchor}
              events={eventsData}
              selectedResourceName={selectedResource?.name}
              onSelectSlot={handleOpenSlotBooking}
              onSelectBooking={(b) => setSelectedBooking(b)}
            />
          )}

          {viewMode === "day" && (
            <DaySchedule
              blocked={Boolean(blocked)}
              currentDateStr={currentDateStr}
              events={eventsData}
              selectedResourceName={selectedResource?.name}
              onSelectSlot={handleOpenSlotBooking}
              onSelectBooking={(b) => setSelectedBooking(b)}
            />
          )}
        </>
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
        iconColor="text-blue-600"
        maxWidth="max-w-md"
        footer={
          <button
            type="button"
            onClick={() => setSelectedBooking(null)}
            className="btn btn-secondary text-xs"
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

            <div className="calendar-detail-card flex flex-col gap-2.5 text-xs">
              {(selectedBooking.start || selectedBooking.startAt) && (
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-muted shrink-0" aria-hidden="true" />
                  <span className="text-muted">Thời gian:</span>
                  <span className="font-medium font-mono">
                    {formatVietnamDateTime(selectedBooking.start || selectedBooking.startAt)} –{" "}
                    {formatVietnamDateTime(selectedBooking.end || selectedBooking.endAt)}
                  </span>
                </div>
              )}

              {selectedBooking.purpose && (
                <div className="calendar-detail-subfield pt-2">
                  <span className="text-muted block mb-0.5 font-medium">Mục đích sử dụng:</span>
                  <span>{selectedBooking.purpose}</span>
                </div>
              )}

              {selectedBooking.requestedBy && (
                <div className="calendar-detail-subfield pt-2 flex items-center gap-2">
                  <User size={13} className="text-muted shrink-0" aria-hidden="true" />
                  <span className="text-muted">Người đặt:</span>
                  <span className="font-medium">
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
