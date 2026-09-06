import React, { useState } from "react";
import {
  Play, Sliders, Zap, Clock, ShieldCheck, RefreshCw,
  TrendingUp, Leaf, CheckCircle2, Loader2, WifiOff, Info, Server
} from "lucide-react";
import { apiRequest } from "../api.js";

/**
 * GeneticAlgorithmVisualizer — Bộ giải thuật toán di truyền xếp lịch đa mục tiêu
 *
 * Dữ liệu: POST /simulation/solve-ga
 * Tham số gửi: populationSize, maxGenerations, crossoverRate, mutationRate, weights
 * Trả về: optimalSchedule, generationHistory, metrics, baselineComparison
 */

export function GeneticAlgorithmVisualizer() {
  const [params, setParams] = useState({
    populationSize: 40,
    maxGenerations: 25,
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
  const [error, setError] = useState("");

  async function runSolver() {
    setLoading(true);
    setError("");
    setSolverResult(null);
    try {
      const data = await apiRequest("/simulation/solve-ga", {
        method: "POST",
        body: JSON.stringify({
          populationSize: params.populationSize,
          maxGenerations: params.maxGenerations,
          crossoverRate: params.crossoverRate,
          mutationRate: params.mutationRate,
          weights: params.weights
        })
      });
      if (data.success) {
        setSolverResult(data);
      } else {
        setError("API trả về kết quả không thành công.");
      }
    } catch (err) {
      setError("Lỗi khi gọi API: " + (err.message || "Không rõ nguyên nhân"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "18px 22px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: "0.72rem", fontFamily: "var(--font-mono)",
              color: "var(--amber)",
              background: "color-mix(in srgb, var(--amber) 12%, transparent)",
              padding: "2px 8px", borderRadius: 4,
              border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)"
            }}>
              NSGA-II SOLVER
            </span>
          </div>
          <h2 style={{
            margin: "6px 0 2px 0", fontSize: "1.3rem",
            color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700
          }}>
            Bộ Giải Thuật Toán Di Truyền Xếp Lịch Đa Mục Tiêu
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Giải bài toán phân bổ tài nguyên đa mục tiêu (MORSP): tối đa giá trị ưu tiên, tối thiểu chi phí điện EVN, đảm bảo không xung đột.
          </p>
        </div>

        <button
          type="button"
          onClick={runSolver}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--amber)", color: "var(--bg)",
            fontWeight: 700, padding: "10px 20px", border: "none",
            borderRadius: 6, cursor: loading ? "wait" : "pointer",
            fontSize: "0.85rem", fontFamily: "var(--font-heading)"
          }}
        >
          {loading ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
          <span>{loading ? "Đang tiến hóa..." : "Chạy Thuật Toán GA"}</span>
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{
          background: "color-mix(in srgb, var(--red) 10%, transparent)",
          border: "1px solid var(--red)", borderRadius: 6,
          padding: "12px 16px", color: "var(--red)", fontSize: "0.85rem",
          display: "flex", alignItems: "flex-start", gap: 8
        }}>
          <WifiOff size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ display: "block", marginBottom: 2 }}>Lỗi kết nối</strong>
            {error}
          </div>
        </div>
      )}

      {/* PARAMETERS CONFIGURATION PANEL */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "20px 22px"
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16
        }}>
          <Sliders size={18} style={{ color: "var(--amber)" }} />
          <strong style={{
            fontSize: "0.95rem", color: "var(--text-primary)",
            fontFamily: "var(--font-heading)"
          }}>
            THAM SỐ THUẬT TOÁN GA
          </strong>
        </div>

        {/* GA params row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16, marginBottom: 20
        }}>
          <ParamInput
            label="Population Size"
            value={params.populationSize}
            min={10} max={100} step={5}
            onChange={(v) => setParams({ ...params, populationSize: v })}
          />
          <ParamInput
            label="Max Generations"
            value={params.maxGenerations}
            min={5} max={50} step={5}
            onChange={(v) => setParams({ ...params, maxGenerations: v })}
          />
          <ParamInput
            label="Crossover Rate"
            value={params.crossoverRate}
            min={0.1} max={1.0} step={0.05}
            onChange={(v) => setParams({ ...params, crossoverRate: v })}
            isFloat
          />
          <ParamInput
            label="Mutation Rate"
            value={params.mutationRate}
            min={0.01} max={0.5} step={0.01}
            onChange={(v) => setParams({ ...params, mutationRate: v })}
            isFloat
          />
        </div>

        {/* Objective weights */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 16
        }}>
          <span style={{
            fontSize: "0.8rem", color: "var(--text-muted)",
            fontFamily: "var(--font-mono)", textTransform: "uppercase"
          }}>
            TRỌNG SỐ HÀM MỤC TIÊU
          </span>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24
        }}>
          <WeightSlider
            label="Ưu Tiên Học Thuật (w_priority)"
            value={params.weights.priority}
            tone="var(--amber)"
            onChange={(v) => setParams({ ...params, weights: { ...params.weights, priority: v } })}
          />
          <WeightSlider
            label="Tiết Kiệm Điện EVN (w_energy)"
            value={params.weights.energy}
            tone="var(--green)"
            onChange={(v) => setParams({ ...params, weights: { ...params.weights, energy: v } })}
          />
          <WeightSlider
            label="Công Bằng Phân Bổ (w_fairness)"
            value={params.weights.fairness}
            tone="var(--amber)"
            onChange={(v) => setParams({ ...params, weights: { ...params.weights, fairness: v } })}
          />
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "40px 22px", textAlign: "center"
        }}>
          <Loader2 size={28} style={{ color: "var(--amber)", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: "0.9rem" }}>
            Đang chạy thuật toán di truyền ({params.populationSize} cá thể × {params.maxGenerations} thế hệ)…
          </p>
        </div>
      )}

      {/* EMPTY STATE — before first run */}
      {!loading && !solverResult && !error && (
        <div style={{
          background: "var(--surface)", border: "2px dashed var(--line)",
          borderRadius: 8, padding: "40px 22px", textAlign: "center"
        }}>
          <Play size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "1rem", marginBottom: 6 }}>
            Chưa có kết quả
          </strong>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
            Chỉnh tham số ở trên rồi nhấn "Chạy Thuật Toán GA" để bắt đầu giải bài toán xếp lịch đa mục tiêu.
            Backend sẽ lấy danh sách thiết bị thật từ cơ sở dữ liệu và chạy GA solver trên đó.
          </p>
        </div>
      )}

      {/* RESULT DASHBOARD */}
      {solverResult && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* KPI CARDS */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16
          }}>
            <KpiCard
              icon={CheckCircle2}
              label="SỐ REQUEST ĐƯỢC XẾP"
              value={`${solverResult.metrics.totalRequestsScheduled}`}
              tone="var(--green)"
            />
            <KpiCard
              icon={ShieldCheck}
              label="XUNG ĐỘT (CONFLICTS)"
              value={`${solverResult.metrics.conflicts}`}
              tone={solverResult.metrics.conflicts === 0 ? "var(--green)" : "var(--red)"}
            />
            <KpiCard
              icon={Clock}
              label="THỜI GIAN GIẢI"
              value={`${solverResult.executionTimeMs} ms`}
              tone="var(--text-primary)"
            />
            <KpiCard
              icon={Zap}
              label="CHI PHÍ ĐIỆN GA"
              value={`${solverResult.metrics.energyCostVnd.toLocaleString("vi-VN")} đ`}
              tone="var(--amber)"
              note={`FIFO: ${solverResult.baselineComparison.fifoEnergyCostVnd?.toLocaleString("vi-VN") || "—"} đ`}
            />
            <KpiCard
              icon={Leaf}
              label="TIẾT KIỆM NĂNG LƯỢNG"
              value={`+${solverResult.baselineComparison.energySavedPercent}%`}
              tone="var(--green)"
              highlight
              note={`CO₂: ${solverResult.metrics.carbonKg} kg`}
            />
            <KpiCard
              icon={Leaf}
              label="SLOT XANH (OFF-PEAK)"
              value={`${solverResult.metrics.greenSlotRatioPercent}%`}
              tone="var(--green)"
            />
          </div>

          {/* FITNESS CONVERGENCE CHART */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "20px 22px"
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16
            }}>
              <TrendingUp size={18} style={{ color: "var(--amber)" }} />
              <strong style={{
                fontSize: "0.95rem", color: "var(--text-primary)",
                fontFamily: "var(--font-heading)"
              }}>
                BIỂU ĐỒ HỘI TỤ HÀM FITNESS
              </strong>
              <span style={{
                fontSize: "0.72rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", marginLeft: "auto"
              }}>
                {solverResult.generationHistory.length} thế hệ
              </span>
            </div>

            <div style={{
              height: 200, display: "flex", alignItems: "flex-end",
              gap: 2, padding: "20px 0",
              borderBottom: "1px solid var(--line)",
              borderLeft: "1px solid var(--line)"
            }}>
              {solverResult.generationHistory.map((gen, idx) => {
                const maxFitness = Math.max(
                  ...solverResult.generationHistory.map((g) => g.bestFitness)
                );
                const heightPct = maxFitness > 0
                  ? (gen.bestFitness / maxFitness) * 100
                  : 0;
                const isLast = idx === solverResult.generationHistory.length - 1;

                return (
                  <div
                    key={gen.generation}
                    title={`Gen ${gen.generation}: Best=${gen.bestFitness}, Avg=${gen.avgFitness}, Conflicts=${gen.conflicts}`}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column",
                      alignItems: "center", position: "relative"
                    }}
                  >
                    <div style={{
                      width: "80%", height: `${heightPct}%`,
                      background: isLast ? "var(--green)" : "var(--amber)",
                      borderRadius: "3px 3px 0 0", opacity: 0.8,
                      transition: "height 0.3s ease",
                      minHeight: 2
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Axis labels */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              color: "var(--text-muted)", fontSize: "0.7rem",
              marginTop: 8, fontFamily: "var(--font-mono)"
            }}>
              <span>Gen 1 (Khởi tạo ngẫu nhiên)</span>
              <span>Gen {solverResult.generationHistory.length} (Hội tụ)</span>
            </div>

            {/* Best/Avg fitness summary */}
            {solverResult.generationHistory.length > 0 && (() => {
              const last = solverResult.generationHistory[solverResult.generationHistory.length - 1];
              const first = solverResult.generationHistory[0];
              return (
                <div style={{
                  display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap",
                  fontSize: "0.78rem", color: "var(--text-secondary)"
                }}>
                  <span>
                    Best Fitness: <strong style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>{last.bestFitness}</strong>
                    {" "}(+{last.bestFitness - first.bestFitness} so với Gen 1)
                  </span>
                  <span>
                    Avg Fitness: <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{last.avgFitness}</strong>
                  </span>
                  <span>
                    Conflicts cuối: <strong style={{
                      color: last.conflicts === 0 ? "var(--green)" : "var(--red)",
                      fontFamily: "var(--font-mono)"
                    }}>{last.conflicts}</strong>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* ALLOCATION RESULTS TABLE */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "20px 22px", overflowX: "auto"
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16
            }}>
              <Server size={18} style={{ color: "var(--amber)" }} />
              <strong style={{
                fontSize: "0.95rem", color: "var(--text-primary)",
                fontFamily: "var(--font-heading)"
              }}>
                KẾT QUẢ ĐIỀU PHỐI (CHROMOSOME TỐT NHẤT)
              </strong>
              <span style={{
                fontSize: "0.72rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", marginLeft: "auto"
              }}>
                {solverResult.optimalSchedule.length} allocation
              </span>
            </div>

            {solverResult.optimalSchedule.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Không có allocation nào. Kiểm tra xem cơ sở dữ liệu có thiết bị không.
              </p>
            ) : (
              <table style={{
                width: "100%", borderCollapse: "collapse",
                fontSize: "0.82rem", textAlign: "left"
              }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid var(--line-strong)",
                    color: "var(--text-muted)", fontFamily: "var(--font-mono)"
                  }}>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>TÁC VỤ</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>VAI TRÒ</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>THIẾT BỊ</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>KHUNG GIỜ</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>CHI PHÍ</th>
                  </tr>
                </thead>
                <tbody>
                  {solverResult.optimalSchedule.map((item, idx) => {
                    const isGreen = item.isOffPeakGreen;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "10px 8px", color: "var(--text-primary)" }}>
                          {item.title}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{
                            fontSize: "0.72rem", padding: "3px 7px", borderRadius: 4,
                            background: "var(--surface-strong)",
                            border: "1px solid var(--line-strong)",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono)"
                          }}>
                            {item.userRole}
                          </span>
                        </td>
                        <td style={{
                          padding: "10px 8px", color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)", fontSize: "0.78rem"
                        }}>
                          {item.resourceCode || item.resourceName}
                        </td>
                        <td style={{
                          padding: "10px 8px",
                          color: isGreen ? "var(--green)" : "var(--amber)",
                          fontFamily: "var(--font-mono)"
                        }}>
                          {item.startHour}:00 — {item.endHour}:00 ({item.durationHours}h)
                          {isGreen && (
                            <Leaf size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />
                          )}
                        </td>
                        <td style={{
                          padding: "10px 8px", fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)", fontSize: "0.78rem"
                        }}>
                          {item.costVnd?.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Methodology note */}
          <div style={{
            background: "color-mix(in srgb, var(--amber) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
            borderRadius: 6, padding: "12px 16px", fontSize: "0.78rem",
            color: "var(--text-secondary)", display: "flex",
            alignItems: "flex-start", gap: 8
          }}>
            <Info size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: 2 }}>
                Ghi chú phương pháp
              </strong>
              Chi phí điện tính theo biểu giá EVN thực tế 3 khung: Cao điểm 3.190 đ/kWh, Bình thường 1.685 đ/kWh, Thấp điểm 1.100 đ/kWh.
              Phát thải CO₂ ước tính theo hệ số lưới điện Việt Nam ≈ 0,722 kg CO₂/kWh.
              Danh sách thiết bị và tham số ưu tiên được lấy từ database thật — kết quả GA phụ thuộc vào dữ liệu tại thời điểm chạy.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable KPI Card */
