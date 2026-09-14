import React, { useState, useMemo, useEffect } from "react";
import {
  Sliders,
  Award,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
  Cpu,
  Layers,
  Info
} from "lucide-react";
import { apiRequest } from "../api.js";

export interface ParetoObjective {
  waitingTimeHours: number; // Y-axis
  energyCostVnd: number;    // X-axis
  jainsFairnessIndex: number;
}

export interface ParetoPoint {
  id: string | number;
  label: string;
  algorithm: string;
  isBestCompromise?: boolean;
  objectives: ParetoObjective;
  allocatedHardware: string;
  scheduleSlot: string;
}

const DEFAULT_PARETO_POINTS: ParetoPoint[] = [
  { id: 1, label: "Sol #01 (Tối Ưu Chi Phí EVN)", algorithm: "NSGA-II", objectives: { waitingTimeHours: 3.4, energyCostVnd: 38200, jainsFairnessIndex: 0.82 }, allocatedHardware: "NVIDIA L40S Workstation", scheduleSlot: "23:00 — 05:00 (Giờ Xanh)" },
  { id: 2, label: "Sol #02 (Cân Bằng Đa Mục Tiêu)", algorithm: "NSGA-II", isBestCompromise: true, objectives: { waitingTimeHours: 1.8, energyCostVnd: 51400, jainsFairnessIndex: 0.94 }, allocatedHardware: "NVIDIA H100 SXM5 Node 01", scheduleSlot: "21:30 — 03:30 (Hỗn hợp)" },
  { id: 3, label: "Sol #03 (Thời Gian Chờ Thấp)", algorithm: "NSGA-II", objectives: { waitingTimeHours: 0.8, energyCostVnd: 72600, jainsFairnessIndex: 0.88 }, allocatedHardware: "NVIDIA H100 SXM5 Node 02", scheduleSlot: "15:00 — 21:00 (Cao điểm)" },
  { id: 4, label: "Sol #04 (Tối Đa Công Bằng Jain)", algorithm: "NSGA-II", objectives: { waitingTimeHours: 1.4, energyCostVnd: 63000, jainsFairnessIndex: 0.98 }, allocatedHardware: "NVIDIA DGX A100 SuperPOD", scheduleSlot: "19:00 — 01:00" },
  { id: 5, label: "Sol #05 (Ngoại biên Tiết Kiệm)", algorithm: "NSGA-II", objectives: { waitingTimeHours: 4.2, energyCostVnd: 34100, jainsFairnessIndex: 0.78 }, allocatedHardware: "Jetson AGX Orin Cluster", scheduleSlot: "01:00 — 07:00" },
  { id: 6, label: "Sol #06 (Ưu Tiên Khẩn Cấp)", algorithm: "NSGA-II", objectives: { waitingTimeHours: 0.3, energyCostVnd: 86500, jainsFairnessIndex: 0.85 }, allocatedHardware: "NVIDIA H100 Node 01 Preempted", scheduleSlot: "Ngay lập tức (14:30)" }
];

export function selectParetoPointByWeights(
  weights: { wait: number; energy: number; fairness: number },
  paretoSet: ParetoPoint[]
): ParetoPoint {
  if (!paretoSet || paretoSet.length === 0) return DEFAULT_PARETO_POINTS[1];

  const totalW = (weights.wait || 0) + (weights.energy || 0) + (weights.fairness || 0);
  const w1 = totalW > 0 ? weights.wait / totalW : 0.333;
  const w2 = totalW > 0 ? weights.energy / totalW : 0.333;
  const w3 = totalW > 0 ? weights.fairness / totalW : 0.333;

  const waitValues = paretoSet.map((p) => p.objectives.waitingTimeHours);
  const energyValues = paretoSet.map((p) => p.objectives.energyCostVnd);
  const fairnessValues = paretoSet.map((p) => p.objectives.jainsFairnessIndex);

  const minWait = Math.min(...waitValues), maxWait = Math.max(...waitValues);
  const minEnergy = Math.min(...energyValues), maxEnergy = Math.max(...energyValues);
  const minFair = Math.min(...fairnessValues), maxFair = Math.max(...fairnessValues);

  let bestPoint = paretoSet[0];
  let minLoss = Infinity;

  paretoSet.forEach((p) => {
    const normWait = maxWait > minWait ? (p.objectives.waitingTimeHours - minWait) / (maxWait - minWait) : 0;
    const normEnergy = maxEnergy > minEnergy ? (p.objectives.energyCostVnd - minEnergy) / (maxEnergy - minEnergy) : 0;
    const normFair = maxFair > minFair ? (maxFair - p.objectives.jainsFairnessIndex) / (maxFair - minFair) : 0;

    const loss = w1 * normWait + w2 * normEnergy + w3 * normFair;
    if (loss < minLoss) {
      minLoss = loss;
      bestPoint = p;
    }
  });

  return bestPoint;
}

