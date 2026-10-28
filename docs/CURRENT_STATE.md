# Trạng thái dự án hiện tại

## Detail pass — 5 mặt còn "đơn giản" — 28/10/2026 (user: "chi tiết, hợp lý như hệ thống lớn")

Audit 20 màn hình 3 vai trò (Temp/lab-ui-audit/) chỉ ra 5 mặt yếu; đợt này
nâng tất cả chỉ bằng dữ liệu thật từ API hiện có, không seed/mock:

1. **Thanh toán (customer/admin)**: dải tổng hợp 4 thẻ (số giao dịch, đã xác
 nhận + tổng tiền, chờ + tổng tiền, không thành công) + biểu đồ cột dòng tiền
 14 ngày gộp theo ngày giờ VN từ paidAt/createdAt; panel chi tiết khi trống
 hiện trạng cổng thật (vnpay/vietqr từ providers); ledger customer thành
 grid 2 cột (minmax 300px). Tooltip cột + aria-label qua catalog key.
2. **Kho vật tư (staff/admin)**: dải 4 thẻ tình trạng kho (tổng/đã ghi
 tồn/chưa kiểm kê/tồn 0) từ rows; badge đỏ tồn bằng 0; panel phải khi trống
 có quick-jump "Cần kiểm kê mở đầu" (4 vật tư chưa có số dư).
3. **Nhật ký kiểm toán (admin)**: chip tông màu theo nhóm hành động
 (user/access/policy/payment — auditActionTone mới trong auditPresentation);
 divider theo ngày giờ VN giữa các nhóm sự kiện.
4. **Empty states**: dossier lịch đặt & bàn giao hiện hint + snapshot 4 lịch
 đầu hàng đợi (BookingStatusBadge, click chọn thật); biểu đồ "Nhịp hoạt động"
 0 dữ liệu thành panel nét đứt có thông điệp thay vì khung xương trống.
5. **Monitoring fallback**: khi tab bị chặn (flag TELEMETRY tắt local),
 redirect về tổng quan thay vì trang lịch + banner quyền.

i18n: +20 key VI/EN (tổng 4063, sync parity PASS). Kiểm chứng: test:required
PASS (locale-source audit bắt 2 chỗ chữ cứng — đã chuyển sang catalog key);
test:ui:contrast 22/22 · 0 finding; test:ui:a11y 21 trang PASS; chụp trước/
sau tại Temp/lab-ui-audit/ (after-*.png). Giới hạn đã biết: banner "Chưa tải
được đầy đủ dữ liệu" có thể xuất hiện tạm trong kịch bản redirect trực tiếp
URL monitoring (lỗi tải do đổi tab nhanh, có nút Thử lại); dữ liệu demo vẫn
còn bản ghi tên "test"/"QA…" trong thanh toán và thiếu ảnh tài nguyên — cần
quyết định của người dùng (Lô B), không tự sửa DB.

## CTA band contrast fix — 28/10/2026 (user report "tương phản chán")

Người dùng báo dải CTA "Sẵn sàng bắt đầu?" chữ tối trên nền tím đậm gần như
vô hình. Gốc thật: spectrum.css ghim màu mực bằng
`.project-public-shell.lab-spectrum .landing-cta :is(h2, p)` (specificity
0,3,1) — rule của liquid-glass.css chỉ 0,2,0 nên thua bất kể thứ tự nạp; tìm
ra bằng cách xóa rule từng lớp rồi đo computed color. Fix trong
liquid-glass.css: 2 rule 0,4,0 outbid — tiêu đề gradient trắng→lavender→mint
(background-clip:text), mô tả rgba(233,229,255,.86); nút chính đảo trắng/tím,
nút phụ kính trắng viền .55 + blur, focus ring trắng; orb mint trôi 11s sau
chữ (reduced-motion tắt). Đo được: title 14,92:1, desc 12,16:1, nút 11,70:1;
desktop VI + mobile VI chụp tại Temp/lab-cta-fix/, không overflow, 0
pageerror; test:required PASS. Bài học: khi override landing section, phải
đối chiếu selector `:is()` của spectrum.css — specificity, không phải thứ tự
file, mới là luật thắng.

## Landing liquid glass + dashboard glass — 28/10/2026

