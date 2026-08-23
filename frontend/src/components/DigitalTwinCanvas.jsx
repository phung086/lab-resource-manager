import React, { useState, useEffect } from "react";
import { Server, Activity, Thermometer, Zap, ShieldCheck, AlertOctagon, RefreshCw, Cpu, Fan, Radio, Play } from "lucide-react";

export function DigitalTwinCanvas() {
  const [matrixData, setMatrixData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState("isometric"); // 'isometric' | 'heatmap'

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  async function fetchLiveMatrix() {
    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/simulation/live-matrix`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
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
    if (temp >= 85) return "rgba(239, 68, 68, 0.85)"; // Red
    if (temp >= 72) return "rgba(245, 158, 11, 0.75)"; // Amber
    if (temp >= 55) return "rgba(59, 130, 246, 0.65)"; // Blue
    return "rgba(16, 185, 129, 0.55)"; // Cool Green
  }

  return (
    <div className="content-stack">
      {/* HEADER COMMAND BAR */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="live-indicator" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Phòng Lab Số Hóa & Bản Đồ Nhiệt Thời Gian Thực (Digital Twin & Live Heatmap)</h2>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Mô hình Bản sao số (Digital Twin) theo dõi tải nhiệt độ, công suất và telemetry cảm biến IoT thực tế tại Phòng Lab B603
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="btn-group" style={{ display: "flex", background: "rgba(0,0,0,0.06)", borderRadius: 8, padding: 2 }}>
            <button
              className={`btn btn-sm ${viewMode === "isometric" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("isometric")}
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
            >
              Mô hình 2D Racks
            </button>
            <button
              className={`btn btn-sm ${viewMode === "heatmap" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("heatmap")}
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
            >
              Bản đồ nhiệt Thermal Matrix
            </button>
          </div>

          <button
            className={`btn btn-sm ${autoRefresh ? "btn-success" : "btn-ghost"}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Radio size={14} className={autoRefresh ? "spin" : ""} />
            {autoRefresh ? "Live Stream (3s)" : "Đã tạm dừng"}
          </button>

          <button className="btn btn-sm btn-ghost" onClick={fetchLiveMatrix} title="Làm mới ngay">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* LAB SUMMARY KPI STRIP */}
      {matrixData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div className="card" style={{ padding: "12px 16px", borderLeft: "4px solid #3b82f6" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Tổng Thiết Bị Kết Nối</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 4 }}>{matrixData.summary.totalNodesOnline} Nodes Online</div>
          </div>

          <div className="card" style={{ padding: "12px 16px", borderLeft: "4px solid #f59e0b" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Tổng Công Suất Tiêu Thụ</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 4, color: "#d97706" }}>
              <Zap size={18} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              {matrixData.summary.totalPowerConsumptionKw} kW
            </div>
          </div>

          <div className="card" style={{ padding: "12px 16px", borderLeft: "4px solid #10b981" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Nhiệt Độ Trung Bình Sàn Lab</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 4, color: matrixData.summary.averageLabTemperatureC > 70 ? "#ef4444" : "#059669" }}>
              <Thermometer size={18} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              {matrixData.summary.averageLabTemperatureC} °C
            </div>
          </div>

          <div className="card" style={{ padding: "12px 16px", borderLeft: "4px solid #8b5cf6" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Chỉ Số Hiệu Suất Năng Lượng PUE</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 4, color: "#7c3aed" }}>
              {matrixData.summary.labPueIndex} (Chuẩn Green Lab)
            </div>
          </div>
        </div>
      )}

      {/* MAIN DIGITAL TWIN INTERACTIVE WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* FLOORPLAN / HEATMAP CANVAS */}
        <div className="card" style={{ minHeight: 480, position: "relative", overflow: "hidden", background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b" }}>
          <div style={{ position: "absolute", top: 12, left: 16, zIndex: 10, color: "#94a3b8", fontSize: "0.8rem", display: "flex", gap: 16 }}>
            <span>📍 Khu Vực: Tòa Nhà AI & IoT (B603)</span>
            <span>📐 Tỷ Lệ Bản Đồ: 1:50</span>
          </div>

          {/* Grid lines background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              opacity: 0.5
            }}
          />

          {/* Canvas Nodes Container */}
          <div style={{ position: "relative", width: "100%", height: 460, padding: "40px 20px" }}>
            {matrixData?.nodes?.map((node) => {
              const isSelected = selectedNode?.resourceId === node.resourceId;
              const heatColor = getHeatColor(node.metrics.temperatureC);

              return (
                <div
                  key={node.resourceId}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    position: "absolute",
                    left: `${node.locationCoordinates?.x || 100}px`,
                    top: `${node.locationCoordinates?.y || 100}px`,
                    transform: "translate(-50%, -50%)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    zIndex: isSelected ? 20 : 5
                  }}
                >
                  {/* Heatmap Glow Aura */}
                  {viewMode === "heatmap" && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${heatColor} 0%, transparent 70%)`,
                        pointerEvents: "none",
                        animation: "pulse 2s infinite"
                      }}
                    />
                  )}

                  {/* Rack / Device Box */}
                  <div
                    style={{
                      width: 140,
                      padding: "10px 12px",
                      background: isSelected ? "#1e293b" : "rgba(15, 23, 42, 0.9)",
                      border: isSelected ? "2px solid #3b82f6" : `1px solid ${node.metrics.temperatureC >= 85 ? "#ef4444" : (node.source === "REAL" ? "#10b981" : "#334155")}`,
                      borderRadius: 8,
                      boxShadow: isSelected ? "0 0 20px rgba(59, 130, 246, 0.5)" : (node.source === "REAL" ? "0 0 12px rgba(16, 185, 129, 0.25)" : "0 4px 12px rgba(0,0,0,0.5)"),
                      color: "#fff"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8" }}>{node.resourceCode}</span>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontFamily: "var(--font-mono)",
                          padding: "1px 5px",
                          borderRadius: 3,
                          fontWeight: 700,
                          background: node.source === "REAL" ? "rgba(16, 185, 129, 0.2)" : (node.source === "STALE" ? "rgba(245, 158, 11, 0.2)" : "rgba(56, 189, 248, 0.15)"),
                          color: node.source === "REAL" ? "#10b981" : (node.source === "STALE" ? "#f59e0b" : "#38bdf8"),
                          border: `1px solid ${node.source === "REAL" ? "rgba(16, 185, 129, 0.4)" : (node.source === "STALE" ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.25)")}`
                        }}
                      >
                        {node.source === "REAL" ? "● REAL" : (node.source === "STALE" ? "⚠ STALE" : "SIM")}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.72rem", color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {node.resourceName}
                    </div>

                    {/* Sensor Metric Tags */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.7rem", color: "#94a3b8" }}>
                      <span style={{ color: node.metrics.temperatureC >= 80 ? "#f87171" : "#34d399", fontWeight: 600 }}>
                        {node.metrics.temperatureC}°C
                      </span>
                      <span>{node.metrics.powerWatts}W</span>
                      <span>{node.metrics.gpuPercent}% Load</span>
                    </div>

                    {/* Utilization Bar */}
                    <div style={{ width: "100%", height: 3, background: "#334155", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${node.metrics.gpuPercent}%`,
                          height: "100%",
                          background: node.metrics.gpuPercent > 80 ? "#f59e0b" : "#3b82f6",
                          transition: "width 0.5s ease"
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas Bottom Legend */}
          <div style={{ position: "absolute", bottom: 12, left: 16, right: 16, display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> &lt; 60°C (Mát)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} /> 60°C - 75°C (Tiêu chuẩn)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> 75°C - 85°C (Tải cao)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> &gt; 85°C (Quá nhiệt)
              </span>
            </div>
            <span>Click vào máy chủ trên sơ đồ để xem chẩn đoán trực tiếp</span>
          </div>
        </div>

        {/* NODE TELEMETRY INSPECTOR (SIDE PANEL) */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: 10 }}>
            <div>
              <strong style={{ fontSize: "1rem" }}>{selectedNode ? selectedNode.resourceName : "Chưa chọn thiết bị"}</strong>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Mã: {selectedNode?.resourceCode || "N/A"}</div>
            </div>
            <span className={`badge ${selectedNode?.metrics?.thermalStatus === "CRITICAL" ? "danger" : selectedNode?.metrics?.thermalStatus === "WARNING" ? "amber" : "success"}`}>
              {selectedNode?.metrics?.thermalStatus || "ACTIVE"}
            </span>
          </div>

          {selectedNode ? (
            <div className="form-stack" style={{ gap: 14, marginTop: 14 }}>
              {/* METRIC GAUGES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(59, 130, 246, 0.06)", padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Nhiệt Độ GPU/Core</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: selectedNode.metrics.temperatureC > 80 ? "#ef4444" : "#2563eb", marginTop: 2 }}>
                    {selectedNode.metrics.temperatureC} °C
                  </div>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.06)", padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Công Suất Tức Thời</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#d97706", marginTop: 2 }}>
                    {selectedNode.metrics.powerWatts} W
                  </div>
                </div>

                <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>GPU Core Usage</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#059669", marginTop: 2 }}>
                    {selectedNode.metrics.gpuPercent} %
                  </div>
                </div>

                <div style={{ background: "rgba(139, 92, 246, 0.06)", padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Quạt Tản Nhiệt (RPM)</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#7c3aed", marginTop: 2 }}>
                    {selectedNode.metrics.fanRpm} RPM
                  </div>
                </div>
              </div>

              {/* DETAILED SENSOR STATS */}
              <div style={{ fontSize: "0.85rem", background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 8 }} className="form-stack">
                <div className="row between">
                  <span>Nguồn dữ liệu Telemetry:</span>
                  <strong style={{ color: selectedNode.source === "REAL" ? "#10b981" : (selectedNode.source === "STALE" ? "#f59e0b" : "#38bdf8") }}>
                    {selectedNode.source === "REAL" ? "Cảm biến vật lý ESP32 (REAL)" : (selectedNode.source === "STALE" ? "Mất tín hiệu (STALE FALLBACK)" : "Mô phỏng vật lý (SIMULATED)")}
                  </strong>
                </div>
                <div className="row between">
                  <span>Mức độ rung chấn cơ học:</span>
                  <strong>{selectedNode.metrics.vibrationMmS} mm/s</strong>
                </div>
                <div className="row between">
                  <span>Tải băng thông bộ nhớ VRAM:</span>
                  <strong>{selectedNode.metrics.memoryPercent} %</strong>
                </div>
                <div className="row between">
                  <span>Trạng thái hoạt động:</span>
                  <span className="badge success">{selectedNode.status}</span>
                </div>
                <div className="row between">
                  <span>Cập nhật lần cuối:</span>
                  <span style={{ color: "#64748b" }}>{new Date(selectedNode.timestamp).toLocaleTimeString("vi-VN")}</span>
                </div>
              </div>

              {/* STALE WARNING BANNER */}
              {selectedNode.staleInfo?.isStale && (
                <div className="alert amber" style={{ fontSize: "0.8rem", padding: "8px 12px" }}>
                  <AlertOctagon size={16} />
                  <span>{selectedNode.staleInfo.warning}</span>
                </div>
              )}

              {/* LIVE PULSE OVERHEAT WARNING */}
              {selectedNode.metrics.temperatureC >= 85 && (
                <div className="alert danger" style={{ fontSize: "0.8rem", padding: "8px 12px" }}>
                  <AlertOctagon size={16} />
                  <span>CẢNH BÁO: Nhiệt độ vượt ngưỡng tới hạn 85°C. Đề xuất kích hoạt Failover chuyển tải.</span>
                </div>
              )}
            </div>
          ) : (
            <p className="empty-state">Chọn một máy chủ để xem thông số</p>
          )}
        </div>
      </div>
    </div>
  );
}
