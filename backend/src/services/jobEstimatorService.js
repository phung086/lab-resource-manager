/**
 * Green AI & Job Resource Estimator Service
 * Simulates AI Model Execution workloads, energy consumption (kWh), cost (VND), and CO2 emissions.
 */

export function estimateJobImpact({ modelType = "LLM_FINETUNE", durationHours = 4, gpuCount = 2 }) {
  // Power profiles in Watts per GPU
  const powerProfiles = {
    LLM_FINETUNE: 400, // 400W per GPU
    VISION_TRAINING: 300,
    INFERENCE_BENCHMARK: 180,
    EMBEDDED_COMPUTE: 45
  };

  const wattPerGpu = powerProfiles[modelType] || 250;
  const totalPowerWatts = wattPerGpu * gpuCount;

  // Energy in kWh = (Watts * Hours) / 1000
  const energyKwh = Math.round(((totalPowerWatts * durationHours) / 1000) * 100) / 100;

  // Electricity cost rate in Vietnam (commercial/academic tariff ~ 2,500 VND/kWh)
  const electricityTariffVnd = 2500;
  const estimatedCostVnd = Math.round(energyKwh * electricityTariffVnd);

  // Carbon Intensity Factor (Vietnam grid avg ~ 0.72 kg CO2 / kWh)
  const carbonIntensityFactor = 0.72;
  const carbonFootprintKg = Math.round(energyKwh * carbonIntensityFactor * 100) / 100;

  // Suggested Green Execution Slot (Off-peak hours 22:00 - 06:00 get 30% lower carbon intensity)
  const greenSavingsKg = Math.round(carbonFootprintKg * 0.3 * 100) / 100;

  return {
    modelType,
    gpuCount,
    durationHours,
    totalPowerWatts,
    energyKwh,
    estimatedCostVnd,
    carbonFootprintKg,
    greenRecommendation: {
      offPeakSuggestion: "Nên lên lịch ca chạy vào khung giờ đêm (22:00 - 06:00) để tối ưu hóa năng lượng tái tạo.",
      potentialCarbonSavingsKg: greenSavingsKg
    }
  };
}
