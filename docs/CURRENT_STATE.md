# Trạng thái dự án hiện tại

## Tích hợp vào booking hiện có — kiểm browser21/10/2026

Theo yêu cầu user, đã bỏ menu/page “Điều phối sử dụng LAB”. URL cũ chuyển về
booking, giữ query. Đặt nhóm1..5 cùng LAB/giờ ở SelectionPage hiện có; hồ sơ
trong lịch sử booking; waitlist trong booking; quy tắc ADMIN trong đúng
AdminResourceConsole; phân tích trong OperationsReport. Không đổi schema/role/
status hay thanh toán riêng từng booking. Hướng dẫn code ở services/planning/README.

Browser thật21/10 CUSTOMER/ADMIN/STAFF: redirect/menu PASS; hồ sơ của booking
COMPLETED đọc được, ghi checklist bị khóa; group quote15.000+5.000=20.000VND;
giờ đảo ngược bị khóa; trộn LAB báo lỗi/khóa và phục hồi khi bỏ mục sai;
giữ draft khi đổi chế độ; mobile390px content380px, một cột; VI/EN report PASS.
ADMIN đọc policy và preview0/0, không lưu; STAFF không có editor policy và đọc
report được. Report15 bookings từ DB; UI scope không thay thế test RBAC server.

Đã phát hiện/sửa trong lượt browser: mô tả atomic khác independent; mất draft
khi đổi mode; ô chọn chế độ inline vỡ khung mobile; policy gắn nhầm component
phụ không chạy cho ADMIN. Thêm validation nhóm cùng LAB/1..5, giữ request key
khi retry gặp401/403/408/429 thay vì coi là rollback. Không tạo booking QA trên
DB demo. Sau kiểm vẫn6users/25resources/15bookings/17payment_transactions.
Tài khoản và tab trả về CUSTOMER/profile; lựa chọn QA đã bỏ.

Full FE required91 PASS (thêm2 helper +1 route), lint/typecheck/build PASS;
diff check PASS. Evidence/ảnh ở
`C:/Users/Admin/AppData/Local/Temp/lrm-integrated-ui-20261021/`;
log `lrm-integrated-ui-final-20261021.log` trong Temp.
Frontend lúc đầu dừng làm tab báo locale failure; khởi động bằng dev-local.mjs
và reload nạp được catalog có hash khớp; không nới integrity check.

Giới hạn: chưa tạo nhóm mới hoặc giả mất mạng/429 qua browser, chưa lưu policy/
checklist hay kiểm in PDF trong lượt này; các thao tác ghi cần QA DB riêng.
Backend planning integration10 và các suite91 của20/10 là evidence trước đó,
không gộp vào số test chạy21/10. Chưa load-test/live provider/production deploy.
Next: E2E ghi nhóm→retry→handover/return/checklist/in trên runtime QA tách biệt,
đối chiếu trạng thái DB; không cần thêm màn hình chức năng mới.

## Kiểm thử và tối ưu UI/UX planning — 20/10/2026

Đã kiểm UI thật CUSTOMER tại `/workspace/planning`. Thêm tìm tên/mã/LAB không
dấu, danh sách đã chọn và bỏ chọn, lý do khóa khác LAB, validation giờ, giữ
bản nháp khi đổi tab, loading/error/retry/empty riêng biệt, trạng thái từng hồ
sơ và giải thích checklist đã ghi/chưa đủ trạng thái. Sửa title thiếu dịch,
locale lịch sử policy, biểu đồ giờ đọc được theo danh sách. Quyền API giữ nguyên.
`planningPresentation.ts` chứa helper thuần;3 test mới vào test:required.

Tái hiện input datetime thay đổi giá trị hiển thị nhưng draft React chưa cập
nhật trong browser automation; dùng onInput để cập nhật ngay. Browser recheck:
14:00→13:00 báo lỗi/khóa quote;14:00→15:00 lấy quote thật10.000VND.
Tìm “cam bien”, chuyển hồ sơ rồi về giữ title/selection, empty dossier và VI/EN
PASS. Mobile390px: content380px, media600px true, layout một cột344px.
Full FE required88 PASS, lint (hai warning cũ), typecheck/build PASS; sau sửa
onInput, typecheck/build kiểm lại PASS. Diff check PASS.

Runtime bị ngắt giữa phiên (Chrome mất kết nối, Docker engine dừng); khởi động
lại Docker Desktop và frontend nền bằng script hiện có, không seed/reset.
IAB sau đó truy cập thành công. Business counts vẫn6/25/15/17.
Ảnh cuối: `C:/Users/Admin/AppData/Local/Temp/lrm-planning-ux/planning-final.png`.
Logs: `lrm-planning-ux-final.log`, `lrm-planning-ux-input-check.log` trong Temp.
Chưa browser QA đầy đủ ADMIN/STAFF, lưu checklist/in PDF và fault injection.
Không coi kiểm tra CUSTOMER là nghiệm thu toàn bộ UI hay production/load test.

## Mở rộng lập kế hoạch và hồ sơ — 20/10/2026

User đã duyệt triển khai các hướng phát triển phần mềm, không cần phần cứng,
không nặng thuật toán. Checkout main48ccd96; giữ các thay đổi có trước.
Đã thêm `/workspace/planning`, API `/api/planning`, các module riêng trong
`backend/src/services/planning/` và component `features/planning/`.
Phạm vi ADR-045: chính sách revision/audit/preview, nhóm tối đa5 tài nguyên tạo
nguyên tử và retry idempotent, hồ sơ/checklist, gợi ý giờ/thay thế theo thông số,
waitlist thông báo trong ứng dụng, báo cáo có scope. Hướng dẫn đọc code:
`backend/src/services/planning/README.md`.

Hai migration20261020000100/20261020000200 đã áp dụng local sau backup custom
dump tại `C:/Users/Admin/AppData/Local/Temp/lrm-before-planning-20261020.dump`;
pg_restore --list đọc được. Không seed/reset/push/deploy production.
Sau áp dụng:6users/25resources/15bookings/17payment_transactions, khớp trước;
backend health200, Docker healthy. Checklist là khai báo, không chứng minh
thiết bị vật lý; thanh toán/vòng đời vẫn riêng từng lịch, waitlist không giữ chỗ.

Kiểm chứng: BE required144 PASS, FE required85 PASS; lint/typecheck/build PASS
(hai warning frontend có trước). ERD check và git diff --check PASS.
Integration PostgreSQL riêng: planning10, operational-audit12, resources9,
calendar17, operations13, fulfillment13, payment-hold17 =91 PASS khi hợp nhất
lượt đầu và resource recheck. Lượt đầu resources phát hiện detail giới hạn30 ngày
làm mất lịch xa; đã sửa giữ lịch tương lai, recheck9/9. Rerun dùng localhost
gặp timeout mở connection; cùng bài với127.0.0.1 PASS, không nới timeout nghiệp vụ.
Logs: `C:/Users/Admin/AppData/Local/Temp/lrm-planning-regression/`,
`lrm-planning-resource-recheck.log`, `lrm-planning-*-check.log`,
`lrm-planning-final-{fe,be}.log`.

Giới hạn: browser bị URL policy chặn trong phiên này; chưa visual QA, chưa
browser E2E cho workspace mới/in hồ sơ. Chưa load-test production; mức giới hạn
tìm kiếm12/phút/user,3 truy vấn đồng thời/process không thay thế đo tải.
Mẫu checklist dùng chung ba bước; chưa có mẫu riêng theo category.
Gợi ý và preview có giới hạn hữu hạn, không chứng minh tối ưu/công suất thực.
Chưa nghiệm thu live payment/SMTP/AI provider trong batch này.
Next: kiểm UI thật desktop/mobile VI/EN, thao tác nhóm–dossier–waitlist–policy/
report theo3role, sau đó đo tải và xác minh cấu hình môi trường trước phát hành.

