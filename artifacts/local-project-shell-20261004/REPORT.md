# Khung giao diện LAB dùng chung — báo cáo local

Kiểm tra: 2026-10-04; hoàn tất tài liệu: 2026-10-05 (Asia/Saigon).
Phạm vi là phần tiếp nối giao diện đã được người dùng yêu cầu,
ưu tiên web desktop. Branch `codex/lab-workspace-ui-draft`; HEAD giữ tại
`43b18328f80a1297c236b69e5496cc8afce86d72`. Chưa commit, push, merge hoặc triển khai
ra môi trường ngoài local.
Không mở Batch đánh số mới.

## Kết quả và phạm vi

Landing, đăng ký và các trang workspace có nhận diện LAB và footer dùng chung.
Header workspace hiển thị trang đang mở và vai trò của tài khoản hiện tại.
Footer đưa người dùng tới bước tiếp theo bằng các đường dẫn đang có trong ứng
dụng, cùng phần trợ giúp có thể mở bằng bàn phím. Header/footer tiếp tục hiện diện
trong cấu trúc trang khi mở form booking; footer nằm cuối nội dung trang.

Giao diện tiếp nối nền trắng, navy, IBM Plex và các đường phân cách của thiết kế
hiện có. Nội dung mới dùng catalog VI/EN chung. Ba tệp chuẩn `PRODUCT.md`,
`DESIGN.md` và `.impeccable/design.json` được giữ nguyên byte; không dựng thế giới
thiết kế mới hoặc sửa drift có trước. Xem [bàn giao thiết kế](DESIGN_HANDOFF.md).

| Thành phần tái sử dụng | Trách nhiệm |
| --- | --- |
| `components/PublicShell.tsx` | Bao landing và đăng ký bằng cùng header, điều khiển VI/EN, main và footer |
| `components/base/ProjectBrand.tsx` | Nhận diện LAB bằng biểu tượng Lucide hiện có và đường quay về đầu/trang chủ |
| `components/features/ProjectFooter.tsx` | Đích public hoặc theo vai trò; trợ giúp bằng `details/summary`; hồ sơ hoặc đăng nhập/đăng ký |
| `styles/project-shell.css` | Kiểu trình bày có phạm vi cho nhận diện, header và footer; focus, bố cục hẹp và reduced motion |

`App.jsx`, `AppLayout.tsx`, `Header.tsx` và `PublicLanding.tsx` nối các thành phần
với điều hướng hiện có. `PublicResourceCatalog.tsx` báo lúc việc đọc danh mục
kết thúc để căn phần đích; không thay dữ liệu danh mục. `main.jsx` nạp stylesheet;
hai catalog và manifest locale cập nhật tương ứng. API, phân quyền, schema và
workflow form hiện có được giữ nguyên.

## Môi trường và kiểm tra trực tiếp

