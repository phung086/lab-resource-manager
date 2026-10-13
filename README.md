# Lab Resource Manager

Hệ thống quản lý, đặt lịch và giám sát tài nguyên phòng thí nghiệm phục vụ đồ án tốt nghiệp.

Tài liệu hiện hành: [chỉ mục](docs/README.md), [SRS và use case](docs/srs.md),
[ERD từ Prisma](docs/DB-erd/core-erd.md), kết quả xử lý nhận xét (historical run output; retired).

## Phạm vi sản phẩm

Luồng REQUIRED CORE hiện tập trung vào:

`Quản lý tài nguyên -> Đặt lịch -> Chống trùng -> Tự xác nhận -> Bàn giao -> Hoàn trả -> Thông báo -> Sự cố -> Giám sát`

Vai trò hiện hành: `CUSTOMER`, `LAB_STAFF`, `ADMIN`. Khách hàng đăng ký bằng
email/mật khẩu, bổ sung họ tên và số điện thoại khi đặt lịch. Tài khoản giảng
viên/sinh viên cũ được chuyển sang khách hàng bằng forward migration, giữ lịch sử.
Kiểm thử contract này: tạo PostgreSQL local riêng `lab_resources_customer_test`,
đặt `CUSTOMER_TEST_DATABASE_URL`, rồi chạy trong `backend/`:
`npm run test:customer:prepare` và `npm run test:customer:integration`.
Script chuẩn bị từ chối DB khác và không reset/xóa DB hiện có.

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
- contracts hiện hành, source/tests và Prisma migrations

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
đổi dependencies hoặc Dockerfile mới chạy `npm run dev:backend:rebuild`
ở frontend nhánh hiện tại. Trên máy mới cũng cần lệnh rebuild lần đầu.
Sửa backend/src thông thường được nodemon nạp lại qua bind mount.

Ctrl+C chỉ dừng frontend. `npm run dev:stop` tại nhánh dừng backend/database CHUNG,
không xóa dữ liệu. Có thể dừng/bật nhóm trong Docker Desktop. Restart policy
`unless-stopped` và log rotation 10 MB x 3 được cấu hình cho cả hai container.

Tài khoản demo: `admin@lrm.local`, `staff@lrm.local`, `lecturer@lrm.local`,
`student@lrm.local`; mật khẩu `LabDemo!2026Pass`. Migration và seed local có bảo vệ,
không reset bản ghi nghiệp vụ khi bật lại. AI cần provider riêng; payment/research tắt.
Nếu cổng đang dùng, dừng frontend cũ trước; launcher không tự diệt tiến trình khác.

Danh mục local gồm 25 tài nguyên mẫu: 6 phòng, 10 thiết bị, 4 máy, 3 bộ thí nghiệm
và 2 vật tư. Trang `/workspace/resources` tách Phòng / Thiết bị / Vật tư & khác,
dùng lưới 3 cột trên desktop và hồ sơ chi tiết có thông số, hướng dẫn, chính sách,
bảng giá hiện hành và lịch. Dữ liệu/ảnh/hướng dẫn LOCAL DEMO là minh họa.
Muốn bổ sung bộ mẫu vào database local đang có (không reset), chạy có chủ đích:

```powershell
docker exec lrm-local-review-backend-1 npm run demo:seed-local
```

Seed từ chối database ngoài `lab_resources_local_demo` hoặc tài nguyên trùng mã
không thuộc LOCAL DEMO. Seed thêm bản ghi thiếu, chỉ bổ sung mô tả/thông số mặc định,
giữ nguyên trạng thái, lịch đặt, giao dịch và giá hiện có. Chạy lại không tạo bản sao.
Ảnh tài nguyên mới cần bổ sung từ nguồn được phép sử dụng khi có dữ liệu thực tế.

### Kết nối VNPAY Sandbox với runtime local

Thanh toán mặc định tắt. Muốn thử merchant thật, thêm cấu hình sau vào
`backend/.env`, giữ nguyên các biến đang có. Copy Terminal ID và HashSecret trực
tiếp từ email cấu hình VNPAY hiện tại; HashSecret khác mật khẩu Merchant Admin.
Không dùng lại key đọc từ ảnh nếu VNPAY đã báo “Sai chữ ký”.

