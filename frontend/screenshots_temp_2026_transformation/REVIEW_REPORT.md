# 2026 Product Experience & End-to-End Workflow Transformation

Kết luận: **GO FOR HUMAN REVIEW**. Đây là bản local để duyệt trực quan, chưa commit/push và chưa thay thế trạng thái nghiệm thu trong tài liệu canonical. Không tạo Batch 9/10.

## A. Preflight và phạm vi

- Branch: `final-graduation-hardening`.
- HEAD bắt đầu/kết thúc: `0bb0d020f86d0ab93b783d637f60d9422e1ff4d2`; origin cùng branch khớp tại preflight.
- `origin/main`: `71da1683fc1c8bf842d2fc5b1313b45ac15499c1` tại preflight.
- Working tree đã dirty khi bắt đầu: 8 file Calendar/QuickBooking/CSS/test B4, tổng 425 additions/143 deletions; thư mục `screenshots_temp_calendar_review/` có sẵn.
- Đã giữ các sửa chữa tài nguyên rỗng, lựa chọn tài nguyên, loading/error/empty, chặn slot ảo và giao diện lịch ít nhiễu. Không reset, restore, stash hoặc thay thế phần việc kế thừa.
- Phạm vi thực hiện: frontend và điều chỉnh cách mở navigation mobile trong test. Backend, persistence, RBAC và hợp đồng nghiệp vụ giữ nguyên.

## B. Skill audit

Đã kiểm kê toàn bộ thư mục personal skills: `banner-design`, `brand`, `design`, `design-system`, `impeccable`, `slides`, `ui-styling`, `ui-ux-pro-max`; trong repository có `lab-project-compliance`. Không tìm thấy auto-skill/selector riêng.

Các SKILL.md phù hợp đã đọc: `lab-project-compliance`, `ui-ux-pro-max`, `impeccable`, `design`, `brand`, `design-system`, `ui-styling`. Banner/slides không phải đầu ra của công việc nên không áp dụng quy trình tạo banner/presentation. Đã đọc mandatory project documents và các báo cáo B4/B5/B7/B8 cùng schema để đối chiếu hợp đồng.

Đã áp dụng: ưu tiên công việc vận hành; semantic status; token hiện có; type hierarchy; focus/keyboard; không dùng màu để truyền đạt trạng thái duy nhất; loading/error/empty khác nhau; kiểm tra responsive và review độc lập. Chạy `impeccable context`, truy vấn design-system của ui-ux-pro-max, detector một lần và finish reviewer/documenter.

Đã bác bỏ gợi ý generic hero/amber/Fira từ bộ tìm kiếm vì không phù hợp hệ thống light-blue/Plus Jakarta Sans đang được chấp nhận. Không thêm thư viện giao diện, dependency, framework hay raster AI chỉ để trang trí. Ưu tiên chỉ dẫn của người dùng không sửa canonical docs trước duyệt, thay cho việc tạo DESIGN.md mới.

## C. Product audit và thay đổi

Trước thay đổi, điểm đến mặc định thiên về lịch/monitoring; các vai trò thiếu trang bắt đầu tập trung vào công việc của mình. Danh mục và lịch thiếu đường chuyển tiếp có giữ tài nguyên. Navigation mobile chiếm nhiều chỗ; thông báo thiên về số liệu; lỗi tải có thể giống trạng thái không có dữ liệu.

Đã thêm Home có tìm kiếm, tiến trình booking, lịch cần theo dõi, thông báo thật và lối tắt theo vai trò. Tìm kiếm ở Home truyền sang danh mục; chi tiết/danh mục mở lịch đã chọn tài nguyên; thành công đặt lịch dẫn sang booking của người dùng. Kết quả API đến chậm không được ghi đè kết quả mới hơn ở danh mục/lịch. Sau tạo booking, lịch được yêu cầu tải lại.

## D. Design system

Giữ nguyên palette: canvas `#f5f7fb`, surface trắng, primary blue `#2563eb`, text `#0f172a`/`#475569`; emerald/amber/red cho trạng thái. Font self-hosted Plus Jakarta Sans, IBM Plex Mono cho mã và thời gian. Radius nền tảng 6/8/12/16px; shadow mềm từ incumbent; motion 140/210/280ms và reduced-motion hiện có.