UI: [local 15181](http://127.0.0.1:15181/). API:
[local 15005](http://127.0.0.1:15005/api). Database là `lab_resources_local_demo`
đã tồn tại. [API readiness](api-readiness.json) ghi `ok: true`, `database: ready`.
Không seed, reset, migration hoặc tạo hồ sơ giả. Đăng nhập/đăng xuất dùng cơ chế
xác thực thật và có thể ghi nhận phiên như trước.

| Vai trò demo đăng nhập thật | Nhãn header | Đích footer đã mở |
| --- | --- | --- |
| `ADMIN` | Quản trị viên | Hồ sơ cá nhân |
| `LAB_STAFF` | Cán bộ phòng lab | Kho vật tư, tài nguyên, lịch phòng và thiết bị |
| `LECTURER` | Giảng viên | Lớp và nhóm học phần |
| `STUDENT` | Sinh viên | Lịch đặt và tiến trình sử dụng của tôi |

Footer ADMIN/LAB_STAFF có lịch đặt/bàn giao và kho; LECTURER/STUDENT có lịch đặt
của tôi và lớp học phần. Trang đích đọc API local theo quyền hiện có. Danh sách
trống giữ trạng thái trống. Footer public mở phần Kiểm tra lịch và trang đăng ký.
Bản nháp tên đăng ký và tiêu đề booking được giữ khi đổi VI/EN. Form booking mở,
đóng và trình bày chính sách hiện có; không gửi booking hoặc đăng ký.

Menu public đóng bằng Escape và trả focus về nút mở. Menu tài khoản ở 360px
giữ thao tác trợ lý/làm mới tiếp cận được. Các view đã kiểm tra không tràn ngang
ở public 390px, workspace 360px và footer workspace 390px. Đây là kiểm tra hẹp
về khả năng dùng và bố cục, chưa phải tối ưu sâu mobile.

Bằng chứng chi tiết: [LIVE_CHECKS.md](LIVE_CHECKS.md),
[role-observations.json](role-observations.json).

## Ba sửa lỗi focus sau finish review

[Review ban đầu](FINISH_REVIEW.md) có `disposition: fix`. Sau một lượt sửa,
[verdict của cùng reviewer](FIX_VERDICT.md) chấm ba P2 sau là resolved và ghi
`disposition: ship`. Kết luận chỉ áp dụng cho ba lỗi được chấm.

| Lỗi được sửa | Bằng chứng xác nhận |
| --- | --- |
| Điều hướng public trễ lấy focus của người đang nhập | Với GET danh mục thật trì hoãn 8 giây, email vẫn giữ focus; vị trí trường trong viewport 336px → 336.05px. Khi chưa tương tác, phần Kiểm tra lịch vẫn nhận focus ở khoảng 100px dưới đầu viewport. Xem [slow-read-focus.json](slow-read-focus.json), [slow-read-alignment.json](slow-read-alignment.json). |
| Action trợ lý/làm mới mất nút nhận focus khi đóng popover | Ở 360px, mở trợ lý lần lazy load đầu bằng Enter rồi Escape trả về nút tài khoản; làm mới bằng Enter cũng trả về nút này và đóng popover. Xem [focus-fixes.json](focus-fixes.json). |
| Footer chọn lại tab đang mở không đưa focus vào nội dung | Quay về Tổng quan đang mở đưa focus tới `workspace-main`, `scrollY: 0`; Tab tiếp theo tới Cập nhật dữ liệu trong main. Xem [focus-fixes.json](focus-fixes.json). |

Gate đặt mật khẩu bắt buộc vẫn được kiểm tra trước điều hướng/focus workspace.
Phép thử trì hoãn dùng proxy loopback 15182/15183 chuyển tiếp API thật; các proxy
thử đã dừng. Không dùng API giả hoặc dữ liệu giả để tạo trạng thái thành công.

Reviewer mở lại 12 ảnh được chụp lại tại vị trí kiểm tra cũ sau sửa focus và không
thấy regression thị giác từ lượt sửa này. Đây là ảnh viewport với vùng header và
footer riêng; chụp full page bằng trình duyệt tích hợp không khả dụng.

| Nhóm ảnh | Tệp |
| --- | --- |
| Public | [desktop](public-desktop.png), [mobile](public-mobile.png), [footer desktop](public-footer-desktop.png), [footer mobile](public-footer-mobile.png) |
| Đăng ký | [desktop](register-desktop.png), [mobile](register-mobile.png) |
| Workspace | [staff desktop](staff-desktop.png), [staff mobile](staff-mobile.png), [lecturer desktop](lecturer-desktop.png) |
| Footer workspace | [desktop](workspace-footer-desktop.png), [mobile](workspace-footer-mobile.png), [English](workspace-footer-en.png) |

## Kiểm tra tự động và bảo toàn

Log [frontend-required.log](frontend-required.log) xác nhận `npm run test:required`
trong `frontend/` hoàn tất:

- 2.131 khóa VI/EN khớp tham số, integrity và backend projection; audit 82 module
  nguồn đang hoạt động đạt.
- 8 kiểm tra locale/network đạt, 0 thất bại.
- ESLint: 0 lỗi, 9 cảnh báo có trước.
- TypeScript và production build đạt.

[Impeccable detector](detector.json) chạy một lần trên các tệp shell, không có
finding. Đây là kiểm tra có phạm vi, không chứng nhận toàn ứng dụng.
[Backup](backup/README.md) lưu 11 tệp nguồn/tài liệu trước sửa, kèm
[manifest SHA256](backup/manifest.json); [validation](backup-validation.json) khớp
11/11. Backup này không bao gồm database. Các artifact và thay đổi có trước được
giữ lại. Diff backend, infra, schema/migration và Compose trống trong lượt này.

Tài liệu được append vào `docs/FRONTEND_GUIDELINE.md` và `docs/CURRENT_STATE.md`;
không tạo ADR hoặc thay kiến trúc. Không chạy `prisma db push`.

## Giới hạn và hướng tiếp theo

Chưa chạy lại toàn bộ suite nghiệp vụ có ghi dữ liệu; kiểm tra này không gửi
đăng ký, booking, phiếu kho hoặc đổi quyền. Chưa xác minh SMTP thật, giao dịch
thanh toán thật, upload ảnh/video, tải media bên ngoài hoặc vận chuyển. Không có
chứng nhận production, CI của thay đổi chưa push hoặc thiết bị thật.

Người dùng ưu tiên hoàn thiện bố cục và các luồng thao tác web desktop trước.
Sau phần UI là media ảnh/video, luồng đặt tài nguyên có phí/báo giá/thanh toán,
rồi mail. Đây
là hướng tiếp tục, chưa phải các tính năng được kiểm chứng trong lượt này và
không tự mở task/Batch kế tiếp. Nghiệp vụ tốt nghiệp bắt buộc, tính đúng đắn, quyền
và dữ liệu tiếp tục có ưu tiên cao hơn thanh toán cùng các phần mở rộng tùy chọn.