Batch người dùng yêu cầu trực tiếp: (1) landing hero chuyển thành banner
full-bleed lớn — ảnh LAB thật phủ toàn banner (zoom-in chậm 18s), veil spectrum
đa lớp (mint/violet/peach radial + fade trái), tiêu đề/subtitle/CTA nằm trong
liquid glass panel (blur 22px + saturate 155%, backing ≥.62 trắng, AA giữ cho
chữ ink); (2) dải chữ chạy (marquee) dưới mép banner: 9 chip đặc điểm + quy
trình thật (phòng, thiết bị, đặt lịch, giữ chỗ, bàn giao, hoàn trả, telemetry,
bảo trì, hỗ trợ) ×2 track lặp seamless, chạy 44s, hover dừng, tab ẩn/ra khỏi
viewport dừng theo effectiveMotionPaused, reduced-motion thành danh sách tĩnh
(aria-hidden bản copy); (3) các section landing trên canvas wash aurora +
card glass (features/workflow/roles/schedule), CTA band tím sâu glass; (4)
dashboard 3 vai trò: masthead + notices + trends chuyển glass (blur 14–18px),
panel dữ liệu giữ solid. File: liquid-glass.css mới (import cuối main.jsx,
 PublicLanding.tsx hero restructure, spectrum.css masthead append, 4 key
marquee VI/EN (tổng 4043), 2 icon import mới. DESIGN.md ghi amendment.

Kiểm chứng: headless 4 cấu hình (desktop VI/EN, mobile VI, reduced-motion) —
hero 868/727px, glass blur render, 18 chip, marquee chạy thật (transform đổi),
reduced-motion animation:none + danh sách tĩnh, không overflow, 0 pageerror;
staff dashboard masthead/notices/trends blur render; screenshots
Temp/lab-liquid-glass/. test:required PASS (91 tests, i18n 4043 keys, lint 2
warning cũ, typecheck, build). test:ui:contrast PASS 22/22 · 0 finding (lượt
đầu FAIL flaky "Live home data unavailable" staff mobile — race dữ liệu đã
biết, rerun sạch; glass không đụng data). Hero img alt="" + wrapper
aria-hidden (ảnh nền trang trí, nội dung nằm trong glass panel). git diff
--check PASS. Đã commit trong lô landing này. Automation đã TẠM DỪNG theo
yêu cầu người dùng (cron chuyển 9h thứ 2, prompt chỉ xác nhận).

Giới hạn: backdrop-filter nặng GPU trên landing (chỉ hero + section cards,
fallback @supports tăng backing); chưa test Safari thực (backdrop-filter -webkit
đã có); marquee 44s có thể nhanh với một số người dùng — hover dừng +
reduced-motion tĩnh; chưa có screenshot review của người dùng. Bước tiếp theo
đề xuất: người dùng xem landing trực tiếp (5173) và phản hồi hướng glass; có
thể tinh chỉnh veil/độ đậm panel, mở rộng glass cho trang how-it-works/resources,
và commit phần 28/10 của Codex (drafts system, accessibility) khi được duyệt.

## Xác minh bàn giao 28/10 — 28/10/2026 (không đụng code)

ZCode chạy lại toàn bộ test mà bàn giao chỉ định trên đúng checkout hiện tại:
test:required PASS (91 tests, i18n, lint 2 warning cũ, typecheck, build),
test:maintenance-drafts PASS 3/3, test:ui:customer-accessibility PASS,
test:ui:shared-form-drafts PASS, test:ui:resource-profile-journey PASS
(desktop/mobile, reduced motion, EN). Runtime 5173 đã được khởi động lại bằng
node scripts/dev-local.mjs sau khi bị tắt. 10 commit kế hoạch 7 lô đã được
người dùng duyệt và thực hiện trước đó (249f30b…6be59ff, gồm chore local) —
công việc 28/10 của Codex (bản nháp dùng chung, workbench, accessibility,
hồ sơ tài nguyên) vẫn UNCOMMITTED theo đúng bàn giao; đề xuất khi người dùng
sẵn sàng: commit thành 3 lô (drafts system, accessibility+focus, workbench/
care/monitoring) — chờ duyệt, chưa thực hiện. Kế hoạch 7 lô cũ tại
docs/COMMIT_PLAN_20261027.md đã hoàn tất.

Đánh giá "còn cần tinh chỉnh theo ý người dùng": (1) commit lô 28/10 khi
duyệt; (2) các màn mới (drafts notice, resource dossier timeline) đã theo
spectrum + reduced-motion qua test journey — chưa có screenshot review toàn
màn cho người dùng duyệt thị giác; (3) NVDA/VoiceOver thủ công và contrast
gradient còn bỏ ngỏ theo bàn giao; (4) automation 5 phút vẫn đang bật.

## Bàn giao UI cho AI tiếp theo — 28/10/2026

Checkout C:/Projects/lab-resource-manager; branch codex/claude-qa-20261021; HEAD 6be59ff. Còn nhiều modified/untracked, gồm mã cần thiết cho các chức năng mới; giữ toàn bộ công việc có trước, không restore/reset. Chưa commit/push/deploy. Đọc AGENTS và tài liệu canonical theo thứ tự; các checkpoint bên dưới chứa phạm vi và giới hạn từng đợt.

Ý người dùng: UI thay đổi rõ rệt, sáng đa sắc tinh tế tím/mint/peach, nền đẹp, nội dung gọn, chuyển động có mục đích và reduced-motion; tránh chỉ sửa border/font hoặc làm báo cáo. Ưu tiên luồng khách hàng mạch lạc, mobile và bàn phím. Không mở rộng thêm hạ tầng bản nháp; luôn gợi ý bước kế tiếp sau mỗi đợt.

Đã làm: workbench sự cố/bảo trì; giám sát chu kỳ chăm sóc bằng dữ liệu ghi nhận; hồ sơ tài nguyên có lịch sử và liên kết công việc; giữ resource/job/bộ lọc qua URL và Back; bản nháp dùng chung theo tài khoản/7 ngày cho bảo trì, đặt lịch đăng nhập, báo sự cố và yêu cầu hỗ trợ; sửa focus/Tab/Escape/inert của BaseModal và focus lỗi hỗ trợ. File trọng tâm: BaseModal2026.tsx, QuickBookingModal.tsx, ResourceDetailPage.tsx, MaintenancePage.tsx, các feature incidents/monitoring/support, utils/localDraftStore.ts, hooks/useLocalFormDraft.ts và locale VI/EN.

Kiểm thử nhanh từ frontend/: npm run test:required; npm run test:maintenance-drafts; npm run test:ui:customer-accessibility; npm run test:ui:shared-form-drafts; npm run test:ui:resource-profile-journey. Các UI test này dùng fixture API cô lập. Dùng UI_SCREENSHOT_DIR trỏ thư mục Temp để tránh sinh ảnh trong repo. Runtime recipe: node scripts/dev-local.mjs --monitoring; kiểm tra/reuse dịch vụ đang chạy trước, không seed/reset.

Bằng chứng cũ: required91, storage3, customer accessibility24 trạng thái VI/EN desktop/mobile, support/payment14 regression PASS; lint 2 warning cũ, typecheck/build PASS. 5173 là ứng dụng; 5193/5194/5195 là trang đối chiếu ảnh fixture tĩnh, không phải UI nghiệp vụ live. Ảnh/log mới ở Temp/lab-customer-accessibility-20261028 và lab-shared-form-drafts-20261028.

Giới hạn: chưa thử NVDA/VoiceOver thực tế, contrast gradient bị bỏ qua, không chứng nhận WCAG toàn diện; UI fixture không thay PostgreSQL integration. Bản nháp không phủ guest/contact/address/chat replies và không tự gửi lại nghiệp vụ. Bước đề xuất: xác minh runtime và diff, chạy các gate trên rồi thử luồng đặt lịch bằng bàn phím/trình đọc màn hình với dữ liệu QA riêng; không ghi/reset DB demo. Bàn giao này không tự cấp quyền mở batch mới cho AI khác.

## Luồng CUSTOMER và truy cập bằng bàn phím — 28/10/2026

Batch kiểm tra/sửa accessibility, không mở rộng hạ tầng bản nháp; giữ các diff/checkpoint cũ, không commit/push/deploy. BaseModal2026 bỏ phần tử ẩn hoặc :disabled (kể cả fieldset) khỏi vòng Tab, giữ focus trong modal, inert nền rồi khôi phục, xử lý Escape cho modal lồng và trả focus/fallback khi đóng. SupportPage đưa focus tới lỗi khi mutation thất bại bằng errorRef/tabIndex; polling không giành focus, hành vi Enter có trước giữ nguyên.
Thêm test_customer_accessibility_ui.mjs và script test:ui:customer-accessibility. Gate test:required PASS 91, lint 2 warning cũ, typecheck/build PASS. Browser PASS 24 trạng thái (catalogue/detail/support/report/booking/review × 1440/390 × VI/EN): nhãn control đang hiện, không overflow/page error; quét contrast nền đặc trong phạm vi hỗ trợ không có finding.
Kiểm tra PASS focus trường lỗi đầu khi báo sự cố, lỗi hỗ trợ 503 đưa focus đúng và giữ nội dung, đặt lịch đến review/preflight bằng bàn phím không gửi booking POST; Tab/Shift+Tab/Escape, dọn inert và trả focus. Regression hỗ trợ/thanh toán PASS 14 kịch bản. Reviewer customer_a11y_finish: SHIP qua đọc code/tests.
Baseline phát hiện nền chưa inert; assertion focus sự cố ban đầu chờ sai thời điểm đã sửa harness chờ RAF, không phải lỗi production. Bằng chứng: C:/Users/Admin/AppData/Local/Temp/lab-customer-accessibility-20261028; kết quả lab-customer-a11y-final.json và required log tại Temp.
Giới hạn: fixture cô lập, không ghi DB nghiệp vụ; bỏ qua contrast gradient, chưa thử thủ công NVDA/VoiceOver và không chứng nhận toàn bộ WCAG.
Bước đề xuất tiếp theo: kiểm tra thủ công luồng đặt lịch bằng NVDA/bàn phím với dữ liệu QA trước khi mở rộng UI; chỉ bắt đầu khi người dùng yêu cầu.

## Bản nháp đặt lịch, báo sự cố và yêu cầu hỗ trợ — 28/10/2026

Batch do người dùng yêu cầu; giữ các checkpoint/diff có trước, không commit/push/deploy. Tách localDraftStore dùng chung từ bảo trì (adapter giữ key cũ), thêm useLocalFormDraft, DraftActorContext trong App.jsx và LocalDraftNotice/CSS dùng chung; không thêm dependency, schema hoặc API nghiệp vụ.
Phạm vi: QuickBooking cho CUSTOMER đã đăng nhập (không guest), biểu mẫu báo sự cố (không xử lý sự cố), yêu cầu hỗ trợ mới (không lưu conversationId, cờ shareContext hoặc transcript chat). requestMessage có thể được điền sẵn từ AI handoff và vẫn là văn bản yêu cầu được lưu nếu người dùng chỉnh sửa. Đặt lịch chỉ lưu các trường lịch/nội dung/mục đích trong whitelist, không lưu liên hệ/địa chỉ/thanh toán/báo giá. Ghi trạng thái chưa rõ kết quả trước POST; khôi phục trạng thái này chặn gửi lại và hướng kiểm tra lịch sử, không tự gửi.
Giữ tách tài khoản, hạn 7 ngày, khôi phục chủ động và xóa khi thành công đã xác nhận. Thông báo trong cùng document đồng bộ các instance đang mounted; khóa khôi phục/bỏ nháp khi busy. VI/EN thêm 1 khóa, tổng 4039 và manifest đồng bộ.
Gates: test:required PASS 91, lint 2 warning cũ, typecheck/build PASS; storage unit PASS 3 nhóm; regression hành trình bảo trì PASS sau tách store. Browser shared draft PASS ba luồng reload/khôi phục/lỗi 503, whitelist, không tự gửi, kết quả chưa rõ, desktop/mobile; assertion đồng bộ instance mounted PASS, exit 0 (store đổi khi modal đang mở→khôi phục tiêu đề mới nhất).
Bundle index cuối 481.25 kB, gzip 138.98 kB; trước batch 477.72/137.88 kB, tăng khoảng 1.1 kB gzip. Không tạo ba bộ lưu trữ riêng hoặc mở rộng hạ tầng ngoài các biểu mẫu đã yêu cầu.
Reviewer phát hiện 2 vấn đề đã sửa, chưa có SHIP mới. Bằng chứng/ảnh: C:/Users/Admin/AppData/Local/Temp/lab-shared-form-drafts-20261028; kiểm thử dùng fixture cô lập, không ghi DB nghiệp vụ. Lưu cục bộ không bảo đảm phục hồi khi storage bị xóa hoặc đổi trình duyệt/thiết bị.
Bước đề xuất tiếp theo: dừng mở rộng tính năng bản nháp, kiểm tra luồng người dùng và accessibility thực tế; chỉ bắt đầu batch tiếp khi người dùng yêu cầu.

## Khôi phục bản nháp lập kế hoạch bảo trì — 28/10/2026

Batch người dùng yêu cầu giữ bản nháp khi reload/sự cố trình duyệt; phạm vi chỉ biểu mẫu lập kế hoạch bảo trì, không phải mọi biểu mẫu hay luồng CUSTOMER. Giữ các diff và checkpoint có trước, không commit/push/deploy.
maintenanceDraftStorage.ts và MaintenancePage lưu từng thay đổi vào localStorage theo tài khoản, hạn 7 ngày; thông báo bản nháp có lựa chọn khôi phục hoặc bỏ. App.jsx truyền actorId và key để tách phiên tài khoản. Giữ snapshot trạng thái/updatedAt, tài nguyên và thời gian gốc (gồm giây) để kiểm tra stale và kiểm tra lại ảnh hưởng khi khôi phục.
Khi storage lỗi: giữ bản nháp trong bộ nhớ cho điều hướng SPA và cảnh báo beforeunload; tombstone trong phiên ngăn bản nháp cũ hiện lại nếu xóa storage thất bại sau lưu server thành công. Đây không phải autosave nghiệp vụ lên backend; không bảo đảm phục hồi khi người dùng xóa storage, đổi trình duyệt hoặc thiết bị.
VI/EN thêm 6 khóa, tổng 4038 và manifest đồng bộ. Thêm test_maintenance_draft_storage.mjs/package script, mở rộng test_resource_profile_journey_ui.mjs.
Gates: test:required PASS 91, lint 2 warning cũ, typecheck/build PASS. Storage unit PASS 3 nhóm: hạn/schema/tài khoản, quota và memory fallback, lỗi xóa và session tombstone. Browser mở rộng PASS: reload khôi phục đúng ghi chú, lưu lỗi 503 giữ nháp, lưu thành công xóa nháp, cách ly tài khoản, bỏ nháp có hiệu lực sau reload, kiểm tra lại ảnh hưởng; desktop/mobile và EN.
Reviewer phát hiện 2 vấn đề đã sửa; chưa có kết luận SHIP mới. Browser dùng fixture cô lập, không ghi dữ liệu nghiệp vụ và không chạy lại backend integration.
Ảnh khôi phục draft-recovery1440/390 và bằng chứng: C:/Users/Admin/AppData/Local/Temp/lab-maintenance-draft-20261028.
Bước đề xuất tiếp theo: mở rộng bảo vệ bản nháp cho đặt lịch CUSTOMER và hỗ trợ; chưa triển khai trong batch này, chỉ bắt đầu khi người dùng yêu cầu.

## Bảo trì theo ngữ cảnh tài nguyên — 28/10/2026

Batch do người dùng yêu cầu; giữ các checkpoint và diff có trước, không commit/push/deploy.
MaintenancePage lọc danh sách theo tài nguyên, hiển thị ngữ cảnh và liên kết về hồ sơ giữ tham số URL của catalogue. maintenanceStatus, maintenanceSearch và job lưu trong URL, phục hồi khi reload hoặc Back; tái sử dụng cơ chế điền sẵn tài nguyên cho biểu mẫu.
ResourceDetailPage và ResourceCareView truyền ngữ cảnh qua liên kết; AppLayout đưa trợ lý maintenance vào trang để không che nội dung mobile. VI/EN thêm 4 khóa, tổng 4032 và manifest đồng bộ.
Gates: test:required PASS 91; lint 2 warning cũ, typecheck/build PASS. test_resource_profile_journey_ui.mjs mở rộng PASS hai lần: tài nguyên→bảo trì→điền sẵn→trở về→Back; bộ lọc/reload giữ công việc đã chọn, xóa lọc tài nguyên rồi Back, desktop/mobile và EN.
Reviewer phát hiện vòng trở về hồ sơ→bấm mở bảo trì làm mất bộ lọc/công việc. Đã giữ maintenanceStatus, maintenanceSearch và job qua returnParams, chỉ bỏ resource vì ID nằm trong path; thêm test vòng UI này và rerun PASS. Hồ sơ công việc đã chọn phải khớp resourceScope để không hiện việc của tài nguyên khác. Build cuối PASS; chưa có kết luận SHIP từ review lại.
Ảnh và bằng chứng: C:/Users/Admin/AppData/Local/Temp/lab-maintenance-context-20261028.
Giới hạn: browser dùng fixture cô lập, không ghi DB và không chạy lại backend integration; không chứng nhận dữ liệu vận hành thật.
Bước đề xuất tiếp theo: cảnh báo bản nháp bảo trì chưa lưu khi rời trang qua liên kết trở về mới; chưa triển khai trong batch này, chỉ bắt đầu khi người dùng yêu cầu.

## Hồ sơ tài nguyên và lịch sử — 28/10/2026

Batch tiếp theo do người dùng yêu cầu; giữ diff và bằng chứng care/workbench phía dưới, không commit/push/deploy.
ResourceDetailPage.tsx: header toàn chiều rộng, lịch sử tải khi mở tab và trình bày theo dòng thời gian với tham chiếu; liên kết chăm sóc/bảo trì chỉ hiện cho nhân viên, giữ feature flag. resource-dossier.css bổ sung bố cục mobile, motion và reduced-motion; AppLayout đưa trợ lý resources vào trang.
VI/EN thêm 4 khóa, tổng 4028 và manifest đồng bộ. Bổ sung test_resource_profile_journey_ui.mjs với script test:ui:resource-profile-journey, điều chỉnh selector test_resource_catalogue_ui.mjs; test_resource_dossier_ui.mjs cũ giữ nguyên HEAD.
Gates: test:required PASS 91; lint 2 warning cũ, typecheck/build PASS. Catalogue PASS 34 checks. Dossier fixture PASS desktop/mobile, CUSTOMER/nhân viên, tải lịch sử theo yêu cầu, 403/503 và retry, liên kết đúng đích, reduced-motion và EN.
Reviewer dossier_finish: SHIP, không vấn đề trọng yếu. Backend/API không đổi, không ghi DB và không chạy lại backend integration; fixture không thay thế bằng chứng dữ liệu vận hành thật.
Đối chiếu trước/sau: http://127.0.0.1:5195/; ảnh và bằng chứng tại C:/Users/Admin/AppData/Local/Temp/lab-resource-dossier-20261028.
Bước đề xuất tiếp theo: giữ ngữ cảnh lọc tài nguyên khi sang bảo trì và kiểm thử toàn luồng liên kết; chỉ bắt đầu khi người dùng yêu cầu batch tiếp.

## Giám sát và chăm sóc tài nguyên — 28/10/2026

Checkout C:/Projects/lab-resource-manager, branch codex/claude-qa-20261021, HEAD 6be59ff từ luồng khác; giữ thay đổi có trước, không commit/push/deploy.
ResourceCareView và resource-care-experience.css: danh sách chọn tài nguyên, hồ sơ chu kỳ chăm sóc, công việc liên quan; bố cục mobile đưa hồ sơ đã chọn lên trước. Nền tím/mint/peach, focus rõ và chuyển động mở thao tác có reduced-motion.
Phân biệt operationalStatus với hạn chăm sóc; chưa cấu hình không hiển thị tiến độ giả. Phòng đang dùng hiển thị số người/capacity; ghi rõ số liệu do nhân viên ghi nhận, không gọi là cảm biến trực tiếp.
MaintenancePage nhận liên kết đúng job; AppLayout đưa trợ lý monitoring vào trang để không che bộ lọc. Lỗi tải giữ bản nháp và khóa lệnh; hover/focus danh sách không đổi lựa chọn.
VI/EN thêm 8 khóa, tổng 4024 và manifest đồng bộ; package thêm test:ui:resource-care-experience dùng test_resource_care_experience_ui.mjs hiện có.
Frontend test:required PASS 91; lint 2 warning cũ, typecheck/build PASS. Browser fixture PASS 5 kịch bản: desktop 1440, mobile 390, EN, chưa cấu hình, phòng 3/10; kiểm tra lỗi/phục hồi giữ bản nháp, liên kết đúng công việc, không overflow/page error.
Reviewer phát hiện polling vô hiệu fieldset khi đang nhập; đã bỏ loading khỏi điều kiện khóa, chỉ khóa khi lỗi hoặc đang lưu. Rerun sau sửa PASS 5 fixture, exit 0; diff check PASS. Build cuối PASS trước thay đổi điều kiện boolean này.
Ảnh trước/sau và after-results.json: C:/Users/Admin/AppData/Local/Temp/lab-resource-care-20261028; đối chiếu http://127.0.0.1:5194/, ứng dụng source http://127.0.0.1:5173/ đang chạy.
Giới hạn: kiểm thử trình duyệt dùng API intercept cô lập, không ghi DB; chưa chạy lại backend integration trong batch này, không chứng nhận toàn hệ thống. Không thay đổi quyền hooks.
Bước đề xuất tiếp theo: nối trang chi tiết tài nguyên tới hồ sơ chăm sóc và bộ lọc liên quan; chỉ bắt đầu khi người dùng yêu cầu batch tiếp.

## Workbench sự cố và bảo trì — 28/10/2026

Checkout C:/Projects/lab-resource-manager, branch codex/claude-qa-20261021, HEAD f494790; không tự commit/push/deploy. Commit Audit từ luồng khác xuất hiện khi làm việc; diff workbench còn nguyên, chưa stage.
Phạm vi: IncidentManagementView, MaintenancePage, base/WorkbenchPath.tsx, operations-workbench.css; VI/EN + manifest thêm 11 khóa (4016 tổng), script/test_operations_workbench_ui.mjs, test_queue_pagination_ui.mjs.
Sự cố: queue ghi độ nghiêm trọng/trạng thái/người xử lý thật; hồ sơ chỉ rõ giai đoạn hiện tại và hành động kế tiếp; mobile đưa hồ sơ đã chọn trước queue.
Bảo trì: loại việc/khung giờ/giai đoạn rõ ràng, mở mục cập nhật tiến độ; hover/focus không đổi lựa chọn; hồ sơ hoàn tất vẫn đọc được khi bộ lọc việc mở loại nó khỏi queue.
Giữ impact review, bản nháp/i18n, reason guards, hồ sơ đóng chỉ đọc và hợp đồng chuẩn; path là giai đoạn hiện tại, không giả lịch sử. Bảo trì chỉ ghi người tạo, không bịa người phụ trách/SLA.
Đối chiếu PRODUCT/DESIGN: mở rộng ngôn ngữ tím/mint/peach hiện có; giữ nguyên DESIGN.md và .impeccable/design.json, không đổi token hay tạo báo cáo mới.
Frontend test:required lần cuối sau sửa giữ lựa chọn PASS 91, i18n 4016, lint 2 warning cũ, typecheck/build PASS.
Browser fixture lần cuối: 7 kịch bản PASS, 1440/390 VI/EN, motion/reduced motion, không overflow/page error; detail lỗi ẩn action cũ/có retry, CUSTOMER chỉ đọc; đổi khung giờ vô hiệu impact review nhưng giữ bản nháp.
PostgreSQL QA riêng 25439: queue 63 checks PASS (59 cũ + reason trống không mutation/có focus, scheduled→in_progress→completed lưu thật, operationalStatus tài nguyên không đổi).
Lần chạy đầu vướng native option ẩn; sửa harness chờ giá trị select rồi chạy đủ 63 PASS. Chỉ phục hồi 5 incident fixture QA đã biết với guard; không ghi/reset DB demo.
Ảnh trước/sau và after-results.json: C:/Users/Admin/AppData/Local/Temp/lab-operations-workbench-20261028; trang đối chiếu http://127.0.0.1:5193/ ghi rõ ảnh fixture.
Logs tại Temp: lab-workbench-required-final-20261028.log, lab-workbench-ui-final-20261028.log, lab-workbench-queue-20261028.log; evidence queue trong queue/results.json.
Reviewer workbench_finish_reviewer: SHIP, không vấn đề trọng yếu; detector [] trong phạm vi feature đã xét. Visual dùng API intercept, tách với kiểm thử PostgreSQL thật; không chứng nhận UI toàn hệ thống.
UI chính 5173 từ source hiện tại HTTP 200; API 8000 health ready HTTP 200. Đã dừng QA API 15015/Vite 15185/PostgreSQL, giữ dữ liệu QA; trang đối chiếu 5193 chỉ loopback còn chạy.
Giới hạn: drift sidecar có trước chưa sửa; chứng cứ fixture không thay thế dữ liệu vận hành thật; giữ chứng cứ kiểm thử chung cũ phía dưới.
Dừng tại batch này. Gợi ý tiếp theo, chỉ khi người dùng yêu cầu: nối giám sát chi tiết tài nguyên với sự cố/chăm sóc bằng dữ liệu thật, giữ trạng thái chưa có dữ liệu.

## Sửa lỗi và kiểm thử toàn hệ thống — 27/10/2026

Checkout C:/Projects/lab-resource-manager, branch codex/claude-qa-20261021,
HEAD e93cfe3. Giữ diff có trước; chưa commit/push/deploy. Đã sửa App.jsx giải
phóng request abort theo scope và xếp lại yêu cầu refresh đến trong khi đang đọc;
3 browser regression cùng phiên/đổi actor/queued refresh PASS. Audit source đầy
đủ đã được gom vào candidate Git index cùng locale/package/test dependencies;
export source snapshot độc lập build PASS (khắc phục missing AuditLogsPage).

Test rộng còn phát hiện và đã sửa: AccountAccessPanel thiếu activation/soft-remove
CUSTOMER cho STAFF theo FR-AUTH-07/ADR-034 (không thêm role/LAB controls);
NotificationCenter bỏ qua shared records gây đọc trùng; BookingOperationsView
unmount paginator khi loading làm mất keyboard focus. UI test harness cũ được
đồng bộ semantic selectors, 4-row home preview, zero-total pagination, bước
review trước create và fixture đáp ứng notice30phút. Không sửa business guard
để làm test xanh. Chỉ sửa fixture thời gian trong DB QA để mô phỏng thời gian trôi.

Gates cuối: frontend required91/91, backend required144/144 +lint PASS,
backend release integration25/25 suites (269 tests) PASS trên PostgreSQL16 riêng
127.0.0.1:25439. UI PostgreSQL: accounts45/calendar37/fulfillment15/payment-hold23/
support24/queue59 PASS; catalogue34 fixture, Audit26 read-only checks PASS.
Contrast22 contexts0finding, a11y21page-loads, landing-media20, nginx-media65
(48 GETs,8workers) PASS; panel staff1440/390 không overflow,2actions,0role-select.
Snapshot candidate chạy frontend required PASS và build lại sau sửa cuối PASS.
2 warning lint FE có trước còn nguyên; git diff --check PASS.

Không ghi vào DB demo qua các mutation tests: release/container riêng và guards
xác minh database/domain trước ghi. Smoke local dùng GET/auth; GET có thể lazy-expire
hold theo contract. Không test ngân hàng thật/SMTP thật/hardware/cloud provider;
VNPAY destination bị intercept, callback/SMTP dùng test fixtures có chứng cứ.
QA services tạm được dừng sau kiểm thử; dữ liệu QA giữ lại, không prune Docker.

Evidence tổng hợp: C:/Users/Admin/AppData/Local/Temp/lab-full-validation/results.json.
Logs: Temp/lab-full-release-20261027, lab-full-ui-integration, lab-full-ui-queue,
lab-full-frontend-final.log, lab-full-backend-required.log. Snapshot:
Temp/lab-fixed-index-20261027; patch hoàn chỉnh Temp/lab-audit-and-refresh-fix.patch.
Git index.lock rỗng xuất hiện lại không có git process: candidate cuối xuất bằng
GIT_INDEX_FILE riêng, không ép xóa lần nữa; trước commit cần giải quyết khóa và
stage phần diff cuối. Hướng kế: review/gom commit có thể build độc lập, sau đó
quay lại UI hội thoại hỗ trợ đang hoạt động và chi tiết thanh toán, có trước/sau.

## Vòng lặp #12: review toàn bộ diff + kế hoạch commit — 27/10/2026 (docs-only)

Đúng hướng kế tiếp vòng #11. Tổng hợp diff: 69 file tracked (+1.701/−12.113),
33 đường dẫn untracked. Gates chứng nhận TRÊN ĐÚNG CÂY NÀY: test:required
PASS (91 tests, i18n 3992 keys, lint 2 warning cũ, typecheck, build),
test:ui:contrast 22/22 · 0 finding, test:ui:a11y PASS 21 lượt, test:media 4/4.
Kết quả review nằm ở [COMMIT_PLAN_20261027.md](COMMIT_PLAN_20261027.md): đề
xuất 7 lô commit theo thứ tự (CSS global → spectrum/shell → catalogue →
bookings → payments/support/monitoring → audit → test+docs), danh sách
KHÔNG commit (4 file probe tạm, thư mục .codex/.impeccable/.qa, harness QA
22–23/10 chờ quyết định), rủi ro (locales gộp ở lô 7 nên lô trước có thể
chưa green riêng lẻ; package.json vs test:ui:a11y). KHÔNG tự commit — chờ
người dùng duyệt kế hoạch.

Vòng này docs-only (thêm COMMIT_PLAN_20261027.md), gates đã chạy chứng nhận
như trên. git diff --check PASS. Chưa commit/push/deploy.

Hướng kế tiếp: **dừng vòng lặp tự động ở đây cho tới khi người dùng duyệt** —
lô commit là quyết định của người dùng (quy tắc start-next-batch). Sau khi
duyệt: thực hiện commit theo lô đã duyệt; vòng cải tiến có thể tiếp tục với
các hướng còn lại (đã liệt kê trong COMMIT_PLAN và các checkpoint trước) hoặc
chuyển sang nhiệm vụ khác người dùng chỉ định.

## Vòng lặp #11: ẩn phân trang khi tổng = 0 — 27/10/2026

Nợ nhỏ từ vòng #3. QueuePagination (base component, dùng chung mọi queue) giờ
return null khi `total === 0` — empty state phía trên đã mang thông điệp,
thanh "0–0 trên 0 bản ghi" là noise; hooks vẫn chạy trước early-return nên
focus-management không đổi. Xác minh headless GET-only: incidents STAFF (0 bản
ghi) → 0 `.queue-pagination` + empty state hiện; home queue staff (5) → strip
"Hiển thị 1–4 trên 5"; bookings CUSTOMER (12) → strip "1–12 trên 12". Hợp đồng
queue pagination giữ nguyên: tổng đọc từ server summary, không suy từ độ dài
trang.

`test:ui:queue-pagination` KHÔNG chạy được vì hạ tầng: script assert cứng chỉ
cho phép QA runtime riêng (UI 15185 / API 15015 — "Only the dedicated queue
test API is allowed") với DB QA tách biệt, hiện không chạy; đây là drift hạ
tầng đã biết (nhóm test:ui:workspace), nằm ngoài test:required. Bù lại đã
verify trực tiếp 3 cấu hình (zero/data/pagination) bằng script cách ly như
trên. Khôi phục QA runtime riêng cho nhóm test này là việc cần người dùng
duyệt (runner tạo DB + chạy migration).

Kiểm chứng: test:required PASS (91 tests, i18n 3992 keys, lint 2 warning cũ,
typecheck, build). test:ui:contrast 22/22 PASS 0 finding. git diff --check
PASS. Chưa commit/push/deploy.

Giới hạn: chưa chạy test:ui:queue-pagination trên QA runtime riêng; trạng
thái loading đầu (total 0 tạm thời) ẩn strip rồi hiện lại khi dữ liệu về —
chấp nhận vì empty/loading state đang chiếm chỗ cùng vùng. Hướng kế tiếp vòng
#12: chốt lượt REVIEW TOÀN BỘ DIFF cho người dùng (10 vòng đã tích lũy thay
đổi đáng kể: UI overhaul + hoàn thiện + a11y + CLS + copy + media) — tổng hợp
danh sách file thay đổi theo nhóm, đối chiếu gates xanh, đề xuất chia commit
theo lô để người dùng duyệt; không tự commit.

## Vòng lặp #10: audit media/ảnh/video — 27/10/2026

Theo hướng kế tiếp vòng #9 (mảng người dùng nhắc rõ). Kết quả audit:
(1) Kích thước + thuộc tính runtime (headless, / và /resources): hero dùng
lab-workbench-hero-optimized.webp 67KB thực tải với srcSet 640w/1536w + sizes
+ width/height + fetchPriority=high + eager; catalogue thumbs Wikimedia width=
64 lazy; benefits-poster lazy 17KB; tổng media bytes khi mở landing ≈84KB;
video LAB-benefits-loop (928KB, faststart) KHÔNG tải khi mở trang — src chỉ
gắn khi điều kiện phát thỏa (visible + !reducedMotion + conserve), poster
dùng webp 17KB. Mọi thứ đang dùng đã tối ưu từ batch 18/10 — không tìm thấy
asset đang dùng còn nặng.
(2) Nguyên bản chưa tham chiếu (giữ theo chính sách keep-originals, chi phí
runtime = 0 vì src/assets không được bundle): lab-workbench-hero.webp 1.1MB,
ai-lab-command-center.webp 120KB (0 tham chiếu từ vòng #1), lab-overview-
photo.jpg 356KB (0 tham chiếu toàn repo, provenance Unsplash "not a
photograph of this LAB institution").
(3) Sửa một lỗi ship thật: public/media/poster.jpg (122.938 byte — bản gốc
của benefits-poster.webp) nằm trong public/ nên bị Vite copy vào MỌI bản build
dù 0 tham chiếu toàn repo (quét src/scripts/nginx/docs/dist). Đã chuyển thành
src/assets/benefits-poster-original.jpg.json sidecar ghi rõ xuất xứ; dist/media
giờ chỉ còn video (947KB) — mỗi deploy nhẹ đi 123KB.
(4) Gate delivery `media:smoke` không chạy được: cần Nginx container cách ly
cổng 25441 — image/container đã bị dọn trong batch dọn Docker cũ, rebuild
image QA nginx là batch riêng; không phải regression (video 928KB < 2MiB và
faststart đã được check file-level trong script, script fail chỉ ở khâu kết
nối server).

Kiểm chứng: npm run test:media PASS 4/4; test:required PASS (91 tests, i18n
3992 keys, lint 2 warning cũ, typecheck, build sau khi move). test:ui:contrast
22/22 PASS 0 finding. git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: không đo lại HTTP delivery nginx (206/416/cache) vì container không
còn — các check đó từng PASS 18/10 và cấu hình nginx không đổi; audit ở
viewport 1440, không đo throttle mạng thật; ảnh catalogue Wikimedia là remote
thumbnail (không thuộc kiểm soát build). Hướng kế tiếp vòng #11: nợ nhỏ đã
ghi ở vòng #3 — QueuePagination ẩn thanh "0–0 trên 0 bản ghi" khi tổng = 0
(rà test:ui:queue-pagination trước khi sửa); sau đó cân nhắc quay lại polish
Support chat khách hoặc chốt một lượt review toàn bộ diff để người dùng duyệt
commit theo lô.

## Vòng lặp #9: hiển thị khối Sử dụng 30 ngày (bước A) — 27/10/2026

Triển khai đề xuất đã xác minh của vòng #8: MonitoringDashboardPage (mode
operations — tab "Bảng điều khiển vận hành", ADMIN/LAB_STAFF) thêm section
`.monitor-utilization` trong aside hàng đợi, đọc trực tiếp khối
`dashboard.utilization` payload hiện có (không gọi API mới, không đổi hợp
đồng): scheduled/actual minutes (Intl theo locale) + 2 tỷ lệ % (maximumFraction
Digits 2), tiêu đề tham số {days} từ windowDays, source-note trung thực "So với
tổng dung lượng LAB trong {days} ngày · nguồn: dữ liệu hệ thống" — nhãn không
diễn giải hiệu suất. 6 key mới ui.monitor.utilization* VI/EN; dd tabular-nums,
sàn chữ 12px giữ nguyên; section ẩn khi payload không có utilization.

Kiểm chứng: headless GET-only — staff VI: "Sử dụng 30 ngày", 600 /
1.435 / 0,06% / 0,13% (định dạng số Việt đúng), source note đúng; admin EN:
"30-day usage", 600 / 1,435 / 0.06% / 0.13%; screenshot
Temp/lab-a11y/operations-utilization.png. test:required PASS (91 tests, i18n
3992 keys, lint 2 warning cũ, typecheck, build). test:ui:contrast 22/22 PASS
0 finding. git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: tỷ lệ phân mẫu trên tổng dung lượng toàn LAB nên giá trị nhỏ với dữ
liệu demo (600 phút kế hoạch); block chỉ đọc — không lọc/khoảng thời gian khác
(API chỉ trả cửa sổ 30 ngày cố định); verify qua dev server sau khi warm,
lượt đầu timeout là Vite re-transform + rate limit login xen loop, không phải
lỗi trang. Hướng kế tiếp vòng #10: theo yêu cầu ban đầu của người dùng (ảnh,
video, hiệu năng) — audit media delivery: kiểm tra kích thước/lazy/srcset của
ảnh hero + catalogue, xác minh video benefits chỉ gắn src khi phát (đã có),
tìm asset nặng chưa tối ưu; hoặc rà tiếp các nợ nhỏ đã ghi (QueuePagination
0-0 trên 0). Ưu tiên media vì là mảng người dùng nhắc rõ.

## Vòng lặp #8: xác minh dữ liệu no-show/utilization + đề xuất KPI — 27/10/2026 (docs-only)

Theo hướng kế tiếp vòng #7, giới hạn đọc-only như yêu cầu. Kết quả xác minh
(schema + service + live GET bằng staff, không ghi dữ liệu):
(1) `BookingOutcome { NO_SHOW }` và `UsageAction.NO_SHOW` tồn tại trong
schema — no-show là outcome do staff ghi nhận qua usage log, không phải
BookingStatus.
(2) Report 7/30 ngày (`/api/dashboard/report`, requireRole ADMIN/LAB_STAFF)
trả `summary.noShowCount` (cùng cancelledCount, endedSessionCount,
scheduledMinutes) và **đã được hiển thị** trong OperationsReport
(MonitoringDashboardPage, nhãn report.noShow) — demo hiện 0 vì chưa có ca
no-show thật; không tạo dữ liệu.
(3) `/api/dashboard?includeTelemetry=false` trả khối `utilization` 30 ngày
(windowDays, scheduledMinutes 600, actualUsageMinutes 1435,
scheduledUtilizationRate 0.06%, actualUtilizationRate 0.13%, source database)
— **chưa có đâu ở FE hiển thị khối này** (grep scheduledUtilizationRate = 0
kết quả).
(4) `UserBehaviorScore.noShowCount/lateCancelCount/...` là schema không có
route/service nào dùng — module dự phòng, giữ nguyên theo quy tắc optional
modules (quyết định RESTORE/RETIRE cần người dùng duyệt).

**Đề xuất (frontend-only, không đổi hợp đồng):** bước A — hiển thị khối "Sử
dụng 30 ngày" trong MonitoringDashboardPage (ADMIN/LAB_STAFF): scheduled/
actual minutes + 2 tỷ lệ %, nhãn nguồn database + cửa sổ 30 ngày, zero-state
trung thực (0.06% phản ánh demo thưa, không diễn giải thành hiệu suất kém;
actual > scheduled có thể xảy ra do check-in ngoài kế hoạch — nhãn phải nêu
cả hai phút tuyệt đối để tránh hiểu sai). Bước B không cần: noShowCount đã có
dt/dd trong report. Không làm chính sách phạt/treo quyền (UserBehaviorScore)
— cần ADR nghiệp vụ riêng. Sử dụng vòng kế tiếp để triển khai bước A nếu tiếp
tục (dữ liệu đã xác minh tồn tại, chỉ đọc thêm từ payload dashboard hiện có).

Vòng này docs-only, không đụng code — gates đã xanh tại checkpoint vòng #7
(test:required + contrast), không chạy lại vì không có thay đổi mã.
git diff --check PASS. Chưa commit/push/deploy.

Hướng kế tiếp vòng #9: triển khai bước A (khối utilization 30 ngày trong
MonitoringDashboardPage, VI/EN, verify headless) — rồi quay lại polishing
theo backlog: đồng bộ chuẩn vé BookingCheckout đã xong ở vòng #1; các vòng
tiếp theo có thể rà hiệu năng media/ảnh theo yêu cầu ban đầu của người dùng.

