# Tích hợp các tính năng LAB

Tài liệu dùng khi hợp nhất GitHub với code local; đọc cùng CURRENT_STATE cho kết
quả kiểm thử của revision đang xét. Không thay hướng dẫn giảng viên hoặc AGENTS.

## Bản tích hợp local — 14/10/2026

User đã cho phép tích hợp vào checkout chính để demo chung. Main0de9471 có code
nền giống e2358e6, chỉ đã bỏ artifacts; cherry-pick sáu feature commits sau
snapshot thành d8483ca/64fd55b/54c654d/97111e1/c310fa0/09d125c. Không đưa snapshot
hoặc artifacts đã dọn trở lại. Có branch codex/local-before-unified-20261014 và
pg_dump custom trước migration trong backend/logs/unified-local (gitignored).
Ba forward migrations được áp dụng trên DB local chính; chạy lại không pending.
Không đổi SQL/migration history đã áp dụng, không chép .env từ worktree.

Từ nay demo dùng C:/Projects/lab-resource-manager, UI5173/API8000 và một ngrok
target8000; account/loyalty/booking/payment/chat đọc cùng DB. Script dev:demo bật
backend + frontend với payment/assistant; restart không tự seed. Hướng dẫn cũ
bên dưới mô tả quá trình phát triển tách, không phải topology runtime hiện hành.
Work OAuth được cấp lại từ ADMIN chính; public client registration giữ endpoint
cũ, không chuyển grants/tokens/history. Pause/resume đúng bộ nhận hiện có để
đăng ký subscription thật theo grant mới. Đổi tài khoản vẫn cần OAuth/consumer.
Chưa push/deploy; SMTP thật và SLA phản hồi Work vẫn là giới hạn riêng.

## Bản phát triển hiện tại

Ngày 13/10/2026, fetch GitHub cho thấy origin/main vẫn bd83a97, chưa thấy nhánh/PR
mới về quản lý khách hàng/OTP. Theo user, đã triển khai trực tiếp trên bản tách:

- Branch: codex/customer-security-loyalty.
- Checkout: C:/Users/Admin/.codex/worktrees/customer-security-loyalty/lab-resource-manager.
- Commit e2358e61ca89bc54b4661a6d7d338a460a21d302 là snapshot code local có sẵn,
  gồm ba role, tự xác nhận lịch, care, hỗ trợ, email và VNPAY; không phải feature mới.
- So sánh feature mới với e2358e61, không so với origin/main để tránh nhận nhầm
  hàng trăm thay đổi local đã có thành thay đổi của batch này.
- Checkout chính C:/Projects/lab-resource-manager có nhiều thay đổi chưa commit.
  Bản tách không chứa .env, secrets, node_modules, business DB hoặc runtime logs.

## Đọc trước merge, theo thứ tự

1. AGENTS.md; .agent/PROJECT_RULES.md, INSTRUCTOR_BASELINE.md, DEVELOPMENT_WORKFLOW.md.
2. docs/srs.md: actors, account/OTP, booking, payment, support và Appendix H.
3. docs/convention.md; docs/PROJECT_STRUCTURE.md.
4. docs/CURRENT_STATE.md; docs/DECISIONS.md: ADR-021/022/023/029/030/032/033/034/035.
5. docs/FRONTEND_GUIDELINE.md và BACKEND_GUIDELINE.md, cùng area AGENTS.
6. README: runtime, SMTP, VNPAY và hướng dẫn trong file này.
7. backend/prisma/schema.prisma, forward migrations và docs/DB-erd/core-erd.md.
8. API/service/callers/tests của account, pricing, payment, guest booking và support.
9. AI_ASSISTANT_MCP.md và AI_ASSISTANT_SETUP.md khi sửa chatbot. UI research nằm
   trong FRONTEND_GUIDELINE, không phải một redesign đã hoàn tất.

## Các hợp đồng phải giữ đồng nhất