```dotenv
VNPAY_ENABLED=true
VNPAY_TMN_CODE=MA_TERMINAL_8_KY_TU
VNPAY_HASH_SECRET=KEY_CHINH_XAC_TU_VNPAY
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_VERSION=2.1.0
VNPAY_BANK_CODE=
VNPAY_RETURN_URL=https://DOMAIN_BACKEND/api/payments/vnpay/return
VNPAY_IPN_URL=https://DOMAIN_BACKEND/api/payments/vnpay/ipn
PAYMENT_APP_URL=http://localhost:5173
```

Để `VNPAY_BANK_CODE` rỗng, khách chọn phương thức được merchant hỗ trợ trên
VNPAY. Chỉ đặt `VNPAYQR` khi merchant đã được bật QR; bỏ hẳn biến này giữ mặc
định QR của cấu hình cũ. Mã `76` có thể xuất hiện khi phương thức đã chọn không
được merchant hỗ trợ.

Backend chạy cổng 8000. Khi thử local, chạy `ngrok http http://127.0.0.1:8000
--inspect=false` ở terminal riêng, dùng URL HTTPS ngrok thực tế làm
`DOMAIN_BACKEND`, và giữ tunnel chạy. Đăng nhập Merchant Sandbox, mở tên tài
khoản ở góc trên → **Thông tin tài khoản** → đúng dòng Terminal ID → biểu tượng
bút sửa. Nhập URL IPN đầy đủ, chọn **GET / HMACSHA512**, bấm **Hoàn thành**,
rồi mở lại để xác nhận URL đã lưu. Kiểm tra URL cũ trước khi thay vì callback
của merchant sẽ chuyển sang ứng dụng mới. Nếu tài khoản không có quyền sửa,
gửi URL cho VNPAY đăng ký; đặt biến môi trường không tự đăng ký callback.

Sau khi key và callback đã xác minh, bật backend rồi frontend bằng hai terminal:

```powershell
cd C:\Projects\lab-resource-manager\frontend
npm.cmd run dev:backend -- --payments
```

```powershell
cd C:\Projects\lab-resource-manager\frontend
npm.cmd run dev -- --payments
```

Cờ `--payments` bật API thanh toán và UI tương ứng; bỏ cờ để trở về mặc định
tắt. Trong PowerShell, dùng `npm.cmd` để giữ nguyên đối số `--payments`;
trên Linux/macOS dùng `npm`. Thay `backend/.env` cần chạy lại lệnh backend để container nhận cấu hình
mới; thay frontend flag cần dừng/bật frontend. Dữ liệu trong volume chung được
giữ nguyên. Không bật stack demo cũ ở 15005/15181 để thay thế runtime này.

Thử một lịch có giá dương và mục đích khớp bảng giá. Lịch hợp lệ được xác nhận
tự động sau kiểm tra trùng lịch, bảo trì và chính sách; chủ lịch chọn thanh toán,
rồi chọn phương thức trên VNPAY Sandbox. Chỉ IPN hợp lệ khớp merchant, mã giao dịch và số tiền mới cập nhật
thanh toán; browser Return không xác nhận đã trả tiền. Đối chiếu trạng thái,
`vnpTransactionNo` và `paidAt`, rồi làm mới trang checkout. Dùng phương tiện
kiểm thử do VNPAY cung cấp; không coi app ngân hàng thật là công cụ Sandbox.
Không đổi trạng thái thành công thủ công. QueryDr/refund tự động chưa được
kiểm chứng; thiếu IPN có thể để giao dịch tiếp tục chờ.

Nếu cổng báo `70 – Sai chữ ký`, kiểm tra cặp Terminal ID/HashSecret hiện hành,
container đã nhận `.env`, và cách ký/encode theo tài liệu. Nút **Test call IPN**
nhận được JSON chỉ chứng minh endpoint có phản hồi; mã `97` chưa chứng minh
chữ ký hợp lệ. Sau khi sửa key, URL thanh toán đã lưu vẫn được tái dùng trong
15 phút: chờ hết phiên rồi mở thanh toán lại để API tạo phiên mới. Không sửa
DB hay giả lập IPN thành công để bỏ qua lỗi. Khi deploy, thay domain backend
trong Return/IPN và domain frontend trong `PAYMENT_APP_URL`, cập nhật IPN trên
merchant rồi thử lại. Domain chính thức không tự đổi Sandbox thành production.