## Vòng lặp #7: rà câu chữ VI/EN các màn vừa nâng cấp — 27/10/2026

Theo hướng kế tiếp vòng #6. Trích 265 cặp key VI/EN đang dùng trong 8 file của
chuỗi thanh toán — hỗ trợ — lịch đặt (extract script tạm, đã dọn), đối chiếu
thủ công theo ngữ cảnh nghiệp vụ. Sửa 20 chuỗi: (a) dọn từ mượn "booking"
khỏi copy VI phía khách — 16 key (hủy/giữ/xác nhận hủy lịch đặt, mã hệ thống
tách khỏi mã lịch đặt để không trùng nhãn trong khối định danh, bộ lọc quy
trình lịch đặt, lịch sử quy trình đặt lịch, booking không còn liên kết…);
(b) `ui.loading_data_84c68bd5` VI bỏ chữ "thật" (văn dev, không phải copy
người dùng) → "Đang tải dữ liệu…"; (c) `ui.loading_audit_history`/`loading_
timeline` VI dùng từ Việt thay "audit/timeline"; (d) nút tạo khoản thu EN
"Request created" → "Create request" (động từ cho nút bấm, khớp VI "Tạo yêu
cầu"). Cập nhật 2 test e2e ngoài test:required theo copy mới:
test_batch4_calendar_e2e ("Hủy lịch đặt", "Xác nhận hủy lịch đặt") và
test_product_experience_e2e (regex loading thêm "Đang tải dữ liệu…?").

Kiểm chứng: i18n sync 3986 keys parity/parameters PASS. Headless VI: màn
Lịch đặt của tôi + hồ sơ mở — 0 từ mượn "booking", "Hủy lịch đặt", "Bộ lọc
quy trình lịch đặt", "MÃ HỆ THỐNG" (uppercase CSS — lần kiểm đầu tìm chữ
thường là nhầm của script, không phải lỗi render), payments 0 loanword.
test:required PASS (91 tests, i18n, lint 2 warning cũ, typecheck, build).
test:ui:contrast 22/22 PASS 0 finding. git diff --check PASS. Chưa
commit/push/deploy.

