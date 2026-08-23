# AI Resource Monitoring

## Chỉ Số Vận Hành

Hệ thống đang theo dõi các chỉ số có thể lấy từ agent hoặc exporter thật:

- `cpuPercent`: mức sử dụng CPU của máy.
- `gpuPercent`: mức sử dụng GPU.
- `gpuMemoryPercent`: tỷ lệ bộ nhớ GPU đã dùng.
- `ramPercent`: tỷ lệ RAM đã dùng.
- `diskPercent`: tỷ lệ ổ đĩa đã dùng.
- `temperatureC`: nhiệt độ thiết bị theo độ C.
- `online`: trạng thái agent còn gửi dữ liệu hay không.

Với GPU NVIDIA, `nvidia-smi` hỗ trợ truy vấn các trường như `utilization.gpu`, `memory.used`, `memory.total` và `temperature.gpu`. DCGM Exporter cũng expose GPU metrics qua `/metrics` để Prometheus scrape. Node Exporter dùng cho hardware/kernel metrics của Linux host.

## Cách Tính Hiệu Suất Trên UI

Frontend tính điểm hiệu suất từ telemetry mới nhất:

- Bắt đầu từ `100`.
- Mỗi chỉ số vượt ngưỡng cảnh báo trừ `8`.
- Mỗi chỉ số vượt ngưỡng nghiêm trọng trừ `18`.
- Dữ liệu quá cũ trừ thêm `20`.
- Thiết bị offline có điểm `0`.

Ngưỡng mặc định:

| Chỉ số | Cảnh báo | Nghiêm trọng |
| --- | ---: | ---: |
| CPU/GPU/RAM/Bộ nhớ GPU | 85% | 95% |
| Ổ đĩa | 85% | 95% |
| Nhiệt độ | 75°C | 85°C |
| Dữ liệu cũ | sau 15 phút |  |

Có thể override theo từng tài nguyên bằng `specs`, ví dụ:

```text
gpuWarningPercent=85;gpuCriticalPercent=95;temperatureWarningC=75;temperatureCriticalC=85;staleMinutes=10
```

## Nguồn Tham Khảo Chính

- NVIDIA DCGM Exporter: https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/dcgm-exporter.html
- NVIDIA DCGM field identifiers: https://docs.nvidia.com/datacenter/dcgm/latest/dcgm-api/dcgm-api-field-ids.html
- NVIDIA nvidia-smi documentation: https://docs.nvidia.com/deploy/nvidia-smi/index.html
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
