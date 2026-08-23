import React from "react";
import { Activity, Cpu, Zap, ShieldCheck, Server, AlertTriangle, RefreshCw, Layers, CheckCircle2, ArrowRight } from "lucide-react";

export function MissionControlOverview({ onNavigate }) {
  const metrics = [
    {
      id: "readiness",
      label: "ĐIỂM SẴN SÀNG TRUNG BÌNH",
      value: "92.4%",
      subtext: "AHP Weighted Score (CR = 0.012)",
      tone: "green",
      icon: ShieldCheck
    },
    {
      id: "fairness",
      label: "CHỈ SỐ CÔNG BẰNG JAIN",
      value: "0.842",
      subtext: "Fair-Share Optimization (N=30)",
      tone: "cyan",
      icon: Activity
    },
    {
      id: "energy",
      label: "TIẾT KIỆM ĐIỆN HÔM NAY",
      value: "18.6%",
      subtext: "So với baseline FIFO (EVN 3 giá)",
      tone: "green",
      icon: Zap
    },
    {
      id: "reopt",
      label: "TÁI TỐI ƯU HÓA TỰ ĐỘNG",
      value: "4 Lần",
      subtext: "Digital Twin Closed-Loop Triggered",
      tone: "blue",
      icon: RefreshCw
    }
  ];

  const devices = [
    {
      id: "GPU-H100-01",
      name: "NVIDIA H100 SXM5 Node #1",
      type: "High-Performance LLM / Vision",
      temperature: 58.2,
      healthIndex: 94,
      rulDays: 170,
      powerWatts: 420,
      status: "ready",
      statusLabel: "SẴN SÀNG ĐIỀU PHỐI",
      statusTone: "green",
      currentJob: "Job #412 (CVPR Paper)"
    },
    {
      id: "GPU-H100-02",
      name: "NVIDIA H100 SXM5 Node #2",
      type: "Diffusion 3D & Pre-training",
      temperature: 86.8,
      healthIndex: 32,
      rulDays: 14,
      powerWatts: 610,
      status: "reassigning",
      statusLabel: "QUÁ NHIỆT / TÁI ĐIỀU PHỐI",
      statusTone: "red",
      currentJob: "Chuyển tải tự động sang L40S"
    },
    {
      id: "GPU-L40S-01",
      name: "NVIDIA L40S Workstation Node #1",
      type: "Fine-tuning & Đồ Án Tốt Nghiệp",
      temperature: 52.4,
      healthIndex: 89,
      rulDays: 155,
      powerWatts: 280,
      status: "ready",
      statusLabel: "TIẾP NHẬN TÁC VỤ DI DỜI",
      statusTone: "green",
      currentJob: "Job #482 (Graduate Thesis)"
    },
    {
      id: "EDGE-ORIN-01",
      name: "Jetson AGX Orin 64GB Cluster",
      type: "Edge Robotics & Realtime SLAM",
      temperature: 44.1,
      healthIndex: 98,
      rulDays: 180,
      powerWatts: 48,
      status: "ready",
      statusLabel: "HOẠT ĐỘNG ỔN ĐỊNH",
      statusTone: "green",
      currentJob: "Drone SLAM Simulation"
    }
  ];

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* MISSION CONTROL TOP METRIC INSTRUMENTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              style={{
                background: "#111620",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 8,
                padding: "16px 18px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                position: "relative"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                  {m.label}
                </span>
                <Icon size={16} style={{ color: m.tone === "green" ? "#10b981" : (m.tone === "cyan" ? "#06b6d4" : "#3b82f6") }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
                {m.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                {m.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* HARDWARE TELEMETRY RACK MATRIX */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Server size={18} style={{ color: "#06b6d4" }} />
            <strong style={{ fontSize: "0.95rem", color: "#f8fafc", fontFamily: "var(--font-heading)", letterSpacing: "0.04em" }}>
              MA TRẬN GIÁM SÁT THỜI GIAN THỰC CÁC NODE TÍNH TOÁN (HARDWARE RACK MATRIX)
            </strong>
          </div>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            ● LIVE SENSOR SSE STREAM
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 14 }}>
          {devices.map((dev) => {
            const isCritical = dev.temperature >= 85 || dev.healthIndex < 40;
            const isWarning = dev.temperature >= 75 && dev.temperature < 85;

            return (
              <div
                key={dev.id}
                style={{
                  background: "#161b26",
                  border: isCritical ? "1px solid #ef4444" : (isWarning ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.08)"),
                  borderRadius: 8,
                  padding: "16px 18px",
                  boxShadow: isCritical ? "0 0 16px rgba(239, 68, 68, 0.15)" : "none"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "0.95rem", color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
                        {dev.id}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{dev.name}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                      {dev.type}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: dev.statusTone === "green" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.15)",
                      color: dev.statusTone === "green" ? "#10b981" : "#ef4444",
                      border: `1px solid ${dev.statusTone === "green" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                    }}
                  >
                    {dev.statusLabel}
                  </span>
                </div>

                {/* SENSOR INSTRUMENT READINGS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "14px 0", background: "#0e121a", padding: "10px 12px", borderRadius: 6 }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>NHIỆT ĐỘ CORE</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: isCritical ? "#ef4444" : (isWarning ? "#f59e0b" : "#10b981") }}>
                      {dev.temperature}°C
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>HEALTH INDEX</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: dev.healthIndex > 75 ? "#10b981" : (dev.healthIndex > 40 ? "#f59e0b" : "#ef4444") }}>
                      {dev.healthIndex}/100
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>DỰ BÁO RUL</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: dev.rulDays > 30 ? "#f8fafc" : "#ef4444" }}>
                      {dev.rulDays} Ngày
                    </strong>
                  </div>
                </div>

                {/* HEALTH BAR */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginBottom: 3 }}>
                    <span>Trạng Thái Suy Giảm Phần Cứng (Health Degradation)</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{dev.healthIndex}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${dev.healthIndex}%`,
                        height: "100%",
                        background: dev.healthIndex > 75 ? "#10b981" : (dev.healthIndex > 40 ? "#f59e0b" : "#ef4444")
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Tác vụ hiện tại: <strong style={{ color: "#f8fafc" }}>{dev.currentJob}</strong></span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#64748b" }}>Công suất: {dev.powerWatts}W</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
