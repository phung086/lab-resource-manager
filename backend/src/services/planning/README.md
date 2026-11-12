# Lập kế hoạch và hồ sơ sử dụng LAB

Đây là các chức năng quản lý bằng phần mềm. Checklist và giờ bàn giao/hoàn trả
do người dùng khai báo; không chứng minh tình trạng vật lý bằng cảm biến.

## Đọc code theo luồng

1. `frontend/src/pages/SelectionPage.tsx` là màn hình tài nguyên đã chọn hiện có.
   Tùy chọn đặt cùng LAB/cùng giờ dùng `SelectedBundle.tsx`, lấy lại tài nguyên
   từ API trước khi kiểm tra. Không có workspace planning riêng.
2. `frontend/src/components/features/planning/PlanBuilder.tsx` thu thập tài nguyên,
   thời gian, liên hệ; gọi API qua `frontend/src/services/planningApi.ts`.
3. `backend/src/routes/planning.js` xác thực, giới hạn truy vấn và chuyển cho service.
4. `bundleService.js` kiểm tra từng tài nguyên bằng `bookingService.preflightBooking`.
   Khi xác nhận, khóa tài khoản rồi các resource theo ID đã sắp xếp, tạo cả nhóm
   trong một transaction. Một tài nguyên lỗi thì toàn nhóm rollback.
5. `requestKey` + hash payload xử lý gửi lại sau lỗi mạng: cùng yêu cầu trả nhóm
   cũ; đổi nội dung với cùng khóa bị từ chối. Không tự tạo nhóm mới khi chưa rõ
   lần gửi trước đã thành công hay chưa.
   Payload được giữ trong sessionStorage theo tài khoản trước POST, cùng fence
   uncertain của màn hình đã chọn; chuyển màn hình không cho đặt riêng lại.

Hồ sơ mở trong lịch sử/chi tiết lịch (`BookingWorkflowTimeline`); theo dõi chỗ
trống ở form booking khi lỗi và quản lý trong danh sách booking. Policy nằm
trong AdminResourceConsole của quản trị tài nguyên (ADMIN), phân tích trong báo cáo vận hành. URL cũ
`/workspace/planning?booking=...` chuyển về `/workspace/bookings?booking=...`.

## Các module

| File | Trách nhiệm |
|---|---|
| `policyModel.js` | Validation, snapshot chính sách và khoảng chuẩn bị sau lịch |
| `policyService.js` | ADMIN xem trước tác động, cập nhật bằng revision, lưu audit |
| `bundleService.js` | Nhóm tối đa 5 tài nguyên cùng LAB/giờ; tìm giờ và tài nguyên thay thế |
| `dossierService.js` | Hồ sơ, timeline, sự cố, checklist theo bước và quyền hiện hành |
| `waitlistService.js` | Theo dõi một tài nguyên/khung giờ; phát thông báo khi preflight hợp lệ |
| `reportService.js` | Tổng hợp lịch được tạo trong kỳ, giờ bắt đầu và số liệu từng tài nguyên |

## Quy tắc cần giữ

- Nhóm đặt lịch tạo nguyên tử; thanh toán, hủy, bàn giao và hoàn trả vẫn theo
  từng lịch. Không gọi đây là một giao dịch thanh toán nhóm.
- Chính sách mới không tự hủy lịch cũ. Snapshot lưu lúc tạo/đổi lịch; thời gian
  chuẩn bị thuộc lịch trước. Mặc định 0 phút; khoảng thời gian là nửa mở.
- Giới hạn đặt trước tối thiểu vẫn 30 phút. Checklist không thay thế các
  kiểm tra thanh toán, thời gian, quyền và trạng thái trong luồng bàn giao.
- Checklist có ba bước HANDOVER, RETURN, INSPECTION. Mỗi bước được ghi một lần,
  kèm người ghi, thời gian và ghi chú. CUSTOMER chỉ ghi RETURN của mình.
  Mẫu hiện dùng chung; chưa có mẫu riêng theo loại thiết bị.
- Gợi ý giờ duyệt tuần tự tối đa 48 mốc cách nhau 30 phút, lấy tối đa 3 kết quả.
  Không có AI hay thuật toán tối ưu. Gợi ý thay thế chỉ dùng thông số đã khai
  báo khớp chính xác, cùng LAB/category/subtype và đủ capacity; người dùng tự chọn.
- Danh sách chờ không giữ chỗ và không tự đặt/thanh toán. Scheduler mỗi phút
  xét tối đa 20 mục, xoay vòng mục chưa đủ điều kiện; kiểm tra lại khi đặt thật.
- Báo cáo dùng thời điểm tạo lịch trong kỳ (tối đa 90 ngày/10.000 lịch).
  Không suy ra tỷ lệ công suất vật lý hoặc nhu cầu bị từ chối chưa lưu.

## Kiểm thử và giới hạn

`npm run test:planning` kiểm tra quy tắc thuần. Nhóm `planning` của
`npm run test:release:integration -- planning` dùng PostgreSQL riêng, kiểm tra
rollback, retry, quyền checklist, policy revision, buffer, waitlist và privacy.
Runner yêu cầu instance test sạch ở cổng 25439; không trỏ vào DB demo/chung.

Giao diện responsive, bản dịch VI/EN và in hồ sơ nằm ở các component cùng tên
và `frontend/src/styles/planning-workspace.css`. Cần kiểm tra trình duyệt thật
trước khi kết luận đạt chất lượng hình ảnh; build/typecheck không thay thế bước đó.
