import React, { useState } from "react";
import { Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";

export interface ResourceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceCode?: string;
  resourceName?: string;
  targetStatus?: string;
  onConfirm?: (reason: string) => void;
  busy?: boolean;
}

export const ResourceStatusModal: React.FC<ResourceStatusModalProps> = ({
  isOpen,
  onClose,
  resourceCode = "GPU-NODE-01",
  resourceName = "NVIDIA DGX A100 SuperPOD (8x 80GB)",
  targetStatus = "BẢO TRÌ (MAINTENANCE)",
  onConfirm,
  busy = false
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const quickTags = [
    "Kiểm tra nhiệt độ GPU cao (> 82°C)",
    "Lỗi bộ nhớ CUDA ECC Uncorrectable",
    "Bảo dưỡng quạt tản nhiệt buồng máy",
    "Nâng cấp Driver NVIDIA CUDA 12.8",
    "Hiệu chuẩn cụm cảm biến RTK Drone",
    "Bảo trì định kỳ theo lịch khuyến nghị"
  ];

  function handleSelectTag(tag: string) {
    setReason((prev) => {
      if (!prev.trim()) return tag;
      if (prev.includes(tag)) return prev;
      return `${prev}. ${tag}`;
    });
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do chuyển trạng thái thiết bị.");
      return;
    }
    if (onConfirm) {
      onConfirm(reason.trim());
    }
    onClose();
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Cập Nhật Trạng Thái Vận Hành Phần Cứng"
      subtitle="Chuyển đổi trạng thái hoạt động của thiết bị sang chế độ bảo trì hoặc kiểm định"
      icon={Wrench}
      iconColor="text-amber-400"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="font-mono text-xs font-bold text-obsidian bg-amber-400 hover:bg-amber-300 disabled:opacity-50 px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_18px_rgba(245,158,11,0.4)] transform active:scale-95"
          >
            <AlertTriangle size={14} className="fill-obsidian" />
            <span>{busy ? "ĐANG CẬP NHẬT..." : "XÁC NHẬN CHUYỂN BẢO TRÌ"}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Resource Banner */}
        <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-mono text-[10.5px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
              {resourceCode}
            </span>
            <h4 className="text-sm font-bold text-white tracking-wide mt-1">{resourceName}</h4>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
            {targetStatus}
          </span>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-lg text-rose-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
            <AlertTriangle size={14} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Suggestion Tags */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-slate-300">
            Gợi ý lý do nhanh (Nhấp để chèn):
          </label>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => handleSelectTag(tag)}
                className="quick-chip"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Reason Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-slate-300">
            Lý do chi tiết & Kế hoạch khắc phục kỹ thuật *:
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="VD: Cảm biến phát hiện nhiệt độ GPU tăng đột biến trên 82°C, cần tạm ngưng job để kiểm tra lưu lượng làm mát buồng máy..."
            className="bg-black/60 border border-white/15 text-xs text-white rounded-xl p-3 font-sans focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 outline-none transition-all"
          />
        </div>

        {/* Warning Note */}
        <div className="p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-lg text-[11px] font-mono text-amber-300/80 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>Toàn bộ yêu cầu đặt lịch mới cho thiết bị này sẽ tạm thời bị khóa cho đến khi bảo trì hoàn tất.</span>
        </div>
      </form>
    </BaseModal2026>
  );
};