export const ParetoFrontierExplorer: React.FC = () => {
  const [weights, setWeights] = useState({
    wait: 35,
    energy: 45,
    fairness: 20
  });

  const [paretoFrontier, setParetoFrontier] = useState<ParetoPoint[]>(DEFAULT_PARETO_POINTS);
  const [hypervolume, setHypervolume] = useState<number>(0.8771);
  const [selectedPointId, setSelectedPointId] = useState<string | number | null>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<ParetoPoint | null>(null);

  useEffect(() => {
    fetchParetoFrontier();
  }, []);

  async function fetchParetoFrontier() {
    setLoading(true);
    try {
      const res = await apiRequest("/optimization/pareto-frontier", {
        method: "POST",
        body: JSON.stringify({ algorithm: "NSGA2" })
      }).catch(() => null);

      if (res?.ok && res?.data?.paretoFrontier?.length) {
        setParetoFrontier(res.data.paretoFrontier);
        if (res.data.hypervolume) setHypervolume(res.data.hypervolume);
      }
    } catch (_err) {
      // Graceful fallback to rich static points
    } finally {
      setLoading(false);
    }
  }

  // Active solution derived from sliders or manual selection
  const selectedPoint = useMemo(() => {
    if (selectedPointId !== null) {
      const found = paretoFrontier.find((p) => p.id === selectedPointId);
      if (found) return found;
    }
    return selectParetoPointByWeights(weights, paretoFrontier);
  }, [weights, paretoFrontier, selectedPointId]);

  // Chart coordinate mapping
  const chartBounds = useMemo(() => {
    const energyVals = paretoFrontier.map((p) => p.objectives.energyCostVnd);
    const waitVals = paretoFrontier.map((p) => p.objectives.waitingTimeHours);
    const minX = 30000;
    const maxX = 90000;
    const minY = 0.0;
    const maxY = 5.0;
    return { minX, maxX, minY, maxY };
  }, [paretoFrontier]);

  // SVG dimensions
  const svgWidth = 620;
  const svgHeight = 320;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };

  const scaleX = (val: number) => {
    return padding.left + ((val - chartBounds.minX) / (chartBounds.maxX - chartBounds.minX)) * (svgWidth - padding.left - padding.right);
  };

  const scaleY = (val: number) => {
    return svgHeight - padding.bottom - ((val - chartBounds.minY) / (chartBounds.maxY - chartBounds.minY)) * (svgHeight - padding.top - padding.bottom);
  };

  // Sort pareto points by energyCostVnd for smooth curve plotting
  const sortedPoints = useMemo(() => {
    return [...paretoFrontier].sort((a, b) => a.objectives.energyCostVnd - b.objectives.energyCostVnd);
  }, [paretoFrontier]);

  // Construct SVG path for Pareto Frontier curve
  const curvePath = useMemo(() => {
    if (sortedPoints.length < 2) return "";
    return sortedPoints.reduce((acc, pt, i) => {
      const x = scaleX(pt.objectives.energyCostVnd);
      const y = scaleY(pt.objectives.waitingTimeHours);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [sortedPoints]);

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* 1. Header Command Bar */}
      <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-ai" />
            <h2 className="text-base font-bold text-white tracking-wide">
              KHẢO SÁT BIÊN PARETO FRONTIER & TRADE-OFF ĐA MỤC TIÊU
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Không gian nghiệm không bị trội (Non-dominated): Cân bằng giữa Thời gian chờ (Wait Time), Tiền điện EVN (Energy Cost) và Công bằng Jain's Index
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-xs font-bold text-violet-300 bg-violet-950/60 px-3 py-1.5 rounded border border-violet-400/30">
            HYPERVOLUME METRIC: <strong>HV = {hypervolume}</strong>
          </div>
          <button
            type="button"
            onClick={fetchParetoFrontier}
            disabled={loading}
            className="btn btn-secondary text-xs flex items-center gap-1.5 font-mono"
            title="Làm mới tập nghiệm Pareto"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Tính Lại</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="pareto-layout-grid">
        {/* CỘT TRÁI (380px): 3 Thanh Slider Trọng Số Mục Tiêu */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                TRỌNG SỐ MỤC TIÊU TỐI ƯU
              </span>
              <span className="font-mono text-xs text-slate-400">
                Tổng: <strong className="text-white">{weights.wait + weights.energy + weights.fairness}%</strong>
              </span>
            </div>

            {/* Slider 1: Thời Gian Chờ (w_wait) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Thời Gian Chờ (w_wait)</span>
                </span>
                <span className="font-mono font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-400/30">
                  {weights.wait}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.wait}
                onChange={(e) => {
                  setSelectedPointId(null);
                  setWeights({ ...weights, wait: parseInt(e.target.value, 10) });
                }}
                className="w-full cursor-pointer range-slider-wait h-2 bg-white/10 rounded-lg appearance-none"
              />
              <span className="text-[11px] text-slate-400 font-mono">
                Ưu tiên giảm độ trễ hàng đợi nộp bài báo/ĐATN
              </span>
            </div>

            {/* Slider 2: Chi Phí Điện EVN (w_energy) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Zap size={14} />
                  <span>Chi Phí Điện EVN (w_energy)</span>
                </span>
                <span className="font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-400/30">
                  {weights.energy}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.energy}
                onChange={(e) => {
                  setSelectedPointId(null);
                  setWeights({ ...weights, energy: parseInt(e.target.value, 10) });
                }}
                className="w-full cursor-pointer range-slider-energy h-2 bg-white/10 rounded-lg appearance-none"
              />
              <span className="text-[11px] text-slate-400 font-mono">
                Tối đa hóa ca đêm Giờ Xanh (1.100 đ/kWh, -45%)
              </span>
            </div>

            {/* Slider 3: Độ Công Bằng Jain (w_fairness) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-violet-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Chỉ Số Công Bằng (w_fairness)</span>
                </span>
                <span className="font-mono font-bold text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-400/30">
                  {weights.fairness}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.fairness}
                onChange={(e) => {
                  setSelectedPointId(null);
                  setWeights({ ...weights, fairness: parseInt(e.target.value, 10) });
                }}
                className="w-full cursor-pointer range-slider-fairness h-2 bg-white/10 rounded-lg appearance-none"
              />
              <span className="text-[11px] text-slate-400 font-mono">
                Ngăn chặn hiện tượng độc quyền chiếm dụng GPU
              </span>
            </div>

            {/* Ghi chú toán học */}
            <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-[11px] text-slate-400 font-mono">
              <div>Hàm mục tiêu: <strong>Min U = w1·Wait + w2·Energy + w3·(1-Fair)</strong></div>
              <div className="text-slate-500 mt-1">Chuẩn hóa Min-Max [0, 1] trước khi tính khoảng cách Pareto</div>
            </div>
          </div>

          {/* Thẻ Kết Quả Đề Xuất (Solution Summary Card) */}
          {selectedPoint && (
            <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-amber-400/40 rounded-xl shadow-[0_8px_30px_rgba(245,158,11,0.15)] relative">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-mono text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={15} className="text-amber-400" />
                  <span>NGHIỆM TỐI ƯU HÀI HÒA (BEST COMPROMISE)</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  #{selectedPoint.id}
                </span>
              </div>

              <div className="my-3">
                <h4 className="text-sm font-bold text-white tracking-wide m-0">
                  {selectedPoint.label}
                </h4>
                <div className="font-mono text-xs text-cyan-300 mt-1">
                  {selectedPoint.allocatedHardware}
                </div>
              </div>

              {/* 3 Key Metrics */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 bg-black/50 border border-white/10 rounded text-center">
                  <span className="font-mono text-[10px] text-slate-400 block">Tiền Điện:</span>
                  <strong className="font-mono text-sm text-amber-300 mt-0.5 block">
                    {selectedPoint.objectives.energyCostVnd.toLocaleString()} đ
                  </strong>
                </div>

                <div className="p-2.5 bg-black/50 border border-white/10 rounded text-center">
                  <span className="font-mono text-[10px] text-slate-400 block">Chờ:</span>
                  <strong className="font-mono text-sm text-cyan-300 mt-0.5 block">
                    {selectedPoint.objectives.waitingTimeHours}h
                  </strong>
                </div>

                <div className="p-2.5 bg-black/50 border border-white/10 rounded text-center">
                  <span className="font-mono text-[10px] text-slate-400 block">Jain's Index:</span>
                  <strong className="font-mono text-sm text-emerald-400 mt-0.5 block">
                    {selectedPoint.objectives.jainsFairnessIndex}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded font-mono text-xs text-amber-200 flex items-center justify-between">
                <span>Khung giờ đề xuất:</span>
                <strong>{selectedPoint.scheduleSlot}</strong>
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Biểu Đồ Phân Bố Pareto 2D Projection */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block">
                  BIỂU ĐỒ BIÊN PARETO FRONTIER 2D PROJECTION
                </span>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Trục tung: Thời gian chờ (Giờ) • Trục hoành: Chi phí điện EVN (VNĐ)
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_#F59E0B]" />
                  <span>Best Compromise</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  <span>Nghiệm không trội</span>
                </span>
              </div>
            </div>

            {/* Interactive SVG Plot */}
            <div className="relative w-full bg-[#05070B] rounded-lg border border-white/10 p-2 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto block select-none">
                {/* Grid Lines */}
                {[1.0, 2.0, 3.0, 4.0].map((yVal) => (
                  <g key={`y-grid-${yVal}`}>
                    <line
                      x1={padding.left}
                      y1={scaleY(yVal)}
                      x2={svgWidth - padding.right}
                      y2={scaleY(yVal)}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 10}
                      y={scaleY(yVal) + 4}
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="end"
                    >
                      {yVal}h
                    </text>
                  </g>
                ))}

                {[40000, 60000, 80000].map((xVal) => (
                  <g key={`x-grid-${xVal}`}>
                    <line
                      x1={scaleX(xVal)}
                      y1={padding.top}
                      x2={scaleX(xVal)}
                      y2={svgHeight - padding.bottom}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={scaleX(xVal)}
                      y={svgHeight - padding.bottom + 18}
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {xVal / 1000}k
                    </text>
                  </g>
                ))}

                {/* Axes */}
                <line
                  x1={padding.left}
                  y1={svgHeight - padding.bottom}
                  x2={svgWidth - padding.right}
                  y2={svgHeight - padding.bottom}
                  stroke="rgba(255, 255, 255, 0.2)"
                />
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={svgHeight - padding.bottom}
                  stroke="rgba(255, 255, 255, 0.2)"
                />

                {/* Axis Labels */}
                <text
                  x={svgWidth - padding.right}
                  y={svgHeight - padding.bottom + 32}
                  fill="#94A3B8"
                  fontSize="10.5"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="end"
                >
                  Chi phí điện EVN (VNĐ) →
                </text>
                <text
                  x={padding.left}
                  y={padding.top - 10}
                  fill="#94A3B8"
                  fontSize="10.5"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="start"
                >
                  ↑ Thời gian chờ (Giờ)
                </text>

                {/* Pareto Frontier Smooth Curve */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="rgba(0, 229, 255, 0.45)"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Non-dominated Solution Points */}
                {paretoFrontier.map((point) => {
                  const cx = scaleX(point.objectives.energyCostVnd);
                  const cy = scaleY(point.objectives.waitingTimeHours);
                  const isSelected = selectedPoint?.id === point.id;
                  const isHovered = hoveredPoint?.id === point.id;

                  return (
                    <g
                      key={point.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPointId(point.id)}
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Radar Pulse Animation for Best Compromise */}
                      {isSelected && (
                        <circle
                          cx={cx}
                          cy={cy}
                          className="radar-pulse-circle"
                          fill="rgba(245, 158, 11, 0.35)"
                          stroke="#F59E0B"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Main Point Circle */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 8 : isHovered ? 7 : 5}
                        fill={isSelected ? "#F59E0B" : "#00E5FF"}
                        stroke={isSelected ? "#FFFFFF" : "#08090D"}
                        strokeWidth="2"
                        filter={isSelected ? "drop-shadow(0 0 8px #F59E0B)" : "drop-shadow(0 0 4px #00E5FF)"}
                      />

                      {/* Point label */}
                      <text
                        x={cx}
                        y={cy - 12}
                        fill={isSelected ? "#FCD34D" : "#CBD5E1"}
                        fontSize="9.5"
                        fontWeight={isSelected ? "bold" : "normal"}
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="middle"
                      >
                        #{point.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Points List Quick Selector Table */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider block mb-2">
                Danh Sách Tập Nghiệm Pareto (Bấm trực tiếp để đối chiếu):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {paretoFrontier.map((p) => {
                  const isSel = selectedPoint?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPointId(p.id)}
                      className={`p-2.5 rounded-lg border text-left font-mono text-xs transition-all ${
                        isSel
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                          : "bg-white/5 border-white/10 text-slate-300 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className={isSel ? "text-amber-300" : "text-white"}>
                          Sol #{p.id}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Jain {p.objectives.jainsFairnessIndex}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>{p.objectives.waitingTimeHours}h chờ</span>
                        <span className="text-amber-300 font-bold">{p.objectives.energyCostVnd.toLocaleString()} đ</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
