/**
 * Physical IoT Digital Twin MQTT Telemetry Subscriber Service
 * Subscribes to physical hardware sensor streams (ESP32/DHT22/DS18B20) via Mosquitto MQTT Broker.
 * Manages REAL vs STALE telemetry state machine with heartbeat watchdog.
 */

import mqtt from "mqtt";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { DATA_SOURCE_TYPES } from "./digitalTwinV2Service.js";

class MqttSubscriberService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.staleTimeoutMs = (config.mqttStaleTimeoutSec || 30) * 1000;
    this.physicalTelemetryCache = new Map();
    this.listeners = new Set();
  }

  /**
   * Initializes connection to Mosquitto MQTT Broker
   */
  start(brokerUrl = config.mqttBrokerUrl || "mqtt://localhost:1883") {
    try {
      this.client = mqtt.connect(brokerUrl, {
        reconnectPeriod: 5000,
        connectTimeout: 4000,
        clientId: `smart_lab_backend_${Math.random().toString(16).substring(2, 8)}`
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        const subscriptionTopic = "labtwin/+/telemetry";
        this.client.subscribe(subscriptionTopic, (err) => {
          if (!err) {
            console.log(`[MQTT Subscriber] Subscribed to ${subscriptionTopic} on ${brokerUrl}`);
          }
        });
      });

      this.client.on("message", (topic, message) => {
        this.ingestTelemetryPayload(topic, message.toString());
      });

      this.client.on("error", (err) => {
        // Non-blocking error logging (standalone mode fallback)
        this.isConnected = false;
      });

      this.client.on("offline", () => {
        this.isConnected = false;
      });
    } catch (err) {
      console.warn("[MQTT Subscriber] Broker offline, operating in standalone/mock mode.");
    }
  }

  /**
   * Parses and validates telemetry payload from physical sensor topic
   * Topic pattern: labtwin/{deviceId}/telemetry
   */
  ingestTelemetryPayload(topic, rawPayload) {
    try {
      const topicParts = topic.split("/");
      if (topicParts.length < 3 || topicParts[0] !== "labtwin" || topicParts[2] !== "telemetry") {
        return null;
      }

      const topicDeviceId = topicParts[1];
      let data;
      try {
        data = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
      } catch (_e) {
        return null; // Ignore malformed JSON packets without crashing
      }

      const deviceId = data.deviceId || topicDeviceId;
      const temperatureC = Number(data.temperatureC);
      if (isNaN(temperatureC) || temperatureC < -40 || temperatureC > 150) {
        return null; // Reject impossible sensor values
      }

      const powerWatts = Number(data.powerWatts) || 250;
      const humidityPercent = Number(data.humidityPercent) || 50;
      const gpuPercent = Number(data.gpuPercent) || Math.min(100, Math.round(Math.max(10, (temperatureC - 45) * 2.2)));

      const sample = {
        deviceId,
        temperatureC: Math.round(temperatureC * 100) / 100,
        humidityPercent: Math.round(humidityPercent * 10) / 10,
        powerWatts: Math.round(powerWatts),
        gpuPercent,
        vibrationMmS: Number(data.vibrationMmS) || (temperatureC > 80 ? 1.45 : 0.15),
        sequence: Number(data.sequence) || 0,
        source: DATA_SOURCE_TYPES.REAL,
        lastReceivedAt: Date.now(),
        timestamp: new Date().toISOString()
      };

      this.physicalTelemetryCache.set(deviceId, sample);
      this.physicalTelemetryCache.set(deviceId.toUpperCase(), sample);

      // Async ingestion into database if resource exists (non-blocking)
      this.persistSampleToDatabase(deviceId, sample).catch(() => {});

      // Notify any active SSE/WebSocket listeners
      this.notifyListeners(sample);

      return sample;
    } catch (err) {
      console.error("[MQTT Ingest Error]", err);
      return null;
    }
  }

  /**
   * Retrieves telemetry for a given resource with automatic STALE/SIMULATED fallback
   */
  getDeviceTelemetry(deviceIdentifier, simulatedFallback = null) {
    if (!deviceIdentifier) return simulatedFallback;

    const entry = this.physicalTelemetryCache.get(deviceIdentifier) ||
                  this.physicalTelemetryCache.get(String(deviceIdentifier).toUpperCase());

    if (!entry) {
      return simulatedFallback;
    }

    const elapsedMs = Date.now() - entry.lastReceivedAt;
    const isStale = elapsedMs > this.staleTimeoutMs;

    if (isStale) {
      return {
        ...entry,
        source: DATA_SOURCE_TYPES.STALE,
        isStale: true,
        staleElapsedSeconds: Math.round(elapsedMs / 1000),
        warning: `Mất tín hiệu cảm biến vật lý quá ${Math.round(elapsedMs / 1000)}s. Hệ thống tự động fallback về trạng thái an toàn.`
      };
    }

    return {
      ...entry,
      source: DATA_SOURCE_TYPES.REAL,
      isStale: false,
      staleElapsedSeconds: Math.round(elapsedMs / 1000)
    };
  }

  /**
   * Asynchronously persists telemetry sample to DB
   */
  async persistSampleToDatabase(resourceCode, sample) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { code: resourceCode }
      });

      if (resource) {
        await prisma.telemetrySample.create({
          data: {
            resourceId: resource.id,
            temperatureC: sample.temperatureC,
            powerWatts: sample.powerWatts,
            gpuPercent: sample.gpuPercent,
            online: true,
            source: "ESP32_PHYSICAL_SENSOR"
          }
        });
      }
    } catch (_e) {
      // Ignore DB write errors in high-throughput sensor stream
    }
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  notifyListeners(sample) {
    for (const listener of this.listeners) {
      try {
        listener(sample);
      } catch (_e) {}
    }
  }

  clearCache() {
    this.physicalTelemetryCache.clear();
  }

  shutdown() {
    if (this.client) {
      this.client.end();
    }
  }
}

export const mqttSubscriberService = new MqttSubscriberService();