Giới hạn: chỉ rà 8 file của chuỗi được yêu cầu; các cụm "workflow" còn lại ở
màn staff/admin (ví dụ "Hoàn tất workflow" trong test batch5) nằm ngoài phạm vi
lượt này — nếu muốn thống nhất toàn hệ thống cần một batch riêng có đối chiếu
với test batch5/batch7. Không đụng meaning nghiệp vụ: giữ nguyên thuật toán
giữ chỗ/đối soát/hoàn tiền và các chuỗi cảnh báo QR thật. Hướng kế tiếp vòng
#8: đề xuất no-show/utilization KPI theo backlog mục 7 — đọc-only xác nhận dữ
liệu outcome NO_SHOW tồn tại trong API/report trước khi đề xuất hiển thị, không
tự thêm chính sách phạt.

## Vòng lặp #6: SEO/semantics trang public — 27/10/2026

Theo hướng kế tiếp vòng #5. Audit headless 6 trang public (/, /resources,
/schedule, /how-it-works, /login, /register): h1 đúng 1/trang, lang="vi", meta
description + OG theo prepareSeo, title riêng từng trang, 0 control vô danh —
sẵn sẵn tốt. Sửa 2 lỗi semantics thật ở /resources: (1) nhảy cấp heading
h1→h3 ("Khám phá phòng và thiết bị LAB") và h2→h4 (tiêu đề card) — đổi
PublicResourceCatalog: catalog-head h3→h2, card title h4→h3, detail title
h3→h2, section "Thông số ghi nhận" h4→h3; chuỗi cấp giờ 1,2,3×6,2,2 không skip
kể cả khi mở chi tiết. (2) Bảo toàn kích thước khi đổi tag: `.public-site
h2/h3` (landing, 36px/17px) thắng selector cũ cùng specificity — thêm guard
`.public-site .catalog-head h2` 27px, `.catalog-detail-heading h2` 29px
(mobile 23px), `.catalog-card-body h3` 18px; mở rộng `.resource-detail-section
:is(h3,h4)` để dossier workspace (h4) và public catalog (h3) dùng chung style
13px. Ghi nhận: img benefits-poster có alt="" là ĐÚNG WCAG (ảnh tĩnh thay
video chế độ reduced-motion, nội dung chương đã có chữ cạnh đó; video tương
ứng cũng aria-hidden) — rule audit đúng là "có thuộc tính alt", không phải
"alt khác rỗng" với ảnh trang trí; không đổi.