## Rà logic vận hành toàn hệ thống — 19/10/2026

Human yêu cầu rà logic toàn hệ thống. Checkout main48ccd96,
`C:/Projects/lab-resource-manager`; giữ295 thay đổi có trước. Không seed/reset,
đổi schema, push/merge/deploy. Phạm vi rà gồm booking,
payment, handover/return, maintenance/care, stock, account/session/OTP, support,
notifications/reporting, media và scope frontend/API theo SRS/ADR hiện hành.

Đã tái hiện rồi sửa12 lỗi qua PostgreSQL16 riêng:

- Reschedule vào LAB đóng; actor ADMIN bị thu hồi vẫn được transition; cancel
  dùng scope cũ khi tài nguyên đổi LAB trong lúc chờ khóa; staff bỏ qua preflight
  để create ngoài LAB. Booking mutations recheck actor/version/owner/LAB trong
  transaction, khóa resource→booking và giữ SHARE assignment/LAB khi cần.
- Phòng RETURNED đã giải phóng vẫn bị detail báo RESERVED; schedule catalog
  chưa expire hold khi worker dừng; lọc AVAILABLE theo giờ bỏ sót LAB policy.
- Ngày sai tạo booking trả500; bảo trì thiếu1ms vẫn được chấp nhận do làm tròn;
  CUSTOMER đọc được job/notes/operator bảo trì nội bộ. Giữ lịch public an toàn.
- Dashboard bỏ actual custody quá hạn khi planned end ngoài kỳ30 ngày; endpoint
  unread-count cap100. Tổng unread server đếm đầy đủ, header/sidebar dùng tổng,
  chưa đọc được thì ẩn badge thay vì suy từ preview50 thông báo.

Frontend App giữ cache sau đổi account. Thêm
`workspaceScope.js`: chỉ mount workspace khi read group thuộc đúng actor/role/
credential-version, đóng private modal khi đổi scope. Test phản hồi cũ đến muộn
và đổi account/role/version PASS; chưa có browser reproduction/visual QA.

Evidence: `C:/Users/Admin/.codex/lab-controller/production-qa-20261018/operational-audit-*`.
Lượt full24 nhóm integration257 tests PASS; sau bổ sung count/policy, audit
kiểm lại12/12 và resource9/9 PASS (259 ca phân biệt khi hợp nhất). BE required
141/141, lint/config/ERD PASS; FE required84/84, lint0 errors với2 warnings có
trước, typecheck/build PASS. Suite mới được thêm vào release runner.

Local API readiness200, UI5173 HTTP200;6 users/25 resources/15 bookings/17 payments
giữ nguyên so với checkpoint trước. Không ghi test vào demo.
Hai PostgreSQL audit đã dừng, giữ dữ liệu.

Giới hạn: browser vẫn bị URL-policy chặn. Chưa chứng nhận tải production/provider
SLA hoặc toàn bộ SOP thật. Notice/cleaning buffer, hủy/no-show/refund/damage fees
cần quy tắc LAB thực tế; không tự áp chế tài. ADR-037 hiện cho ROOM tái đặt sau
owner return trước staff inspection; nếu SOP yêu cầu kiểm tra trước tái sử dụng
phải duyệt thay contract, không giả inspection. Bước tiếp theo: browser cho các
case đổi account/role, filter/return/count; nghiệm thu SOP và release gates trong
PRODUCTION_READINESS. Không tự mở batch mới.

## Chặn đặt sát giờ, bảo vệ hạn thanh toán — 19/10/2026

Checkout `C:/Projects/lab-resource-manager`, main `48ccd96`; giữ diff có trước,
không commit/push/merge/deploy/reset/seed. Human báo tạo lúc15:19 cho lịch15:20
nhưng còn thanh toán tới15:34. Đã xác nhận nguyên nhân: chỉ kiểm tương lai,
chưa có minimum notice. ADR-044/FR-BKG-13 bổ sung baseline ứng dụng30 phút,
ADMIN tăng theo LAB qua API có expected notice, reason và audit. Chưa có form
cấu hình notice riêng; không coi30 phút là quy trình chính thức của mọi LAB.

BE thêm `bookingNoticePolicy`, `labBookingPolicyService`, LabPolicy field và
forward migration `20261019000200_booking_minimum_notice`; cập nhật pricing,
readiness/create/reschedule, availability, calendar, assistant. Không có policy
vẫn chặn sát giờ. Create khóa chia sẻ LAB và recheck ở thời điểm ghi. Hạn hold
hiệu lực luôn min(stored deadline,startAt), áp dụng read/worker/resource expiry/
checkout/retry/IPN; callback muộn giữ bằng chứng/manual_review, không hồi sinh
lịch. Không hủy lịch đã xác nhận/đã trả tiền vì notice mới. FE form signed-in/
guest, policy summary, planner và payment countdown/action dùng cùng nguyên tắc,
hiển thị hướng dẫn VI/EN; locale projection và ERD đã đồng bộ.

Đã backup DB local bằng pg_dump custom, kiểm pg_restore list, rồi canonical
migrate/generate qua restart backend, không seed. Counts trước/sau vẫn6 users,
25 resources,15 bookings,17 payments. API health200, UI5173 HTTP200, backend/DB
healthy. Public quote cho LOCAL-KIT-02 bắt đầu sau1 phút trả400
BOOKING_NOTICE_REQUIRED kèm earliestStartAt. Lịch trong ảnh được đọc thấy
CANCELLED; không sửa tay bản ghi hoặc hạn cũ.

Kiểm chứng: BE required141/141, lint sạch; FE required83/83, typecheck/build
PASS,2 lint warnings có trước. PostgreSQL16 riêng: lượt đầu21/23 nhóm PASS;
sửa2 fixture chưa đủ notice rồi chạy lại calendar/payment-hold/monitoring/
assistant đều PASS. Hợp nhất23 nhóm247 test PASS; payment-hold service sau tách
logic khỏi route kiểm lại17/17. Boundary±1ms, free/priced/public quote/preflight/
direct API/guest OTP rollback/reschedule, đổi notice sau review, legacy start
expiry và late IPN có test. ERD check PASS. Evidence ngoài repo trong
`C:/Users/Admin/.codex/lab-controller/production-qa-20261018/booking-notice-*`.
Hai PostgreSQL QA mới đã stop, giữ dữ liệu; chỉ stack local chính còn chạy.

Giới hạn: công cụ browser vẫn chặn URL local, chưa xác nhận trực quan thay đổi
form/countdown; không né bằng Playwright/CDP. Chưa có bằng chứng production tải
thật hoặc SLA Work5–10s; các release gates ở checkpoint dưới vẫn còn. Bước tiếp
theo khi có quyền browser là kiểm form sát giờ và countdown legacy trên UI thật;
quy trình vận hành cần chọn notice lớn hơn qua API nếu LAB thực tế yêu cầu.
Không tự mở batch mới.

## Bảo mật phiên, SEO, booking và độ trễ chatbot —19/10/2026

Human yêu cầu tiếp tục tăng bảo mật/JWT/tự đăng xuất, SEO, làm rõ booking,
nghiên cứu tính năng khả thi và bắt đầu trả lời chat trong5–10s. main HEAD48ccd96;
giữ diff có trước, không commit/push/merge/deploy. Không reset/seed/import demo.

