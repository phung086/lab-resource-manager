# Báo cáo kiểm thử luồng hoạt động - 03/10/2026

## Kết luận

Đã chạy kiểm thử tự động cho các nhóm nghiệp vụ đang hoạt động trên code của PR #22, commit `66e744473c940515548048d448019beb3d311e9b`, nhánh `codex/lab-workspace-ui-draft`. Có **1 lỗi sản phẩm còn mở** ở biểu mẫu chuyển lịch bảo trì. Các bộ kiểm thử hiện có đạt sau khi cấu hình môi trường đúng; kết quả đó chưa đủ để kết luận mọi thao tác của người dùng đều đúng.

Đợt này tập trung kiểm thử và xuất báo cáo. Không sửa mã ứng dụng, không merge PR và không chuyển sang batch phát triển tiếp theo. Môi trường xem thử của người dùng ở cổng 15181/15005 được giữ nguyên.

## 1. Kết quả theo nhóm

| Nhóm kiểm thử | Kết quả cuối | Cách đếm và bằng chứng |
| --- | --- | --- |
| Backend bắt buộc: core, release security, assistant | Đạt | 60 kết quả TAP; `backend-test-required.log` |
| Backend Batch 1-8, guest, privacy, audit, workspace, assistant integration | Đạt | 154 kết quả TAP; `results-integration.json` |
| Payment lifecycle, open lab, payment/MCP | Đạt với cấu hình tương ứng | 25 + 4 + 10 kết quả TAP; lần chạy lại MCP bật telemetry thử nghiệm |
| Frontend bắt buộc | Đạt, còn cảnh báo | 7 kiểm thử; lint 0 lỗi/13 cảnh báo; typecheck và build đạt |
| Catalog song ngữ | Đạt | 2.115 khóa VI/EN; kiểm tra tham số và 76 module đang hoạt động |
| Workspace, điều hướng, song ngữ, bốn vai trò | Đạt | 104 + 306 + 121 = 531 kiểm tra trình duyệt |
| E2E nghiệp vụ Batch 2-8 | Đạt | 7 bộ trình duyệt; Batch 7 chạy lại đúng cấu hình nhắc lịch |
| E2E thanh toán Phase H | Đạt trong môi trường thử | Callback ký bằng secret fixture, không giao dịch merchant thực |
| Chi tiết tài nguyên/ảnh/video | Đạt ở tầng UI fixture | 23 kiểm tra, chiều rộng 375/768/1024/1440 px |
| API media và PostgreSQL thực | Đạt | 22 kiểm tra, gồm đăng nhập/setup; không tải ảnh ngoài hoặc upload S3 |
| Kho, bảo trì, lớp học phần bổ sung | Đạt các bước sau xử lý tạm | 12 assertion; chuyển lịch bảo trì cần chọn lại tài nguyên, QA-01 vẫn mở |
| Kiểm tra dependency production | Đạt ở thời điểm chạy | Backend và frontend: 0 lỗ hổng theo `npm audit --omit=dev` |
| Cấu hình production | Đạt | `verify:prod-config`; không phải kiểm thử triển khai production |

Tổng backend là **253 kết quả TAP đạt**, có tính cả suite cha. Đây không phải 253 luồng nghiệp vụ độc lập. Không cộng các assertion browser, fixture và API thành một tỷ lệ bao phủ toàn dự án. Số trên dùng kết quả cuối của mỗi bộ, không cộng lần chạy lại và không tính thao tác seed/migration.

## 2. Ma trận luồng đã kiểm tra

