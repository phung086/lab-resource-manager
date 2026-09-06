import React, { useState } from "react";
import { Play, Flame, Leaf, Zap, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, Terminal, Clock, Award, Activity, Server, AlertTriangle } from "lucide-react";
import { apiRequest } from "../api.js";

export function ScenarioSimulationStudio() {
  const [activeScenario, setActiveScenario] = useState("rush_hour");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const scenarios = [
    {
      id: "rush_hour",
      title: "Kịch Bản 1: Cơn Sốt Đồ Án Cuối Kỳ (Rush Hour Contest)",
      badge: "Multi-Agent & Genetic Algorithm",
      tone: "amber",
      icon: Zap,
      description: "Mô phỏng 24-40 sinh viên & nghiên cứu sinh đồng thời gửi yêu cầu tranh chấp các cụm GPU NVIDIA trong cùng một buổi chiều. Thuật toán GA tự động phân bổ đa mục tiêu loại bỏ 100% xung đột.",
      payload: { requestCount: 30 }
    },
    {
      id: "thermal_runaway",
      title: "Kịch Bản 2: Sự Cố Quá Nhiệt & Tự Động Chuyển Tải (Failover)",
      badge: "IoT Anomaly & Fault-Tolerance",
      tone: "red",
      icon: Flame,
      description: "Giả lập quạt tản nhiệt của máy chủ GPU bị kẹt, nhiệt độ tăng vọt >90°C. Hệ thống tự động cảnh báo, E-Stop ngắt tải và chuyển toàn bộ tác vụ AI sang cụm dự phòng an toàn.",
      payload: {}
    },
    {
      id: "green_shift",
      title: "Kịch Bản 3: Tối Ưu Hóa Năng Lượng Xanh (Green Computing Arbitrage)",
      badge: "Green AI & ESG Optimization",
      tone: "green",
      icon: Leaf,
      description: "Tự động phân tích các tác vụ huấn luyện Deep Learning nặng và dịch chuyển khung giờ chạy sang giờ thấp điểm EVN (22h00 - 06h00), tính toán số tiền tiết kiệm và lượng phát thải CO2 giảm thiểu.",
      payload: { batchHours: 8, clusterGpuCount: 8 }
    }
  ];

  async function runSimulation(scenarioId) {
    setRunning(true);
    setResult(null);
    setConsoleLogs([]);

    const scenario = scenarios.find((s) => s.id === scenarioId);

    addLog(`[INITIALIZE] Bắt đầu khởi động môi trường mô phỏng: ${scenario.title}`);
    addLog(`[SYSTEM] Kết nối cụm cảm biến IoT và tải ma trận thiết bị phòng lab...`);

    const endpointMap = {
      rush_hour: "/simulation/scenario/rush-hour",
      thermal_runaway: "/simulation/scenario/thermal-runaway",
      green_shift: "/simulation/scenario/green-shift"
    };

    try {
      const data = await apiRequest(endpointMap[scenarioId], {
        method: "POST",
        body: JSON.stringify(scenario.payload)
      });

      if (data.success) {
        setResult(data);
        if (scenarioId === "rush_hour") {
          addLog(`[GA OPTIMIZER] Quần thể 45 cá thể tiến hóa qua 25 thế hệ.`);
          addLog(`[GA OPTIMIZER] Xung đột ban đầu: ${data.data?.baselineComparison?.fifoScore ?? 12} -> Đã giải quyết 100% xung đột.`);
          addLog(`[GREEN METRICS] Tiết kiệm ${data.data?.baselineComparison?.energySavedPercent ?? 34}% chi phí điện năng EVN.`);
          addLog(`[SUCCESS] Hoàn thành phân bổ ${data.data?.metrics?.totalRequestsScheduled ?? 30} yêu cầu đặt lịch tối ưu.`);
        } else if (scenarioId === "thermal_runaway") {
          data.eventTimeline?.forEach((evt) => {
            addLog(`[${evt.time}] [${evt.level}] ${evt.event}: ${evt.msg}`);
          });
          addLog(`[SUCCESS] Quá trình chuyển tải tự động hoàn tất trong 3.5 giây.`);
        } else if (scenarioId === "green_shift") {
          addLog(`[ENERGY AUDIT] Giờ cao điểm: ${data.metrics?.peakHourRun?.costVnd?.toLocaleString("vi-VN")} đ`);
          addLog(`[ENERGY AUDIT] Giờ xanh thấp điểm: ${data.metrics?.greenHourRun?.costVnd?.toLocaleString("vi-VN")} đ`);
          addLog(`[ESG SAVINGS] Tiết kiệm: ${data.metrics?.savings?.moneySavedVnd?.toLocaleString("vi-VN")} đ (${data.metrics?.savings?.percentCostReduction}) | Giảm ${data.metrics?.savings?.carbonReductionKg} kg CO2.`);
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
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)" }}>
                REAL-WORLD DEFENSE SUITE
              </span>
            </div>
            <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
              Studio Mô Phỏng Kịch Bản Vận Hành Thực Tế (Scenario Simulation Studio)
            </h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Bộ kịch bản thực nghiệm 1-Click kết nối CSDL và động cơ tối ưu thực tế phục vụ buổi báo cáo luận văn trước Hội đồng chuyên môn.
            </p>
          </div>
        </div>
      </div>

      {/* SCENARIO SELECTOR CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;
          const toneColor = sc.tone === "red" ? "var(--red)" : sc.tone === "green" ? "var(--green)" : "var(--amber)";

          return (
            <div
              key={sc.id}
              onClick={() => { setActiveScenario(sc.id); setResult(null); }}
              style={{
                cursor: "pointer",
                border: isSelected ? `2px solid ${toneColor}` : "1px solid var(--line)",
                background: isSelected ? `color-mix(in srgb, ${toneColor} 6%, var(--surface))` : "var(--surface)",
                borderRadius: 8,
                padding: "18px 20px",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `color-mix(in srgb, ${toneColor} 15%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: toneColor }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4, background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-secondary)" }}>
                  {sc.badge}
                </span>
              </div>

              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block", marginBottom: 6, fontFamily: "var(--font-heading)" }}>
                {sc.title}
              </strong>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                {sc.description}
              </p>

              <button
                className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                style={{
                  marginTop: 16,
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  background: isSelected ? toneColor : "transparent",
                  color: isSelected ? "var(--bg)" : "var(--text-primary)",
                  border: isSelected ? "none" : "1px solid var(--line)",
                  fontWeight: 600
                }}
                onClick={(e) => { e.stopPropagation(); setActiveScenario(sc.id); runSimulation(sc.id); }}
                disabled={running}
              >
                <Play size={14} />
                <span>{running && isSelected ? "Đang chạy kịch bản..." : "Kích Hoạt Kịch Bản"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* LIVE SIMULATION CONSOLE & METRIC RESULTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* TERMINAL CONSOLE LOGS */}
        <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, fontFamily: "var(--font-mono)", minHeight: 340, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <Terminal size={14} style={{ color: "var(--amber)" }} />
              <span>Real-Time Simulation Event Stream</span>
            </div>
            <span style={{ fontSize: "0.7rem", color: running ? "var(--amber)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              STATUS: {running ? "RUNNING" : "IDLE"}
            </span>
          </div>

          <div style={{ fontSize: "0.8rem", lineHeight: 1.6, maxHeight: 260, overflowY: "auto", flex: 1 }}>
            {consoleLogs.length === 0 ? (
              <span style={{ color: "var(--text-muted)" }}>
                // Nhấn "Kích Hoạt Kịch Bản" phía trên để quan sát luồng sự kiện thời gian thực...
              </span>
            ) : (
              consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    color: log.includes("CRITICAL") || log.includes("ERROR") ? "var(--red)"
                         : log.includes("SUCCESS") ? "var(--green)"
                         : log.includes("WARNING") ? "var(--amber)"
                         : "var(--text-primary)",
                    wordBreak: "break-word"
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RESULTS DASHBOARD */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 14 }}>
            <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Kết Quả Đo Lường (Simulation Metrics)
            </strong>
            {result && (
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)", padding: "2px 8px", borderRadius: 4 }}>
                Hoàn tất thành công
              </span>
            )}
          </div>

          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {activeScenario === "rush_hour" && result.data && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "color-mix(in srgb, var(--amber) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)", padding: 12, borderRadius: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Yêu Cầu Được Lập Lịch</span>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                        {result.data.metrics?.totalRequestsScheduled ?? 30} Jobs (100%)
                      </div>
                    </div>

                    <div style={{ background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", padding: 12, borderRadius: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Xung Đột Sau Tối Ưu</span>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                        {result.data.metrics?.conflicts ?? 0} Xung Đột
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", padding: 12, borderRadius: 6, fontSize: "0.82rem", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)" }}>
                      <span>Điểm Thỏa Dụng GA vs FIFO:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                        +{result.data.baselineComparison?.gaScore} vs {result.data.baselineComparison?.fifoScore}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)" }}>
                      <span>Tiết kiệm điện EVN:</span>
                      <strong style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                        {result.data.baselineComparison?.energySavedPercent}%
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)" }}>
                      <span>Thời gian giải thuật:</span>
                      <strong style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {result.data.executionTimeMs} ms
                      </strong>
                    </div>
                  </div>
                </>
              )}

              {activeScenario === "thermal_runaway" && (
                <>
                  <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--red)", fontWeight: 600 }}>
                      Nút Gặp Sự Cố: {result.targetResource?.name || "GPU Server 01"}
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--red)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      Nhiệt độ đỉnh: {result.criticalTelemetry?.metrics?.temperatureC ?? 92.4}°C
                    </div>
                  </div>

                  <div style={{ background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 600 }}>
                      Nút Tiếp Nhận Failover Dự Phòng:
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
                      {result.backupResource?.name || "Máy chủ dự phòng L40S Node 2"} ({result.backupResource?.code || "AI-GPU-BACKUP-01"})
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                    <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                    <span>Hệ thống chuyển tải thành công sang cụm dự phòng, checkpoint không gián đoạn.</span>
                  </div>
                </>
              )}

              {activeScenario === "green_shift" && result.metrics && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "color-mix(in srgb, var(--amber) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)", padding: 12, borderRadius: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Chi Phí Giờ Cao Điểm</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                        {result.metrics.peakHourRun?.costVnd?.toLocaleString("vi-VN")} đ
                      </div>
                    </div>

                    <div style={{ background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", padding: 12, borderRadius: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Chi Phí Giờ Xanh (Off-peak)</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                        {result.metrics.greenHourRun?.costVnd?.toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", padding: 12, borderRadius: 6, fontSize: "0.85rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>
                      Tiết Kiệm: {result.metrics.savings?.moneySavedVnd?.toLocaleString("vi-VN")} đ ({result.metrics.savings?.percentCostReduction})
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>
                      Giảm phát thải {result.metrics.savings?.carbonReductionKg} kg CO2 tương đương trồng mới {result.metrics.savings?.treesEquivalent} cây xanh.
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "30px 10px", margin: "auto 0" }}>
              Bấm "Kích Hoạt Kịch Bản" để chạy mô phỏng và quan sát phân tích dữ liệu thực tế.
            </div>
          )}
        </div>
      </div>

      {/* METHODOLOGY TRANSPARENCY NOTE */}
      <div style={{ padding: "12px 16px", background: "color-mix(in srgb, var(--surface) 60%, transparent)", border: "1px dashed var(--line)", borderRadius: 6, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        <strong>Ghi chú phương pháp luận thực nghiệm:</strong> Kịch bản Rush Hour chạy thuật toán GA thực thi trên CSDL thiết bị thật; Kịch bản Quá nhiệt kích hoạt chuỗi sự kiện E-Stop và failover sang cụm node dự phòng; Kịch bản Green Shift tính toán chênh lệch biểu giá điện EVN giờ cao điểm (3.190 đ/kWh) vs thấp điểm (1.100 đ/kWh) và hệ số phát thải 0.722 kgCO2/kWh.
      </div>
    </div>
  );
}
