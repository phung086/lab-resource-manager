# Batch 4 — Canonical Booking Calendar & Required Booking Workflow Report

Ngày hoàn thành & xác minh: 2026-09-20  
Trạng thái: **COMPLETE & VERIFIED — GO FOR BATCH 5 GATING**  
Nguồn sự thật: `PRODUCT.md`, `docs/srs.md`, `docs/convention.md`, `.agent/PROJECT_RULES.md`, `.agent/INSTRUCTOR_BASELINE.md`, `AGENTS.md`.

---

## A. Bối Cảnh & Mục Tiêu

Batch 4 hiện thực hóa module lịch đặt chỗ phòng thí nghiệm chuẩn tắc (Canonical Booking Calendar) và quy trình đặt chỗ bắt buộc (Required Booking Workflow), thay thế hoàn toàn các thành phần giả lập (mock data, mã đặt `BK-`, `setTimeout`, popup VietQR bắt buộc) bằng các API backend và ràng buộc cơ sở dữ liệu PostgreSQL thực tế.

---

## B. Báo Cáo 12 Hạng Mục Kiểm Tra & Ổn Định Hóa

### 1. Ngữ Nghĩa Trạng Thái Vận Hành (Operational Status Semantics)
- **Quy tắc chuẩn tắc**:
  - Các trạng thái vật lý chặn cứng (Hard-blocking Physical States): `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE` $\rightarrow$ Từ chối tạo lịch đặt với HTTP 400 `RESOURCE_UNAVAILABLE`.
  - Trạng thái `IN_USE` **không** được phép khóa cứng toàn bộ tài nguyên cho tương lai. Tính khả dụng theo lịch trình (scheduling availability) được xác định dựa trên khoảng thời gian thực tế (`[startAt, endAt)`).
- **Kiểm thử**: Đã bổ sung subtest 9 trong `test/batch4.booking-calendar.integration.test.js` chứng minh thiết bị `IN_USE` vẫn cho phép đặt ca trong tương lai không chồng lấn, và thiết bị `MAINTENANCE` từ chối đặt với mã `RESOURCE_UNAVAILABLE`.

### 2. Tính Trung Thực Về Quyền Riêng Tư Trên Lịch (Calendar Privacy Truthfulness)
- **Quy tắc chuẩn tắc**:
  - Không bao giờ bịa đặt trạng thái `status: "CONFIRMED"` cho người dùng khác khi ca đặt thực tế có thể là `PENDING_APPROVAL`, `CHECKED_OUT` hoặc `RETURNED`.
  - Đối với góc nhìn công khai / sinh viên khác: Sử dụng trường chiếu riêng `occupancy: "BOOKED"` và không gửi trường `status`. Hoàn toàn ẩn danh tính người đặt (`requestedBy`), tiêu đề riêng tư và ghi chú.
  - Đối với chủ sở hữu (`isMine: true`) và cán bộ quản lý (`LAB_STAFF`, `ADMIN`): Trả về trường `status` chuẩn tắc và đầy đủ thông tin vận hành.
- **Kiểm thử**: Đã bổ sung subtest 10 kiểm tra tính trung thực quyền riêng tư với cả 4 trạng thái `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`.

### 3. Phân Loại & Thực Thi Chính Sách Phòng Lab (LabPolicy Completeness)
Toàn bộ 8 trường trong `LabPolicy` được phân loại và xử lý minh bạch:

| Trường LabPolicy | Phân loại | Mô tả & Cách thức thực thi |
|---|---|---|
| `minBookingMinutes` | `ENFORCED_IN_BATCH4` | Chặn ca đặt ngắn hơn quy định (`400 POLICY_VIOLATION`) |
| `maxBookingMinutes` | `ENFORCED_IN_BATCH4` | Chặn ca đặt dài hơn quy định (`400 POLICY_VIOLATION`) |
| `maxAdvanceBookingDays` | `ENFORCED_IN_BATCH4` | Chặn ca đặt quá xa trong tương lai (`400 POLICY_VIOLATION`) |
| `allowWeekend` | `ENFORCED_IN_BATCH4` | Chặn ca đặt vào Thứ 7/Chủ Nhật nếu chính sách không cho phép (`400 POLICY_VIOLATION`) |
| `workDayStartHour` | `ENFORCED_IN_BATCH4` | Chặn ca đặt bắt đầu trước giờ mở cửa phòng lab (`400 POLICY_VIOLATION`) |
| `workDayEndHour` | `ENFORCED_IN_BATCH4` | Chặn ca đặt kết thúc sau giờ đóng cửa phòng lab (`400 POLICY_VIOLATION`) |
| `requiresApproval` | `ENFORCED_IN_BATCH4` | Thiết bị hoặc LabPolicy yêu cầu phê duyệt $\rightarrow$ tạo trạng thái `PENDING_APPROVAL`; ngược lại $\rightarrow$ `CONFIRMED` |
| `checkInGraceMinutes` | `NOT_APPLICABLE_TO_CREATION` | Quy định thời gian gia hạn check-in tại thời điểm diễn ra ca đặt; không áp dụng tại bước tạo lịch ban đầu |

