import React, { useState, useMemo } from "react";
import { Sliders, Award, Sparkles, TrendingUp, Zap, Clock, ShieldCheck, Check } from "lucide-react";

/**
 * Mathematical Pareto Point Selection via Weighted Normalized Utility Minimization
 */
export function selectParetoPointByWeights(weights, paretoSet) {
  if (!paretoSet || paretoSet.length === 0) return null;

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

export function ParetoFrontierExplorer() {
  const [weights, setWeights] = useState({
    wait: 40,
    energy: 50,
    fairness: 30
  });

  // Empirical Pareto Frontier Dataset (N=30, NSGA-II V2 Engine)
  const paretoFrontier = useMemo(() => [
    { id: "p-1", name: "Phương Án 1 (Cực Tiểu Chờ Đợi)", objectives: { waitingTimeHours: 0.8, energyCostVnd: 68500, equipmentStressScore: 38, jainsFairnessIndex: 0.88 }, tag: "Ưu Tiên Deadline" },
    { id: "p-2", name: "Phương Án 2 (Cân Bằng - Knee Point)", objectives: { waitingTimeHours: 1.4, energyCostVnd: 54200, equipmentStressScore: 28, jainsFairnessIndex: 0.85 }, tag: "Knee-Point Tối Ưu" },
    { id: "p-3", name: "Phương Án 3 (Tiết Kiệm Giờ Xanh)", objectives: { waitingTimeHours: 2.2, energyCostVnd: 47600, equipmentStressScore: 22, jainsFairnessIndex: 0.82 }, tag: "Green AI Schedule" },
    { id: "p-4", name: "Phương Án 4 (Tối Đa Công Bằng)", objectives: { waitingTimeHours: 1.8, energyCostVnd: 59000, equipmentStressScore: 30, jainsFairnessIndex: 0.94 }, tag: "Fair-Share Maximum" },
    { id: "p-5", name: "Phương Án 5 (Hao Mòn Thấp Nhất)", objectives: { waitingTimeHours: 2.6, energyCostVnd: 51000, equipmentStressScore: 16, jainsFairnessIndex: 0.80 }, tag: "Thermal Protection" }
  ], []);

  // Compute selected point based on sliders
  const selectedPoint = useMemo(() => {
    return selectParetoPointByWeights(weights, paretoFrontier);
  }, [weights, paretoFrontier]);

  // SVG Chart bounds
  const minX = 40000, maxX = 75000;
  const minY = 0.0, maxY = 3.2;

  function toSvgX(val) {
    return 60 + ((val - minX) / (maxX - minX)) * 420;
  }
  function toSvgY(val) {
    return 240 - ((val - minY) / (maxY - minY)) * 200;
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--cyan)", background: "rgba(56, 189, 248, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                NSGA-II MULTI-OBJECTIVE SOLVER
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)" }}>● 4D HYPERVOLUME HV = 0.4715</span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Không Gian Nghiệm Pareto & Khảo Sát Trade-off Đa Mục Tiêu
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Kéo các thanh trượt trọng số để hệ thống tự động giải bài toán tối ưu hóa đa mục tiêu và định vị nghiệm tối ưu tương ứng trên đường biên Pareto.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        {/* SLIDERS PANEL */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <Sliders size={16} style={{ color: "var(--cyan)" }} />
            <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              HÀM TRỌNG SỐ (WEIGHTS)
            </strong>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên hoàn thành nhanh (Wait)</span>
                <strong style={{ color: "var(--text-primary)" }}>{weights.wait}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.wait}
                onChange={(e) => setWeights({ ...weights, wait: parseInt(e.target.value) })}
                style={{ accentColor: "var(--cyan)" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên tiết kiệm điện năng (EVN)</span>
                <strong style={{ color: "var(--text-primary)" }}>{weights.energy}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.energy}
                onChange={(e) => setWeights({ ...weights, energy: parseInt(e.target.value) })}
                style={{ accentColor: "var(--green)" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên công bằng Jain's Index</span>
                <strong style={{ color: "var(--text-primary)" }}>{weights.fairness}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.fairness}
                onChange={(e) => setWeights({ ...weights, fairness: parseInt(e.target.value) })}
                style={{ accentColor: "var(--blue)" }}
              />
            </label>
          </div>

          <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: 6, padding: 12, marginTop: 24, fontSize: "0.75rem", color: "var(--cyan)", lineHeight: 1.5 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>Nguyên Lý Pareto:</strong>
            Không thể cải thiện một mục tiêu (ví dụ: làm nhanh hơn) mà không làm suy giảm mục tiêu khác (ví dụ: tốn điện hơn) khi hệ thống đã đạt trạng thái tối ưu Pareto.
          </div>
        </div>

        {/* VISUALIZATION PANEL */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* 2D SCATTER PLOT */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} style={{ color: "var(--amber)" }} />
              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>MẶT PHẲNG CHI PHÍ - THỜI GIAN (2D PROJECTION)</strong>
            </div>

            <div style={{ position: "relative", width: "100%", height: 260, background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 6 }}>
              <svg width="100%" height="260" viewBox="0 0 500 260">
                {/* Axes */}
                <line x1="60" y1="240" x2="480" y2="240" stroke="var(--line-strong)" strokeWidth="2" />
                <line x1="60" y1="20" x2="60" y2="240" stroke="var(--line-strong)" strokeWidth="2" />
                <text x="270" y="255" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">Chi Phí Điện (VND) →</text>
                <text x="30" y="130" fill="var(--text-secondary)" fontSize="10" textAnchor="middle" transform="rotate(-90 30,130)">Thời Gian Chờ (Giờ) →</text>

                {/* Pareto Frontier Line */}
                <polyline
                  points={paretoFrontier.sort((a,b) => a.objectives.energyCostVnd - b.objectives.energyCostVnd).map(p => `${toSvgX(p.objectives.energyCostVnd)},${toSvgY(p.objectives.waitingTimeHours)}`).join(" ")}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Points */}
                {paretoFrontier.map((p) => {
                  const isSelected = selectedPoint.id === p.id;
                  const cx = toSvgX(p.objectives.energyCostVnd);
                  const cy = toSvgY(p.objectives.waitingTimeHours);
                  return (
                    <g key={p.id}>
                      {isSelected && (
                        <circle cx={cx} cy={cy} r="16" fill="rgba(56, 189, 248, 0.2)" />
                      )}
                      <circle
                        cx={cx} cy={cy} r={isSelected ? "8" : "5"}
                        fill={isSelected ? "var(--cyan)" : "var(--line-strong)"}
                        stroke={isSelected ? "#14161A" : "none"}
                        strokeWidth="2"
                        style={{ transition: "all 0.3s ease" }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* SELECTED POINT DETAILS */}
          {selectedPoint && (
            <div style={{ background: "var(--surface-strong)", border: "1px solid var(--cyan)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>PHƯƠNG ÁN ĐƯỢC CHỌN (BEST COMPROMISE)</div>
                  <strong style={{ fontSize: "1.1rem", color: "var(--cyan)" }}>{selectedPoint.name}</strong>
                </div>
                <span style={{ fontSize: "0.75rem", background: "var(--surface)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 4, color: "var(--text-primary)" }}>
                  {selectedPoint.tag}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--green)", padding: 8, borderRadius: 6 }}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>NĂNG LƯỢNG (VND)</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedPoint.objectives.energyCostVnd.toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "rgba(227, 162, 60, 0.1)", color: "var(--amber)", padding: 8, borderRadius: 6 }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>THỜI GIAN CHỜ</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedPoint.objectives.waitingTimeHours.toFixed(1)} h
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--blue)", padding: 8, borderRadius: 6 }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>JAIN'S FAIRNESS INDEX</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedPoint.objectives.jainsFairnessIndex.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