Đã làm: AuthSession PostgreSQL qua forward migration20261019000100; JWT bắt buộc
HS256/issuer/audience/iat/exp/sid/authVersion. Server kiểm phiên/tài khoản mỗi
request; idle mặc định30 phút, absolute8 giờ, env chỉ giảm giới hạn. Polling không
gia hạn; activity chủ động có quota và không vượt absolute. Logout thu hồi sid,
logout-all tăng authVersion; OTP/quyền hiện hành giữ nguyên. Đăng ký/guest phát
phiên trong transaction nghiệp vụ; cleanup1000 phiên quá hạn/h. FE bỏ token
localStorage, dùng sessionStorage, báo sắp hết hạn/tiếp tục, xử lý visibility/
pageshow và hiển thị hạn thật trong hồ sơ. JWT cũ buộc đăng nhập lại. Login giới
hạn độ dài và dùng dummy bcrypt12 cho account không tồn tại, không fake login.

Booking đăng nhập có preflight dùng chung readiness với create, review riêng
giờ/contact/giá/cách nhận/địa chỉ có tên, recheck sau60s có thông báo. Không giữ
chỗ ở preflight; create vẫn khóa/recheck. Khóa form khi gửi, focus trong form,
guest single-flight và uncertain fence; không hứa idempotency qua reload.
SEO build tạo4 HTML giới thiệu/canonical/OG/sitemap/robots; private/auth/error
noindex từ HTML đầu, no-store cho private, unknown404. Chỉ index khi có HTTPS
origin thật và opt-in; default build vẫn chặn index. Nginx có CSP cùng security
headers. Danh mục động vẫn cần JS/API; không có public resource-detail SSR.

Chat bridge thêm tối đa3 partial text tích lũy1500 ký tự, context/actor/grant/
generation/TTL guards, sequence/idempotency và client chống lùi/sửa; final mới
ANSWERED. Bổ sung fast query có giới hạn, sửa câu giải thích bị trả danh mục do
keyword. Work rule/plugin source0.1.6 hướng dẫn publish nội dung thật sớm; chưa
cập nhật cài đặt plugin hay tạo/chiếm consumer. Backlog có nghiên cứu ICS, báo
khung giờ trống, passkey/MFA và QR tham chiếu, chưa triển khai các mục đó.

Evidence: FE required82 PASS, i18n3763 keys, lint0 errors (hai warnings có trước),
typecheck/build PASS; BE required120 PASS, lint/production-config/ERD PASS.
PostgreSQL16 riêng:227 tests/22 suites PASS; sau atomic issuance và cleanup,
49 tests/5 nhóm sessions/guest/auth/customer/email PASS.14 migration-safety cases
PASS, không sửa lịch sử migration. FE runner image cuối build bằng npm ci PASS;
nginx -t,48 SEO/security HTTP checks và65 media checks PASS.48 mixed reads/8
workers p95~198ms local, không phải tải production. Một smoke trúng nodemon
restart trả upstream connection refused; đã đợi API healthy và chạy lại PASS.
Các test cũ dùng token sau logout được sửa sang401/re-login, không nới auth.

Local migration đã có pg_dump custom trước đó; counts trước/sau giữ6 users,
25 resources,15 bookings,17 payments. API/DB dùng chung và UI5173 còn hoạt động;
container QA đã dừng sau kiểm tra. Image QA giữ trong Docker local; logs/dump/
build logs ở ngoài Git tại C:/Users/Admin/.codex/lab-controller/production-qa-20261018/security-*.

Blockers/limits: Work enabled/authorized nhưng connected=false, subscriptions0.
Mẫu tra thiết bị local có nội dung thật160ms; câu cần AI trả thông báo chưa kết
nối11ms, không tính là first useful answer. Chưa chứng minh mục tiêu5–10s qua
provider. Browser control bị URL-policy chặn; không chạy visual/Playwright UI
lượt này và không đi đường vòng. SessionStorage vẫn chịu XSS; bearer bị đánh cắp
có thể gửi activity tới absolute limit; chưa có MFA/login recovery/distributed
limiter hoặc penetration test. SEO chưa có domain/Search Console thật; giới hạn
SMTP/payment/storage/CDN/host/hardware trước đó vẫn theo release gate.

Bước tiếp theo: khôi phục consumer/subscription Work hiện có, refresh discovery
partial tool và đo first-useful p50/p95; mở lại quyền browser để kiểm warning/
logout/review trên desktop/mobile; cấu hình origin/TLS/SEO opt-in và nghiệm thu
host/provider thật. Không tuyên bố toàn hệ thống đã sẵn sàng production.

## Danh mục cho thuê và hiệu năng media — 18/10/2026

Human yêu cầu tìm thêm tài nguyên cho thuê và chuẩn bị ảnh/video vận hành thực
tế. main HEAD48ccd96, giữ diff có trước; không seed/import tài nguyên, không
push/merge/deploy. REAL_DATA_RUNBOOK có12 nhóm ứng viên có nguồn nhà cung cấp
(TRS, MeanLab, Tara Tech, Máy Đo Đạc Miền Nam, SUCOMO) và điều kiện tiếp nhận.
Đây là nghiên cứu, chưa xác minh tài sản/giá/tồn kho của LAB.

Đã làm: ảnh hero1147262→68384B (mobile23030B), poster122938→17716B; giữ originals.
Vite hash assets; hero responsive/eager/high priority, ảnh catalogue lazy/async,
Wikimedia resize320/640/960 và detail1280, không sửa signed URLs. Resource video
chỉ gắn src sau Play, pause khi hidden/offscreen. Landing tôn trọng Save-Data/
mạng chậm nếu browser hỗ trợ. Có CLI media:prepare offline (Sharp dev-only),
640/1600WebP, strip metadata,24MP/20MiB guard, ngân sách byte/deadline và không
ghi đè. Không cài/chạy FFmpeg; lệnh encode và tiêu chí VOD/CDN được ghi trong
DEPLOYMENT, không transcode trong HTTP request.

Upload có progress/cancel/deadline120s/no retry và single-flight. Backend giới
hạn20 media writes/phút/user; S3 client tái dùng pool16 sockets, timeout3/10s,
maxAttempts2. Presigned PUT ký length/type/cache-control và không ký CRC của
body rỗng; HEAD kiểm tra actual size/MIME/key/extension, phân biệt missing409
với unavailable503. Nginx /media có404/cache1d/single-range, không SPA fallback.

Evidence: FE required77 PASS, i18n3731 keys, lint0 errors (hai warnings cũ),
typecheck/build PASS; sau sửa cuối media4/typecheck/build PASS. BE required116
PASS và media4 PASS (đã đưa media vào required); lint PASS. FE full và runtime
npm audit0 sau cập nhật typescript-eslint/source-map-js; Sharp không vào runtime.
Docker frontend runner mới build PASS với npm ci trên Alpine. Nginx image cuối
nginx -t PASS và65 HTTP checks:404/MIME/cache/security/206/416/304/faststart,
48 reads media+health+catalogue với8 workers, p95~180ms local. Không phải giới
hạn tải production; backend dùng chung dev. Hai container media QA đã dừng;
shared API/DB vẫn healthy. Logs/artifacts ngoài Git: C:/Users/Admin/.codex/lab-controller/production-qa-20261018/media-*.

Blockers: storageConfigured=false, chưa PUT/HEAD/CDN thật, chưa đo host production
hoặc browser frame stalls. Browser control bị tắt trong Work settings; không
chạy lại playback UI, chỉ cập nhật test dossier theo play-on-demand. HEAD không
sniff/malware-scan; chỉ trusted operators, chưa có public upload/quarantine flow.
DEPLOYMENT/PRODUCTION_READINESS ghi CORS, cache invalidation, quotas/orphans,
bandwidth, peak-test và vận hành thiết bị. Bước còn lại để nghiệm thu production:
cấu hình kho/CDN thật, browser playback/seek/slow-network, tải peak trên host đích
và kiểm kê/duyệt các tài sản thực. Không tự coi nghiên cứu hoặc smoke là chứng nhận.