Đã xác minh bằng 10 unit tests trong `test/batch4/bookingPolicy.test.js`.

### 4. Kiểm Thử Đồng Thời Thực Tế Trên PostgreSQL (Real Concurrency Integration Test)
- Thực hiện đua đồng thời thật thông qua `Promise.all` với 2 request cùng tài nguyên, cùng khoảng thời gian từ 2 tài khoản sinh viên khác nhau.
- **Kết quả**:
  - Đúng 1 HTTP 201 thành công.
  - Đúng 1 HTTP 409 `BOOKING_CONFLICT`.
  - Đúng 1 bản ghi đặt phòng duy nhất được lưu vào PostgreSQL.
- Đua 5 request đồng thời: Đúng 1 thắng, 4 request còn lại nhận HTTP 409 `BOOKING_CONFLICT`.
- Kiểm thử tại subtest 12 trong `test/batch4.booking-calendar.integration.test.js`.

### 5. Kiểm Thử Hồi Quy Khoảng Nửa Mở (Half-Open Interval Regression)
- Hai ca đặt kế tiếp nhau: 09:00–10:00 và 10:00–11:00 trên cùng tài nguyên.
- **Kết quả**: Cả hai ca đều thành công (HTTP 201), xác nhận quy tắc nửa mở `existing.startAt < requested.endAt AND existing.endAt > requested.startAt` hoạt động chính xác tuyệt đối.

---

## C. Bảng Kết Quả Kiểm Thử Hồi Quy Toàn Diện (Full Regression Gate)

| STT | Cổng kiểm thử (Test Gate) | Lệnh thực thi | Kết quả | Chi tiết |
|---|---|---|---|---|
| 1 | Backend Core Unit Tests | `npm run test:core` | **PASS** | 27/27 tests pass |
| 2 | Batch 1D Concurrency DB | `node --test test/bookingConcurrency.db.test.js` | **PASS** | 1/1 suite pass (PostgreSQL GiST) |
| 3 | Batch 1D Persistence DB | `node --test test/persistenceMigration.test.js` | **PASS** | 1/1 suite pass |
| 4 | Batch 1E Isolated Runtime | `node --test test/batch1e/integration.runtime.test.js` | **PASS** | 11/11 subtests pass |
| 5 | Batch 2 Auth / RBAC | `npm run test:batch2` | **PASS** | 10/10 subtests pass |
| 6 | Batch 3 Resource Management | `npm run test:batch3` | **PASS** | 9/9 subtests pass |
| 7 | Batch 4 Integration & Policy | `npm run test:batch4` | **PASS** | 22/22 tests pass (12 integration + 10 policy) |
| 8 | Frontend Production Build | `npm run build` | **PASS** | Vite bundle built in 2.90s, 0 errors |
| 9 | Runtime Health & Readiness | `GET /health`, `GET /health/ready` | **PASS** | HTTP 200, Helmet & CORS verified |
| 10 | Batch 4 Live E2E (Playwright) | `node test_batch4_calendar_e2e.mjs` | **PASS** | 100% pass across all roles & states |

---

## D. Thực Thi Kiểm Thử Giao Diện Đầu-Cuối (Batch 4 E2E Execution Evidence)

Kịch bản Playwright `frontend/test_batch4_calendar_e2e.mjs` được thực thi trực tiếp trên database cô lập `lab_resources_b4_booking_20260920t1745`:

1. **STUDENT Role**:
   - Chuyển đổi mượt mà giữa các chế độ xem Ngày (Day), Tuần (Week), Tháng (Month).
   - Đặt lịch thành công ca 3 tiếng ngày mai.
   - Tải lại trang (reload) $\rightarrow$ Dữ liệu lịch đặt vẫn tồn tại nguyên vẹn.
   - Kiểm tra tab "🕒 Lịch Đặt Của Tôi" $\rightarrow$ Hiển thị chính xác ca vừa đặt.
   - Hủy ca đặt thành công $\rightarrow$ Huy hiệu cập nhật sang "ĐÃ HỦY".
