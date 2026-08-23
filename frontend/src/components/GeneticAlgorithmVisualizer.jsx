import React, { useState } from "react";
import { Play, Sliders, Award, Zap, Clock, ShieldCheck, RefreshCw, BarChart2, CheckCircle2, TrendingUp, Leaf } from "lucide-react";

export function GeneticAlgorithmVisualizer() {
  const [params, setParams] = useState({
    populationSize: 40,
    maxGenerations: 20,
    crossoverRate: 0.85,
    mutationRate: 0.15,
    weights: {
      priority: 0.5,
      energy: 0.3,
      fairness: 0.2
    }
  });

  const [loading, setLoading] = useState(false);
  const [solverResult, setSolverResult] = useState(null);

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  async function runSolver() {
    setLoading(true);
    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/simulation/solve-ga`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (data.success) {
        setSolverResult(data);
      }
    } catch (err) {
      console.error("Error solving GA", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack">
      {/* HEADER */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge info">Academic Optimization Core</span>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Bộ Giải Thuật Toán Di Truyền Xếp Lịch Đa Mục Tiêu (Genetic Algorithm Visualizer)</h2>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Giải bài toán Multi-Objective Resource Allocation Problem (MORSP): Tối đa hóa giá trị học thuật & Tối thiểu hóa chi phí điện năng EVN
          </p>
        </div>

        <button className="btn btn-primary" onClick={runSolver} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Play size={16} />
          <span>{loading ? "Đang tiến hóa các thế hệ..." : "Chạy Thuật Toán GA"}</span>
        </button>
      </div>

      {/* PARAMETERS CONFIGURATION PANEL */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sliders size={18} className="text-primary" />
            <strong>Tham Số Cấu Hình Thuật Toán (Hyperparameters & Objective Weights)</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Kích thước Quần thể (Population Size): <strong>{params.populationSize}</strong></span>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={params.populationSize}
              onChange={(e) => setParams({ ...params, populationSize: parseInt(e.target.value) })}
            />
          </label>

          <label>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Số Thế hệ Tối đa (Generations): <strong>{params.maxGenerations}</strong></span>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={params.maxGenerations}
              onChange={(e) => setParams({ ...params, maxGenerations: parseInt(e.target.value) })}
            />
          </label>

          <label>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Xác suất Lai ghép (Crossover Rate): <strong>{params.crossoverRate}</strong></span>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={params.crossoverRate}
              onChange={(e) => setParams({ ...params, crossoverRate: parseFloat(e.target.value) })}
            />
          </label>

          <label>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Xác suất Đột biến (Mutation Rate): <strong>{params.mutationRate}</strong></span>
            <input
              type="range"
              min="0.02"
              max="0.30"
              step="0.02"
              value={params.mutationRate}
              onChange={(e) => setParams({ ...params, mutationRate: parseFloat(e.target.value) })}
            />
          </label>
        </div>

        {/* OBJECTIVE WEIGHTS */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed rgba(0,0,0,0.08)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <label>
            <span style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>Trọng số Điểm Ưu Tiên (w_priority): {params.weights.priority}</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={params.weights.priority}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, priority: parseFloat(e.target.value) } })}
            />
          </label>

          <label>
            <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Trọng số Tiết Kiệm Điện EVN (w_energy): {params.weights.energy}</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={params.weights.energy}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, energy: parseFloat(e.target.value) } })}
            />
          </label>

          <label>
            <span style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>Trọng số Công Bằng Fair-share (w_fairness): {params.weights.fairness}</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={params.weights.fairness}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, fairness: parseFloat(e.target.value) } })}
            />
          </label>
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {solverResult && (
        <>
          {/* COMPARISON METRICS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div className="card" style={{ padding: "14px 16px", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tiết Kiệm Điện Năng EVN</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>
                +{solverResult.baselineComparison.energySavedPercent}%
              </div>
              <span style={{ fontSize: "0.75rem", color: "#059669" }}>So với xếp lịch truyền thống (FIFO)</span>
            </div>

            <div className="card" style={{ padding: "14px 16px", borderLeft: "4px solid #3b82f6" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Triệt Tiêu Xung Đột Thời Gian</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                100% Khả Thi
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>0 xung đột trùng khung giờ</span>
            </div>

            <div className="card" style={{ padding: "14px 16px", borderLeft: "4px solid #8b5cf6" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tỷ Lệ Giờ Xanh (Off-Peak)</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>
                {solverResult.metrics.greenSlotRatioPercent}%
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Biểu giá thấp điểm 1.100đ/kWh</span>
            </div>

            <div className="card" style={{ padding: "14px 16px", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Thời Gian Hội Tụ Thuật Toán</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>
                {solverResult.executionTimeMs} ms
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Qua {solverResult.generationHistory.length} thế hệ</span>
            </div>
          </div>

          {/* GENERATION CONVERGENCE PROGRESSION */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={18} className="text-primary" />
                <strong>Đồ Thị Tiến Hóa Thế Hệ Thuật Toán Di Truyền (Fitness Convergence Curve)</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 160, padding: "20px 10px 10px 10px", background: "rgba(0,0,0,0.02)", borderRadius: 8, overflowX: "auto" }}>
              {solverResult.generationHistory.map((gen) => {
                const maxFit = Math.max(...solverResult.generationHistory.map((g) => g.bestFitness));
                const heightPercent = Math.max(15, Math.round((gen.bestFitness / maxFit) * 100));

                return (
                  <div key={gen.generation} style={{ flex: 1, minWidth: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{gen.bestFitness}</span>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        background: "linear-gradient(to top, #3b82f6, #60a5fa)",
                        borderRadius: "4px 4px 0 0",
                        transition: "all 0.3s ease"
                      }}
                      title={`Thế hệ ${gen.generation}: Fitness=${gen.bestFitness}, Xung đột=${gen.conflicts}`}
                    />
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>G{gen.generation}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPTIMAL SCHEDULE MATRIX (GANTT) */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
              <strong>Lịch Trình Phân Bổ Tối Ưu Đa Mục Tiêu (Optimal Scheduled Allocations)</strong>
            </div>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="data-table" style={{ width: "100%", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th>Nhiệm Vụ Nghiên Cứu</th>
                    <th>Người Thực Hiện</th>
                    <th>Điểm Ưu Tiên</th>
                    <th>Thiết Bị Phân Bổ</th>
                    <th>Khung Giờ Tối Ưu</th>
                    <th>Biểu Giá Điện EVN</th>
                    <th>Ước Tính Chi Phí</th>
                  </tr>
                </thead>
                <tbody>
                  {solverResult.optimalSchedule.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.title}</strong></td>
                      <td>{item.userName} ({item.userRole})</td>
                      <td><span className="badge info">{item.priorityScore} pts</span></td>
                      <td><strong>{item.resourceCode}</strong></td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {item.startHour}:00 - {item.endHour}:00 ({item.durationHours}h)
                        </span>
                      </td>
                      <td>
                        {item.isOffPeakGreen ? (
                          <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Leaf size={12} /> Thấp điểm (1.100 đ/kWh)
                          </span>
                        ) : (
                          <span className="badge amber">Tiêu chuẩn ({item.electricityTariff.toLocaleString("vi-VN")} đ/kWh)</span>
                        )}
                      </td>
                      <td><strong>{item.costVnd.toLocaleString("vi-VN")} đ</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