## Tái thiết kế toàn bộ hồ sơ cá nhân — 18/10/2026

Theo yêu cầu human làm lại toàn bộ Profile, tiếp nối việc bỏ Khoa/Tổ chức và
nhóm tự khai. Checkout main HEAD48ccd96; giữ diff có trước, không push/deploy.
Bố cục mới: nhận diện và trạng thái tài khoản ở đầu, bốn mục điều hướng ngang;
nội dung chính bên trái, hạng thành viên và giải thích theo ngữ cảnh bên phải.
Mobile chuyển một cột, nội dung chính trước. Giữ thứ tự mục mặc định theo role.

- Liên hệ: họ tên bắt buộc/điện thoại tùy chọn ghi rõ; địa chỉ thu gọn, giữ draft,
  lỗi tự mở và focus. Theo dõi thay đổi chưa lưu; sau PATCH đồng bộ form với
  dữ liệu server thực lưu. Không gửi organization/customerType hoặc sửa email.
- Bảo mật: trạng thái tài khoản/mật khẩu và ba bước gắn với state thật của
  PasswordChangeForm: mật khẩu → OTP email → hoàn tất. showSteps là opt-in
  của Profile; shell và assisted reset giữ luồng cũ. Không đổi OTP/API/RBAC.
- Điều kiện: role, số chứng nhận VALID, ngày cấp/hết hạn; trạng thái trống giải
  thích và dẫn tới điều kiện từng tài nguyên, không khẳng định được truy cập
  mọi tài nguyên. Status chưa biết giữ nhãn từ server.
- Hoạt động: tổng/active/completed từ server; bảng thanh ngang có số lượng và
  tỷ lệ từng trạng thái trên tổng lịch, toàn bộ thời gian. Không vẽ số0 giả
  khi snapshot thiếu hoặc không nhất quán. Thanh toán hợp lệ/số giao dịch/
  lần gần nhất dùng profile.spending. Hạng hiển thị chi tiêu, mức giảm, tiến độ,
  ngưỡng tiếp theo, còn thiếu và policy disabled theo server; không suy giá.

Files: ProfilePage, ProfileActivity/ProfileAccess, profileActivity helper,
LoyaltySummary, PasswordChangeForm, account-workspace/loyalty-account CSS,
VI/EN catalog+manifest, test_profile_activity và test:accounts. Tham khảo bố cục
thông tin GOV.UK Check answers và data visualization Carbon, giữ nhận diện LAB.

Evidence: npm run test:required PASS73 tests, i18n3724 keys và backend projection
khớp, lint0 errors (hai warnings cũ), typecheck/build PASS. Sau sửa mobile,
test:accounts17 PASS, typecheck/build PASS. Browser CUSTOMER: cả4 mục VI/EN
1440/375, không overflow; số9/4/1 và tỷ lệ44,4%/11,1%/44,4% đúng; kiểm tra dirty
state, field errors/focus, giữ draft và keyboard mở địa chỉ. Form mật khẩu trống
bị chặn, chưa tạo OTP challenge. Solid-background text scan34 mẫu ở access không
finding; không coi là WCAG certification. Console cuối không có error mới.
Lượt đầu gặp HMR khi code/catalog chưa đồng bộ; mobile bị global table min-width
và flex nhận diện dồn chữ, đã sửa và xác nhận. Không PATCH hợp lệ/gửi OTP/đổi
mật khẩu hay dữ liệu demo; không kiểm thử lại live-provider hoặc mọi role/states.
Ảnh, checks và logs ngoài Git: C:/Users/Admin/.codex/lab-controller/production-qa-20261018/profile-redesign/ và profile-redesign-required.log.
Phần UI được giao đã hoàn tất; giới hạn production vẫn theo checkpoint bên dưới.

## Kiểm thử và chuẩn bị production — 18/10/2026

Human giao tiếp tục đến hết phần hoàn thiện/kiểm thử, không hỏi các quyết định
thường lệ. Checkout C:/Projects/lab-resource-manager, main, HEAD48ccd96; giữ toàn
bộ diff có trước. Không commit/push/merge/deploy; không seed/reset/migrate DB demo.
Các forward migrations chưa commit vẫn được giữ; tracked baseline/migrations
không thay đổi trong lượt này.

Đã sửa trong lượt này:

- MCP client2.0.0→2.3.1 để xử lý advisory OAuth; cập nhật lockfile, vá transitive
  brace-expansion. Prisma CLI6.19.3 chuyển sang runtime dependencies để image
  production prune dev packages mà vẫn migrate đúng khi khởi động.
- Docker ignore loại env/dependencies/output khỏi context. Production Compose
  truyền cấu hình bridge/legacy room key, không ép VNPAYQR khi thiếu bank code,
  reminder mặc định30 phút. Nginx proxy OAuth/discovery/MCP, không log URL các
  giao thức này, bỏ buffering và tăng timeout75 giây; không rơi vào SPA200 giả.
- Booking.createdAt và paymentDueAt dùng cùng server timestamp, đúng15 phút;
  không rewrite lịch cũ hoặc đổi deadline khi retry. Test care/pricing giữ assertion
  chính xác thay vì dung sai để che lệch giữa clock ứng dụng và default DB.
- Landing VI/EN đúng3 role và giữ chỗ có phí. Lịch ngày desktop dùng thanh thời
  gian đúng tỷ lệ với nhãn riêng đọc được, không cắt giờ/badge ở lịch ngắn;
  sửa tương phản empty lane. Mobile giữ agenda, không đổi quyền/API.
- Runner release21 suites, từ chối DB đã tồn tại, chuẩn bị predecessor CUSTOMER
  fixture đúng thứ tự. Helpers dùng URL test được truyền trước .env. Sửa fixture
  legacy approval/contact/handover/reminder và UI selectors theo ADR hiện hành;
  không nới guard runtime để làm test xanh. Thêm browser calendar và production
  smoke script; workflow production-readiness có jobs contracts và production images.
- Cập nhật PRODUCTION_READINESS, DEPLOYMENT, SYSTEM_TEST_GUIDE và guideline/threat
  model; không tạo thêm báo cáo AI trong repo.

| Kiểm chứng mới | Kết quả và giới hạn |
|---|---|
| Backend required |116/116 PASS; lint, production config (gồm bridge negative cases), ERD PASS |
| Frontend required |63/63 PASS, i18n3680 keys, lint/typecheck/build PASS; hai warnings cũ ResourceStatusModal/LocaleProvider |
| PostgreSQL16 integration |218 test nodes qua21 suites PASS ở các lượt chọn cuối: concurrency/persistence, auth/RBAC, resources, calendar/privacy, operations, incidents/reminders, hardening, telemetry, CUSTOMER migration, account OTP, loyalty, fulfillment, payment hold, support, email, care, stock/workspace, queues, assistant, reports và bridge. Các FAIL fixture/dependency race ở lượt đầu đã có rerun PASS; không xóa bằng chứng lỗi. |
| Critical browser |Fulfillment14, payment hold21, calendar37 checks PASS. Calendar6 cấu hình3role VI1440/EN375: event dài/phút lẻ, privacy/LAB scope, ngày/tuần, keyboard dialog, đúng resource vào form, không tạo booking khi preview/đóng, không overflow/page errors; đã xem ảnh thật desktop/mobile. |
| UI read-only main |CUSTOMER/STAFF14 role checks và ADMIN8 role checks hoàn tất, không finding tương phản nền đặc/overflow/page errors. Lượt tổng final bị lỗi tải home ADMIN; chạy ADMIN riêng PASS. Đây không phải WCAG certification/mọi trạng thái. |
| Production images |Build hai image cuối PASS; Nginx→API NODE_ENV=production→DB riêng:51 checks PASS, gồm OAuth metadata/token validation, MCP auth, private projection, SPA/static/CORS và20 readiness reads đồng thời. API UID1000, có Prisma6.19.3, không nodemon/ESLint/Supertest/.env. Không phải load/capacity benchmark hoặc deploy thật. |
| Migration/restore |14 safety cases PASS, kể cả tamper/history/fingerprint/partial resume. pg_dump/custom→DB restore riêng PASS; users/resources/bookings/payments/audit/migrations khớp14/22/23/4/13/32. Không chứng nhận DR/RPO/RTO production. |
| Dependency/config |npm audit --omit=dev cả hai app0 advisory; full BE còn3 High ở dev nodemon/chokidar/braces, không đóng gói production. Compose config --quiet, workflow YAML và git diff --check PASS; workflow chưa chạy trên GitHub. |

