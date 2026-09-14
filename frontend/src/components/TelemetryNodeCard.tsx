import React, { useState } from "react";
import {
  Server,
  Radio,
  Cpu,
  Thermometer,
  Zap,
  HeartPulse,
  Wrench,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  Clock
} from "lucide-react";
import { TelemetryNode } from "../hooks/useLiveTelemetry.ts";

export interface TelemetryNodeCardProps {
  node: TelemetryNode;
  isUpdating?: boolean;
  onToggleMaintenance: (nodeId: string) => void;
  onOpenDetails?: (node: TelemetryNode) => void;
}

export const TelemetryNodeCard: React.FC<TelemetryNodeCardProps> = ({
  node,
  isUpdating = false,
  onToggleMaintenance,
  onOpenDetails
}) => {
  const percent = Math.min(100, Math.round((node.metricCurrent / node.metricMax) * 100));

  // Determine Gradient based on thresholds (<80%, 80-90%, >90%)
  const getGradientFill = (valPercent: number) => {
    if (valPercent > 90) return "linear-gradient(90deg, #EF4444, #DC2626)";
    if (valPercent >= 80) return "linear-gradient(90deg, #F59E0B, #D97706)";
    return "linear-gradient(90deg, #00E5FF, #3B82F6)";
  };

  const getTempColor = (temp: number) => {
    if (temp > 70) return "text-rose-400";
    if (temp >= 50) return "text-amber-400";
    return "text-cyan-400";
  };

  const getNodeIcon = () => {
    switch (node.type) {
      case "gpu":
        return <Server size={18} className="text-cyan-400" />;
      case "uav":
        return <Radio size={18} className="text-teal-400" />;
      case "rpi":
        return <Cpu size={18} className="text-violet-400" />;
      default:
        return <Server size={18} className="text-cyan-400" />;
    }
  };

  const getLedPulseClass = () => {
    if (node.isUnderMaintenance) return "led-pulse-warn";
    if (node.temperature > 70) return "led-pulse-alert";
    if (isUpdating) return "led-pulse-cyan";
    return "led-pulse-safe";
  };

  return (
    <div
      className={`bento-telemetry-card-2026 ${
        node.isUnderMaintenance ? "is-maintenance" : ""
      }`}
    >
      {/* 1. Header */}
      <div className="bento-card-header-2026">
        <div className="bento-header-info-2026">
          <div className="bento-node-icon-wrapper-2026">{getNodeIcon()}</div>
          <div className="bento-node-title-col-2026">
            <h3 className="bento-node-name-2026">{node.name}</h3>
            <div className="bento-node-meta-row-2026">
              <span className="bento-code-chip-2026 font-mono">{node.code}</span>
              <span className="bento-zone-tag-2026">{node.zoneCode}</span>
            </div>
          </div>
        </div>

        {/* Status Pill with LED pulse */}
        <div className="bento-status-pill-2026">
          <span className={`led-pulse ${getLedPulseClass()}`} />
          <span className="font-mono text-[11px] font-semibold tracking-wider">
            {node.statusLabel}
          </span>
        </div>
      </div>

      {/* 2. Key Telemetry Metrics Grid (JetBrains Mono tabular-nums) */}
      <div className="bento-metrics-grid-2026">
        {/* Nhiệt độ */}
        <div className="bento-metric-cell-2026">
          <div className="metric-cell-label-2026">
            <Thermometer size={13} className={getTempColor(node.temperature)} />
            <span>Nhiệt độ</span>
          </div>
          <div className={`metric-cell-val-2026 font-mono ${getTempColor(node.temperature)}`}>
            {node.temperature.toFixed(1)}
            <span className="metric-cell-unit-2026">°C</span>
          </div>
          <span className="metric-cell-sub-2026 font-mono">
            {node.temperature > 70 ? "Nguy cơ quá tải" : "Ngưỡng tiêu chuẩn"}
          </span>
        </div>

        {/* Công suất */}
        <div className="bento-metric-cell-2026">
          <div className="metric-cell-label-2026">
            <Zap size={13} className="text-amber-400" />
            <span>Công suất</span>
          </div>
          <div className="metric-cell-val-2026 font-mono text-amber-300">
            {node.powerWatts}
            <span className="metric-cell-unit-2026">W</span>
          </div>
          <span className="metric-cell-sub-2026 font-mono">
            {node.type === "gpu" ? "PUE 1.15 MESH" : "Định mức 24/7"}
          </span>
        </div>

        {/* Chỉ số Sức khỏe (Health Index) */}
        <div className="bento-metric-cell-2026">
          <div className="metric-cell-label-2026">
            <HeartPulse size={13} className="text-emerald-400" />
            <span>Sức khỏe</span>
          </div>
          <div className="metric-cell-val-2026 font-mono text-emerald-400">
            {node.healthIndex}
            <span className="metric-cell-unit-2026">%</span>
          </div>
          <span className="metric-cell-sub-2026 font-mono">
            MTBF: 99.98%
          </span>
        </div>
      </div>

      {/* 3. Dual-Gradient Progress Bar (VRAM / Pin / Tải CPU) */}
      <div className="bento-progress-section-2026">
        <div className="bento-progress-header-2026">
          <span className="font-mono text-xs text-slate-300 font-medium">
            {node.metricLabel}: {node.metricCurrent} / {node.metricMax} {node.metricUnit}
          </span>
          <span
            className={`font-mono text-xs font-bold ${
              percent > 90
                ? "text-rose-400"
                : percent >= 80
                ? "text-amber-400"
                : "text-cyan-400"
            }`}
          >
            {percent}%
          </span>
        </div>

        {/* Progress track */}
        <div className="bento-progress-track-2026">
          <div
            className="bento-progress-fill-2026"
            style={{
              width: `${percent}%`,
              background: getGradientFill(percent)
            }}
          />
        </div>

        <div className="bento-secondary-metric-2026">
          <span className="font-mono text-[11px] text-slate-400">
            {node.secondaryMetric.label}:
          </span>
          <span className="font-mono text-[11px] text-cyan-300">
            {node.secondaryMetric.value}
          </span>
        </div>
      </div>

      {/* 4. Action Footer */}
      <div className="bento-card-footer-2026">
        <button
          type="button"
          className="bento-footer-btn-secondary-2026"
          onClick={() => (onOpenDetails ? onOpenDetails(node) : null)}
          title="Mở bảng thông số chi tiết"
        >
          <Info size={13} className="text-cyan-400" />
          <span>Chi tiết Telemetry</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleMaintenance(node.id)}
          className={`bento-footer-btn-toggle-2026 ${
            node.isUnderMaintenance ? "is-active-btn" : ""
          }`}
          title="Chuyển chế độ vận hành"
        >
          <Wrench size={13} />
          <span>{node.isUnderMaintenance ? "Hủy Bảo Trì" : "Bảo Trì Node"}</span>
        </button>
      </div>
    </div>
  );
};

