import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Thermometer,
  Zap,
  HeartPulse,
  Clock,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sliders
} from "lucide-react";

export interface TimelineFrame {
  id: number;
  timeFormatted: string; // e.g. "08:30"
  fullTimestamp: string; // e.g. "09/09/2026 08:30:00"
  hour: number;
  minute: number;
  temperatureC: number;
  powerWatts: number;
  vramGb: number;
  loadPercent: number;
  healthIndex: number;
  status: "normal" | "warning" | "critical";
  isAnomaly: boolean;
  anomalyTitle?: string;
  decisionNote?: string;
  actionTaken?: string;
}

// 24-hour simulation frames for 09/09/2026
const GENERATED_FRAMES: TimelineFrame[] = [
  { id: 0, timeFormatted: "00:00", fullTimestamp: "09/09/2026 00:00:00", hour: 0, minute: 0, temperatureC: 38.5, powerWatts: 140, vramGb: 12.0, loadPercent: 15, healthIndex: 99, status: "normal", isAnomaly: false },
  { id: 1, timeFormatted: "02:00", fullTimestamp: "09/09/2026 02:00:00", hour: 2, minute: 0, temperatureC: 39.0, powerWatts: 145, vramGb: 14.5, loadPercent: 18, healthIndex: 99, status: "normal", isAnomaly: false },
  { id: 2, timeFormatted: "04:00", fullTimestamp: "09/09/2026 04:00:00", hour: 4, minute: 0, temperatureC: 41.2, powerWatts: 180, vramGb: 22.0, loadPercent: 28, healthIndex: 98, status: "normal", isAnomaly: false },
  { id: 3, timeFormatted: "06:00", fullTimestamp: "09/09/2026 06:00:00", hour: 6, minute: 0, temperatureC: 44.0, powerWatts: 210, vramGb: 30.0, loadPercent: 38, healthIndex: 98, status: "normal", isAnomaly: false },
  { id: 4, timeFormatted: "08:00", fullTimestamp: "09/09/2026 08:00:00", hour: 8, minute: 0, temperatureC: 56.5, powerWatts: 380, vramGb: 58.0, loadPercent: 72, healthIndex: 96, status: "normal", isAnomaly: false },
  { id: 5, timeFormatted: "08:30", fullTimestamp: "09/09/2026 08:30:00", hour: 8, minute: 30, temperatureC: 72.8, powerWatts: 460, vramGb: 74.0, loadPercent: 92, healthIndex: 91, status: "warning", isAnomaly: true, anomalyTitle: "Đột Biến Tải Sáng Sớm (Vision Lab)", decisionNote: "Phát hiện tranh chấp VRAM giữa 2 job nghiên cứu LLM & CV.", actionTaken: "Kích hoạt Fair-Share Scheduler, phân bổ thời gian luân phiên." },
  { id: 6, timeFormatted: "10:00", fullTimestamp: "09/09/2026 10:00:00", hour: 10, minute: 0, temperatureC: 62.0, powerWatts: 410, vramGb: 64.0, loadPercent: 80, healthIndex: 95, status: "normal", isAnomaly: false },
  { id: 7, timeFormatted: "12:00", fullTimestamp: "09/09/2026 12:00:00", hour: 12, minute: 0, temperatureC: 54.0, powerWatts: 320, vramGb: 48.0, loadPercent: 60, healthIndex: 97, status: "normal", isAnomaly: false },
  { id: 8, timeFormatted: "14:15", fullTimestamp: "09/09/2026 14:15:00", hour: 14, minute: 15, temperatureC: 78.5, powerWatts: 510, vramGb: 78.4, loadPercent: 98, healthIndex: 82, status: "critical", isAnomaly: true, anomalyTitle: "Báo Động Quá Nhiệt GPU-NODE-01 (78.5°C)", decisionNote: "Nhiệt độ phòng máy tăng đột biến, quạt tản nhiệt rack server đạt ngưỡng 95%.", actionTaken: "Hạ xung tự động 15% (Thermal Throttling) & di chuyển 1 job sang DGX H100 Node 02." },
  { id: 9, timeFormatted: "16:00", fullTimestamp: "09/09/2026 16:00:00", hour: 16, minute: 0, temperatureC: 60.5, powerWatts: 420, vramGb: 62.0, loadPercent: 78, healthIndex: 94, status: "normal", isAnomaly: false },
  { id: 10, timeFormatted: "18:00", fullTimestamp: "09/09/2026 18:00:00", hour: 18, minute: 0, temperatureC: 58.0, powerWatts: 390, vramGb: 56.0, loadPercent: 70, healthIndex: 96, status: "normal", isAnomaly: false },
  { id: 11, timeFormatted: "19:45", fullTimestamp: "09/09/2026 19:45:00", hour: 19, minute: 45, temperatureC: 71.0, powerWatts: 470, vramGb: 72.5, loadPercent: 90, healthIndex: 89, status: "warning", isAnomaly: true, anomalyTitle: "Tái Tối Ưu Hóa Pareto Frontier Ban Đêm", decisionNote: "Giờ cao điểm điện EVN (18:00 - 21:00). Chi phí điện toán tăng 18%.", actionTaken: "Kích hoạt chế độ Green-Computing: Dời 3 batch training không khẩn về 22:30." },
  { id: 12, timeFormatted: "21:00", fullTimestamp: "09/09/2026 21:00:00", hour: 21, minute: 0, temperatureC: 55.0, powerWatts: 340, vramGb: 44.0, loadPercent: 55, healthIndex: 97, status: "normal", isAnomaly: false },
  { id: 13, timeFormatted: "23:59", fullTimestamp: "09/09/2026 23:59:00", hour: 23, minute: 59, temperatureC: 45.0, powerWatts: 240, vramGb: 32.0, loadPercent: 40, healthIndex: 98, status: "normal", isAnomaly: false }
];