Live integrations: SMTP hiện đã configured và verify kết nối thật PASS; email
automation đang false, outbox có8 PENDING. Không bật worker/gửi mail tồn hoặc OTP
tới người khác trong lượt này; chưa có bằng chứng inbox. Ban đầu Work nhận event
nhưng get_question_context lỗi internal, readCount0: ngrok không chạy (public404).
Đã bật lại đúng một tunnel domain cũ→8000, metadata200; giữ grant/receiver/scope.
Hủy đúng QA request còn chờ của mình rồi thử lại: local guidance22ms, ChatGPT thật
ANSWERED/provider=chatgpt/source=chatgpt_bridge sau35,29giây, lời giải x=4 đúng.
Hai lượt có tổng4 assistant requests QA; không booking/support/payment write trên
DB demo. Không coi một reply là SLA hoặc chứng minh auto-renew receiver dài hạn.

Evidence ngoài Git: C:/Users/Admin/.codex/lab-controller/production-qa-20261018/.
integration-final-summary.json và các logs theo suite; các FAIL đầu còn nguyên;
booking-care-final.log, incidents-final-fresh.log, payment-final/ là rerun cuối.
calendar-ui-final/, ui-final/ + ui-final-admin/, production-smoke-final.json,
migration-safety.log, isolated-restore.dump, live-bridge-before-tunnel.json và
live-bridge.json. Không đưa secrets/signed URLs vào checkpoint.

**Boundary:** hoàn tất sửa lỗi và kiểm thử local trong phạm vi trên; chưa GO LIVE.
Chưa có .env.production/host/domain/TLS được xác minh, VNPAY merchant production,
inbox OTP/receipt, S3/hardware/camera/door, đa trình duyệt hoặc sustained load.
Không bật email automation hay thay tích hợp thật chỉ để checklist xanh. Các job
CI đã thêm và parse YAML, chưa push nên chưa có remote CI result. Giữ UI5173,
API8000/PostgreSQL demo và tunnel hiện hành; containers test của lượt này dừng sau
kiểm tra, giữ dữ liệu/dump để đối chiếu. Next concrete step: provision staging/
production secrets + TLS/merchant/storage theo DEPLOYMENT, kiểm inbox có recipient
được chỉ định và chạy release gate trên host đó trước khi mở traffic.

## Lịch đặt theo tác vụ cho ba role — 17/10/2026

Human giao Codex tự chốt và triển khai sau ba vòng trao đổi Gemini 4 Argon/Cao.
Checkout C:/Projects/lab-resource-manager, main; giữ thay đổi có sẵn, không sửa
worktree497f và không tiếp tục Claude automation. Quyết định ở ADR-042.

SmartCalendarView chuyển sang planner: CUSTOMER chọn theo tài nguyên hoặc giờ;
LAB_STAFF/ADMIN mặc định lịch ngày theo LAB từ API scope, nhóm tài nguyên, 12
dòng mỗi trang kết quả đã tải. Mobile có agenda dọc. Tuần so sánh một tài nguyên
bằng bảy cột ngày có event, không lặp booking mỗi giờ; tháng giữ overview phụ.
Giờ phục vụ lấy policy, không hardcode08–20. ResourceDayBoard, ResourceWeekOverview,
BookingSlotPicker, plannerModel và calendar-planner.css giữ tone tím/lavender/kem.
App truyền đúng resource context vào form chung kể cả deep link ngoài list cap.

Sau feedback ảnh chụp của human: BookingSlotPicker gom các khoảng liên tục còn
trống theo thời lượng, trừ hợp của booking/bảo trì thay cho lưới giờ bắt đầu30phút.
Đọc một khoảng bảy ngày của tài nguyên đang xem; gợi ý tối đa ba ngày tiếp theo
trong range đã tải. Ngày trong range dùng lại event, không gọi availability mỗi ô.
Date strip lăn bảy ngày thay cho tuần chứa nhiều ngày đã qua. Giữ phút lẻ như
09:10 khi khoảng đó đủ thời lượng. “Đặt giờ này” tự precheck trước khi mở form;
bỏ nút kiểm tra riêng. Kết quả tới muộn sau đổi lựa chọn bị hủy/loại. Sửa busy
không kết thúc khi lọc hết tài nguyên; bỏ khung giờ mặc định cũ khỏi tóm tắt khi
không có lựa chọn hợp lệ. VI/EN rút ngắn, dùng ngôn ngữ thực tế.

ResourceSearchField dùng chung cho Header và planner, một viền/focus ngoài,
input không có viền/outline lồng. Calendar chỉ giữ search cục bộ, ẩn search header
trùng; xóa hết chữ cũng xóa filter. Header ở các màn khác giữ tìm toàn danh mục.

Khay SelectionPage thêm chép giờ chung vào draft chưa tạo và kiểm tra tuần tự.
selectionPrecheck dừng429/network/auth, hủy/loại kết quả cũ, cache tối đa một phút;
không tự retry mutation hoặc tạo booking đồng loạt. Giữ pending/uncertain fence,
trạng thái thanh toán/paymentDueAt thật. Có VI/EN; không đổi API, RBAC hoặc DB.

Gates cuối sau feedback: test:required63 tests PASS (15 planner/precheck), i18n3680 keys,
lint/typecheck/build PASS; hai lint warnings cũ ở ResourceStatusModal/LocaleProvider.
Detector cơ học Impeccable không có finding; diff whitespace check PASS. API thật
read-only3role: auth, LAB scope, resources, events, interval candidates và exact
availability trả200/đúng shape; mỗi role dùng LAB có12resources/12policy, range
QA không có event. Fixture kiểm kín lịch cả ngày, overlap/adjacency, phút lẻ và
giới hạn ngày gợi ý PASS; không phải booking thật trên DB. Không suy thành
lifecycle hoặc privacy matrix PASS.

**Giới hạn ngày17/10, đã gỡ bằng QA18/10 ở trên**: CUA báo Local browser use is disabled in Work
settings, vẫn bị chặn ở lượt sửa theo ảnh. Đã hỏi human bật Browser/mở lại Work; chưa nhận xác
nhận. Không dùng trình duyệt khác để lách chặn, không chụp ảnh giả/claim responsive
PASS. Cần khi Browser khả dụng: kiểm VI/EN3role desktop1440/mobile375, event dài/
chồng, điều hướng form, keyboard, stale/cooldown và empty/error; sửa lỗi chứng minh
được trong cùng scope. Không tạo business writes trong QA hoặc reset/seed/migrate.

Evidence ngoài Git: C:/Users/Admin/.codex/lab-controller/calendar-implementation-20261017/
(refinement-gates.log, refinement-build.log, refinement-runtime-results.json,
check-refinement-runtime.mjs, các gates/runtime-results trước và baseline/); quyết định thảo luận
ở ../gemini-calendar-decision-20261017/decision.md. Source implementation xong;
visual acceptance còn pending do quyền trình duyệt. Không whole-system PASS.

