import React, { useState, useEffect } from "react";
import { Server, Activity, Thermometer, Zap, ShieldCheck, AlertOctagon, RefreshCw, Cpu, Fan, Radio, Play } from "lucide-react";
import { apiRequest } from "../api.js";
import { DigitalTwinHeatmap } from "./DigitalTwinHeatmap.tsx";

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
      <div className="card" style={{ background: "var(--surface-card)", backdropFilter: "blur(16px)", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="led-pulse led-pulse-safe" />
            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--text-primary)", fontWeight: 700 }}>
              Phòng Lab Số Hóa & Bản Đồ Nhiệt Thời Gian Thực (Digital Twin & Live Heatmap)
            </h2>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
            Mô hình Bản sao số (Digital Twin) theo dõi tải nhiệt độ, công suất và telemetry cảm biến IoT thực tế tại Phòng Lab B603.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="btn-group" style={{ display: "flex", background: "var(--surface-strong)", border: "1px solid var(--line-strong)", borderRadius: 8, padding: 2 }}>
            <button
              className={`btn btn-sm ${viewMode === "isometric" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("isometric")}
              style={{ fontSize: "12px", padding: "4px 12px" }}
            >
              2D Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === "heatmap" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("heatmap")}
              style={{ fontSize: "12px", padding: "4px 12px" }}
            >
              Heatmap Nhiệt
            </button>
          </div>

          <button
            className="btn btn-sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${autoRefresh ? "var(--cyan-core)" : "var(--line)"}`, color: autoRefresh ? "var(--cyan-core)" : "var(--text-secondary)" }}
          >
            {autoRefresh && <span className="led-pulse led-pulse-cyan" />}
            <Radio size={14} className={autoRefresh ? "spin" : ""} />
            {autoRefresh ? "Live Stream (3s)" : "Đã tạm dừng"}
          </button>

          <button className="icon-button" onClick={fetchLiveMatrix} title="Làm mới ngay">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* LAB SUMMARY KPI STRIP */}
      {matrixData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div className="card" style={{ background: "var(--surface-card)", backdropFilter: "blur(16px)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(0, 229, 255, 0.12)", color: "var(--cyan-core)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Server size={20} />
            </div>
            <div>
              <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>ACTIVE NODES</div>
              <div className="font-mono" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>{matrixData.summary.totalNodesOnline} Nodes</div>
            </div>
          </div>

          <div className="card" style={{ background: "var(--surface-card)", backdropFilter: "blur(16px)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(245, 158, 11, 0.12)", color: "var(--amber-warn)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} />
            </div>
            <div>
              <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>LAB TOTAL POWER</div>
              <div className="font-mono" style={{ fontSize: "22px", fontWeight: 700, color: "var(--amber-warn)" }}>{matrixData.summary.totalPowerConsumptionKw} kW</div>
            </div>
          </div>

          <div className="card" style={{ background: "var(--surface-card)", backdropFilter: "blur(16px)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(239, 68, 68, 0.12)", color: "var(--rose-alert)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertOctagon size={20} />
            </div>
            <div>
              <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>CRITICAL ANOMALIES</div>
              <div className="font-mono" style={{ fontSize: "22px", fontWeight: 700, color: "var(--rose-alert)" }}>{matrixData.summary.criticalAnomalies}</div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CANVAS */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* LEFT PANE: 2D BLUEPRINT & HEATMAP VISUALIZATION */}
        <div style={{ flex: 2, minWidth: 400 }}>
          <DigitalTwinHeatmap
            onSelectNode={(nodeId) => {
              const found = matrixData?.nodes?.find((n) => n.resourceCode === nodeId || n.resourceId === nodeId);
              if (found) setSelectedNode(found);
            }}
          />
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
