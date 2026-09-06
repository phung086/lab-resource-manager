import React, { useState } from "react";
import {
  ShieldCheck, Play, RefreshCw, Activity, Lock,
  AlertTriangle, CheckCircle2, Loader2, WifiOff, Info, Server
} from "lucide-react";
import { apiRequest } from "../api.js";

/**
 * ConcurrencyStressMonitor — Giám sát kiểm thử tranh chấp & toàn vẹn dữ liệu
 *
 * Dữ liệu: POST /simulation/concurrency-stress
 * Gửi: { concurrencyLevel, multiResourceCount, nodeCount }
 * Trả về: singleResource + multiResource benchmark results
 */

export function ConcurrencyStressMonitor() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    concurrencyLevel: 250,
    multiResourceCount: 500,
    nodeCount: 20
  });

  async function triggerStressTest() {
    setRunning(true);
    setError(null);
    try {
      const data = await apiRequest("/simulation/concurrency-stress", {
        method: "POST",
        body: JSON.stringify(params)
      });
      if (data.success) {
        setResult(data);
      } else {
        setError("API trả về kết quả không thành công.");
      }
    } catch (err) {
      setError(err.message || "Không thể kết nối backend để chạy stress test.");
    } finally {
      setRunning(false);
    }
  }

  const sr = result?.singleResource;
  const mr = result?.multiResource;

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "18px 22px"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--green)",
                background: "color-mix(in srgb, var(--green) 12%, transparent)",
                padding: "2px 8px", borderRadius: 4,
                border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)"
              }}>
                GIST EXCLUSION CONSTRAINT
              </span>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--text-muted)"
              }}>
                ROW-LEVEL LOCKING
              </span>
            </div>
            <h2 style={{
              fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-heading)", margin: "6px 0 2px 0"
            }}>
              Giám Sát Kiểm Thử Tranh Chấp &amp; Toàn Vẹn Dữ Liệu
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Chạy stress test thật trên engine tranh chấp: kiểm tra GiST Exclusion Constraint chống Double-booking dưới tải đồng thời cao.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Concurrency param */}
            <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{
                fontSize: "0.65rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", textTransform: "uppercase"
              }}>Workers</span>
              <input
                type="number" min={10} max={500} step={10}
                value={params.concurrencyLevel}
                onChange={(e) => setParams({ ...params, concurrencyLevel: parseInt(e.target.value, 10) || 250 })}
                style={{
                  width: 80, background: "var(--surface-strong)", color: "var(--text-primary)",
                  border: "1px solid var(--line)", borderRadius: 4,
                  padding: "5px 8px", fontSize: "0.82rem", fontFamily: "var(--font-mono)"
                }}
              />
            </label>
            <button
              type="button"
              onClick={triggerStressTest}
              disabled={running}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.82rem", padding: "10px 18px",
                fontFamily: "var(--font-mono)",
                background: "var(--amber)", color: "var(--bg)",
                fontWeight: 700, border: "none", borderRadius: 6,
                cursor: running ? "wait" : "pointer",
                opacity: running ? 0.6 : 1
              }}
            >
              {running ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              <span>{running ? "Đang chạy..." : "Kích Hoạt Stress-Test"}</span>
            </button>
          </div>
        </div>
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
            <strong style={{ display: "block", marginBottom: 2 }}>Lỗi khi chạy stress test</strong>
            {error}
          </div>
        </div>
      )}

      {/* LOADING */}
      {running && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "40px 22px", textAlign: "center"
        }}>
          <Loader2 size={28} style={{ color: "var(--amber)", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: "0.9rem" }}>
            Đang bắn {params.concurrencyLevel} requests đồng thời vào engine tranh chấp…
          </p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!running && !result && !error && (
        <div style={{
          background: "var(--surface)", border: "2px dashed var(--line)",
          borderRadius: 8, padding: "40px 22px", textAlign: "center"
        }}>
          <ShieldCheck size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <strong style={{
            color: "var(--text-primary)", display: "block",
            fontSize: "1rem", marginBottom: 6
          }}>
            Chưa có kết quả
          </strong>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
            Nhấn "Kích Hoạt Stress-Test" để chạy benchmark tranh chấp thật trên backend.
            Engine sẽ mô phỏng {params.concurrencyLevel} workers đồng thời tranh chấp 1 slot GPU,
            và {params.multiResourceCount} requests trên {params.nodeCount} node.
          </p>
        </div>
      )}

      {/* RESULTS */}
      {!running && result && sr && mr && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* ── SINGLE RESOURCE TEST ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "320px 1fr",
            gap: 16
          }}>
            {/* Donut Gauge */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: 8, padding: "20px 22px", textAlign: "center"
            }}>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--text-muted)", display: "block", marginBottom: 12
              }}>
                SINGLE-RESOURCE HOTSPOT ({sr.concurrencyLevel} WORKERS)
              </span>

              <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto" }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="var(--line)" strokeWidth="14" />
                  {/* Rejected arc */}
                  {sr.concurrencyLevel > 0 && (
                    <circle
                      cx="80" cy="80" r="60" fill="none"
                      stroke="var(--amber)" strokeWidth="14"
                      strokeDasharray={`${(sr.rejectedConflicts / sr.concurrencyLevel) * 377} 377`}
                      strokeDashoffset="0" strokeLinecap="round"
                      style={{ transition: "all 0.8s ease-out" }}
                    />
                  )}
                  {/* Accepted arc */}
                  {sr.successfulBookings > 0 && (
                    <circle
                      cx="80" cy="80" r="60" fill="none"
                      stroke="var(--green)" strokeWidth="14"
                      strokeDasharray={`${(sr.successfulBookings / sr.concurrencyLevel) * 377} 377`}
                      strokeDashoffset={`-${(sr.rejectedConflicts / sr.concurrencyLevel) * 377}`}
                      strokeLinecap="round"
                      style={{ transition: "all 0.8s ease-out" }}
                    />
                  )}
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center"
                }}>
                  <strong style={{
                    fontSize: "1.8rem", color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)", lineHeight: 1
                  }}>
                    {sr.concurrencyLevel}
                  </strong>
                  <span style={{
                    fontSize: "0.65rem", color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)"
                  }}>REQUESTS</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, padding: "0 8px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    color: "var(--amber)", fontSize: "0.78rem", marginBottom: 4
                  }}>
                    <AlertTriangle size={13} /> Từ chối
                  </div>
                  <strong style={{
                    fontSize: "1.1rem", color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)"
                  }}>{sr.rejectedConflicts}</strong>
                </div>
                <div style={{ width: 1, background: "var(--line)", height: 36 }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    color: "var(--green)", fontSize: "0.78rem", marginBottom: 4
                  }}>
                    <CheckCircle2 size={13} /> Chấp nhận
                  </div>
                  <strong style={{
                    fontSize: "1.1rem", color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)"
                  }}>{sr.successfulBookings}</strong>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <MetricCard
                icon={ShieldCheck}
                label="DOUBLE-BOOKING"
                value={`${sr.duplicateAnomalies}`}
                tone={sr.isolationGuaranteed ? "var(--green)" : "var(--red)"}
                note={sr.isolationGuaranteed
                  ? "GiST Exclusion: 0 trùng lặp"
                  : `${sr.duplicateAnomalies} anomaly detected!`
                }
              />
              <MetricCard
                icon={Activity}
                label="THROUGHPUT"
                value={`${sr.throughputReqSec.toLocaleString("vi-VN")}`}
                tone="var(--text-primary)"
                note="requests / second"
              />
              <div style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: 8, padding: "16px 20px", gridColumn: "1 / -1"
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 12
                }}>
                  <Lock size={14} style={{ color: "var(--amber)" }} />
                  <span style={{
                    fontSize: "0.8rem", color: "var(--text-primary)",
                    fontWeight: 700, fontFamily: "var(--font-mono)"
                  }}>LATENCY PERCENTILES</span>
                </div>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  {[
                    { label: "p50", value: sr.latencies?.p50Ms },
                    { label: "p95", value: sr.latencies?.p95Ms },
                    { label: "p99", value: sr.latencies?.p99Ms },
                    { label: "max", value: sr.latencies?.maxMs }
                  ].map((p) => (
                    <div key={p.label}>
                      <div style={{
                        fontSize: "0.72rem", color: "var(--text-muted)",
                        marginBottom: 4, fontFamily: "var(--font-mono)"
                      }}>{p.label}</div>
                      <strong style={{
                        fontSize: "1.2rem",
                        color: p.label === "p99" || p.label === "max" ? "var(--amber)" : "var(--text-primary)",
                        fontFamily: "var(--font-mono)"
                      }}>
                        {p.value ?? "—"} <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ms</span>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── MULTI RESOURCE TEST ── */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "20px 22px"
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
                MULTI-RESOURCE DISTRIBUTED TEST
              </strong>
              <span style={{
                fontSize: "0.72rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", marginLeft: "auto"
              }}>
                {mr.totalRequests} reqs × {mr.targetResources} nodes
              </span>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16
            }}>
              <MetricCard
                icon={CheckCircle2}
                label="THÀNH CÔNG"
                value={`${mr.successfulBookings}`}
                tone="var(--green)"
              />
              <MetricCard
                icon={AlertTriangle}
                label="TỪ CHỐI (CONFLICT)"
                value={`${mr.rejectedConflicts}`}
                tone="var(--amber)"
              />
              <MetricCard
                icon={ShieldCheck}
                label="DOUBLE-BOOKING"
                value={`${mr.duplicateAnomalies}`}
                tone={mr.duplicateAnomalies === 0 ? "var(--green)" : "var(--red)"}
              />
              <MetricCard
                icon={Activity}
                label="THROUGHPUT"
                value={`${mr.throughputReqSec?.toLocaleString("vi-VN") || "—"}`}
                tone="var(--text-primary)"
                note="req/s"
              />
              <MetricCard
                icon={Lock}
                label="p95 LATENCY"
                value={`${mr.latencies?.p95Ms ?? "—"} ms`}
                tone="var(--text-primary)"
              />
              <MetricCard
                icon={Lock}
                label="p99 LATENCY"
                value={`${mr.latencies?.p99Ms ?? "—"} ms`}
                tone="var(--amber)"
              />
            </div>
          </div>

          {/* Execution info */}
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
              Benchmark chạy trong bộ nhớ Node.js với mô phỏng Row-Level Locking và GiST Exclusion Constraint
              (kiểm tra trùng lặp bán khoảng [start, end)). Đây KHÔNG phải benchmark trên PostgreSQL production thật,
              nhưng logic tranh chấp tương đương — kết quả cho thấy thuật toán đảm bảo chính xác 1 booking thắng
              trên cùng 1 slot. Throughput và latency phụ thuộc vào hardware chạy backend tại thời điểm test.
              <br />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                Thời gian chạy: {result.timestamp ? new Date(result.timestamp).toLocaleString("vi-VN") : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable metric card */
function MetricCard({ icon: Icon, label, value, tone, note }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 8, padding: "16px 20px",
      borderLeft: `3px solid ${tone}`
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        color: "var(--text-muted)", fontSize: "0.72rem", fontFamily: "var(--font-mono)"
      }}>
        <Icon size={14} style={{ color: tone }} /> {label}
      </div>
      <div style={{
        fontSize: "1.6rem", fontWeight: 700, color: tone,
        fontFamily: "var(--font-mono)"
      }}>
        {value}
      </div>
      {note && (
        <span style={{
          fontSize: "0.72rem", color: "var(--text-secondary)",
          marginTop: 4, display: "block"
        }}>
          {note}
        </span>
      )}
    </div>
  );
}