| Luồng | Vai trò / điều kiện | Kiểm tra chính | Kết luận |
| --- | --- | --- | --- |
| Đăng nhập và quyền truy cập | ADMIN, LAB_STAFF, LECTURER, STUDENT | Token, trạng thái user, role, quyền server, lab được phân công | Đạt trong bộ Batch 2/runtime/security |
| Tài nguyên và danh mục | Admin/staff/người xem | CRUD, lab scope, trạng thái hoạt động, điều kiện đặt | Đạt Batch 3 và UI |
| Đặt lịch và lịch công khai | Chủ lịch, người khác, staff | Lịch riêng tư, khoảng liền kề, UTC+7, giờ làm việc, đào tạo, xung đột | Đạt Batch 4/Phase G |
| Tranh chấp đặt lịch | Nhiều request đồng thời | Chỉ một lịch thắng; request khác bị từ chối; bảo vệ PostgreSQL | Đạt concurrency và Batch 4 |
| Duyệt/từ chối/hủy | Chủ lịch và cán bộ có quyền | Lý do, lịch sử, trạng thái kết thúc, phạm vi lab | Đạt API và E2E |
| Bàn giao/trả/đóng lịch | Staff/admin | Tình trạng trước/sau, thời điểm trả, IN_USE/AVAILABLE, không ghi đè trạng thái nghiêm trọng | Đạt Batch 5 |
| Duyệt hoặc bàn giao đồng thời | Staff có quyền | Một chuyển trạng thái và một bằng chứng bàn giao | Đạt Batch 5 |
| Thông báo và nhắc lịch | Chủ lịch/staff | Scope, đọc thông báo, nhắc lịch theo ngưỡng cấu hình | Đạt Batch 6/7; không kiểm SMTP thực |
| Sự cố và dashboard | Student/staff/admin | Báo sự cố, xử lý, ảnh hưởng trạng thái vật lý, dữ liệu đúng scope | Đạt Batch 6/8 |
| Khách/OTP/tài khoản tạm | Khách và tài khoản tạm | OTP, điều kiện đào tạo, privacy, không vượt RBAC; SMTP thiếu phải fail closed | Đạt guest/Phase G; delivery thử nghiệm |
| Nhập kho và xuất kho | Admin/staff đúng lab | Receipt +10, issue -3, chặn xuất 99 khi thiếu tồn; tồn không đổi khi từ chối | Đạt API và browser thực |
| Điều chỉnh tồn | Admin; staff bị giới hạn | Adjustment -2; UI staff không có hành động điều chỉnh; API kiểm quyền, retry, cạnh tranh xuất | Đạt workspace integration và browser |
| Lập lịch và chuyển lịch bảo trì | Admin/staff đúng lab | Phải xem impact; xung đột; lý do đổi; lưu ngày mới; tiến độ và lịch sử | API đạt; UI còn QA-01 |
| Đóng bảo trì | Admin/staff | scheduled → in_progress → completed, đóng không còn sửa; trạng thái tài nguyên không tự bị suy diễn | Đạt sau chọn lại tài nguyên |
| Lớp/nhóm học phần | Giảng viên được phân công, sinh viên trong nhóm | Gửi hoạt động, yêu cầu sửa, gửi lại, ENDORSED; riêng tư và quyền nhóm | Đạt API và browser thực |
| Duyệt học thuật và duyệt tài nguyên | Lecturer/student | ENDORSED không thay trạng thái booking và không thay quyền cán bộ lab | Đạt, kiểm dữ liệu sau thao tác |
| Ảnh/video trong chi tiết | Người xem và quản lý có quyền | Chọn media, lỗi video 404, thiếu media, responsive, form cấu hình | Đạt UI fixture; S3 thực chưa kiểm |
| Metadata media | Admin, student, lecturer | HTTPS/host cho phép, chặn URL không hợp lệ, MIME/size, 403, 503 khi chưa cấu hình, thêm/xóa thực | Đạt API/PostgreSQL |
| Thanh toán và đối soát | Payment feature bật trong test | Lifecycle, callback chữ ký, lần gọi trùng, thất bại, thành công sau hủy cần đối soát | Đạt Phase H; chưa merchant thực |
| Assistant/MCP | Bốn vai trò và scope dữ liệu | Read-only, quyền, giới hạn request, timeout/cancel, grounding và thiếu bằng chứng | Đạt unit/integration; không gọi OpenAI thực |
| Song ngữ và thao tác UI | VI/EN, desktop/mobile | Điều hướng, giữ form khi đổi ngôn ngữ, keyboard, history, lỗi mạng, giới hạn vai trò | Đạt các route và viewport trong suite |

## 3. Lỗi còn mở và nợ kỹ thuật

### QA-01 - P2: Chuyển lịch bảo trì không giữ tài nguyên

**Tái hiện:** vào Bảo trì bằng admin → tạo công việc với tài nguyên và ngày bắt đầu/kết thúc → kiểm tra lịch bị ảnh hưởng → lưu → mở “Chuyển lịch / sửa công việc”. Trường tài nguyên trở về lựa chọn rỗng. Đổi ngày và nhập lý do rồi kiểm tra impact sẽ bị validation chặn. Không thể lưu nếu người dùng chưa tự chọn lại tài nguyên.

**Nguyên nhân đã đối chiếu:** `frontend/src/pages/MaintenancePage.tsx:33` lấy giá trị mặc định từ `editing.resourceId`. API serialize trong `backend/src/utils/dataContract.js:175` trả `resource.id` trong object lồng, không trả `resourceId`. Hai phía đang lệch contract khi mở form sửa.

