import React, { useState } from "react";
import {
  ShieldAlert, Cpu, Wrench, Truck, CheckCircle2, AlertTriangle,
  Play, Sparkles, Clock, FileText, ArrowRight, RefreshCw,
  WifiOff, Loader2, Info
} from "lucide-react";
import { apiRequest } from "../api.js";

/**
 * AiDiagnosticStudio — Chẩn đoán sự cố AI & tự động kích hoạt vận đơn
 *
 * Dữ liệu: POST /incidents/ai-diagnose (RCA + MTBF + linh kiện)
 *          POST /incidents/auto-remediate (tạo maintenance + GHN order)
 */

export function AiDiagnosticStudio() {
  const [selectedPattern, setSelectedPattern] = useState("cuda_oom_crash");
  const [logSnippet, setLogSnippet] = useState(
    "[KERNEL ERROR 0x7FA9B0]: GPU 0 CUDA Exception: memory allocation failed on device. Host fallback timeout after 3000ms. ECC uncorrectable single-bit error detected on HBM3 bank 4."
  );

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [remediating, setRemediating] = useState(false);
  const [remediationResult, setRemediationResult] = useState(null);
  const [error, setError] = useState("");

  const patterns = [
    {
      id: "cuda_oom_crash",
      title: "Tràn Bộ Nhớ VRAM GPU & Lỗi ECC (CUDA Memory Corruption)",
      snippet: "[KERNEL ERROR 0x7FA9B0]: GPU 0 CUDA Exception: memory allocation failed on device. Host fallback timeout after 3000ms. ECC uncorrectable single-bit error detected on HBM3 bank 4."
    },
    {
      id: "fan_bearing_stall",
      title: "Quạt Tản Nhiệt Server Kẹt Rung Chấn (Fan Mechanical Stall)",
      snippet: "[SENSOR ALERT]: IPMI Fan Header 3 RPM dropped from 4800 to 0 RPM. Vibration sensor reads 2.45 mm/s (THRESHOLD: 0.50 mm/s). Thermal junction temp spiking at 91.2C."
    },
    {
      id: "uav_esc_desync",
      title: "Mất Đồng Bộ Tín Hiệu Điều Tốc Drone (UAV ESC Desync)",
      snippet: "[AVIONICS WARNING]: ESC Motor 3 DShot telemetry packet drop rate > 35%. Gyroscope IMU z-axis angular deviation exceeds 15 deg/s. Return-to-home fail-safe activated."
    }
  ];

  function getSeverityTone(severity) {
    if (severity === "critical" || severity === "high") return "var(--red)";
    if (severity === "medium") return "var(--amber)";
    return "var(--green)";
  }

  async function runDiagnosis() {
    setLoading(true);
    setReport(null);
    setRemediationResult(null);
    setError("");

    try {
      const data = await apiRequest("/incidents/ai-diagnose", {
        method: "POST",
        body: JSON.stringify({
          presetPattern: selectedPattern,
          logSnippet,
          resourceId: undefined
        })
      });

      if (data.success) {
        setReport(data.diagnosticReport);
      } else {
        setError("API trả về kết quả không thành công.");
      }
    } catch (err) {
      setError("Lỗi chẩn đoán: " + (err.message || "Không thể kết nối backend"));
    } finally {
      setLoading(false);
    }
  }

  async function runAutoRemediation() {
    if (!report) return;
    setRemediating(true);
    setError("");

    try {
      const data = await apiRequest("/incidents/auto-remediate", {
        method: "POST",
        body: JSON.stringify({
          resourceId: report.resource.id,
          partCode: report.requiredPart.partCode,
          partName: report.requiredPart.partName,
          partPriceVnd: report.requiredPart.unitPriceVnd
        })
      });

      if (data.success) {
        setRemediationResult(data);
      } else {
        setError("Không thể tạo vận đơn.");
      }
    } catch (err) {
      setError("Lỗi tạo lệnh xuất kho: " + (err.message || "Không rõ nguyên nhân"));
    } finally {
      setRemediating(false);
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
              RCA ENGINE
            </span>
          </div>
          <h2 style={{
            margin: "6px 0 2px 0", fontSize: "1.3rem",
            color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700
          }}>
            Chẩn Đoán Sự Cố &amp; Tự Động Kích Hoạt Vận Đơn
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Phân tích Root Cause (RCA) từ logs thiết bị, tính toán MTBF / MTTR, và tự động gọi API Logistics đặt linh kiện thay thế.
          </p>
        </div>

        <button
          type="button"
          onClick={runDiagnosis}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--amber)", color: "var(--bg)",
            fontWeight: 700, padding: "10px 20px", border: "none",
            borderRadius: 6, cursor: loading ? "wait" : "pointer",
            fontSize: "0.85rem", fontFamily: "var(--font-heading)"
          }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          <span>{loading ? "Đang phân tích..." : "Chạy Chẩn Đoán"}</span>
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
          <span>{error}</span>
        </div>
      )}

      {/* INPUT PANEL */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "20px 22px"
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12
        }}>
          <FileText size={18} style={{ color: "var(--amber)" }} />
          <strong style={{
            fontSize: "0.95rem", color: "var(--text-primary)",
            fontFamily: "var(--font-heading)"
          }}>
            RAW TELEMETRY / KERNEL LOGS
          </strong>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <select
            value={selectedPattern}
            onChange={(e) => {
              setSelectedPattern(e.target.value);
              setLogSnippet(patterns.find((p) => p.id === e.target.value)?.snippet || "");
              setReport(null);
              setRemediationResult(null);
            }}
            style={{
              width: "100%", background: "var(--surface-strong)",
              border: "1px solid var(--line)", color: "var(--text-primary)",
              padding: "10px 14px", borderRadius: 6, outline: "none",
              fontFamily: "var(--font-heading)", fontSize: "0.9rem"
            }}
          >
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <textarea
            value={logSnippet}
            onChange={(e) => setLogSnippet(e.target.value)}
            rows={4}
            style={{
              width: "100%", background: "var(--surface-strong)",
              border: "1px solid var(--line)", color: "var(--amber)",
              padding: "12px 14px", borderRadius: 6, outline: "none",
              fontFamily: "var(--font-mono)", fontSize: "0.85rem", resize: "vertical"
            }}
            spellCheck="false"
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
            Đang phân tích log qua RCA Knowledge Base…
          </p>
        </div>
      )}

      {/* AI DIAGNOSTIC REPORT */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* RCA PANEL */}
          <div style={{
            background: "var(--surface)",
            border: `1px solid ${getSeverityTone(report.severity)}`,
            borderRadius: 8, padding: "20px 22px"
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12
            }}>
              <ShieldAlert size={18} style={{ color: getSeverityTone(report.severity) }} />
              <strong style={{
                fontSize: "0.95rem", color: "var(--text-primary)",
                fontFamily: "var(--font-heading)"
              }}>
                PHÂN TÍCH NGUYÊN NHÂN GỐC (RCA)
              </strong>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <span style={{
                  fontSize: "0.72rem", color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)", textTransform: "uppercase"
                }}>Thiết bị gặp sự cố</span>
                <div style={{
                  fontSize: "1.05rem", color: "var(--amber)",
                  fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: 4
                }}>
                  {report.resource.code} — {report.resource.name}
                </div>
              </div>

              <div>
                <span style={{
                  fontSize: "0.72rem", color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)", textTransform: "uppercase"
                }}>Chẩn đoán kỹ thuật</span>
                <div style={{
                  fontSize: "0.9rem", color: "var(--text-primary)",
                  marginTop: 4, lineHeight: 1.5
                }}>
                  {report.rootCause}
                </div>
              </div>

              <div style={{
                background: "var(--surface-strong)", padding: 12,
                borderRadius: 6, border: "1px solid var(--line)",
                borderLeft: "3px solid var(--green)"
              }}>
                <span style={{
                  fontSize: "0.72rem", color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)", textTransform: "uppercase"
                }}>Khuyến nghị khắc phục</span>
                <div style={{
                  fontSize: "0.9rem", color: "var(--green)",
                  marginTop: 4, fontWeight: 500
                }}>
                  {report.recommendedAction}
                </div>
              </div>

              {/* Severity badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                  color: getSeverityTone(report.severity),
                  background: `color-mix(in srgb, ${getSeverityTone(report.severity)} 12%, transparent)`,
                  padding: "3px 8px", borderRadius: 4,
                  border: `1px solid color-mix(in srgb, ${getSeverityTone(report.severity)} 25%, transparent)`
                }}>
                  {report.severity?.toUpperCase()}
                </span>
                <span style={{
                  fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)"
                }}>
                  {report.category}
                </span>
              </div>
            </div>
          </div>

          {/* METRICS & LOGISTICS PANEL */}
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>
            {/* RELIABILITY METRICS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MetricCard
                icon={Clock}
                label="MTBF (GIỜ HOẠT ĐỘNG)"
                value={`${report.metrics.mtbfHours}`}
                unit="h"
                tone="var(--text-primary)"
                note={`Nguy cơ hỏng: ${report.metrics.failureProbability24hPercent}% / 24h`}
                noteTone="var(--red)"
              />
              <MetricCard
                icon={Wrench}
                label="MTTR (PHỤC HỒI)"
                value={`${report.metrics.mttrMinutes}`}
                unit="min"
                tone="var(--amber)"
                note="Thời gian downtime ước tính"
              />
            </div>

            {/* AUTO-REMEDIATION / SUPPLY CHAIN */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              padding: 20, borderRadius: 8
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12
              }}>
                <Truck size={18} style={{ color: "var(--green)" }} />
                <strong style={{
                  fontSize: "0.95rem", color: "var(--text-primary)",
                  fontFamily: "var(--font-heading)"
                }}>
                  CHUỖI CUNG ỨNG &amp; VẬN ĐƠN
                </strong>
              </div>

              {!remediationResult ? (
                <>
                  <div style={{
                    fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16
                  }}>
                    Hệ thống xác định cần thay thế linh kiện:
                    <strong style={{
                      color: "var(--text-primary)", display: "block", marginTop: 4
                    }}>
                      {report.requiredPart.partName} ({report.requiredPart.partCode})
                    </strong>
                    <div style={{
                      marginTop: 4, fontFamily: "var(--font-mono)",
                      color: "var(--amber)", fontSize: "0.82rem"
                    }}>
                      Đơn giá: {report.requiredPart.unitPriceVnd.toLocaleString("vi-VN")} VND
                      — Giao {report.requiredPart.leadTimeDays} ngày
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runAutoRemediation}
                    disabled={remediating}
                    style={{
                      width: "100%", background: "var(--green)",
                      color: "var(--bg)", fontWeight: 700,
                      display: "flex", justifyContent: "center",
                      alignItems: "center", gap: 8,
                      padding: "10px 16px", border: "none",
                      borderRadius: 6, cursor: remediating ? "wait" : "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    {remediating ? <RefreshCw size={16} className="spin" /> : <ArrowRight size={16} />}
                    <span>{remediating ? "Đang gọi API GHN..." : "Kích Hoạt Auto-Remediation"}</span>
                  </button>
                </>
              ) : (
                <div style={{
                  background: "color-mix(in srgb, var(--green) 10%, transparent)",
                  border: "1px solid var(--green)", borderRadius: 6, padding: 16
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    color: "var(--green)", marginBottom: 12, fontWeight: 700
                  }}>
                    <CheckCircle2 size={20} />
                    <span>ĐÃ TẠO VẬN ĐƠN LOGISTICS THÀNH CÔNG</span>
                  </div>

                  <div style={{
                    display: "grid", gap: 8, fontSize: "0.85rem",
                    fontFamily: "var(--font-mono)", color: "var(--text-primary)"
                  }}>
                    {remediationResult.ghnShipment && (
                      <>
                        <InfoRow label="Mã Vận Đơn" value={remediationResult.ghnShipment.trackingCode} />
                        <InfoRow label="Nhà Cung Cấp" value={remediationResult.ghnShipment.provider} />
                        <InfoRow
                          label="Dự Kiến Giao"
                          value={new Date(remediationResult.ghnShipment.estimatedDelivery).toLocaleDateString("vi-VN")}
                        />
                      </>
                    )}
                    {remediationResult.maintenanceWindow && (
                      <InfoRow
                        label="Lịch Bảo Trì"
                        value={remediationResult.maintenanceWindow.id?.slice(0, 8) + "..."}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Methodology note */}
      {report && (
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
              Ghi chú
            </strong>
            Chẩn đoán dựa trên Knowledge Base nội bộ (3 mẫu sự cố preset), không phải mô hình AI tạo sinh.
            MTBF/MTTR là giá trị tham chiếu kỹ thuật từ hồ sơ thiết bị, không phải đo thực tế trên lab.
            Vận đơn GHN sử dụng API sandbox (mock) — không tạo đơn thật nếu môi trường là development.
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable metric card */
function MetricCard({ icon: Icon, label, value, unit, tone, note, noteTone }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      padding: 16, borderRadius: 8, borderLeft: `3px solid ${tone}`
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
        color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)"
      }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{
        fontSize: "1.8rem", fontWeight: 700, color: tone,
        fontFamily: "var(--font-mono)"
      }}>
        {value} {unit && <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{unit}</span>}
      </div>
      {note && (
        <div style={{
          fontSize: "0.75rem", color: noteTone || "var(--text-secondary)", marginTop: 4
        }}>{note}</div>
      )}
    </div>
  );
}

/** Reusable info row for key-value display */
function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>
      <strong style={{ color: "var(--text-primary)" }}>{value}</strong>
    </div>
  );
}
