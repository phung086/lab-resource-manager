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

### Bản local tích hợp: một giao diện, một backend, một ngrok

Mở Docker Desktop. Từ checkout chính, terminal ứng dụng:

```powershell
Set-Location C:/Projects/lab-resource-manager/frontend
npm.cmd run dev:demo
```

Lệnh build/bật backend Docker8000, áp dụng forward migrations và mở UI5173
với thanh toán/trợ lý/giám sát. Đăng nhập CUSTOMER, LAB_STAFF hoặc ADMIN tại
http://localhost:5173; mọi tính năng dùng cùng database local hiện có. Restart
không tự seed hoặc ghi đè cấu hình tài nguyên.5174 và gateway8002/8003 đã ngừng
dùng cho demo. Backend/database chạy nền Docker; Ctrl+C chỉ dừng frontend.

Terminal ngrok riêng, chỉ chạy nếu chưa có tunnel:

```powershell
ngrok http http://127.0.0.1:8000 --url=https://projector-blaspheme-angelfish.ngrok-free.dev
```

Ngrok forward8000, không forward5173: backend nhận cả VNPAY IPN và ChatGPT MCP.
ERR_NGROK_334 nghĩa là cùng URL đã chạy, kiểm target ở http://127.0.0.1:4040;
không mở phiên thứ hai hoặc bật pooling. Cấu hình bridge trong backend/.env,
ADMIN cấp quyền ở /workspace/chatgpt-bridge; chỉ một plugin LAB Support và một
bộ nhận Tiếp nhận hỗ trợ LAB. Tham khảo AI_ASSISTANT_SETUP8.1.

Nếu chỉ cần mở frontend khi backend đã healthy: npm.cmd run dev -- --payments.
Nếu5173 đang dùng, giữ phiên hiện có hoặc dừng đúng terminal frontend trước.
Launcher không tự dừng ứng dụng khác. Các account local cũ được giữ nguyên;
student/lecturer@lrm.local đều là CUSTOMER sau migration, không phải role cũ.
SMTP thật chưa có, nên OTP/mail cần cấu hình nhà cung cấp trước khi test inbox.

Chỉ khi muốn bổ sung dữ liệu tài nguyên mẫu có chủ đích mới chạy:

```powershell
docker exec lrm-local-review-backend-1 npm run demo:seed-local
```

Không reset database. Seed có guard riêng; không dùng lệnh này mỗi lần demo.
Hướng dẫn kiểm thử cả ba role ở [SYSTEM_TEST_GUIDE](docs/SYSTEM_TEST_GUIDE.md).

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

## Bản so sánh cũ

Thiết lập hai frontend5173/5180 ngày06/10 đã ngừng dùng cho demo. Bản tích hợp
hiện ở checkout chính C:/Projects/lab-resource-manager; dùng dev:demo và một
ngrok8000 như mục Chạy local. Không mở worktree review hoặc stack thứ hai.

## Quản lý khách hàng, OTP và loyalty

ADMIN quản lý mọi tài khoản; staff quản lý tất cả CUSTOMER trong màn Tài khoản.
Sửa liên hệ, bật/tắt và xóa mềm có kiểm tra quyền; email đăng ký chỉ đọc. Xóa
khách có booking đang hoạt động bị chặn, lịch sử vẫn giữ. Đổi mật khẩu tại Hồ sơ
hoặc hỗ trợ khách bắt buộc OTP gửi email hiện tại; self-service còn cần mật khẩu
cũ. Mã có hạn 10 phút, gửi lại sau 60 giây, tối đa 5 lần sai. Không có bypass.

Dùng các SMTP_HOST/PORT/USER/PASS/EMAIL_FROM đã mô tả ở trên, sau đó chạy
npm --prefix backend run email:check -- --verify. Chỉ điền bí mật trực tiếp vào
môi trường backend; không đưa vào Git/chat. SMTP chưa cấu hình thì OTP báo
SMTP_NOT_CONFIGURED và mật khẩu giữ nguyên. Verify không chứng minh nhận trong
inbox. Khôi phục public khi mất phiên và đổi email cần luồng riêng.

Loyalty ở Hồ sơ lấy chi tiêu đã thanh toán hợp lệ; ADMIN bật/sửa chính sách trong
màn Tài khoản. Mặc định tắt, ngưỡng Plus/Priority 1.500.000/5.000.000đ và giảm
3%/5%, tùy cấu hình. Guest booking giữ giá public; đăng nhập trước đặt để nhận
ưu đãi theo hạng. Giá đã lưu của lịch/thanh toán cũ không đổi.

Các tính năng đã tích hợp vào checkout chính ngày14/10. Đọc
[hướng dẫn tích hợp](docs/INTEGRATION_GUIDE.md) trước cập nhật code/migrations;
không chép .env hoặc git pull đè checkout đang bẩn. Các worktree tách là bản
tham chiếu, không dùng để demo thay bản tích hợp5173/8000.
