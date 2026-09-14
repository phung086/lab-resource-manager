import React, { useState, useEffect } from "react";
import { Calendar, Clock, Sparkles, ShieldCheck, CheckCircle2, Zap, ArrowRight, User, Users, Info } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";

export interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: {
    date?: string;
    time?: string;
    resourceId?: string;
    resourceName?: string;
  };
  onConfirmBooking?: (booking: any) => void;
  onProceedPayment?: (booking: any) => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  initialSlot,
  onConfirmBooking,
  onProceedPayment
}) => {
  const [selectedDate, setSelectedDate] = useState("2026-09-10");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [resourceId, setResourceId] = useState("res-01");
  const [purpose, setPurpose] = useState("Huấn luyện mô hình AI & Thử nghiệm thuật toán");
  const [attendees, setAttendees] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resources = [
    { id: "res-01", name: "Cụm Máy Chủ GPU NVIDIA H100 (AI High-Perf)", type: "Compute", hourlyRate: "150.000 đ/h" },
    { id: "res-02", name: "Phòng Nghiên Cứu Lab AI Chuyên Sâu A1", type: "Room", hourlyRate: "80.000 đ/h" },
    { id: "res-03", name: "Phòng Họp Thông Minh & Hội Thảo Trực Tuyến", type: "Meeting Pod", hourlyRate: "50.000 đ/h" },
    { id: "res-04", name: "Khu Vực Thử Nghiệm Robot & Edge AI Lab", type: "Testing Ground", hourlyRate: "100.000 đ/h" }
  ];

  useEffect(() => {
    if (initialSlot?.date) setSelectedDate(initialSlot.date);
    if (initialSlot?.time) setStartTime(initialSlot.time);
    if (initialSlot?.resourceId) setResourceId(initialSlot.resourceId);
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const currentResource = resources.find((r) => r.id === resourceId) || resources[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingPayload = {
      id: "BK-" + Math.floor(100000 + Math.random() * 900000),
      code: "214ae7c1",
      resourceId,
      resourceName: currentResource.name,
      date: selectedDate,
      startTime,
      endTime,
      purpose,
      attendees,
      amount: 150000,
      status: "confirmed"
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      if (onConfirmBooking) onConfirmBooking(bookingPayload);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    }, 600);
  }

  function handleOpenVietQR() {
    const bookingPayload = {
      id: "BK-" + Math.floor(100000 + Math.random() * 900000),
      code: "214ae7c1",
      resourceId,
      resourceName: currentResource.name,
      date: selectedDate,
      startTime,
      endTime,
      purpose,
      amount: 150000
    };
    if (onProceedPayment) {
      onProceedPayment(bookingPayload);
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Đặt Lịch Khung Giờ Mới"
      subtitle="Hệ thống điều phối thông minh tự động kiểm tra xung đột và tối ưu hiệu suất sử dụng"
      icon={Calendar}
      iconColor="text-cyan-400"
      maxWidth="max-w-xl"
      footer={
        showSuccess ? (
          <div className="w-full flex items-center justify-between font-mono text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Đặt lịch thành công! Mã xác nhận đã được tạo.</span>
            </span>
            <span className="text-slate-500">Mã: #{initialSlot?.date ? "2026-0910" : "BK-NEW"}</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleOpenVietQR}
              className="font-mono text-xs text-cyan-300 hover:text-white px-4 py-2 rounded-lg border border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/40 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Zap size={13} className="text-cyan-400" />
              <span>Thanh Toán VietQR (Cọc 150k)</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="font-mono text-xs btn-cyan-gradient px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
            >
              <span>{isSubmitting ? "ĐANG XÁC NHẬN..." : "⚡ Xác Nhận Đặt Chỗ"}</span>
              <ArrowRight size={14} />
            </button>
          </>
        )
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Resource Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-slate-300 flex items-center justify-between">
            <span>Tài nguyên / Dịch vụ cần đặt *</span>
            <span className="text-cyan-400 font-bold">{currentResource.hourlyRate}</span>
          </label>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400">Ngày đặt lịch</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400">Giờ bắt đầu</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400">Giờ kết thúc</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none"
            />
          </div>
        </div>

        {/* Purpose */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-slate-300">Mục đích sử dụng / Tên đề tài *</label>
          <input
            type="text"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="VD: Nghiên cứu nhận diện hình ảnh y tế..."
            className="bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2.5 text-xs font-sans outline-none"
          />
        </div>

        {/* Attendees */}
        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/10 rounded-xl">
          <div className="flex items-center gap-2 text-xs font-sans text-slate-300">
            <Users size={15} className="text-slate-400" />
            <span>Số lượng người tham gia cùng ca:</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setAttendees(Math.max(1, attendees - 1))}
              className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              -
            </button>
            <span className="w-6 text-center font-bold text-cyan-300">{attendees}</span>
            <button
              type="button"
              onClick={() => setAttendees(Math.min(10, attendees + 1))}
              className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>

        {/* AI Smart Advisory Card */}
        <div className="p-3.5 bg-gradient-to-br from-violet-950/40 to-slate-950 border border-violet-500/40 rounded-xl flex items-start gap-3 shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-violet-900/60 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-violet-300 uppercase tracking-wider">
                AI TƯ VẤN KHUNG GIỜ TỐI ƯU
              </span>
              <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                ĐỘ TIN CẬY 98%
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Khung giờ <strong className="text-white font-mono">{startTime} — {endTime}</strong> được AI dự báo là khung giờ vàng: tải máy chủ ổn định, xác suất hoàn thành đúng hạn <strong>98%</strong> và không gặp tranh chấp lịch với các nhóm nghiên cứu khác.
            </p>
          </div>
        </div>
      </form>
    </BaseModal2026>
  );
};