Mở rộng bằng `--space-section:24px`, `--control-height:44px`, bố cục Home/status strip/search/shortcuts và navigation mobile. `--space-control:12px` hiện chỉ khai báo. Hình nhận diện auth là SVG hình học đơn giản được viết trong source; không có ảnh raster mới cần provenance. Chi tiết đối chiếu ở `design-review.md`.

## E. Application shell

Thêm Home vào navigation; nhóm nhãn tùy vai trò; menu mobile thu gọn có `aria-expanded`/`aria-controls`, tự đóng khi đổi màn hình. Header có tên trang, thời gian Việt Nam cập nhật mỗi phút, refresh disabled khi đang tải và account menu đóng bằng Escape. Thêm skip link tới main và footer gọn có UTC+07:00. Không dùng route hiding thay authorization.

## F. Auth

Login/register dùng nhận diện nhất quán, hiện/ẩn mật khẩu, chặn gửi lặp trong khi đang xử lý, focus thông báo lỗi. Trường password 8–128 ký tự theo backend; tên/email/autocomplete phù hợp. Department dùng nhập thật, không đưa danh sách khoa giả; mã sinh viên/khoa optional theo contract. Public registration vẫn chỉ tạo STUDENT. Session bootstrap, logout và password flow hiện có tiếp tục được B2 kiểm tra; không thêm reset-password giả hoặc social login.

## G. STUDENT

Home hiển thị các booking của đúng người yêu cầu và dữ liệu thông báo hiện có. Danh mục hỗ trợ tìm kiếm và các bộ lọc hiện có, thêm availability hiện tại, sắp tên/mã, số kết quả. Card hiển thị vị trí, nhóm, lab, vận hành và effective approval. Phân biệt khả dụng hiện tại với khả dụng tại thời điểm tương lai. Chi tiết dẫn tới lịch đúng tài nguyên.

Giữ Week/Day/Month; zero-resource không sinh slot giả. Tính overlap Day/Month bằng khoảng thời gian đầy đủ, gồm booking băng qua ngày; tài nguyên không bookable bị chặn ở các thao tác slot tương ứng. Backend vẫn là nơi quyết định chính sách/conflict/quyền.

Booking có required title, chính sách giờ và nhắc UTC+7; trạng thái thành công lấy từ response thật và ở lại để người dùng đọc. Không tự giả định CONFIRMED. Có đường tới lịch đặt của tôi, error tải tài nguyên có retry; đóng modal bị khóa trong lúc submit. Notifications có all/unread, mark-read persisted, loading/error riêng và đường tới booking.

## H. LECTURER

Home dùng lời dẫn cho môn học/nghiên cứu, các booking cá nhân và cùng hành trình khám phá tài nguyên. Quyền lecturer được backend giữ nguyên; không cấp quyền staff/admin. B2/B3/B4/B5 xác nhận các vai trò và phạm vi tương ứng.

## I. LAB_STAFF

Home ưu tiên hàng đợi xử lý, số lượng theo trạng thái và theo dõi vận hành trong scope backend trả về. Trang operations giải thích duyệt → bàn giao → hoàn trả → hoàn tất, phân biệt lỗi tải với hàng đợi rỗng. B5 và kịch bản UI bổ sung xác nhận các transition riêng biệt, điều kiện trước/sau và lịch sử 5 sự kiện persisted. Incidents/monitoring giữ nguyên luồng thật; B6/B8 kiểm tra phạm vi, cảnh báo và dữ liệu thiếu. Không biến NO_DATA thành trạng thái tốt.

## J. ADMIN

Home tổng quan quản trị và lối tắt người dùng/phân công lab. Giữ user management, canonical roles, assignment, resource CRUD/status/retirement hiện có; không thay cấu trúc dữ liệu hoặc thêm quyền. B2/B3 và production B7 kiểm tra account/resource workflow; ảnh admin users/resources đã chụp.

## K. Payment / invoice

Phân loại: **optional legacy integration không đủ điều kiện đưa vào core runtime**. Đã kiểm tra `PaymentTransaction`, feature flags, app routes và payment service. Legacy service dùng mock store/fake success và tham chiếu các mô hình cũ; optional payment routes không được mount trong canonical app.

Không có integration/provider canonical được xác minh để hiển thị giao dịch thu tiền thật, phí thật hoặc hóa đơn đã thanh toán. Vì vậy không bật payment, không tạo QR giả, không thêm invoice UI suy diễn, không thêm provider, không tạo migration. Đây là phần optional chưa triển khai, không phải một giao dịch thanh toán thành công. Booking vẫn độc lập và không có trạng thái PAID/UNPAID trong BookingStatus.

