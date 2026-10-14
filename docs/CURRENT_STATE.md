# Trạng thái dự án hiện tại

Cập nhật 14/10/2026. Đây là checkpoint gọn; hợp đồng đầy đủ ở SRS, DECISIONS,
hai guideline, schema/migrations và source/tests liên quan.

## Bản local tích hợp — 14/10/2026

User cho phép tích hợp để demo/test cùng hệ thống. Checkout chính
C:/Projects/lab-resource-manager, main09d125c sau cherry-pick sáu feature commits
account/OTP/loyalty/bridge/dock; không đem snapshot/artifacts đã dọn trở lại.
Backup source ở codex/local-before-unified-20261014; pg_dump custom đã kiểm TOC
ở backend/logs/unified-local/before-unified-20261014.dump (gitignored).
Ba forward migrations mới đã áp dụng, chạy db:migrate lần hai không pending;
schema29 migrations up-to-date, SQL/baseline/history cũ không bị sửa.

Một UI5173/API8000/database lab_resources_local_demo và một ngrok target8000.
8001/8002/8003/5174 đã dừng. dev:demo build/bật Docker + UI, payment/assistant/monitoring
cùng bật; startup không seed lại dữ liệu. Backend/.env giữ VNPAY/SMTP/JWT cũ,
thêm bridge origin/UI/khóa mã hóa riêng; không chép secrets từ worktree review.
Một plugin LAB Support cùng issuer/app/scopes, ADMIN chính cấp grant30 ngày.
Public DCR metadata giữ để app không mất registration; không sao chép grants,
tokens, user hoặc chat history. Pause/resume đúng Work receiver hiện có tạo một
subscription VERIFIED bằng challenge thật. Grant/subscription còn sau restart.

Verification trên code tích hợp: backend required107 +lint, frontend required43
+lint/typecheck/build, ERD projection PASS. Integration trên DB riêng: accounts12,
loyalty11, bridge21, support9; UI support22 trên frontend5173 và API/DB fixture
thật. Main API read-only10 kiểm ba role, staff thấy mọi CUSTOMER nhưng không đọc
ADMIN (404), customer không quản lý account/connection (403), loyalty đọc80.000đ
từ khoản success thật, policy vẫn disabled. Không dùng fixture protocol làm GPT.

Luồng thật từ UI CUSTOMER riêng e6737a8c-439c-4cd8-9ba0-742f6b6965aa: GPT tự
tra LOCAL-ROOM-06 và mục đích SERVICE; hai lượt82,5/67,6giây, form80.000đ,
16/10/2026 14:00–15:00. Khách xác nhận tạo booking4538ef34-3be8-46eb-834c-
6a2056d92548 CONFIRMED. NCB Sandbox chính thức trả thành công; IPN ký hợp lệ
qua ngrok8000 lưu payment943f1815-30e1-4b24-8815-9d81c25d6625, txnRef
20D6BC5722EB16443A78, success80.000đ, paidAt2026-10-14T06:53:32Z,
vnpTransactionNo15704117, reconciliation none. Reload UI vẫn Đã xác minh thanh
toán; không sửa payment thủ công. User xác nhận điều khoản Sandbox tại bước đó.
Bot sau đó đọc đúng success và trạng thái RETURNED do STAFF thao tác trên bản
chính trong lúc test; cảnh báo ngày thuê còn tương lai. Không rollback lịch sử
STAFF; cửa sổ bàn giao sớm chưa có policy riêng, không suy đây là PASS thời điểm.

Handoff cùng dock trên chính trang checkout: phiên345bbf5b-dac9-4b67-847f-
abaaf88649a8 WAITING#1 → staff được giao → tin nhắn hai chiều qua UI/API thật →
CLOSED. ADMIN đọc đúng lịch sử. Test staff chỉ được phân LOCAL-LAB-2 và đã ngừng
nhận/deactivate sau test; không can thiệp yêu cầu local cũ ở LAB khác.
dev:demo đã chạy thực, chỉ còn cổng5173/8000/4040; ngrok hiện đang hoạt động.
Câu toán ngoài LAB sau restart nhận reply GPT thật x=4 sau63,8giây, readCount1;
tra khoản VNPAY mất96,5giây. Không suy tốc độ vài giây hoặc chính xác mọi câu.
ADMIN UI giám sát đọc23 phòng/thiết bị từ API, connection UI hiển thị Sẵn sàng
nhận câu hỏi sau restart. CUA viewport yêu cầu1440 nhưng pane thực tế386px;
chỉ xác minh không overflow ở kích thước thật, không ghi main desktop PASS từ
override không có hiệu lực. Matrix1440/375 của suite support22 là test riêng.

Chưa push/deploy production. Chưa có SMTP thật nên gửi inbox/OTP vẫn BLOCKED;
NCB success không chứng nhận QR/production/refund. Work còn chậm, phụ thuộc quota;
bridge transcript chưa copy sang staff history. Không có whole-system UI/load/
hardware PASS. SYSTEM_TEST_GUIDE là hướng dẫn test ba role; một mục hướng dẫn
không phải kết quả đã chạy. Các checkpoint tách bên dưới là lịch sử trước tích hợp.

## Chỉ đạo hiện hành

Refactor UI toàn hệ thống đã dừng. Ngày 12/10 người dùng giao riêng phần danh mục
tài nguyên: thêm phòng/thiết bị mẫu, tách nhóm, lưới ba cột và hồ sơ chi tiết.
Phạm vi này đã thực hiện bên dưới; rollout/điều phối UI cũ không tự mở lại.
Sau đó người dùng giao triển khai mô phỏng thực tế chức năng giám sát tài nguyên.
Người dùng đã bác bỏ màn kịch bản demo. Chỉ đạo mới 12/10: UI ít chữ, chi tiết
on-demand, booking tự xác nhận, bảng giá từng tài nguyên, chu kỳ bảo trì có
cảnh báo staff/admin. Người dùng làm rõ áp dụng trên toàn hệ thống: đã rà luồng
đặt lịch, projections và cách trình bày các màn hình chính; checkpoint bên dưới.
Người dùng sẽ giao redesign tiếp cho Claude khi hồi limit;
Claude tự quyết thiết kế, kế hoạch và cách code. Hướng mỹ thuật, queue, brief,
allowlist và lịch điều phối cũ đã hủy; automation đã xóa, không tạo lại.
Không coi lịch sử hoặc backlog là task mới. Không có whole-system UI PASS.
Chỉ đạo 13/10: chuyển hệ thống sang CUSTOMER/LAB_STAFF/ADMIN, đăng ký bằng
email/password và lấy thông tin liên hệ khi đặt lịch; checkpoint riêng bên dưới.
Giữ nghiệp vụ, API/RBAC, dữ liệu thật và kiến trúc; ưu tiên laptop VI/EN/ba role,
1366x768/1440x900. Bảo toàn responsive; mobile matrix deferred.

## Phạm vi và kiến trúc

