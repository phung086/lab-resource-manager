import React, { useState } from "react";
import { ShieldAlert, Cpu, Wrench, Truck, CheckCircle2, AlertTriangle, Play, Sparkles, Clock, FileText, ArrowRight } from "lucide-react";

export function AiDiagnosticStudio() {
  const [selectedPattern, setSelectedPattern] = useState("cuda_oom_crash");
  const [logSnippet, setLogSnippet] = useState(
    "[KERNEL ERROR 0x7FA9B0]: GPU 0 CUDA Exception: memory allocation failed on device. Host fallback timeout after 3000ms. ECC uncorrectable single-bit error detected on HBM3 bank 4."
  );

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [remediating, setRemediating] = useState(false);
  const [remediationResult, setRemediationResult] = useState(null);

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

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

    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/diagnostic/ai-diagnose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          presetPattern: selectedPattern,
          logSnippet
        })
      });

      const data = await res.json();
      if (data.success) {
        setReport(data.diagnosticReport);
      }
    } catch (err) {
      console.error("Error diagnosing log", err);
    } finally {
      setLoading(false);
    }
  }

  async function runAutoRemediation() {
    if (!report) return;
    setRemediating(true);

    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/diagnostic/auto-remediate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          resourceId: report.resource.id,
          partCode: report.requiredPart.partCode,
          partName: report.requiredPart.partName,
          partPriceVnd: report.requiredPart.unitPriceVnd
        })
      });

      const data = await res.json();
      if (data.success) {
        setRemediationResult(data);
      }
    } catch (err) {
      console.error("Error running auto-remediation", err);
    } finally {
      setRemediating(false);
    }
  }

  return (
    <div className="content-stack">
      {/* HEADER */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge amber">Agentic Incident Workflow</span>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Chẩn Đoán Sự Cố AI & Tự Động Hóa Chuỗi Cung Ứng (Root Cause Analysis & Logistics)</h2>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Trợ lý AI tự động phân tích mã lỗi Kernel/Hardware, tính toán chỉ số độ tin cậy MTBF và tự động kích hoạt bảo trì & giao vận GHN
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        {/* INPUT LOG & PATTERN SELECTOR */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} className="text-primary" />
              <strong>Nhập Nhật Ký Lỗi Máy Chủ (Crash Log Input)</strong>
            </div>
          </div>

          <div className="form-stack" style={{ gap: 12, marginTop: 14 }}>
            <label>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Chọn Mẫu Sự Cố Thực Tế Để Test:</span>
              <select
                value={selectedPattern}
                onChange={(e) => {
                  setSelectedPattern(e.target.value);
                  const p = patterns.find((item) => item.id === e.target.value);
                  if (p) setLogSnippet(p.snippet);
                }}
              >
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Nội dung Log Snippet (Stacktrace / Sensor Dmesg):</span>
              <textarea
                rows={5}
                value={logSnippet}
                onChange={(e) => setLogSnippet(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "0.8rem", background: "rgba(0,0,0,0.02)" }}
              />
            </label>

            <button
              className="btn btn-primary"
              onClick={runDiagnosis}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}
            >
              <Sparkles size={16} />
              <span>{loading ? "AI đang phân tích Root Cause..." : "Phân Tích Nguyên Nhân Sự Cố (RCA)"}</span>
            </button>
          </div>
        </div>

        {/* AI DIAGNOSTIC REPORT */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={18} className="text-primary" />
              <strong>Báo Cáo Phân Tích Kỹ Thuật (Autonomous RCA Report)</strong>
            </div>
            {report && <span className={`badge ${report.severity === "critical" ? "danger" : "amber"}`}>{report.severity.toUpperCase()}</span>}
          </div>

          {report ? (
            <div className="form-stack" style={{ gap: 14, marginTop: 14 }}>
              {/* TARGET & CATEGORY */}
              <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "10px 14px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Thiết Bị Chẩn Đoán</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                  {report.resource.name} ({report.resource.code})
                </div>
                <div style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, fontWeight: 600 }}>
                  Phân Loại Lỗi: {report.category}
                </div>
              </div>

              {/* ROOT CAUSE DESCRIPTION */}
              <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                <strong style={{ color: "#334155" }}>Nguyên Nhân Cốt Lõi (Root Cause):</strong>
                <p style={{ margin: "4px 0 0 0", color: "#475569" }}>{report.rootCause}</p>
              </div>

              {/* RELIABILITY ENGINEERING METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(0,0,0,0.02)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Chỉ Số MTBF</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>{report.metrics.mtbfHours} h</div>
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Thời gian giữa 2 sự cố</span>
                </div>

                <div style={{ background: "rgba(0,0,0,0.02)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Chỉ Số MTTR</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>{report.metrics.mttrMinutes} min</div>
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Thời gian sửa chữa</span>
                </div>

                <div style={{ background: "rgba(0,0,0,0.02)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Độ Tin Cậy 24h</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669", marginTop: 2 }}>{report.metrics.reliabilityScorePercent} %</div>
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Xác suất vận hành tốt</span>
                </div>
              </div>

              {/* RECOMMENDED PART REPLACEMENT */}
              <div style={{ border: "1px dashed #cbd5e1", padding: 12, borderRadius: 8, background: "#fafafa" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Linh Kiện Cần Thay Thế Đề Xuất:</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{report.requiredPart.partName}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Mã: {report.requiredPart.partCode} | Lead time: {report.requiredPart.leadTimeDays} ngày</div>
                  </div>
                  <span className="badge info" style={{ fontSize: "0.85rem" }}>
                    {report.requiredPart.unitPriceVnd.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* AUTONOMOUS REMEDIATION ACTION BUTTON */}
              {!remediationResult ? (
                <button
                  className="btn btn-success"
                  onClick={runAutoRemediation}
                  disabled={remediating}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}
                >
                  <Wrench size={16} />
                  <span>{remediating ? "Đang tạo lịch bảo trì & lệnh GHN..." : "Kích Hoạt Bảo Trì Tự Động & Đặt Linh Kiện GHN"}</span>
                </button>
              ) : (
                <div className="alert success" style={{ fontSize: "0.85rem" }}>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Tự Động Hóa Hoàn Tất:</strong>
                    <div>- Đã tạo Lịch bảo trì: #{remediationResult.maintenanceWindow.id.slice(0, 8)}</div>
                    <div>- Đã tạo Vận đơn GHN: #{remediationResult.ghnShipment.trackingCode} (Dự kiến giao trong 24h)</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="empty-state">Bấm "Phân Tích Nguyên Nhân Sự Cố" để AI thực hiện phân tích chuyên sâu</p>
          )}
        </div>
      </div>
    </div>
  );
}
