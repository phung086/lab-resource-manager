import React, { useState } from "react";
import {
  Sliders,
  ShieldCheck,
  Zap,
  Save,
  CheckCircle2,
  Clock,
  Calendar,
  Lock,
  RotateCcw,
  Sparkles,
  AlertCircle
} from "lucide-react";

export interface LabPolicy {
  maxBookingMinutes: number;
  minBookingMinutes: number;
  maxAdvanceBookingDays: number;
  openHour: number;
  closeHour: number;
  allowWeekend: boolean;
  checkInGraceMinutes: number;
  requireManualApproval: boolean;
  autoPreemptionEnabled: boolean;
  greenHoursBonusQuota: number;
}

const DEFAULT_POLICY: LabPolicy = {
  maxBookingMinutes: 480, // 8 hours
  minBookingMinutes: 30,  // 30 min
  maxAdvanceBookingDays: 14,
  openHour: 7,
  closeHour: 23,
  allowWeekend: true,
  checkInGraceMinutes: 15,
  requireManualApproval: false,
  autoPreemptionEnabled: true,
  greenHoursBonusQuota: 15
};

export const PolicyRulesConfig: React.FC = () => {
  const [policy, setPolicy] = useState<LabPolicy>(DEFAULT_POLICY);
  const [initialPolicy, setInitialPolicy] = useState<LabPolicy>(DEFAULT_POLICY);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Check if modified
  const isDirty = JSON.stringify(policy) !== JSON.stringify(initialPolicy);

  function handleSave() {
    setIsSaving(true);
    setTimeout(() => {
      setInitialPolicy(policy);
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }, 600);
  }

  function handleReset() {
    setPolicy(DEFAULT_POLICY);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              LAB GOVERNANCE & POLICY ENGINE 2026
            </span>
            <span className="led-pulse led-pulse-safe" />
            <span className="font-mono text-[11px] text-slate-400">ENFORCED VIA POSTGRES GIST EXCLUSION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Cấu Hình Chính Sách & Ràng Buộc Vận Hành Phòng Lab
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Thiết lập các tham số cốt lõi kiểm soát thời gian, khung giờ mở cửa và cơ chế phê duyệt tự động
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RotateCcw size={13} />
            <span>Mặc Định</span>
          </button>

          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className={`font-mono text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
              isDirty
                ? "btn-save-glowing transform scale-105"
                : "bg-white/10 text-slate-500 cursor-not-allowed border border-white/5"
            }`}
          >
            <Save size={14} />
            <span>{isSaving ? "ĐANG LƯU..." : "💾 LƯU THAY ĐỔI CHÍNH SÁCH"}</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>Đã lưu và đồng bộ hóa thành công chính sách mới tới toàn bộ cụm máy chủ và hệ thống khóa GiST!</span>
        </div>
      )}

      {/* 2. Three Policy Sub-sections Layout */}
      <div className="hero-metrics-grid">
        {/* PHÂN KHU 1: Giới Hạn Đặt Lịch (Booking Limits) */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Clock size={16} className="text-cyan-400" />
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
              1. GIỚI HẠN ĐẶT LỊCH (BOOKING LIMITS)
            </span>
          </div>

          {/* Max booking duration */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Thời gian tối đa mỗi slot:</span>
              <strong className="text-cyan-300">{policy.maxBookingMinutes} phút ({policy.maxBookingMinutes / 60} giờ)</strong>
            </div>
            <input
              type="range"
              min={60}
              max={1440}
              step={60}
              value={policy.maxBookingMinutes}
              onChange={(e) => setPolicy({ ...policy, maxBookingMinutes: parseInt(e.target.value, 10) })}
              className="accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[10.5px] text-slate-500 font-mono">Giới hạn tối đa 24 giờ cho job đào tạo lớn</span>
          </div>

          {/* Min booking duration */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Thời gian tối thiểu mỗi slot:</span>
              <strong className="text-white">{policy.minBookingMinutes} phút</strong>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={policy.minBookingMinutes}
              onChange={(e) => setPolicy({ ...policy, minBookingMinutes: parseInt(e.target.value, 10) })}
              className="accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[10.5px] text-slate-500 font-mono">Tránh tình trạng phân mảnh lịch dưới 15 phút</span>
          </div>

          {/* Max advance booking days */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Số ngày được phép đặt trước:</span>
              <strong className="text-amber-300">{policy.maxAdvanceBookingDays} ngày</strong>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={policy.maxAdvanceBookingDays}
              onChange={(e) => setPolicy({ ...policy, maxAdvanceBookingDays: parseInt(e.target.value, 10) })}
              className="accent-amber-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[10.5px] text-slate-500 font-mono">Ngăn chặn chiếm chỗ trước quá sớm</span>
          </div>
        </div>

        {/* PHÂN KHU 2: Khung Giờ Vận Hành (Operating Hours) */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Calendar size={16} className="text-emerald-400" />
            <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider">
              2. KHUNG GIỜ VẬN HÀNH (OPERATING HOURS)
            </span>
          </div>

          {/* Open hour */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Giờ mở cửa hàng ngày:</span>
              <strong className="text-emerald-300">{policy.openHour.toString().padStart(2, "0")}:00 Sáng</strong>
            </div>
            <input
              type="range"
              min={0}
              max={23}
              value={policy.openHour}
              onChange={(e) => setPolicy({ ...policy, openHour: parseInt(e.target.value, 10) })}
              className="accent-emerald-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Close hour */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Giờ đóng cửa phòng lab:</span>
              <strong className="text-emerald-300">{policy.closeHour.toString().padStart(2, "0")}:00 Đêm</strong>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={policy.closeHour}
              onChange={(e) => setPolicy({ ...policy, closeHour: parseInt(e.target.value, 10) })}
              className="accent-emerald-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Weekend Toggle */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all">
            <div>
              <span className="text-xs font-bold text-white block">Vận hành cuối tuần (T7 & CN)</span>
              <span className="text-[11px] text-slate-400 font-mono">Cho phép chạy job tự động thứ 7, chủ nhật</span>
            </div>
            <input
              type="checkbox"
              checked={policy.allowWeekend}
              onChange={(e) => setPolicy({ ...policy, allowWeekend: e.target.checked })}
              className="accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-[11px] font-mono text-emerald-300">
            🌿 Tác vụ ca đêm vẫn duy trì tự động 24/7 theo chính sách Green AI
          </div>
        </div>

        {/* PHÂN KHU 3: Kiểm Soát & Phê Duyệt (Access Control) */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <ShieldCheck size={16} className="text-amber-400" />
            <span className="font-mono text-xs text-amber-300 font-bold uppercase tracking-wider">
              3. KIỂM SOÁT & PHÊ DUYỆT (ACCESS CONTROL)
            </span>
          </div>

          {/* Check-in Grace Minutes */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Thời gian ân hạn check-in QR:</span>
              <strong className="text-amber-300">{policy.checkInGraceMinutes} phút</strong>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={policy.checkInGraceMinutes}
              onChange={(e) => setPolicy({ ...policy, checkInGraceMinutes: parseInt(e.target.value, 10) })}
              className="accent-amber-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[10.5px] text-slate-500 font-mono">
              Quá {policy.checkInGraceMinutes} phút không check-in sẽ tự động giải phóng tài nguyên
            </span>
          </div>

          {/* Manual Approval Toggle */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all">
            <div>
              <span className="text-xs font-bold text-white block">Bắt buộc Admin duyệt thủ công</span>
              <span className="text-[11px] text-slate-400 font-mono">Tất cả yêu cầu phải qua cán bộ lab xác nhận</span>
            </div>
            <input
              type="checkbox"
              checked={policy.requireManualApproval}
              onChange={(e) => setPolicy({ ...policy, requireManualApproval: e.target.checked })}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Auto Preemption Toggle */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all">
            <div>
              <span className="text-xs font-bold text-white block">Bật cơ chế Preemption tự động</span>
              <span className="text-[11px] text-slate-400 font-mono">Ưu tiên đồ án khẩn cấp & bù quota ca đêm</span>
            </div>
            <input
              type="checkbox"
              checked={policy.autoPreemptionEnabled}
              onChange={(e) => setPolicy({ ...policy, autoPreemptionEnabled: e.target.checked })}
              className="accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