Tài liệu chính thức: [kết nối VNPAY PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

### Chat hỗ trợ trực tiếp

Mở `/workspace/support` hoặc **Chat với nhân viên hỗ trợ** trong trợ lý.
Khách đã đăng nhập chọn LAB, mô tả vấn đề và chọn có chia sẻ ngữ cảnh AI hay
không. Staff được admin phân công LAB mở **Hỗ trợ trực tuyến**, bấm **Bật sẵn
sàng** và giữ trang mở. Mỗi staff nhận một phiên; nhiều staff xử lý đồng thời.
Khi tất cả bận, khách thấy vị trí #1/#2… theo LAB; hoàn tất phiên sẽ tự giao
lượt tiếp theo. Mẫu trả lời chèn vào bản nháp để kiểm tra trước khi gửi.

Admin mở cùng mục để lọc/xem lịch sử, kết quả và nhân viên từng nhận phiên;
có thể chuyển phiên ACTIVE về hàng đợi kèm lý do. Tin nhắn lưu PostgreSQL;
bản đầu cập nhật mỗi 2 giây, heartbeat 15 giây, offline sau 45 giây. Phiên
đang hỗ trợ không tự chuyển khi mất kết nối; admin có thể requeue.

Launcher local generate Prisma client từ schema đang mount và deploy migration
forward khi startup; rebuild khi đổi dependencies/image. Không dùng `db push`
hoặc reset DB.
Giữ `--payments` nếu phiên local đang bật thanh toán. Kiểm thử chat dùng DB
local riêng tên `lab_resources_support_test` qua `SUPPORT_TEST_DATABASE_URL`:
backend `npm.cmd run test:support:integration`, sau đó frontend
`npm.cmd run test:ui:support` (UI local đang chạy; Chromium có sẵn hoặc đặt
`CHROMIUM_EXECUTABLE_PATH`). Test từ chối DB ngoài phạm vi và không mock chat.

### Email xác nhận đăng ký và thanh toán

Backend tự đưa thư vào hàng đợi khi đăng ký tài khoản thành công (kể cả tài
khoản mới từ đặt nhanh đã xác thực OTP) và khi IPN VNPAY đã được xác minh thành
công. Thư đăng ký có họ tên/email đăng nhập và hướng dẫn dùng mật khẩu đã chọn
hoặc hoàn tất bước thiết lập mật khẩu; không gửi mật khẩu, hash hay token.
Thư thanh toán có mã lịch, thiết bị/LAB, giờ sử dụng UTC+7, số tiền, mã thanh
toán LAB và mã giao dịch VNPAY. Lịch đã hủy hoặc khoản cần đối soát được ghi
rõ; email không phê duyệt lại lịch. Return từ trình duyệt không tạo biên nhận.

Để gửi đến hộp thư thật, cần tài khoản SMTP do hosting/dịch vụ email cấp. Điền
trực tiếp trong `backend/.env` (đã thêm sẵn các trường trống ở phiên local):

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_AUTOMATION_ENABLED=true
EMAIL_APP_URL=http://localhost:5173
```

`SMTP_HOST/USER/PASS` và địa chỉ gửi `EMAIL_FROM` lấy từ nhà cung cấp; FROM phải
là địa chỉ được dịch vụ cho phép gửi. Dùng 587 với STARTTLS hoặc 465 với TLS
theo thông số được cấp. `SMTP_PASS` là mật khẩu SMTP/API credential tương ứng,
không phải mật khẩu tài khoản LAB. Khi deploy, `EMAIL_APP_URL` là domain frontend
HTTPS. Không đưa credential vào frontend, Git hoặc nội dung thư.

Sau khi lưu cấu hình, dùng launcher chính thức từ `frontend/`:
`npm.cmd run dev:backend:rebuild -- --payments` nếu đang bật thanh toán, hoặc
bỏ `--payments` khi không dùng. Launcher generate client và áp dụng migration
forward `20261012000200_email_deliveries`, giữ volume nghiệp vụ. Docker cần được
tạo lại để nhận biến `.env` mới; reload source không nạp lại env_file.

Từ `backend/`, kiểm tra cấu hình: `npm.cmd run email:check`; thêm
`-- --verify --queue` để xác minh kết nối/đăng nhập SMTP và đọc thống kê hàng
đợi. Với runtime Docker chung, dùng
`docker exec lrm-local-review-backend-1 npm run email:check -- --verify --queue`.
Lệnh verify không gửi email. Khi SMTP hợp lệ, worker xử lý mỗi 10 giây;
đăng ký một tài khoản bằng email mình sở hữu để nhận thư xác nhận thực tế.

Thiếu SMTP: thư giữ PENDING và không tiêu hao số lần thử. Lỗi gửi được thử lại
với thời gian chờ tăng dần, tối đa 5 lần; FAILED cần operator kiểm tra nguyên
nhân rồi chạy `npm.cmd run email:retry -- DELIVERY_UUID` (hoặc lệnh tương ứng
trong Docker). Lệnh check có liệt kê UUID của 20 thư FAILED đầu tiên, không
in mật khẩu hay nội dung thư. Không gửi lại thư SENT. SENT nghĩa là SMTP đã nhận
thư; vẫn cần kiểm tra hộp thư/spam để biết thư đã tới người nhận. Crash đúng lúc
SMTP đã nhận nhưng chưa ghi DB có thể dẫn tới gửi lại; Message-ID ổn định giúp
nhận diện, không bảo đảm exactly-once trên hệ thống email bên ngoài.

Kiểm thử tự động: backend `npm.cmd run test:email:integration`, yêu cầu
`EMAIL_TEST_DATABASE_URL` trỏ localhost tới DB riêng `lab_resources_email_test`
đã được migrate. Suite dùng Express/Prisma/PostgreSQL và SMTP loopback thật;
không gửi tới hộp thư bên ngoài. Không tạo thư cho tài khoản/giao dịch cũ khi
deploy. Cấu hình SMTP không giải quyết lỗi chữ ký VNPAY của merchant.

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

Nguồn phải xác thực và gắn tài nguyên/LAB. Mẫu được lưu PostgreSQL; thiếu mẫu là
`NO_DATA`, quá thời hạn là `STALE`, nguồn chủ động báo offline là `UNAVAILABLE`.
Trạng thái vật lý do staff quản lý, không đổi theo số đo hoặc trạng thái kết nối.
Camera hiện là metadata có phân quyền/audit, chưa có video hay phần cứng được xác minh.

### Vận hành tài nguyên ảo

Mở `/workspace/monitoring` để quản lý phòng, máy và linh kiện trong danh mục.
Cấu hình chu kỳ bảo trì theo ngày/giờ vận hành và phòng đặt máy; bàn giao booking
trước khi bắt đầu phiên vận hành. Tải máy và số người trong phòng là đầu vào
vận hành ảo do staff khai báo, không phải số đo cảm biến. Thời lượng và tải
quy đổi được tính từ các phiên lưu PostgreSQL; không sinh lịch sử trước đó.
Chu kỳ theo giờ dùng thời gian bàn giao/hoàn trả; chu kỳ theo lượt đếm các
lượt đã hoàn trả. Mốc 80% cảnh báo staff/admin, 100% đến hạn. Đến hạn bảo trì chặn đặt lịch/bàn giao; đổi trạng thái thủ công không
bỏ qua kiểm tra sau sửa chữa. Scheduler dừng phiên ở hạn booking/bảo trì.
Ghi nhận hỏng tạo sự cố và trạng thái BROKEN. Trả tài nguyên, xử lý sự cố/linh
kiện, hoàn tất phiếu bảo trì và kiểm tra đạt trước khi đưa về AVAILABLE.
Nguồn telemetry bên ngoài vẫn dùng API xác thực riêng, không tự đổi trạng thái.

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
