import { useState, useEffect, useCallback, useRef } from "react";

export interface TelemetryNode {
  id: string;
  code: string;
  name: string;
  type: "gpu" | "uav" | "rpi";
  temperature: number; // °C
  powerWatts: number; // W
  metricCurrent: number; // VRAM GB / Battery % / CPU %
  metricMax: number;
  metricUnit: string;
  metricLabel: string;
  healthIndex: number; // 0-100%
  status: "active" | "docked" | "maintenance" | "warning";
  statusLabel: string;
  zone: string;
  zoneCode: string;
  secondaryMetric: {
    label: string;
    value: string;
  };
  isUnderMaintenance: boolean;
  history: number[]; // Last 10 temperature points
}

const INITIAL_NODES: TelemetryNode[] = [
  {
    id: "GPU-NODE-01",
    code: "GPU-NODE-01",
    name: "NVIDIA DGX A100 SuperPOD",
    type: "gpu",
    temperature: 58.0,
    powerWatts: 420,
    metricCurrent: 64.0,
    metricMax: 80.0,
    metricUnit: "GB",
    metricLabel: "VRAM",
    healthIndex: 96,
    status: "active",
    statusLabel: "HOẠT ĐỘNG",
    zone: "Server Rack AI",
    zoneCode: "RACK-ZONE-01",
    secondaryMetric: {
      label: "Cuda Cores",
      value: "6,912 Cores (PCIe 4.0)"
    },
    isUnderMaintenance: false,
    history: [56.8, 57.2, 57.5, 58.1, 58.4, 57.9, 58.2, 58.0]
  },
  {
    id: "UAV-MATRICE-300",
    code: "UAV-MATRICE-300",
    name: "DJI Matrice 300 RTK Drone",
    type: "uav",
    temperature: 28.5,
    powerWatts: 45,
    metricCurrent: 88,
    metricMax: 100,
    metricUnit: "%",
    metricLabel: "Pin Drone",
    healthIndex: 99,
    status: "docked",
    statusLabel: "DOCKED (READY)",
    zone: "Thiết Bị Bay Drone",
    zoneCode: "UAV-BAY-02",
    secondaryMetric: {
      label: "Tín hiệu RTK",
      value: "98% (Độ cao 0m)"
    },
    isUnderMaintenance: false,
    history: [28.1, 28.2, 28.4, 28.6, 28.5, 28.4, 28.5, 28.5]
  },
  {
    id: "RPI-KIT-05",
    code: "RPI-KIT-05",
    name: "Raspberry Pi 5 Edge AI Kit",
    type: "rpi",
    temperature: 42.0,
    powerWatts: 12,
    metricCurrent: 18,
    metricMax: 100,
    metricUnit: "%",
    metricLabel: "Tải CPU",
    healthIndex: 94,
    status: "active",
    statusLabel: "EDGE ACTIVE",
    zone: "Bàn Thí Nghiệm Nhúng",
    zoneCode: "EMBEDDED-TABLE-03",
    secondaryMetric: {
      label: "Bộ nhớ RAM",
      value: "4.2 / 8.0 GB LPDDR4X"
    },
    isUnderMaintenance: false,
    history: [41.2, 41.5, 41.8, 42.4, 42.1, 41.9, 42.0, 42.0]
  }
];

export function useLiveTelemetry(pollIntervalMs: number = 2500) {
  const [nodes, setNodes] = useState<TelemetryNode[]>(INITIAL_NODES);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("2026-09-09 00:00:00");
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tickTelemetry = useCallback(() => {
    setIsUpdating(true);
    const now = new Date();
    const timeString = `2026-09-09 ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setLastUpdated(timeString);

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.isUnderMaintenance) {
          return {
            ...node,
            status: "maintenance",
            statusLabel: "BẢO TRÌ",
            temperature: Math.max(24, +(node.temperature - 0.5).toFixed(1)),
            powerWatts: Math.max(5, Math.round(node.powerWatts * 0.8))
          };
        }

        // Apply realistic micro-jitter specified in requirements
        if (node.id === "GPU-NODE-01") {
          // 58°C ± 1.5°C, 420W ± 15W, VRAM 64GB ± 0.8GB
          const tempDelta = (Math.random() * 3 - 1.5);
          const nextTemp = +(58.0 + tempDelta).toFixed(1);
          const nextPower = Math.round(420 + (Math.random() * 30 - 15));
          const nextVram = +(64.0 + (Math.random() * 1.6 - 0.8)).toFixed(1);
          const history = [...node.history.slice(1), nextTemp];

          return {
            ...node,
            temperature: nextTemp,
            powerWatts: nextPower,
            metricCurrent: nextVram,
            status: nextTemp > 70 ? "warning" : "active",
            statusLabel: nextTemp > 70 ? "QUÁ NHIỆT" : "HOẠT ĐỘNG",
            history
          };
        }

        if (node.id === "UAV-MATRICE-300") {
          // Pin 88% ± 1%, Tín hiệu RTK 98%, Độ cao 0m (Docked)
          const nextBattery = Math.min(100, Math.max(80, Math.round(88 + (Math.random() * 2 - 1))));
          const nextTemp = +(28.5 + (Math.random() * 1.0 - 0.5)).toFixed(1);
          const nextPower = Math.round(45 + (Math.random() * 10 - 5));
          const history = [...node.history.slice(1), nextTemp];

          return {
            ...node,
            temperature: nextTemp,
            powerWatts: nextPower,
            metricCurrent: nextBattery,
            history
          };
        }

        if (node.id === "RPI-KIT-05") {
          // Nhiệt độ 42°C ± 0.8°C, Tải CPU 18% ± 4%
          const nextTemp = +(42.0 + (Math.random() * 1.6 - 0.8)).toFixed(1);
          const nextCpu = Math.min(100, Math.max(5, Math.round(18 + (Math.random() * 8 - 4))));
          const nextPower = Math.round(12 + (Math.random() * 3 - 1.5));
          const history = [...node.history.slice(1), nextTemp];

          return {
            ...node,
            temperature: nextTemp,
            powerWatts: nextPower,
            metricCurrent: nextCpu,
            history
          };
        }

        return node;
      })
    );

    // Flash green pulse flag for 450ms then reset
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      setIsUpdating(false);
    }, 450);
  }, []);

  useEffect(() => {
    tickTelemetry();
    const interval = setInterval(tickTelemetry, pollIntervalMs);
    return () => {
      clearInterval(interval);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, [tickTelemetry, pollIntervalMs]);

  const toggleNodeMaintenance = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              isUnderMaintenance: !n.isUnderMaintenance,
              status: !n.isUnderMaintenance ? "maintenance" : "active",
              statusLabel: !n.isUnderMaintenance ? "BẢO TRÌ" : "HOẠT ĐỘNG"
            }
          : n
      )
    );
  }, []);

  const getNode = useCallback(
    (nodeId: string) => nodes.find((n) => n.id === nodeId),
    [nodes]
  );

  return {
    nodes,
    isUpdating,
    lastUpdated,
    toggleNodeMaintenance,
    getNode,
    refreshNow: tickTelemetry
  };
}
