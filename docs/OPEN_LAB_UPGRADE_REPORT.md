# Open LAB upgrade — báo cáo triển khai và bàn giao

Cập nhật: 2026-09-24. Trạng thái: **đang triển khai, chưa phải bản final**.

## Phạm vi được người dùng chốt

- LAB phục vụ nội bộ và người ngoài; thu phí tùy tài nguyên/mục đích.
- Đặt nhanh từ trang công khai, nhập thông tin liên hệ và chọn địa chỉ hành chính Việt Nam; xác minh email OTP, tạo hoặc tái sử dụng tài khoản. Theo chốt mới của người dùng, khách ngoài nhận tài khoản email với mật khẩu ban đầu là số điện thoại và bị đánh dấu cần đổi mật khẩu sau đăng nhập.
- Hiển thị phí trước khi gửi; nếu cần duyệt thì duyệt trước thanh toán. VNPAY gắn với booking; trạng thái thanh toán tách khỏi BookingStatus.
- Chủ booking phòng ROOM tự hoàn trả, giải phóng phần thời gian còn lại. Thiết bị cần nhân viên tiếp nhận/kiểm tra; hỏng hóc gắn với lịch sử và thông tin người mượn.
- ADMIN và LAB_STAFF được phân công nhận thông báo vận hành; người đặt nhận kết quả.
- URL phản ánh màn hình; tổng quan vận hành và telemetry có mục đích riêng.
- Loyalty profile đã có checkpoint đầu: thống kê chi tiêu/booking từ dữ liệu thật và tín hiệu LAB priority/discount. Tích hợp vận chuyển vẫn là hướng sau.

## Tiến trình

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Khảo sát trạng thái local và hợp đồng hiện tại | Đã đọc | Có nhiều thay đổi chưa commit từ các pass trước; giữ nguyên |
| URL dashboard / back / refresh | Đã triển khai, browser PASS | Hash route riêng, reload/back/forward và guard theo vai trò |
| Tách vận hành / telemetry | Đã triển khai, browser PASS | Hai chế độ hiển thị riêng, nêu nguồn dữ liệu và thời điểm cập nhật |
| Thông báo quản trị theo sự kiện booking | Đã triển khai, integration PASS | Admin + staff được phân công + kết quả cho owner, cùng transaction, dedupe, link booking |
| Tự trả phòng và giải phóng lịch | Đã triển khai, API + browser PASS | Owner ROOM, audit RETURN/COMPLETE nguyên tử, giữ planned times, bảo toàn trạng thái hỏng/bảo trì |
| Bảng giá và phí booking | Đã triển khai, API + browser PASS | Admin cấu hình theo resource/purpose; quote server; snapshot/version; tự tạo khoản thu khi CONFIRMED |
| Điều kiện bàn giao có phí | Đã triển khai, integration PASS | Chặn CHECK_OUT nếu chưa có thanh toán đủ phí và paidAt được lưu |
| Hạn giữ chỗ/thanh toán và callback muộn | Chưa hoàn thành | Chưa tự hủy booking hết hạn; cần cơ chế đối soát/hoàn tiền khi callback đến sau hủy |
| Đặt nhanh, danh tính ngoài trường, email OTP | Đã triển khai code, chờ DB/SMTP để smoke live | Route `/api/guest-booking`, OTP SMTP thật, tự tạo/tái sử dụng user `customerType=EXTERNAL` |
| Chọn địa chỉ Việt Nam có nguồn/version | Đã triển khai code, service smoke PASS | Backend cache từ `provinces.open-api.vn/api/v2`, lưu source/version vào user |
| Kiểm thử nâng cấp | PASS phạm vi hiện tại | Chi tiết bên dưới; không chứng minh OTP/địa chỉ/loyalty chưa xây |

## Checkpoint triển khai 2026-09-23 — phí booking

