import React, { useState } from "react";
import { Play, Sliders, Award, Zap, Clock, ShieldCheck, RefreshCw, BarChart2, CheckCircle2, TrendingUp, Leaf } from "lucide-react";
import { apiRequest } from "../api.js";

export function GeneticAlgorithmVisualizer() {
  const [params, setParams] = useState({
    populationSize: 40,
    maxGenerations: 20,
    weights: {
      priority: 0.5,
      energy: 0.3,
      fairness: 0.2
    }
  });

  const [loading, setLoading] = useState(false);
  const [solverResult, setSolverResult] = useState(null);
  const [error, setError] = useState("");

  async function runSolver() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/simulation/scenario/rush-hour", {
        method: "POST",
        body: JSON.stringify({
          requestCount: 24,
          weights: params.weights
        })
      });
      if (data.success && data.data) {
        setSolverResult(data.data); // data.data contains solverResult from backend
      }
    } catch (err) {
      console.error("Error solving GA", err);
      setError("Lỗi khi gọi API mô phỏng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--cyan)", background: "rgba(56, 189, 248, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.25)" }}>
              ACADEMIC OPTIMIZATION CORE
            </span>
          </div>
          <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
            Bộ Giải Thuật Toán Di Truyền Xếp Lịch Đa Mục Tiêu
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Giải bài toán Multi-Objective Resource Allocation Problem (MORSP): Tối đa hóa giá trị học thuật & Tối thiểu hóa chi phí điện năng EVN.
          </p>
        </div>

        <button className="btn btn-primary" onClick={runSolver} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--cyan)", color: "#14161A", fontWeight: 700, padding: "10px 20px" }}>
          {loading ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
          <span>{loading ? "Đang tiến hóa..." : "Chạy Thuật Toán GA"}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(193, 80, 63, 0.1)", border: "1px solid var(--red)", borderRadius: 6, padding: "12px 16px", color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* PARAMETERS CONFIGURATION PANEL */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16 }}>
          <Sliders size={18} style={{ color: "var(--cyan)" }} />
          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            THAM SỐ HÀM MỤC TIÊU (OBJECTIVE WEIGHTS)
          </strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Trọng số Uy Tín & Vai Trò ($w_{priority}$): <strong style={{ color: "var(--text-primary)" }}>{params.weights.priority}</strong>
            </span>
            <input
              type="range"
              min="0" max="1" step="0.1"
              value={params.weights.priority}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, priority: parseFloat(e.target.value) } })}
              style={{ width: "100%", accentColor: "var(--cyan)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Trọng số Tiết kiệm EVN ($w_{energy}$): <strong style={{ color: "var(--text-primary)" }}>{params.weights.energy}</strong>
            </span>
            <input
              type="range"
              min="0" max="1" step="0.1"
              value={params.weights.energy}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, energy: parseFloat(e.target.value) } })}
              style={{ width: "100%", accentColor: "var(--green)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Trọng số Công Bằng ($w_{fairness}$): <strong style={{ color: "var(--text-primary)" }}>{params.weights.fairness}</strong>
            </span>
            <input
              type="range"
              min="0" max="1" step="0.1"
              value={params.weights.fairness}
              onChange={(e) => setParams({ ...params, weights: { ...params.weights, fairness: parseFloat(e.target.value) } })}
              style={{ width: "100%", accentColor: "var(--blue)" }}
            />
          </label>
        </div>
      </div>

      {/* RESULT DASHBOARD */}
      {solverResult && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)" }} /> SỐ REQUEST ĐƯỢC XẾP
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {solverResult.metrics.allocatedRequests} / {solverResult.metrics.totalRequests}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <ShieldCheck size={16} style={{ color: "var(--blue)" }} /> XUNG ĐỘT (CONFLICTS)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: solverResult.metrics.conflicts === 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
                {solverResult.metrics.conflicts}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <Clock size={16} style={{ color: "var(--cyan)" }} /> THỜI GIAN GIẢI (LATENCY)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {solverResult.metrics.executionTimeMs} <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>ms</span>
              </div>
            </div>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--green)", borderRadius: 8, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(95, 167, 119, 0.05)", zIndex: 0 }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--green)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                  <Leaf size={16} /> TIẾT KIỆM NĂNG LƯỢNG
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                  +{solverResult.baselineComparison.energySavedPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* FITNESS PROGRESSION CHART MOCK */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16 }}>
              <TrendingUp size={18} style={{ color: "var(--amber)" }} />
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                BIỂU ĐỒ HỘI TỤ HÀM FITNESS
              </strong>
            </div>
            <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 4, padding: "20px 0", borderBottom: "1px solid var(--line-strong)", borderLeft: "1px solid var(--line-strong)" }}>
              {solverResult.generationHistory.map((score, idx) => {
                const maxScore = Math.max(...solverResult.generationHistory);
                const heightPct = (score / maxScore) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", group: "chart-bar" }}>
                    <div style={{ width: "80%", height: `${heightPct}%`, background: idx === solverResult.generationHistory.length - 1 ? "var(--green)" : "var(--cyan)", borderRadius: "4px 4px 0 0", opacity: 0.8, transition: "height 0.5s ease" }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 8, fontFamily: "var(--font-mono)" }}>
              <span>Thế hệ 0 (Khởi tạo ngẫu nhiên)</span>
              <span>Thế hệ {solverResult.generationHistory.length - 1} (Hội tụ Pareto)</span>
            </div>
          </div>

          {/* ALLOCATION RESULTS TABLE */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px", overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16 }}>
              <Database size={18} style={{ color: "var(--blue)" }} />
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                KẾT QUẢ ĐIỀU PHỐI (CHROMOSOME TỐT NHẤT)
              </strong>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-strong)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  <th style={{ padding: "12px 10px", fontWeight: 600 }}>TÁC VỤ (JOB)</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600 }}>VAI TRÒ / ĐỘ ƯU TIÊN</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600 }}>THIẾT BỊ ĐƯỢC GÁN</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600 }}>KHUNG GIỜ</th>
                </tr>
              </thead>
              <tbody>
                {solverResult.bestSchedule.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>{item.requestTitle}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: 4, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-secondary)" }}>
                        {item.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{item.assignedResource}</td>
                    <td style={{ padding: "12px 10px", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                      {item.startHour}:00 - {item.endHour}:00 ({item.duration}h)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