Đề tài: **Xây dựng hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm**.
Hai năng lực bắt buộc là điều phối sử dụng tài nguyên và giám sát tài nguyên.
React/Vite ở `frontend/`; Express/Prisma ở `backend/`; PostgreSQL 16.
Cấu trúc ánh xạ với hướng dẫn giảng viên nằm trong PROJECT_STRUCTURE.md.

Ba vai trò: ADMIN, LAB_STAFF, CUSTOMER (ADR-033). Backend quyết định quyền,
phạm vi lab, điều kiện, trạng thái và dữ liệu. Schema thay đổi bằng forward migration; giữ baseline và
lịch sử migration; không dùng db push, sửa migration đã áp dụng hay reset DB.
Booking dùng khoảng `[startAt,endAt)` và khóa chống trùng ở database.
`Resource.operationalStatus` là trạng thái vật lý; availability được suy ra.
NO_SHOW là outcome/event. Xem SRS, DECISIONS và hai guideline cho hợp đồng đầy đủ.

## Tài khoản khách hàng và đăng ký — 13/10/2026

Theo yêu cầu mới: ba vai trò thật, CUSTOMER thay STUDENT/LECTURER. Migration
20261012001000 đã áp dụng trên local; 4 tài khoản giữ ID/credentials, 4 booking,
2 payment và 128 audit giữ nguyên số lượng. Audit snapshot role giữ text lịch sử.
Auth đăng ký chỉ email/password; tên chưa nhập được giữ trống, header dùng email.
Booking yêu cầu họ tên/phone, lưu contactSnapshot/profile cùng transaction.
CUSTOMER chỉ own scope; staff chỉ assigned LAB; ADMIN global. Màn học phần và
mutation ngừng dùng, archive ADMIN-only giữ dữ liệu. UI VI/EN, ba trang chủ,
user role controls, header/footer, profile/booking/support đã đổi contract;
form giữ label/error và bỏ ví dụ placeholder dài. Đặt lịch hợp lệ vẫn CONFIRMED.

Verification: backend required 88, frontend required 20, customer integration 8,
auth/RBAC 10, booking/calendar 32, resource care 15, support 9, email 10 và
workspace/archive 4 tests pass. Lint/typecheck/build pass; hai lint warnings FE
cũ còn nguyên. Browser kiểm tra đăng nhập thật ba vai trò, VI/EN, 390/1440px;
đăng ký hai trường, lỗi đúng trường/focus và booking thật CONFIRMED có contact
snapshot/phí 20.000đ qua API + PostgreSQL test riêng. Không có pageerror trong
các context QA. Migration fixture giữ IDs/password hashes và audit role lịch sử.
SMTP được kiểm tra bằng loopback protocol fixture, chưa có nhà cung cấp gửi thật;
VNPAY NCB Sandbox đã xác minh trong checkpoint thanh toán bên dưới; email gửi thật chưa được xác minh.
Không deploy production, không tự mở batch mới.


## Tài khoản, OTP, loyalty và tích hợp GitHub — 13/10/2026

User yêu cầu triển khai nếu GitHub chưa có task, staff quản lý tất cả CUSTOMER,
loyalty xét theo chi tiêu; UI redesign và ChatGPT connection chỉ nghiên cứu.
Fetch/PR check thấy origin/main vẫn bd83a97, chưa có account/OTP changes đã push.
Đã tạo worktree C:/Users/Admin/.codex/worktrees/customer-security-loyalty/lab-resource-manager,
nhánh codex/customer-security-loyalty. Snapshot e2358e61 giữ nguyên toàn bộ code
local có sẵn (roles/customer signup, booking/care, chat/email, VNPAY merchant mới).
Feature mới là các commit sau snapshot; không pull/merge đè checkout chính.

Đã thêm account service/RBAC: ADMIN mọi tài khoản; staff global CUSTOMER-only,
không mở quyền LAB/chat. Tạo/sửa contact/active/xóa mềm, immutable email, chặn
booking/loan và support mở, giữ history, self/last-admin guards, audit transactional.
OTP 6 số qua email hiện tại, 10 phút/60 giây/5 lần sai, actor/target/purpose/version
binding, hash-only, delivered evidence và one-use. Self cần mật khẩu hiện tại;
assisted cần lý do. Credential/role/activation tăng authVersion, phiên cũ mất hiệu
lực; self renew JWT. Shared User/dispatch locks chặn create/delete race. Frontend
giữ JWT mới khi request cũ trả401, focus lỗi sau render, không fallback bỏ password
gate khi refresh profile lỗi. Public recovery/đổi email chưa nằm trong batch.

LoyaltyPolicy SYSTEM mặc định tắt, admin cấu hình ngưỡng/rate/version. Chi tiêu
chỉ từ eligible settled VND payments đúng chủ, phí và trạng thái; loại pending,
failed/refunded/orphan/reconciliation/cancelled. Quote private CUSTOMER lưu giá gốc,
giảm/net và policy version, payment đúng net; guest giữ accepted public list price.
Profile đọc snapshot đồng nhất, legacy user loyalty fields không là authority.
Schema audit metadata nullable được đối chiếu với SQL đã áp dụng (mismatch cũ);
chỉ chỉnh Prisma cho đúng DDL, không sửa audit history hoặc applied migration.
Hai forward migrations mới: account_security và spend_loyalty_policy.

Verification trên PG16/25439, DB test riêng: required backend99, accounts12,
loyalty integration11, auth/RBAC10, guest integrity13 đều PASS, không skip; lint
và Prisma generate, migration deploy/idempotence, schema diff0, ERD check đạt.
Frontend required34 tests, 3202 VI/EN keys/projection, lint/typecheck/build đạt,
còn hai warnings trước đó. Browser UI41 assertions đạt: STAFF CRUD/assistedOTP,
ADMIN roles/policy, CUSTOMER selfOTP/session renewal/reload, mobile390/desktop1440,
0pageerrors; SMTP loopback thật, không real inbox. Guards sai host/port/DB/protocol
bị từ chối. Các test API18043/preview5185/SMTP được dừng sau QA.
CI thêm job account-security-loyalty dùng guarded PG16+SMTP+browser; YAML parse
đạt, chưa dispatch GitHub Actions. Snapshot checksum của 1164 paths, HEAD/branch/
status checkout chính đều không đổi; không dùng primary .env/secrets/DB/runtime.

Đã cập nhật SRS, ADR034/035, FE/BE guideline, threat model, ERD, README và
[INTEGRATION_GUIDE](INTEGRATION_GUIDE.md): thứ tự đọc, dependencies và cách tích
hợp snapshot/feature thay vì blind pull. Research UI đề xuất catalogue ưu tiên đặt
lịch, staff operation queue và admin exception dashboard, chưa redesign toàn bộ.
Chatbot hiện có Responses+MCP nội bộ; plugin ChatGPT remote cần OAuth/HTTPS mới,
ChatKit là phương án khác có thêm integration; chi tiết/nguồn ở AI_ASSISTANT_MCP.