Kiểm chứng: re-audit 6 trang public — 0 skip, 0 img thiếu thuộc tính alt,
meta description đủ; kích thước giữ nguyên (27/29/18px, mobile 23px);
test:ui:catalogue PASS 34 checks (fixture cách ly). test:required PASS (91
tests, i18n, lint 2 warning cũ, typecheck, build). test:ui:contrast 22/22 PASS
0 finding. git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: audit ở viewport 1440 VI; SSR tĩnh của prepareSeo không đụng (robot
noindex mặc định là chủ đích — chỉ index khi có origin HTTPS thật và opt-in
theo DEPLOYMENT); heading audit chưa quét mọi trạng thái modal. Hướng kế tiếp
vòng #7: rà câu chữ VI/EN lệch ngữ cảnh (backlog mục 6) — ưu tiên các màn vừa
đổi (thanh toán, support, lịch đặt) đối chiếu cặp key VI/EN cùng ngữ cảnh
nghiệp vụ, không dịch máy; sau đó đề xuất no-show/utilization KPI theo backlog
mục 7 (đọc-only xác nhận dữ liệu trước).

## Vòng lặp #5: audit a11y control chỉ có icon — 27/10/2026

Theo hướng kế tiếp vòng #4. Audit động bằng headless Chrome (GET-only + chặn
mutation): quét mọi button/a[href]/[role=button] hiển thị thiếu accessible name
(text/aria-label/aria-labelledby/title/img[alt]/input value) trên 20 lượt
role×route desktop 1440 VI + 3 lượt CUSTOMER mobile 390 — KẾT QUẢ 0 VI PHẠM;
detector tự kiểm chứng trên từng trang (tiêm nút vô danh phải bị flag, nếu
không test fail) để loại trừ detector hỏng im lặng. Hệ a11y hiện có (focus
visible, aria-label từ các batch trước, nhãn rail/icon) đã bao phủ đủ control
chỉ có icon; không cần sửa code UI.

Đóng gói audit thành gate chạy lại được: frontend/test_a11y_icon_names.mjs +
npm run test:ui:a11y — 21 lượt tải trang (3 vai trò × 6 route desktop +
CUSTOMER × 3 mobile), assert 0 control vô danh + detector self-test mỗi trang,
retry điều hướng, không lưu token/PII. Gate chạy độc lập (không đưa vào
test:required để giữ thời gian required ổn định).

Kiểm chứng: test:ui:a11y PASS (21 page loads). test:required PASS (91 tests,
i18n, lint 2 warning cũ, typecheck, build). test:ui:contrast 22/22 PASS 0
finding. git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: audit quét trạng thái mặc định VI (không quét mọi modal mở/every
state/EN mobile); title tooltip không bắt buộc — aria-label là chuẩn a11y,
tooltip là tùy chọn UX. Hướng kế tiếp vòng #6: SEO/semantics trang public
(heading hierarchy 1 h1/trang, meta description, alt text ảnh public, lang
attribute, canonical/OG theo DEPLOYMENT hiện có) — chỉ đọc và sửa phía FE
public, không đụng SSR động.

## Vòng lặp #4: CLS authed — skeleton parity + bỏ waterfall chunk — 27/10/2026

Nợ Đợt 8 (CLS authed 0.198–0.656). Đo đúng công thức Đợt 8 (vite preview
production + CDP throttle 10Mbps + layout-shift observer có sources + token
injection, 1440×900): TRƯỚC — CUSTOMER 0.633, STAFF 0.4811, ADMIN 0.5015.
Chẩn đoán qua timeline chiều cao từng section: shift lớn nhất KHÔNG phải
skeleton→data của trends mà là swap Suspense fallback (24px) ↔ role View
(1244px) — chunk lazy StaffHome/AdminHome/CustomerHome tuy được preload cấp
module từ Đợt 8 nhưng vẫn xếp hàng sau index.js 425KB dưới throttle, resolve
~600–900ms và đẩy trends/notices/footer. Hai fix: (1) WorkspaceHome chuyển
role views từ React.lazy sang import tĩnh — 3 chunk này vốn luôn được preload
nên code-splitting không còn lợi thế thực, chỉ còn fallback swap gây shift;
Suspense quanh View bỏ theo. (2) WorkspaceTrends thêm TrendsSkeleton mirror
đúng chiều cao từng khối (metrics 44px, total, chart 160px, axis, details
summary) + HelpDisclosure render ở mọi trạng thái để reserved height ổn định.
Kèm hardening App.jsx loadData: chặn load song song cùng scope (guard
appDataController) và home-entry refresh chuyển silent (stale-while-revalidate,
không nhá loading skeleton khi quay lại trang chủ) — phòng shift remount.

SAU: CUSTOMER 0.0028, STAFF 0.0542, ADMIN 0.0039 — cả ba vai trò < 0.1 (mục
tiêu Đợt 8 đạt). Evidence Temp/lab-cls (cls-before/mid/after.json,
staff-home-after.png). Sanity headless: staff home 4 lane rows, trends loaded
(skeleton swap xong), 3 notices, không overflow, 0 pageerror. test:required
PASS (91 tests, i18n, lint 2 warning cũ, typecheck, build). test:ui:contrast
22/22 PASS 0 finding. git diff --check PASS. Preview 4173 đã tắt sau đo.
Chưa commit/push/deploy.

Giới hạn: CLS đo trên Chrome headless local, chưa phải thiết bị/mạng thật;
phần dư 0.0515 của STAFF là pagination strip xuất hiện khi lane queue tải xong
(~46px) — dưới ngưỡng, để nguyên (ẩn cần rà test:ui:queue-pagination); shift
0.0028 sớm là residual route-swap auth (Đợt 7, không đáng xử lý tiếp). Bundle
index.js tăng ~55KB raw do gộp 3 chunk (gzip tăng khiêm tốn, đổi lấy home ổn
định). Hướng kế tiếp vòng #5: a11y audit icon-only controls (aria-label +
tooltip toàn src, ưu tiên header/sidebar/assistant) rồi SEO/semantics trang
public.

## Vòng lặp #3: audit empty-state theo vai trò — 27/10/2026

Theo hướng kế tiếp vòng #2. Script audit headless (Temp/lab-empty-audit,
GET-only + chặn mutation) quét 17 lượt role×route (CUSTOMER/STAFF/ADMIN ×
overview/bookings/support/payments/notifications/incidents/maintenance/
materials/users/logs) thu text empty-state thật. Kết quả: dashboard (khách
"Chưa có buổi sử dụng sắp tới", admin "Chưa có sự cố nghiêm trọng…"),
maintenance (phân biệt no-match vs no-open + nút xoá lọc), support, payments
dossier — copy đã đúng ngữ cảnh. Sửa 2 chỗ: (1) IncidentManagementView khi
tổng server = 0 và bộ lọc ALL hiện thông điệp mới "Chưa có sự cố nào được ghi
nhận." + hint "sẽ xuất hiện khi nhân viên LAB ghi nhận" (key
ui.incident.noneRecorded/noneRecordedHint VI/EN) thay cho copy "khớp bộ lọc"
sai ngữ cảnh; trường hợp lọc OPEN/RESOLVED rỗng hoặc search không trùng giữ
copy cũ + hint. (2) Copy VI nhóm booking trống bỏ từ tiếng Anh "booking" →
"Lịch đặt trong nhóm này" (key no_bookings_in_this_group, EN giữ nguyên).

Kiểm chứng: verify-empty + verify-settled headless: STAFF và ADMIN incidents
hiện thông điệp mới đúng (queue STAFF chậm hơn — phải đọc sau 3,5s, đọc sớm
bắt được trạng thái loading, là hạn chế script), nhóm trống khách hiển thị
copy mới, notifications/materials có dữ liệu nên không có empty-state (không
tạo dữ liệu giả). test:required PASS (91 tests, i18n 3986 keys, lint 2 warning
cũ, typecheck, build). test:ui:contrast 22/22 PASS 0 finding. git diff --check
PASS. Chưa commit/push/deploy.

Giới hạn: "Không thể kết nối máy chủ" trên support STAFF trong audit là artifact
của route-guard chặn heartbeat POST (fault-injection có chủ ý), không phải lỗi
sản phẩm — không sửa. Điểm ghi nhận cho vòng sau: QueuePagination vẫn render
thanh "Hiển thị 0–0 trên 0 bản ghi" khi tổng = 0 (noise nhỏ, cân nhắc ẩn khi
total=0 — cần rà test:ui:queue-pagination trước). Hướng kế tiếp vòng #4:
CLS authed skeleton-height-parity (nợ Đợt 8 — CustomerHome/StaffHome/AdminHome
+ queue-panel; đo vite preview + CDP throttle 10Mbps với layout-shift observer,
mục tiêu CLS < 0.1), sau đó a11y icon-only controls.

## Vòng lặp #2: đồng bộ chuẩn vé Support workspace — 27/10/2026

User chỉnh nhịp vòng lặp: xong việc là chạy vòng mới ngay (automation cron 5
phút + chốt khóa Temp/lab-loop.lock chống chồng chéo; khóa stale >40 phút được
dọn). Vòng #2 theo hướng kế tiếp của vòng #1: đồng bộ ngôn ngữ vé cho Support
workspace (CSS-only trong support.css, không đụng luồng handoff/polling/presence
và form mutation): masthead gradient giống các màn vé, card Yêu cầu mới/Phiên
của tôi/Chat bo 19px với bóng vé, availability card đồng bộ viền, hover hàng
queue nhẹ (loại trừ is-selected/disabled), mobile thu masthead 26px.

Kiểm chứng: headless Chrome verify-support 6/6 PASS (masthead 25px + gradient,
request card 19px + border #dfdce8 + bóng, chat card 19px + bóng, không overflow,
0 pageerror, route chặn mọi mutation). test:required PASS (91 tests, i18n,
lint 2 warning cũ, typecheck, build). test:ui:contrast 22/22 PASS 0 finding.
git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: chỉ kiểm chứng chế độ CUSTOMER (demo không có phiên support của
khách để mở hội thoại thật); conversation header/composer trong hội thoại
hoạt động giữ style cũ — chỉ viền/masthead/hover thay đổi. ADMIN/STAFF dùng
cùng .support-page nên được masthead mới (chủ đích đồng bộ). Hướng kế tiếp
vòng #3: audit empty-state toàn vai trò bằng dữ liệu thật (support queue khách
trống, bookings nhóm trống, dashboard thiếu dữ liệu) và sửa chữ nghĩa sai ngữ
cảnh; nếu dữ liệu demo không đủ trống cho một màn nào thì ghi giới hạn thay vì
tạo dữ liệu.

## Vòng lặp cải tiến #1: dọn CSS chết + đồng bộ Checkout — 27/10/2026

