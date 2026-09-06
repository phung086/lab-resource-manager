import React, { useState } from "react";
import { ShieldAlert, Cpu, Wrench, Truck, CheckCircle2, AlertTriangle, Play, Sparkles, Clock, FileText, ArrowRight } from "lucide-react";
import { apiRequest } from "../api.js";

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

  async function runDiagnosis() {
    setLoading(true);
    setReport(null);
    setRemediationResult(null);
    setError("");

    try {
      // The backend route is actually mounted somewhere, we'll try /incidents/ai-diagnose based on route file comment, or /diagnostic/ai-diagnose
      // According to route file comment: `POST /incidents/ai-diagnose`
      const data = await apiRequest("/incidents/ai-diagnose", {
        method: "POST",
        body: JSON.stringify({
          presetPattern: selectedPattern,
          logSnippet,
          resourceId: undefined // Let backend pick first available
        })
      }).catch(async (e) => {
        // Fallback if route prefix is different
        return await apiRequest("/diagnostic/ai-diagnose", {
          method: "POST",
          body: JSON.stringify({ presetPattern: selectedPattern, logSnippet })
        });
      });

      if (data.success) {
        setReport(data.diagnosticReport);
      }
    } catch (err) {
      console.error("Error diagnosing log", err);
      setError("Lỗi chẩn đoán AI: " + err.message);
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
      }).catch(async () => {
        return await apiRequest("/diagnostic/auto-remediate", {
          method: "POST",
          body: JSON.stringify({
            resourceId: report.resource.id,
            partCode: report.requiredPart.partCode,
            partName: report.requiredPart.partName,
            partPriceVnd: report.requiredPart.unitPriceVnd
          })
        });
      });

      if (data.success) {
        setRemediationResult(data);
      }
    } catch (err) {
      console.error("Error running auto-remediation", err);
      setError("Lỗi tạo lệnh xuất kho: " + err.message);
    } finally {
      setRemediating(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--blue)", background: "rgba(59, 130, 246, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
              AI DIAGNOSTIC & LOGISTICS
            </span>
          </div>
          <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
            Chẩn Đoán Sự Cố AI & Tự Động Kích Hoạt Vận Đơn (Auto-Remediation)
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Phân tích Root Cause (RCA) từ logs thiết bị, tính toán tỷ lệ hỏng hóc MTBF, và tự động gọi API Logistics đặt linh kiện thay thế.
          </p>
        </div>

        <button className="btn btn-primary" onClick={runDiagnosis} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--blue)", color: "#fff", fontWeight: 700, padding: "10px 20px" }}>
          {loading ? <Sparkles size={16} className="spin" /> : <Play size={16} />}
          <span>{loading ? "AI Đang Phân Tích..." : "Chạy AI Diagnostic"}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(193, 80, 63, 0.1)", border: "1px solid var(--red)", borderRadius: 6, padding: "12px 16px", color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* INPUT PANEL */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <FileText size={18} style={{ color: "var(--blue)" }} />
          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            RAW TELEMETRY / KERNEL LOGS
          </strong>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <select
            value={selectedPattern}
            onChange={(e) => {
              setSelectedPattern(e.target.value);
              setLogSnippet(patterns.find(p => p.id === e.target.value)?.snippet || "");
              setReport(null);
              setRemediationResult(null);
            }}
            style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none", fontFamily: "var(--font-heading)", fontSize: "0.9rem" }}
          >
            {patterns.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <textarea
            value={logSnippet}
            onChange={(e) => setLogSnippet(e.target.value)}
            rows={4}
            style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--cyan)", padding: "12px 14px", borderRadius: 6, outline: "none", fontFamily: "var(--font-mono)", fontSize: "0.85rem", resize: "vertical" }}
            spellCheck="false"
          />
        </div>
      </div>

      {/* AI DIAGNOSTIC REPORT */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* RCA PANEL */}
          <div style={{ background: "var(--surface)", border: `1px solid ${report.severity === 'critical' ? 'var(--red)' : 'var(--amber)'}`, borderRadius: 8, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: report.severity === 'critical' ? 'rgba(193, 80, 63, 0.03)' : 'rgba(227, 162, 60, 0.03)', pointerEvents: "none" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12, position: "relative", zIndex: 1 }}>
              <ShieldAlert size={18} style={{ color: report.severity === 'critical' ? 'var(--red)' : 'var(--amber)' }} />
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                PHÂN TÍCH NGUYÊN NHÂN GỐC (ROOT CAUSE ANALYSIS)
              </strong>
            </div>

            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Thiết Bị Gặp Sự Cố</span>
                <div style={{ fontSize: "1.05rem", color: "var(--cyan)", fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: 4 }}>
                  {report.resource.code} - {report.resource.name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Chẩn Đoán Kỹ Thuật</span>
                <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: 4, lineHeight: 1.5 }}>
                  {report.rootCause}
                </div>
              </div>

              <div style={{ background: "var(--surface-strong)", padding: 12, borderRadius: 6, border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Khuyến Nghị Khắc Phục (Action Plan)</span>
                <div style={{ fontSize: "0.9rem", color: "var(--green)", marginTop: 4, fontWeight: 500 }}>
                  {report.recommendedAction}
                </div>
              </div>
            </div>
          </div>

          {/* METRICS & LOGISTICS PANEL */}
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>
            {/* RELIABILITY METRICS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                  <Clock size={14} /> MTBF (GIỜ HOẠT ĐỘNG LIÊN TỤC)
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {report.metrics.mtbfHours} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>h</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: 4 }}>Nguy cơ hỏng: {report.metrics.failureProbability24hPercent}% trong 24h</div>
              </div>

              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                  <Wrench size={14} /> MTTR (TỐC ĐỘ PHỤC HỒI)
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--blue)", fontFamily: "var(--font-mono)" }}>
                  {report.metrics.mttrMinutes} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>min</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>Thời gian Downtime ước tính</div>
              </div>
            </div>

            {/* AUTO-REMEDIATION / SUPPLY CHAIN */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 20, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                <Truck size={18} style={{ color: "var(--green)" }} />
                <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  CHUỖI CUNG ỨNG & VẬN ĐƠN (SUPPLY CHAIN)
                </strong>
              </div>

              {!remediationResult ? (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                    Hệ thống xác định cần thay thế linh kiện: 
                    <strong style={{ color: "var(--text-primary)", display: "block", marginTop: 4 }}>{report.requiredPart.partName} ({report.requiredPart.partCode})</strong>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>Đơn giá: {report.requiredPart.unitPriceVnd.toLocaleString()} VND (Sẵn hàng - Giao {report.requiredPart.leadTimeDays} ngày)</div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={runAutoRemediation} 
                    disabled={remediating}
                    style={{ width: "100%", background: "var(--green)", color: "#14161A", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
                  >
                    {remediating ? <RefreshCw size={16} className="spin" /> : <ArrowRight size={16} />}
                    <span>{remediating ? "Đang gọi API Giao Hàng Nhanh..." : "Kích Hoạt Auto-Remediation (Đặt Hàng)"}</span>
                  </button>
                </>
              ) : (
                <div style={{ background: "rgba(95, 167, 119, 0.1)", border: "1px solid var(--green)", borderRadius: 6, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", marginBottom: 12, fontWeight: 700 }}>
                    <CheckCircle2 size={20} />
                    <span>ĐÃ TẠO VẬN ĐƠN LOGISTICS THÀNH CÔNG</span>
                  </div>
                  
                  <div style={{ display: "grid", gap: 8, fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Mã Vận Đơn:</span>
                      <strong>{remediationResult.shipmentOrder.trackingCode}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Nhà Cung Cấp:</span>
                      <strong>{remediationResult.shipmentOrder.provider}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Dự Kiến Giao:</span>
                      <strong>{new Date(remediationResult.shipmentOrder.estimatedDelivery).toLocaleDateString('vi-VN')}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Ticket Ghi Nhận:</span>
                      <strong style={{ color: "var(--cyan)" }}>{remediationResult.incidentLog.id.split("-")[0]}...</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