Cập nhật 16/10/2026. Đây là ngữ cảnh hiện hành, thay các nhật ký tác vụ cũ.
Hợp đồng đầy đủ nằm ở SRS, DECISIONS, guideline, schema/migrations và tests.
Không xem kết quả một lần chạy cũ là PASS mới hoặc tự mở batch tiếp theo.

## Checkout và runtime

- Checkout phát triển: C:/Projects/lab-resource-manager, main, HEAD 48ccd96.
  Có nhiều thay đổi chưa commit từ trước; không reset hoặc quy toàn bộ diff cho đợt dọn.
- React/Vite trong frontend/, Express/Prisma trong backend/, PostgreSQL 16.
  Giữ ánh xạ logic với code/frontend và code/backend của giảng viên; không di chuyển source.
- Runtime kiểm tra 16/10: UI5173, API8000; Docker lrm-local-review-backend-1 và
  lrm-local-review-postgres-1 healthy, /health/ready trả database=ready.
- DB nghiệp vụ lab_resources_local_demo, volume lrm-local-review_review-data.
  Chỉ còn database này và postgres trong instance LAB sau dọn; không reset/seed lại.
- Bật Docker, ở frontend/ chạy npm run dev:backend rồi npm run dev; dev:demo
  chuẩn bị backend + frontend. Khởi động thường dùng lại image/container; rebuild
  dành cho thay đổi dependency/Dockerfile. Đọc README và dev-local.mjs trước vận hành.
- Không sửa các worktree khác, tài nguyên Haneul, tài khoản/plugin cloud hoặc tunnel
  trong lượt dọn. Không commit/push/merge/deploy. Kiểm tra lại topology trước khi dùng.

## Phạm vi đề tài và chức năng hiện có

Đề tài: xây dựng hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm.
Quản lý phòng, GPU server, Raspberry Pi, UAV, camera và tài nguyên dùng chung;
đặt lịch, phân quyền, nhật ký, thông báo và giám sát nguồn được cấu hình.
Nguồn giảng viên ở docs/instructor/ được giữ. Hướng triển khai.docx là đề xuất,
không tự cấp quyền đổi framework hoặc tạo bảng/trạng thái song song.

| Nhóm | Hợp đồng và implementation cần giữ |
|---|---|
| Vai trò | ADMIN, LAB_STAFF, CUSTOMER theo ADR-033; staff theo LAB cho vận hành, global CUSTOMER-only cho account APIs theo ADR-034. |
| Tài khoản | Đăng ký email/password; contact khi booking. OTP đổi mật khẩu theo actor/target/purpose/version, delivered evidence, one-use; authVersion thu hồi phiên cũ. |
| Tài nguyên | Catalog public an toàn, nhóm phòng/thiết bị/vật tư, hồ sơ/specs/media/guide và lịch/giá thật; ADMIN quản lý tariff, duration, care, fulfillment. |
| Booking | Bảy status canonical; khoảng [startAt,endAt), chống trùng ở DB. Policy/training/LAB/state/care/duration/pricing kiểm ở backend. NO_SHOW là outcome. |
| Thanh toán | Miễn phí CONFIRMED ngay. Có phí PENDING_APPROVAL + paymentDueAt cố định creation+15 phút; chỉ IPN hợp lệ trước hạn xác nhận. Expiry hủy/giải phóng slot; late settlement manual_review, không lấy lại slot. Legacy approval không có paymentDueAt. |
| Nhận/trả | Handover/ROOM owner check-in trong start-30 phút đến trước end; kiểm tra fresh payment/state/care. Owner ROOM return ghi RETURNED + schedulingReleasedAt, giải phóng slot; staff kiểm tra rồi COMPLETE. Không giả inspection hoặc sửa history legacy. |
| Quyền truy cập phòng | ResourceFulfillment mã hóa AES-GCM với khóa riêng; chỉ owner booking hợp lệ được đọc. Không đưa password vào public/admin projection, AI, audit hoặc notification; chưa có khóa cửa vật lý. |
| Giao thiết bị | Pickup nội bộ hoặc địa chỉ Việt Nam đầy đủ khi ADMIN bật cho EQUIPMENT/EXPERIMENT_KIT. Snapshot contact/address riêng; chưa có GHN/tracking/quote hãng thật. |
| Vận hành | Booking CHECKED_OUT, operator đúng LAB, workload/occupancy khai báo và giờ server. Không nhận là cảm biến đo thật. Return dừng phiên; hỏng/bảo trì/inspection giữ quyền nghiệp vụ. |
| Bảo trì | Chu kỳ ngày/giờ/lượt; warning mặc định 80%, due 100%; due chặn booking/handover. Notices dedupe theo baseline/stage/recipient; job completed và inspection đạt mới reset baseline. |
| Giám sát | TelemetrySource xác thực, TelemetrySample/freshness, policy/alert episodes, incidents và camera metadata/audit. Không fake số đo, tự đổi physical state hoặc khôi phục simulator đã bị người dùng bác bỏ ngày12/10. |
| Báo cáo | Tổng hợp 7/30 ngày theo toàn scope, tách lịch dự kiến, actual handover/return, bảo trì và sự cố; không suy ra motor/CPU runtime, điện năng hoặc occupancy đo thực. |
| Kho/học phần | Ledger, nhóm/hoạt động đã được chấp thuận; giữ hợp đồng và lịch sử, không xóa vì không nằm trên trang chủ. |
| Hỗ trợ | CUSTOMER → FIFO đúng LAB → staff được phân công → CLOSED; ADMIN đọc/requeue. Chat lưu DB; AI transcript chưa tự copy vào staff history. |
| Email/loyalty | Email outbox/retry/idempotence, không coi SENT là inbox-confirmed. Loyalty SYSTEM mặc định tắt; tính từ eligible settled VND payments, giữ quote/net/policy version. |

Physical Resource.operationalStatus là authority; availability suy từ status,
booking, maintenance và policy. Không nới RBAC, giả thành công hoặc sửa applied migrations.
Ba forward migrations fulfillment/released-maintenance/payment-hold hiện còn
trong working tree; không được xóa như output. Schema/baseline/history được giữ.

## Trợ lý và kết nối ChatGPT hiện hành

Theo ADR-036/039/040: cùng dock và bridge cho ba role; giữ ChatGPT Work,
không tự thêm API key. OAuth S256, grant/subscription/events, generation/owner,
authVersion/current role và current assignment kiểm ở backend mọi lượt/history.
Grant ADMIN cho kết nối không nâng quyền người hỏi. Plugin portable0.1.5;
cloud LAB Support gần nhất được ghi nhận1.0.1, lần cập nhật tiếp bị từ chối;
không tuyên bố đã publish hoặc thay OAuth/account khi chỉ sửa source.

Fast grammar đọc dữ liệu thật: tài nguyên/slot, lịch ngày/tuần có thời gian rõ,
kho, báo cáo7/30 ngày và CUSTOMER contacts. Staff calendar/stock/report theo LAB;
contact theo ADR-034. CUSTOMER chỉ lịch/dữ liệu riêng, không kho/report/contact list.
Unknown stock ledger là unknown; đếm tổng trước preview; không đoán câu ghép.
Fast lookup ANSWERED/authenticated_mcp, exact guidance local_guidance, không tạo
Work event. Câu mở/câu ghép theo receiver và evidence read-only; không fake provider.

4 admission slots; fast30/phút, Work create/cancel6/phút, ingress180/actor;
event poll500ms, bounded GET recovery3 lần; không tự retry POST/auth/invalid data.
History fast data là re-read marker, không replay contact như evidence.
BOOKING/STAFF_SUPPORT chỉ là đề xuất CUSTOMER, nháp có hạn và xác nhận qua API chuẩn.
Không có business write tool; secret/OTP/room access/address không vào model.

