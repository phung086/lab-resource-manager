import React, { useState } from "react";
import { Play, Pause, RotateCcw, AlertTriangle, ArrowRight, ShieldCheck, Cpu, Database, CheckCircle2, ChevronRight } from "lucide-react";

export function DecisionTimelineReplay() {
  const [activeStep, setActiveStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const timelineEvents = [
    {
      id: "ev-0",
      time: "T0 [00:00.0s]",
      title: "SỰ CỐ QUÁ NHIỆT (THERMAL ANOMALY)",
      trigger: "GPU-H100-01 nhiệt độ vượt ngưỡng 86.8°C",
      consequence: "Kích hoạt cờ cảnh báo cấp độ CRITICAL trên telemetry stream",
      tone: "var(--red)",
      icon: AlertTriangle,
      details: {
        resource: "GPU-H100-01",
        metric: "Temperature: 86.8°C (Ngưỡng an toàn <= 80°C)",
        power: "610W (Surge 110W so với định mức)"
      }
    },
    {
      id: "ev-1",
      time: "T1 [00:00.8s]",
      title: "CẬP NHẬT CHỈ SỐ HEALTH & READINESS",
      trigger: "Digital Twin tính toán lại hàm đa yếu tố H và ma trận AHP",
      consequence: "Health Index giảm 88 -> 32 | Readiness Score giảm 91 -> 34",
      tone: "var(--amber)",
      icon: Cpu,
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
      title: "TÁI TỐI ƯU HÓA (NSGA-II RE-TRIGGERED)",
      trigger: "Bộ giải kích hoạt với hệ số phạt áp lực nhiệt trên GPU-H100-01",
      consequence: "Tìm kiếm Pareto Knee-Point mới trong không gian nghiệm 4D",
      tone: "var(--cyan)",
      icon: Database,
      details: {
        algorithm: "NSGA-II (40 chromosomes, 25 generations)",
        penaltyApplied: "f3 (Thermal) += 65.0 pts cho GPU-H100-01",
        candidateChosen: "GPU-L40S-01 (Nhiệt độ hiện tại 52.4°C, Readiness 89)"
      }
    },
    {
      id: "ev-3",
      time: "T3 [00:02.8s]",
      title: "ĐIỀU PHỐI CHUYỂN TẢI TỰ ĐỘNG",
      trigger: "Gán lại Job #482 (Graduate Thesis) sang GPU-L40S-01",
      consequence: "Ghi log quyết định Decision Provenance vào bảng Database",
      tone: "var(--blue)",
      icon: ArrowRight,
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
      title: "CAM KẾT GIAO DỊCH DATABASE",
      trigger: "Xác thực PostgreSQL GiST Range Constraint",
      consequence: "Thời gian phục hồi toàn trình T_recovery = 3.5 giây | 0 Xung đột",
      tone: "var(--green)",
      icon: ShieldCheck,
      details: {
        recoveryTime: "3.5s (T4 - T0)",
        isolationStatus: "GiST Exclusion Constraint Passed (0 Overlap)",
        provenanceId: "DEC-2026-849102"
      }
    }
  ];

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "rgba(95, 167, 119, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(95, 167, 119, 0.25)" }}>
                CLOSED-LOOP FEEDBACK
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                RECOVERY LATENCY T_recovery = 3.5s
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Nhật Ký Tái Hiện Quyết Định Điều Phối (Replay)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Truy vết toàn trình quá trình phản ứng tự động: Cảm biến &rarr; Digital Twin &rarr; NSGA-II &rarr; Chuyển tải an toàn.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* TIMELINE PROGRESSION */}
        <div style={{ flex: 1, minWidth: 320, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 18 }}>
            TIẾN TRÌNH THỰC THI (PROVENANCE LOG)
          </strong>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timelineEvents.map((ev, index) => {
              const isActive = index === activeStep;
              const isPast = index <= activeStep;
              const Icon = ev.icon;

              return (
                <div
                  key={ev.id}
                  onClick={() => setActiveStep(index)}
                  style={{
                    display: "flex", gap: 16, cursor: "pointer", position: "relative",
                    opacity: isPast ? 1 : 0.4, transition: "all 0.2s ease"
                  }}
                >
                  {/* Vertical Line Connection */}
                  {index < timelineEvents.length - 1 && (
                    <div style={{ position: "absolute", top: 32, left: 15, bottom: -8, width: 2, background: isPast ? ev.tone : "var(--line)" }} />
                  )}

                  {/* Node Circle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 16, display: "grid", placeItems: "center", flexShrink: 0,
                    background: isActive ? ev.tone : (isPast ? `color-mix(in srgb, ${ev.tone} 15%, transparent)` : "var(--surface-strong)"),
                    border: `2px solid ${isPast ? ev.tone : "var(--line-strong)"}`,
                    color: isActive ? "#14161A" : ev.tone,
                    zIndex: 2,
                    boxShadow: isActive ? `0 0 12px ${ev.tone}` : "none",
                    marginTop: 2
                  }}>
                    {isPast ? <CheckCircle2 size={16} /> : <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--line)" }} />}
                  </div>

                  {/* Content Card */}
                  <div style={{
                    flex: 1, paddingBottom: 24,
                    transform: isActive ? "translateX(4px)" : "none", transition: "all 0.2s ease"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: ev.tone, fontWeight: 700 }}>
                        {ev.time}
                      </span>
                      <strong style={{ fontSize: "0.9rem", color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {ev.title}
                      </strong>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Tác nhân:</span> {ev.trigger}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Hệ quả:</span> {ev.consequence}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAILS PANEL */}
        <div style={{ flex: 1, minWidth: 320, background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: timelineEvents[activeStep].tone, fontWeight: 700, padding: "2px 8px", background: `color-mix(in srgb, ${timelineEvents[activeStep].tone} 15%, transparent)`, borderRadius: 4, border: `1px solid color-mix(in srgb, ${timelineEvents[activeStep].tone} 30%, transparent)` }}>
              CHI TIẾT KỸ THUẬT BƯỚC {activeStep}
            </span>
          </div>

          <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 20 }}>
            {timelineEvents[activeStep].title}
          </strong>

          <div style={{ display: "grid", gap: 12 }}>
            {Object.entries(timelineEvents[activeStep].details).map(([key, value]) => (
              <div key={key} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 4 }}>
                  {key}
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)", wordBreak: "break-word" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: "12px 14px", background: "color-mix(in srgb, var(--blue) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)", borderRadius: 6, color: "var(--text-secondary)", fontSize: "0.8rem", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <ShieldCheck size={16} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: 2 }}>Khả năng tái lập (Reproducibility)</strong>
              Toàn bộ tham số môi trường và hạt giống sinh ngẫu nhiên (seed) của thuật toán tối ưu đã được lưu trữ vào Data Warehouse. Bạn có thể sử dụng tính năng Replay để xác thực lại quyết định vào bất kỳ lúc nào.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
