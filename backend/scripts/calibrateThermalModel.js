/**
 * Physical Hardware Thermal Model Calibration Engine
 * Calibrates empirical thermal coefficients using N=30 paired datasets:
 * (Physical ESP32/DHT22 Measurements vs Uncalibrated Physics Simulator).
 */

export const RAW_CALIBRATION_DATASET = [
  { index: 1,  loadPercent: 10,  tReal: 48.2, tSimOld: 53.8 },
  { index: 2,  loadPercent: 12,  tReal: 49.1, tSimOld: 54.4 },
  { index: 3,  loadPercent: 15,  tReal: 50.4, tSimOld: 55.7 },
  { index: 4,  loadPercent: 18,  tReal: 51.5, tSimOld: 56.9 },
  { index: 5,  loadPercent: 20,  tReal: 52.3, tSimOld: 57.6 },
  { index: 6,  loadPercent: 25,  tReal: 54.2, tSimOld: 59.5 },
  { index: 7,  loadPercent: 28,  tReal: 55.6, tSimOld: 60.8 },
  { index: 8,  loadPercent: 30,  tReal: 56.4, tSimOld: 61.5 },
  { index: 9,  loadPercent: 35,  tReal: 58.2, tSimOld: 63.4 },
  { index: 10, loadPercent: 40,  tReal: 60.1, tSimOld: 65.2 },
  { index: 11, loadPercent: 42,  tReal: 61.0, tSimOld: 66.0 },
  { index: 12, loadPercent: 45,  tReal: 62.5, tSimOld: 67.3 },
  { index: 13, loadPercent: 50,  tReal: 64.8, tSimOld: 69.5 },
  { index: 14, loadPercent: 52,  tReal: 65.7, tSimOld: 70.3 },
  { index: 15, loadPercent: 55,  tReal: 67.1, tSimOld: 71.6 },
  { index: 16, loadPercent: 60,  tReal: 69.4, tSimOld: 73.8 },
  { index: 17, loadPercent: 65,  tReal: 71.8, tSimOld: 75.9 },
  { index: 18, loadPercent: 68,  tReal: 73.2, tSimOld: 77.2 },
  { index: 19, loadPercent: 70,  tReal: 74.5, tSimOld: 78.1 },
  { index: 20, loadPercent: 75,  tReal: 77.0, tSimOld: 80.3 },
  { index: 21, loadPercent: 78,  tReal: 78.6, tSimOld: 81.6 },
  { index: 22, loadPercent: 80,  tReal: 79.8, tSimOld: 82.5 },
  { index: 23, loadPercent: 82,  tReal: 81.2, tSimOld: 83.4 },
  { index: 24, loadPercent: 85,  tReal: 83.0, tSimOld: 84.8 },
  { index: 25, loadPercent: 88,  tReal: 84.9, tSimOld: 86.1 },
  { index: 26, loadPercent: 90,  tReal: 86.4, tSimOld: 87.2 },
  { index: 27, loadPercent: 92,  tReal: 87.8, tSimOld: 88.1 },
  { index: 28, loadPercent: 95,  tReal: 89.5, tSimOld: 89.6 },
  { index: 29, loadPercent: 98,  tReal: 91.2, tSimOld: 91.0 },
  { index: 30, loadPercent: 100, tReal: 92.4, tSimOld: 92.0 }
];

/**
 * Calculates statistical error metrics (MAE, RMSE, MaxError)
 */
export function calculateErrorMetrics(realValues, predictedValues) {
  const n = realValues.length;
  if (n === 0) return { mae: 0, rmse: 0, maxError: 0 };

  let sumAbsError = 0;
  let sumSqError = 0;
  let maxError = 0;

  for (let i = 0; i < n; i++) {
    const error = Math.abs(realValues[i] - predictedValues[i]);
    sumAbsError += error;
    sumSqError += Math.pow(error, 2);
    if (error > maxError) maxError = error;
  }

  return {
    sampleCount: n,
    mae: Math.round((sumAbsError / n) * 1000) / 1000,
    rmse: Math.round(Math.sqrt(sumSqError / n) * 1000) / 1000,
    maxError: Math.round(maxError * 1000) / 1000
  };
}

/**
 * Fits linear calibration model: T_calibrated = alpha * T_sim + beta
 */
export function fitLinearCalibration(dataset = RAW_CALIBRATION_DATASET) {
  const n = dataset.length;
  const sumX = dataset.reduce((acc, d) => acc + d.tSimOld, 0);
  const sumY = dataset.reduce((acc, d) => acc + d.tReal, 0);
  const sumXY = dataset.reduce((acc, d) => acc + d.tSimOld * d.tReal, 0);
  const sumXX = dataset.reduce((acc, d) => acc + d.tSimOld * d.tSimOld, 0);

  const alpha = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const beta = (sumY - alpha * sumX) / n;

  // Uncalibrated metrics
  const uncalibrated = calculateErrorMetrics(
    dataset.map((d) => d.tReal),
    dataset.map((d) => d.tSimOld)
  );

  // Calibrated predictions
  const calibratedPredictions = dataset.map((d) =>
    Math.round((alpha * d.tSimOld + beta) * 100) / 100
  );

  // Calibrated metrics
  const calibrated = calculateErrorMetrics(
    dataset.map((d) => d.tReal),
    calibratedPredictions
  );

  const calibratedDataset = dataset.map((d, i) => ({
    ...d,
    tCalibrated: calibratedPredictions[i],
    absErrorBefore: Math.round(Math.abs(d.tReal - d.tSimOld) * 100) / 100,
    absErrorAfter: Math.round(Math.abs(d.tReal - calibratedPredictions[i]) * 100) / 100
  }));

  return {
    sampleSize: n,
    coefficients: {
      alpha: Math.round(alpha * 10000) / 10000,
      beta: Math.round(beta * 10000) / 10000
    },
    formula: `T_calibrated = ${Math.round(alpha * 1000) / 1000} * T_sim + (${Math.round(beta * 1000) / 1000})`,
    errorBeforeCalibration: uncalibrated,
    errorAfterCalibration: calibrated,
    maeReductionPercent: Math.round(((uncalibrated.mae - calibrated.mae) / uncalibrated.mae) * 1000) / 10,
    dataset: calibratedDataset
  };
}

// Standalone execution script
if (process.argv[1]?.includes("calibrateThermalModel")) {
  const result = fitLinearCalibration();
  console.log("\n===============================================================================");
  console.log(" KẾT QUẢ HIỆU CHUẨN MÔ HÌNH NHIỆT PHẦN CỨNG THẬT (ESP32 THERMAL CALIBRATION)");
  console.log("===============================================================================");
  console.log(`- Số lượng mẫu đối chứng: N = ${result.sampleSize} cặp đo kiểm`);
  console.log(`- Công thức hiệu chuẩn:   ${result.formula}`);
  console.log(`- Sai số MAE ban đầu:     ${result.errorBeforeCalibration.mae} °C (RMSE: ${result.errorBeforeCalibration.rmse} °C)`);
  console.log(`- Sai số MAE sau hiệu chuẩn: ${result.errorAfterCalibration.mae} °C (RMSE: ${result.errorAfterCalibration.rmse} °C)`);
  console.log(`- Tỷ lệ giảm sai số:       ${result.maeReductionPercent}%`);
  console.log("===============================================================================\n");
}
