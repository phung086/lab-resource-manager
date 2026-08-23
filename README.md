# Lab Resource Manager

Hệ thống web đặt lịch và giám sát tài nguyên phòng thí nghiệm cho GPU server, Raspberry Pi, UAV, camera, phòng thực hành và thiết bị dùng chung.

## Trạng thái hiện tại

Project đã được nâng lên hướng deployable:

- Local dev dùng admin đầu tiên từ biến môi trường, giống production.
- Production không tự tạo dữ liệu giả.
- Production tạo admin đầu tiên từ biến môi trường.
- Tài nguyên thật được nhập qua UI hoặc CSV.
- Telemetry thật được gửi từ agent hoặc exporter.
- Backend có health/readiness, Prometheus metrics và ràng buộc chống trùng lịch.
- Trợ lý AI/MCP đọc dữ liệu thật để gợi ý lịch trống, kiểm tra lịch trùng, tìm tài nguyên, tìm thông báo và trả lời câu hỏi vận hành.

## Công nghệ

- Frontend: React + Vite + JavaScript
- Backend: Node.js + Express + JavaScript
- ORM/database: Prisma + PostgreSQL
- Monitoring: Prometheus, Node Exporter, tùy chọn NVIDIA DCGM Exporter
- AI/MCP: Assistant REST API, MCP Streamable HTTP, OpenAI SDK tùy chọn
- Deployment: Docker Compose production stack

## Chạy local để phát triển

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/health
- Backend readiness: http://localhost:8000/health/ready
- Backend metrics: http://localhost:8000/metrics
- Assistant tools: http://localhost:8000/assistant/tools
- MCP endpoint: http://localhost:8000/mcp
- Prometheus: http://localhost:9090

Trước khi chạy, điền `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` trong `.env` để tạo tài khoản quản trị đầu tiên.

## Deploy production

```bash
cp .env.production.example .env.production
```

Điền secret thật trong `.env.production`, sau đó chạy:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Xem chi tiết trong [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Nhập dữ liệu thật

Chuẩn bị CSV theo mẫu:

```text
data/resource-inventory.template.csv
```

Nếu cần bộ inventory khởi tạo sát thực tế cho phòng lab AI, có thể dùng:

```text
data/ai-lab-inventory.realistic.csv
```

Import vào backend sau khi điền inventory thật:

```bash
cd backend
npm run import:resources -- ../data/resource-inventory.template.csv
```

Khi deploy bằng Docker, xem lệnh copy/import trong [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Telemetry agent

Agent đọc CPU/RAM từ máy thật và đọc GPU qua `nvidia-smi` nếu có:

```bash
cd backend
LRM_API_BASE_URL=http://localhost:8000 \
LRM_TELEMETRY_API_KEY=<TELEMETRY_API_KEY> \
LRM_RESOURCE_CODE=<MA_TAI_SAN_THUC> \
npm run agent:system
```

## Kiểm thử

```bash
cd backend
npm test

cd ../frontend
npm run build
```

## Tài liệu

- [docs/PROJECT_DIRECTION.md](docs/PROJECT_DIRECTION.md)
- [docs/TECH_STACK_OPTIONS.md](docs/TECH_STACK_OPTIONS.md)
- [docs/REAL_DATA_RUNBOOK.md](docs/REAL_DATA_RUNBOOK.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/AI_RESOURCE_MONITORING.md](docs/AI_RESOURCE_MONITORING.md)
- [docs/AI_ASSISTANT_MCP.md](docs/AI_ASSISTANT_MCP.md)