export const DecisionTimelineReplay: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(8); // Default to 14:15 anomaly
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentFrame = GENERATED_FRAMES[currentIdx] || GENERATED_FRAMES[0];

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = 1000 / playbackSpeed;
    playTimerRef.current = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= GENERATED_FRAMES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetToStart = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
  };

  const anomalies = GENERATED_FRAMES.filter((f) => f.isAnomaly);

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* 1. Header Command Bar */}
      <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-ai" />
            <h2 className="text-base font-bold text-white tracking-wide">
              REPLAY DÒNG THỜI GIAN & TÁI HIỆN QUYẾT ĐỊNH ĐIỀU PHỐI 24H
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tái hiện từng khung giờ ngày 09/09/2026: Phát hiện điểm bất thường, kích hoạt SLA và truy vết lịch sử điều phối AI
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            onClick={resetToStart}
            title="Quay lại 00:00"
          >
            <RotateCcw size={13} />
            <span>00:00</span>
          </button>

          <button
            type="button"
            className="btn btn-primary text-xs flex items-center gap-2 font-bold px-4"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Tạm Dừng" : "Phát Lại (Auto-play)"}</span>
          </button>

          <div className="segmented-control-2026">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`segmented-btn-2026 ${playbackSpeed === spd ? "is-active" : ""}`}
                onClick={() => setPlaybackSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="timeline-replay-grid">
        {/* Left Column: Horizontal Timeline Scrubber & Anomaly Markers */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
            {/* Scrubber Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <Clock size={14} className="text-cyan-400" />
                <span>Trục thời gian: <strong className="text-white">00:00 — 23:59</strong></span>
              </div>
              <div className="font-mono text-sm font-bold text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded border border-cyan-400/30">
                KIM THỜI GIAN: {currentFrame.fullTimestamp}
              </div>
            </div>

            {/* Horizontal Scrubber Track */}
            <div className="timeline-horizontal-scrubber-track-2026 mb-6">
              {/* Native Input Slider */}
              <input
                type="range"
                min={0}
                max={GENERATED_FRAMES.length - 1}
                value={currentIdx}
                onChange={(e) => setCurrentIdx(parseInt(e.target.value, 10))}
                className="w-full cursor-pointer accent-cyan-400 h-2 bg-white/10 rounded-lg appearance-none"
              />

              {/* Ticks and Anomaly Pins */}
              <div className="timeline-ticks-bar-wrapper">
                {GENERATED_FRAMES.map((frame, idx) => {
                  const leftPercent = (idx / (GENERATED_FRAMES.length - 1)) * 100;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div
                      key={frame.id}
                      style={{ left: `${leftPercent}%` }}
                      className="timeline-tick-node"
                    >
                      {/* Anomaly Pin Icon */}
                      {frame.isAnomaly && (
                        <button
                          type="button"
                          onClick={() => setCurrentIdx(idx)}
                          className={`anomaly-marker-pin-2026 ${
                            frame.status === "critical" ? "is-critical" : "is-warning"
                          }`}
                          title={frame.anomalyTitle}
                        >
                          <AlertTriangle size={11} />
                        </button>
                      )}

                      {/* Tick Line */}
                      <span
                        className={`w-0.5 mt-1 ${
                          isCurrent
                            ? "h-4 bg-cyan-400"
                            : frame.isAnomaly
                            ? "h-3 bg-amber-400"
                            : "h-2 bg-white/20"
                        }`}
                      />

                      {/* Hour Label for key frames */}
                      {(idx % 2 === 0 || idx === GENERATED_FRAMES.length - 1) && (
                        <span
                          className={`font-mono text-[10px] mt-1 ${
                            isCurrent ? "text-cyan-300 font-bold" : "text-slate-500"
                          }`}
                        >
                          {frame.timeFormatted}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual SVG Curve Graph of Temperature & Load */}
            <div className="p-4 bg-black/40 rounded-lg border border-white/5 mt-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
                <span>BIỂU ĐỒ DAO ĐỘNG NHIỆT ĐỘ VÀ CÔNG SUẤT (24H)</span>
                <span className="text-rose-400">Ngưỡng cảnh báo: 70°C</span>
              </div>
              <div className="h-28 flex items-end gap-2 pt-2 border-b border-white/10 pb-1">
                {GENERATED_FRAMES.map((f, i) => {
                  const isSel = i === currentIdx;
                  const heightPercent = Math.min(100, Math.round((f.temperatureC / 85) * 100));

                  return (
                    <div
                      key={f.id}
                      onClick={() => setCurrentIdx(i)}
                      className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                      title={`${f.timeFormatted}: ${f.temperatureC}°C`}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          isSel
                            ? "bg-cyan-400 ring-2 ring-cyan-300 shadow-[0_0_10px_#00E5FF]"
                            : f.temperatureC > 70
                            ? "bg-rose-500/80 group-hover:bg-rose-400"
                            : f.temperatureC > 50
                            ? "bg-amber-500/60 group-hover:bg-amber-400"
                            : "bg-cyan-500/40 group-hover:bg-cyan-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick jump to anomalies strip */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <span className="font-mono text-[10.5px] text-slate-400 uppercase tracking-wider block mb-2">
                Các điểm cảnh báo bất thường trong ngày (Bấm để nhảy tới mốc):
              </span>
              <div className="flex flex-wrap gap-2">
                {anomalies.map((anom) => (
                  <button
                    key={anom.id}
                    type="button"
                    onClick={() => setCurrentIdx(GENERATED_FRAMES.findIndex((f) => f.id === anom.id))}
                    className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-2 border transition-all ${
                      currentFrame.id === anom.id
                        ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        : "bg-white/5 border-white/10 text-slate-300 hover:border-amber-400/50"
                    }`}
                  >
                    <AlertTriangle size={12} className={anom.status === "critical" ? "text-rose-400" : "text-amber-400"} />
                    <span>[{anom.timeFormatted}] {anom.anomalyTitle?.slice(0, 30)}...</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Snapshot Telemetry Details */}
        <div className="flex flex-col gap-4">
          <div className="timeline-details-panel">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                SNAPSHOT TELEMETRY CHI TIẾT
              </span>
              <span className="font-mono text-xs text-slate-400">
                Node: <strong>GPU-NODE-01</strong>
              </span>
            </div>

            {/* Current Snapshot Metrics */}
            <div className="timeline-snapshot-grid-2x2">
              <div className="p-3 bg-black/40 border border-white/10 rounded">
                <span className="font-mono text-[10px] text-slate-400 block">Nhiệt Độ Node:</span>
                <div
                  className={`text-xl font-bold font-mono ${
                    currentFrame.temperatureC > 70
                      ? "text-rose-400"
                      : currentFrame.temperatureC > 50
                      ? "text-amber-300"
                      : "text-cyan-300"
                  }`}
                >
                  {currentFrame.temperatureC}°C
                </div>
              </div>

              <div className="p-3 bg-black/40 border border-white/10 rounded">
                <span className="font-mono text-[10px] text-slate-400 block">Công Suất PUE:</span>
                <div className="text-xl font-bold font-mono text-amber-300">
                  {currentFrame.powerWatts}W
                </div>
              </div>

              <div className="p-3 bg-black/40 border border-white/10 rounded">
                <span className="font-mono text-[10px] text-slate-400 block">Phân Bổ VRAM:</span>
                <div className="text-lg font-bold font-mono text-violet-300">
                  {currentFrame.vramGb} / 80GB
                </div>
              </div>

              <div className="p-3 bg-black/40 border border-white/10 rounded">
                <span className="font-mono text-[10px] text-slate-400 block">Sức Khỏe Hệ Thống:</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {currentFrame.healthIndex}%
                </div>
              </div>
            </div>

            {/* Anomaly & Decision Box */}
            {currentFrame.isAnomaly ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>{currentFrame.anomalyTitle}</span>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-relaxed m-0">
                  {currentFrame.decisionNote}
                </p>
                <div className="pt-2 border-t border-amber-500/20 text-[11px] text-emerald-300 flex items-start gap-1.5 font-mono">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span><strong>Hành động SLA:</strong> {currentFrame.actionTaken}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Trạng thái bình thường. Không phát hiện xung đột hoặc vi phạm nhiệt độ.</span>
              </div>
            )}

            {/* Provenance Metadata */}
            <div className="mt-4 pt-3 border-t border-white/10 font-mono text-[10.5px] text-slate-400 flex flex-col gap-1">
              <div>Đồng bộ MESH: <strong className="text-cyan-300">ACTIVE (1.2ms)</strong></div>
              <div>Cơ chế điều phối: <strong>NSGA-II Multi-objective</strong></div>
              <div>Quyết định ID: <strong className="text-violet-300">#DEC-2026-F{currentFrame.id}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