User yêu cầu vòng lặp cải tiến liên tục (treo máy): mỗi vòng chọn một task nhỏ
kín, chạy gates, cập nhật file này và tự mở hướng kế tiếp; automation định kỳ
đã được thiết lập để duy trì vòng lặp. Vòng #1 gồm: (A) Xoá khối CSS chết
"── LOGIN SCREEN ──" trong global.css (163 dòng, 0 component dùng, theme tối
retired) — khối này chứa url() sai đường dẫn tới
assets/ai-lab-command-center.webp gây warning build "didn't resolve" tồn tại từ
nhiều đợt; giữ lại `.spin` và `@keyframes spin` (đang dùng thật ở
GuestQuickBookingPanel và animate-spin). Build giờ sạch warning. File webp +
provenance json giữ nguyên (không còn ai tham chiếu — ứng viên dọn khi được
duyệt). (B) Đồng bộ ngôn ngữ vé cho BookingCheckout (CSS-only trong payments.css):
masthead gradient + card vé 19px + separator nét đứt cho khu thanh toán; không
đổi DOM/API/logic redirect VNPAY.

Nghiên cứu nghiệp vụ (chỉ đề xuất, chưa triển khai): chuẩn core facility
(CASRAI, Lab Manager, BookitLab, Skedda) nhấn mạnh: no-show enforcement (flag,
grace period, treo quyền sau nhiều lần), huỷ trong cửa sổ rõ ràng 24–48h,
buffer/cleanup time giữa lịch, KPI utilization/no-show, reminder cá nhân hoá.
Hệ thống đã có: min notice (ADR-044), payment hold deadline cố định, reminder
BOOKING_UPCOMING, LAB policy giờ/duration. Ứng viên phù hợp hợp đồng: (1) hiển
thị nhãn "huỷ trước giờ bắt đầu" trên ticket — copy thuần, server vẫn là chuẩn;
(2) đếm no-show/útilization trong report nếu dữ liệu outcome NO_SHOW đã có —
phải đọc backend đọc-only trước; (3) thông báo "đã có nhắc lịch" trên ticket nếu
notification mapping tồn tại. Không tự thêm chính sách phạt hay buffer mới.

Kiểm chứng: build sạch warning (✓ built, 0 warning asset); headless Chrome
verify-checkout 5/5 PASS (masthead, geometry 19px/border/shadow, không overflow,
0 pageerror, route chặn mutation); test:required PASS (91 tests, i18n 3984 keys,
lint 2 warning cũ, typecheck, build); test:ui:contrast 22/22 PASS 0 finding.
Runtime 5173 đã tự dừng giữa phiên; khởi động lại bằng npm run dev chuẩn.
git diff --check PASS. Chưa commit/push/deploy.

Hướng kế tiếp của vòng lặp (thứ tự đề xuất, mỗi vòng CHỈ một): (1) đồng bộ
chuẩn vé + polish Support workspace (CustomerSupportChat khách, viền/ticket
ngôn ngữ chung); (2) audit empty-state toàn vai trò bằng dữ liệu thật, sửa chữ
nghĩa sai ngữ cảnh; (3) CLS authed skeleton-height-parity (nợ Đợt 8, đo bằng
vite preview + CDP throttle, mục tiêu <0.1); (4) a11y audit icon-only controls
(aria-label + tooltip); (5) SEO/semantics public pages (heading hierarchy, meta
description, alt text); (6) i18n rà câu chữ VI/EN lệch ngữ cảnh; (7) đề xuất
no-show/KPI sau khi đọc-only xác nhận dữ liệu. Sau mỗi vòng: ghi checkpoint mới
đầu file này theo format đã có (làm gì — kiểm chứng — giới hạn — hướng kế),
không xoá checkpoint cũ.

## Hoàn thiện chuỗi khách hàng: trạng thái nhận phòng, giữ chỗ, thanh toán — 27/10/2026

Thực hiện trọn 3 bước kế tiếp được duyệt, bám nghiệp vụ backend làm chuẩn.
(1) BookingAccessPanel: đọc `bookingFulfillmentService.bookingAccess` — lỗi 409
`BOOKING_INVALID_TRANSITION` chỉ xảy ra khi lịch CONFIRMED đã quá endAt (cửa sổ
tự nhận đóng) — giờ hiển thị cảnh báo vàng `ui.fulfillment.handoverWindowClosed`
(có bản dịch VI/EN, role="status", không nút Thử lại vì retry không thay đổi được
trạng thái server); lỗi khác vẫn giữ đỏ + retry, BOOKING_PAYMENT_REQUIRED vẫn
im lặng như cũ. (2) Nghiệm thu trực quan chip đếm ngược giữ chỗ bằng lịch thật:
tạo booking LOCAL-ROOM-01 27/10 08:00–09:00 qua API quote+create đúng contract
(quote 50.000₫ version 1), ticket tone payment hiện chip "Giữ chỗ còn mm:ss"
(role=timer) trôi sống 14:44→14:26→7:57 qua nhiều lần đọc; sau paymentDueAt GET
lazy-expiry tự chuyển CANCELLED và giải phóng khung giờ — đúng contract, không
thanh toán, không seed/reset. (3) Đồng bộ ngôn ngữ vé sang Thanh toán: CSS-only
trong payments.css — masthead gradient giống Lịch đặt của tôi, card hàng giao
dịch bo 19px với hover nhấc nhẹ, chip trạng thái bo 8px, số tiền tabular,
separator nét đứt trước hành động; không đổi DOM, API, quyền hay logic thanh
toán; áp cả ADMIN ledger (cùng section class).

Kiểm chứng: headless Chrome script Temp/lab-verify-access 7/7 PASS (chip live
"Giữ chỗ còn 7:57" + role timer; trạng thái hết cửa sổ: đúng 1 alert vàng có
thông điệp mới, 0 nút retry, 0 alert đỏ, 0 pageerror; chặn mọi mutation qua
route). test:required PASS (91 tests, i18n 3984 keys, lint 2 warning cũ,
typecheck, build). test:ui:contrast 22/22 PASS, 0 finding, 0 pageerror — bao gồm
route payments. Browser thật: Thanh toán của tôi 1440 — masthead mới, 16 giao
dịch dạng vé, không tràn ngang. Sau gate, lịch giữ chỗ QA đã CANCELLED bởi lazy
expiry (kiểm bằng GET). git diff --check PASS. Chưa commit/push/deploy.

Giới hạn: trạng thái truy cập phòng trong IAB khó chụp trực tiếp vì
document.hidden=true khiến panel hoãn tải 30s (quirk môi trường QA, không phải
lỗi app — verified bằng headless Chrome thật). Giao dịch thanh toán của lịch QA
vẫn "Chờ thanh toán" trong sổ cái cho tới khi hết hạn phiên giao dịch — đúng
nghiệp vụ payment (trạng thái giao dịch tách trạng thái booking). Masthead
Thanh toán áp cho cả ADMIN (chủ đích, đồng bộ hệ màu). Bước tiếp theo đề xuất:
đồng bộ chuẩn vé cho BookingCheckout (màn trả tiền khi vừa tạo lịch) và trang
hỗ trợ; rà một lượt các empty-state bằng dữ liệu trống để bảo đảm chữ nghĩa
đúng ngữ cảnh; sau đó có thể cân nhắc commit nhánh theo lô.

## Hoàn thiện Lịch đặt của tôi — 26/10/2026

Tiếp nối phần dở của phiên ChatGPT trước (CustomerBookingCard vừa tạo thì phiên
ngắt): view "Lịch đặt của tôi" cho CUSTOMER đã được kiểm chứng toàn bộ và vá
hoàn thiện. Thêm chip đếm ngược giữ chỗ sống (mm:ss, deadline cố định
min(paymentDueAt,startAt), ẩn khi hết hạn, không tuyên bố settlement) trên ticket
cần thanh toán, key `ui.mySchedule.paymentCountdown` VI/EN. Nâng mọi chữ dưới
12px trong my-schedule.css lên đúng sàn (ngày/tháng/năm vé, nhãn phí, hint nhóm
ưu tiên, filter mobile). Số tiền vé thêm white-space:nowrap hết lỗi "₫" rơi dòng
trên 390px. Vá 2 assertion drift trong test_ui_contrast.mjs do nav desktop giờ
ghim mở 240px (panel docked dùng data-nav-id; rail chỉ còn ở mobile): giữ nguyên
ý đồ kiểm 4 đích chính theo role, tách nhánh có/không rail-menu. Không đổi API,
RBAC, preflight, mutation hay dữ liệu.

Kiểm chứng: test:required PASS (91 tests, i18n 3983 keys parity VI/EN, lint,
typecheck, build production; build chạy lại sau CSS cuối PASS). test:ui:contrast
PASS 22/22 role-route, 0 finding tương phản, 0 pageerror (screenshots
Temp/lab-ui-review/after). Browser thật IAB Chrome: CUSTOMER VI 1440 — nhóm ưu
tiên 0/4/0, filter 11 lịch với tổng đúng, ticket 2 cột tone payment/ready/history,
chọn lịch mở hồ sơ 2 cột (441px/638px), hành động ticket đổi theo tone (Xem bàn
gioạ), Hủy booking + Lịch sử; EN chuyển đủ nhãn giữ hồ sơ; 390px một cột, nhóm
ưu tiên dọc, không overflow; mobile ticket phí 1 dòng sau fix. git diff --check
PASS. Không submit booking/thanh toán/seed/reset; chưa commit/push/deploy.

Giới hạn: chip đếm ngược chưa có bằng chứng live vì demo không còn lịch
PENDING_APPROVAL có paymentDueAt (logic trùng PaymentHoldNotice đã xác minh đợt
6); cần fixture khi có dữ liệu. Panel truy cập phòng trong hồ sơ vẫn hiện khối
lỗi đỏ + Thử lại cho lịch CONFIRMED quá cửa sổ check-in (hành vi có sẵn của
BookingAccessPanel + API, chưa sửa trong batch này). Quan sát Playwright IAB:
click locator hay timeout trên nút render lại, dùng CUA thay thế — chỉ ảnh hưởng
công cụ QA, không phải lỗi sản phẩm. Bước tiếp theo đề xuất: (1) trạng thái
truy cập phòng thành state rõ ràng "sẽ mở lúc …" thay khối lỗi đỏ; (2) đếm ngược
giữ chỗ cần fixture lịch chờ thanh toán để nghiệm thu trực quan; (3) đồng bộ
hoàn thiện các màn biểu mẫu còn lại (thanh toán, hồ sơ support) theo cùng chuẩn
ticket/vé.

## Chọn giờ và xác nhận — so sánh trước/sau 26/10/2026

BookingSlotPicker chuyển thành editor ngày/giờ + ticket tài nguyên/khung giờ/thao
tác cạnh nhau. Ngày gợi ý khác dùng disclosure; vẫn mở khi ngày hiện tại không có
giờ. QuickBookingModal rộng hai cột, có bước thông tin/xem lại và bản tóm tắt
thời gian + quote thật. Mobile xếp summary trước form, footer tiếp tục cố định.
Animation chọn ngày/chuyển bước có reduced-motion. Không đổi preflight, TTL60s,
quoteKey, payload hay mutation; giá lỗi/đang tải không dùng lại giá cũ. Shared
category art có CSS riêng để hoạt động khi vào thẳng calendar.

Ảnh cùng ROOM LOCAL-ROOM-06,27/10 08–09h,quote80.000đ trước/sau 3 màn: chọn giờ,
nhập thông tin,xem lại. Trang kéo so sánh ở http://127.0.0.1:5191 (local server);
file độc lập C:/Users/Admin/.codex/visualizations/2026/10/25/01a1724a-33a0-7f81-bcd7-3987aeda07de/booking-comparison/index.html.
Ảnh chụp runtime demo; tên/phone nhập kiểm thử, không gửi tạo booking. Server5191
chỉ phục vụ artifact, frontend5173/API8000 giữ nguyên.

Kiểm chứng: test:required PASS91 tests +3972 VI/EN keys +lint/typecheck/build;
2 warning lint và warning asset cũ còn nguyên. Build sau CSS cuối PASS.
Chrome thật1440/390: quote/preflight/review PASS, không pageerror/overflow;
VI→EN giữ draft, sửa hủy review, reduced-motion, Escape, time-first PASS.
Guard chặn business writes, không có lần gọi mutation bị chặn (chưa tạo lịch).
Comparison images/tab/slider PASS; git diff --check PASS. Logs/scripts tại
Temp/booking-redesign và Temp/booking-capture.mjs. Chưa kiểm thử submit/thanh toán
end-to-end trong batch này; chưa push/deploy. Đề xuất tiếp: Lịch đặt của tôi với
nhóm cần thanh toán/sắp sử dụng/đang mượn và hành động kế tiếp rõ ràng.

