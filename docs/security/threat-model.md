# MÔ HÌNH ĐE DỌA AN NINH & BẢO MẬT HỆ THỐNG (THREAT MODEL - SMART LAB V2)

## 1. Tổng Quan Bề Mặt Tấn Công (Attack Surfaces)

Hệ thống **Smart Lab Orchestration Platform** tiếp nhận dữ liệu từ 4 kênh chính:
1. **Web Frontend (REST API)**: Tương tác người dùng, đặt lịch, xác thực, điều phối.
2. **AI Copilot & Model Context Protocol (MCP)**: Lớp trung gian thực thi Tool Calling và RAG.
3. **IoT Sensor & Telemetry Gateway**: Luồng dữ liệu cảm biến nhiệt độ, công suất và trạng thái máy chủ.
4. **Cổng Tích Hợp Thứ Ba (Third-party Webhooks)**: VNPay IPN checksums, GHN Express logistics updates.

---

## 2. Ma Trận Đe Dọa & Cơ Chế Phòng Thủ (Threat Mitigation Matrix)

| Mã đe dọa | Mô tả Nguy cơ (Threat Vector) | Mức độ | Cơ chế Phòng thủ đã Triển khai (Mitigation) |
|---|---|---|---|
| **THREAT-01** | **Booking Race Condition / Double-booking**<br>Nhiều user đồng thời đặt cùng 1 thiết bị trong cùng mili-giây. | **CRITICAL** | 1. **PostgreSQL GiST Exclusion Constraint** (`bookings_no_active_overlap` trên `tsrange`).<br>2. **Pessimistic Row-level Locking** (`SELECT FOR UPDATE`).<br>3. Idempotency Key chống double-submit. |
| **THREAT-02** | **Privilege Escalation (Leo thang đặc quyền)**<br>Sinh viên tự gửi request duyệt đơn hoặc sửa lịch bảo trì. | **HIGH** | Phân quyền nghiêm ngặt **RBAC Middleware** (`requireRole("admin", "lab_staff")`) trên từng route mutation. |
| **THREAT-03** | **Prompt Injection & Tool Abuse**<br>Khai thác AI Copilot để ép hệ thống xóa thiết bị hoặc vô hiệu hóa policy. | **HIGH** | 1. Tách biệt Read Tools và Write Tools trong MCP Server.<br>2. Toàn bộ Write Tools bắt buộc có **Human-in-the-loop Confirmation**.<br>3. Zod Schema Sanitization trên từng tham số tool. |
| **THREAT-04** | **Brute-force Credential Attack**<br>Dò mật khẩu tài khoản quản trị viên. | **MEDIUM** | 1. Mã hóa mật khẩu **BCrypt với Salt Rounds = 12**.<br>2. **Express Rate Limit** (Tối đa 200 req/15 phút cho mỗi IP). |
| **THREAT-05** | **Telemetry Spoofing & Replay Attack**<br>Giả mạo số liệu cảm biến IoT để ép kích hoạt sự cố giả. | **MEDIUM** | 1. Phân loại rõ `DATA_SOURCE`: `REAL`, `SIMULATED`, `DERIVED`.<br>2. Lọc thống kê độ lệch chuẩn 3-$\sigma$ loại bỏ spike bất thường. |
| **THREAT-06** | **Payment Tampering & Webhook Forgery**<br>Giả mạo phản hồi giao dịch thanh toán. | **HIGH** | Xác thực chữ ký số **HMAC-SHA512** với Secret Key an toàn tuyệt đối trước khi cập nhật trạng thái đơn đặt. |
| **THREAT-07** | **XSS, CSRF & Header Vulnerabilities**<br>Chèn mã độc phía client. | **MEDIUM** | 1. Cấu hình **Helmet Middleware** chuẩn CSP và Security Headers.<br>2. CORS Origin Whitelist nghiêm ngặt. |

---

## 3. Quy Trình Kiểm Thử An Ninh Định Kỳ (Security Audit Protocol)
- **Automated Concurrency Stress Testing**: Chạy bộ test tại [concurrencyBenchmark.js](file:///c:/Users/Admin/OneDrive/Tài%20liệu/New%20project/lab-resource-manager/backend/src/research/concurrencyBenchmark.js) với 50-250 concurrent workers đảm bảo 0 duplicate allocations.
- **Input Sanitization Tests**: 100% API endpoints được bảo vệ bởi Zod Object Schemas.
