# Hướng Dẫn Nạp Firmware ESP32 Cho Physical Digital Twin Node

## 1. Sơ Đồ Đấu Nối Phần Cứng (Hardware Wiring)
- **Vi điều khiển**: ESP32 NodeMCU-32S / ESP32 DevKit V1 (30 pins / 38 pins).
- **Cảm biến nhiệt độ**: DHT22 (AM2302) hoặc DS18B20 gắn trực tiếp trên khe thoát nhiệt máy chủ GPU (GPU Heatsink Exhaust).

| Chân Cảm Biến | Chân ESP32 | Chức Năng |
|---|---|---|
| **VCC** (Pin 1) | `3V3` hoặc `VIN (5V)` | Nguồn nuôi cảm biến |
| **DATA** (Pin 2) | `GPIO 4` (với trở kéo lên 4.7kΩ $\to$ 3V3) | Đường truyền dữ liệu số 1-Wire |
| **NC** (Pin 3) | Không nối | Chân trống |
| **GND** (Pin 4) | `GND` | Nối đất chung |
| **Status LED** | `GPIO 2` | Đèn báo trạng thái nạp & truyền MQTT |

---

## 2. Cài Đặt Thư Viện (Arduino IDE / PlatformIO)
1. Cài đặt board package: `esp32 by Espressif Systems`.
2. Cài đặt thư viện:
   - `PubSubClient by Nick O'Leary` (v2.8.0+).
   - `DHT sensor library by Adafruit` (v1.4.4+).
   - `Adafruit Unified Sensor`.

---

## 3. Cấu Trúc Message MQTT Publish
- **Broker**: `mqtt://<HOST_IP>:1883`
- **Topic**: `labtwin/GPU-H100-01/telemetry`
- **Tần suất**: Mỗi 3.000 ms ($3\text{ giây}$).
- **Payload Schema**:
  ```json
  {
    "deviceId": "GPU-H100-01",
    "temperatureC": 64.85,
    "humidityPercent": 55.2,
    "powerWatts": 418,
    "sequence": 142,
    "source": "ESP32_PHYSICAL_SENSOR",
    "uptimeMs": 426000
  }
  ```
