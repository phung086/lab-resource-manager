import React, { useState, useEffect } from "react";
import { Calendar, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, Shield, RefreshCw } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026.js";
import { LabPolicySummary } from "./LabPolicySummary";
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
  onViewBookings?: () => void;
  onProceedPayment?: (booking: any) => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  initialSlot,
  resources: passedResources,
  onConfirmBooking,
  onViewBookings,
  onProceedPayment
}) => {
  const [resources, setResources] = useState<any[]>(passedResources || []);
  const [loadingResources, setLoadingResources] = useState(passedResources === undefined);
  const [resourceError, setResourceError] = useState("");
  const [resourceRetry, setResourceRetry] = useState(0);
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
    if (!isOpen) return;
    let active = true;
    setResourceError("");

    if (passedResources !== undefined) {
      setResources(passedResources);
      setLoadingResources(false);
      if (passedResources.length > 0) {
        const initialRes = passedResources.find((r) => r.id === initialSlot?.resourceId) || passedResources[0];
        if (initialRes) setResourceId(initialRes.id);
      } else {
        setResourceId("");
      }
    } else {
      setLoadingResources(true);
      apiRequest("/resources")
        .then((data) => {
          if (!active) return;
          const list = Array.isArray(data) ? data : data.items || [];
          setResources(list);
          if (list.length > 0) {
            const initialRes = list.find((r: any) => r.id === initialSlot?.resourceId) || list[0];
            if (initialRes) setResourceId(initialRes.id);
          } else {
            setResourceId("");
          }
        })
        .catch((err) => {
          if (!active) return;
          setResourceError(err?.message || "Không thể tải danh sách tài nguyên.");
          console.error("Failed to load resources in modal", err);
          setResources([]);
          setResourceId("");
        })
        .finally(() => {
          if (active) setLoadingResources(false);
        });
    }
    return () => { active = false; };
  }, [passedResources, isOpen, initialSlot?.resourceId, resourceRetry]);

  // Handle initialSlot prepopulation
  useEffect(() => {
    if (!isOpen) return;

    if (initialSlot?.startAt) {
      const slotDate = toVietnamDateString(initialSlot.startAt);
      const slotStart = toVietnamTimeString(initialSlot.startAt);
      if (slotDate) setSelectedDate(slotDate);
      if (slotStart) setStartTime(slotStart);

      if (initialSlot.endAt) {
        const slotEnd = toVietnamTimeString(initialSlot.endAt);
        if (slotEnd) setEndTime(slotEnd);
      } else {
        const [h, m] = slotStart.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else if (initialSlot?.date) {
      setSelectedDate(initialSlot.date);
      if (initialSlot.time) {
        setStartTime(initialSlot.time);
        const [h, m] = initialSlot.time.split(":").map(Number);
        const endH = String(Math.min((h || 9) + 2, 21)).padStart(2, "0");
        setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
      }
    } else {
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

  const currentResource = resources.find((r) => r.id === resourceId) || null;
  const currentPolicy = currentResource?.labPolicy || currentResource?.laboratory?.labPolicy || null;

  const effectiveRequiresApproval = Boolean(
    currentResource?.effectiveRequiresApproval ??
    (currentResource?.requiresApproval || currentPolicy?.requiresApproval)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");

    if (!resourceId || !resources.some((r) => r.id === resourceId)) {
      setErrorMessage("Vui lòng chọn tài nguyên phòng thí nghiệm.");
      return;
    }
    if (!selectedDate || !startTime || !endTime) {
      setErrorMessage("Vui lòng nhập đầy đủ ngày và khung giờ.");
      return;
    }

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
      dismissible={!isSubmitting}
      title="Đặt lịch sử dụng phòng thí nghiệm"
      subtitle="Hệ thống ghi nhận yêu cầu và xác thực tính khả dụng theo thời gian thực"
      icon={Calendar}
      iconColor="text-blue-600"
      maxWidth="max-w-xl"
      footer={
        showSuccess ? (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-secondary font-medium">
              Vui lòng xem thông tin chi tiết ca đặt phía trên.
            </span>
            {onViewBookings && <button className="secondary-button" type="button" onClick={onViewBookings}>Xem lịch đặt của tôi</button>}
            <button
              id="booking-success-close-btn"
              type="button"
              onClick={onClose}
              className="booking-modal-complete-button"
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
              className="btn btn-secondary booking-modal-secondary-button"
            >
              Đóng
            </button>
            <button
              type="submit"
              form="quick-booking-form"
              disabled={isSubmitting || loadingResources || resources.length === 0 || !resourceId}
              className="btn btn-primary text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? "Đang gửi..." : "Xác nhận đặt lịch"}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </>
        )
      }
    >
      {showSuccess ? (
        /* Persisted success confirmation */
        <div className="booking-success-panel" role="status">
          <div className="booking-success-header">
            <CheckCircle2 size={28} className="booking-success-icon" aria-hidden="true" />
            <div>
              <h4 className="booking-success-title">Đặt lịch thành công</h4>
              <p className="booking-success-desc">
                {createdBooking?.status === "CONFIRMED"
                  ? "Lịch đặt đã được tự động xác nhận."
                  : "Lịch đặt đã ghi nhận và đang chờ cán bộ phòng lab phê duyệt."}
              </p>
            </div>
          </div>

          <div className="booking-success-details">
            <div className="booking-detail-row">
              <span className="booking-detail-label">Trạng thái</span>
              <span
                id="created-booking-status"
                className={`booking-status-chip ${
                  createdBooking?.status === "CONFIRMED" ? "is-confirmed" : "is-pending"
                }`}
              >
                {createdBooking?.status === "CONFIRMED" ? "Xác nhận ngay" : "Chờ phê duyệt"}
              </span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">Tài nguyên</span>
              <span className="booking-detail-value">{currentResource?.name} ({currentResource?.code})</span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">Thời gian</span>
              <span className="booking-detail-value font-mono">{selectedDate} · {startTime} – {endTime}</span>
            </div>
            {createdBooking?.id && (
              <div className="booking-detail-row border-top">
                <span className="booking-detail-label">Mã booking</span>
                <span className="booking-detail-value font-mono text-muted">{createdBooking.id}</span>
              </div>
            )}
          </div>
          {onProceedPayment && createdBooking?.id && <div className="alert"><p>Thanh toán đặt phòng LAB được xử lý theo khoản thu do quản trị viên tạo. Nếu chưa có khoản thu, bạn chưa cần thanh toán.</p><button type="button" className="secondary-button" onClick={() => onProceedPayment(createdBooking)}>Xem khoản thanh toán của lịch đặt</button></div>}
        </div>
      ) : (
        <form id="quick-booking-form" onSubmit={handleSubmit} className="booking-form">
          {errorMessage && (
            <div className="alert danger" role="alert">
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resource Selector */}
          <div className="booking-field">
            <label htmlFor="booking-resource-select" className="booking-label">
              <span>Thiết bị / Phòng thí nghiệm <span aria-hidden="true">*</span></span>
              {currentResource && (
                effectiveRequiresApproval ? (
                  <span className="booking-approval-badge is-required">
                    <ShieldAlert size={11} aria-hidden="true" /> Cần duyệt
                  </span>
                ) : (
                  <span className="booking-approval-badge is-instant">
                    <Shield size={11} aria-hidden="true" /> Xác nhận tức thì
                  </span>
                )
              )}
            </label>
            {loadingResources ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-blue-600" />
                <span>Đang tải danh sách tài nguyên...</span>
              </div>
            ) : resourceError ? (<div className="alert danger" role="alert"><span>{resourceError}</span><button className="secondary-button" type="button" onClick={() => setResourceRetry(value => value + 1)}>Thử lại</button></div>) : resources.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-1">
                  <AlertCircle size={13} /> Không có tài nguyên khả dụng
                </span>
                <span>Cần có ít nhất một phòng hoặc thiết bị hoạt động trước khi tạo lịch đặt. Vui lòng liên hệ quản trị viên.</span>
              </div>
            ) : (
              <select
                id="booking-resource-select"
                aria-label="Chọn tài nguyên lịch"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required
              >
                {!resourceId && (
                  <option value="">-- Chọn tài nguyên phòng thí nghiệm --</option>
                )}
                {resources.map((r) => {
                  const rApproval = Boolean(
                    r.effectiveRequiresApproval ??
                    (r.requiresApproval || r.laboratory?.labPolicy?.requiresApproval || r.labPolicy?.requiresApproval)
                  );
                  return (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}{rApproval ? " (Cần duyệt)" : " (Tức thì)"}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Booking Title */}
          <div className="booking-field">
            <label htmlFor="booking-title" className="booking-label">
              Tiêu đề buổi làm việc <span aria-hidden="true">*</span>
            </label>
            <input
              id="booking-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vd: Thử nghiệm mô hình học sâu, Thực hành robot..."
            />
          </div>

          {/* Purpose */}
          <div className="booking-field">
            <label htmlFor="booking-purpose" className="booking-label">
              Mục đích sử dụng
            </label>
            <textarea
              id="booking-purpose"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Mô tả mục đích sử dụng tài nguyên (đề tài, môn học, thí nghiệm)..."
            />
          </div>

          {/* Date and Time Grid */}
          <div className="booking-time-grid">
            <div className="booking-field">
              <label htmlFor="booking-date" className="booking-label">
                Ngày đặt <span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="booking-field">
              <label htmlFor="booking-start-time" className="booking-label">
                Giờ bắt đầu <span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="booking-field">
              <label htmlFor="booking-end-time" className="booking-label">
                Giờ kết thúc <span aria-hidden="true">*</span>
              </label>
              <input
                id="booking-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <p className="booking-review-note">Thời gian theo giờ Việt Nam (UTC+07:00). {effectiveRequiresApproval ? "Sau khi gửi, yêu cầu sẽ chờ cán bộ lab duyệt." : "Lịch sẽ được xác nhận nếu khung giờ và chính sách hợp lệ."}</p>
          <LabPolicySummary policy={currentPolicy} requiresApproval={currentResource ? effectiveRequiresApproval : undefined} />
        </form>
      )}
    </BaseModal2026>
  );
};