| Phạm vi | Điểm cần đối chiếu |
|---|---|
| Roles | ADMIN/LAB_STAFF/CUSTOMER; giữ migration chuyển role cũ và audit lịch sử, không phục hồi student/lecturer UI |
| Accounts | Staff quản lý mọi CUSTOMER; chỉ account APIs có scope toàn hệ thống. LAB operations/chat vẫn UserLabAssignment |
| Credentials | OTP bắt buộc, email immutable; self change trả JWT mới, authVersion thu hồi token cũ; mọi nơi mint JWT dùng authTokens |
| History | Xóa mềm, chặn booking/support mở; shared User lock bảo vệ in-flight create/delete; audit cùng transaction |
| Booking | Auto CONFIRMED sau đầy đủ eligibility/conflict/policy/care checks; giữ legacy pending thật, resource locks và exclusion constraint |
| Pricing | acceptedQuote có tariff/policy version; lưu base/discount/net, payment thu đúng net; guest giữ giá đã chấp nhận |
| VNPAY | IPN ký đúng mới ghi success; Return chỉ dẫn về app. Giữ VNPAY_BANK_CODE trống cho chooser merchant mới, không ép QR |
| Email | Welcome/receipt outbox không có password; OTP gửi SMTP trực tiếp, không bypass khi thiếu SMTP |
| Locale | Sửa catalog VI/EN rồi npm --prefix frontend run i18n:sync; backend projection/manifest phải đi cùng |

## Trình tự hợp nhất an toàn

1. Kiểm tra HEAD/branch/status cả hai nơi, backup/snapshot các thay đổi local và
   DB trước thao tác migration. Không reset, stash hoặc chép source đè khi chưa
   hiểu các thay đổi đang có. Không chép .env giữa hai checkout.
2. Fetch để biết remote thực sự có gì. Nếu local đã có toàn bộ snapshot e2358e61,
   đối chiếu/cherry-pick chỉ feature commit sau snapshot, giải quyết xung đột theo
   hợp đồng. Nếu xuất phát origin/main, cần tích hợp snapshot local trước, rồi
   feature; cherry-pick feature một mình sẽ thiếu các dependencies local.
3. Giữ migrations đã áp dụng/baseline nguyên byte. Chỉ thêm account_security và
   spend_loyalty_policy forward migrations sau customer_roles_and_booking_contact.
   Cài dependencies, db:generate, dùng db:migrate canonical; không db push/reset
   hoặc sửa _prisma_migrations. Kiểm tra db:status và chạy deploy lần hai để chứng
   minh idempotence trên DB test trước khi dùng DB có dữ liệu nghiệp vụ.
4. Kiểm thử backend/frontend required, lint/typecheck/build, locale/ERD và các
   integration bên dưới trên DB riêng. Browser test không sửa shared runtime.
5. Kiểm tra diff, secrets, merge dependencies và CURRENT_STATE. Chỉ chuyển runtime
   sang source tích hợp khi sẵn sàng; phát hành/deploy và SMTP thật cần kiểm chứng
   riêng. Worktree hiện là bản review được, chưa được áp dụng lên runtime chính.

## Lệnh kiểm thử

Từ checkout đã chọn:

```powershell
npm --prefix backend run db:generate
npm --prefix backend run test:required
npm --prefix backend run lint
npm --prefix backend run docs:erd:check
npm --prefix frontend run test:required
```

ACCOUNT_SECURITY_TEST_DATABASE_URL phải là PostgreSQL loopback port25439, DB
lab_resources_account_security_test; LOYALTY_TEST_DATABASE_URL tương tự DB
lab_resources_loyalty_test. Tạo DB test mới và db:migrate trước chạy; không dùng
DB nghiệp vụ. Không đưa URL chứa password vào báo cáo. Với env đã thiết lập:

```powershell
npm --prefix backend run test:accounts:integration
npm --prefix backend run test:loyalty:integration
npm --prefix frontend run test:ui:accounts
```

Browser test tự chạy API18043, SMTP loopback và static build preview5185, rồi dừng;
Chrome/Edge local hoặc Chromium cài bằng playwright-core, Node22. File test/harness
chỉ cho phép fixture email security.test và đúng DB; không tồn tại fixture endpoint
trong API production. CI job account-security-loyalty chuẩn bị PG16/25439 và chạy
cùng suites cùng auth/RBAC và guest OTP regressions; chưa dispatch GitHub Actions trong batch này.

## Giới hạn cần cấu hình khi đưa vào sử dụng

SMTP thật chưa có: thêm SMTP_HOST/PORT/USER/PASS/EMAIL_FROM backend, verify transport
và thử hộp thư do mình quản lý; không ghi SENT thành inbox-confirmed. Ưu đãi mặc
định tắt, ADMIN bật và chọn chính sách phù hợp trước cung cấp cho khách. Public
forgotten-password, đổi email và đổi điểm/voucher chưa được triển khai.

