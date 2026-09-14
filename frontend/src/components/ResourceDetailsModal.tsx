import React from "react";
import { Server, Cpu, Activity, ShieldCheck, Thermometer, Zap, Layers, HardDrive } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";

export interface ResourceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: any;
}

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  if (!isOpen) return null;

  const nodeCode = resource?.code || "GPU-NODE-01";
  const nodeName = resource?.name || "NVIDIA DGX A100 SuperPOD (8x 80GB)";
  const location = resource?.location || "Rack R-01 • Phòng Máy Chủ AI Cao Cấp";
  const status = resource?.status || "available";

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title={nodeName}
      subtitle={`${nodeCode} • ${location}`}
      icon={Server}
      iconColor="text-cyan-400"
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="font-mono text-xs text-slate-400">
            Trạng thái hiện tại: <strong className="text-emerald-400 uppercase">{status}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-slate-300 hover:text-white px-5 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
          >
            Đóng
          </button>
        </div>
      }
    >
      {/* 1. Bento Grid Hardware Architecture Specs */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
          ĐẶC TẢ PHẦN CỨNG BENTO GRID (HARDWARE ARCHITECTURE)
        </span>

        <div className="bento-specs-grid">
          {/* Bento Cell 1: CPU */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="font-mono text-[10.5px] uppercase">CPU HOST</span>
              <Cpu size={15} className="text-cyan-400" />
            </div>
            <strong className="font-mono text-sm text-white">AMD EPYC 7742</strong>
            <span className="font-mono text-[11px] text-slate-400 mt-1">128-Core / 256-Thread</span>
          </div>

          {/* Bento Cell 2: GPU ACCELERATOR */}
          <div className="p-3.5 bg-black/40 border border-cyan-500/30 rounded-xl flex flex-col justify-between shadow-[0_0_15px_rgba(0,229,255,0.08)]">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="font-mono text-[10.5px] uppercase font-bold">GPU ACCEL</span>
              <Zap size={15} className="text-cyan-400" />
            </div>
            <strong className="font-mono text-sm text-cyan-300">8x NVIDIA A100</strong>
            <span className="font-mono text-[11px] text-slate-400 mt-1">SXM4 80GB HBM2e</span>
          </div>

          {/* Bento Cell 3: SYSTEM RAM */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="font-mono text-[10.5px] uppercase">BỘ NHỚ RAM</span>
              <Layers size={15} className="text-violet-400" />
            </div>
            <strong className="font-mono text-sm text-white">1,024 GB (1TB)</strong>
            <span className="font-mono text-[11px] text-slate-400 mt-1">DDR4-3200 ECC Reg</span>
          </div>

          {/* Bento Cell 4: TOTAL VRAM */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="font-mono text-[10.5px] uppercase">TỔNG VRAM</span>
              <HardDrive size={15} className="text-emerald-400" />
            </div>
            <strong className="font-mono text-sm text-emerald-300">640 GB VRAM</strong>
            <span className="font-mono text-[11px] text-slate-400 mt-1">NVLink 600 GB/s</span>
          </div>
        </div>
      </div>

      {/* 2. Live Telemetry Gauges */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={13} className="text-emerald-400" />
            <span>CHỈ SỐ TELEMETRY THỜI GIAN THỰC (LIVE METRICS)</span>
          </span>
          <span className="font-mono text-[10.5px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>POLLING 2.5S</span>
          </span>
        </div>

        <div className="telemetry-gauges-grid">
          {/* Temperature */}
          <div className="p-3 bg-black/30 border border-white/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Thermometer size={13} className="text-cyan-400" />
                <span>Nhiệt độ cụm GPU:</span>
              </span>
              <strong className="text-cyan-300">58.4°C</strong>
            </div>
            <div className="progress-track" style={{ height: "6px" }}>
              <div className="progress-fill progress-emerald" style={{ width: "58%" }} />
            </div>
          </div>

          {/* Power Draw */}
          <div className="p-3 bg-black/30 border border-white/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap size={13} className="text-amber-400" />
                <span>Công suất tiêu thụ:</span>
              </span>
              <strong className="text-amber-300">420W / 550W</strong>
            </div>
            <div className="progress-track" style={{ height: "6px" }}>
              <div className="progress-fill progress-amber" style={{ width: "76%" }} />
            </div>
          </div>

          {/* VRAM Allocation */}
          <div className="p-3 bg-black/30 border border-white/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <HardDrive size={13} className="text-violet-400" />
                <span>Chiếm dụng VRAM:</span>
              </span>
              <strong className="text-violet-300">64GB / 80GB (80%)</strong>
            </div>
            <div className="progress-track" style={{ height: "6px" }}>
              <div className="progress-fill progress-rose" style={{ width: "80%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Policy & Access Rules */}
      <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-cyan-400 shrink-0" />
          <span>Chính sách: Khóa độc quyền GiST Exclusion • Phê duyệt tự động cho sinh viên đủ chứng chỉ</span>
        </div>
        <span className="text-cyan-300">SLA 99.8%</span>
      </div>
    </BaseModal2026>
  );
};
