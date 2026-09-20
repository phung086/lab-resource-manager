# Batch 4 & 4.1 — Canonical Booking Calendar & Required Booking Workflow Report

Ngày hoàn thành & xác minh: 2026-09-20  
Trạng thái: **COMPLETE & VERIFIED (BATCH 4.1 CORRECTNESS HOTFIX INCLUDED) — GO FOR BATCH 5 GATING**  
Nguồn sự thật: `PRODUCT.md`, `docs/srs.md`, `docs/convention.md`, `.agent/PROJECT_RULES.md`, `.agent/INSTRUCTOR_BASELINE.md`, `AGENTS.md`.

---

## A. Bối Cảnh & Mục Tiêu

Batch 4 và bản sửa lỗi chính xác Batch 4.1 hiện thực hóa module lịch đặt chỗ phòng thí nghiệm chuẩn tắc (Canonical Booking Calendar) và quy trình đặt chỗ bắt buộc (Required Booking Workflow), loại bỏ hoàn toàn các giả định sai lệch, contract lệch chuẩn và các thành phần giả lập (mock data, mã đặt `BK-`, `setTimeout` tự đóng modal, popup VietQR bắt buộc) bằng các API backend và ràng buộc cơ sở dữ liệu PostgreSQL thực tế.

---

## B. Báo Cáo 7 Hạng Mục Sửa Lỗi Chính Xác Batch 4.1 (Correctness Hotfixes)

### 1. Hợp đồng Slot Lịch → Modal Đặt Chỗ (Calendar Slot → Booking Modal Contract)
- **Vấn đề**: `SmartCalendarView` tạo payload `{ resourceId, startAt, endAt }` trong khi modal trước đó kỳ vọng `{ date, time, resourceId }`, dẫn đến việc click vào ô lịch trống có nguy cơ rơi về fallback ngày mai 09:00.
- **Khắc phục**:
  - Chuẩn hóa một hợp đồng duy nhất `{ resourceId, startAt, endAt }` dùng ISO string chuẩn tắc.
  - `QuickBookingModal` phân giải ngày (`date`), giờ bắt đầu (`startTime`), giờ kết thúc (`endTime`) từ `startAt`/`endAt` theo giờ Việt Nam (UTC+07:00).
  - Không fallback âm thầm về ngày mai khi nhận được slot hợp lệ.
  - Đã kiểm chứng qua E2E: click ô 15:00 trong DaySchedule điền chính xác 15:00–16:00 vào modal.

### 2. Yêu Cầu Phê Duyệt Hiệu Lực (Effective Approval Requirement)
- **Vấn đề**: Trạng thái phê duyệt trên frontend trước đó chỉ kiểm tra `currentResource.requiresApproval`, có thể hiển thị "Xác nhận tức thì" dù phòng lab có `labPolicy.requiresApproval = true` (khiến backend tạo `PENDING_APPROVAL`).
- **Khắc phục**:
  - Backend (`resourceService.js`) tự động nạp `labPolicy` của laboratory và tính toán trường chuẩn tắc:
    `effectiveRequiresApproval = Boolean(resource.requiresApproval || laboratory.labPolicy?.requiresApproval)`
  - Serializer xuất trường này trong cả danh sách và chi tiết tài nguyên.
  - Frontend hiển thị huy hiệu "Cần duyệt" vs "Xác nhận tức thì" dựa trên `effectiveRequiresApproval`.
  - Kiểm thử: `resource.requiresApproval = false` nhưng `labPolicy.requiresApproval = true` hiển thị "Cần duyệt" và lưu trạng thái `PENDING_APPROVAL` (Subtest 14 trong integration test & Step 5B trong Playwright E2E).

### 3. Loại Bỏ Tuyên Bố Chính Sách Cứng (Remove Hardcoded Policy Claim)
- **Vấn đề**: `QuickBookingModal` trước đây chứa dòng chữ cứng: *"Thời gian đặt tối thiểu 30 phút, tối đa 8 tiếng/lần. Vui lòng đặt trước ít nhất 1 giờ."*, điều này không đúng với các lab có chính sách khác nhau.
- **Khắc phục**:
  - Hiển thị động theo chính sách thực tế từ backend: `currentPolicy.minBookingMinutes`, `currentPolicy.maxBookingMinutes / 60`, `workDayStartHour`, `workDayEndHour`, `allowWeekend`.
  - Nếu tài nguyên chưa có thông tin chính sách, hiển thị thông điệp trung thực: *"Thời gian đặt phải tuân thủ chính sách quy định của phòng thí nghiệm."*
  - Tuyệt đối không hardcode con số giả định.

