import React, { useState, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  Flame,
  Clock,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Server,
  Zap,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { EmptyStateCard } from "./EmptyStateCard.tsx";

interface EscalationIncident {
  id: string;
  code: string;
  level: "P1" | "P2" | "P3";
  title: string;
  nodeCode: string;
  nodeName: string;
  reportedAt: string;
  slaRemainingSeconds: number;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  leadResponder: string;
  impactDescription: string;
}

const INITIAL_ESCALATIONS: EscalationIncident[] = [
  {
    id: "ESC-2026-001",
    code: "P1-CRITICAL",
    level: "P1",
    title: "Server Rack RACK-ZONE-01 Quá Nhiệt 82.5°C",
    nodeCode: "GPU-NODE-01",
    nodeName: "NVIDIA DGX A100 SuperPOD",
    reportedAt: "09/09/2026 13:10:00",
    slaRemainingSeconds: 522, // ~ 8m 42s
    status: "ACTIVE",
    leadResponder: "Kỹ Sư Trực Vận Hành: Đỗ Mạnh Hùng",
    impactDescription: "Cảm biến nhiệt độ buồng máy vượt ngưỡng 80°C. Nguy cơ tự động ngắt nguồn khẩn cấp."
  },
  {
    id: "ESC-2026-002",
    code: "P2-WARNING",
    level: "P2",
    title: "Cảnh Báo Hiện Tượng Tràn VRAM & Phân Mảnh Bộ Nhớ",
    nodeCode: "GPU-H100-02",
    nodeName: "NVIDIA DGX H100 SXM5",
    reportedAt: "09/09/2026 12:45:00",
    slaRemainingSeconds: 4120, // ~ 1h 8m
    status: "ACKNOWLEDGED",
    leadResponder: "Cán Bộ Kỹ Thuật: Nguyễn Thùy Linh",
    impactDescription: "VRAM đạt 78.8GB/80GB kéo dài trên 45 phút, tiến trình CUDA có dấu hiệu treo."
  },
  {
    id: "ESC-2026-003",
    code: "P3-NORMAL",
    level: "P3",
    title: "Nhắc Lịch Hiệu Chuẩn Cụm Cảm Biến RTK Drone UAV",
    nodeCode: "UAV-MATRICE-300",
    nodeName: "DJI Matrice 300 RTK Dock",
    reportedAt: "09/09/2026 09:30:00",
    slaRemainingSeconds: 43200, // 12h
    status: "ACTIVE",
    leadResponder: "Phòng Thí Nghiệm Drone & Robotics",
    impactDescription: "Đã đạt chu kỳ 40 giờ bay tích lũy. Cần kiểm tra sai lệch động cơ trước nhiệm vụ mới."
  }
];

export const EscalationsView: React.FC = () => {
  const [incidents, setIncidents] = useState<EscalationIncident[]>(INITIAL_ESCALATIONS);
  const [actionNotice, setActionNotice] = useState<string>("");

  // SLA countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setIncidents((prev) =>
        prev.map((inc) => ({
          ...inc,
          slaRemainingSeconds: Math.max(0, inc.slaRemainingSeconds - 1)
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function formatSlaTimer(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleAcknowledge(id: string) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "ACKNOWLEDGED" } : i))
    );
    setActionNotice(`⚡ Đã tiếp nhận xử lý sự cố ${id}. On-call engineer đã được thông báo!`);
    setTimeout(() => setActionNotice(""), 3500);
  }

  function handleResolve(id: string) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "RESOLVED" } : i))
    );
    setActionNotice(`✅ Sự cố ${id} đã được đánh dấu khắc phục thành công!`);
    setTimeout(() => setActionNotice(""), 3500);
  }

  function handleGenerateDemo() {
    setIncidents(INITIAL_ESCALATIONS);
    setActionNotice("Đã phục hồi dữ liệu cảnh báo escalation mẫu!");
    setTimeout(() => setActionNotice(""), 3000);
  }

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
              INCIDENT ESCALATION DISPATCHER 2026
            </span>
            <span className="led-pulse led-pulse-danger" />
            <span className="font-mono text-[11px] text-slate-400">P1 SLA TARGET: &lt; 15 MINS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Trung Tâm Cảnh Báo Khẩn Cấp & Ma Trận Escalation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Giám sát vi phạm SLA, kích hoạt kênh liên lạc trực ban và quy trình phản ứng sự cố phần cứng
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateDemo}
          className="font-mono text-xs text-rose-300 hover:text-white px-3.5 py-2 rounded-lg border border-rose-500/40 bg-rose-950/40 flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Sparkles size={13} />
          <span>Sinh Sự Cố Mẫu</span>
        </button>
      </div>

      {/* Action Toast */}
      {actionNotice && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. Top Summary Row */}
      <div className="hardware-grid-4cols">
        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-rose-500/30 rounded-xl">
          <span className="font-mono text-[11px] text-rose-400 uppercase block mb-1">P1 - KHẨN CẤP (CRITICAL)</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-rose-400">
              {incidents.filter((i) => i.level === "P1" && i.status !== "RESOLVED").length}
            </strong>
            <span className="led-pulse led-pulse-danger" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">SLA Response: &lt; 15 phút</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-amber-500/30 rounded-xl">
          <span className="font-mono text-[11px] text-amber-300 uppercase block mb-1">P2 - CẢNH BÁO (WARNING)</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-amber-300">
              {incidents.filter((i) => i.level === "P2" && i.status !== "RESOLVED").length}
            </strong>
            <span className="led-pulse led-pulse-warn" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">SLA Response: &lt; 2 giờ</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
          <span className="font-mono text-[11px] text-slate-400 uppercase block mb-1">P3 - TIÊU CHUẨN (NORMAL)</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-cyan-300">
              {incidents.filter((i) => i.level === "P3" && i.status !== "RESOLVED").length}
            </strong>
            <span className="font-mono text-xs text-slate-400">Lịch định kỳ</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">SLA Response: &lt; 24 giờ</span>
        </div>

        <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-emerald-500/20 rounded-xl">
          <span className="font-mono text-[11px] text-emerald-400 uppercase block mb-1">TỶ LỆ TUÂN THỦ SLA</span>
          <div className="flex items-baseline justify-between">
            <strong className="font-mono text-2xl font-bold text-emerald-300">99.8%</strong>
            <span className="font-mono text-xs text-emerald-400">Vượt cam kết</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Zero Outage Goal 2026</span>
        </div>
      </div>

      {/* 3. Escalations Incident List */}
      {activeIncidents.length === 0 ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="Không có sự cố nào cần leo thang (Escalation Queue Clear)"
          description="Toàn bộ hệ thống máy chủ GPU, mạng InfiniBand và cụm thiết bị bay UAV đang vận hành an toàn trong giới hạn nhiệt độ và tải chuẩn."
          actionLabel="⚡ Tạo Vé Mô Phỏng Thử Nghiệm"
          onAction={handleGenerateDemo}
          variant="safe"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {incidents.map((incident) => {
            const isResolved = incident.status === "RESOLVED";
            const levelConfig = {
              P1: {
                border: "border-rose-500/50 shadow-[0_0_25px_rgba(239,68,68,0.15)]",
                badge: "bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse",
                timerColor: "text-rose-400 bg-rose-950/60 border-rose-500/30",
                btnBg: "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              },
              P2: {
                border: "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
                badge: "bg-amber-950/80 text-amber-300 border-amber-500/50",
                timerColor: "text-amber-300 bg-amber-950/60 border-amber-500/30",
                btnBg: "bg-amber-500 hover:bg-amber-400 text-obsidian font-bold"
              },
              P3: {
                border: "border-white/15",
                badge: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
                timerColor: "text-cyan-300 bg-cyan-950/60 border-cyan-500/30",
                btnBg: "bg-cyan-500 hover:bg-cyan-400 text-obsidian font-bold"
              }
            }[incident.level];

            return (
              <div
                key={incident.id}
                className={`card p-5 bg-surface-card backdrop-blur-2xl border rounded-xl flex flex-col gap-4 transition-all ${
                  isResolved ? "opacity-60 border-emerald-500/30" : levelConfig.border
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded border ${levelConfig.badge}`}>
                      {incident.code}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide">{incident.title}</h3>
                    <span className="font-mono text-xs text-slate-400">({incident.nodeCode})</span>
                  </div>

                  {/* SLA Countdown Timer */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">SLA Countdown:</span>
                    <strong
                      className={`font-mono text-base px-3 py-1 rounded border tracking-wider font-bold ${levelConfig.timerColor}`}
                    >
                      {formatSlaTimer(incident.slaRemainingSeconds)}
                    </strong>
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-lg md:col-span-2">
                    <span className="font-mono text-[11px] text-slate-400 uppercase block mb-1">MÔ TẢ TÁC ĐỘNG HỆ THỐNG:</span>
                    <p className="text-slate-300 leading-relaxed m-0 font-sans">{incident.impactDescription}</p>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[10.5px] text-slate-400 uppercase block mb-1">KỸ SƯ ĐIỀU PHỐI (LEAD):</span>
                      <strong className="text-white text-xs block">{incident.leadResponder}</strong>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-2">Báo cáo lúc: {incident.reportedAt}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        incident.status === "ACTIVE"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : incident.status === "ACKNOWLEDGED"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      TRẠNG THÁI: {incident.status}
                    </span>
                  </div>

                  {!isResolved && (
                    <div className="flex items-center gap-2">
                      {incident.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(incident.id)}
                          className="font-mono text-xs text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 px-3.5 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <PhoneCall size={13} />
                          <span>Tiếp Nhận & Kích Hoạt On-Call</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResolve(incident.id)}
                        className="font-mono text-xs font-bold text-obsidian bg-emerald-400 hover:bg-emerald-300 px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <CheckCircle2 size={13} />
                        <span>Đánh Dấu Giải Quyết</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
