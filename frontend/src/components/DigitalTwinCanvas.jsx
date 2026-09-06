import React, { useState, useEffect } from "react";
import { Server, Activity, Thermometer, Zap, ShieldCheck, AlertOctagon, RefreshCw, Cpu, Fan, Radio, Play } from "lucide-react";
import { apiRequest } from "../api.js";

export function DigitalTwinCanvas() {
  const [matrixData, setMatrixData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState("isometric"); // 'isometric' | 'heatmap'

  async function fetchLiveMatrix() {
    try {
      const data = await apiRequest("/simulation/live-matrix");
      if (data.success) {
        setMatrixData(data);
        if (!selectedNode && data.nodes?.length > 0) {
          setSelectedNode(data.nodes[0]);
        } else if (selectedNode) {
          // Keep updated metrics on selected node
          const updated = data.nodes.find((n) => n.resourceId === selectedNode.resourceId);
          if (updated) setSelectedNode(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching live matrix", err);
    }
  }

  useEffect(() => {
    fetchLiveMatrix();
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(fetchLiveMatrix, 3000); // 3-second live sensor poll
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function getHeatColor(temp) {
    if (temp >= 85) return "var(--red)"; // Red
    if (temp >= 72) return "var(--amber)"; // Amber
    if (temp >= 55) return "var(--amber)"; // Warm Amber
    return "var(--green)"; // Cool Green
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER COMMAND BAR */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="live-indicator" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
              Phòng Lab Số Hóa & Bản Đồ Nhiệt Thời Gian Thực (Digital Twin & Live Heatmap)
            </h2>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Mô hình Bản sao số (Digital Twin) theo dõi tải nhiệt độ, công suất và telemetry cảm biến IoT thực tế tại Phòng Lab B603.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="btn-group" style={{ display: "flex", background: "var(--surface-strong)", border: "1px solid var(--line-strong)", borderRadius: 8, padding: 2 }}>
            <button
              className={`btn btn-sm ${viewMode === "isometric" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("isometric")}
              style={{ fontSize: "0.8rem", padding: "4px 10px", background: viewMode === "isometric" ? "var(--green)" : "transparent", color: viewMode === "isometric" ? "var(--bg)" : "var(--text-primary)", fontWeight: viewMode === "isometric" ? 700 : 500 }}
            >
              2D Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === "heatmap" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("heatmap")}
              style={{ fontSize: "0.8rem", padding: "4px 10px", background: viewMode === "heatmap" ? "var(--green)" : "transparent", color: viewMode === "heatmap" ? "var(--bg)" : "var(--text-primary)", fontWeight: viewMode === "heatmap" ? 700 : 500 }}
            >
              Heatmap Nhiệt
            </button>
          </div>

          <button
            className="btn btn-sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, background: autoRefresh ? "rgba(95, 167, 119, 0.15)" : "var(--surface-strong)", color: autoRefresh ? "var(--green)" : "var(--text-secondary)", border: `1px solid ${autoRefresh ? "var(--green)" : "var(--line)"}` }}
          >
            <Radio size={14} className={autoRefresh ? "spin" : ""} />
            {autoRefresh ? "Live Stream (3s)" : "Đã tạm dừng"}
          </button>

          <button className="btn btn-sm btn-ghost" onClick={fetchLiveMatrix} title="Làm mới ngay" style={{ color: "var(--text-secondary)" }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* LAB SUMMARY KPI STRIP */}
      {matrixData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Server size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ACTIVE NODES</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{matrixData.summary.totalNodesOnline} Nodes</div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(227, 162, 60, 0.15)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>LAB TOTAL POWER</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{matrixData.summary.totalPowerConsumptionKw} kW</div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(193, 80, 63, 0.15)", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertOctagon size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CRITICAL ANOMALIES</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--red)", fontFamily: "var(--font-mono)" }}>{matrixData.summary.criticalAnomalies}</div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CANVAS */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* LEFT PANE: 2D VISUALIZATION */}
        <div style={{ flex: 2, minWidth: 400, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 20, minHeight: 450, position: "relative", overflow: "hidden" }}>
          {!matrixData ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-muted)" }}>
              Khởi tạo kết nối IoT Stream...
            </div>
          ) : (
            <>
              {/* Floor Plan Layout Mock */}
              <div style={{
                position: "absolute", top: 20, left: 20, bottom: 20, right: 20,
                border: "2px dashed var(--line)", borderRadius: 12,
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 24,
                background: "repeating-linear-gradient(45deg, var(--surface-strong), var(--surface-strong) 10px, transparent 10px, transparent 20px)",
                backgroundSize: "28px 28px"
              }}>
                {matrixData.nodes.map(node => (
                  <div
                    key={node.resourceId}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      background: "var(--surface)", border: `2px solid ${selectedNode?.resourceId === node.resourceId ? "var(--amber)" : "var(--line)"}`,
                      borderRadius: 6, padding: 12, cursor: "pointer",
                      boxShadow: selectedNode?.resourceId === node.resourceId ? "0 0 15px color-mix(in srgb, var(--amber) 30%, transparent)" : "none",
                      position: "relative",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                      height: 120
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
                      {node.resourceName}
                    </div>
                    
                    {viewMode === "isometric" ? (
                      <div style={{ position: "relative", width: 60, height: 60 }}>
                        <div style={{ position: "absolute", inset: 0, border: "2px solid var(--line-strong)", borderRadius: 4, background: "var(--surface-strong)" }}></div>
                        {/* Fake Rack Blinking Lights */}
                        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--green)" }} className={autoRefresh ? "pulse" : ""}></div>
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: node.isCriticalAnomaly ? "var(--red)" : "var(--line)" }} className={node.isCriticalAnomaly ? "pulse" : ""}></div>
                        </div>
                        {node.type === "GPU" && <Cpu size={24} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "var(--text-secondary)" }} />}
                        {node.type === "DRONE" && <Fan size={24} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "var(--text-secondary)" }} />}
                      </div>
                    ) : (
                      /* HEATMAP MODE */
                      <div style={{ width: "100%", height: 60, background: getHeatColor(node.metrics.temperatureC), borderRadius: 4, display: "grid", placeItems: "center" }}>
                        <strong style={{ color: "var(--bg)", fontSize: "1.2rem", textShadow: "0 1px 2px rgba(255,255,255,0.3)" }}>
                          {node.metrics.temperatureC}°C
                        </strong>
                      </div>
                    )}

                    {node.isCriticalAnomaly && (
                      <div style={{ position: "absolute", top: -8, right: -8, background: "var(--red)", color: "var(--bg)", borderRadius: "50%", padding: 4 }}>
                        <AlertOctagon size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANE: SELECTED NODE DETAILS */}
        <div style={{ flex: 1, minWidth: 320, background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", margin: "0 0 16px 0", fontFamily: "var(--font-heading)", borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
            Phân Tích Node Chuyên Sâu
          </h3>

          {!selectedNode ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "40px 0" }}>
              Click chọn một Node trên bản đồ để xem chi tiết Telemetry
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {/* NODE IDENTITY */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>THIẾT BỊ</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>{selectedNode.resourceCode}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: 2 }}>{selectedNode.resourceName}</div>
              </div>

              {/* METRICS GAUGES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--surface)", border: `1px solid ${selectedNode.isCriticalAnomaly ? "var(--red)" : "var(--line)"}`, padding: 12, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>NHIỆT ĐỘ</span>
                    <Thermometer size={14} style={{ color: getHeatColor(selectedNode.metrics.temperatureC) }} />
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: getHeatColor(selectedNode.metrics.temperatureC), fontFamily: "var(--font-mono)" }}>
                    {selectedNode.metrics.temperatureC}°C
                  </div>
                </div>

                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 12, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CÔNG SUẤT</span>
                    <Zap size={14} style={{ color: "var(--amber)" }} />
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {selectedNode.metrics.powerUsageW}W
                  </div>
                </div>

                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 12, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>QUẠT LÀM MÁT</span>
                    <Fan size={14} style={{ color: "var(--teal)" }} />
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {selectedNode.metrics.fanSpeedRpm}
                    <span style={{ fontSize: "0.7rem", fontWeight: 400, marginLeft: 2 }}>RPM</span>
                  </div>
                </div>
                
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 12, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>HIỆU SUẤT TẢI</span>
                    <Activity size={14} style={{ color: "var(--green)" }} />
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {selectedNode.metrics.utilizationPercent}%
                  </div>
                </div>
              </div>

              {/* TWIN STATUS & LOGS */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <ShieldCheck size={14} style={{ color: "var(--green)" }} />
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Bảo vệ quá tải (Thermal Throttling)</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "var(--surface)", padding: 12, borderRadius: 6, border: "1px solid var(--line)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
                  {selectedNode.isCriticalAnomaly ? (
                    <span style={{ color: "var(--red)" }}>[CẢNH BÁO] Nhiệt độ vượt ngưỡng an toàn. Đã gửi tín hiệu Threshold Alert tới bộ điều phối. Sẵn sàng cắt tải.</span>
                  ) : (
                    <span style={{ color: "var(--green)" }}>[BÌNH THƯỜNG] Các thông số môi trường nằm trong giới hạn thiết kế. Hàm mục tiêu tối ưu đang chạy ổn định.</span>
                  )}
                  <br /><br />
                  <span style={{ color: "var(--text-muted)" }}>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