### 4. Hợp Đồng Múi Giờ Việt Nam (Timezone Contract - Asia/Ho_Chi_Minh UTC+07:00)
- **Vấn đề**: Xử lý ngày giờ bằng `Date#getHours()`, `toISOString().split("T")[0]` phụ thuộc vào múi giờ của máy chủ/trình duyệt cục bộ.
- **Khắc phục**:
  - Định nghĩa múi giờ chuẩn tắc duy nhất của hệ thống: `Asia/Ho_Chi_Minh` (UTC+07:00, không DST).
  - Backend: `availabilityService.js` triển khai `getVietnamTimeParts(date)` độc lập với múi giờ máy chủ (`process.env.TZ`), tính toán chính xác Thứ/Ngày/Giờ/Phút cho các ràng buộc `allowWeekend`, `workDayStartHour`, `workDayEndHour`.
  - Frontend: Xây dựng module tiện ích `frontend/src/utils/timezone.ts` (`toVietnamDateString`, `toVietnamTimeString`, `toVietnamHour`, `vietnamTimeToIso`, `getVietnamTomorrowDateString`).
  - Đã bổ sung unit test chứng minh: UTC 01:00 = 08:00 VN; Thứ Sáu 22:00 UTC = Thứ Bảy 05:00 VN (bị chặn nếu không cho phép cuối tuần); Chủ Nhật 23:00 UTC = Thứ Hai 06:00 VN (không phải cuối tuần).

### 5. Ràng Buộc Phạm Vi Truy Vấn Lịch (Calendar Range Validation)
- **Vấn đề**: `GET /api/calendar/events` có nguy cơ bị khai thác với khoảng thời gian quá lớn (vài năm).
- **Khắc phục**:
  - Kiểm tra tính hợp lệ của timestamp `start` và `end`.
  - Bắt buộc `start < end`.
  - Giới hạn cứng tối đa: **180 ngày** (`MAX_RANGE_DAYS = 180`).
  - Trả về HTTP 400 `VALIDATION_ERROR` nếu vi phạm.
  - Đã kiểm chứng qua Subtest 13 trong `batch4.booking-calendar.integration.test.js`.

### 6. Trải Nghiệm Thành Công Trung Thực — Không Tự Động Đóng Bằng Timer (No setTimeout Auto-Close)
- **Vấn đề**: Modal sau khi đặt lịch thành công vẫn có một timer tự đóng sau 1.6 giây, làm giảm khả năng tiếp cận và không cho người dùng kịp đọc trạng thái thực tế (`CONFIRMED` hay `PENDING_APPROVAL`).
- **Khắc phục**:
  - Loại bỏ hoàn toàn `setTimeout` đóng modal.
  - Giữ nguyên trạng thái thành công với thông tin đầy đủ: trạng thái thực tế, tài nguyên, thời gian (VN), mã ca đặt.
  - Cung cấp nút bấm "Hoàn tất" (`#booking-success-close-btn`) rõ ràng để người dùng chủ động đóng modal.

### 7. Độ Chính Xác Biên Thời Gian Chính Sách (Policy Duration Precision)
- **Vấn đề**: `checkLabPolicyCompliance` trước đó dùng `Math.round(...)` khi tính số phút, có thể khiến khoảng thời gian 14m31s bị làm tròn lên 15m và thỏa mãn điều kiện tối thiểu 15 phút.
- **Khắc phục**:
  - Tính chính xác thời lượng: `(end.getTime() - start.getTime()) / 60_000` không làm tròn.
  - So sánh trực tiếp với `minBookingMinutes` và `maxBookingMinutes`.
  - Đã kiểm chứng: 14m31s thất bại trước mốc 15 phút; 240m01s thất bại trước mốc 240 phút.

---

## C. Báo Cáo Các Hạng Mục Kiểm Tra Nền Tảng Batch 4

