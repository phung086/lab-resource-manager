import React, { useState } from "react";
import {
  Server,
  Radio,
  Cpu,
  Layers,
  Flame,
  Thermometer,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Maximize2
} from "lucide-react";
import { TelemetryNode } from "../hooks/useLiveTelemetry.ts";

export interface BlueprintEquipment {
  id: string;
  code: string;
  name: string;
  type: "gpu" | "uav" | "rpi" | "sensor";
  temperature: number;
  load: number;
  powerWatts: number;
  status: "available" | "in_use" | "warning" | "maintenance";
  position: { x: number; y: number };
  zoneId: string;
}

export interface BlueprintZone {
  id: string;
  code: string;
  name: string;
  category: string;
  heatLevel: "high" | "medium" | "cool";
  color: string;
  borderColor: string;
  equipments: BlueprintEquipment[];
}

export interface DigitalTwinHeatmapProps {
  telemetryNodes?: TelemetryNode[];
  onSelectNode?: (nodeId: string) => void;
}

export const DigitalTwinHeatmap: React.FC<DigitalTwinHeatmapProps> = ({
  telemetryNodes = [],
  onSelectNode
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "heatmap">("heatmap");
  const [hoveredEquipment, setHoveredEquipment] = useState<BlueprintEquipment | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fallback / real-time matched values from hook
  const gpuNode = telemetryNodes.find((n) => n.id === "GPU-NODE-01");
  const uavNode = telemetryNodes.find((n) => n.id === "UAV-MATRICE-300");
  const rpiNode = telemetryNodes.find((n) => n.id === "RPI-KIT-05");

  const zones: BlueprintZone[] = [
    {
      id: "rack-zone",
      code: "RACK-ZONE-01",
      name: "KHU SERVER RACK AI",
      category: "High-Performance Compute",
      heatLevel: "high",
      color: "rgba(245, 158, 11, 0.08)",
      borderColor: "rgba(245, 158, 11, 0.4)",
      equipments: [
        {
          id: "GPU-NODE-01",
          code: "GPU-NODE-01",
          name: "NVIDIA DGX A100 SuperPOD",
          type: "gpu",
          temperature: gpuNode ? gpuNode.temperature : 58.2,
          load: gpuNode ? Math.round((gpuNode.metricCurrent / gpuNode.metricMax) * 100) : 80,
          powerWatts: gpuNode ? gpuNode.powerWatts : 420,
          status: gpuNode && gpuNode.temperature > 70 ? "warning" : "in_use",
          position: { x: 30, y: 35 },
          zoneId: "RACK-ZONE-01"
        },
        {
          id: "GPU-H100-02",
          code: "GPU-H100-02",
          name: "NVIDIA DGX H100 Node 02",
          type: "gpu",
          temperature: 63.5,
          load: 85,
          powerWatts: 680,
          status: "in_use",
          position: { x: 65, y: 35 },
          zoneId: "RACK-ZONE-01"
        },
        {
          id: "RTX-4090-RACK",
          code: "RTX-4090-RACK",
          name: "Edge Training RTX 4090 Rig",
          type: "gpu",
          temperature: 48.0,
          load: 45,
          powerWatts: 350,
          status: "available",
          position: { x: 48, y: 72 },
          zoneId: "RACK-ZONE-01"
        }
      ]
    },
    {
      id: "uav-bay",
      code: "UAV-BAY-02",
      name: "KHU THIẾT BỊ BAY DRONE",
      category: "Autonomous Aerial Robotics",
      heatLevel: "cool",
      color: "rgba(0, 229, 255, 0.06)",
      borderColor: "rgba(0, 229, 255, 0.35)",
      equipments: [
        {
          id: "UAV-MATRICE-300",
          code: "UAV-MATRICE-300",
          name: "DJI Matrice 300 RTK Drone",
          type: "uav",
          temperature: uavNode ? uavNode.temperature : 28.5,
          load: uavNode ? Math.round((uavNode.metricCurrent / uavNode.metricMax) * 100) : 88,
          powerWatts: uavNode ? uavNode.powerWatts : 45,
          status: "available",
          position: { x: 35, y: 45 },
          zoneId: "UAV-BAY-02"
        },
        {
          id: "FLIR-THERMAL-01",
          code: "FLIR-THERMAL-01",
          name: "FLIR Vue Pro R Thermal Payload",
          type: "sensor",
          temperature: 26.0,
          load: 20,
          powerWatts: 15,
          status: "available",
          position: { x: 68, y: 45 },
          zoneId: "UAV-BAY-02"
        }
      ]
    },
    {
      id: "embedded-table",
      code: "EMBEDDED-TABLE-03",
      name: "KHU BÀN THÍ NGHIỆM NHÚNG",
      category: "IoT Edge & Microcontrollers",
      heatLevel: "medium",
      color: "rgba(139, 92, 246, 0.06)",
      borderColor: "rgba(139, 92, 246, 0.35)",
      equipments: [
        {
          id: "RPI-KIT-05",
          code: "RPI-KIT-05",
          name: "Raspberry Pi 5 Edge AI Kit",
          type: "rpi",
          temperature: rpiNode ? rpiNode.temperature : 42.0,
          load: rpiNode ? Math.round((rpiNode.metricCurrent / rpiNode.metricMax) * 100) : 18,
          powerWatts: rpiNode ? rpiNode.powerWatts : 12,
          status: "in_use",
          position: { x: 30, y: 50 },
          zoneId: "EMBEDDED-TABLE-03"
        },
        {
          id: "JETSON-ORIN-02",
          code: "JETSON-ORIN-02",
          name: "NVIDIA Jetson Orin Nano",
          type: "rpi",
          temperature: 39.5,
          load: 32,
          powerWatts: 18,
          status: "available",
          position: { x: 70, y: 50 },
          zoneId: "EMBEDDED-TABLE-03"
        }
      ]
    }
  ];

  return (
    <div className="digital-twin-heatmap-card-2026">
      {/* Top Header Command Strip */}
      <div className="blueprint-header-strip-2026">
        <div className="blueprint-title-group-2026">
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-cyan" />
            <h2 className="blueprint-title-2026">BẢN SAO SỐ & BẢN ĐỒ NHIỆT LAB B603</h2>
          </div>
          <p className="blueprint-subtext-2026">
            Mặt bằng kỹ thuật Blueprint tích hợp cảm biến nhiệt độ thời gian thực & radar HUD ngắm góc
          </p>
        </div>

        {/* View mode segmented switcher */}
        <div className="blueprint-actions-2026">
          <div className="segmented-control-2026">
            <button
              type="button"
              className={`segmented-btn-2026 ${viewMode === "heatmap" ? "is-active" : ""}`}
              onClick={() => setViewMode("heatmap")}
            >
              <Flame size={12} className="inline mr-1 text-amber-400" />
              Bản Đồ Nhiệt Heatmap
            </button>
            <button
              type="button"
              className={`segmented-btn-2026 ${viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Layers size={12} className="inline mr-1 text-cyan-400" />
              Sơ Đồ Khối 2D Grid
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Legend Bar */}
      <div className="blueprint-legend-bar-2026">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10.5px] text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Thang Nhiệt Độ Cảm Biến:
          </span>
          <div className="thermal-gradient-bar shrink-0" />
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300 whitespace-nowrap">
            <span>20°C (Mát)</span>
            <span>•</span>
            <span className="text-amber-400">55°C (Tải vừa)</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">&gt;70°C (Quá nhiệt)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span className="led-pulse led-pulse-safe" />
            <span className="text-slate-300">Sẵn Sàng</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="led-pulse led-pulse-cyan" />
            <span className="text-slate-300">Đang Chạy Tải</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="led-pulse led-pulse-alert" />
            <span className="text-slate-300">Cần Chú Ý</span>
          </span>
        </div>
      </div>

      {/* Technical Blueprint Canvas with Dot Grid Background */}
      <div className="blueprint-canvas-viewport-2026">
        {/* Background Heat Blobs when Heatmap is active */}
        {viewMode === "heatmap" && (
          <div className="heatmap-clouds-overlay-2026">
            <div className="heat-cloud cloud-gpu" />
            <div className="heat-cloud cloud-uav" />
            <div className="heat-cloud cloud-rpi" />
          </div>
        )}

        {/* 3 Distinct Blueprint Zones */}
        <div className="blueprint-zones-grid-2026">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`blueprint-zone-panel-2026 ${
                viewMode === "heatmap" ? "is-heatmap-active" : ""
              }`}
              style={{
                borderColor: zone.borderColor,
                backgroundColor: zone.color
              }}
            >
              {/* Zone Header Label */}
              <div className="zone-blueprint-header-2026">
                <div className="zone-blueprint-header-row">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30 whitespace-nowrap shrink-0">
                    {zone.code}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider text-right truncate">
                    {zone.category}
                  </span>
                </div>
                <div className="font-semibold text-xs text-white tracking-wide mt-1">
                  {zone.name}
                </div>
              </div>

              {/* Equipment Modules inside Zone */}
              <div className="zone-equipments-grid-2026">
                {zone.equipments.map((eq) => {
                  const isHovered = hoveredEquipment?.id === eq.id;

                  return (
                    <div
                      key={eq.id}
                      onClick={() => (onSelectNode ? onSelectNode(eq.id) : null)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoverPos({ x: rect.left, y: rect.top - 10 });
                        setHoveredEquipment(eq);
                      }}
                      onMouseLeave={() => setHoveredEquipment(null)}
                      className={`hud-equipment-module-2026 ${
                        isHovered ? "is-hud-hovered" : ""
                      } ${eq.status === "warning" ? "is-warning" : ""}`}
                    >
                      {/* 4 Corner HUD Reticles */}
                      <span className="hud-corner hud-top-left" />
                      <span className="hud-corner hud-top-right" />
                      <span className="hud-corner hud-bottom-left" />
                      <span className="hud-corner hud-bottom-right" />

                      {/* Equipment Card Body */}
                      <div className="equipment-module-body">
                        <div className="equipment-top-row">
                          <span className="font-mono text-xs font-bold text-white tracking-wider">
                            {eq.code}
                          </span>
                          <span
                            className={`led-pulse ${
                              eq.temperature > 70
                                ? "led-pulse-alert"
                                : eq.status === "in_use"
                                ? "led-pulse-cyan"
                                : "led-pulse-safe"
                            }`}
                          />
                        </div>

                        <div className="equipment-name-text text-[11px] text-slate-300 truncate">
                          {eq.name}
                        </div>

                        {/* Telemetry Bar */}
                        <div className="equipment-quick-telemetry-row font-mono text-[10.5px]">
                          <span
                            className={
                              eq.temperature > 70
                                ? "text-rose-400 font-bold"
                                : eq.temperature > 50
                                ? "text-amber-400"
                                : "text-cyan-400"
                            }
                          >
                            {eq.temperature}°C
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300">{eq.load}% Tải</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-amber-300">{eq.powerWatts}W</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Popover Tooltip Kính Mờ on Hover */}
        {hoveredEquipment && (
          <div
            className="hud-popover-tooltip-2026 animate-fadeIn"
            style={{
              position: "fixed",
              left: `${hoverPos.x}px`,
              top: `${hoverPos.y - 120}px`,
              transform: "translateX(-20%)",
              pointerEvents: "none",
              zIndex: 1000
            }}
          >
            <div className="popover-header">
              <span className="font-mono text-xs font-bold text-cyan-300">
                {hoveredEquipment.code}
              </span>
              <span className="popover-zone-tag font-mono text-[9.5px]">
                {hoveredEquipment.zoneId}
              </span>
            </div>
            <div className="popover-title text-white font-medium text-xs mb-2">
              {hoveredEquipment.name}
            </div>
            <div className="popover-grid-telemetry font-mono text-[11px]">
              <div>
                Nhiệt độ tức thời:{" "}
                <strong
                  className={
                    hoveredEquipment.temperature > 70 ? "text-rose-400" : "text-cyan-400"
                  }
                >
                  {hoveredEquipment.temperature}°C
                </strong>
              </div>
              <div>
                Tải hệ thống:{" "}
                <strong className="text-amber-300">{hoveredEquipment.load}%</strong>
              </div>
              <div>
                Công suất nguồn:{" "}
                <strong className="text-emerald-400">{hoveredEquipment.powerWatts}W</strong>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                MESH Latency: <strong>1.2ms (Zero Packet Loss)</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