## L. Responsive

Ma trận production: desktop 1440×1000, tablet 768×1024, mobile 390×844. `capture-results.json`: 49 captures, không có document horizontal overflow. Các calendar/table có internal scrolling chủ ý. Hộp thoại dùng viewport capture để kiểm tra cả nút đóng và footer actions. Mobile Home có status grid 2 cột; search/shortcuts xếp dọc; sidebar là Menu.

## M. Accessibility và giới hạn

Giữ native labels/inputs/buttons, thêm password accessible controls, nav state, skip link, loading status và error alert. Kịch bản bổ sung kiểm tra Shift+Tab vẫn ở trong operational dialog và Escape khôi phục focus về nút mở. Existing focus outline/reduced-motion được giữ. Không tuyên bố audit WCAG toàn diện: chưa kiểm tra bằng screen reader thực, chưa đo mọi tổ hợp màu, chưa kiểm tra thiết bị cảm ứng vật lý.

## N. Performance

So sánh main entry với baseline cung cấp trong brief; build cuối từ `build.log`. Đây là kích thước bundle, không phải đo tốc độ trên thiết bị thật.

| Asset | Baseline kB | Final kB | Thay đổi |
|---|---:|---:|---:|
| Main JS | 391.27 | 406.23 | +3.82% |
| Main JS gzip | 111.53 | 115.28 | +3.36% |
| CSS | 185.83 | 194.78 | +4.82% |
| CSS gzip | 39.36 | 40.99 | +4.14% |

Không thêm package; main entry tăng do Home/auth/discovery logic. Header không render lại từng giây; có bảo vệ race trong data fetch. Không tuyên bố bundle đã nhỏ hơn baseline.

## O. Verification

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Typecheck | PASS | typecheck.log |
| Lint | 0 errors, 12 warnings | lint.log; cùng số warning baseline local |
| Vite build | PASS | build.log |
| Diff whitespace | PASS | diff-check.log; chỉ cảnh báo CRLF→LF |
| B2 auth | PASS | b2-regression.log |
| B3 resources | PASS | b3-regression.log |
| B4 calendar/booking | PASS | b4-regression.log |
| B5 operations | PASS | b5-regression.log |
| B6 monitoring | PASS | b6-regression.log |
| B8 smart monitoring | PASS | b8-regression.log |
| B7 official production demo | PASS cả 10 bước | b7-regression.log, script B7 không sửa |
| Home/search/calendar continuity | PASS | capture.log, capture-results.json |
| Mobile booking + full staff lifecycle + focus | PASS | workflow-review.log |
| Nginx/API health/readiness | 200/200/200 | production-health.json |
| CORS | allow origin local; deny foreign origin 403 | production-health.json |
| Helmet | headers có mặt | production-health.json |
| Prisma production | 9 migrations, up to date | migration-status.log |

B2/B3 dùng database isolated riêng; B4/B5/B6/B8 dùng database isolated suffix `_transform_20260922_r2`. Runner chỉ migrate deploy vào test databases đã xác minh tên, không dùng db push. Production dùng compose project `lrm-transform-20260922`, database `lab_resources_transform_demo_20260922`, frontend port 18086. Không chạm database/container dự án đang có.

Các lần chạy trung gian được chẩn đoán: B4 đợi resource select chưa đủ, đã đổi test chờ option thật; console Python cần UTF-8; capture bị connection refused lúc rebuild/restart, đã chạy lại; capture lặp login chạm production rate limit, đã tái sử dụng session từng role trong kịch bản. Không giảm rate limit hoặc bỏ assertion nghiệp vụ. B7 chạy trước hai chỉnh nhỏ về semantics danh sách auth/nhãn CTA tài nguyên; build/capture và UI lifecycle bổ sung đã kiểm tra bản cuối.

## P. Screenshots và finish review

Tổng **72 PNG** trong thư mục này: 49 ảnh ma trận production, 7 ảnh workflow bổ sung và 16 ảnh từ regressions. Danh sách đầy đủ ở `screenshot-manifest.txt`. Các ảnh lịch sử của repository và thư mục calendar review kế thừa không bị ghi đè.

