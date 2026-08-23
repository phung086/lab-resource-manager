import assert from "node:assert/strict";
import test from "node:test";

import { mqttSubscriberService } from "../src/services/mqttSubscriberService.js";
import { DATA_SOURCE_TYPES, computeEquipmentHealthIndex, computeResourceReadinessScore } from "../src/services/digitalTwinV2Service.js";
import { fitLinearCalibration, calculateErrorMetrics, RAW_CALIBRATION_DATASET } from "../scripts/calibrateThermalModel.js";
import { solveGeneticScheduling } from "../src/services/geneticSchedulerService.js";

test("Phase 1 - MQTT Telemetry: Ingests valid ESP32 sensor payload and sets source to REAL", () => {
  mqttSubscriberService.clearCache();

  const topic = "labtwin/GPU-H100-01/telemetry";
  const payload = JSON.stringify({
    deviceId: "GPU-H100-01",
    temperatureC: 62.45,
    humidityPercent: 48.0,
    powerWatts: 380,
    sequence: 1,
    source: "ESP32_PHYSICAL_SENSOR"
  });

  const sample = mqttSubscriberService.ingestTelemetryPayload(topic, payload);
  assert.ok(sample !== null, "Sample should be successfully parsed and ingested");
  assert.equal(sample.deviceId, "GPU-H100-01");
  assert.equal(sample.temperatureC, 62.45);
  assert.equal(sample.source, DATA_SOURCE_TYPES.REAL);

  const retrieved = mqttSubscriberService.getDeviceTelemetry("GPU-H100-01");
  assert.equal(retrieved.source, DATA_SOURCE_TYPES.REAL);
  assert.equal(retrieved.isStale, false);
});

test("Phase 1 - MQTT Telemetry: Handles malformed or out-of-range payloads safely without crashing", () => {
  // Malformed JSON
  const invalidJson = mqttSubscriberService.ingestTelemetryPayload("labtwin/GPU-H100-01/telemetry", "INVALID_JSON{[[}");
  assert.equal(invalidJson, null, "Should return null for invalid JSON");

  // Impossible temperature (>150C or <-40C)
  const impossibleTemp = mqttSubscriberService.ingestTelemetryPayload("labtwin/GPU-H100-01/telemetry", JSON.stringify({
    deviceId: "GPU-H100-01",
    temperatureC: 450.0
  }));
  assert.equal(impossibleTemp, null, "Should reject out-of-range physical temperature");
});

test("Phase 1 - MQTT Watchdog: Automatically flags STALE status when sensor heartbeat exceeds timeout", () => {
  mqttSubscriberService.clearCache();

  const topic = "labtwin/GPU-H100-01/telemetry";
  const payload = JSON.stringify({
    deviceId: "GPU-H100-01",
    temperatureC: 58.0,
    powerWatts: 300,
    source: "ESP32_PHYSICAL_SENSOR"
  });

  mqttSubscriberService.ingestTelemetryPayload(topic, payload);

  // Artificially age the entry past the 30s stale threshold
  const entry = mqttSubscriberService.physicalTelemetryCache.get("GPU-H100-01");
  entry.lastReceivedAt = Date.now() - 45000; // 45 seconds ago

  const retrieved = mqttSubscriberService.getDeviceTelemetry("GPU-H100-01");
  assert.equal(retrieved.source, DATA_SOURCE_TYPES.STALE, "Must transition to STALE state");
  assert.equal(retrieved.isStale, true);
  assert.ok(retrieved.staleElapsedSeconds >= 45);
  assert.ok(retrieved.warning.includes("Mất tín hiệu cảm biến vật lý"));
});

test("Phase 1 - Calibration: Computes MAE across N=30 real vs simulated data pairs with >70% error reduction", () => {
  assert.equal(RAW_CALIBRATION_DATASET.length, 30, "Calibration dataset must contain exactly N=30 pairs");

  const result = fitLinearCalibration(RAW_CALIBRATION_DATASET);
  assert.ok(result.sampleSize === 30);
  assert.ok(result.errorBeforeCalibration.mae > 3.0, "Uncalibrated MAE should be > 3.0 deg C");
  assert.ok(result.errorAfterCalibration.mae < 1.0, "Calibrated MAE must achieve < 1.0 deg C precision");
  assert.ok(result.maeReductionPercent >= 70.0, "Calibration must reduce MAE by at least 70%");
});

test("Phase 1 - Feedback Loop: Physical overheat (88.5 deg C) triggers CRITICAL tier and readiness drop", () => {
  const normalHealth = computeEquipmentHealthIndex({ temperatureC: 55.0, powerWatts: 250 });
  assert.ok(normalHealth.healthIndex >= 85);
  assert.ok(normalHealth.tier === "Xuất Sắc" || normalHealth.tier === "Khỏe Mạnh");

  // Heated sensor trigger with high thermal & power stress
  const overheatedHealth = computeEquipmentHealthIndex({
    temperatureC: 88.5,
    powerWatts: 620,
    vibrationMmS: 1.8,
    gpuPercent: 95
  });
  assert.equal(overheatedHealth.tier, "Nguy Hiểm / Dừng Khẩn Cấp", "Must be CRITICAL tier when T >= 85C");

  const mockResource = { id: "res-gpu-01", code: "GPU-H100-01", name: "GPU H100 Node 1", operationalStatus: "available" };
  const mockTelemetry = { metrics: { temperatureC: 88.5, powerWatts: 620, vibrationMmS: 1.8, gpuPercent: 95 } };

  const readiness = computeResourceReadinessScore(mockResource, mockTelemetry);
  assert.ok(readiness.readinessScore < 60, "Readiness Score must drop below 60 under thermal runaway");
  assert.equal(readiness.isRecommendedForScheduling, false, "Must not recommend overheated node for new jobs");
});

test("Phase 1 - End-to-End Re-Optimization: Overheated physical node causes automatic task migration", () => {
  const hotResource = { id: "res-hot", code: "GPU-H100-HOT", name: "GPU Node Overheated", operationalStatus: "available" };
  const coolResource = { id: "res-cool", code: "GPU-L40S-COOL", name: "GPU Node Cool Backup", operationalStatus: "available" };

  const requests = [
    { id: "req-urgent-1", title: "Training Model", userRole: "phd_researcher", projectUrgency: "paper_deadline", durationHours: 2, powerWatts: 400, preferredStartHour: 9 }
  ];

  const solverResult = solveGeneticScheduling({
    requests,
    resources: [coolResource, hotResource],
    populationSize: 20,
    maxGenerations: 10
  });

  assert.ok(solverResult.success);
  assert.ok(solverResult.optimalSchedule.length === 1);
  assert.equal(solverResult.metrics.conflicts, 0);
});
