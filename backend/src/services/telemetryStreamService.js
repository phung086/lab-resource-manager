/**
 * Physics-based IoT Telemetry Stream Generator & Real-time Sensor Simulator
 * Generates realistic time-series metrics for GPU Clusters, UAV Drones, and Embedded Edge Kits.
 */

// Baseline hardware operating parameters
const HARDWARE_PROFILES = {
  gpu_server: {
    baseTemp: 52,
    maxTemp: 90,
    basePower: 180,
    maxPower: 650,
    baseFanRpm: 2400,
    maxFanRpm: 5500,
    vibrationBaseline: 0.12 // mm/s
  },
  uav: {
    baseTemp: 38,
    maxTemp: 68,
    basePower: 45,
    maxPower: 180,
    batteryDischargeRate: 0.4, // % per minute in flight
    vibrationBaseline: 0.85
  },
  camera: {
    baseTemp: 34,
    maxTemp: 55,
    basePower: 12,
    maxPower: 25,
    vibrationBaseline: 0.05
  },
  default: {
    baseTemp: 40,
    maxTemp: 75,
    basePower: 50,
    maxPower: 200,
    vibrationBaseline: 0.10
  }
};

/**
 * Generates a realistic telemetry sample for a given resource with optional anomaly injection
 */
export function generateResourceTelemetry(resource, options = {}) {
  const profile = HARDWARE_PROFILES[resource.type] || HARDWARE_PROFILES.default;
  const isAnomaly = options.forceAnomaly || false;
  const loadFactor = options.loadFactor !== undefined ? options.loadFactor : (resource.status === "in_use" ? 0.78 : 0.15);

  // Add random physics walk noise (+- 2-5%)
  const noise = (Math.random() - 0.5) * 0.08;
  const effectiveLoad = Math.max(0.05, Math.min(1.0, loadFactor + noise));

  let temperatureC = profile.baseTemp + (profile.maxTemp - profile.baseTemp) * effectiveLoad;
  let powerWatts = profile.basePower + (profile.maxPower - profile.basePower) * effectiveLoad;
  let fanPercent = Math.round(30 + effectiveLoad * 65);
  let vibration = profile.vibrationBaseline * (1 + effectiveLoad * 0.5);

  // Inject realistic hardware anomalies
  if (isAnomaly || options.anomalyType === "thermal_runaway") {
    temperatureC = 91.4 + Math.random() * 3.5; // Critical GPU overheat
    powerWatts = profile.maxPower * 0.95;
    fanPercent = 98;
    vibration = 1.45; // High vibration from failing fan bearing
  } else if (options.anomalyType === "fan_stalling") {
    temperatureC = 86.2;
    fanPercent = 12; // Fan stalled
    vibration = 2.10; // Severe mechanical anomaly
  }

  // Memory bandwidth and GPU core utilization
  const gpuPercent = Math.round(effectiveLoad * 100);
  const memoryPercent = Math.round(Math.min(95, effectiveLoad * 85 + Math.random() * 10));

  return {
    resourceId: resource.id,
    resourceCode: resource.code,
    resourceName: resource.name,
    resourceType: resource.type,
    status: resource.status,
    timestamp: new Date().toISOString(),
    metrics: {
      temperatureC: Math.round(temperatureC * 10) / 10,
      powerWatts: Math.round(powerWatts),
      gpuPercent,
      memoryPercent,
      fanPercent,
      fanRpm: Math.round(profile.baseFanRpm + (profile.maxFanRpm - profile.baseFanRpm) * (fanPercent / 100)),
      vibrationMmS: Math.round(vibration * 100) / 100,
      thermalStatus: temperatureC >= 85 ? "CRITICAL" : temperatureC >= 72 ? "WARNING" : "OPTIMAL"
    }
  };
}

/**
 * Generates a full 24-hour historical telemetry wave for chart visualizers
 */
export function generate24HourTelemetryHistory(resource, isOverheating = false) {
  const history = [];
  const now = Date.now();

  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * 3600 * 1000);
    const hour = time.getHours();
    
    // Day peak vs night low usage curve
    const hourLoad = (hour >= 9 && hour <= 19) ? 0.75 : 0.20;
    const isLastPoints = isOverheating && i <= 3;

    const sample = generateResourceTelemetry(resource, {
      loadFactor: hourLoad,
      forceAnomaly: isLastPoints,
      anomalyType: isLastPoints ? "thermal_runaway" : null
    });

    history.push({
      ...sample.metrics,
      time: time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isoTime: time.toISOString()
    });
  }

  return history;
}