2. **LECTURER Role**: Đăng nhập và thực hiện quy trình đặt tài nguyên giảng dạy thành công.
3. **LAB_STAFF Role**: Kiểm tra hiển thị tài nguyên thuộc phòng lab được phân công và bảo vệ chặn truy cập phòng lab ngoài phạm vi.
4. **ADMIN Role**: Giám sát toàn cục tất cả các phòng lab và tài nguyên.
5. **Xử lý Xung đột (Conflict 409)**:
   - Thử đặt trùng ca đã có $\rightarrow$ Nhận mã lỗi 409 `BOOKING_CONFLICT` từ backend thật.
   - Modal hiển thị thông báo cảnh báo lỗi trực quan màu đỏ.
   - Form giữ nguyên giá trị người dùng đã nhập, không có thông báo thành công giả lập.
6. **Xử lý Bảo trì (Maintenance Block)**:
   - Thử đặt trùng khung giờ bảo trì $\rightarrow$ Backend trả về 409 `BOOKING_CONFLICT` (thông báo bảo trì).
   - Modal hiển thị lỗi chính xác.
7. **Kiểm tra Responsive Mobile**: Chế độ viewport di động (390x844) co giãn hoàn hảo, thanh toolbar và lưới lịch cuộn tự nhiên.

**Ảnh chụp màn hình minh chứng thực tế lưu tại**:
- `frontend/screenshots_batch4/student_calendar_desktop.png`
- `frontend/screenshots_batch4/conflict_state_modal.png`
- `frontend/screenshots_batch4/maintenance_conflict_modal.png`
- `frontend/screenshots_batch4/calendar_mobile.png`

---

## E. Tái Cấu Trúc Kiến Trúc Frontend (Architecture Review)

Đã tách module `SmartCalendarView.tsx` (từ 549 dòng) thành các component chuyên trách, giảm xuống còn **293 dòng**:
- `frontend/src/components/calendar/CalendarToolbar.tsx`: Điều hướng ngày, chọn chế độ xem (Day/Week/Month), chọn tài nguyên, nút đặt lịch mới.
- `frontend/src/components/calendar/DaySchedule.tsx`: Lưới lịch theo giờ trong ngày.
- `frontend/src/components/calendar/WeekSchedule.tsx`: Ma trận 7 ngày x 13 khung giờ.
- `frontend/src/components/calendar/MonthSchedule.tsx`: Lưới lịch 35 ô theo tháng.
- `frontend/src/components/calendar/CalendarEventCard.tsx`: Thẻ sự kiện có nhãn trạng thái và thông tin bảo mật.
- `frontend/src/components/BookingStatusBadge.tsx`: Huy hiệu hiển thị chuẩn tắc cho trạng thái ca đặt (`CONFIRMED`, `PENDING_APPROVAL`, `CHECKED_OUT`, `RETURNED`, `CANCELLED`, `REJECTED`, `COMPLETED`, `BOOKED`).

---

## F. Loại Bỏ Tính Năng Giả Lập & Nghiên Cứu (Mock / Fake / Payment Search)

- Không còn `Math.random`, `setTimeout`, mã `BK-`, giá tiền `150000`, chỉ số ảo `98%` trong luồng đặt lịch chuẩn tắc.
- Modal thanh toán VietQR và nút kích hoạt đã được cô lập hoàn toàn sau biến môi trường `VITE_ENABLE_RESEARCH_FEATURES === "true"`, không còn xuất hiện trong luồng nghiệp vụ thông thường.

---

## G. Nợ Kỹ Thuật Còn Lại (Remaining Debt)

1. Lưới lịch tuần hiện hiển thị cố định dải 08:00–20:00 (13 khung giờ tiêu chuẩn). Có thể mở rộng hiển thị động theo `workDayStartHour` và `workDayEndHour` của từng lab trong tương lai nếu có lab hoạt động ca đêm.
2. Thông báo thời gian thực (Websocket / SSE) cho lịch đặt khi có người khác vừa đặt xong đang ở mức HTTP polling khi người dùng chuyển tuần hoặc tải lại trang.

---

## H. Quyết Định Ranh Giới (Boundary Decision)

- **Batch 4: COMPLETE & VERIFIED.**
- **DỪNG TUYỆT ĐỐI (HARD STOP) — KHÔNG BẮT ĐẦU BATCH 5.** Chờ chỉ thị chính thức từ người dùng.
