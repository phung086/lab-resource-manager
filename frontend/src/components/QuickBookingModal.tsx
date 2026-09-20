import React, { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.js";
import { apiRequest, ApiError } from "../api.js";
import {
  toVietnamDateString,
  toVietnamTimeString,
  vietnamTimeToIso,
  getVietnamTomorrowDateString
} from "../utils/timezone.js";

export interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: {
    resourceId?: string;
    startAt?: string;
    endAt?: string;
    date?: string;
    time?: string;
    resourceName?: string;
  } | null;
  resources?: Array<{
    id: string;
    name: string;
    code: string;
    subtype?: string;
    type?: string;
    requiresApproval?: boolean;
    effectiveRequiresApproval?: boolean;
    operationalStatus?: string;
    labPolicy?: any;
    laboratory?: {
      id?: string;
      name?: string;
      code?: string;
      labPolicy?: any;
    };
  }>;
  onConfirmBooking?: (booking: any) => void;
  onProceedPayment?: (booking: any) => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  initialSlot,
  resources: passedResources,
  onConfirmBooking
}) => {
  const [resources, setResources] = useState<any[]>(passedResources || []);
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [resourceId, setResourceId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Load resources if not passed or empty
  useEffect(() => {
    if (passedResources && passedResources.length > 0) {
      setResources(passedResources);
      if (!resourceId) {
        const initialRes = passedResources.find((r) => r.id === initialSlot?.resourceId) || passedResources[0];
        if (initialRes) setResourceId(initialRes.id);
      }
    } else if (isOpen) {
      apiRequest("/resources")
        .then((data) => {
          const list = Array.isArray(data) ? data : data.items || [];
          setResources(list);
          if (list.length > 0 && !resourceId) {
            const initialRes = list.find((r: any) => r.id === initialSlot?.resourceId) || list[0];
            if (initialRes) setResourceId(initialRes.id);
          }
        })
        .catch(() => {});
    }
  }, [passedResources, isOpen]);

  // Handle initialSlot prepopulation
  useEffect(() => {
    if (!isOpen) return;

    if (initialSlot?.startAt) {
      // Canonical initial-slot contract: ISO timestamps
      const slotDate = toVietnamDateString(initialSlot.startAt);
      const slotStart = toVietnamTimeString(initialSlot.startAt);
      if (slotDate) setSelectedDate(slotDate);
      if (slotStart) setStartTime(slotStart);

      if (initialSlot.endAt) {
        const slotEnd = toVietnamTimeString(initialSlot.endAt);
        if (slotEnd) setEndTime(slotEnd);
      } else {
        // Default 2-hour duration if endAt not supplied
        const [h, m] = slotStart.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else if (initialSlot?.date) {
      // Backward compatibility for date/time strings
      setSelectedDate(initialSlot.date);
      if (initialSlot.time) {
        setStartTime(initialSlot.time);
        const [h, m] = initialSlot.time.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else {
      // Default to tomorrow in Vietnam wall-clock date
      setSelectedDate(getVietnamTomorrowDateString());
      setStartTime("09:00");
      setEndTime("11:00");
    }

    if (initialSlot?.resourceId) {
      setResourceId(initialSlot.resourceId);
    }

    setErrorMessage("");
    setShowSuccess(false);
    setCreatedBooking(null);
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const currentResource = resources.find((r) => r.id === resourceId) || resources[0] || null;
  const currentPolicy = currentResource?.labPolicy || currentResource?.laboratory?.labPolicy || null;

  // Effective approval requirement: resource approval OR labPolicy approval
  const effectiveRequiresApproval = Boolean(
    currentResource?.effectiveRequiresApproval ??
    (currentResource?.requiresApproval || currentPolicy?.requiresApproval)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!resourceId) {
      setErrorMessage("Vui lòng chọn tài nguyên phòng thí nghiệm.");
      return;
    }
    if (!selectedDate || !startTime || !endTime) {
      setErrorMessage("Vui lòng nhập đầy đủ ngày và khung giờ.");
      return;
    }

    // Unambiguous Vietnam ISO timestamps (+07:00)
    let startAtIso: string;
    let endAtIso: string;
    try {
      startAtIso = vietnamTimeToIso(selectedDate, startTime);
      endAtIso = vietnamTimeToIso(selectedDate, endTime);
    } catch {
      setErrorMessage("Định dạng ngày hoặc giờ không hợp lệ.");
      return;
    }

    const startAt = new Date(startAtIso);
    const endAt = new Date(endAtIso);

    if (startAt >= endAt) {
      setErrorMessage("Thời gian bắt đầu phải trước thời gian kết thúc.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        resourceId,
        title: title.trim() || `Đặt chỗ: ${currentResource?.name || "Tài nguyên"}`,
        purpose: purpose.trim() || "Nghiên cứu & Thực hành phòng thí nghiệm",
        startAt: startAtIso,
        endAt: endAtIso
      };

      const booking = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCreatedBooking(booking);
      setShowSuccess(true);

      if (onConfirmBooking) {
        onConfirmBooking(booking);
      }
      // NO setTimeout auto-close: keep state visible for user to read status and dismiss manually
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Không thể tạo lịch đặt.";
      if (err?.code === "BOOKING_CONFLICT") {
        setErrorMessage("Xung đột lịch đặt: Khung giờ này đã có người đăng ký.");
      } else if (err?.code === "MAINTENANCE_CONFLICT" || err?.code === "CALIBRATION_CONFLICT") {
        setErrorMessage("Tài nguyên đang trong lịch bảo trì hoặc hiệu chuẩn.");
      } else if (err?.code === "POLICY_VIOLATION") {
        setErrorMessage(`Vi phạm chính sách: ${msg}`);
      } else if (err?.code === "RESOURCE_UNAVAILABLE") {
        setErrorMessage("Tài nguyên hiện đang ngoại tuyến hoặc không khả dụng.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Đặt Lịch Khung Giờ Phòng Lab"
      subtitle="Hệ thống xác thực tính khả dụng thời gian thực và ghi nhận nhật ký kiểm toán"
      icon={Calendar}
      iconColor="text-cyan-400"
      maxWidth="max-w-xl"
      footer={
        showSuccess ? (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              Vui lòng xem thông tin chi tiết ca đặt phía trên.
            </span>
            <button
              id="booking-success-close-btn"
              type="button"
              onClick={onClose}
              className="font-mono text-xs px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer transition-colors"
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="font-mono text-xs btn-cyan-gradient px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
            >
              <span>{isSubmitting ? "ĐANG GỬI..." : "⚡ Xác Nhận Đặt Lịch"}</span>
              <ArrowRight size={14} />
            </button>
          </>
        )
      }
    >
      {showSuccess ? (
        /* Real persisted success confirmation view */
        <div className="flex flex-col gap-4 p-4 bg-emerald-950/25 border border-emerald-500/40 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-200">
                Đặt Lịch Thành Công!
              </h4>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                {createdBooking?.status === "CONFIRMED"
                  ? "Ca đặt đã được tự động xác nhận vào hệ thống."
                  : "Ca đặt đã được ghi nhận và đang chờ Cán bộ quản lý phòng lab phê duyệt."}
              </p>
            </div>
          </div>

          <div className="bg-black/40 rounded-lg p-3 border border-emerald-500/20 text-xs font-mono flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Trạng thái:</span>
              <span
                id="created-booking-status"
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  createdBooking?.status === "CONFIRMED"
                    ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-900/60 text-amber-300 border border-amber-500/40"
                }`}
              >
                {createdBooking?.status === "CONFIRMED" ? "XÁC NHẬN TỨC THÌ (CONFIRMED)" : "CHỜ DUYỆT (PENDING_APPROVAL)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tài nguyên:</span>
              <span className="text-white font-medium">{currentResource?.name} ({currentResource?.code})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Thời gian (VN):</span>
              <span className="text-cyan-300">{selectedDate} | {startTime} – {endTime}</span>
            </div>
            {createdBooking?.id && (
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-slate-400">Mã ca đặt:</span>
                <span className="text-slate-300 text-[10px]">{createdBooking.id}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resource Selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-resource-select" className="font-mono text-xs text-slate-300 flex items-center justify-between">
              <span>Thiết bị / Phòng thí nghiệm *</span>
              {effectiveRequiresApproval ? (
                <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert size={12} /> Cần duyệt
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <Sparkles size={12} /> Xác nhận tức thì
                </span>
              )}
            </label>
            <select
              id="booking-resource-select"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
            >
              {resources.map((r) => {
                const rApproval = Boolean(
                  r.effectiveRequiresApproval ??
                  (r.requiresApproval || r.laboratory?.labPolicy?.requiresApproval || r.labPolicy?.requiresApproval)
                );
                return (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.code} - {r.name} {rApproval ? "(Cần duyệt)" : "(Tức thì)"}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-title" className="font-mono text-xs text-slate-300">
              Tiêu đề buổi làm việc *
            </label>
            <input
              id="booking-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vd: Thử nghiệm mô hình học sâu, Nghiên cứu robot..."
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
            />
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-purpose" className="font-mono text-xs text-slate-300">
              Mục đích sử dụng
            </label>
            <textarea
              id="booking-purpose"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Mô tả mục đích sử dụng tài nguyên (đề tài, môn học, thí nghiệm)..."
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none resize-none"
            />
          </div>

          {/* Date and Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="booking-date" className="font-mono text-xs text-slate-300">
                Ngày đặt *
              </label>
              <input
                id="booking-date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="booking-start-time" className="font-mono text-xs text-slate-300">
                Giờ bắt đầu *
              </label>
              <input
                id="booking-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="booking-end-time" className="font-mono text-xs text-slate-300">
                Giờ kết thúc *
              </label>
              <input
                id="booking-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
              />
            </div>
          </div>

          {/* Policy helper info: truthful dynamic or generic policy display */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-cyan-300/80 text-[11px] font-mono flex items-start gap-2">
            <Clock size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {currentPolicy ? (
                <>
                  <span>
                    Chính sách lab: Tối thiểu {currentPolicy.minBookingMinutes ?? 15} phút
                    {currentPolicy.maxBookingMinutes ? `, tối đa ${currentPolicy.maxBookingMinutes / 60} tiếng/ca` : ""}.
                  </span>
                  {currentPolicy.workDayStartHour != null && currentPolicy.workDayEndHour != null && (
                    <span>
                      Giờ mở cửa: {currentPolicy.workDayStartHour}:00 – {currentPolicy.workDayEndHour}:00
                      {currentPolicy.allowWeekend === false ? " (nghỉ Thứ 7 & Chủ Nhật)" : ""}.
                    </span>
                  )}
                </>
              ) : (
                <span>Thời gian đặt phải tuân thủ chính sách quy định của phòng thí nghiệm.</span>
              )}
            </div>
          </div>
        </form>
      )}
    </BaseModal2026>
  );
};