Nhóm chính: `login_*`, `register_*`, `student_home_*`, `student_search_*`, `resource_detail_*`, `calendar_week_*`, `calendar_day_*`, `calendar_month_*`, `booking_*`, `my_bookings_*`, `notifications_*`, `staff_home_*`, `staff_operations_*`, `monitoring_*`, `incidents_*`, `lecturer_home_desktop`, `admin_home_desktop`, `admin_users_desktop`, `admin_resources_desktop`. Bổ sung approval/handover/return/completion/history và booking success mobile.

Lỗi phát hiện và đã sửa trước chốt: identity auth bị xếp ngang ở mobile; khoảng cách heading/form quá chặt. Sửa bố cục dọc và spacing. Ảnh full-page modal cho kết quả gây hiểu nhầm do fixed layer và scroll position; đổi sang viewport capture và chụp lại sau animation/fonts, không dùng ảnh lỗi để kết luận.

Finish reviewer độc lập đã mở 21 ảnh và kết luận **SHIP for human visual review**, không yêu cầu sửa material defect. Review này là kiểm tra trực quan, không thay thế regression hoặc phê duyệt của người dùng. Detector chạy một lần; các cảnh báo utility selector cũ được đối chiếu với ảnh, không tự động xem là lỗi contrast thực tế.

Các quan sát còn lại để người dùng biết, không mở vòng polish mới:

1. Calendar và status tabs mobile cuộn ngang được nhưng chưa có lời gợi ý vuốt.
2. Bộ lọc danh mục mobile dài; resource đầu tiên nằm dưới fold.
3. Một số notification message persisted có ISO UTC thô dù metadata được format giờ Việt Nam.
4. Dấu required ở booking có thể xuống dòng riêng; footer thành công mobile hơi chật nhưng thao tác được.
5. 12 lint warnings, utility CSS/dead optional chunks và localization EN chưa toàn diện là tồn tại hiện hữu; không tuyên bố đã xử lý toàn bộ technical debt.

## Q. Git và bàn giao

22 tracked files modified (bao gồm 8 file sửa kế thừa); 2 source files mới. Chi tiết additions/deletions của tracked diff: 715/366 tại chốt. Đây là diff tổng so với HEAD, không phải toàn bộ đều được tạo ở lượt này.

| Nhóm | Files trong frontend/ |
|---|---|
| App/shell | src/App.jsx; src/components/AppLayout.tsx; Header.tsx; Sidebar.tsx |
| Auth | src/components/AuthLoginView.tsx; AuthRegisterView.tsx; **AuthIdentity.tsx (new)** |
| Home | **src/pages/WorkspaceHome.tsx (new)** |
| Discovery | src/components/ResourceManagementView.tsx; ResourceDetailsModal.tsx |
| Calendar/booking | src/components/QuickBookingModal.tsx; SmartCalendarView.tsx; calendar/CalendarToolbar.tsx; DaySchedule.tsx; MonthSchedule.tsx; WeekSchedule.tsx |
| Operations/notices | src/components/features/operations/BookingOperationsView.tsx; src/components/NotificationCenter.jsx |
| CSS | src/styles/light-redesign.css |
| Tests | test_batch3_resources_e2e.mjs; test_batch4_calendar_e2e.mjs; test_batch5_operations_e2e.mjs; test_batch6_monitoring_e2e.mjs; test_batch8_smart_monitoring_e2e.mjs |
| Temporary review evidence | screenshots_temp_2026_transformation/ (new); screenshots_temp_calendar_review/ (inherited, untouched) |

`git-inventory.txt`/`git-final-status.txt` chứa inventory máy tạo. Backend diff: **0**; Prisma/schema diff: **0**; migration diff: **0**; canonical docs diff: **0**; Docker config diff: **0**. Không thay canonical roles/status/categories, không tạo fake runtime telemetry/history/payment. Các dữ liệu Demo ghi trong database riêng là fixture kiểm thử được ghi rõ.

Preview local: http://127.0.0.1:18086. Tài khoản fixture: `demo.student@lab.test`, `demo.lecturer@lab.test`, `demo.staff@lab.test` với mật khẩu test `Batch7User!Passphrase`; admin `admin@demo.local` / `Batch7Admin!Passphrase`. Các tài khoản này chỉ dành cho database preview riêng. Không phải tài khoản production của người dùng.

Kết thúc ở ranh giới báo cáo/duyệt trực quan. Chưa commit. Chưa push. Chưa cập nhật CURRENT_STATE/DECISIONS/HANDOFF. Không bắt đầu batch hoặc vòng polish tiếp theo.
