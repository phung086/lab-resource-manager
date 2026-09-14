import React, { useState } from "react";
import {
  Play,
  Sliders,
  ShieldCheck,
  Zap,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Server,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { apiRequest } from "../api.js";

export interface ScenarioCard {
  id: string;
  title: string;
  category: string;
  tone: "amber" | "rose" | "purple" | "emerald";
  desc: string;
  defaultVal: number;
}

const SCENARIOS: ScenarioCard[] = [
  {
    id: "EXTRA_GPUS",
    title: "Mở Rộng Thêm Cụm GPU H100",
    category: "CAPACITY EXPANSION",
    tone: "amber",
    desc: "Mô phỏng trường hợp Nhà trường đầu tư thêm máy chủ GPU NVIDIA H100 SXM5 để giảm thời gian chờ của sinh viên.",
    defaultVal: 2
  },
  {
    id: "NODE_FAILURE",
    title: "Sự Cố Sập Node Chủ Lực (H100-01)",
    category: "FAULT TOLERANCE",
    tone: "rose",
    desc: "Giả lập máy chủ tải nặng nhất bị quá nhiệt hoặc sập nguồn đột ngột để kiểm tra khả năng tự động chuyển tải của NSGA-II.",
    defaultVal: 1
  },
  {
    id: "SURGE_DEMAND",
    title: "Cơn Sốt Nhu Cầu Đồ Án Cao Điểm",
    category: "PEAK DEMAND 2X",
    tone: "purple",
    desc: "Thử nghiệm khi hàng trăm sinh viên cùng nộp đồ án và kiểm chứng chỉ số công bằng Jain's Fairness Index.",
    defaultVal: 2.0
  },
  {
    id: "TARIFF_CHANGE",
    title: "Giá Điện Cao Điểm EVN Tăng Vọt",
    category: "GREEN TARIFF SHOCK",
    tone: "emerald",
    desc: "Phân tích độ nhạy chi phí và đo lường tỷ lệ các tác vụ tự động dịch chuyển sang khung giờ Xanh ban đêm.",
    defaultVal: 30
  }
];

export const WhatIfSimulationStudio: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("EXTRA_GPUS");
  const [extraGpus, setExtraGpus] = useState<number>(2);
  const [failedNode, setFailedNode] = useState<string>("GPU-NODE-01");
  const [demandMultiplier, setDemandMultiplier] = useState<number>(2.0);
  const [priceHike, setPriceHike] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(true);

  const selectedScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  // Dynamic Delta Matrix based on active tuning parameters
  const matrixData = React.useMemo(() => {
    if (selectedScenarioId === "EXTRA_GPUS") {
      const waitReduction = +(1.8 / (1 + extraGpus * 0.4)).toFixed(1);
      const costIncrease = Math.round(extraGpus * 14200000);
      return [
        { metric: "Thời Gian Chờ Trung Bình", baseline: "2.8 giờ", scenario: `${waitReduction} giờ`, delta: `-${(2.8 - waitReduction).toFixed(1)}h (-${Math.round(((2.8 - waitReduction)/2.8)*100)}%)`, type: "positive" },
        { metric: "Chi Phí Điện Vận Hành / Tháng", baseline: "48.200.000 đ", scenario: `${(48.2 + costIncrease / 1000000).toFixed(1)} Tr đ`, delta: `+${(costIncrease / 1000000).toFixed(1)} Tr đ`, type: "negative" },
        { metric: "Tỷ Lệ Đáp Ứng SLA Khẩn Cấp", baseline: "91.5%", scenario: "99.2%", delta: "+7.7% (Tối đa)", type: "positive" },
        { metric: "Rủi Ro Quá Tải Server Rack", baseline: "42.0%", scenario: `${Math.max(5, 42 - extraGpus * 12)}%`, delta: `-${extraGpus * 12}% (Giảm áp lực)`, type: "positive" },
        { metric: "Chỉ Số Công Bằng Jain's Index", baseline: "0.82 / 1.0", scenario: "0.96 / 1.0", delta: "+0.14 (Rất công bằng)", type: "positive" }
      ];
    } else if (selectedScenarioId === "NODE_FAILURE") {
      return [
        { metric: "Thời Gian Chờ Trung Bình", baseline: "2.8 giờ", scenario: "4.9 giờ", delta: "+2.1h (+75% ùn ứ)", type: "negative" },
        { metric: "Chi Phí Điện Vận Hành / Tháng", baseline: "48.200.000 đ", scenario: "42.100.000 đ", delta: "-6.1 Tr đ (Giảm tải do sập)", type: "neutral" },
        { metric: "Tỷ Lệ Đáp Ứng SLA Khẩn Cấp", baseline: "91.5%", scenario: "73.0%", delta: "-18.5% (Cần phân xử lại)", type: "negative" },
        { metric: "Rủi Ro Quá Tải Server Rack 02", baseline: "42.0%", scenario: "89.5%", delta: "+47.5% (Nguy cơ quá nhiệt)", type: "negative" },
        { metric: "Chỉ Số Công Bằng Jain's Index", baseline: "0.82 / 1.0", scenario: "0.68 / 1.0", delta: "-0.14 (Tranh chấp tăng)", type: "negative" }
      ];
    } else if (selectedScenarioId === "SURGE_DEMAND") {
      return [
        { metric: "Thời Gian Chờ Trung Bình", baseline: "2.8 giờ", scenario: `${(2.8 * demandMultiplier * 0.7).toFixed(1)} giờ`, delta: `+${(2.8 * demandMultiplier * 0.7 - 2.8).toFixed(1)}h`, type: "negative" },
        { metric: "Chi Phí Điện Vận Hành / Tháng", baseline: "48.200.000 đ", scenario: `${(48.2 * (1 + demandMultiplier * 0.3)).toFixed(1)} Tr đ`, delta: `+${(48.2 * demandMultiplier * 0.3).toFixed(1)} Tr đ`, type: "negative" },
        { metric: "Tỷ Lệ Đáp Ứng SLA Khẩn Cấp", baseline: "91.5%", scenario: "82.4%", delta: "-9.1% (Ưu tiên nộp bài)", type: "negative" },
        { metric: "Rủi Ro Quá Tải Server Rack", baseline: "42.0%", scenario: "94.0%", delta: "+52.0% (Chạy hết công suất)", type: "negative" },
        { metric: "Chỉ Số Công Bằng Jain's Index", baseline: "0.82 / 1.0", scenario: "0.79 / 1.0", delta: "-0.03 (Hạn ngạch phát huy)", type: "neutral" }
      ];
    } else {
      // TARIFF_CHANGE
      const costDelta = +((48.2 * (priceHike / 100) * 0.55).toFixed(1));
      return [
        { metric: "Thời Gian Chờ Trung Bình", baseline: "2.8 giờ", scenario: "3.1 giờ", delta: "+0.3h (Dời ca đêm)", type: "neutral" },
        { metric: "Chi Phí Điện Vận Hành / Tháng", baseline: "48.200.000 đ", scenario: `${(48.2 + costDelta).toFixed(1)} Tr đ`, delta: `+${costDelta} Tr đ (+${Math.round((costDelta/48.2)*100)}%)`, type: "negative" },
        { metric: "Tỷ Lệ Tác Vụ Dời Sang Ca Đêm", baseline: "35.0%", scenario: `${Math.min(85, 35 + priceHike * 0.8)}%`, delta: `+${Math.round(priceHike * 0.8)}% (Chuyển giờ xanh)`, type: "positive" },
        { metric: "Giảm Phát Thải CO2 Hàng Tháng", baseline: "1.420 kg", scenario: "1.890 kg", delta: "-470 kg CO2 (Tối ưu)", type: "positive" },
        { metric: "Chỉ Số Công Bằng Jain's Index", baseline: "0.82 / 1.0", scenario: "0.84 / 1.0", delta: "+0.02 (Không đổi)", type: "positive" }
      ];
    }
  }, [selectedScenarioId, extraGpus, failedNode, demandMultiplier, priceHike]);

  async function handleRunSimulation() {
    setLoading(true);
    try {
      await apiRequest("/simulation/what-if", {
        method: "POST",
        body: JSON.stringify({
          scenarioType: selectedScenarioId,
          modifier: {
            extraGpuCount: extraGpus,
            failedNode,
            demandMultiplier,
            priceHikePercent: priceHike
          }
        })
      }).catch(() => null);

      setHasRun(true);
    } catch (_err) {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* 1. Header Command Bar */}
      <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-ai" />
            <h2 className="text-base font-bold text-white tracking-wide">
              STUDIO MÔ PHỎNG KỊCH BẢN GIẢ ĐỊNH & QUY HOẠCH NĂNG LỰC (WHAT-IF STUDIO)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Đặt câu hỏi phản biện: "Điều gì xảy ra nếu...?" và nhận ngay Ma trận chênh lệch đối sánh (Delta Impact Matrix) tức thì
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleRunSimulation}
          className="btn btn-primary text-xs font-bold px-5 py-2.5 flex items-center gap-2 font-mono bg-cyan-400 text-obsidian shadow-[0_0_15px_rgba(0,229,255,0.4)]"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          <span>{loading ? "ĐANG TÍNH TOÁN..." : "CHẠY GIẢ ĐỊNH WHAT-IF"}</span>
        </button>
      </div>

      {/* 2. 4 Thẻ Kịch Bản Giả Định (Scenario Cards) */}
      <div className="hardware-grid-4cols">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenarioId === sc.id;

          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`hardware-card-2026 ${isSelected ? "is-selected" : ""}`}
            >
              {isSelected && (
                <div className="hardware-card-checkmark-badge" title="Đang kích hoạt">
                  <CheckCircle2 size={13} strokeWidth={3} />
                </div>
              )}

              <div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border inline-block mb-2 ${
                    sc.tone === "amber"
                      ? "text-amber-400 bg-amber-950/60 border-amber-400/30"
                      : sc.tone === "rose"
                      ? "text-rose-400 bg-rose-950/60 border-rose-400/30"
                      : sc.tone === "purple"
                      ? "text-violet-300 bg-violet-950/60 border-violet-400/30"
                      : "text-emerald-400 bg-emerald-950/60 border-emerald-400/30"
                  }`}
                >
                  {sc.category}
                </span>

                <h3 className="text-sm font-bold text-white tracking-wide mb-1">
                  {sc.title}
                </h3>

                <p className="text-[11.5px] text-slate-400 leading-relaxed m-0">
                  {sc.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10.5px]">
                <span className={isSelected ? "text-cyan-300 font-bold" : "text-slate-500"}>
                  {isSelected ? "● Kịch bản đang chọn" : "Bấm để thử nghiệm"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Fine-tuning Slider Container của Kịch Bản Đang Chọn */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-cyan-400/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-300">
            <Sliders size={15} />
            <span>TINH CHỈNH THAM SỐ GIẢ ĐỊNH: <strong className="text-white uppercase">{selectedScenario.title}</strong></span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            Kịch bản: <strong>{selectedScenario.category}</strong>
          </span>
        </div>

        {/* Kịch bản 1: Mở rộng thêm GPU */}
        {selectedScenarioId === "EXTRA_GPUS" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Số lượng cụm GPU H100 SXM5 bổ sung:</span>
              <span className="font-bold text-lg text-amber-300 bg-black/50 px-3 py-1 rounded border border-amber-400/30">
                +{extraGpus} Cụm GPU
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={extraGpus}
              onChange={(e) => setExtraGpus(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer range-slider-energy h-2.5 bg-white/10 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>+1 Node (Cơ bản)</span>
              <span>+2 Nodes (Khuyến nghị ĐATN)</span>
              <span>+4 Nodes (Nghiên cứu LLM)</span>
              <span>+8 Nodes (Cụm SuperPOD lớn)</span>
            </div>
          </div>
        )}

        {/* Kịch bản 2: Sự cố sập Node */}
        {selectedScenarioId === "NODE_FAILURE" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Chọn Node chủ lực gặp sự cố giả lập:</span>
              <span className="font-bold text-sm text-rose-400 bg-rose-950/60 px-3 py-1 rounded border border-rose-400/30">
                CRITICAL FAILURE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {["GPU-NODE-01 (NVIDIA DGX A100)", "GPU-H100-02 (NVIDIA DGX H100)", "UAV-MATRICE-300 (Drone Dock)"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFailedNode(n)}
                  className={`p-3 rounded-lg border text-left font-mono text-xs transition-all ${
                    failedNode === n
                      ? "bg-rose-500/20 border-rose-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <AlertTriangle size={14} className="text-rose-400 mb-1" />
                  <div>{n}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kịch bản 3: Sốt nhu cầu đồ án */}
        {selectedScenarioId === "SURGE_DEMAND" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Hệ số bùng nổ nhu cầu tính toán sinh viên:</span>
              <span className="font-bold text-lg text-violet-300 bg-black/50 px-3 py-1 rounded border border-violet-400/30">
                {demandMultiplier}x Nhu Cầu
              </span>
            </div>
            <input
              type="range"
              min={1.5}
              max={5.0}
              step={0.5}
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
              className="w-full cursor-pointer range-slider-fairness h-2.5 bg-white/10 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>1.5x (Tuần nộp tiểu luận)</span>
              <span>2.0x (Cao điểm ĐATN)</span>
              <span>3.5x (Đợt thi kết thúc môn)</span>
              <span>5.0x (Stress test cực đại)</span>
            </div>
          </div>
        )}

        {/* Kịch bản 4: Giá điện tăng */}
        {selectedScenarioId === "TARIFF_CHANGE" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Tỷ lệ điều chỉnh tăng giá điện EVN giờ cao điểm:</span>
              <span className="font-bold text-lg text-emerald-300 bg-black/50 px-3 py-1 rounded border border-emerald-400/30">
                +{priceHike}% Biểu Giá
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={priceHike}
              onChange={(e) => setPriceHike(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer range-slider-energy h-2.5 bg-white/10 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>+10% (Biến động nhẹ)</span>
              <span>+30% (Chính sách giờ cao điểm mới)</span>
              <span>+50% (Mùa nắng nóng cực đoan)</span>
              <span>+80% (Khủng hoảng năng lượng)</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bảng So Sánh Chênh Lệch Đối Sánh (Delta Impact Matrix) */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              MA TRẬN ĐỐI SÁNH TÁC ĐỘNG (DELTA IMPACT MATRIX Δ)
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            So sánh: <strong>Baseline Hiện Tại</strong> vs <strong>Kịch Bản Giả Định</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="delta-impact-table-2026">
            <thead>
              <tr>
                <th>Chỉ Số Hiệu Năng & Vận Hành</th>
                <th>Trước Giả Định (Baseline)</th>
                <th>Sau Giả Định (Scenario)</th>
                <th>Độ Chênh Lệch (Delta Δ)</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-semibold text-white">{row.metric}</td>
                  <td className="font-mono text-slate-300">{row.baseline}</td>
                  <td className="font-mono text-cyan-300 font-bold">{row.scenario}</td>
                  <td>
                    <span
                      className={`delta-tag ${
                        row.type === "positive"
                          ? "delta-positive"
                          : row.type === "negative"
                          ? "delta-negative"
                          : "delta-neutral"
                      }`}
                    >
                      {row.type === "positive" ? (
                        <TrendingDown size={13} />
                      ) : row.type === "negative" ? (
                        <TrendingUp size={13} />
                      ) : (
                        <span>•</span>
                      )}
                      <span>{row.delta}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