export interface TelemetryBentoGridProps {
  nodes: TelemetryNode[];
  isUpdating?: boolean;
  onToggleMaintenance: (nodeId: string) => void;
  lastUpdated?: string;
  onRefresh?: () => void;
}

export const TelemetryBentoGrid: React.FC<TelemetryBentoGridProps> = ({
  nodes,
  isUpdating = false,
  onToggleMaintenance,
  lastUpdated,
  onRefresh
}) => {
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<TelemetryNode | null>(null);

  return (
    <div className="bento-grid-wrapper-2026">
      {/* Section Header */}
      <div className="bento-section-header-2026">
        <div className="bento-section-title-group-2026">
          <div className="bento-title-row-2026">
            <h2 className="bento-section-title-2026">BENTO GRID GIÁM SÁT THỜI GIAN THỰC</h2>
            <div className="telemetry-live-badge-2026">
              <span className={`led-pulse ${isUpdating ? "led-pulse-cyan" : "led-pulse-safe"}`} />
              <span className="font-mono text-xs text-emerald-400">
                {isUpdating ? "SYNCING TELEMETRY..." : "REAL-TIME STREAM"}
              </span>
            </div>
          </div>
          <p className="bento-section-subtitle-2026">
            Dữ liệu cảm biến trực tiếp từ 3 cụm thiết bị chủ lực tại Phòng Lab AI 2026 (Nhiệt độ, Công suất, VRAM, Pin)
          </p>
        </div>

        {lastUpdated && (
          <div className="bento-header-actions-2026">
            <span className="font-mono text-xs text-slate-400">
              Cập nhật: <strong className="text-cyan-400">{lastUpdated}</strong>
            </span>
          </div>
        )}
      </div>

      {/* 3-Column Bento Grid Layout */}
      <div className="bento-3col-grid-2026">
        {nodes.map((node) => (
          <TelemetryNodeCard
            key={node.id}
            node={node}
            isUpdating={isUpdating}
            onToggleMaintenance={onToggleMaintenance}
            onOpenDetails={(n) => setSelectedNodeDetails(n)}
          />
        ))}
      </div>

      {/* Hardware Telemetry Details Modal (Level 3 Depth) */}
      {selectedNodeDetails && (
        <div
          className="modal-backdrop-2026"
          onClick={() => setSelectedNodeDetails(null)}
        >
          <div
            className="modal-container-2026 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-header-2026">
              <div className="flex items-center gap-2">
                <div className="modal-icon-badge-2026">
                  <Server size={17} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedNodeDetails.name}
                  </h3>
                  <span className="font-mono text-xs text-cyan-400">
                    {selectedNodeDetails.code} • {selectedNodeDetails.zone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedNodeDetails(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3 bg-black/40 border border-white/10 rounded">
                  <span className="text-slate-400 text-[10px]">Nhiệt Độ Core:</span>
                  <div className="text-lg font-bold text-cyan-300">
                    {selectedNodeDetails.temperature}°C
                  </div>
                </div>
                <div className="card p-3 bg-black/40 border border-white/10 rounded">
                  <span className="text-slate-400 text-[10px]">Công Suất Tiêu Thụ:</span>
                  <div className="text-lg font-bold text-amber-300">
                    {selectedNodeDetails.powerWatts}W
                  </div>
                </div>
                <div className="card p-3 bg-black/40 border border-white/10 rounded">
                  <span className="text-slate-400 text-[10px]">Chỉ Số Sức Khỏe:</span>
                  <div className="text-lg font-bold text-emerald-300">
                    {selectedNodeDetails.healthIndex}% (Tối ưu)
                  </div>
                </div>
                <div className="card p-3 bg-black/40 border border-white/10 rounded">
                  <span className="text-slate-400 text-[10px]">
                    {selectedNodeDetails.metricLabel}:
                  </span>
                  <div className="text-lg font-bold text-violet-300">
                    {selectedNodeDetails.metricCurrent} / {selectedNodeDetails.metricMax} {selectedNodeDetails.metricUnit}
                  </div>
                </div>
              </div>

              <div className="card p-3 bg-black/40 border border-white/10 rounded mt-1">
                <div className="text-slate-400 text-[11px] mb-2 font-semibold">
                  LỊCH SỬ TELEMETRY GẦN NHẤT (8 chu kỳ):
                </div>
                <div className="flex items-center gap-2">
                  {selectedNodeDetails.history.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 bg-white/5 p-1 rounded"
                    >
                      <span className="text-[9px] text-slate-400">{val}°</span>
                      <div
                        className="w-full bg-cyan-400/40 rounded-t"
                        style={{ height: `${Math.max(8, (val / 80) * 35)}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedNodeDetails(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onToggleMaintenance(selectedNodeDetails.id);
                    setSelectedNodeDetails(null);
                  }}
                >
                  {selectedNodeDetails.isUnderMaintenance
                    ? "Kích hoạt lại Node"
                    : "Đưa vào Bảo Trì"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