## Danh mục và hồ sơ tài nguyên — 26/10/2026

Theo yêu cầu tiếp tục đổi UI rõ rệt: ResourceManagementView browse có bố cục
bộ sưu tập, nhóm màu, cover mở chi tiết, giá và trạng thái rõ, phản hồi chọn.
ResourceCategoryArt cung cấp SVG minh họa 5 loại (không suy đoán category hoặc
thay ảnh thật bằng ảnh giả). ResourceDetailPage đặt gallery cạnh tên/giá/thao tác;
mobile thứ tự tên → gallery → giá/thao tác → nội dung. Gallery có thumbnail,
trước/sau và chuyển ảnh; chuyển section bằng click, không tự đổi khi hover/focus.
CSS resource-experience tách phạm vi browse/detail, reduced-motion được tôn trọng.
Gallery studio là opt-in; public/modal giữ hành vi cũ. API, giá, quyền, danh sách
chọn, context back/filter và luồng đặt lịch giữ nguyên.

Kiểm chứng: test:required PASS 91 tests, 3966 locale keys, typecheck/build;
2 warning lint cũ. test_resource_catalogue_ui PASS 34 checks (fixture cách ly):
3/2/1 cột, context, lỗi pricing/history, VI/EN, gallery trước/sau, hover không đổi
panel và reduced motion. Browser thật API local trên catalogue/detail ở
1440/768/390px + EN mobile: không overflow/pageerror; đã xem ảnh trước/sau.
Build sau chỉnh mobile cuối PASS; git diff --check PASS. Warning asset
ai-lab-command-center.webp có trước vẫn còn. Evidence tạm: Temp/catalog-final-*,
detail-final-*, catalog-contract, catalog-checks.log, catalog-final-build.log.
Không submit booking/thanh toán/seed/reset; chưa push/deploy.

Giới hạn: nhiều tài nguyên demo chưa có media; gallery nhiều ảnh kiểm chứng bằng
fixture, không khẳng định dữ liệu thật có đủ ảnh. Chưa cải tổ checkout. Bước kế
đề xuất: thiết kế bước chọn giờ và xác nhận đặt lịch thành flow liền mạch, có
bản tóm tắt tài nguyên/thời gian/chi phí và thao tác dễ tiếp cận trên mobile.
Người dùng yêu cầu mọi lần nâng cấp phải nêu kết quả, giới hạn và giải pháp kế tiếp.

## Refactor bố cục UI — 26/10/2026

Tiếp tục theo yêu cầu đầu tư mạnh UI, giữ diff có trước. CustomerHome đã chuyển
sang search studio có ảnh LAB runtime hiện có, 5 nhóm màu, gallery 4 tài nguyên,
cột lịch cá nhân; hướng dẫn thu vào disclosure. Ảnh lỗi có icon thay thế. Menu
desktop mặc định mở 240px, tôn trọng lựa chọn thu gọn đã lưu. Staff đưa queue lên
trước shift context; admin chia người dùng/tình trạng hệ thống thành hai cột.
Calendar chuyển datebar/date strip vào bước chọn giờ sau chọn tài nguyên; giữ
nhánh time-first, deep link, preflight và API. Không đổi backend hay schema.

Kiểm chứng: test:required PASS (91 tests, i18n 3962 keys, lint/typecheck/build;
2 warning lint có trước). Browser Chrome thật 12 màn PUBLIC/CUSTOMER/STAFF/ADMIN
ở 1440/390px: không overflow, không pageerror. Search giữ query; chọn/đổi resource,
EN calendar/home, ghim/thu menu + persistence, mobile Escape/focus PASS.
Đã xem ảnh trước/sau customer desktop và ảnh sau mobile, staff/admin desktop,
calendar bước 2. git diff --check PASS. Evidence tạm ngoài repo tại
C:/Users/Admin/AppData/Local/Temp/lab-refactor-review, lab-refactor-checks.log,
lab-refactor-interactions.mjs. Hai rule CSS cuối giữ màu overdue/in-use;
nhánh có lịch cá nhân thật chưa có fixture phù hợp trong phiên demo để chụp.

UI đang chạy localhost:5173, API8000. Chưa push/deploy. Không submit booking,
thanh toán hoặc reset/seed; API GET có thể lazy-expire hold theo contract.
Giới hạn: đây là refactor shell, trang chủ theo vai trò và bước chọn lịch;
chưa thay toàn bộ màn biểu mẫu nghiệp vụ. Bước tiếp theo khi được yêu cầu:
đồng bộ bố cục hồ sơ đặt lịch/chi tiết tài nguyên và kiểm tra các trạng thái có dữ liệu.

## Giao diện sáng đa sắc — 25/10/2026

User chọn hướng sáng, đa sắc tinh tế (tím–xanh ngọc–đào), yêu cầu đầu tư nền,
chữ, flow và chuyển động. Checkout C:/Projects/lab-resource-manager,
codex/claude-qa-20261021, HEAD c41b892; giữ toàn bộ diff có trước, chưa commit/push.

Đã thêm styles/spectrum.css qua main.jsx, scope lab-spectrum trên AppLayout và
PublicShell: nền nhiều lớp màu nhẹ, masthead, rail, typography, card, focus và
hover/press; arrival ngắn, hỗ trợ reduced motion. CustomerHome đưa finder từ
sidebar lên trước hướng dẫn, giữ query/category/caller thật; ba bước gọn hơn.
PublicLanding bỏ badge và dãy thống kê trang trí, rút gọn hero; câu chữ VI/EN
đồng bộ manifest. Catalogue dành hàng riêng cho search/filter. DESIGN.md ghi
hướng mới, thay quy tắc nền kem/một màu cũ. Không đổi API/schema/nghiệp vụ.

Kiểm chứng: test:required 91/91 PASS, i18n/lint/typecheck/build PASS (2 warning
lint có trước); build lại sau sửa cuối PASS. Browser thật 12 lượt PUBLIC +
CUSTOMER/STAFF/ADMIN ở1440/390px: không tràn ngang, không pageerror; tìm kiếm
giữ query, calendar chọn/đổi tài nguyên và chuyển EN PASS. Contrast CUSTOMER
375px trên overview/resources/bookings/profile: 0 finding,0 pageerror; cập nhật
assertion màu trong test_ui_contrast.mjs từ palette cũ sang màu được user chọn.
Detector source trả [] và git diff --check PASS. Evidence/logs ở
C:/Users/Admin/AppData/Local/Temp/lab-spectrum-review và lab-spectrum-*.log.

Runtime UI5173 được khởi động bằng dev-local.mjs, API8000 dùng stack hiện có.
Không submit booking/thanh toán hay seed/reset. Auth và các API đọc dùng demo
hiện có; không khẳng định DB bất biến vì GET tài nguyên có lazy expiry đã biết.
Giới hạn: đây là cải thiện shell/home/discovery/calendar/public, chưa thiết kế
lại từng màn quản trị/modal; chưa full E2E ghi hay chứng nhận WCAG toàn hệ thống.
Build còn cảnh báo ảnh ai-lab-command-center.webp từ CSS cũ. Bước tiếp theo:
user xem giao diện local và phản hồi trước khi mở thêm phạm vi redesign.

## Audit log UI — 23/10/2026

Bổ sung trang audit logs `#/workspace/audit-logs` (VI/EN): bộ lọc action/target
type/id/actor/from–to (giờ Việt Nam), phân trang server-side 20/trang, danh sách
event kèm before/after/metadata (ẩn theo quyền, metadata chỉ ADMIN đọc).
`AuditLogsView` + `pages/AuditLogsPage.tsx` + `styles/audit-workspace.css`.
Build output cho `AuditLogsPage` 7.18 kB gzip 2.50 kB.

FE test:required PASS (routes/auth/accounts/payments/chatgpt-bridge/calendar-
planner/planning-ui/media/i18n/lint/typecheck/build). QA browser thực tế: PASS
`frontend/test_audit_ui.mjs` (script `npm run test:ui:audit`) 26 assertion trên
stack sống UI 5173/API 8000 — ADMIN 20 dòng, `page=1&limit=20`, tổng phân trang
153 khớp server, mở/đóng chi tiết before/after/metadata, lọc action/targetId
server-side, biên ngày giờ Việt Nam (2026-01-01 → 2025-12-31T17:00:00.000Z),
page=2, VI/EN, LAB_STAFF 200 có dòng, CUSTOMER bị chặn 403 `FORBIDDEN` và
bị redirect khỏi route; không lỗi console. Evidence `.qa/evidence/audit/`
(screenshot + results.json, không raw token/PII).

## QA chỉ đọc23/10/2026 — chưa kết thúc toàn hệ thống

Checkout C:/Projects/lab-resource-manager, nhánh codex/claude-qa-20261021,
baseline c41b892. Chỉ QA/harness/report; không sửa mã/cấu hình/schema ứng dụng,
không commit/push/deploy. Hai ADMIN1440 do Claude chạy; Codex tiếp tục16ca khi
Claude dừng lỗi context. Tập cuối18/18 shell/navigation/VI–EN smoke PASS:
12desktop1440/1920 và6mobile390,128 lượt mở route desktop. Nav/role/locale/
overflow/errors gates và timestamp/hash từng JSON đã đối chiếu. Route smoke
không chứng minh chức năng từng màn, server RBAC/LAB scope hay nghiệp vụ ghi.

Đã xác nhận6FAIL mobile là lỗi harness: mở drawer rồi click header đang inert.
Probe thật đóng drawer thì locale hoạt động. Chỉ sửa qa_ui_matrix.mjs để đóng
menu trước toggle và không nuốt lỗi mở menu; node --check và6mobile rerun PASS.
Không sửa ứng dụng. Giữ cả JSON FAIL ban đầu. Audit logs không có key trong
route registry vẫn là candidate cần đối chiếu SRS338/ADR-022/entrypoint khác;
không coi bỏ expected nav là đã giải quyết yêu cầu hoặc tự phục hồi module.

Evidence/giới hạn: [QA_UI_MATRIX_20261022.md](QA_UI_MATRIX_20261022.md) và
C:/Users/Admin/.codex/lab-controller/qa-controller-readonly-20261023/final-results/coverage.json.
Tập ghép ghi runner/hash từng lượt; summary.json trong .qa hiện chỉ6mobile.
25backend suite là evidence22/10, chưa rerun. Functional reads chưa đủ;
live business writes vẫn BLOCKED đến khi xác minh backend+DB QA tách biệt thật.

Bổ sung functional reads: CUSTOMER VI1440/EN1920,10check/kịch bản PASS cho
nhóm catalogue/search/empty/reset/ROOM+LAB/sortcode, DOM khớp API. Guard chỉ
cho GET và auth activity của phiên hiện có; không gửi request ghi nghiệp vụ trực tiếp. Catalogue
không phân trang; queue pagination và các role/luồng khác chưa được chứng nhận.
Evidence bổ sung ở functional-resources/verified-coverage.json cùng thư mục trên.

Bổ sung audit API:13 assertion PASS có login/current role thật; ADMIN153 event,
staff148 event/2 LAB được phân, CUSTOMER403, anonymous401 tách riêng. Chưa có
fixture live staff không LAB hoặc ngoài LAB vì staff hiện được phân2/2 LAB;
Evidence audit-reads/result.json, không raw token/PII. Lượt06:00Z bổ sung18
assertion pagination API PASS: ADMIN100+53, staff100+48; không trùng ID, đúng
thứ tự/tổng, trang vượt cuối và validation400 đúng. Toàn tập staff khớp tập
ADMIN thuộc LAB được phân;5 event labId=null chỉ ADMIN đọc được. Evidence
audit-reads/pagination-result.json; UI audit PASS 26 assertion (xem mục trên),
queue pagination UI chưa có PASS riêng.
Đối chiếu source phát hiện GET resources/list/detail/schedule gọi lazy expiry,
có thể ghi cancellation/payment/reminder/usage/notification khi có hold quá hạn.
Chưa có snapshot DB trước/sau để quy tác động cho test; không kết luận DB không
đổi chỉ từ guard GET. Dừng probe resource mới trên demo, không cleanup/reset;
ResourceDTO mới source-review, chưa live privacy PASS. Xem Q-04 trong report.

