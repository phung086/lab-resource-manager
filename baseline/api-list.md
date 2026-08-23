# DANH MỤC API BASELINE HIỆN TẠI (API CATALOG - PHASE 0)

## 1. Authentication & Users
- `POST /auth/login` - Đăng nhập nhận JWT Token
- `POST /auth/register` - Đăng ký tài khoản tự phục vụ (chống race condition)
- `GET /auth/me` - Lấy thông tin user hiện tại
- `GET /users` - Danh sách người dùng (admin only)
- `POST /users` - Tạo người dùng (admin only)
- `PATCH /users/:id` - Cập nhật người dùng / Khóa tài khoản

## 2. Resources & Digital Twin
- `GET /resources` - Lấy danh sách thiết bị và thông số kỹ thuật
- `GET /resources/:id` - Chi tiết thiết bị
- `POST /resources` - Tạo mới thiết bị
- `PATCH /resources/:id` - Cập nhật thiết bị
- `DELETE /resources/:id` - Xóa thiết bị
- `GET /simulation/live-matrix` - Snapshot Telemetry thời gian thực & Heatmap coordinates của toàn bộ phòng lab

## 3. Booking & Concurrency Locking
- `GET /bookings` - Danh sách đơn đặt lịch
- `POST /bookings` - Tạo yêu cầu đặt lịch (Row-level lock `SELECT FOR UPDATE` + GiST check)
- `POST /bookings/:id/approve` - Duyệt đặt lịch (Lock dòng booking & re-check status)
- `POST /bookings/:id/reject` - Từ chối đặt lịch (Lock dòng booking)
- `POST /bookings/:id/check-out` - Bàn giao thiết bị
- `POST /bookings/:id/check-in` - Tiếp nhận hoàn trả
- `POST /bookings/:id/cancel` - Hủy đặt lịch
- `GET /bookings/:id/conflicts` - Trả về Conflict Object chi tiết
- `GET /bookings/:id/alternatives` - Tìm kiếm slot & thiết bị thay thế

## 4. Algorithms & Optimization
- `POST /optimization/priority-score` - Tính điểm ưu tiên động
- `POST /optimization/estimate-job` - Ước tính công suất, tiền điện EVN & phát thải CO2
- `GET /optimization/predictive-maintenance` - Phân tích sức khỏe thiết bị RUL & Anomaly
- `POST /simulation/solve-ga` - Chạy thuật toán Genetic Algorithm Multi-Objective Solver
- `POST /simulation/scenario/rush-hour` - Kịch bản Cơn sốt đồ án 40 SV
- `POST /simulation/scenario/thermal-runaway` - Kịch bản Quá nhiệt 92°C & Failover
- `POST /simulation/scenario/green-shift` - Kịch bản Tối ưu năng lượng Xanh EVN

## 5. Maintenance & Incidents
- `GET /maintenance` - Danh sách lịch bảo trì / hiệu chuẩn
- `POST /maintenance` - Tạo lịch bảo trì (Resource lock + conflict check trong transaction)
- `PATCH /maintenance/:id` - Cập nhật lịch bảo trì
- `GET /incidents` - Danh sách sự cố
- `POST /incidents` - Báo cáo sự cố (Auto-restrict khi critical)
- `PATCH /incidents/:id` - Cập nhật quy trình xử lý sự cố
- `POST /diagnostic/ai-diagnose` - AI Root Cause Analysis cho log crash
- `POST /diagnostic/auto-remediate` - Tự động tạo lịch bảo trì & đơn vận chuyển GHN

## 6. Training & Certification
- `GET /training/courses` - Danh mục khóa đào tạo an toàn
- `POST /training/courses` - Tạo khóa đào tạo
- `GET /training/requirements` - Ràng buộc chứng chỉ trên thiết bị
- `GET /training/certifications/me` - Danh sách chứng chỉ của tôi
- `POST /training/quiz-pass` - Nộp bài thi trắc nghiệm & tự động cấp chứng chỉ khi score >= 80%

## 7. Integrations (Payments, Logistics, Notifications, MCP)
- `POST /payments/create-url` - Tạo URL thanh toán VNPay
- `GET /payments/vnpay-return` - Xử lý callback & checksum IPN VNPay
- `POST /shipments` - Tạo đơn vận chuyển GHN Express
- `GET /notifications` - Danh sách thông báo
- `PATCH /notifications/:id/read` - Đánh dấu đã đọc
- `POST /assistant/chat` - Trợ lý AI hỏi đáp RAG
- `GET /metrics` - Prometheus metrics export
