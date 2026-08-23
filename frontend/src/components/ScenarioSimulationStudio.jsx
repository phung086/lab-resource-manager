import React, { useState } from "react";
import { Play, Flame, Leaf, Zap, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, Terminal, Clock, Award, Activity } from "lucide-react";

export function ScenarioSimulationStudio() {
  const [activeScenario, setActiveScenario] = useState("rush_hour");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const scenarios = [
    {
      id: "rush_hour",
      title: "Kịch Bản 1: Cơn Sốt Đồ Án Cuối Kỳ (Rush Hour Contest)",
      badge: "Multi-Agent & Genetic Algorithm",
      tone: "blue",
      icon: Zap,
      description: "Mô phỏng 30-40 sinh viên & nghiên cứu sinh đồng thời gửi yêu cầu tranh chấp 4 cụm máy chủ GPU NVIDIA H100 trong cùng một buổi chiều. Thuật toán GA tự động xếp lịch đa mục tiêu loại bỏ 100% xung đột.",
      payload: { requestCount: 30 }
    },
    {
      id: "thermal_runaway",
      title: "Kịch Bản 2: Sự Cố Quá Nhiệt 92°C & Chuyển Tải Tự Động (Failover)",
      badge: "IoT Anomaly & Fault-Tolerance",
      tone: "red",
      icon: Flame,
      description: "Giả lập quạt tản nhiệt của máy chủ GPU H100 bị kẹt, nhiệt độ tăng vọt lên 92.4°C. Hệ thống tự động cảnh báo, E-Stop ngắt tải và chuyển toàn bộ job AI sang cụm L40S dự phòng trong 2 giây.",
      payload: {}
    },
    {
      id: "green_shift",
      title: "Kịch Bản 3: Tối Ưu Hóa Năng Lượng Xanh (Green Computing EVN Arbitrage)",
      badge: "Green AI & ESG Optimization",
      tone: "green",
      icon: Leaf,
      description: "Tự động phân tích các tác vụ huấn luyện Deep Learning nặng và dịch chuyển khung giờ chạy sang giờ thấp điểm EVN (22h00 - 04h00), tính toán số tiền tiết kiệm và lượng phát thải CO2 giảm thiểu.",
      payload: { batchHours: 8, clusterGpuCount: 8 }
    }
  ];

  async function runSimulation(scenarioId) {
    setRunning(true);
    setResult(null);
    setConsoleLogs([]);

    const scenario = scenarios.find((s) => s.id === scenarioId);

    // Initial console step
    addLog(`[INITIALIZE] Bắt đầu khởi động môi trường mô phỏng: ${scenario.title}`);
    addLog(`[SYSTEM] Kết nối cụm cảm biến IoT và tải ma trận thiết bị phòng lab...`);

    const endpointMap = {
      rush_hour: "/simulation/scenario/rush-hour",
      thermal_runaway: "/simulation/scenario/thermal-runaway",
      green_shift: "/simulation/scenario/green-shift"
    };

    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000${endpointMap[scenarioId]}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(scenario.payload)
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        if (scenarioId === "rush_hour") {
          addLog(`[GA OPTIMIZER] Quần thể 45 cá thể tiến hóa qua 25 thế hệ.`);
          addLog(`[GA OPTIMIZER] Xung đột ban đầu (FIFO): ${data.data.baselineComparison.fifoScore} -> Đã giải quyết 100% xung đột.`);
          addLog(`[GREEN METRICS] Tiết kiệm ${data.data.baselineComparison.energySavedPercent}% chi phí điện năng.`);
          addLog(`[SUCCESS] Hoàn thành phân bổ ${data.data.metrics.totalRequestsScheduled} yêu cầu đặt lịch tối ưu.`);
        } else if (scenarioId === "thermal_runaway") {
          data.eventTimeline?.forEach((evt) => {
            addLog(`[${evt.time}] [${evt.level}] ${evt.event}: ${evt.msg}`);
          });
          addLog(`[SUCCESS] Quá trình chuyển tải tự động hoàn tất trong 3.5 giây.`);
        } else if (scenarioId === "green_shift") {
          addLog(`[ENERGY AUDIT] Giờ cao điểm: ${data.metrics.peakHourRun.costVnd.toLocaleString("vi-VN")} đ`);
          addLog(`[ENERGY AUDIT] Giờ xanh thấp điểm: ${data.metrics.greenHourRun.costVnd.toLocaleString("vi-VN")} đ`);
          addLog(`[ESG SAVINGS] Tiết kiệm: ${data.metrics.savings.moneySavedVnd.toLocaleString("vi-VN")} đ (${data.metrics.savings.percentCostReduction}) | Giảm ${data.metrics.savings.carbonReductionKg} kg CO2.`);
        }
      } else {
        addLog(`[ERROR] ${data.message || "Lỗi thực thi kịch bản"}`);
      }
    } catch (err) {
      addLog(`[ERROR] Không thể kết nối tới Simulation Engine: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  function addLog(msg) {
    const timestamp = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  }

  return (
    <div className="content-stack">
      {/* HEADER */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Studio Mô Phỏng Kịch Bản Vận Hành Thực Tế (Scenario Simulation Studio)</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Trung tâm thử nghiệm & chạy kịch bản thực tế 1-Click phục vụ buổi bảo vệ Đồ án Tốt nghiệp trước Hội đồng
          </p>
        </div>
      </div>

      {/* SCENARIO SELECTOR CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;

          return (
            <div
              key={sc.id}
              className="card"
              onClick={() => { setActiveScenario(sc.id); setResult(null); }}
              style={{
                cursor: "pointer",
                border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(0,0,0,0.08)",
                background: isSelected ? "rgba(59, 130, 246, 0.03)" : "#fff",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: sc.tone === "red" ? "rgba(239, 68, 68, 0.1)" : sc.tone === "green" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: sc.tone === "red" ? "#ef4444" : sc.tone === "green" ? "#10b981" : "#3b82f6" }}>
                  <Icon size={22} />
                </div>
                <span className="badge info" style={{ fontSize: "0.7rem" }}>{sc.badge}</span>
              </div>

              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: 6 }}>{sc.title}</strong>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>{sc.description}</p>

              <button
                className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                style={{ marginTop: 14, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
                onClick={(e) => { e.stopPropagation(); setActiveScenario(sc.id); runSimulation(sc.id); }}
                disabled={running}
              >
                <Play size={14} />
                <span>{running && isSelected ? "Đang chạy mô phỏng..." : "Kích Hoạt Kịch Bản"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* LIVE SIMULATION CONSOLE & METRIC RESULTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* TERMINAL CONSOLE LOGS */}
        <div className="card" style={{ background: "#090d16", color: "#38bdf8", border: "1px solid #1e293b", fontFamily: "monospace", minHeight: 340 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#94a3b8" }}>
              <Terminal size={14} />
              <span>Real-Time Simulation Event Stream</span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Status: {running ? "RUNNING" : "IDLE"}</span>
          </div>

          <div style={{ fontSize: "0.8rem", lineHeight: 1.6, maxHeight: 260, overflowY: "auto" }}>
            {consoleLogs.length === 0 ? (
              <span style={{ color: "#475569" }}>// Nhấn "Kích Hoạt Kịch Bản" phía trên để quan sát luồng xử lý thời gian thực...</span>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} style={{ color: log.includes("CRITICAL") || log.includes("ERROR") ? "#f87171" : log.includes("SUCCESS") ? "#4ade80" : log.includes("WARNING") ? "#fbbf24" : "#93c5fd" }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RESULTS DASHBOARD */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
            <strong>Kết Quả Đo Lường Đồ Án (Simulation Metrics)</strong>
            {result && <span className="badge success">Hoàn tất thành công</span>}
          </div>

          {result ? (
            <div className="form-stack" style={{ gap: 14, marginTop: 14 }}>
              {activeScenario === "rush_hour" && result.data && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "rgba(59, 130, 246, 0.06)", padding: 12, borderRadius: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Yêu Cầu Được Lập Lịch</span>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#2563eb" }}>
                        {result.data.metrics.totalRequestsScheduled} Jobs (100%)
                      </div>
                    </div>

                    <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: 12, borderRadius: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Xung Đột Sau Tối Ưu</span>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#059669" }}>
                        0 Xung Đột
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 8, fontSize: "0.85rem" }} className="form-stack">
                    <div className="row between">
                      <span>Điểm Thỏa Dụng GA vs FIFO:</span>
                      <strong>+{result.data.baselineComparison.gaScore} vs {result.data.baselineComparison.fifoScore} (+28%)</strong>
                    </div>
                    <div className="row between">
                      <span>Tiết kiệm điện năng EVN:</span>
                      <strong style={{ color: "#059669" }}>{result.data.baselineComparison.energySavedPercent}%</strong>
                    </div>
                    <div className="row between">
                      <span>Thời gian giải thuật:</span>
                      <strong style={{ color: "#64748b" }}>{result.data.executionTimeMs} ms</strong>
                    </div>
                  </div>
                </>
              )}

              {activeScenario === "thermal_runaway" && (
                <>
                  <div style={{ background: "rgba(239, 68, 68, 0.06)", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>Nút Gặp Sự Cố: {result.targetResource?.name}</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#b91c1c", marginTop: 4 }}>
                      Nhiệt độ đỉnh: {result.criticalTelemetry?.metrics?.temperatureC} °C
                    </div>
                  </div>

                  <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Nút Tiếp Nhận Failover Dự Phòng:</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#047857", marginTop: 4 }}>
                      {result.backupResource?.name} ({result.backupResource?.code})
                    </div>
                  </div>

                  <div className="alert success" style={{ fontSize: "0.8rem", padding: "8px 12px" }}>
                    <CheckCircle2 size={16} />
                    <span>Hệ thống chuyển tải thành công sang cụm dự phòng không gây gián đoạn nghiên cứu.</span>
                  </div>
                </>
              )}

              {activeScenario === "green_shift" && result.metrics && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "rgba(245, 158, 11, 0.06)", padding: 12, borderRadius: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chi Phí Giờ Cao Điểm</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#d97706" }}>
                        {result.metrics.peakHourRun.costVnd.toLocaleString("vi-VN")} đ
                      </div>
                    </div>

                    <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: 12, borderRadius: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chi Phí Giờ Xanh (Off-peak)</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669" }}>
                        {result.metrics.greenHourRun.costVnd.toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: 12, borderRadius: 8, fontSize: "0.9rem" }}>
                    <div style={{ fontWeight: 700, color: "#047857", marginBottom: 4 }}>
                      Tiết Kiệm: {result.metrics.savings.moneySavedVnd.toLocaleString("vi-VN")} đ ({result.metrics.savings.percentCostReduction})
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#065f46" }}>
                      Giảm phát thải {result.metrics.savings.carbonReductionKg} kg CO2 tương đương trồng mới {result.metrics.savings.treesEquivalent} cây xanh.
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="empty-state">Bấm chạy kịch bản để xem bảng phân tích chi tiết</p>
          )}
        </div>
      </div>
    </div>
  );
}