**Ảnh hưởng:** thao tác chuyển lịch bị gián đoạn và người dùng phải đoán cần chọn lại phòng/thiết bị. Xếp P2 vì có cách xử lý tạm, API vẫn kiểm quyền và xung đột. Không ghi nhận sai dữ liệu hay vượt quyền từ lỗi này.

**Bằng chứng:** `evidence/maintenance-reschedule-defect.png`, `results/workflow-checks.json`, `logs/browser-stock-maintenance-teaching.log`. Hình và JSON nằm trong thư mục xuất báo cáo.

**Cách xử lý tạm đã kiểm:** chọn lại đúng tài nguyên, xem impact rồi lưu. API lưu ngày mới; tiếp tục in_progress → completed; công việc đóng còn trong lịch sử. Lần kiểm có xử lý tạm đạt, **không đóng QA-01**.

**Đề nghị sửa:** căn chỉnh field tài nguyên với contract hiện hành; thêm E2E mở lại lịch bảo trì và xác nhận tài nguyên được chọn sẵn, đổi lịch không phải chọn lại. Chưa sửa trong đợt kiểm thử này.

### QA-02 - P3: Build còn cảnh báo kích thước bundle

Build mặc định có entry JS 688,68 kB (gzip 171,07 kB). Build với research=false, payment=false, assistant=true vẫn có entry 689,27 kB (gzip 171,16 kB), vượt ngưỡng cảnh báo 500 kB của Vite. Đề nghị phân tích dependency/import và chia tải theo route. Chưa đo tốc độ mạng/CPU người dùng, không suy ra Lighthouse hay thời gian tải từ kích thước này.

### QA-03 - P3: Frontend còn 13 cảnh báo lint

Lint có 0 lỗi, 13 cảnh báo. Danh sách đầy đủ ở `logs/frontend-test-required.log`. Cần xem từng cảnh báo trước khi dọn; không tắt luật lint để làm xanh kết quả.

### QA-04 - P3: Cấu hình của bộ payment/MCP cần được ghi rõ

`paymentMcp.integration.test.js` ban đầu có một leaf test lỗi khi mặc định phần cứng tắt nhưng assertion vẫn đòi dữ liệu monitoring. TAP ghi 2 fail vì tính cả suite cha. Chạy lại database mới với `HARDWARE_TELEMETRY_ENABLED=true` đạt 10 kết quả. Đây là lệch giả định môi trường trong suite, chưa đủ bằng chứng kết luận lỗi runtime. Cần thêm trường hợp hardware=false và nêu cấu hình bắt buộc cho hardware=true.

## 4. Những lần chạy chưa đạt và cách phân loại

| Lần chạy | Nguyên nhân | Xử lý và kết quả |
| --- | --- | --- |
| Payment/MCP ban đầu | Test đòi telemetry khi feature mặc định tắt | Bật flag đúng cho suite trên DB mới; đạt; giữ log ban đầu |
| E2E Batch 7 ban đầu | Harness thiếu BOOKING_UPCOMING_REMINDER_MINUTES=10080 theo CI | Thêm cấu hình CI, seed DB mới; bộ đạt |
| Bổ sung workflow lần 1 | Harness đọc readonly rỗng thành false; đồng thời gặp QA-01 | Sửa harness đọc thuộc tính readOnly, bảo vệ Promise; không sửa ứng dụng |
| Workflow lần 2 | Assertion kiểm DOM ngay sau PATCH trước khi reload xong | Chờ trạng thái DOM được cập nhật; bộ đạt khi chọn lại tài nguyên; QA-01 còn mở |
| Kết nối server optional ban đầu | Mật khẩu cấu hình container cũ không khớp DB đang lưu | Tạo login chỉ dùng trong test, giữ credentials ngoài gói xuất |

Các lần chưa đạt được lưu riêng. Số liệu tổng dùng kết quả cuối và chỉ rõ điều kiện; không xóa lỗi khỏi báo cáo để làm tỷ lệ đẹp hơn.

## 5. Môi trường, dữ liệu và giới hạn