function KpiCard({ icon: Icon, label, value, tone, note, highlight }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: highlight ? `1px solid ${tone}` : "1px solid var(--line)",
      borderRadius: 8, padding: "16px 20px",
      borderLeft: `3px solid ${tone}`
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        color: "var(--text-muted)", fontSize: "0.72rem", fontFamily: "var(--font-mono)"
      }}>
        <Icon size={16} style={{ color: tone }} /> {label}
      </div>
      <div style={{
        fontSize: "1.6rem", fontWeight: 700, color: tone,
        fontFamily: "var(--font-mono)"
      }}>
        {value}
      </div>
      {note && (
        <div style={{
          fontSize: "0.72rem", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", marginTop: 4
        }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** Reusable number parameter input */
function ParamInput({ label, value, min, max, step, onChange, isFloat }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
        {label}
      </span>
      <input
        type="number"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
        style={{
          background: "var(--surface-strong)", color: "var(--text-primary)",
          border: "1px solid var(--line)", borderRadius: 6,
          padding: "8px 10px", fontSize: "0.85rem", fontFamily: "var(--font-mono)",
          width: "100%"
        }}
      />
    </label>
  );
}

/** Reusable weight slider */
function WeightSlider({ label, value, tone, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        {label}: <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</strong>
      </span>
      <input
        type="range"
        min="0" max="1" step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: tone }}
      />
    </label>
  );
}