## Tích hợp bridge ChatGPT trên nhánh kế tiếp

Nhánh `codex/chatgpt-plugin-bridge` kế thừa toàn bộ d2f1ff4/account/OTP/loyalty.
Đọc ADR-036, AI_ASSISTANT_MCP, phần 8 AI_ASSISTANT_SETUP, CURRENT_STATE và các
schema/routes/tests bridge trước merge. Thêm migration forward
`20261013000300_chatgpt_account_bridge`; giữ nguyên baseline/migrations cũ.
Các điểm giao nhau cần giải quyết cùng nhau: app/server lifecycle, assistant
suggestions, authenticated CUSTOMER polling, App/route registry/layout, catalog
VI/EN + manifest/projection và schema User relations. Không bỏ grant/authVersion
checks để xử lý xung đột. Không chép .env hoặc endpoint tunnel tạm sang production.

Bridge mặc định tắt nên runtime hiện có không bị chuyển provider ngoài ý muốn.
Chỉ bật sau migration/config/OAuth consent/Work subscription và kiểm thử reply
thật. Gói `plugins/lab-support-bridge` không có key; script package tạo mcp.json
theo HTTPS origin đã xác minh. Gói private hiện dùng endpoint review tạm, cần
cập nhật kết nối sang domain ổn định trước vận hành. Không push/merge/deploy vào
checkout chính trong batch này.

Checkpoint 14/10: checkout chính đã được công việc khác commit thành 0de9471;
68 file trong snapshot đầu phiên đổi hash, gồm contracts/schema/migrations.
Đọc lại PROJECT_RULES và các phần contracts đã đổi trước merge, so sánh cả hai
nhánh và giữ nguyên migrations đã áp dụng. Không dùng snapshot bd83a97 để kết
luận checkout chính hiện vẫn chưa đổi. Thay đổi bridge chỉ nằm ở worktree riêng.

Integration tests chỉ dùng CHATGPT_BRIDGE_TEST_DATABASE_URL loopback, DB
`lab_resources_chatgpt_bridge_test` hoặc `lab_resources_chatgpt_actions_test`, mọi
user kết thúc `@bridge.test`. Dùng DB actions riêng khi còn OAuth review đang mở:

```powershell
npm --prefix backend run test:chatgpt-bridge:prepare
npm --prefix backend run test:chatgpt-bridge:integration
npm --prefix frontend run test:chatgpt-bridge
```

Không chạy các integration tests này trong lúc người dùng đang thử OAuth trên
cùng DB review: setup chủ động thu hồi grants fixture cũ để kiểm thử lặp lại.
Merge cả customerProposals/requests/MCP schema, chatgptBridgeProposals/API,
Assistant/AppLayout/App, QuickBookingModal, CustomerSupportChat và SupportPage. Chỉ hai loại đề xuất
xem trước; không ghép tool AI vào endpoint business writes. Giữ bước khách xác
nhận, lấy lại quote và kiểm tra cuối của API booking/support. Kiến thức phiên bản
2026-10-14.2 và plugin portable 0.1.4 đi cùng contract optional proposals/timeContext;
số liệu hiện thời ngoài LAB phải có dòng dữ liệu nguồn gốc, không chỉ link/snippet.
Gói Cloud phải map app ID đăng ký đúng tài khoản; không bê ID private cũ sang.
Handoff CUSTOMER giữ trong dock, bỏ callback App điều hướng STAFF_SUPPORT cũ.
Staff/admin workspace vẫn cần cho xử lý/history; không bỏ support API/FIFO/RBAC.
Gateway8003 chỉ dùng nối main8000 và review8002 dưới cùng ngrok khi chưa tích hợp;
khi backend đã tích hợp bridge, trỏ cùng origin tới backend có cả OAuth/MCP/IPN,
không mang cổng test/DB review vào deployment. Đọc AI_ASSISTANT_SETUP8.1 cho chuyển
tài khoản và một consumer; installation không tự cấp OAuth/subscription.
Chạy 21 tình
huống model thật sau OAuth + Events; test protocol không thay thế bước này.
Đã có 9 câu nhận reply thật nhưng 2 câu sai ngày mai, đã sửa múi giờ và chưa thử
lại model. Còn 11 tình huống chưa chạy và một câu bị hủy khi hết Work quota.
Không gộp subset này thành PASS toàn bộ hoặc bật cho khách thật trước nghiệm thu.