- Windows, Node.js v22.15.0, PostgreSQL 16; Chromium headless qua Playwright. Chạy API/React thật cho E2E nghiệp vụ, stock, maintenance, teaching và media metadata.
- Database thử nghiệm có tên chứa test cho các suite; role/browser dùng demo riêng trong container ở cổng 15439. Suite optional dùng server thử nghiệm cổng 15436. Không dùng demo đang phục vụ người dùng tại cổng DB 5432 để thực hiện chuỗi thao tác browser.
- Các DB mới dùng installer migration chuẩn của dự án; clean baseline và 16 forward migrations triển khai thành công. Có kiểm tra triển khai lại và constraint persistence. Không chạy migrationSafetyMatrix vì script có bước chèn trực tiếp `_prisma_migrations`, không phù hợp quy tắc repository. Vì vậy chưa xác nhận toàn bộ ma trận recovery migration.
- Rate limit thử nghiệm tăng để đủ tải kiểm thử; scheduler tắt và các bộ nhắc lịch dùng cấu hình/chạy trigger thử nghiệm. Chưa đo rate limit ở tải production hoặc chạy soak/load test kéo dài.
- Mail/OTP dùng delivery thử nghiệm và kiểm fail-closed khi SMTP thiếu; **chưa gửi email qua SMTP thực**.
- Payment dùng secret và callback thử nghiệm; **chưa kiểm cổng merchant/tiền thực**. Payment test bật riêng, không làm payment feature trở thành yêu cầu triển khai.
- Media UI dùng fixture và video lỗi có chủ ý. API media kiểm metadata lưu DB và từ chối upload khi thiếu cấu hình. **Chưa PUT/HEAD/xóa object S3/R2 thực, chưa xác minh ảnh/video bên ngoài phát được hoặc đúng thiết bị ngoài đời.**
- Telemetry dùng dữ liệu thử nghiệm, không có phần cứng/camera thật. Assistant kiểm logic/API/MCP với OpenAI key trống; **chưa đánh giá câu trả lời của model live**.
- Thử route recovery có intercept lỗi mạng/fixture đúng mục đích kiểm UI; không dùng mock success thay cho bằng chứng nghiệp vụ lưu DB.
- Không kiểm các module research đã nghỉ, không bật lại thuật toán cũ. Không kiểm mọi tổ hợp browser/OS, timezone, accessibility bằng screen reader hoặc mọi trạng thái có thể phát sinh. 531 kiểm tra UI là phạm vi suite, không chứng nhận khả năng tiếp cận toàn diện.
- Audit dependency chỉ gồm production dependencies và dữ liệu advisory tại lúc chạy; không thay cho security penetration test.

## 6. Gói báo cáo và khả năng kiểm tra lại

Gói xuất nằm tại `artifacts/qa-report-2026-10-03/`:

- `report.md`: bản báo cáo này.
- `report.pdf`: bản trình bày để đọc/in.
- `results/`: exit code, TAP, check list và kết quả các lần chạy.
- `logs/`: log suite đã che URL có mật khẩu và token; giữ cả log trước/sau các lần sửa harness.
- `evidence/`: ảnh trình duyệt của đợt này; không lấy ảnh cũ làm bằng chứng mới.
- `manifest.json`: revision, môi trường, cách đếm, danh sách file và SHA-256 để đối chiếu.
- `harness/`: các bộ chạy bổ sung, đã thay credential bằng biến môi trường. Suite chính dùng script test đang có trong repository.

Lệnh chính: backend `npm run test:required`, `test:batch1:concurrency`, `test:batch1:persistence`, `test:batch1e-runtime`, `test:batch2` đến `test:batch8`, `test:guest-integrity`, `test:phase-e`, `test:phase-f`, `test:lab-workspace`, `test:assistant:integration`; optional `node --test` theo file Phase H/openLab/paymentMcp. Frontend `npm run test:required`, `test:phase-g`, `test:ui:workspace`, `test:ui:bilingual`, `test:ui:roles` và các script E2E Batch 2-8/Phase H/resource dossier.

Trước khi chạy lại, dùng DB thử nghiệm riêng, triển khai migration chuẩn, seed đúng bộ, cấu hình URL UI/API và feature flag. Không copy credentials của môi trường thật vào báo cáo. Harness được lưu để đối chiếu đợt kiểm; không phải một lệnh CI sẵn chạy trên mọi máy.

## 7. Thứ tự xử lý đề xuất

1. Sửa QA-01, thêm regression E2E rồi chạy lại maintenance/workspace/bilingual.
2. Ghi rõ cấu hình và bổ sung test hardware=false cho payment/MCP; xử lý cảnh báo frontend theo log.
3. Cấu hình môi trường tích hợp SMTP, S3/R2 và payment sandbox có quyền thật; kiểm upload/phát media, gửi OTP và callback thực trước khi xác nhận các tích hợp.
4. Đo bundle và hiệu năng ở cấu hình demo thực tế; bổ sung smoke test có thể chạy lại trong CI.

**Ranh giới:** đã hoàn tất đợt kiểm thử và xuất bằng chứng cho phạm vi trên. Chưa xác nhận sẵn sàng merge; QA-01 còn mở. Báo cáo không đồng nghĩa phê duyệt tính đúng đắn của mọi luồng có thể xảy ra.
