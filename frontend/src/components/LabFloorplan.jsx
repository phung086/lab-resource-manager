import React, { useState } from "react";
import { Cpu, Radio, Server, ShieldCheck, Wrench, AlertTriangle, Activity } from "lucide-react";

export function LabFloorplan({ resources, onSelectResource }) {
  const [selectedZone, setSelectedZone] = useState(null);

  // Group resources into spatial zones
  const zones = [
    {
      id: "zone-gpu",
      name: "Khu vực Server Rack AI (GPU Cluster)",
      code: "RACK-ZONE-01",
      gridArea: "1 / 1 / 3 / 3",
      color: "color-mix(in srgb, var(--amber) 12%, transparent)",
      borderColor: "var(--amber)",
      type: "gpu_server",
      icon: Server,
      items: resources.filter((r) => r.type === "gpu_server")
    },
    {
      id: "zone-uav",
      name: "Khu vực Drone / UAV & Tự Hành",
      code: "UAV-BAY-02",
      gridArea: "1 / 3 / 2 / 5",
      color: "color-mix(in srgb, var(--teal) 12%, transparent)",
      borderColor: "var(--teal)",
      type: "uav",
      icon: Radio,
      items: resources.filter((r) => r.type === "uav")
    },
    {
      id: "zone-rpi",
      name: "Khu vực Kit Nhúng & IoT Sensors",
      code: "EMBEDDED-TABLE-03",
      gridArea: "2 / 3 / 4 / 4",
      color: "color-mix(in srgb, var(--violet) 12%, transparent)",
      borderColor: "var(--violet)",
      type: "raspberry_pi",
      icon: Cpu,
      items: resources.filter((r) => r.type === "raspberry_pi" || r.type === "kit")
    },
    {
      id: "zone-rooms",
      name: "Phòng Thí Nghiệm & Bàn Học Tận Nơi",
      code: "LAB-ROOMS-04",
      gridArea: "3 / 1 / 4 / 3",
      color: "color-mix(in srgb, var(--green) 12%, transparent)",
      borderColor: "var(--green)",
      type: "room",
      icon: ShieldCheck,
      items: resources.filter((r) => r.type === "room")
    }
  ];

  function getStatusBadgeClass(status) {
    switch (status) {
      case "available": return "status-online";
      case "in_use": return "status-busy";
      case "maintenance": return "status-warning";
      case "broken": return "status-danger";
      default: return "status-offline";
    }
  }

  return (
    <div className="card floorplan-card">
      <div className="card-header">
        <div>
          <h3>Digital Twin — Sơ Đồ Trực Quan Phòng Thí Nghiệm (Visual Floorplan)</h3>
          <p className="card-subtitle">Theo dõi trạng thái thiết bị thời gian thực theo không gian bố trí 2D</p>
        </div>
        <div className="floorplan-legend">
          <span className="legend-item"><span className="dot online"></span> Sẵn sàng</span>
          <span className="legend-item"><span className="dot busy"></span> Đang sử dụng</span>
          <span className="legend-item"><span className="dot warning"></span> Bảo trì</span>
          <span className="legend-item"><span className="dot danger"></span> Sự cố</span>
        </div>
      </div>

      <div className="floorplan-grid">
        {zones.map((zone) => {
          const ZoneIcon = zone.icon;
          return (
            <div
              key={zone.id}
              className={`floorplan-zone ${selectedZone === zone.id ? "selected" : ""}`}
              style={{
                gridArea: zone.gridArea,
                backgroundColor: zone.color,
                borderColor: zone.borderColor
              }}
              onClick={() => setSelectedZone(zone.id)}
            >
              <div className="zone-header">
                <ZoneIcon size={18} />
                <span className="zone-name">{zone.name}</span>
                <span className="zone-code">{zone.code}</span>
              </div>

              <div className="zone-equipment-grid">
                {zone.items.length === 0 ? (
                  <div className="zone-empty">Không có thiết bị trong khu vực này</div>
                ) : (
                  zone.items.map((item) => (
                    <div
                      key={item.id}
                      className={`equipment-node ${getStatusBadgeClass(item.operationalStatus || item.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectResource) onSelectResource(item);
                      }}
                      title={`${item.name} (${item.code})`}
                    >
                      <div className="node-indicator"></div>
                      <span className="node-code">{item.code}</span>
                      <span className="node-name">{item.name}</span>
                      {item.operationalStatus === "broken" && <AlertTriangle size={12} className="text-danger node-icon" />}
                      {item.operationalStatus === "maintenance" && <Wrench size={12} className="text-warning node-icon" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
