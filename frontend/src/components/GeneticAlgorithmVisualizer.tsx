import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Sliders,
  Zap,
  Clock,
  ShieldCheck,
  RefreshCw,
  TrendingDown,
  Leaf,
  CheckCircle2,
  Server,
  Layers,
  Award,
  Cpu
} from "lucide-react";
import { apiRequest } from "../api.js";

export interface GenerationPoint {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  hypervolume: number;
}

const DEFAULT_CONVERGENCE_HISTORY: GenerationPoint[] = [
  { generation: 1, bestFitness: 0.742, avgFitness: 0.912, hypervolume: 0.621 },
  { generation: 3, bestFitness: 0.615, avgFitness: 0.825, hypervolume: 0.695 },
  { generation: 5, bestFitness: 0.528, avgFitness: 0.741, hypervolume: 0.748 },
  { generation: 8, bestFitness: 0.442, avgFitness: 0.650, hypervolume: 0.792 },
  { generation: 12, bestFitness: 0.380, avgFitness: 0.562, hypervolume: 0.835 },
  { generation: 16, bestFitness: 0.325, avgFitness: 0.480, hypervolume: 0.858 },
  { generation: 20, bestFitness: 0.285, avgFitness: 0.410, hypervolume: 0.871 },
  { generation: 25, bestFitness: 0.248, avgFitness: 0.365, hypervolume: 0.8771 }
];

