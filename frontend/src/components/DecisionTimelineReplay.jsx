import React, { useState } from "react";
import { Play, Pause, RotateCcw, AlertTriangle, ArrowRight, ShieldCheck, Cpu, Database, CheckCircle2, ChevronRight } from "lucide-react";

export function DecisionTimelineReplay() {
  const [activeStep, setActiveStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const timelineEvents = [
    {
      id: "ev-0",
      time: "T0 [00:00.0s]",
      title: "SỰ CỐ QUÁ NHIỆT (THERMAL ANOMALY DETECTED)",
      trigger: "GPU-H100-01 nhiệt độ vượt ngưỡng 86.8°C",
      consequence: "Kích hoạt cờ cảnh báo cấp độ CRITICAL trên telemetry stream",
      tone: "red",
      details: {
        resource: "GPU-H100-01",
        metric: "Temperature: 86.8°C (Ngưỡng an toàn <= 80°C)",
        power: "610W (Surge 110W so với định mức)"
      }
    },
    {
      id: "ev-1",
      time: "T1 [00:00.8s]",
      title: "CẬP NHẬT CHỈ SỐ HEALTH & READINESS (DIGITAL TWIN V2)",
      trigger: "Digital Twin tính toán lại hàm đa yếu tố H và ma trận AHP",
      consequence: "Health Index giảm 88 -> 32 | Readiness Score giảm 91 -> 34",
      tone: "amber",
      details: {
        healthBefore: 88,
        healthAfter: 32,
        readinessBefore: 91,
        readinessAfter: 34,
        ahpValidation: "Consistency Ratio CR = 0.012 < 0.10 (Valid)"
      }
    },
    {
      id: "ev-2",
      time: "T2 [00:01.5s]",
      title: "TÁI TỐI ƯU HÓA ĐA MỤC TIÊU (NSGA-II RE-TRIGGERED)",
      trigger: "Bộ giải NSGA-II kích hoạt với hệ số phạt áp lực nhiệt trên GPU-H100-01",
      consequence: "Tìm kiếm Pareto Knee-Point mới trong không gian nghiệm 4D",
      tone: "cyan",
      details: {
        algorithm: "NSGA-II (40 chromosomes, 25 generations)",
        penaltyApplied: "f3 (ThermalDegradation) += 65.0 pts cho GPU-H100-01",
        candidateChosen: "GPU-L40S-01 (Nhiệt độ hiện tại 52.4°C, Readiness 89)"
      }
    },
    {
      id: "ev-3",
      time: "T3 [00:02.8s]",
      title: "ĐIỀU PHỐI CHUYỂN TẢI TỰ ĐỘNG (AUTONOMOUS DISPATCH)",
      trigger: "Gán lại Job #482 (Graduate Thesis) sang GPU-L40S-01",
      consequence: "Ghi log quyết định Decision Provenance vào bảng OptimizationDecision",
      tone: "blue",
      details: {
        jobId: "Job #482",
        assignedResource: "GPU-L40S-01 (L40S Server Node)",
        slot: "14:00 - 17:00 (3 Giờ)",
        costVnd: "8.500 đ (Khung giờ Tiêu Chuẩn EVN)"
      }
    },
    {
      id: "ev-4",
      time: "T4 [00:03.5s]",
      title: "CAM KẾT GIAO DỊCH DATABASE (TRANSACTION COMMITTED)",
      trigger: "Xác thực PostgreSQL GiST Range Constraint & Row-level Lock",
      consequence: "Thời gian phục hồi toàn trình T_recovery = 3.5 giây | 0 Double-booking",
      tone: "green",
      details: {
        recoveryTime: "3.5s (T4 - T0)",
        isolationStatus: "GiST Exclusion Constraint Passed (0 Overlap Anomalies)",
        provenanceId: "DEC-2026-849102"
      }
    }
  ];

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER WITH CONTROLS */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981", background: "rgba(16, 185, 129, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                CLOSED-LOOP DIGITAL TWIN FEEDBACK
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                RECOVERY LATENCY T_recovery = 3.5s
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Nhật Ký Tái Hiện Sự Cố & Tái Tối Ưu Hóa (Decision Timeline Replay)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Biến toàn bộ log cơ sở dữ liệu thành câu chuyện phản ứng khép kín trực quan: Cảm biến $\to$ Bản sao số $\to$ NSGA-II $\to$ Chuyển tải an toàn.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              style={{ fontSize: "0.8rem", padding: "8px 14px", fontFamily: "var(--font-mono)" }}
            >
              Bước Trước
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setActiveStep((prev) => Math.min(timelineEvents.length - 1, prev + 1))}
              style={{ fontSize: "0.8rem", padding: "8px 14px", fontFamily: "var(--font-mono)", background: "#06b6d4", color: "#0b0e14", fontWeight: 700 }}
            >
              Bước Tiếp Theo
            </button>
          </div>
        </div>
      </div>

      {/* TIMELINE LIST & STEP INSPECTOR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* VERTICAL TIMELINE */}
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {timelineEvents.map((ev, idx) => {
              const isSelected = activeStep === idx;
              const toneColor = ev.tone === "red" ? "#ef4444" : (ev.tone === "amber" ? "#f59e0b" : (ev.tone === "cyan" ? "#06b6d4" : (ev.tone === "blue" ? "#3b82f6" : "#10b981")));

              return (
                <div
                  key={ev.id}
                  onClick={() => setActiveStep(idx)}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "#161b26" : "#0e121a",
                    border: isSelected ? `1px solid ${toneColor}` : "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 6,
                    padding: "14px 16px",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: toneColor, fontWeight: 700 }}>
                      {ev.time}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: "0.68rem", background: toneColor, color: "#0b0e14", fontWeight: 800, padding: "1px 6px", borderRadius: 3, fontFamily: "var(--font-mono)" }}>
                        ACTIVE INSPECTION
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
                    Trigger: <strong style={{ color: "#cbd5e1" }}>{ev.trigger}</strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                    Hệ quả: {ev.consequence}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP TELEMETRY INSPECTOR */}
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#06b6d4", display: "block" }}>
              STEP PROVENANCE INSPECTOR
            </span>
            <strong style={{ fontSize: "1rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
              {timelineEvents[activeStep].title}
            </strong>
          </div>

          <div style={{ background: "#0e121a", borderRadius: 6, padding: "14px 16px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
            <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
              TELEMETRY & ALGORITHM PAYLOAD:
            </span>

            <div style={{ display: "grid", gap: 10, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
              {Object.entries(timelineEvents[activeStep].details).map(([k, v]) => (
                <div key={k} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", paddingBottom: 6 }}>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>{k.toUpperCase()}</span>
                  <span style={{ color: "#f8fafc" }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <ShieldCheck size={14} style={{ color: "#10b981" }} />
              <strong style={{ fontSize: "0.75rem", color: "#10b981", fontFamily: "var(--font-mono)" }}>
                HỘI ĐỒNG BẢO VỆ ĐỐI SOÁT
              </strong>
            </div>
            <p style={{ fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.4, margin: 0 }}>
              Chuỗi chuyển tải chứng minh đặc tính phản hồi khép kín (closed-loop control) theo định nghĩa ISO 23247: bản sao số không chỉ hiển thị dữ liệu mà tự động thay đổi quyết định điều phối thực tế.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
