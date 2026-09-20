# Lab Resource Manager

Hệ thống quản lý, đặt lịch và giám sát tài nguyên phòng thí nghiệm phục vụ đồ án tốt nghiệp.

## Phạm vi sản phẩm

Luồng REQUIRED CORE hiện tập trung vào:

`Quản lý tài nguyên -> Đặt lịch -> Chống trùng -> Phê duyệt -> Bàn giao -> Hoàn trả -> Thông báo -> Sự cố -> Dashboard/Telemetry`

Kiến trúc chuẩn:

- Frontend: React 19 + Vite 6
- Backend: Node.js + Express
- ORM: Prisma 6
- Database: PostgreSQL 16
- Backend layering: route -> middleware -> service -> Prisma
- Backend authorization là nguồn quyết định cuối cùng

AI, Digital Twin, Pareto, GA/NSGA-II, mô phỏng, payment/VietQR và các màn hình nghiên cứu khác là OPTIONAL/RESEARCH. Chúng không phải điều kiện để luồng đồ án cốt lõi hoạt động và mặc định bị ẩn khỏi production/demo bằng `VITE_ENABLE_RESEARCH_FEATURES=false`.

## Trạng thái kiểm thử

Các Batch đã merge và xác minh trước Batch 7:

- Batch 1: persistence + PostgreSQL concurrency
- Batch 2: authentication + RBAC
- Batch 3: resource management
- Batch 4/4.1: calendar + conflict-safe booking
- Batch 5: approval + handover + return + condition evidence
- Batch 6: notifications + incidents + real dashboard + telemetry contract

Trạng thái chính xác mới nhất luôn nằm trong:

- `docs/CURRENT_STATE.md`
- các `docs/BATCH*_REPORT.md`
- các `docs/BATCH*_WALKTHROUGH.md`

Không coi một tính năng là verified chỉ vì UI hiển thị hoặc build thành công.

## Chạy local

Tạo môi trường:

```bash
cp .env.example .env
```

Điền tối thiểu tài khoản admin phát triển nếu cần, sau đó:

```bash
docker compose up --build
```

Mặc định:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/health
- Backend readiness: http://localhost:8000/health/ready
- Backend metrics: http://localhost:8000/metrics
- Prometheus: http://localhost:9090

Local container sử dụng Prisma migration, không dùng `prisma db push` để tự thay đổi schema.

## Deploy production

```bash
cp .env.production.example .env.production
```

Thay toàn bộ giá trị mẫu bằng secret/domain thật. Các biến quan trọng:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`
- `CORS_ORIGINS`
- `VITE_ENABLE_RESEARCH_FEATURES=false`

Production backend fail closed nếu secret/admin/CORS quan trọng không hợp lệ.

Telemetry sources are provisioned by an administrator. Each source receives a
one-time credential whose derived hash is stored in PostgreSQL; there is no
shared production telemetry key.

Clean deployment uses ordinary tracked `prisma migrate deploy`. Historical
migration SQL remains immutable, and production never edits
`_prisma_migrations` manually.

Kiểm tra cấu hình Compose:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Khởi động:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Sau đó kiểm tra:

```bash
curl -f http://SERVER/health
curl -f http://SERVER/api/health/ready
```

Xem chi tiết tại `docs/DEPLOYMENT.md`.

## Graduation demo

Kịch bản bảo vệ chính thức được mô tả tại:

`docs/GRADUATION_DEMO_RUNBOOK.md`

Kịch bản cốt lõi chứng minh 10 bước từ tạo user/resource, đặt lịch, tranh chấp PostgreSQL, duyệt, bàn giao, hoàn trả, notification, history/dashboard tới incident.

Demo infrastructure bootstrap chỉ được phép trên database có marker `_demo` và khi `DEMO_MODE=true`. Script đó không được dùng để tạo dữ liệu giả trong production.

## Dữ liệu tài nguyên

Tài nguyên REQUIRED CORE phải được tạo/persist bằng API/UI chuẩn hoặc quy trình onboarding đã được xác minh.

`backend/scripts/importResources.js` và một số CSV cũ là legacy từ kiến trúc trước; chúng **không phải** production onboarding path cho tới khi được reconciliation với canonical resource schema. Không dùng chúng để thay thế UI/API cốt lõi.

## Telemetry

Batch 6 cung cấp contract telemetry tối thiểu có xác thực và persistence thật. Thiếu mẫu đo phải hiển thị `NO_DATA`; nguồn offline là `UNAVAILABLE`; hệ thống không tự sinh telemetry giả.

Tích hợp sensor/camera/hardware thực thuộc Smart Laboratory Monitoring extension và không được coi là production-ready nếu chưa qua Batch tương ứng.

## Kiểm thử

Backend required-core:

```bash
cd backend
npm run lint
npm run verify:prod-config
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Các integration/E2E Batch sử dụng PostgreSQL database riêng có guard. Không chạy destructive test trên database phát triển/chia sẻ.

## Tài liệu quan trọng

- `AGENTS.md`
- `.agent/PROJECT_RULES.md`
- `.agent/INSTRUCTOR_BASELINE.md`
- `docs/srs.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CURRENT_STATE.md`
- `docs/DECISIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/GRADUATION_DEMO_RUNBOOK.md`
- `docs/BATCH5_WALKTHROUGH.md`
- `docs/BATCH6_WALKTHROUGH.md`

## Safety

Không:

- chạy `prisma db push` trên development/shared database;
- sửa historical applied migrations;
- sửa tay `_prisma_migrations`;
- biến mock/research UI thành REQUIRED CORE;
- khai báo fake telemetry/audit/runtime evidence là dữ liệu thật.