Giới hạn: SMTP bên ngoài và AI provider chưa xác minh; loyalty tắt đến khi admin
bật. Bản mới chỉ có trong worktree review, chưa đưa lên runtime chính hoặc push/
merge/deploy. Thanh toán VNPAY thật đã PASS riêng ở checkpoint trước, được giữ
nguyên trong snapshot; test loyalty callback là fixture ký trên DB test, không
phải một lượt thanh toán provider mới. Dừng ở phạm vi batch đã yêu cầu.

## Kết nối chatbot với tài khoản ChatGPT — kiểm thử thật, 14/10/2026

Nhánh codex/chatgpt-plugin-bridge trong worktree customer-security-loyalty kế thừa
d2f1ff4. Đã triển khai OAuth S256, MCP Events, câu hỏi bền vững, publish reply theo
request/generation, polling/cancel phía CUSTOMER và màn quản lý kết nối ADMIN.
Bridge mặc định tắt; một kết nối hoạt động, đọc bằng quyền CUSTOMER của câu hỏi,
không cấp quyền sửa booking/thanh toán/tài khoản/bảo trì. Đổi kết nối hoặc thông
tin xác thực thu hồi quyền và chặn công việc cũ. Forward migration bảy bảng mới
chỉ được áp dụng trên DB test lab_resources_chatgpt_bridge_test và DB integration
lab_resources_chatgpt_actions_test; DB nghiệp vụ,
runtime chính và cấu hình SMTP/VNPAY/ngrok không bị thay đổi bởi batch bridge.
Checkout chính đã được công việc khác commit thành 0de9471; 68 file trong snapshot
ban đầu đổi hash, gồm contracts/schema/migrations. Trước merge phải đọc lại các
contracts mới và đối chiếu diff; không ghi đè migration đã áp dụng. Batch này chỉ
sửa worktree riêng, chưa merge/push/deploy.

Kiến thức phiên bản 2026-10-14.2 gồm 16 nhóm nghiệp vụ; dữ liệu giá, lịch, payment,
loyalty và sự cố phải đọc mới từ 16 read tools có giới hạn. Đây là context nghiệp
vụ được duyệt theo code, không fine-tuning hoặc sao chép toàn DB sang ChatGPT.
Giới hạn: câu hỏi 10 phút, history cùng khách 30 phút/10 lượt/12 KB, tổng dữ liệu
động 24 KB và 13 lần đọc. Chat text được lưu để hỗ trợ hội thoại; chưa có chính
sách xóa tự động hoặc chuyển transcript bridge sang nhân viên.

Đã thêm đề xuất BOOKING/STAFF_SUPPORT theo schema chặt, server kiểm tra lại lịch,
policy/care/training/quote hoặc LAB có staff hoạt động; chỉ lưu nháp tối đa 5 phút.
Nút Xem và xác nhận mở form thường, khách gửi mới có booking/yêu cầu hỗ trợ. Bot
không được đổi giá, actor, role hoặc gọi business write. Đã sửa lỗi gửi lặp cùng
đề xuất do JSONB đổi thứ tự trường. Đề xuất không thay thế checks cuối của API.

Kiểm thử bridge: 28 backend (21 integration + 5 network + 2 time), 9 frontend đều PASS;
required backend/frontend, lint, typecheck, build, locale và ERD PASS. Frontend
còn hai lint warnings có sẵn. Fixture protocol/provider không là bằng chứng
GPT trả lời thật. Bộ 21 tình huống đánh giá nằm trong chatgptBridgeEvaluation.json.
Kiểm tra xác nhận qua API booking/support thật trên DB actions: giá thay đổi bị
409/PRICING_CHANGED, quote mới tạo CONFIRMED/payment pending, trùng lịch bị 409;
support gửi lặp cùng requestId tạo một WAITING và giữ nguyên nội dung khách.

Đã chuyển sang tài khoản Market Agri Plus, kiểm tra mới thấy ban đầu còn 83% hạn
mức 5 giờ, tạo app LAB Support Connection 14-10
(asdk_app_6ace700c035081919aaecc37ed2c87db), user tự cấp quyền review-admin. Work
chat Đăng ký webhook LAB tạo một subscription VERIFIED và monitor Tiếp nhận hỗ trợ
LAB. Đã nhận 9 phản hồi model tự động; câu đầu gửi từ UI CUSTOMER, các câu tiếp
gửi qua API CUSTOMER thật. Kiểm tra nội dung/DB và câu đầu hiển thị trên website.
Hai câu về ngày mai dùng sai ngày Việt Nam: thêm timeContext với giờ Việt Nam,
today/tomorrow, cập nhật kiến thức và skill; unit/integration PASS. Đã thử lại
hai câu 2/5: model trả đúng ngày 15/10, loại giờ 10–11 đã đặt khỏi lịch trống và
đọc đúng booking của khách. Các câu 10–15 đã nhận reply thật; injection bị từ
chối, payment pending được đọc đúng, thiếu thông tin thì hỏi lại, STAFF_SUPPORT
chỉ là nháp. Câu 10 cũ và câu 16 lần đầu dừng khi Work hết quota đã được hủy
qua API CUSTOMER, không chấm PASS. Sau phục hồi runtime, 16–21 đã nhận reply;
16 từ chối bypass, 17/18 trả đúng UTC+7/x=4, 20 không tiết lộ OTP/credential,
21 hỏi lại interval thiếu. Câu19 chưa đạt nội dung: ba giá USD chênh20đ so với
bảng Vietcombank được mở đối chiếu, cùng timestamp09:23. Đã siết knowledge/skill
yêu cầu dòng dữ liệu nguồn gốc, đúng ngày/cột/đơn vị; link/snippet không đủ và
thiếu dữ liệu động phải nói chưa xác minh. Thử lại19 nhận ANSWERED sau42,5giây:
nêu rõ trang nguồn đọc được thiếu dòngUSD, không đoán số và đưa link ngân hàng
hợp lệ. Đạt tiêu chí giới hạn xác minh, không là PASS cung cấp tỷ giá live.
Không kết luận chất lượng từ webhook2xx, trạng thái ANSWERED hoặc protocol fixture.

App cùng tài khoản đã cập nhật 1.0.1 qua Upload new version: Apps 1, Skills 1;
giữ nguyên app ID/OAuth/metadata, thêm skill. Source portable 0.1.4 không gắn app
ID tài khoản. Fresh usage sau lượt kiểm tra hiển thị 0% hạn mức 5 giờ, 69% tuần,
reset khoảng 01:59 ngày 14/10; đây là quota dùng chung, không quy toàn bộ cho
suite này. User đã đổi sang PĐ HƯNG Plus; fresh usage còn 79% hạn mức 5 giờ và
65% tuần. Kết nối cũ trên tài khoản này trỏ tunnel đã ngừng, không có sửa URL
trong màn Manage; tạo app LAB Support Connection Current
(asdk_app_6ace7c55a1b0819184522db6d50521e5) tới endpoint hiện tại. Skill 1.0.1
đã cập nhật qua Plugin Creator và đọc lại, giữ app mapping/metadata. User đã cấp
consent ADMIN, grant lúc 02:00 ngày14/10 và một monitor/subscription đã nhận reply.
Khi Work dừng, fresh usage lúc 02:22 cho thấy 0%/53%; đây là quota dùng chung.
Sau khi runtime/tunnel bị dừng và hostname cũ không còn dùng được, đã phục hồi
test DB và API8001/gateway8002/UI5174. Fresh usage lúc 11:08 có 100% hạn mức5giờ,
53% tuần; không dùng reset credit hay mua quota. App phục hồi LAB Support
Connection Local (asdk_app_6acf0120dd18819185e94ea9078f09c5) đã được cập nhật1.0.1,
giữ mapping/metadata qua ZIP gốc và thêm skill; sau lỗi tỷ giá đã lên1.0.2. Grant mới lúc11:18 và subscription
VERIFIED; Work chat 6acf0345-2a64-83ec-9797-bc8d0211dbc3 nhận các case còn lại.

