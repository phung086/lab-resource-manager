import React, { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";
import { apiRequest, ApiError } from "../api.js";

export interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: {
    date?: string;
    time?: string;
    resourceId?: string;
    resourceName?: string;
  };
  resources?: Array<{
    id: string;
    name: string;
    code: string;
    subtype?: string;
    type?: string;
    requiresApproval?: boolean;
    operationalStatus?: string;
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
        const initialRes = passedResources.find(r => r.id === initialSlot?.resourceId) || passedResources[0];
        setResourceId(initialRes.id);
      }
    } else if (isOpen) {
      apiRequest("/resources")
        .then((data) => {
          const list = Array.isArray(data) ? data : data.items || [];
          setResources(list);
          if (list.length > 0 && !resourceId) {
            const initialRes = list.find((r: any) => r.id === initialSlot?.resourceId) || list[0];
            setResourceId(initialRes.id);
          }
        })
        .catch(() => {});
    }
  }, [passedResources, isOpen]);

  useEffect(() => {
    if (initialSlot?.date) {
      setSelectedDate(initialSlot.date);
    } else if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }

    if (initialSlot?.time) {
      setStartTime(initialSlot.time);
      const [h, m] = initialSlot.time.split(":").map(Number);
      const endH = String(Math.min(h + 2, 21)).padStart(2, "0");
      setEndTime(`${endH}:${String(m || 0).padStart(2, "0")}`);
    }

    if (initialSlot?.resourceId) {
      setResourceId(initialSlot.resourceId);
    }

    setErrorMessage("");
    setShowSuccess(false);
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const currentResource = resources.find((r) => r.id === resourceId) || resources[0] || null;

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

    const startAt = new Date(`${selectedDate}T${startTime}:00`);
    const endAt = new Date(`${selectedDate}T${endTime}:00`);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      setErrorMessage("Định dạng ngày hoặc giờ không hợp lệ.");
      return;
    }
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
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString()
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

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1600);
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
          <div className="w-full flex items-center justify-between font-mono text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>
                {createdBooking?.status === "CONFIRMED"
                  ? "Đặt lịch thành công! Đã tự động xác nhận."
                  : "Đã gửi yêu cầu! Đang chờ Quản lý Lab phê duyệt."}
              </span>
            </span>
            <span className="text-slate-400 font-bold">
              Trạng thái: {createdBooking?.status || "CONFIRMED"}
            </span>
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
            {currentResource?.requiresApproval ? (
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
            {resources.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                {r.code} - {r.name} {r.requiresApproval ? "(Cần duyệt)" : "(Tức thì)"}
              </option>
            ))}
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

        {/* Policy helper info */}
        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-cyan-300/80 text-[11px] font-mono flex items-center gap-2">
          <Clock size={14} className="text-cyan-400 shrink-0" />
          <span>Quy định: Thời gian đặt tối thiểu 30 phút, tối đa 8 tiếng trong khung giờ hoạt động của phòng lab.</span>
        </div>
      </form>
    </BaseModal2026>
  );
};
