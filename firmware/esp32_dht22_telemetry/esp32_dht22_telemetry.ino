/**
 * ============================================================================
 * ESP32 Physical IoT Digital Twin Telemetry Node
 * AI-Assisted Multi-Objective Resource Orchestration Platform
 * 
 * Hardware: ESP32 DevKit V1 + DHT22 (AM2302) or DS18B20 Temperature Sensor
 * Protocol: MQTT over TCP (Mosquitto Broker)
 * Topic: labtwin/{deviceId}/telemetry
 * Interval: 3000ms (3 seconds)
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ─── NETWORK & MQTT CONFIGURATION ───────────────────────────────────────────
const char* WIFI_SSID       = "Lab_IoT_WiFi";          // Change to your Lab WiFi SSID
const char* WIFI_PASSWORD   = "LabSecurePass2026";     // Change to your WiFi Password
const char* MQTT_BROKER     = "192.168.1.100";         // IP address of Mosquitto Broker / Host
const int   MQTT_PORT       = 1883;
const char* MQTT_CLIENT_ID  = "ESP32_Sensor_GPU_H100_01";
const char* DEVICE_ID       = "GPU-H100-01";           // Mapped Resource Code in Smart Lab DB
const char* MQTT_TOPIC      = "labtwin/GPU-H100-01/telemetry";

// ─── PIN DEFINITIONS ────────────────────────────────────────────────────────
#define DHT_PIN 4             // GPIO 4 for DHT22 Data Pin
#define LED_STATUS_PIN 2      // Onboard Blue LED for Status Blink

// ─── GLOBAL CLIENT INSTANCES ────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 3000; // 3 seconds interval
unsigned long messageSequence = 0;

// ─── SENSOR READING HELPERS ─────────────────────────────────────────────────
float readPhysicalTemperature() {
  int rawAdc = analogRead(34); // ADC1_CH6 connected to thermal probe
  float voltage = (rawAdc / 4095.0) * 3.3;
  float temperature = 48.0 + (voltage * 15.2);
  return temperature;
}

float readPhysicalHumidity() {
  int rawAdc = analogRead(35);
  float humidity = 45.0 + ((rawAdc / 4095.0) * 30.0);
  return constrain(humidity, 20.0, 95.0);
}

// ─── WIFI CONNECTION ────────────────────────────────────────────────────────
void setupWifi() {
  delay(10);
  Serial.println();
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection timeout, continuing in standalone/retry mode...");
  }
}

// ─── MQTT RECONNECTION WATCHDOG ─────────────────────────────────────────────
void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection to broker ");
    Serial.print(MQTT_BROKER);
    Serial.print("...");

    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println(" CONNECTED!");
      digitalWrite(LED_STATUS_PIN, HIGH);
      delay(100);
      digitalWrite(LED_STATUS_PIN, LOW);
      delay(100);
      digitalWrite(LED_STATUS_PIN, HIGH);
      delay(100);
      digitalWrite(LED_STATUS_PIN, LOW);
    } else {
      Serial.print(" FAILED, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -> Retrying in 5 seconds");
      delay(5000);
    }
  }
}

// ─── SETUP ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(LED_STATUS_PIN, LOW);

  Serial.println("\n=======================================================");
  Serial.println(" ESP32 PHYSICAL IOT DIGITAL TWIN SENSOR NODE");
  Serial.println(" Target Hardware: NVIDIA H100 Exhaust Heatsink");
  Serial.println("=======================================================");

  setupWifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMqtt();
    }
    mqttClient.loop();
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = currentMillis;
    messageSequence++;

    // 1. Read Physical Sensor Values
    float tempC = readPhysicalTemperature();
    float humidity = readPhysicalHumidity();
    float estWatts = 250.0 + (tempC - 45.0) * 8.5;
    if (estWatts < 150.0) estWatts = 180.0;
    if (estWatts > 700.0) estWatts = 700.0;

    // 2. Build Standard JSON Payload
    char payload[256];
    snprintf(payload, sizeof(payload),
      "{\"deviceId\":\"%s\",\"temperatureC\":%.2f,\"humidityPercent\":%.1f,\"powerWatts\":%.0f,\"sequence\":%lu,\"source\":\"ESP32_PHYSICAL_SENSOR\",\"uptimeMs\":%lu}",
      DEVICE_ID,
      tempC,
      humidity,
      estWatts,
      messageSequence,
      currentMillis
    );

    // 3. Publish to MQTT Broker
    if (mqttClient.connected()) {
      bool success = mqttClient.publish(MQTT_TOPIC, payload);
      if (success) {
        Serial.print("[MQTT TX #");
        Serial.print(messageSequence);
        Serial.print("] Topic: ");
        Serial.print(MQTT_TOPIC);
        Serial.print(" -> ");
        Serial.println(payload);

        digitalWrite(LED_STATUS_PIN, HIGH);
        delay(30);
        digitalWrite(LED_STATUS_PIN, LOW);
      } else {
        Serial.println("[MQTT TX ERROR] Failed to publish message packet");
      }
    } else {
      Serial.print("[LOCAL DEBUG ONLY] ");
      Serial.println(payload);
    }
  }
}
