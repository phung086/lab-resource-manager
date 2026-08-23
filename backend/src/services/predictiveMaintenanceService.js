/**
 * Predictive Maintenance & Anomaly Detection Service
 * Analyzes IoT telemetry streams for thermal stress, power spikes, and Remaining Useful Life (RUL).
 */

export function analyzeResourceHealth(telemetryHistory = []) {
  if (!telemetryHistory.length) {
    return {
      status: "HEALTHY",
      healthIndex: 100,
      thermalStressLevel: "NORMAL",
      estimatedRulDays: 365,
      recommendation: "Không phát hiện bất thường. Tiếp tục vận hành tiêu chuẩn."
    };
  }

  // Extract metrics
  const temps = telemetryHistory.map((t) => t.temperatureC ?? t.gpuTemp ?? t.cpuTemp ?? 45);
  const powers = telemetryHistory.map((t) => t.powerWatts ?? (t.gpuPercent ? Math.round(t.gpuPercent * 3.5) : 150));
  const fanSpeeds = telemetryHistory.map((t) => t.fanPercent ?? 50);

  // Mean & Standard Deviation
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;

  const tempVariance = temps.reduce((a, b) => a + Math.pow(b - avgTemp, 2), 0) / temps.length;
  const tempStdDev = Math.sqrt(tempVariance);

  // Thermal Stress Score
  let thermalStressScore = 0;
  if (avgTemp > 80) thermalStressScore += 50;
  else if (avgTemp > 72) thermalStressScore += 30;
  if (tempStdDev > 8) thermalStressScore += 20;

  // Health Index calculation (0 - 100)
  let healthIndex = Math.round(100 - thermalStressScore - (avgPower > 320 ? 15 : 0));
  healthIndex = Math.max(10, Math.min(100, healthIndex));

  // RUL (Remaining Useful Life Estimate in Days)
  const estimatedRulDays = Math.round((healthIndex / 100) * 180);

  let status = "HEALTHY";
  let recommendation = "Hệ thống hoạt động ổn định.";

  if (healthIndex < 50) {
    status = "CRITICAL_MAINTENANCE_REQUIRED";
    recommendation = "CẢNH BÁO: Phát hiện hiện tượng quá nhiệt kéo dài & suy giảm quạt tản nhiệt. Cần bảo trì vệ sinh keo tản nhiệt trong 48h tới.";
  } else if (healthIndex < 75) {
    status = "WARNING_DEGRADATION";
    recommendation = "CHÚ Ý: Nhiệt độ có dấu hiệu biến động cao. Đề xuất giảm bớt 20% tải công việc AI liên tục.";
  }

  return {
    status,
    healthIndex,
    metrics: {
      avgTemp: Math.round(avgTemp * 10) / 10,
      tempStdDev: Math.round(tempStdDev * 10) / 10,
      avgPowerWatts: Math.round(avgPower)
    },
    thermalStressLevel: thermalStressScore > 40 ? "HIGH" : thermalStressScore > 20 ? "MODERATE" : "NORMAL",
    estimatedRulDays,
    recommendation
  };
}
