import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Filter,
  Zap,
  UserCheck,
  TrendingUp,
  Award,
  Sparkles,
  Check,
  ChevronRight,
  Server
} from "lucide-react";
import { EmptyStateCard } from "./EmptyStateCard.tsx";

interface Candidate {
  name: string;
  role: string;
  roleScore: number;
  project: string;
  urgency: string;
  urgencyScore: number;
  remainingQuota: number;
  reputationMultiplier: number;
  totalScore: number;
}

interface ConflictItem {
  id: string;
  resourceCode: string;
  resourceName: string;
  slotTime: string;
  reason: string;
  candidateA: Candidate;
  candidateB: Candidate;
  recommendedWinner: "A" | "B";
  resolved?: boolean;
  resolutionNote?: string;
}

const INITIAL_CONFLICTS: ConflictItem[] = [
  {
    id: "CONF-2026-089",
    resourceCode: "GPU-NODE-01",
    resourceName: "NVIDIA DGX A100 SuperPOD (8x 80GB)",
    slotTime: "14:00 — 18:00 • Hôm Nay (09/09/2026)",
    reason: "Trùng khung giờ tính toán mô hình học sâu khẩn cấp",
    candidateA: {
      name: "NCS. Trần Tiến Dũng",
      role: "Nghiên Cứu Sinh Tiến Sĩ",
      roleScore: 30,
      project: "Fine-tuning Llama-3 (Paper CVPR/NeurIPS)",
      urgency: "Deadline nộp bài báo Q1",
      urgencyScore: 35,
      remainingQuota: 45,
      reputationMultiplier: 1.15,
      totalScore: 91.5
    },
    candidateB: {
      name: "ThS. Lê Hoàng Yến",
      role: "Học Viên Cao Học",
      roleScore: 20,
      project: "Đồ án Thạc sĩ Robotics SLAM",
      urgency: "Bảo vệ đồ án tốt nghiệp",
      urgencyScore: 25,
      remainingQuota: 12,
      reputationMultiplier: 1.0,
      totalScore: 62.0
    },
    recommendedWinner: "A"
  },
  {
    id: "CONF-2026-090",
    resourceCode: "GPU-H100-02",
    resourceName: "NVIDIA DGX H100 SXM5 (Cụm 02)",
    slotTime: "18:00 — 22:00 • Hôm Nay (09/09/2026)",
    reason: "Tranh chấp GPU ca cao điểm EVN giữa 2 nhóm đề tài",
    candidateA: {
      name: "PGS.TS Vũ Đình Huy",
      role: "Chủ Nhiệm Đề Tài",
      roleScore: 40,
      project: "Mô phỏng khí động học 3D Drone",
      urgency: "Nghiệm thu cấp Nhà Nước",
      urgencyScore: 35,
      remainingQuota: 80,
      reputationMultiplier: 1.2,
      totalScore: 96.0
    },
    candidateB: {
      name: "SV. Nguyễn Mai Phương",
      role: "Sinh Viên Làm ĐATN",
      roleScore: 15,
      project: "Huấn luyện Vision Transformer YOLO",
      urgency: "Bài tập lớn môn học",
      urgencyScore: 15,
      remainingQuota: 18,
      reputationMultiplier: 0.95,
      totalScore: 48.5
    },
    recommendedWinner: "A"
  }
];