Enter hiển thị tin ngay, xóa composer cho draft tiếp; ShiftEnter/IME và cuộn giữ đúng.
Chatbot có VI/EN riêng trên shared catalog; đổi locale toàn app đồng bộ vào dock.
Giữ draft/history/error/cancel/retry và nút về tài nguyên/lịch. Không phô provider metadata.

## Bằng chứng trước lượt dọn và giới hạn

Các checkpoint 14–15/10 ghi nhận required/backend/frontend và nhiều guarded
integration/UI suites trên PG16 test riêng: account/OTP/loyalty, bridge scopes,
hỗ trợ, fulfillment và payment hold. Protocol fixtures không phải bằng chứng
provider thật. Script và guards còn trong source; hướng dẫn ở SYSTEM_TEST_GUIDE.

Bản local tích hợp đã có một giao dịch VNPAY NCB Sandbox được xác minh qua IPN
và reload, cùng support hai chiều/đóng phiên và Work replies thực. Đây là bằng
chứng lịch sử có giới hạn, không chứng nhận payment hold mới với ngân hàng thật,
VNPAY production/QR/refund, mọi role/UI hoặc chất lượng mọi câu trả lời.
Work từng mất khoảng33–106 giây; fast lookup từng124–215ms trong lượt đo riêng,
không là SLA hoặc kết quả đo mới. Provider-dependent questions vẫn có thể chậm/hết quota.

SMTP inbox/OTP ngoài máy, physical telemetry/camera/door lock, S3, GHN,
Firefox/Safari/load/production chưa được xác minh đầy đủ. Guest recovery,
transcript handoff và chính sách retention cần task riêng. Không tự mở backlog.

## Dọn và kiểm tra ngày16/10/2026

Đã xóa220 targets/560 files, khoảng24,24 MiB:45 ảnh root, output Playwright,
logs/browser snapshots, build FE, bản schema/migration/patch tạm và poster.png
không được gọi. Runtime ảnh/video/provenance và cấu hình vẫn giữ. Hai dump
rollback trước tích hợp/fulfillment trong backend/logs/unified-local được giữ,
tổng dưới0,5 MiB; không coi chúng là báo cáo AI.

Docker: xóa database lab_resources_chatgpt_bridge_test sau khi xác minh không
kết nối và107 users đều fixture @bridge.test; xóa lrm-support-test + anonymous
volume. Build cache về0; docker builder prune báo5,081GB reclaimed (dung lượng
logic Docker, không đồng nghĩa ổ C tăng ngay5GB). Giữ LAB demo và Haneul.
Không compact/xóa VHDX, shutdown WSL hoặc xóa dữ liệu ngoài dự án.

Đã quét C: theo metadata, không đọc nội dung cá nhân và không xóa ngoài dự án.
Main checkout khoảng0,66GiB gồm dependencies/Git; AppData, media, installers và
VM chiếm phần lớn máy. Không coi Zalo/Chrome profiles/Apple backups/Windows là rác.

Hai CSS không có importer: frontend/src/styles/profile.css và teaching-workspace.css.
Tổng18.002bytes; lệnh xóa bị kiểm duyệt chặn: blocked by policy. Chúng vẫn còn,
không thử cách lách. Xóa các thư mục output rỗng cũng bị chặn; không chứa dữ liệu
đáng kể và được giữ. Không nhầm hai phần còn lại này với560files đã xóa thành công.
Không tìm thấy module JS/TS backend/src không có importer; không xóa code chỉ vì cũ.

Verification đợt này: backend required110/110, lint, ERD PASS. Frontend38 tests
routes/auth/accounts/payment/bridge PASS; i18n catalog3376 parity/integrity PASS,
source audit FAIL vì CustomerHome dùng ui.home.* chưa có trong catalog. Thêm9
API/locale tests PASS, tổng47 frontend tests đã chạy. Lint PASS với2 warnings
cũ, typecheck và Vite production build PASS (write=false, không tạo lại dist).
Các thay đổi UI có trước vẫn được giữ; không nới audit hoặc nhận toàn gate PASS.
Không chạy DB/browser mutation, provider live hay seed vào demo trong lượt dọn.

## Rà UI theo role ngày 17/10/2026

Theo phản hồi tiếp theo của user, mọi role dùng chung tím #6441D9, lavender
và nền kem #FFF9EE đồng bộ landing; bỏ phân màu xanh/xám theo role. Rail và
trang đầu vẫn ưu tiên tác vụ riêng của từng role. Menu tài khoản có header
lavender, avatar tím, icon nhất quán, hàng thao tác 44px và bỏ divider lặp.
Sửa tương phản
hover, nhãn thông báo Mới bị ép chiều rộng, viền focus lồng ở tìm kiếm, khung
chi tiết staff bị co thành cột và thẻ hồ sơ tài khoản lồng nhau. Trang khách
phân biệt giữ chỗ chờ thanh toán với duyệt legacy và dùng bộ lọc lịch hợp lệ.
Trang admin không diễn giải thiếu dữ liệu sự cố thành không có sự cố.
Khôi phục nút sửa liên hệ/hỗ trợ mật khẩu CUSTOMER cho staff theo ADR-034;
backend authorization và OTP không đổi. Sửa các khóa dịch home nằm ngoài messages.

Frontend test:required PASS: 47 tests, i18n source/parity/integrity, lint,
typecheck và production build; còn hai lint warnings đã biết ở ResourceStatusModal
và LocaleProvider. Typecheck chạy lại sau sửa quyền hiển thị PASS; diff check PASS.
test_ui_contrast.mjs (npm run test:ui:contrast) chạy Chrome local, chặn mọi business
write: 92 lượt route qua ba role, VI/EN desktop và VI mobile, không phát hiện
lỗi tương phản nền đặc/tràn ngang/runtime trong phạm vi đã quét. Chạy riêng
từng role hoàn tất sau một lượt tổng bị timeout chờ shell. Kiểm tra bổ sung
form sửa liên hệ staff mobile PASS; 12 lượt public desktop/mobile đã quét PASS.
Lượt bổ sung form admin mobile bị rate-limit đăng nhập HTTP 429, chưa xác minh
riêng form này; không thay đổi hoặc bỏ qua giới hạn đăng nhập để chạy test.
Đây không phải chứng nhận WCAG hoặc kiểm tra mọi trạng thái/modal; chữ trên
ảnh/gradient cần xem trực quan. Không seed hay thay đổi dữ liệu nghiệp vụ.

Sau điều chỉnh trở lại tone landing: typecheck/build/lint PASS (hai warnings
cũ); menu tài khoản staff mobile kiểm tra trực quan và contrast PASS. Quét lại
72 lượt route CUSTOMER/STAFF VI/EN/mobile và ADMIN VI desktop không có finding
trước khi timeout shell ở ADMIN EN; không ghi nhận toàn bộ lượt chạy này PASS.

Rà căn chỉnh nhãn: sửa Grid catalog kéo giãn badge Sẵn sàng thành hình oval,
giữ hàng nội dung theo kích thước tự nhiên và CTA cao tối thiểu 44px. Chuẩn hóa
căn giữa/chiều cao theo nội dung cho badge, status-badge, resource-status-pill,
status-badge-inline, booking-status-chip; icon trong nút/nhãn không bị co.
Thêm regression đo chiều cao và tâm chữ badge catalog ở VI/EN desktop/mobile.
Build PASS; 22 lượt CUSTOMER và 10 lượt STAFF/ADMIN mobile PASS, không finding
tương phản/tràn ngang/runtime trong các trạng thái quét. Không coi đây là
xác minh mọi trạng thái trên toàn hệ thống.

## Tiếp quản UI và phục hồi hành trình thanh toán ngày17/10/2026