- Migration additive `20260923000100_booking_pricing`: bảng `resource_pricing_rules`, `Booking.feeAmountVnd`, `Booking.feeSnapshot`. Không đổi canonical enums, không sửa migration cũ.
- Giá VND nguyên, tính theo phút đặt và làm tròn lên 1 đồng. Tài nguyên chưa có bảng giá tiếp tục miễn phí. Khi đã có bảng giá, bắt buộc chọn một mục đích được cấu hình; không bỏ purpose để né phí.
- Quote được tính lại dưới resource lock khi tạo booking; version/số tiền khác mức đã xác nhận trả 409. Booking cũ giữ snapshot dù admin đổi giá.
- Lịch cần duyệt chưa tạo charge; duyệt mới tạo charge đúng phí trong cùng transaction. Lịch xác nhận ngay tạo charge khi đặt. Bàn giao chỉ qua khi có giao dịch success đúng tiền/VND/paidAt.
- Không khẳng định đã thanh toán ngân hàng thật. VNPAY/MCP test dùng credential và callback có chữ ký của fixture cô lập. Cấu hình merchant thật vẫn chưa kiểm chứng.
- Repo HEAD bên ngoài đã tiến tới `7c1c863` (`review`) trong khi làm; không reset các commit này. Thay đổi phí hiện để local, chưa commit/push.

## Bằng chứng kiểm thử

| Kiểm thử | Kết quả |
| --- | --- |
| `node --test test/openLab.operations.integration.test.js` | 4/4; gồm owner scope, concurrent retry, release overlap, không tự trả thiết bị, bảo toàn BROKEN, giá tamper/stale, charge sau duyệt, payment gate |
| Backend Batch 4 | 31/31 |
| Backend Batch 5 | 13/13 |
| Backend Batch 6 | 11/11 |
| `node --test test/paymentMcp.integration.test.js` | 10/10 |
| `node frontend/test_open_lab_operations.mjs` | PASS; URL/back/reload, vai trò, ROOM return, admin đặt giá → người đặt thấy phí → booking → khoản thu |
| Frontend lint/typecheck/build | PASS; 0 lỗi lint, 12 cảnh báo kế thừa |
| Prisma validate / generate / migrate deploy | PASS; test DB cô lập trước, sau đó local demo |

Evidence: `frontend/screenshots_temp_open_lab/` gồm `browser-results.json`, `browser-pricing.log`, `backend_batch4_final.log`, `backend_batch5_final.log`, `backend_batch6_final.log`, `payment-regression.log`, `frontend-required-pricing.log`, `pricing-quote.png`, `booking-payment.png`. Đã mở xem screenshot desktop/mobile và modal trả phòng.

DB kiểm thử: `lab_resources_open_lab_test_20260923_b`, các DB `lab_resources_b*_..._openlab_20260923_pricing` và `lab_resources_payment_ai_test_pricing_20260923`, tất cả trên PostgreSQL local port 15436. Browser test chỉ thao tác fixture của DB có guard này, không dùng dữ liệu người dùng.

## Chạy local và bước bàn giao kế tiếp

- Đã migrate `lab_resources_local_demo` và chạy lại UI `http://127.0.0.1:15179`, API port 15004, bật cả `PAYMENTS_ENABLED` và `VITE_ENABLE_PAYMENT_FEATURES`. Launcher PID tại checkpoint: 24524 (phải kiểm tra lại, không giả định còn sống).
- Admin → Thanh toán → Bảng giá tài nguyên theo mục đích để cấu hình mức phí thật cho demo. Không tự áp giá mẫu lên tài nguyên của người dùng. Vì vậy các tài nguyên demo chưa cấu hình vẫn miễn phí.
- Người đặt chọn tài nguyên có bảng giá, thấy phí trước khi gửi. Nếu cần duyệt, admin duyệt rồi chủ booking mở Thanh toán lịch đặt. VNPAY chỉ dùng được khi merchant/callback đã cấu hình đúng.
- Tiếp tục ưu tiên: hạn giữ chỗ/thanh toán + callback muộn/đối soát; thông báo kết quả payment; public browse + fast booking/email OTP + danh tính ngoài trường; address dataset có provenance; báo gửi trả thiết bị và liên hệ người mượn.
- Chưa tự nhận phòng bằng owner; hiện staff bàn giao, owner tự trả ROOM. Chưa có API đơn vị vận chuyển, loyalty, OTP hoặc đăng nhập bằng số điện thoại.

## Điều chỉnh checkout theo phản hồi người dùng — 2026-09-23