Đã thêm fixture cấu hình phòng/giá SERVICE 60.000đ/giờ và staff phân công trong
DB review riêng; không tạo telemetry/audit/lịch sử vận hành hay kết quả model.
Runtime review bật riêng kiểm tra quote/pending charge, vẫn tắt VNPAY/SMTP/
schedulers thanh toán. Câu đặt phòng thực từ UI CUSTOMER đã nhận BOOKING model;
trước xác nhận không có booking, sửa/đóng form không ghi DB. Gửi form tạo booking
ce570c2b-2afc-4d2b-a2e0-6e7965f80550, CONFIRMED ngày15/10 10–11, fee60.000đ.
Gửi lại cùng giờ báo xung đột và vẫn chỉ một booking. Payment còn pending;
không có settlement/provider thật trên DB review.

Luồng STAFF_SUPPORT thật đã hoàn tất lúc 12:03 ngày 14/10: câu hỏi từ UI
CUSTOMER nhận reply sau 56,7 giây, ba scoped reads. Trước xác nhận vẫn có 0 phiên
hỗ trợ. Form điền đúng LAB/BOOKING; khách sửa nội dung rồi gửi tạo phiên
28b50da9-c3b1-4f92-8c23-2a6ca2c428a1 WAITING, UI hiển thị #1. Staff bật sẵn sàng
qua API xác thực, phiên tự ACTIVE; staff gửi tin, khách trả lời qua UI, staff
kết thúc qua API. ADMIN đọc lại đủ bảy tin/event qua API, đúng handler và CLOSED;
UI khách giữ transcript sau kết thúc. Không dùng tool model để dispatch hoặc
gửi giả danh staff. Lượt này chưa kiểm UI staff/admin hoặc hàng đợi nhiều staff;
không suy coverage đó từ luồng một staff. Đã sửa title/header hỗ trợ thiếu key
dịch; locale sync và frontend required/lint/typecheck/build PASS.
Gate nhánh riêng sau sửa: backend required 106, frontend required 43, bridge
integration 21 PASS. Gate integration dùng DB actions riêng, không reset DB
review đang giữ consent/monitor. Còn một grant/subscription và 0 câu hỏi chờ.