Theo yêu cầu trực tiếp, Codex tiếp tục resource core đang dở và các gap role UI
trong checkout chính; Claude automation vẫn PAUSED. Docker/backend/PostgreSQL
đã healthy sau khi human mở từ Windows. Đã sửa lọc ADMIN resource, cấu trúc
list/detail/form, profile/notifications/incidents/payment theo role; bổ sung
biên nhận rõ, selection tray và owner access ngay đầu chi tiết lịch. Mã phòng
lấy từ contactSnapshot.phone theo ADR-041; giữ quyền owner, payment/time/audit.
Giảm poll và bổ sung cooldown429/Retry-After, không tự retry mutation, giữ draft.

Frontend48 tests + lint/typecheck/build và backend116 tests + lint PASS; còn hai
warnings frontend cũ. Runtime read-only CUSTOMER VI desktop/EN mobile xác nhận
paid receipt/no-repay/phone snapshot/selection; ADMIN và STAFF VI desktop/EN
mobile xác nhận resource detail/edit và filter. Fault-injection429 xác nhận dừng
request, retry chủ động và giữ draft. Không seed, migration hay business writes
trên DB chính; chưa chạy lại fulfillment DB integration và chưa có khóa cửa thật.
Không coi là whole-system PASS. Chi tiết/evidence/giới hạn:
[UI_RESUME_20261017.md](UI_RESUME_20261017.md).

## Robot nổi và workspace hỗ trợ ngày17/10/2026

Theo yêu cầu user, chuyển AssistantLauncher từ header ra góc phải dưới shell;
dùng RobotMascot SVG dùng chung (robot toàn thân, pose chào, cùng tone tím).
Panel nonmodal mở phía trên mascot, giữ Esc/focus return, bản nháp và LocaleScope;
ẩn launcher khi navigation/password modal mở. Tránh selection tray ở375/1024/1440.
Không sửa provider, API, RBAC, handoff hay quyền ghi.

Support CUSTOMER chia Yêu cầu mới/Phiên của tôi; form gọn trong sidebar cạnh
conversation, robot hướng dẫn mở trợ lý. Giữ draft khi chuyển mục; deep link
mobile đưa vào session đã chọn. STAFF/ADMIN giữ queue, presence và xử lý theo
phân quyền cũ. Bỏ chi tiết thời gian polling khỏi câu hướng dẫn UI.

Frontend test:required48 tests, i18n3592 keys, lint/typecheck/build PASS (hai warning
cũ). Runtime read-only6 cấu hình: CUSTOMER/STAFF/ADMIN VI1440 và EN375 xác nhận
vị trí, panel trong viewport, bàn phím và giữ draft; không page errors. Test chặn
hai heartbeat presence POST của staff, không coi là kiểm chứng mutation/presence
thật. Collision test375/1024/1440 PASS; đã xem screenshots desktop/mobile.
Evidence: C:/Users/Admin/.codex/lab-controller/assistant-mascot-20261017/;
gates ở ../assistant-mascot-20261017-gates.log. Không business writes trên DB demo.

## Header, nhãn mascot và chẩn đoán kết nối ngày17/10/2026

Header thêm tìm nhanh tài nguyên và lối tắt CUSTOMER→lịch đặt,
LAB_STAFF→vận hành, ADMIN→tài khoản. Giữ guard quyền/password setup của App;
thu gọn khi thiếu chiều rộng. Mascot chỉ hiện nhãn khi hover/focus-visible.
Tìm tự do mặc định nhóm Tất cả để kết quả phòng không bị nhóm Thiết bị che;
giữ nhóm cụ thể khi người dùng chọn, lưu ALL trong browse context.

Trợ lý kiểm tra trạng thái một lần mỗi lần mở hoặc bấm Kiểm tra trạng thái;
cache danh sách tài nguyên trong vòng đời widget, không thêm polling/retry ghi.
Hiển thị rõ tra cứu LAB sẵn sàng/câu hỏi mở ngoại tuyến, link quản lý cho ADMIN.
BRIDGE_UNAVAILABLE trong lúc gửi chuyển trạng thái offline, giữ câu hỏi lỗi,
không tự chuyển provider hoặc gửi lại. Trang kết nối chỉ cách tiếp tục bộ nhận
Work Cloud hiện có, không coi refresh là khởi động lại consumer.

Runtime thật: health backend và ngrok HTTPS200, grant ADMIN còn hạn tới13/11;
subscription duy nhất đã expiresAt=2026-10-16T07:36:38.693Z (14:36 UTC+7),
subscriptionCount=0, connected=false. Hai câu local trả200, nguồn local_guidance
và authenticated_mcp; không phải bằng chứng ChatGPT đã hồi phục. Không sửa TTL,
grant, token, provider, RBAC hoặc dữ liệu nghiệp vụ.

User yêu cầu mở ChatGPT để tiếp tục phiên hỗ trợ. Cua fresh inventory trả
"Local browser use is disabled in Work settings"; không có tab truy cập được.
Đã báo user cần bật quyền trình duyệt; chưa mở/tiếp tục phiên Work Cloud,
chưa đăng ký lại receiver, chưa xác nhận trả lời ChatGPT end-to-end.

Frontend test:required48 tests, i18n3606 keys, lint/typecheck/build PASS (hai warning
cũ). Browser read-only6 cấu hình3 role VI1440/EN375, thêm viewport768–1920 và
menu ghim: header không overlap/overflow, tìm mã phòng hiển thị card thật,
hover/focus, draft, cache resources và fresh status PASS, không page errors.
Fault fixtures riêng xác nhận offline→online khi mở lại, lỗi status giữ draft,
send thất bại không tự retry/provider switch; không phải provider QA thật.
Evidence C:/Users/Admin/.codex/lab-controller/assistant-header-20261017/
(results.json, edge-results.json, screenshots); scripts/log nằm cùng thư mục cha.
Next: sau khi user bật browser, mở đúng phiên Work Cloud Tiếp nhận hỗ trợ LAB,
tiếp tục consumer hiện có, kiểm subscription mới/connected và một câu trả lời thật.
Điều phối Claude vẫn paused; không tạo thêm task/automation/consumer.

### Đã khôi phục bộ nhận ChatGPT chiều17/10/2026

Browser đã truy cập được sau khi user mở lại ứng dụng. Đúng cuộc trò chuyện
Đăng ký bộ nhận LAB tại /c/6acf0345-2a64-83ec-9797-bc8d0211dbc3 có luồng
Tiếp nhận hỗ trợ LAB. UI đang Monitoring nhưng backend connected=false,
subscriptionCount=0; tạm Pause rồi Resume chính luồng hiện có đã đăng ký lại
receiver: connected=true, đúng1 subscription còn hiệu lực. Không đổi prompt,
OAuth grant, quyền, provider hoặc tạo thêm task/consumer. Claude vẫn paused.

Một câu hỏi CUSTOMER demo về ghi chép kết quả thí nghiệm đi thật qua webhook
và ChatGPT, trả ANSWERED/provider=chatgpt/source=chatgpt_bridge sau65giây.
Hội thoại ChatGPT xác nhận publish ANSWERED. Website LAB đăng nhập CUSTOMER,
mở widget và xác nhận không còn thông báo câu hỏi mở ngoại tuyến. Chỉ kiểm
chứng một câu VI, không khẳng định mọi role/locale hoặc độ ổn định dài hạn.
Không tạo booking/support session hoặc business writes; có1 assistant request QA.

Evidence bổ sung cùng assistant-header-20261017/: bridge-recovery-e2e.json,
chatgpt-receiver-recovered.png, browser-access-diagnostic.json (đã đánh dấu resolved).
Giữ Docker/ngrok và luồng Monitoring. Gia hạn TTL tự động trong tương lai chưa
được xác minh; không thay TTL hoặc cấu hình bảo mật để làm trạng thái xanh.