export const ConflictResolutionQueue: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>(INITIAL_CONFLICTS);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [actionSuccess, setActionSuccess] = useState<string>("");

  const totalRequests = 18;
  const resolvedCount = 14 + conflicts.filter((c) => c.resolved).length;
  const pendingCount = conflicts.filter((c) => !c.resolved).length;
  const conflictRate = "1.4%";

  function handleAutoResolve(conflictId: string) {
    setConflicts((prev) =>
      prev.map((item) => {
        if (item.id === conflictId) {
          const winner = item.recommendedWinner === "A" ? item.candidateA : item.candidateB;
          const runnerUp = item.recommendedWinner === "A" ? item.candidateB : item.candidateA;
          return {
            ...item,
            resolved: true,
            resolutionNote: `Đã cấp slot cho [${winner.name}] (Điểm: ${winner.totalScore}). Tự động xếp lịch bù cho [${runnerUp.name}].`
          };
        }
        return item;
      })
    );
    setActionSuccess(`⚡ Đã phân xử thành công vé ${conflictId} dựa trên thuật toán đa mục tiêu.`);
    setTimeout(() => setActionSuccess(""), 4000);
  }

  function handleCompensateGreenHours(conflictId: string) {
    setConflicts((prev) =>
      prev.map((item) => {
        if (item.id === conflictId) {
          return {
            ...item,
            resolved: true,
            resolutionNote: `Đã đền bù +4h Quota Giờ Xanh (22:00 — 06:00) cho bên nhường chỗ. SLA được đảm bảo 100%.`
          };
        }
        return item;
      })
    );
    setActionSuccess(`🛡️ Đã cấp gói đền bù +4h Quota Giờ Xanh cho ứng viên của vé ${conflictId}.`);
    setTimeout(() => setActionSuccess(""), 4000);
  }

  function handleGenerateDemo() {
    setConflicts(INITIAL_CONFLICTS);
    setActionSuccess("Đã sinh 2 vé tranh chấp mô phỏng với dữ liệu đa mục tiêu!");
    setTimeout(() => setActionSuccess(""), 3000);
  }

  const displayedConflicts = conflicts.filter((c) => {
    if (filter === "PENDING") return !c.resolved;
    if (filter === "RESOLVED") return c.resolved;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              REAL-TIME DISPUTE ARBITRATION
            </span>
            <span className="led-pulse led-pulse-warn" />
            <span className="font-mono text-[11px] text-slate-400">FAIRNESS ENGINE: JAIN'S INDEX 0.94</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Hàng Đợi Phân Xử Xung Đột Lịch Real-Time
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tự động phát hiện và giải quyết chồng chéo tài nguyên bằng giải thuật tính điểm ưu tiên đa biến 2026
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateDemo}
            className="font-mono text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-950/40 hover:bg-cyan-950/60 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Sparkles size={13} />
            <span>Sinh Dữ Liệu Mẫu</span>
          </button>
        </div>
      </div>

      {/* Action Toast Alert */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 2. Top 4 KPI Metric Row (Monospace) */}
      <div className="hardware-grid-4cols">
        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
          <span className="font-mono text-[11px] text-slate-400 uppercase block mb-1">TỔNG SỐ YÊU CẦU</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-white">{totalRequests}</strong>
            <span className="font-mono text-xs text-cyan-400">Hôm nay</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Tất cả phòng lab</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-emerald-500/20 rounded-xl">
          <span className="font-mono text-[11px] text-emerald-400 uppercase block mb-1">ĐÃ PHÂN XỬ THÀNH CÔNG</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-emerald-300">{resolvedCount}</strong>
            <span className="font-mono text-xs text-emerald-400">92.8%</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Không cần can thiệp thủ công</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-amber-500/30 rounded-xl">
          <span className="font-mono text-[11px] text-amber-300 uppercase block mb-1">ĐANG CHỜ XỬ LÝ</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-amber-300">{pendingCount}</strong>
            <span className="led-pulse led-pulse-warn" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Cần trọng tài phân bổ</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
          <span className="font-mono text-[11px] text-slate-400 uppercase block mb-1">TỶ LỆ XUNG ĐỘT LAB</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-cyan-300">{conflictRate}</strong>
            <span className="font-mono text-xs text-emerald-400">Rất thấp</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Ngưỡng an toàn &lt; 5.0%</span>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "ALL"
                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Tất Cả ({conflicts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "PENDING"
                ? "bg-amber-500/15 border-amber-400 text-amber-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Cần Xử Lý ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESOLVED")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "RESOLVED"
                ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Đã Phân Xử ({conflicts.filter((c) => c.resolved).length})
          </button>
        </div>

        <span className="font-mono text-xs text-slate-500">
          Hiển thị <strong>{displayedConflicts.length}</strong> vé xung đột
        </span>
      </div>

      {/* 4. Conflict Cards List or Empty State */}
      {displayedConflicts.length === 0 ? (
        <EmptyStateCard
          icon={ShieldCheck}
          title="Hàng đợi sạch — Mọi tài nguyên đang vận hành ổn định không xung đột"
          description="Hiện tại không có xung đột lịch nào tồn đọng. Thuật toán NSGA-II đã tối ưu và phân bổ toàn bộ khung giờ an toàn."
          actionLabel="⚡ Tạo Vé Mô Phỏng Thử Nghiệm"
          onAction={handleGenerateDemo}
          variant="safe"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {displayedConflicts.map((item) => {
            const isResolved = item.resolved;

            return (
              <div
                key={item.id}
                className={`card p-5 bg-surface-card backdrop-blur-2xl border rounded-xl flex flex-col gap-4 transition-all ${
                  isResolved
                    ? "border-emerald-500/30 opacity-90"
                    : "border-amber-500/40 shadow-[0_8px_30px_rgba(245,158,11,0.08)]"
                }`}
              >
                {/* Conflict Card Top Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-mono text-xs px-2.5 py-0.5 rounded font-bold border ${
                        isResolved
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-950/70 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {item.id}
                    </span>
                    <span className="font-mono text-xs text-white font-bold flex items-center gap-1.5">
                      <Server size={14} className="text-cyan-400" />
                      <span>{item.resourceCode}</span>
                    </span>
                    <span className="text-xs text-slate-400">({item.resourceName})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-300 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded border border-white/5">
                      <Clock size={13} className="text-amber-400" />
                      <span>{item.slotTime}</span>
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        isResolved
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {isResolved ? "ĐÃ PHÂN XỬ" : "TRANH CHẤP CHỜ DUYỆT"}
                    </span>
                  </div>
                </div>

                {/* Conflict Description */}
                <div className="text-xs text-slate-300 font-sans flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span><strong>Nguyên nhân:</strong> {item.reason}</span>
                </div>

                {/* Multi-variable Comparison Grid: Candidate A vs Candidate B */}
                <div className="conflict-candidates-grid">
                  {/* Candidate A Card */}
                  <div
                    className={
                      item.recommendedWinner === "A" && !isResolved
                        ? "candidate-box-recommended"
                        : "candidate-box"
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] text-cyan-400 font-bold uppercase">
                          ỨNG VIÊN A {item.recommendedWinner === "A" && "• KHUYẾN NGHỊ ƯU TIÊN"}
                        </span>
                        <strong className="font-mono text-sm text-cyan-300">
                          {item.candidateA.totalScore} Điểm
                        </strong>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{item.candidateA.name}</h4>
                      <p className="text-xs text-slate-400 mb-2">{item.candidateA.role}</p>
                      <div className="p-2 bg-black/40 border border-white/5 rounded text-[11.5px] text-slate-300 mb-3">
                        <strong className="text-cyan-200">Đề tài:</strong> {item.candidateA.project}
                      </div>
                    </div>

                    {/* Breakdown Matrix Table */}
                    <div className="border-t border-white/10 pt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400">Điểm vai trò:</span>{" "}
                        <strong className="text-white">{item.candidateA.roleScore}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Điểm khẩn cấp:</span>{" "}
                        <strong className="text-amber-300">{item.candidateA.urgencyScore}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Hạn ngạch còn:</span>{" "}
                        <strong className="text-emerald-400">{item.candidateA.remainingQuota}h</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Hệ số uy tín:</span>{" "}
                        <strong className="text-cyan-300">{item.candidateA.reputationMultiplier}x</strong>
                      </div>
                    </div>
                  </div>

                  {/* Candidate B Card */}
                  <div
                    className={
                      item.recommendedWinner === "B" && !isResolved
                        ? "candidate-box-recommended"
                        : "candidate-box"
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] text-slate-400 font-bold uppercase">
                          ỨNG VIÊN B
                        </span>
                        <strong className="font-mono text-sm text-slate-300">
                          {item.candidateB.totalScore} Điểm
                        </strong>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{item.candidateB.name}</h4>
                      <p className="text-xs text-slate-400 mb-2">{item.candidateB.role}</p>
                      <div className="p-2 bg-black/40 border border-white/5 rounded text-[11.5px] text-slate-300 mb-3">
                        <strong className="text-slate-200">Đề tài:</strong> {item.candidateB.project}
                      </div>
                    </div>

                    {/* Breakdown Matrix Table */}
                    <div className="border-t border-white/10 pt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400">Điểm vai trò:</span>{" "}
                        <strong className="text-white">{item.candidateB.roleScore}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Điểm khẩn cấp:</span>{" "}
                        <strong className="text-amber-300">{item.candidateB.urgencyScore}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Hạn ngạch còn:</span>{" "}
                        <strong className="text-emerald-400">{item.candidateB.remainingQuota}h</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Hệ số uy tín:</span>{" "}
                        <strong className="text-cyan-300">{item.candidateB.reputationMultiplier}x</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer or Resolution Note */}
                {isResolved ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>{item.resolutionNote}</span>
                    </div>
                    <span className="text-[11px] text-emerald-400/80">SLA 100% OK</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCompensateGreenHours(item.id)}
                      className="font-mono text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/80 px-4 py-2 rounded-lg border border-emerald-500/40 flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    >
                      <ShieldCheck size={14} />
                      <span>🛡️ Đền Bù +4h Quota Giờ Xanh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutoResolve(item.id)}
                      className="font-mono text-xs font-bold text-obsidian bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_16px_rgba(245,158,11,0.4)] transform active:scale-95"
                    >
                      <Zap size={14} className="fill-obsidian" />
                      <span>⚡ Áp Dụng Phân Xử Tự Động</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