Support GET đã review không dispatch/ghi presence:30 assertion metadata/list/
detail/auth scope PASS; ADMIN2 history, staff1, CUSTOMER0. ADMIN200 làm control
cho CUSTOMER404 khác chủ và staff404 conversation không được phân. Thêm11
assertion pagination/filter ADMIN PASS:2 trang1+1, CLOSED/CANCELLED và LAB khớp.
Evidence support-reads/result.json và pagination-filters-result.json; không lưu
chat body/PII. Chưa support UI, CUSTOMER populated history, WAITING/ACTIVE,
message cursor>100 hoặc presence/dispatch/writes PASS; không tạo conversation.

Claude8e58146c từng dừng thrashing04:00:59Z/empty compact04:26:14Z. Đã xác nhận
compact mới thành công06:30:41Z và gửi1 chỉ đạo QA ngắn, receipt d6ed1184 lúc
06:37:40Z; có Read/Bash tool results thật từ06:38:15Z, đang kiểm auth-session
theo qa-recovery-20261023-0630.md. Final07:27:18Z đã được Codex review:3 session
GET snapshot timestamp hợp lệ/không đổi qua4s và audit GET200, PASS giới hạn
1 ADMIN session; chưa timeout/activity/logout/all-role PASS. session-reads/
codex-review.json ghi hash/giới hạn. Có Q-05: một tool output tìm seed literal
đã in password fixture demo; không lặp giá trị, không tự reset/rotate/cleanup.
Follow-up sửa disclosure/gap UI stale và kế hoạch QA isolation đã chuẩn bị,
chưa gửi. Lượt08:07Z đã activate được đúng window131268 và xác minh fresh
URI/project/branch/title; blocker UI đã hết. Claude đang compact yêu cầu mới
của human về đề xuất UI/chức năng; không gửi chồng, lease đã release. Sau
final mới cần đối chiếu đề xuất với evidence, đặc biệt mobile FAIL là harness
đã sửa và6case PASS, không coi đó là product bug hoặc rerun18smoke.
QA25439 hiện không listen; lrm-qa-postgres đã exited từ22/10. Backend8000
đang chạy chưa được chứng minh là isolated QA. Runner release tạo DB/chạy
migration nên chưa thực thi. Evidence isolation-review/gate.json và
claude-progress-0807.json trong thư mục qa-controller-readonly-20261023.
Chưa hoàn tất coverage/phản biện/thống nhất phương án. CHƯA triển khai.


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

## UI design system & accessibility pass (2026-10-24)

Scope frontend only, verified by before/after screenshots (same viewport/route/script)
và detector cục bộ; không đụng backend/business logic.

- DESIGN.md (gốc repo) giờ là nguồn chân duy nhất: thế giới "The Lab Notebook"
  paper #fff9ee / ink #292636 / violet #6441d9, IBM Plex Sans/Mono; các bộ palette
  navy/teal S1+, steel-blue light-redesign và slate tối được đánh dấu retired.
- Sàn chữ 12px: mọi font-size 9/10/11px trong CSS được nâng lên 12px (rail 9px là
  trọng tâm); rail 72→84px. Token status text trong .workspace-shell chuyển sang
  mực AA (#92400e/#b91c1c/#047857) — test:ui:contrast 22/22 sạch.
- Danh mục tài nguyên: ô search + 4 chip khả dụng luôn hiện trên header; 5 select
  nâng cao nằm trong panel đóng. test:ui:catalogue cập nhật theo DOM mới (30/30);
  đồng thời vá 4 drift sẵn có (detail dạng tab, marker sample, /auth/activity).
- Dọn chết: xóa styles/lab-app-shell.css (0 class được dùng) + import; gỡ 22 token
  chết khỏi lab-design-system.css sau khi quét usage toàn src; recolor hết
  navy/teal còn sống trong lab-workspace.css về hệ violet/info; gỡ 4 package
  @fontsource chưa từng import.
- Audit logs: tiêu đề trang h2→h1; index.html title rút gọn "LAB Resource Manager".
- Số đo detector overlay 4 trang chính: 21/14/24/16 → 6/3/3/4 node lỗi.
- Còn lại (chưa làm): hợp nhất vật lý 46 file CSS (cần đợt riêng có visual
  regression); test:ui:workspace đang trỏ runtime 15181/#login-email (drift sẵn
  có, không nằm trong test:required).

### Đợt 3 (cùng ngày) — chú giải trạng thái + đếm khung giờ

- BookingStatusBadge tách config màu/nhãn ra components/bookingStatusTokens.ts
  (module thuần, không JSX). BookingStatusLegend mới dùng đúng nguồn đó nên
  badge và legend không thể lệch nhau; đặt trên trang Lịch đặt (customer +
  staff) dạng details đóng mặc định, đủ 7 trạng thái canonical tiếng Việt.
- Day strip calendar: "Còn giờ" (boolean) → "Còn {count} khung giờ" theo thời
  lượng đã chọn; key mới ui.planner.freeSlots + ui.bookings.statusLegend
  (vi/en, manifest đã sync lại, test i18n pass).
- Kiểm chứng: tsc sạch, lint 0 error (2 warning sẵn có), test:ui:catalogue
  30/30, test:calendar-planner 17/17, test:i18n pass sau i18n:sync.
  test:ui:calendar-planner cần FULFILLMENT_TEST_DATABASE_URL riêng (env, không
  phải lỗi UI); test:ui:workspace thuộc luồng QA main-checkout (selector/hash
  route cũ) — giữ nguyên, không sửa trên nhánh này.

### Đợt 4 (cùng ngày) — wizard tuần tự cho Tìm giờ trống

- BookingSlotPicker (entry resource-first) chuyển sang 2 bước tuần tự:
  bước 1 chọn tài nguyên → tự sang bước 2 (thời lượng + dải ngày + khung giờ
  trống + giờ tự chọn + CTA). Chip breadcrumb + nút "Đổi tài nguyên" quay lại
  bước 1. Deep-link ?resource=<uuid> vào thẳng bước 2 (giữ tương thích
  test_calendar_planner_ui). Entry time-first giữ nguyên.
  Một màn một quyết định — hết trạng thái 2 cột cạnh nhau.
- Key mới ui.planner.stepsLabel / ui.planner.changeResource (vi/en, manifest
  synced). Kiểm chứng: tsc sạch, lint 0 error, test:calendar-planner 17/17,
  test:i18n pass, test:ui:catalogue 30/30, deep-link + back-step probe OK.
  Lưu ý vận hành: hôm nay (T7) policy allowWeekend=false nên 0 khung giờ —
  next-days trỏ ngày làm việc gần nhất (đúng nghiệp vụ).

### Đợt 5 (cùng ngày) — hợp nhất lớp CSS global (visual lossless)

- 10 file CSS global (styles.css + 9 file trong src/styles/ mà main.jsx import)
  gộp thành 1 src/styles/global.css, thứ tự cascade bảo toàn bằng banner
  "was: <path>" đứng trước từng section; main.jsx còn 1 import app-level.
  Gỡ import trùng lab-workspace.css trong WorkspaceHome (Vite đã dedupe sẵn).
  46 → 37 file CSS. Các file per-component giữ nguyên (nhiều file dùng chung
  nên gộp sẽ trùng lặp — đã kiểm quyền sử dụng trước khi quyết định).
- Bằng chứng lossless: un-merge/re-merge tái lập được byte-đúng; 8 cặp ảnh
  chụp trước/sau gộp: 6 IDENTICAL tuyệt đối, customer_resources mean=0.0000,
  staff_operations chỉ lệch ở dòng "Dữ liệu cập nhật lúc HH:mm" (đồng hồ thực,
  không phải CSS); computed-style dump 2 route × 16 selector + 7 token design
  giống hệt 100%.
- docker-compose.local.yml: RATE_LIMIT_MAX=1000 cho backend local review —
  test:ui:contrast (22 lần login/1 IP) tự đốt hết hạn mức 180/phút mặc định
  khiến staff-home aggregate 429; sau nới, 22/22 pass, 0 contrast finding.
  Chỉ áp dụng runtime local, không ảnh hưởng production config.
- Cổng cuối: tsc sạch, lint 0 error, catalogue 30/30, i18n pass, vite build pass.

### Đợt 6 (2026-10-25) — audit tiếng Việt, số dòng/trang, bằng chứng giữ chỗ

- Audit logs: 18 action + 7 target type enum có nhãn VI/EN (key ui.audit.action.* /
  ui.audit.target.*); chip, filter select và loại đối tượng dùng nhãn, enum lạ
  fallback an toàn (tr() ném exception với key lạ — đã bắt, không vỡ trang).
  Thêm key cho CHATGPT_CONNECTION_AUTHORIZED có trong dữ liệu thật.
- QueuePagination có "Số dòng/trang" (20/50/100) tùy chọn; wire cho trang audit
  (pageSize state + limit qua listAuditEvents) và Lịch đặt & bàn giao
  (queuePageSize state qua useQueuePage — đổi size tự về trang 1).
- Giữ chỗ thanh toán: xác minh bằng booking thật qua wizard (LOCAL-ROOM-01):
  PaymentHoldNotice đếm ngược sống mm:ss, deadline tuyệt đối, copy "quá hạn tự
  hủy và mở khung giờ". Không phải code mới — component đã có, critique trước
  đó không với tới được trạng thái này; đợt này bổ bằng chứng + ảnh.
- Cổng: tsc sạch, lint 0 error (2 warning sẵn có), test:ui:audit 26/26,
  test:ui:catalogue 30/30, test:ui:contrast 22/22 (0 finding), i18n sync 3957 key.

### Đợt 7 (2026-10-25) — hiệu năng UI theo $impeccable optimize

- Đo trước/sau trên build production (vite preview + throttle 10Mbps CDP):
  CLS trang đăng nhập 0.227/0.285 (desktop/mobile) → 0.059/0.079 sau fix.
  FCP/LCP 256ms không đổi. Nguyên nhân CLS: .route-status-page (khối
  "đang xác minh phiên", width 720px) bị thay bằng .public-auth-page
  full-width sau khi resolve route (jump lúc ~521ms). Fix: placeholder
  full-width + min-height 540px + place-items center — swap chỉ đổi
  nội dung, khung giữ nguyên (public-landing.css).
- Đã đo và cố ý KHÔNG tối ưu tiếp: chunk lazy theo route sẵn tốt (11
  request, index.js 420KB + 6 chunk trang 25-54KB), CSS 466KB raw nén
  tốt, font 8 file font-display swap không gây shift. Đơn giá hiển thị
  2 nơi trên resource detail cùng nguồn "/giờ" — nhất quán, không refactor.
  Wizard time-first giữ layout 2 cột (duyệt ứng viên cần danh sách) —
  wizard 2 bước chỉ áp entry mặc định resource-first.
- Cổng: tsc sạch, lint 0 error, build production pass.

### Đợt 8 (2026-10-25) — hiệu năng trang đã đăng nhập

- Đo production (vite preview + CDP throttle 10Mbps, token sessionStorage
  lrm_token/lrm_user): FCP 256-876ms, LCP tới 2.8s (resources desktop, lazy
  chunk + ảnh) — mức ổn. CLS authed còn 0.198-0.656.
- Đã làm: preload 3 chunk role-home ngay khi app shell tải (bỏ waterfall
  chunk-chờ-data) + skeleton home reserve min-height 560px. CORS compose
  thêm origin preview 4173 (chỉ để đo production local).
- Chẩn đoán CLS authed (PerformanceObserver layout-shift): khối
  home-panel/notices bị đẩy khỏi viewport lúc dữ liệu đổ (~1.2s) — nội dung
  role-home render 2 pha (khung ngắn → section dữ liệu nở). Ảnh thẻ KHÔNG
  phải nguyên nhân (cover 172px + lazy + srcset sẵn).
- Nợ kỹ thuật ghi nhận: cần skeleton-height-parity cho CustomerHome/
  StaffHome/AdminHome + queue-panel để đưa CLS authed < 0.1. Công thức đo:
  inject sessionStorage token qua addInitScript, observer layout-shift có
  sources, throttle CDP 10Mbps, chạy trên vite preview.