- Vấn đề được phản ánh: sau khi đặt lịch màn hình chỉ hiện sổ giao dịch trống, không có bước thanh toán giống mua vé/đơn hàng.
- Booking đã xác nhận và có phí giờ chuyển thẳng sang trang thanh toán riêng của đúng booking. Trang hiển thị phòng, giờ, số tiền, mã đặt và một nút “Thanh toán … qua VNPAY-QR”. Người đặt không cần lọc hoặc chọn giao dịch trong sổ cái. Booking chờ duyệt hiển thị bước chờ; sau duyệt mở cùng liên kết từ lịch đặt. Booking miễn phí cũ nêu rõ 0đ và không có QR, thay vì mở sổ giao dịch trống.
- Backend ký URL VNPAY 2.1.0 với `vnp_BankCode=VNPAYQR`; mã QR và bước nhập thông tin ngân hàng được VNPAY hiển thị trên trang cổng thanh toán. Ứng dụng không dựng ảnh QR từ URL hoặc nhận thông tin thẻ. Trang return có liên kết quay lại booking; chỉ IPN xác thực mới cập nhật trạng thái paid.
- [Tài liệu chính thức VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) mô tả `vnp_BankCode=VNPAYQR`, URL ký, QR trên cổng và IPN. Đây là lý do UI chuyển sang cổng thay vì tự vẽ QR tại trang LAB.
- Kiểm thử sau thay đổi: `openLab.operations.integration` 4/4; browser trên DB `lab_resources_open_lab_test_checkout_final_20260923` PASS gồm booking miễn phí, tự chuyển checkout của booking 90.000đ, QR redirect được chặn tại test gateway và URL có đúng amount/BankCode/chữ ký; `paymentMcp.integration` 10/10 trên DB `lab_resources_payment_ai_test_checkout_20260923`, gồm kiểm tra link return, chữ ký callback và idempotency. Frontend typecheck/lint/build PASS, 12 cảnh báo lint cũ.
- Screenshots: `frontend/screenshots_temp_open_lab/booking-free.png`, `booking-payment.png`, `booking-payment-mobile.png`; log: `checkout-final-browser.log`, `checkout-final-backend.log`, `checkout-payment.log`.
- Máy local hiện không có merchant VNPAY sandbox (`providers.vnpay=false`). Với dữ liệu demo thật, nút thanh toán có phí sẽ ghi rõ cổng chưa cấu hình; không thể giao dịch/quét QR thật trước khi có TmnCode, HashSecret và callback/IPN truy cập được. Không lưu credential trong repo hoặc báo cáo. Không gắn phí mới vào booking cũ 0đ.
- Booking người dùng nêu trong ảnh, `b2b4c03c-8641-45b1-861e-6d7368a4a983`, đã được kiểm tra read-only trên local: `feeAmountVnd=0`. Vì vậy trường hợp ảnh không sinh khoản thu hay QR. Màn hình mới nêu điều này rõ ràng. Giá cấu hình sau không áp hồi tố lên booking đã lập.
- Browser cuối trên DB cô lập `lab_resources_open_lab_test_checkout_mobile_20260923`: PASS cả desktop/mobile, không tràn ngang; đã mở `booking-free.png`, `booking-payment.png`, `booking-payment-mobile.png`. URL VNPAY sandbox bị chặn tại fixture test sau khi kiểm tra `vnp_BankCode=VNPAYQR`, số tiền và chữ ký; không gửi thanh toán thật.
- Local demo chạy lại sau thay đổi checkout; smoke API/UI trả 200 và provider cho biết `vnpayReady=false`. Tại thời điểm báo cáo launcher PID là 1232, cần kiểm tra lại khi tiếp quản. Cấu hình merchant cần `VNPAY_ENABLED`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL` và trang quay lại ứng dụng `PAYMENT_APP_URL` (nếu khác origin CORS đầu tiên). URL return/IPN phải truy cập được từ môi trường VNPAY; `127.0.0.1` chỉ dùng cho integration test local.

### Kiểm tra lại khả năng thanh toán local — 2026-09-23

- Xác nhận trên `lab_resources_local_demo`: trước khi sửa seed, không có `resource_pricing_rules` hoặc `payment_transactions`; 5 booking hiện có đều `feeAmountVnd=0` (3 còn chờ duyệt, 1 hoàn tất, 1 từ chối). Vì vậy người dùng không có giao dịch để thanh toán. Đây là dữ liệu thực tế local, không phải lỗi lọc của màn hình.
- `backend/.env` không có bất kỳ biến `VNPAY_*` hoặc `PAYMENTS_ENABLED`; launcher demo bật cờ payments cho phiên chạy, nhưng `GET /api/payments/my` vẫn trả `providers.vnpay=false`. API và UI local đều trả HTTP 200. Nút VNPAY bị khóa có chủ đích khi thiếu merchant Sandbox.
- Seed local demo nay thêm giá mẫu 50.000 VND/giờ cho mục đích `STUDY` của `LOCAL-ROOM-01` **chỉ nếu phòng đó chưa có bảng giá nào**. Chạy seed 2 lần cho đúng một rule version 1; không sửa bảng giá do người dùng cấu hình, booking cũ hoặc lịch sử giao dịch. API quote trực tiếp cho một giờ trả 50.000 VND.
- Đã thực hiện một booking **kiểm thử có ghi rõ local demo** bằng API theo đúng luồng: student đặt `LOCAL-ROOM-01` ngày 24/09/2026 10:00–11:00 giờ Việt Nam, admin duyệt. Booking `d1d34860-c2c0-42a2-9c4e-a494b7fda58a` hiện `CONFIRMED`, phí 50.000 VND và đúng một charge `pending` 50.000 VND. Trang xem trực tiếp: `http://127.0.0.1:15179/#/workspace/thanh-toan?booking=d1d34860-c2c0-42a2-9c4e-a494b7fda58a` khi đăng nhập `student@lrm.local`. Đây là dữ liệu kiểm thử có thể hủy theo chính sách booking, không phải khoản đã thanh toán.
- Để thử checkout: tạo **booking mới** cho `LOCAL-ROOM-01`, chọn mục đích học tập và xem số tiền trước khi gửi. Vì phòng demo yêu cầu duyệt, đăng nhập admin duyệt booking; đăng nhập lại người đặt và mở thanh toán từ booking đó. Sau bước này sẽ có khoản thu pending và trang checkout; quét QR VNPAY vẫn chưa hoạt động cho tới khi cấu hình merchant.
- Để thử VNPAY Sandbox thực sự, đăng ký merchant tại [VNPAY devreg](https://sandbox.vnpayment.vn/devreg/) để lấy TmnCode/HashSecret; lưu bí mật trong `backend/.env` local (không commit/không gửi trong chat). Bật `VNPAY_ENABLED=true`, nhập `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL=https://<public-api-host>/api/payments/vnpay/return`, `VNPAY_IPN_URL=https://<public-api-host>/api/payments/vnpay/ipn` và cấu hình IPN tương ứng trong merchant Sandbox. Public API host phải chuyển tiếp về backend đang chạy; khởi động lại API. `PAYMENT_APP_URL=http://127.0.0.1:15179` dùng cho liên kết trở về UI trên cùng máy. Kiểm tra `providers.vnpay=true` trước khi nhấn thanh toán. Không điền khóa mẫu không thuộc merchant này, không đánh dấu paid khi chỉ có return URL; chỉ callback IPN có chữ ký hợp lệ được cập nhật paid.
- Trạng thái xác minh hiện tại: quote, seed local, create→approve→charge qua API PASS; frontend/backend smoke PASS; browser test có fixture chữ ký PASS theo checkpoint trên. **Chưa xác minh được một giao dịch VNPAY Sandbox thực tế** vì chưa có thông tin merchant và IPN công khai. Đây là blocker bên ngoài còn tồn tại, không phải trạng thái hoàn thành thanh toán.

### Catalog công khai, ảnh/video minh họa và S3/R2 — 2026-09-23

- Đã thêm persistence `ResourceMedia` bằng migration additive `20260923000200_resource_media`. Mỗi media gắn với tài nguyên, loại `IMAGE`/`VIDEO`, URL public, object key nếu upload S3/R2, alt text, source URL, credit, license và thứ tự hiển thị. Không đổi enum vai trò/trạng thái booking.
- API mới: `GET /api/resources/:resourceId/media` public; `POST /api/resources/:resourceId/media/upload`, `/complete`, `/external` và `DELETE /api/resources/:resourceId/media/:mediaId` yêu cầu `ADMIN` hoặc `LAB_STAFF` đúng phạm vi lab. Bug phát hiện trong smoke: middleware media từng chặn nhầm `GET /api/resources`; đã sửa auth theo từng route mutation.
- Storage upload dùng S3-compatible presigned PUT. Cần cấu hình backend khi deploy: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION` (R2 thường dùng `auto`), `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. Bucket R2/S3 cần CORS cho `PUT` từ domain frontend và public read/CDN cho `MEDIA_PUBLIC_BASE_URL`.
- Khi chưa có R2, local demo dùng external media từ Wikimedia Commons với source/credit/license lưu trong DB. Seed chỉ insert nếu chưa có dòng trùng `resourceId + sourceUrl + title`; không xóa hoặc reset booking/payment/incident/telemetry. Các ảnh/video là tư liệu minh họa đúng loại tài nguyên, không phải ảnh tài sản thật của dự án.
- `backend/scripts/seedLocalDemo.mjs` đã thêm ảnh cho 2 phòng, máy hiện sóng, đồng hồ vạn năng, camera, máy in 3D, máy khoan bàn, bộ thí nghiệm; `LOCAL-KIT-01` có thêm video minh họa mạch timer. Query local demo sau seed: 9 tài nguyên public có ảnh; material không hiển thị trong catalog public.
- Trang chủ công khai nay hiển thị catalog thật từ API, filter theo phòng/thiết bị/máy/bộ thí nghiệm, mở chi tiết có gallery ảnh/video, credit/source/license, lịch bận 14 ngày tới từ `/api/resources/:id/schedule`, và CTA sang lịch đặt. Phí vẫn được tính lại ở bước đặt lịch theo bảng giá server.
- Copy landing đã chỉnh theo hướng phòng LAB mở hơn: phục vụ sinh viên, giảng viên và đơn vị bên ngoài; thu phí theo tài nguyên/mục đích khi có bảng giá; VNPAY Sandbox gắn với booking đã xác nhận và cập nhật paid qua IPN có chữ ký.
- Local demo đang chạy lại sau checkpoint: UI `http://127.0.0.1:15179`, API `http://127.0.0.1:15004`, launcher PID tại thời điểm ghi báo cáo là `15244`. Cần kiểm tra lại PID khi tiếp quản.

Kiểm thử sau media/catalog:

| Kiểm thử | Kết quả |
| --- | --- |
| `npx prisma generate` | PASS sau khi dừng local demo giữ DLL |
| `npx prisma migrate deploy` trên `lab_resources_local_demo` | PASS, no pending migrations |
| `npm run demo:seed-local` | PASS; media minh họa insert idempotent |
| `npx prisma validate` | PASS |
| Backend lint + `node --check src/routes/resourceMedia.js` | PASS |
| Frontend lint/typecheck/build | PASS; lint còn 13 warning kế thừa, 0 error |
| `node --test test/openLab.operations.integration.test.js` trên `lab_resources_open_lab_test_media_20260923171002` | 4/4 PASS |
| `node --test test/paymentMcp.integration.test.js` trên `lab_resources_payment_ai_test_media_20260923171002` | 10/10 PASS |
| API smoke local demo | PASS; `GET /api/resources` public trả 11 resources, 9 public resources, `LOCAL-ROOM-01` có media và schedule |
| Browser smoke public catalog desktop/mobile | PASS; 9 cards, 9 images loaded, detail có source và lịch bận, không tràn ngang |

Screenshots mới: `frontend/screenshots_temp_open_lab/public-catalog-desktop.png`, `frontend/screenshots_temp_open_lab/public-catalog-mobile.png`.

Nguồn tư liệu đang dùng trong seed cần giữ credit khi demo: Wikimedia Commons file pages như `Electronics_Lab_in_realraum.jpg`, `Digital_oscilloscope_in_use.jpg`, `Digital_Multimeter_Aka.jpg`, `Security_camera_(1).jpg`, `3D_printer_in_a_school_workshop.jpg`, `3D_Printing_an_Object_using_FDM_Printer.jpg`, `Harpers_Ferry_gun_smith_shop_-_drill_press_-_01.jpg`, `ARDX_-_Arduino_Experimentation_Kit_(Inside_the_box).jpg`, `A_few_Jumper_Wires.jpg`, `Experiment_with_Timer.webm`. Nếu đưa lên sản phẩm thật, ưu tiên import về R2 với metadata giấy phép thay vì phụ thuộc link external.


### Quick booking khách ngoài, địa chỉ Việt Nam, hồ sơ loyalty — 2026-09-24

- Migration additive `20260923000300_guest_identity_loyalty`: bổ sung `User.customerType`, `organization`, địa chỉ mặc định có source/version, cờ `passwordResetRequired`, trường loyalty LAB và bảng `email_otps`. Không đổi enum role/status/category; external customer được biểu diễn bằng role canonical `STUDENT` + `customerType=EXTERNAL`.
- API mới: `/api/address/vietnam/provinces`, `/api/address/vietnam/wards`, `/api/guest-booking/otp`, `/api/guest-booking/book`. OTP dùng SMTP thật qua `sendRequiredEmail`; thiếu SMTP trả `EMAIL_NOT_CONFIGURED`, không trả mock success và xóa OTP vừa tạo.
- Quick booking public: từ chi tiết tài nguyên có form họ tên, đơn vị, email, số điện thoại, địa chỉ Việt Nam dạng chọn, mục đích/thời gian, quote phí server, gửi OTP, xác thực rồi tạo booking. Nếu booking xác nhận ngay và có phí, UI đăng nhập phiên mới và chuyển sang tab Thanh toán của booking; nếu cần duyệt hoặc miễn phí, chuyển sang Lịch đặt.
- Đăng ký tài khoản thường nay có số điện thoại, nhóm sử dụng nội bộ/khách ngoài, tổ chức và địa chỉ mặc định. Backend vẫn để địa chỉ optional để không phá flow/test cũ; UI yêu cầu nhập để chuẩn bị nghiệp vụ mượn thiết bị/giao nhận.
- Hồ sơ mới `Hồ Sơ & Ưu Tiên LAB` hiển thị tổng chi tiêu từ `payment_transactions.success`, booking hoàn tất/đang xử lý, điểm/tier LAB, discount và priorityBoost. Đây là tín hiệu LAB, không vượt quyền duyệt hoặc policy.
- Nguồn địa chỉ hiện dùng Province Open API v2 sau sáp nhập 07/2025. Service smoke ngày 2026-09-24 trả 34 tỉnh/thành; Hà Nội có 126 phường/xã. Backend cache 12 giờ và không gọi `depth=3`.
- Giới hạn hiện tại: chưa smoke live endpoint cần DB vì PostgreSQL local `localhost:5432` và Docker Desktop đều đang tắt. Chưa test email OTP end-to-end vì `SMTP_HOST`/`SMTP_USER` chưa có trong `backend/.env`. Đây là blocker môi trường, không phải mock pass.

Kiểm thử sau checkpoint quick booking:

| Kiểm thử | Kết quả |
| --- | --- |
| `npx prisma validate` | PASS |
| `npm run db:generate` | PASS |
| Backend lint | PASS |
| Frontend lint | PASS; 13 warning kế thừa, 0 error |
| Frontend typecheck | PASS |
| Frontend build | PASS; rerun after password-reset notice |
| Impeccable detector | PASS; `[]` on quick booking/profile/register/catalog files |
| Address service smoke | PASS; 34 tỉnh/thành, Hà Nội 126 phường/xã |
| `prisma migrate deploy` local | BLOCKED; PostgreSQL `localhost:5432` không chạy |
| Guest OTP live smoke | BLOCKED; cần DB + SMTP thật |

Bước kiểm thử kế tiếp khi mở PostgreSQL/Docker: chạy `cd backend && npm run db:migrate`, seed/local demo nếu cần, cấu hình SMTP test thật, mở trang public catalog, chọn tài nguyên, gửi OTP tới email thật, hoàn tất booking, sau đó duyệt/thanh toán theo trạng thái tài nguyên.

## Quy tắc bàn giao giữa các agent

1. Đọc AGENTS.md, tài liệu bắt buộc và báo cáo này trước khi sửa.
2. Kiểm tra git diff; không reset hoặc ghi đè công việc local. Không seed lại dữ liệu người dùng đã thao tác để làm test xanh.
3. Cập nhật trạng thái theo kết quả thực, ghi lệnh kiểm thử và giới hạn. Không gọi bản này là final.
4. Không đổi enum vai trò âm thầm; danh tính ngoài trường dùng role canonical `STUDENT` kèm `customerType=EXTERNAL` và phải ghi rõ trong hợp đồng/API.
5. Không chạy db push; migration mới phải additive, thử trên DB cô lập trước.
6. OTP phải gửi qua SMTP thực; thiếu cấu hình phải báo lỗi, không trả mock success. Callback thanh toán phải kiểm chữ ký, số tiền và idempotency.

## Cấu hình bên ngoài cần xác minh

- SMTP để gửi OTP, tên miền gửi thư và khả năng nhận thư thực.
- VNPAY sandbox/merchant, secret, URL callback/IPN truy cập được.
- Nguồn địa chỉ hành chính hiện hành và dịch vụ gợi ý địa chỉ chi tiết.

Không ghi secret hoặc dữ liệu liên hệ thật vào báo cáo.