### 1. Ngữ Nghĩa Trạng Thái Vận Hành (Operational Status Semantics)
- Trạng thái chặn cứng: `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE` $\rightarrow$ Chặn đặt lịch với HTTP 400 `RESOURCE_UNAVAILABLE`.
- Trạng thái `IN_USE`: Không chặn toàn cục trong tương lai; tính khả dụng phụ thuộc vào khoảng thời gian cụ thể `[startAt, endAt)`.

### 2. Tính Trung Thực Quyền Riêng Tư Trên Lịch
- Góc nhìn công khai/sinh viên khác: hiển thị `occupancy: "BOOKED"`, tiêu đề "Đã đặt", không hiển thị trường `status`, không lộ danh tính người đặt (`requestedBy`).
- Chủ ca đặt (`isMine: true`) và cán bộ (`LAB_STAFF`, `ADMIN`): xem trạng thái thực tế và chi tiết vận hành.

### 3. Concurrency Thực Tế Trên PostgreSQL (GiST Constraint)
- 2 request đồng thời: đúng 1 thắng (201), đúng 1 xung đột (409 `BOOKING_CONFLICT`), đúng 1 bản ghi lưu trong DB.
- 5 request đồng thời: đúng 1 thắng (201), 4 xung đột (409).

### 4. Khoảng Nửa Mở (Half-Open Interval)
- Ca 09:00–10:00 và 10:00–11:00 kề nhau cùng thành công trên một tài nguyên.

---

## D. Bảng Kết Quả Kiểm Thử Hồi Quy Toàn Diện (Full Regression Gate)

| STT | Cổng kiểm thử (Test Gate) | Lệnh thực thi | Kết quả | Chi tiết |
|---|---|---|---|---|
| 1 | Backend Core Unit Tests | `npm run test:core` | **PASS** | 27/27 tests pass |
| 2 | Batch 1D Concurrency DB | `node --test test/bookingConcurrency.db.test.js` | **PASS** | 1/1 suite pass (PostgreSQL GiST) |
| 3 | Batch 1D Persistence DB | `node --test test/persistenceMigration.test.js` | **PASS** | 1/1 suite pass |
| 4 | Batch 1E Isolated Runtime | `node --test test/batch1e/integration.runtime.test.js` | **PASS** | 11/11 subtests pass |
| 5 | Batch 2 Auth / RBAC | `npm run test:batch2` | **PASS** | 10/10 subtests pass |
| 6 | Batch 3 Resource Management | `npm run test:batch3` | **PASS** | 9/9 subtests pass |
| 7 | Batch 4 Integration & Policy | `npm run test:batch4` | **PASS** | 30/30 tests pass (14 integration + 16 policy) |
| 8 | Batch 2 Frontend E2E | `npm run test:e2e:auth` | **PASS** | 5 vai trò (unauth, STUDENT, LAB_STAFF, ADMIN, LECTURER) |
| 9 | Batch 3 Frontend E2E | `npm run test:e2e:resources` | **PASS** | 4 vai trò (STUDENT, LECTURER, LAB_STAFF, ADMIN) |
| 10 | Batch 4 Live E2E (Playwright) | `npm run test:e2e:calendar` | **PASS** | 100% pass: Slot prepopulation, Effective Approval, Dynamic Policy, No timer close, Concurrency/Conflict, Maintenance, Responsive |
| 11 | Frontend Production Build | `npm run build` | **PASS** | Vite 6 bundle built in 3.23s, 0 errors |
| 12 | Runtime Health & Readiness | `GET /health`, `GET /health/ready` | **PASS** | HTTP 200, DB probe ready, Helmet & CORS verified |

---

## E. An Toàn Cơ Sở Dữ Liệu (Database Safety)

- **Không tạo migration mới**: Giữ nguyên lịch sử 11 migration đã được phê duyệt.
- **Không chỉnh sửa historical migration**.
- **Không can thiệp DDL lên database phát triển**: `applyBookingGuard.js` duy trì guard bảo vệ chỉ chạy trên DB kiểm thử cô lập có tiền tố `lab_resources_b4_booking_`.
- `_prisma_migrations` giữ nguyên vẹn.

---

## F. Quyết Định Ranh Giới (Boundary Decision)

- **Batch 4 & Batch 4.1: HOÀN TẤT & ĐÃ XÁC MINH CHÍNH XÁC.**
- **DỪNG TUYỆT ĐỐI (HARD STOP) — KHÔNG BẮT ĐẦU BATCH 5.** Chờ chỉ thị chính thức từ người dùng.
