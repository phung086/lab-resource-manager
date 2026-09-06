import React, { useState, useMemo, useEffect } from "react";
import { Sliders, Award, Sparkles, TrendingUp, Zap, Clock, ShieldCheck, Check, RefreshCw, Cpu, Database } from "lucide-react";
import { apiRequest } from "../api.js";

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

  const [algorithm, setAlgorithm] = useState("NSGA2");
  const [paretoFrontier, setParetoFrontier] = useState([]);
  const [hypervolume, setHypervolume] = useState(0);
  const [runtimeMs, setRuntimeMs] = useState(0);
  const [datasetSize, setDatasetSize] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParetoFrontier();
  }, [algorithm]);

  async function fetchParetoFrontier() {
    setLoading(true);
    try {
      const res = await apiRequest("/optimization/pareto-frontier", {
        method: "POST",
        body: JSON.stringify({ algorithm })
      });
      if (res.ok && res.data) {
        setParetoFrontier(res.data.paretoFrontier || []);
        setHypervolume(res.data.hypervolume || 0);
        setRuntimeMs(res.data.runtimeMs || 0);
        setDatasetSize(res.data.datasetSize || 0);
      }
    } catch (_err) {}
    finally {
      setLoading(false);
    }
  }

  // Compute selected point based on sliders
  const selectedPoint = useMemo(() => {
    return selectParetoPointByWeights(weights, paretoFrontier);
  }, [weights, paretoFrontier]);

  // Dynamic SVG Chart bounds from real dataset
  const bounds = useMemo(() => {
    if (!paretoFrontier.length) return { minX: 30000, maxX: 80000, minY: 0.5, maxY: 4.0 };
    const energyVals = paretoFrontier.map((p) => p.objectives.energyCostVnd);
    const waitVals = paretoFrontier.map((p) => p.objectives.waitingTimeHours);
    const minX = Math.floor(Math.min(...energyVals) * 0.9);
    const maxX = Math.ceil(Math.max(...energyVals) * 1.1) || 80000;
    const minY = Math.max(0, Math.floor(Math.min(...waitVals) * 10) / 10 - 0.2);
    const maxY = Math.ceil(Math.max(...waitVals) * 10) / 10 + 0.5 || 3.5;
    return { minX, maxX, minY, maxY };
  }, [paretoFrontier]);

  function toSvgX(val) {
    const { minX, maxX } = bounds;
    const range = maxX - minX || 1;
    return 65 + ((val - minX) / range) * 410;
  }

  function toSvgY(val) {
    const { minY, maxY } = bounds;
    const range = maxY - minY || 1;
    return 240 - ((val - minY) / range) * 200;
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)" }}>
                {algorithm === "MOEAD" ? "MOEA/D DECOMPOSITION SOLVER" : "NSGA-II MULTI-OBJECTIVE SOLVER"}
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)" }}>
                ● 4D HYPERVOLUME HV = {hypervolume > 0 ? hypervolume.toFixed(4) : "Đang tính..."}
              </span>
              {runtimeMs > 0 && (
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  ● Thời gian giải: {runtimeMs}ms (N={datasetSize} tác vụ)
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Không Gian Nghiệm Pareto & Khảo Sát Trade-off Đa Mục Tiêu
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Biên Pareto được tính toán trực tiếp từ thuật toán tiến hóa đa mục tiêu ({algorithm}). Kéo các thanh trượt trọng số để hệ thống tự động tối ưu hóa hàm thỏa dụng và định vị nghiệm đánh đổi tương ứng.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={{
                background: "var(--surface-strong)",
                border: "1px solid var(--line)",
                color: "var(--text-primary)",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: "0.8rem",
                outline: "none"
              }}
            >
              <option value="NSGA2">Thuật toán NSGA-II</option>
              <option value="MOEAD">Thuật toán MOEA/D</option>
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={fetchParetoFrontier}
              disabled={loading}
              style={{ background: "var(--amber)", color: "var(--bg)", fontWeight: 600 }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} style={{ marginRight: 4 }} />
              {loading ? "Đang giải..." : "Giải Lại Biên"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        {/* SLIDERS PANEL */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <Sliders size={16} style={{ color: "var(--amber)" }} />
            <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              HÀM TRỌNG SỐ ĐA MỤC TIÊU (WEIGHTS)
            </strong>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên giảm thời gian chờ (w_wait)</span>
                <strong style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>{weights.wait}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.wait}
                onChange={(e) => setWeights({ ...weights, wait: parseInt(e.target.value) || 0 })}
                style={{ accentColor: "var(--amber)" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên tiết kiệm tiền điện EVN (w_energy)</span>
                <strong style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>{weights.energy}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.energy}
                onChange={(e) => setWeights({ ...weights, energy: parseInt(e.target.value) || 0 })}
                style={{ accentColor: "var(--green)" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Độ ưu tiên công bằng Jain's Index (w_fairness)</span>
                <strong style={{ color: "var(--purple)", fontFamily: "var(--font-mono)" }}>{weights.fairness}</strong>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={weights.fairness}
                onChange={(e) => setWeights({ ...weights, fairness: parseInt(e.target.value) || 0 })}
                style={{ accentColor: "var(--purple)" }}
              />
            </label>
          </div>

          <div style={{ background: "color-mix(in srgb, var(--amber) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)", borderRadius: 6, padding: 12, marginTop: 24, fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
            <strong style={{ display: "block", marginBottom: 4, color: "var(--amber)" }}>Nguyên Lý Biên Pareto (Non-Dominated):</strong>
            Không thể cải thiện một mục tiêu (ví dụ: làm nhanh hơn) mà không làm suy giảm ít nhất một mục tiêu khác (ví dụ: tốn điện hơn hoặc bất công bằng hơn) khi hệ thống đã đạt trạng thái tối ưu Pareto.
          </div>

          <div style={{ marginTop: 14, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            Phương pháp chọn nghiệm: Chuẩn hóa không gian mục tiêu về đoạn [0, 1] và cực tiểu hóa hàm tổn thất thỏa dụng w_i &times; norm(f_i).
          </div>
        </div>

        {/* VISUALIZATION PANEL */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* 2D SCATTER PLOT */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} style={{ color: "var(--amber)" }} />
                <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  MẶT PHẲNG CHI PHÍ - THỜI GIAN (2D PROJECTION CỦA KHÔNG GIAN 4D)
                </strong>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {paretoFrontier.length} nghiệm không bị trội
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", height: 260, background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 6 }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Đang tính toán không gian nghiệm Pareto ({algorithm})...
                </div>
              ) : paretoFrontier.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Chưa có dữ liệu nghiệm Pareto. Bấm "Giải Lại Biên" để thực thi.
                </div>
              ) : (
                <svg width="100%" height="260" viewBox="0 0 500 260">
                  {/* Grid Lines */}
                  <line x1="65" y1="240" x2="480" y2="240" stroke="var(--line-strong)" strokeWidth="2" />
                  <line x1="65" y1="20" x2="65" y2="240" stroke="var(--line-strong)" strokeWidth="2" />
                  <text x="270" y="255" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">Chi Phí Điện EVN (VND) →</text>
                  <text x="25" y="130" fill="var(--text-secondary)" fontSize="10" textAnchor="middle" transform="rotate(-90 25,130)">Chờ Đợi (Giờ) →</text>

                  {/* Pareto Frontier Connecting Line */}
                  <polyline
                    points={[...paretoFrontier]
                      .sort((a, b) => a.objectives.energyCostVnd - b.objectives.energyCostVnd)
                      .map((p) => `${toSvgX(p.objectives.energyCostVnd)},${toSvgY(p.objectives.waitingTimeHours)}`)
                      .join(" ")}
                    fill="none"
                    stroke="var(--line-strong)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />

                  {/* Scatter Points */}
                  {paretoFrontier.map((p) => {
                    const isSelected = selectedPoint && selectedPoint.id === p.id;
                    const cx = toSvgX(p.objectives.energyCostVnd);
                    const cy = toSvgY(p.objectives.waitingTimeHours);
                    return (
                      <g key={p.id}>
                        {isSelected && (
                          <circle cx={cx} cy={cy} r="16" fill="color-mix(in srgb, var(--amber) 25%, transparent)" />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? "8" : "5"}
                          fill={isSelected ? "var(--amber)" : "var(--line-strong)"}
                          stroke={isSelected ? "var(--bg)" : "none"}
                          strokeWidth="2"
                          style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* SELECTED POINT DETAILS */}
          {selectedPoint ? (
            <div style={{ background: "var(--surface-strong)", border: "1px solid var(--amber)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    PHƯƠNG ÁN ĐƯỢC CHỌN THEO TRỌNG SỐ (BEST COMPROMISE POINT)
                  </div>
                  <strong style={{ fontSize: "1.1rem", color: "var(--amber)" }}>{selectedPoint.name}</strong>
                </div>
                <span style={{ fontSize: "0.75rem", background: "var(--surface)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 4, color: "var(--text-primary)" }}>
                  {selectedPoint.tag}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", padding: 8, borderRadius: 6 }}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>TIỀN ĐIỆN EVN</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {Math.round(selectedPoint.objectives.energyCostVnd).toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)", color: "var(--amber)", padding: 8, borderRadius: 6 }}>
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
                  <div style={{ background: "color-mix(in srgb, var(--purple) 12%, transparent)", color: "var(--purple)", padding: 8, borderRadius: 6 }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>JAIN'S FAIRNESS</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedPoint.objectives.jainsFairnessIndex.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Đang tải phương án tối ưu...
            </div>
          )}

          {/* METHODOLOGY NOTE */}
          <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--surface) 60%, transparent)", border: "1px dashed var(--line)", borderRadius: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <strong>Cơ sở tính toán Hypervolume 4D:</strong> Hypervolume được tính toán giải tích chính xác từ tập nghiệm không bị trội (Non-dominated set) so với Điểm Tham Chiếu (Reference Point R = [16h chờ, 150.000 đ điện, 100 điểm stress thiết bị, 1.0 fairness nghịch đảo]). Điểm nghiệm được chọn động qua hàm chuẩn hóa khoảng cách thỏa dụng.
          </div>
        </div>
      </div>
    </div>
  );
}