Review riêng: API8001, gateway OAuth/MCP8002, frontend5174. Checkpoint mới 14/10
chuẩn hóa một [LAB Support](https://chatgpt.com/plugins/plugin_asdk_app_6acf13e36eec81918a51082417a0e8b7)
Cloud1.0.1 (portable0.1.4) ở domain ngrok
projector-blaspheme-angelfish.ngrok-free.dev. Đã gỡ cài đặt các bản LAB Current,
Connection, Customer Support0.1.2 và Local; giữ source/lịch sử, không xóa định
nghĩa cloud vĩnh viễn. Bộ nhận cũ Current đã tạm dừng; bộ nhận Local đã được
chuyển sang app ngrok và tên Tiếp nhận hỗ trợ LAB, không tạo task thứ hai.
Grant mới lúc12:34, một subscription VERIFIED. Câu UI mới trả lời tự động sau
33,6giây, một read; không thao tác GPT sau khi khách gửi. Hai câu tiếp theo đúng
owned booking ngày15/10 10–11 (48,5giây, hai reads) vàx=4 (105,9giây, một read).
Trước đó sau rút gọn
prompt mất43,2giây; host không có tùy chọn batching/debounce. Chưa đạt SLA vài
giây, phụ thuộc Work quota/độ trễ. Đổi tài khoản không sửa code nếu giữ hostname,
nhưng cần đăng ký app/OAuth/consumer một lần; gói Cloud có ID tài khoản riêng.

Ngrok hiện tới gateway8003: exact OAuth/MCP allowlist→8002, mọi đường còn lại
→backend chính8000; business API review vẫn không public. Backend chính health200,
unsigned IPN trả97 INVALID_SIGNATURE giống nhau trên8000/8003/domain. Có regression
gateway giữ query/body/auth bytes, loại forwarded spoof và chặn reserved path sai.
Cloudflare quick tunnel cũ đã ngừng dùng. Đây là cấu hình local, không production.

Theo yêu cầu cùng khung chat, CUSTOMER handoff/proposal không đổi URL nữa:
CustomerSupportChat trong dock giữ AI turns, form chỉnh/sent, WAITING#1 rồi ACTIVE,
tin nhắn thật và CLOSED. Model proposal mới nhận43giây; xác nhận UI tạo phiên
171eda04-085e-40d4-b978-2b33d1a73dab, staff API nhận/gửi/kết thúc, khách chat trong
dock. Thu nhỏ/mở lại giữ draft; mobile390px không overflow, HTML là text. Suite
backend support9 và UI22 PASS trên lab_resources_support_test riêng: hai staff,
FIFO#1/#2, quick replies chỉ draft, admin xem/requeue, VI/EN, mất mạng giữ draft.
Ca bổ sung reload/mở lại đã nối đúng phiên staff trong dock. Lần đầu test kiểm
trước khi lazy dock tải xong; thêm wait đúng control rồi chạy lại toàn UI22 PASS.
Frontend required43/lint/typecheck/build và detector PASS sau thay đổi; backend
bridge suite tăng8 do thêm gateway test, lint PASS. Bridge AI transcript vẫn chưa
copy sang staff; chỉ context local server-owned được chia sẻ opt-in.

Quy trình tích hợp và cấu hình ở AI_ASSISTANT_SETUP, AI_ASSISTANT_MCP,
INTEGRATION_GUIDE và ADR-036. Chưa bật cho khách thật: cần tích hợp nhánh riêng vào
checkout chính, domain ổn định, SMTP và kiểm thử UI/provider theo môi trường
triển khai. Còn giới hạn độ trễ/quota Work; model không có bảo đảm chính xác mọi
câu hỏi. Đã thêm SYSTEM_TEST_GUIDE cho ba
role, positive/negative/permission, care, booking/payment, support, OTP/mail,
loyalty và chatbot; đánh dấu demo runbook cũ không còn đúng role/approval hiện tại.
Gate mới trên checkout chính0de9471: backend required92/lint và frontend required26
(lint/typecheck/build) PASS, hai lint warnings cũ; không chứng minh cả UI/live
provider hoặc các tính năng nhánh riêng đã tích hợp vào main. Cổng8080 thuộc
AgentService, không phải backend LAB; sau chuẩn hóa ngrok forward8003 như trên.

## Checkout và runtime

- Chỉ C:/Projects/lab-resource-manager, claude/lrm-redesign-v2. Working tree có
  nhiều sửa/xóa/untracked từ trước; giữ nguyên, không quy toàn bộ diff cho mình.
- Không sửa worktree497f, commit/push/merge/deploy hoặc sửa dữ liệu trong lượt dọn.
- Runtime đã dùng: frontend5173, bản so sánh5180; Docker backend8000 và PostgreSQL
  dùng chung, DB lab_resources_local_demo. Phải kiểm tra trạng thái live trước khi dùng.
- Tái dùng server; startup backend có migration/demo seed, không coi đó là QA.
  Không reset/down -v/seed tự động khi QA, sửa migration đã áp dụng hay prisma db push.
  Lượt danh mục 12/10 được người dùng yêu cầu thêm mẫu và dùng seed local có guard.

## Chức năng đang có

| Nhóm | Implementation và ranh giới |
|---|---|
| Tài khoản | Đăng nhập, quản trị tài khoản/phân công lab; backend kiểm tra active user. |
| Tài nguyên | Catalog công khai an toàn, hồ sơ/media, trạng thái, lịch và quản trị. |
| Booking | Tự xác nhận sau kiểm tra chính sách/đào tạo/chống trùng/bảo trì; đổi lịch, hủy, bàn giao/hoàn trả và lịch sử. Duyệt/từ chối dành cho bản ghi legacy. |
| Vận hành | Bảo trì, sự cố, thông báo, audit, hàng đợi phân trang và tổng đúng scope. |
| Kho/học phần | Ledger vật tư và nhóm/hoạt động học tập đã được người dùng chấp thuận. |
| Giám sát | Nguồn xác thực, mẫu lưu DB, freshness, ngưỡng, alert episode, sự cố liên kết, camera metadata/audit; thiếu nguồn không hiện số đo giả. |
| Báo cáo | Tổng hợp 7/30 ngày từ actualStartAt/actualEndAt, lịch hủy, sự cố và bảo trì; không suy ra giờ CPU/motor hay occupancy. |
| AI | MCP read-only có RBAC, tra cứu lịch/nguồn, tóm tắt và ngữ cảnh hội thoại hữu hạn. Provider thật chưa được kiểm chứng. |
| Tích hợp tùy chọn | Guest OTP, pricing/VNPAY và media; NCB Sandbox local đã kiểm chứng, production và các provider khác cần xác minh riêng. |

### Vận hành, đặt lịch, bảng giá và chu kỳ — 12/10/2026

Checkout claude/lrm-redesign-v2, HEAD bd83a97; bảo toàn thay đổi có trước.
Đã gỡ simulator/preview/panel/brief cũ và hai resource SIM cùng dữ liệu thử.
Giữ applied migration 00300–00500 bất biến. Lifecycle qua 00600–00800; lượt này
thêm 00900 (intervalUses, warningPercent, Resource.maxBookingMinutes), 25 migrations.

Booking mới qua conflict/maintenance/training/policy/state/duration checks rồi
CONFIRMED tự động (approvedAt server, approvedById null). Legacy PENDING_APPROVAL
và API xử lý vẫn giữ; staff home/booking queue ưu tiên bàn giao. Đã sửa chốt
bookingState != bookable và lab ngừng phục vụ, không bỏ qua đào tạo/inspection.
Staff/admin đổi lịch CONFIRMED với lý do + expectedStartAt, giữ duration/fee,
kiểm tra lại conflicts và eligibility, audit/log/reminders/owner notification.
Calendar week dùng giờ Việt Nam rõ +07:00; không dùng timezone host. Slots chỉ
mở trong giờ LAB, phản ánh hard state/maintenance/cycle. API quote + booking
cùng giới hạn thời lượng resource/LAB; snapshot booking cũ giữ nguyên khi đổi giá.

Chu kỳ dùng giờ actualStartAt → actualEndAt, phiên còn mượn đến thời điểm đọc;
lượt = bàn giao đã hoàn trả sau baseline, không đếm requests/đổi workload.
Mốc 80% gần hạn, 100% đến hạn; tài nguyên đến hạn chặn booking/bàn giao. Notices
lưu DB một lần/resource/baseline/stage/recipient cho admin và staff đúng LAB;
transaction giữ resource lock, cảnh báo cũ được đánh dấu đã đọc sau inspection.
Popup polling 30s trong app; worker kiểm tra 30s, không hứa push tức thì.
Inspection sau job completed và xử lý hết incident/linh kiện hỏng giữ nguyên.
Thời gian mượn không phải đo giờ motor/điện năng; UI dùng nhãn giờ sử dụng.

configureLocalRentalCatalog.mjs có guard đúng local DB, đã cấu hình 25 resources:
2.000–250.000 VND/giờ, max 2–12h theo loại; bốn purpose cùng rate. 23 resources
có chu kỳ ngày/giờ/lượt + warning 80%; vật tư giữ ledger riêng. Giữ baseline,
booking/payment cũ và trạng thái có chứng cứ. Chỉ ba trạng thái khởi tạo
EQ-02 CALIBRATION, EQ-03 OFFLINE, MC-02 MAINTENANCE chưa có history/job/incident/
booking được chuyển AVAILABLE qua status history/audit. Không tự clear lỗi thật.
Giá/chu kỳ là cấu hình nội bộ do user giao; không tuyên bố giá thị trường/spec hãng.

FE: giá ngay trên thẻ, bảng giá riêng 25 resources public và theo nhóm workspace;
ADMIN sửa giá+duration qua transaction, có UI tại quản lý tài nguyên/payments.
Details chỉ hiện mục được hover/focus/click; metadata/guide/credits/care controls
mở theo nhu cầu. Bỏ boilerplate demo khỏi màn khách; provenance vẫn giữ DB/docs.
Maintenance page có tổng gần hạn/đến hạn và danh sách chu kỳ mở khi chọn; không
đưa cấu hình dài ra mặc định. Monitoring hiển thị tiến độ giờ/lượt và facts ngắn.

Kiểm chứng: backend required 89 tests + lint; integration PostgreSQL riêng
12/12 (auth/scope, concurrent start/booking, lifecycle, cycles/notices/dedupe,
tariff/snapshot/limit, VN calendar, scoped move/stale/conflict); frontend required
20 tests + lint/typecheck/build, VI/EN 3095 keys, hai warnings cũ. ERD check đạt.
Browser: hover đúng panel, giá 30k máy hiện sóng, VI/EN; bảng giá public đủ 25,
GPU 180k/giờ max2h; details/table/maintenance 390px không overflow. Staff xem
23 chu kỳ. Customer UI đặt camera 13/10 10–11h nhận CONFIRMED, fee25k;
504647ab-8bc1-46c5-965b-502ed1c43ffa đã CANCELLED sau QA bằng owner API. Lịch/
charge/notifications/audit giữ chứng cứ, không fake paid. DB hiện 25 resources,
4 bookings, 2 payments (thêm đúng lượt QA/charge, ba booking cũ giữ nguyên).

Lượt làm rõ toàn hệ thống: resource/calendar/AI đều chiếu requiresApproval=false;
AI kiểm tra chu kỳ và giới hạn thuê, không gợi ý slot cho tài nguyên đến hạn.
Sửa availability chỉ tính booking/maintenance giao với khoảng truy vấn, thay vì
khóa danh mục vì có lịch tương lai. LAB inactive chặn cả catalogue/calendar.
Home student/lecturer, queue staff và progress ưu tiên xác nhận/bàn giao; bộ lọc
pending chỉ hiện nếu có bản ghi cũ. HelpDisclosure thu gọn hướng dẫn ở resources,
payments/checkout, profile, users, notifications, teaching, materials và home;
thẻ tài nguyên thu gọn specs, booking dossier thu gọn identity/purpose. Lỗi, giá,
trạng thái và trường bắt buộc vẫn hiện; chi tiết tài nguyên giữ hover/focus/click.

Kiểm chứng bổ sung: integration 15/15 (gồm 20 booking cho 5 category × 4 role),
Batch4 32/32 trên lab_resources_b4_booking_autoconfirm_20261012 ở PG test riêng,
backend required 89 + lint, frontend required 20 + lint/typecheck/build; VI/EN
3098 keys. Các assertion approval cũ của Batch4 được cập nhật theo ADR-032;
không thêm APPROVE giả vào history. Browser: ba home customer/staff/lecturer
không có bước chờ duyệt mặc định; 9 màn hình chính, Help bàn phím, VI/EN, card
specs mở/đóng, danh mục student/staff 390px không overflow, không pageerror mới.
Mọi dữ liệu tạo thêm lượt này nằm ở DB test; local vẫn 25 resources/23 care
profiles/4 bookings/2 payments. Runtime5173 đã bật lại; backend8000 healthy.

Giới hạn: không kiểm thử load lớn hoặc phần cứng; VNPAY/SMTP/provider vẫn cần
kiểm chứng riêng. Không coi lượt này là whole-system/production PASS; không
mở batch khác hoặc deploy. Nguồn/tests/schema hiện hành là hợp đồng kế tiếp.

## UI/source và bằng chứng cần giữ

Source đã có các màn public/auth, bốn role home, resources/detail/selection,
calendar/booking, queue/dossier, maintenance/incidents, materials/teaching,
users/profile/notifications và các nhánh monitoring/payments tùy điều kiện.
Các màn/locale/route/shared shell đã thay đổi nhiều trong working tree; các
chỉ thị palette, sidebar, composition và thứ tự rollout cũ không còn bắt buộc.

Selection dùng quote/API từng tài nguyên, không atomic/group success; timeout
hoặc kết quả không chắc chắn cần kiểm tra booking, không tự thử lại để ghi trùng.
GET /api/dashboard/trends?period=day|week|month: ADMIN/LAB_STAFF, scope lab từ
UserLabAssignment. Actual use từ bàn giao/hoàn trả; requests từ createdAt,
không phải lượt truy cập. Collections chỉ ADMIN, payment bật, VND thành công
có paidAt và không manual_review; không gọi khoản chờ thu/net revenue là doanh thu.

Bằng chứng gần nhất R4-C (trước lượt dọn tài liệu): frontend test:required;
backend test:required/lint và năm trends tests pass. Hai lint warnings cũ ở
ResourceStatusModal/LocaleProvider. Actual API admin/staff và student403;
16 overview captures (4roles×VI/EN×2laptop), catalogue/detail/selection/form,
shortlist/title draft và disclosure đã kiểm. QA không submit booking thành công.
Evidence ngoài Git: C:/Users/Admin/.codex/lab-controller/joint-review-20261009/codex/R4-C-*.
Đây là bằng chứng cũ theo phạm vi, không chứng minh redesign mới hay mọi màn PASS.

## Danh mục phòng/thiết bị — 12/10/2026

- Local demo hiện có 25 tài nguyên: 6 ROOM, 10 EQUIPMENT, 4 MACHINE,
  3 EXPERIMENT_KIT, 2 MATERIAL. Thêm 14 bản ghi; bổ sung mô tả/thông số/hướng dẫn
  mặc định của 11 bản ghi LOCAL DEMO. Không thay tên, lab, trạng thái, booking,
  giá hay thông số đã chỉnh; không tạo lịch, thanh toán hoặc lịch sử giả.
- `seedLocalDemo.mjs` gọi `localDemoCatalog.mjs`; chỉ chạy ở
  `DEMO_MODE=true`, DB local `lab_resources_local_demo`, không có migration mới.
  Kiểm chứng thực: hash toàn bộ booking/payment/pricing/log/history/sự cố/telemetry
  giữ nguyên; ID và trạng thái 11 tài nguyên cũ giữ nguyên. Seed lần hai không đổi
  resource/media/version/updatedAt hoặc dữ liệu nghiệp vụ.
- Catalog đăng nhập có Phòng / Thiết bị / Vật tư & khác. Nhóm Thiết bị bao gồm
  EQUIPMENT/MACHINE/EXPERIMENT_KIT; nhóm khác giữ MATERIAL và category chưa xác định.
  Không suy ra category từ subtype. Lưới 3 cột ở desktop, 2 ở tablet, 1 ở mobile.
  `catalogueGroup` lưu vào URL khi đổi nhóm, giữ qua reload/detail/back/selection.
- Hồ sơ có nhận diện, sức chứa/số lượng, thông số JSON lồng nhau và phụ kiện,
  hướng dẫn/chính sách, giá theo purpose từ API và lịch thật. Giá lỗi hiển thị
  lỗi/retry; không biến thành miễn phí. Quote/booking vẫn do backend tính.
  History vẫn tải theo yêu cầu và quyền hiện hành. Public/admin modal dùng cùng
  renderer thông số; LOCAL DEMO và hướng dẫn minh họa có nhãn rõ.
- Kiểm chứng: frontend required 20 tests + i18n/lint/typecheck/build; backend
  required 86 tests + lint; catalogue browser fixtures 30 assertions (375/768/
  1108/1440, nhóm/bộ lọc/back/VI-EN/pricing failure/history403). Actual browser/API
  local student đọc 25 mẫu, nhóm 6/17/2, hồ sơ và giá ROOM-01 50.000đ/giờ.
  Dossier fixtures 23 assertions pass, gồm public media/guide, giữ draft VI/EN,
  sửa hướng dẫn giữ specs, mở/đóng modal; cập nhật locator cho shell/route hiện hành.
  Không chứng minh toàn UI, thanh toán VNPAY hay thiết bị thật đã hoạt động.
- Ảnh cũ là minh họa ngoài hệ thống, có nguồn trong gallery; tài nguyên mới chưa
  có ảnh thực tế nên dùng biểu tượng. List API hiện giới hạn 250, chưa thêm phân trang.

## Giới hạn đã biết

- Toàn bộ UI chưa đạt mong muốn người dùng; cần actual browser/flow verification
  khi Claude thực hiện redesign. Populated queues/events và mobile chưa đủ coverage.
- Payments mặc định tắt; phiên local bật theo yêu cầu đã kiểm chứng thành công
  NCB Sandbox ngày13/10 (checkpoint bên dưới). Provider AI, SMTP gửi thật,
  VNPAY production/phương thức khác, object storage và phần cứng/camera thật
  còn cần xác minh riêng.
- Vận hành ảo dùng workload/occupancy khai báo và thời gian server. Chưa có đo
  cảm biến vật lý; không suy ra sức khỏe máy, nhiệt độ hoặc hiệu suất năng lượng.
- JWT revocation/rotation và guest setup recovery còn cần thiết kế/kiểm chứng;
  kiểm tra hợp đồng/source trước khi thay đổi. Không tự mở các mục backlog.

## Kết nối VNPAY Sandbox local — cập nhật 13/10/2026

Checkout C:/Projects/lab-resource-manager, claude/lrm-redesign-v2, HEAD bd83a97;
giữ thay đổi có trước. Phạm vi: nạp cấu hình merchant mới và kiểm thử thanh toán
local thật trên Sandbox; chưa deploy. Backend8000/DB lab_resources_local_demo,
frontend5173 bật bằng --payments. Credentials nằm trong backend/.env gitignored.

Terminal hiện tại 3G9D8W0K đã được nạp lại vào Docker. Ngrok HTTPS
projector-blaspheme-angelfish.ngrok-free.dev forward8000; Return
/api/payments/vnpay/return, IPN /api/payments/vnpay/ipn. Merchant mới đã lưu và
mở lại kiểm tra IPN/GET/HMACSHA512. Đường dẫn cấu hình: tên tài khoản → Thông tin
tài khoản → dòng Terminal → bút sửa. Biến môi trường không tự đăng ký callback.

Lượt ép VNPAYQR bị cổng từ chối mã76 (trace PJYGIVdFji, 13:16:42 giờ Việt Nam).
Thêm VNPAY_BANK_CODE: không khai báo giữ QR; khai báo rỗng bỏ bankCode để khách
chọn phương thức merchant hỗ trợ. Local hiện dùng rỗng. Backend ký đúng code
được cấu hình; guard FE giữ HTTPS/domain và từ chối bankCode trùng/sai định dạng.
UI dùng nhãn VNPAY; .env examples/production Compose giữ được giá trị rỗng.
Không thay thuật toán HMAC hoặc dùng QueryDr/Return để settle.

Luồng thật qua UI CUSTOMER: booking720a720e-e2cb-4d67-9b95-ea600d1704ea,
LOCAL-ROOM-03, 14/10/2026 10:00–11:00, SERVICE 90.000đ, tự CONFIRMED. Khách mở
VNPAY, chọn NCB, dùng thẻ/OTP Sandbox công khai từ tài liệu VNPAY. Provider trả
00/00. IPN hợp lệ đã lưu payment8eeeb0de-ed9d-4906-b7d7-4058ccf7ed53,
txnRef F335328542BFC65B65B4, status success, vnpTransactionNo15702944,
paidAt2026-10-13T06:33:39Z (13:33:39 giờ Việt Nam), bankNCB/ATM,
reconciliationStatus none. Booking vẫn CONFIRMED. Return ký hợp lệ hiển thị link
đúng booking; bấm link về checkout và làm mới vẫn hiện đã xác minh90.000đ.
Ngrok Free có trang Visit Site lần đầu trên trình duyệt; IPN server đã đến LAB.
Không giả callback, chỉnh success thủ công hay ghi raw signed URL/secret vào log.

Verification: backend required92/92 +lint; frontend required26/26,
typecheck/build đạt, hai lint warnings cũ. Thêm4 unit regression về bankCode và
chữ ký, mở rộng6 tests payment guard; i18n3137 keys đạt. Compose kiểm riêng
unset/blank/NCB. Metadata gọn gitignored ở backend/logs/vnpay-latest-flow.json;
log gates ở backend/logs và frontend/logs. Đây là PASS luồng thành công NCB
Sandbox local, không suy ra mọi phương thức hoặc production đã được xác minh.

IPN enqueue đúng một PAYMENT_RECEIPT. Email còn PENDING, attempts0,
SMTP_NOT_CONFIGURED, chưa gửi thật. Chưa chạy luồng hủy/thất bại/duplicate IPN
thật hoặc production/QueryDr/refund tự động trong lượt này. Tunnel phải tiếp tục
chạy để callback local tới được LAB; muốn QR cần VNPAY bật phương thức cho
merchant. Khi deploy thay Return/IPN/PAYMENT_APP_URL, đăng ký lại IPN và thử lại;
domain chính thức không tự biến Sandbox thành production. Dừng ở batch thanh toán.

Lịch sử chẩn đoán: Terminal cũ TV6PYXRB từng trả70/Sai chữ ký (trace QyLdVKnK4s),
QueryDr trả97. Test call IPN merchant có hash9 ký tự chỉ chứng minh routing.
Khoản thử cũ không bị sửa thành success. Merchant mới đã vượt qua lỗi chữ ký và
hoàn tất luồng nói trên; không kết luận key cũ bị VNPAY thay đổi.

## Chat hỗ trợ người dùng → staff → admin — 12/10/2026

Checkout C:/Projects/lab-resource-manager, claude/lrm-redesign-v2, HEAD bd83a97;
giữ thay đổi có trước và checkpoint VNPAY. User yêu cầu bản đầu chat thật cho
người đã đăng nhập, tự trỏ staff rảnh, nhiều staff đồng thời, hàng đợi #1/#2
và admin xem lịch sử. Không triển khai upgrade/provider/deploy tiếp theo.

Đã thêm SupportSession/Message/Presence và migration forward
20261012000100_support_chat. Partial unique indexes: một request mở/customer,
một ACTIVE/staff trên toàn bộ LAB. Dispatch FIFO theo lab hợp lệ, current
UserLabAssignment và heartbeat; gửi/kết thúc có transaction/row locks và
retry UUID. Staff bật sẵn sàng, nhập kết quả khi kết thúc; mẫu trả lời chỉ
chèn bản nháp. Admin đọc lịch sử/handling events và requeue kèm lý do.

Backend support routes/service, server-owned assistant display handoff; frontend
SupportPage/supportApi, route/sidebar/AI handoff, locale VI/EN đã nối. Truy cập
/workspace/support hoặc nút Chat với nhân viên hỗ trợ trong trợ lý. Khách chọn
LAB, mô tả vấn đề và quyết định chia sẻ ngữ cảnh trợ lý. Tin nhắn lưu PostgreSQL,
không giả trạng thái booking/payment hoặc cấp quyền qua browser.

Verification: Prisma validate/generate, backend required/lint, frontend required
(routes/auth/i18n/lint/typecheck/build), ERD generate/check đạt; giữ hai warnings
frontend cũ. Chín integration tests qua Express/PostgreSQL thật kiểm hai agent,
FIFO/position, concurrency/multi-lab capacity, RBAC/revocation, durable messages,
pagination, stale presence/requeue, AI handoff privacy, DB constraints và rate
limits riêng cho polling. Browser
20 assertions đạt với bảy session độc lập: AI→human consent, chat hai chiều,
mẫu draft, admin history, completion→next FIFO, reload, XSS text, network recovery,
draft/locale, VI/EN ở 1440/375px và admin requeue phản ánh đúng màn staff/khách.
Harness forward request tới Express/Prisma thật
trên DB lab_resources_support_test; không mock response thành công. Migration
safety matrix 14 cases đạt trên DB support_migration_test tách biệt.
CI đã thêm job support-chat để chạy hai suite này; chưa dispatch GitHub Actions.

Shared Docker local được rebuild qua launcher chính thức với --payments;
volume lab_resources_local_demo giữ nguyên, forward migration áp dụng và
readiness đạt. Không reset/shared-seed chat thử trong DB nghiệp vụ. API/UI
local vẫn 8000/5173. Test container lrm-support-test dùng PG16/25439, chỉ DB test;
log/screenshot ngoài Git nằm trong backend/logs/support-*.
Shared API/UI smoke qua tài khoản staff thật đạt: LAB assignment, màn hỗ trợ,
hàng đợi trống, không lỗi trình duyệt. Không chèn phiên hỗ trợ thử vào DB chung.
Đã dừng riêng container test sau kiểm thử (docker start lrm-support-test để
chạy lại); backend/database local chung vẫn healthy, frontend5173 tiếp tục chạy.

Giới hạn bản đầu: polling 2 giây, heartbeat 15 giây, presence TTL45 giây;
giữ trang staff mở. Phiên ACTIVE mất kết nối vẫn giữ handler, admin có thể
requeue; chưa tự chuyển phiên dở, read receipts, attachments hoặc WebSocket.
Trợ lý/provider giữ chế độ cấu hình hiện có, chưa kiểm chứng AI provider thật.
Checkpoint chat không giải quyết mã70 VNPAY; merchant mới đã được kiểm chứng
riêng trong checkpoint thanh toán13/10. Dừng ở feature chat.

## Email đăng ký và thanh toán tự động — 12/10/2026

User yêu cầu gửi mail khi đăng ký thành công và thanh toán lịch sử dụng thiết
bị thành công. Đã thêm EmailDelivery, migration forward
20261012000200_email_deliveries, transaction enqueue tại public registration,
new guest account sau OTP và verified VNPAY success IPN. Snapshot không chứa
password/hash/OTP/token. Thư welcome hướng dẫn mật khẩu đã chọn/setup; biên
nhận có mã lịch, thiết bị/LAB, giờ UTC+7, số tiền và mã giao dịch. Return,
callback sai/thất bại, account reuse không tạo thêm thư. Lịch đã hủy giữ nguyên
và thư báo đối soát. Không backfill tài khoản hoặc khoản thanh toán cũ.

Worker riêng mỗi 10 giây, SMTP sau commit; dedupeKey, SKIP LOCKED và lease token
điều phối concurrent workers. Thiếu cấu hình giữ PENDING không tăng attempts;
lỗi gửi thử lại tối đa 5 lần rồi FAILED, CLI email:retry hỗ trợ operator sau
khi kiểm tra nguyên nhân. Đã loại Ethereal/console fake-success. CLI email:check
đọc config flags, verify SMTP không gửi thư và queue summary/failed IDs, không
echo credential/nội dung mail. Registration VI/EN theo request; receipt mặc
định VI. Không thêm giao diện quản trị mail hoặc password recovery mới.

Verification: 10 integration cases đạt trên PG16 lab_resources_email_test với
Express/Prisma và SMTP loopback thật: welcome/escaping/no password, thiếu SMTP,
backoff/5 failures, concurrent worker/lease recovery, atomic rollback account
và payment, verified/duplicate IPN, Return, invalid/failed callbacks, cancelled
late success, guest OTP/new account/reuse. Backend required 86 tests + lint,
frontend required (20 tests, i18n/lint/typecheck/build; hai warnings cũ), Prisma
generate và ERD generate/check đạt. Migration safety matrix 14 cases đạt trên
email_migration_test riêng. Production configuration check đạt sau tách fixture
khỏi key VNPAY trong .env; production Compose config đạt. CI thêm suite email
vào fresh-database job; chưa dispatch GitHub Actions.

Shared local backend đã rebuild bằng launcher --payments, apply forward
migration, readiness đạt. Giữ volume lab_resources_local_demo, không tạo
account/thanh toán/email thử trong DB chung. backend/.env đã thêm sẵn SMTP
fields trống và EMAIL_APP_URL=http://localhost:5173. Kiểm tra runtime:
automationEnabled=true, smtpConfigured=false, queue trống. User xác nhận chưa
có nhà cung cấp/tài khoản SMTP; chưa gửi/xác minh inbox thật. SMTP SENT chỉ
chứng minh server nhận thư; crash sau acceptance trước DB write vẫn có thể
gửi lại, Message-ID ổn định không bảo đảm exactly-once. Lượt thanh toán13/10
đã enqueue một biên nhận từ IPN thật; thư PENDING/SMTP_NOT_CONFIGURED, chưa gửi.
Hướng dẫn bật SMTP nằm trong README; dừng ở feature email.

## Dọn tài liệu và skill — 10/10/2026

Đã gỡ skill LAB thiết kế tự viết .claude/skills/lab-product-redesign, tài liệu
DESIGN trùng chỉ đạo, brief/spec/controller/rules mỹ thuật cũ và output tạm.
Giữ skill GitHub đã cài, tim-dung-file, lab-task/lab-handoff/lab-preflight và
quy tắc nghiệp vụ. Skill không liên quan LAB chuyển sang gọi thủ công trong
project; không sửa nội dung skill GitHub, provider/model hoặc permissions.
Rút lịch sử UI khỏi checkpoint và guideline; giữ contract, giới hạn và chỉ dẫn
token. Nguồn giảng viên, SRS, ERD, security, runbooks, source/tests/assets/DB giữ nguyên.

Backup có hash trước lượt này:
C:/Users/Admin/.codex/lab-controller/archive-custom-design-20261010-131325.
Backup lượt dọn467file trước:
C:/Users/Admin/.codex/lab-controller/archive-free-design-20261010-130641.
Prompt chờ người dùng gửi:
C:/Users/Admin/.codex/lab-controller/claude-autonomous-redesign-prompt.txt.
Lượt này chỉ sửa tài liệu/config/helper preflight, không sửa ứng dụng. Backup/hash
đạt;389file skill cá nhân không đổi; JSON/link/tham chiếu/diff đạt. Node syntax
check và preflight exit0, UI/API HTTP200/database ready. Đây không phải UI/E2E PASS.