export const GeneticAlgorithmVisualizer: React.FC = () => {
  const [params, setParams] = useState({
    populationSize: 40,
    maxGenerations: 25,
    crossoverRate: 0.85,
    mutationRate: 0.15
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentGen, setCurrentGen] = useState<number>(25);
  const [displayedHistory, setDisplayedHistory] = useState<GenerationPoint[]>(DEFAULT_CONVERGENCE_HISTORY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger simulated generation-by-generation evolution
  function handleRunGA() {
    setIsRunning(true);
    setCurrentGen(1);
    setDisplayedHistory([DEFAULT_CONVERGENCE_HISTORY[0]]);

    let gen = 1;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      gen += 1;
      setCurrentGen(gen);

      // Interpolate fitness points
      const best = +(0.75 * Math.exp(-0.045 * gen)).toFixed(3);
      const avg = +(best * 1.35).toFixed(3);
      const hv = +(0.60 + 0.28 * (1 - Math.exp(-0.08 * gen))).toFixed(4);

      setDisplayedHistory((prev) => [
        ...prev,
        { generation: gen, bestFitness: best, avgFitness: avg, hypervolume: hv }
      ]);

      if (gen >= params.maxGenerations) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRunning(false);
      }
    }, 120);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const latestPoint = displayedHistory[displayedHistory.length - 1] || DEFAULT_CONVERGENCE_HISTORY[DEFAULT_CONVERGENCE_HISTORY.length - 1];

  // SVG Chart bounds
  const svgWidth = 620;
  const svgHeight = 240;
  const pad = { top: 20, right: 30, bottom: 40, left: 55 };

  const scaleX = (gen: number) => {
    return pad.left + ((gen - 1) / (params.maxGenerations - 1)) * (svgWidth - pad.left - pad.right);
  };

  const scaleY = (fit: number) => {
    return svgHeight - pad.bottom - ((fit - 0.1) / (1.0 - 0.1)) * (svgHeight - pad.top - pad.bottom);
  };

  const bestPath = displayedHistory.reduce((acc, pt, i) => {
    const x = scaleX(pt.generation);
    const y = scaleY(pt.bestFitness);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  const avgPath = displayedHistory.reduce((acc, pt, i) => {
    const x = scaleX(pt.generation);
    const y = scaleY(pt.avgFitness);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* 1. Header Command Bar */}
      <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-ai" />
            <h2 className="text-base font-bold text-white tracking-wide">
              BỘ GIẢI THUẬT TOÁN DI TRUYỀN NSGA-II VISUALIZER
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mô phỏng không gian tiến hóa đa mục tiêu: Quần thể (Population), Lai ghép (Crossover), Đột biến (Mutation) và Chọn lọc Pareto Rank
          </p>
        </div>

        <button
          type="button"
          disabled={isRunning}
          onClick={handleRunGA}
          className="btn btn-primary text-xs font-bold px-6 py-2.5 flex items-center gap-2 font-mono bg-cyan-400 text-obsidian shadow-[0_0_15px_rgba(0,229,255,0.4)]"
        >
          {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          <span>{isRunning ? `ĐANG TIẾN HÓA THẾ HỆ ${currentGen}/${params.maxGenerations}...` : "CHẠY THUẬT TOÁN GA"}</span>
        </button>
      </div>

      {/* 2. Bảng Tham Số GA (Ô Input Monospace Nhỏ Gọn) */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <Cpu size={15} />
            <span>BẢNG THAM SỐ THUẬT TOÁN DI TRUYỀN (GA HYPERPARAMETERS)</span>
          </span>
          <span className="font-mono text-xs text-slate-400">
            Cơ chế chọn lọc: <strong>Tournament (k=2) + Crowding Distance</strong>
          </span>
        </div>

        <div className="hardware-grid-4cols">
          {/* Population Size */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
            <span className="font-mono text-[10.5px] text-slate-400 uppercase block mb-1">
              Population Size (Quần thể):
            </span>
            <input
              type="number"
              disabled={isRunning}
              value={params.populationSize}
              onChange={(e) => setParams({ ...params, populationSize: parseInt(e.target.value, 10) || 40 })}
              className="bg-black/60 border border-white/15 text-white font-mono text-sm px-3 py-1.5 rounded font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">40 cá thể / thế hệ</span>
          </div>

          {/* Max Generations */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
            <span className="font-mono text-[10.5px] text-slate-400 uppercase block mb-1">
              Max Generations (Thế hệ):
            </span>
            <input
              type="number"
              disabled={isRunning}
              value={params.maxGenerations}
              onChange={(e) => setParams({ ...params, maxGenerations: parseInt(e.target.value, 10) || 25 })}
              className="bg-black/60 border border-white/15 text-white font-mono text-sm px-3 py-1.5 rounded font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">25 vòng lặp tiến hóa</span>
          </div>

          {/* Crossover Rate */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
            <span className="font-mono text-[10.5px] text-slate-400 uppercase block mb-1">
              Crossover Rate (Tỷ lệ lai ghép):
            </span>
            <input
              type="number"
              step={0.05}
              disabled={isRunning}
              value={params.crossoverRate}
              onChange={(e) => setParams({ ...params, crossoverRate: parseFloat(e.target.value) || 0.85 })}
              className="bg-black/60 border border-white/15 text-cyan-300 font-mono text-sm px-3 py-1.5 rounded font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">85% Single-Point Crossover</span>
          </div>

          {/* Mutation Rate */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
            <span className="font-mono text-[10.5px] text-slate-400 uppercase block mb-1">
              Mutation Rate (Tỷ lệ đột biến):
            </span>
            <input
              type="number"
              step={0.01}
              disabled={isRunning}
              value={params.mutationRate}
              onChange={(e) => setParams({ ...params, mutationRate: parseFloat(e.target.value) || 0.15 })}
              className="bg-black/60 border border-white/15 text-amber-300 font-mono text-sm px-3 py-1.5 rounded font-bold"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">15% Bit-Flip Mutation</span>
          </div>
        </div>
      </div>

      {/* 3. Biểu Đồ Hội Tụ Thế Hệ (Fitness Convergence Chart) */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block">
              BIỂU ĐỒ TIẾN HÓA VÀ HỘI TỤ HÀM MỤC TIÊU (FITNESS CONVERGENCE)
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Đường cong giảm dần: Thể hiện sai số hàm mục tiêu tổng thể tiến về nghiệm tối ưu toàn cục
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              <span>Nghiệm Tốt Nhất (Best Fitness)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-500 inline-block" />
              <span>Trung Bình Quần Thể (Avg Fitness)</span>
            </span>
          </div>
        </div>

        {/* SVG Plot */}
        <div className="relative w-full bg-[#05070B] rounded-lg border border-white/10 p-2">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto block select-none">
            {/* Grid */}
            {[0.2, 0.4, 0.6, 0.8].map((fVal) => (
              <g key={`f-grid-${fVal}`}>
                <line
                  x1={pad.left}
                  y1={scaleY(fVal)}
                  x2={svgWidth - pad.right}
                  y2={scaleY(fVal)}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={pad.left - 10}
                  y={scaleY(fVal) + 4}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="end"
                >
                  {fVal.toFixed(1)}
                </text>
              </g>
            ))}

            {[5, 10, 15, 20, 25].map((gVal) => (
              <g key={`g-grid-${gVal}`}>
                <line
                  x1={scaleX(gVal)}
                  y1={pad.top}
                  x2={scaleX(gVal)}
                  y2={svgHeight - pad.bottom}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={scaleX(gVal)}
                  y={svgHeight - pad.bottom + 18}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                >
                  Gen {gVal}
                </text>
              </g>
            ))}

            {/* Axes */}
            <line
              x1={pad.left}
              y1={svgHeight - pad.bottom}
              x2={svgWidth - pad.right}
              y2={svgHeight - pad.bottom}
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <line
              x1={pad.left}
              y1={pad.top}
              x2={pad.left}
              y2={svgHeight - pad.bottom}
              stroke="rgba(255, 255, 255, 0.2)"
            />

            {/* Average Curve */}
            {avgPath && (
              <path
                d={avgPath}
                fill="none"
                stroke="rgba(148, 163, 184, 0.5)"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )}

            {/* Best Fitness Curve */}
            {bestPath && (
              <path
                d={bestPath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2.5"
              />
            )}

            {/* Current Gen Marker */}
            {displayedHistory.length > 0 && (
              <circle
                cx={scaleX(latestPoint.generation)}
                cy={scaleY(latestPoint.bestFitness)}
                r={6}
                fill="#F59E0B"
                stroke="#FFFFFF"
                strokeWidth="2"
                filter="drop-shadow(0 0 8px #F59E0B)"
              />
            )}
          </svg>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10 font-mono text-xs">
          <div className="p-3 bg-black/40 border border-white/10 rounded">
            <span className="text-[10px] text-slate-400 uppercase block">Thế Hệ Hiện Tại:</span>
            <strong className="text-white text-base mt-0.5 block">{currentGen} / {params.maxGenerations}</strong>
          </div>

          <div className="p-3 bg-black/40 border border-white/10 rounded">
            <span className="text-[10px] text-slate-400 uppercase block">Best Fitness:</span>
            <strong className="text-cyan-300 text-base mt-0.5 block">{latestPoint.bestFitness}</strong>
          </div>

          <div className="p-3 bg-black/40 border border-white/10 rounded">
            <span className="text-[10px] text-slate-400 uppercase block">Avg Fitness:</span>
            <strong className="text-slate-300 text-base mt-0.5 block">{latestPoint.avgFitness}</strong>
          </div>

          <div className="p-3 bg-black/40 border border-white/10 rounded">
            <span className="text-[10px] text-slate-400 uppercase block">Hypervolume HV:</span>
            <strong className="text-amber-300 text-base mt-0.5 block">{latestPoint.hypervolume}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
