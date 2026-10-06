# Lab Resource Manager

Hệ thống quản lý, đặt lịch và giám sát tài nguyên phòng thí nghiệm phục vụ đồ án tốt nghiệp.

Tài liệu hiện hành: [chỉ mục](docs/README.md), [SRS và use case](docs/srs.md),
[ERD từ Prisma](docs/DB-erd/core-erd.md), [kết quả xử lý nhận xét](docs/backlogs/review-followup-20261003.md).

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

### Backend Docker chung, hai frontend chạy bằng npm

1. Mở Docker Desktop, chờ Engine running.
2. Trong Docker Desktop, bật nhóm `lrm-local-review` (cả backend và postgres), hoặc:

```powershell
cd C:\Projects\lab-resource-manager\frontend
npm run dev:backend
```

3. Mở frontend cần sử dụng:

```powershell
# Nhánh đang sửa — http://localhost:5173
cd C:\Projects\lab-resource-manager\frontend
npm run dev
```

```powershell
# Main — http://localhost:5180, terminal riêng
cd C:\Projects\lab-resource-manager-main\frontend
npm run dev
```

Hai frontend dùng chung API `http://localhost:8000/api` và database
`lrm-local-review_review-data`. Thay đổi dữ liệu ở một giao diện sẽ xuất hiện ở
cả hai. Đây là so sánh frontend; backend dùng source nhánh hiện tại.

`npm run dev` chỉ kiểm tra API rồi chạy Vite: không build, tạo hoặc bật Docker.
`npm run dev:backend` tái sử dụng image/container có sẵn (`--no-build`). Chỉ khi
đổi dependencies, Prisma schema hoặc Dockerfile mới chạy `npm run dev:backend:rebuild`
ở frontend nhánh hiện tại. Trên máy mới cũng cần lệnh rebuild lần đầu.
Sửa backend/src thông thường được nodemon nạp lại qua bind mount.

Ctrl+C chỉ dừng frontend. `npm run dev:stop` tại nhánh dừng backend/database CHUNG,
không xóa dữ liệu. Có thể dừng/bật nhóm trong Docker Desktop. Restart policy
`unless-stopped` và log rotation 10 MB x 3 được cấu hình cho cả hai container.

Tài khoản demo: `admin@lrm.local`, `staff@lrm.local`, `lecturer@lrm.local`,
`student@lrm.local`; mật khẩu `LabDemo!2026Pass`. Migration và seed local có bảo vệ,
không reset bản ghi nghiệp vụ khi bật lại. AI cần provider riêng; payment/research tắt.
Nếu cổng đang dùng, dừng frontend cũ trước; launcher không tự diệt tiến trình khác.

### Compose đầy đủ / database phát triển cũ

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

Địa chỉ metrics trên dùng cho cấu hình local. Production yêu cầu bearer
`METRICS_TOKEN`; Prometheus/Node Exporter chỉ chạy khi bật profile
`observability`. Xem [hướng dẫn deployment](docs/DEPLOYMENT.md).

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

Run `npm run db:migrate` from `backend/` for deployment. A completely empty
database receives the reviewed clean-install baseline and Prisma records the
included historical migrations through the official `migrate resolve` command.
An existing database keeps its current lineage and receives only pending
forward migrations. Unknown non-empty schemas fail closed. Historical migration
SQL remains immutable, and production never edits `_prisma_migrations` manually.

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

## So sánh song song với main trên GitHub

Thiết lập ngày 2026-10-06 dùng worktree `C:/Projects/lab-resource-manager-main`
tại commit `a5472d4` của origin/main. Không tự pull khi chạy. Chỉ sửa scripts khởi
chạy trong package.json của worktree để `npm run dev` gọi launcher chung; source UI
main giữ nguyên. Có thể chạy `npm run dev:main` từ frontend nhánh thay thế.

| Bản | Frontend | Backend chung |
|---|---|---|
| Nhánh | http://localhost:5173 | http://localhost:8000 |
| Main | http://localhost:5180 | http://localhost:8000 |

Hai phiên trình duyệt tách theo cổng, dữ liệu dùng chung. Không dùng backend riêng
8010 nữa. `dev:main:stop` là alias dừng backend chung, không phải dừng riêng main.
Khi cập nhật main, giữ thay đổi scripts local và kiểm tra tương thích API/schema
trước khi tiếp tục dùng chung backend. Không reset/force checkout.

Docker cũ, image không dùng, cache build và volume cũ đã được dọn theo xác nhận
người dùng. Chỉ volume `lrm-local-review_review-data` được giữ. Không dùng Compose
cũ để chạy thêm một bộ môi trường khi kiểm thử giao diện; dùng nhóm local nêu trên.
