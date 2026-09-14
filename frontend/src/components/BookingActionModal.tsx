import React, { useState } from "react";
import { ClipboardCheck, CheckCircle2, Shield, Wrench, Sparkles, Check } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";

export interface BookingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  resourceCode?: string;
  resourceName?: string;
  onConfirm?: (note: string) => void;
  busy?: boolean;
}

export const BookingActionModal: React.FC<BookingActionModalProps> = ({
  isOpen,
  onClose,
  actionTitle = "Nghiệm Thu & Xác Nhận Bàn Giao Thiết Bị",
  resourceCode = "UAV-MATRICE-300",
  resourceName = "DJI Matrice 300 RTK Quadcopter (Docked)",
  onConfirm,
  busy = false
}) => {
  const [note, setNote] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([
    "Thiết bị nguyên vẹn",
    "Đầy đủ phụ kiện cáp nguồn"
  ]);
  const [confirmedChecklist, setConfirmedChecklist] = useState(true);

  if (!isOpen) return null;

  const quickChips = [
    "Thiết bị nguyên vẹn",
    "Đầy đủ phụ kiện cáp nguồn",
    "Cần vệ sinh lọc bụi",
    "Cụm cánh quạt không nứt gãy",
    "Kiểm tra nhiệt độ bình thường",
    "Pin sạc đầy > 90%"
  ];

  function toggleChip(chip: string) {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter((c) => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullNote = `${selectedChips.join(", ")}${note.trim() ? `. Ghi chú thêm: ${note.trim()}` : ""}`;
    if (onConfirm) {
      onConfirm(fullNote);
    }
    onClose();
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title={actionTitle}
      subtitle="Biên bản nghiệm thu tình trạng phần cứng trước và sau phiên vận hành thí nghiệm"
      icon={ClipboardCheck}
      iconColor="text-cyan-400"
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
            disabled={busy || !confirmedChecklist}
            onClick={handleSubmit}
            className="font-mono text-xs btn-cyan-gradient disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(0,229,255,0.4)]"
          >
            <CheckCircle2 size={14} />
            <span>{busy ? "ĐANG LƯU HỒ SƠ..." : "XÁC NHẬN BÀN GIAO THIẾT BỊ"}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Resource Banner */}
        <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-mono text-[10.5px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
              {resourceCode}
            </span>
            <h4 className="text-sm font-bold text-white tracking-wide mt-1">{resourceName}</h4>
          </div>
          <Shield size={20} className="text-cyan-400 opacity-70" />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-slate-300">
            Tình trạng ghi nhận (Chọn nhanh các mục):
          </label>
          <div className="flex flex-wrap gap-2">
            {quickChips.map((chip) => {
              const active = selectedChips.includes(chip);
              return (
                <button
                  type="button"
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={`quick-chip ${active ? "active" : ""}`}
                >
                  {active ? "✓ " : "+ "}
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-slate-300">
            Ghi chú chi tiết thêm của Cán bộ Lab / Người nhận:
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Thiết bị đã được hiệu chuẩn cảm biến IMU, sẵn sàng cho nhiệm vụ ngoài thực địa..."
            className="bg-black/60 border border-white/15 text-xs text-white rounded-xl p-3 font-sans focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 outline-none transition-all"
          />
        </div>

        {/* Verification Checkbox */}
        <label className="flex items-start gap-2.5 p-3 bg-white/[0.02] border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
          <input
            type="checkbox"
            checked={confirmedChecklist}
            onChange={(e) => setConfirmedChecklist(e.target.checked)}
            className="accent-cyan-400 mt-0.5 cursor-pointer"
          />
          <span className="text-xs text-slate-300 leading-relaxed font-sans">
            Tôi xác nhận đã kiểm tra an toàn vật lý và đồng ý chịu trách nhiệm vận hành theo đúng quy chuẩn phòng thí nghiệm AI 2026.
          </span>
        </label>
      </form>
    </BaseModal2026>
  );
};
