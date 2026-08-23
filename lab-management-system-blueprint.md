# LAB MANAGEMENT & INTELLIGENT SCHEDULING PLATFORM

> **Project Blueprint / Source of Truth**
>
> Mục đích của tài liệu này là cung cấp một đặc tả đủ chi tiết để một AI coding agent, nhóm phát triển hoặc người bảo trì có thể hiểu domain, kiến trúc, dữ liệu, nghiệp vụ, API, AI và roadmap trước khi triển khai hệ thống.
>
> **Tên đề tài đề xuất:** Nền tảng quản lý và tối ưu tài nguyên phòng thí nghiệm thông minh tích hợp trợ lý AI
>
> **English:** Intelligent Laboratory Resource Management and Scheduling Platform with AI-Assisted Equipment Recommendation
>
> **Nguyên tắc:** Ưu tiên tính đúng đắn nghiệp vụ, kiểm soát xung đột lịch, tính nhất quán dữ liệu và khả năng mở rộng. AI là lớp hỗ trợ trên domain thật, không được trở thành nguồn dữ liệu nghiệp vụ duy nhất.

---

## 0. EXECUTIVE SUMMARY

Hệ thống quản lý việc khai thác phòng thí nghiệm trong môi trường đại học/nghiên cứu. Người dùng có thể tra cứu thiết bị, kiểm tra điều kiện sử dụng, đặt lịch, tham gia quy trình phê duyệt, check-in/check-out, báo sự cố và theo dõi lịch sử.

Hệ thống phải giải quyết bài toán khó hơn một ứng dụng đặt lịch thông thường:

- Phát hiện lịch xung đột theo nhiều loại tài nguyên.
- Không cho phép vượt qua các ràng buộc cứng.
- Cảnh báo các xung đột mềm và ưu tiên.
- Chống race condition khi nhiều người đặt cùng lúc.
- Gợi ý khung giờ hoặc thiết bị thay thế khi yêu cầu không hợp lệ.
- Quản lý vòng đời thiết bị: khả dụng, đặt trước, đang sử dụng, bảo trì, hỏng, hiệu chuẩn, ngừng khai thác.
- Kiểm tra người dùng có đủ quyền và chứng nhận/đào tạo hay không.
- Quản lý vật tư tiêu hao.
- Theo dõi check-in/check-out và no-show.
- Quản lý sự cố, bảo trì và hiệu chuẩn.
- Phân tích mức độ khai thác tài nguyên.
- Cung cấp AI Assistant dựa trên dữ liệu thật, tài liệu thật và API/tool của hệ thống.
- Có thể mở rộng sang tối ưu lịch, dự báo nhu cầu, dự báo bảo trì, anomaly detection và IoT.

### Tầm nhìn sản phẩm

Không coi hệ thống là “website đặt lịch”. Hãy coi nó là:

> **Laboratory Resource Management + Scheduling + Decision Support + AI Copilot**.

---

# 1. PRODUCT VISION

## 1.1. Problem Statement

Các phòng thí nghiệm thường có các vấn đề:

1. Thiết bị dùng chung và dễ bị trùng lịch.
2. Người dùng không biết thiết bị nào phù hợp cho mục tiêu thí nghiệm.
3. Một số thiết bị chỉ cho phép người đã được đào tạo sử dụng.
4. Lịch bảo trì/hiệu chuẩn có thể xung đột với booking.
5. Người dùng đặt nhưng không đến, làm lãng phí tài nguyên.
6. Lịch sử sử dụng bị phân tán.
7. Quản lý khó biết thiết bị nào đang quá tải hoặc bị bỏ phí.
8. Báo hỏng thủ công làm chậm phản ứng.
9. Việc giải thích “tại sao không được đặt” thường thiếu minh bạch.
10. Các tài liệu thiết bị như manual/SOP khó tìm và khó khai thác.

## 1.2. Product Goals

### Must achieve

- Booking chính xác.
- Không double-booking trong điều kiện concurrent requests.
- Kiểm tra policy trước khi xác nhận.
- Có workflow approval.
- Có lịch bảo trì và trạng thái thiết bị.
- Có audit log.
- Có dashboard cơ bản.

### Should achieve

- Gợi ý lịch thay thế.
- Gợi ý thiết bị thay thế.
- QR check-in/check-out.
- No-show handling.
- Training/certification.
- Notification.
- Realtime availability.
- AI Assistant.
- RAG tài liệu thiết bị.

### Advanced

- Scheduling optimization.
- Demand forecasting.
- Predictive maintenance.
- Usage anomaly detection.
- IoT integration.

---

# 2. SCOPE MANAGEMENT

## 2.1. Core Scope

Các module bắt buộc:

1. Authentication & Authorization
2. User & Organization
3. Laboratory Management
4. Equipment Management
5. Equipment Policies
6. Booking Management
7. Conflict Detection
8. Conflict Resolution / Alternative Suggestions
9. Approval Workflow
10. Maintenance
11. Training & Certification
12. Incident Management
13. Check-in / Check-out
14. Notification
15. Audit Log
16. Analytics Dashboard
17. AI Assistant
18. Knowledge Base / RAG

## 2.2. Advanced Scope

- Inventory/consumables.
- Calendar integration.
- WebSocket realtime.
- Optimization engine.
- ML forecasting.
- Predictive maintenance.
- IoT/MQTT.

## 2.3. Scope Rule

Không triển khai Advanced trước khi Core Scope ổn định.

Ưu tiên:

`Correctness > Security > Business Rules > UX > AI > Optimization > IoT`

---

# 3. USER PERSONAS / ACTORS

## 3.1. Student

Quyền chính:

- Xem thiết bị.
- Tìm kiếm và lọc.
- Xem availability.
- Đặt lịch.
- Hủy lịch theo policy.
- Xem lịch cá nhân.
- Check-in/check-out.
- Báo sự cố.
- Xem training.
- Chat với AI.

## 3.2. Lecturer / Researcher

Ngoài quyền student:

- Đặt tài nguyên cho research/group.
- Có thể có priority cao hơn theo policy.
- Phê duyệt booking của group nếu được cấu hình.
- Xem usage analytics của group.

## 3.3. Lab Technician

- Quản lý trạng thái thiết bị.
- Xử lý maintenance.
- Xử lý incident.
- Xác nhận check-in/check-out nếu policy yêu cầu.
- Quản lý calibration.
- Xác nhận thiết bị sẵn sàng.

## 3.4. Lab Manager

- Quản lý lab.
- Quản lý equipment.
- Thiết lập booking policy.
- Quản lý approval workflow.
- Xem dashboard.
- Xem audit.
- Quản lý training.

## 3.5. System Administrator

- User/role/permission.
- System settings.
- AI settings.
- Security/audit.

## 3.6. AI Agent

Không phải actor có quyền nghiệp vụ độc lập.

AI chỉ:

- phân tích intent;
- truy xuất knowledge;
- gọi tool/API được cấp;
- đưa recommendation;
- giải thích kết quả.

AI không được tự ý vượt permission, tự xoá dữ liệu hay tự sửa policy.

---

# 4. BUSINESS DOMAIN

## 4.1. Resource Hierarchy

```text
Campus
  -> Building
      -> Floor
          -> Laboratory
              -> Equipment
                  -> Equipment Components / Accessories
                  -> Consumable Requirements
                  -> Training Requirements
                  -> Maintenance Schedule
```

## 4.2. Equipment Lifecycle

```text
PLANNED
  -> ACTIVE
  -> RESERVED
  -> IN_USE
  -> AVAILABLE
  -> MAINTENANCE
  -> CALIBRATION
  -> BROKEN
  -> RETIRED
```

Lưu ý: trạng thái business không nên gộp tất cả vào một enum duy nhất nếu domain cần biểu diễn độc lập nhiều khía cạnh.

Khuyến nghị:

```text
operational_status:
AVAILABLE | IN_USE | MAINTENANCE | BROKEN | CALIBRATION | RETIRED

booking_state:
BOOKABLE | RESTRICTED | NON_BOOKABLE
```

## 4.3. Booking Lifecycle

```text
DRAFT
  -> SUBMITTED
  -> PENDING_APPROVAL
  -> APPROVED
  -> SCHEDULED
  -> CHECKED_IN
  -> IN_USE
  -> COMPLETED
```

Các nhánh khác:

```text
SUBMITTED -> REJECTED
APPROVED -> CANCELLED
SCHEDULED -> NO_SHOW
SCHEDULED -> EXPIRED
IN_USE -> INCIDENT_REPORTED
```

## 4.4. Incident Lifecycle

```text
REPORTED
  -> TRIAGED
  -> ASSIGNED
  -> INVESTIGATING
  -> RESOLVED
  -> VERIFIED
  -> CLOSED
```

## 4.5. Maintenance Lifecycle

```text
SCHEDULED
  -> IN_PROGRESS
  -> COMPLETED
  -> VERIFIED
```

---

# 5. BUSINESS RULE ENGINE

Đây là khu vực quan trọng nhất của hệ thống.

Không được nhúng business rules rải rác vào Controller.

Khuyến nghị có lớp/domain service riêng:

```text
BookingPolicyService
AvailabilityService
ConflictDetectionService
BookingValidationService
SchedulingService
EligibilityService
PriorityService
```

## 5.1. Hard Constraints

Nếu vi phạm -> booking không được xác nhận.

Ví dụ:

- Equipment không ở trạng thái có thể booking.
- Equipment nằm trong maintenance window.
- Equipment nằm trong calibration window.
- Time range không hợp lệ.
- User không có permission.
- User thiếu training bắt buộc.
- Booking vượt max duration.
- User vượt quota.
- Equipment đã có booking xung đột.
- Lab đóng cửa.
- Room không đủ capacity.
- Consumable không đủ nếu policy yêu cầu.

## 5.2. Soft Constraints

Không nhất thiết reject, nhưng cần cảnh báo/score.

Ví dụ:

- User đã đặt quá nhiều lịch gần đây.
- Khung giờ có nhu cầu cao.
- Booking có priority thấp hơn request khác.
- Khoảng cách giữa hai booking quá ngắn.
- Equipment vừa có incident.

## 5.3. Warnings

Không block:

- Usage hours cao.
- Training sắp hết hạn.
- Thiết bị gần đến ngưỡng bảo trì.
- Booking vào giờ ít được hỗ trợ.

---

# 6. BOOKING CONFLICT MODEL

## 6.1. Basic Time Overlap

Hai interval A và B overlap khi:

```text
A.start < B.end AND A.end > B.start
```

Không dùng điều kiện chỉ dựa trên ngày; phải xét timestamp/timezone chuẩn.

## 6.2. Conflict Types

```text
EQUIPMENT_CONFLICT
USER_CONFLICT
ROOM_CONFLICT
RESOURCE_CAPACITY_CONFLICT
MAINTENANCE_CONFLICT
CALIBRATION_CONFLICT
TRAINING_CONFLICT
ELIGIBILITY_CONFLICT
QUOTA_CONFLICT
OPERATING_HOURS_CONFLICT
APPROVAL_CONFLICT
DEPENDENCY_CONFLICT
```

## 6.3. Conflict Severity

```text
HARD
SOFT
WARNING
```

## 6.4. Conflict Object

Khuyến nghị dữ liệu trả về:

```json
{
  "type": "EQUIPMENT_CONFLICT",
  "severity": "HARD",
  "resourceId": "...",
  "conflictingBookingId": "...",
  "message": "Equipment is already booked in the requested period",
  "suggestedActions": [
    "MOVE_TIME",
    "USE_ALTERNATIVE_EQUIPMENT"
  ]
}
```

---

# 7. CONCURRENCY / DOUBLE-BOOKING PROTECTION

Đây là yêu cầu bắt buộc.

## 7.1. Vấn đề

Hai request đồng thời có thể cùng thấy “available” rồi cùng insert.

## 7.2. Kiến trúc bắt buộc

Booking creation phải được thực hiện trong transaction.

Luồng khuyến nghị:

```text
Begin Transaction
  -> validate request
  -> load target resource with appropriate locking strategy
  -> query overlapping active bookings
  -> validate maintenance windows
  -> validate policy
  -> create booking
  -> write booking conflict/audit information
Commit
```

## 7.3. Database Strategy

Tùy DB:

- PostgreSQL: ưu tiên exclusion constraints/range-based strategy nếu phù hợp.
- MySQL: dùng transaction + locking strategy + carefully designed index/constraint pattern.

Không được chỉ kiểm tra ở frontend.

## 7.4. Idempotency

Các API tạo booking nên hỗ trợ idempotency key nếu client có retry.

Ví dụ:

```text
POST /api/v1/bookings
Idempotency-Key: 9c0...
```

Nếu request bị gửi lại, server không tạo booking thứ hai.

---

# 8. PRIORITY SYSTEM

Priority phải là policy có thể cấu hình, không hard-code role đơn giản.

## 8.1. Các yếu tố

```text
role_weight
purpose_weight
research_priority
deadline_urgency
project_priority
booking_history
```

## 8.2. Priority Score

Khuyến nghị abstract:

```text
priorityScore =
  roleWeight
  + purposeWeight
  + urgencyWeight
  + projectWeight
  + policyAdjustment
```

Không cho AI tự ý thay đổi score.

---

# 9. ALTERNATIVE SLOT / CONFLICT RESOLUTION

Khi booking bị conflict, engine cần có khả năng tìm:

1. Cùng equipment, thời gian khác.
2. Equipment tương đương, cùng thời gian.
3. Equipment tương đương, thời gian khác.
4. Slot gần nhất với yêu cầu.
5. Slot tối ưu theo priority/policy.

## 9.1. Recommendation Score

Ví dụ:

```text
score =
  timeDistanceScore * 0.30
  + equipmentMatchScore * 0.30
  + availabilityScore * 0.15
  + userPreferenceScore * 0.10
  + queueScore * 0.10
  + policyScore * 0.05
```

Các trọng số phải cấu hình được ở tầng scheduling engine, không để AI tự đặt.

---

# 10. TRAINING / CERTIFICATION

Mỗi equipment có thể yêu cầu:

```text
SAFETY_TRAINING
EQUIPMENT_BASIC_TRAINING
EQUIPMENT_ADVANCED_TRAINING
TECHNICIAN_SUPERVISION
SPECIAL_APPROVAL
```

User certification:

```text
status:
PENDING | ACTIVE | EXPIRED | REVOKED
```

Có thể có:

```text
issuedAt
expiresAt
issuedBy
certificateFile
```

Booking validation phải kiểm tra chứng nhận tại thời điểm start booking hoặc theo policy cấu hình.

---

# 11. MAINTENANCE / CALIBRATION

## 11.1. Maintenance Rules

Maintenance window phải được xem như unavailable interval đối với booking.

Ví dụ:

```text
Maintenance: 13:00-15:00
Booking:     14:00-16:00
```

=> HARD CONFLICT.

## 11.2. Maintenance Metrics

- Operating hours.
- Maintenance count.
- Mean time between failures (MTBF) nếu đủ data.
- Mean time to repair (MTTR) nếu đủ data.
- Downtime ratio.
- Maintenance overdue ratio.

## 11.3. Calibration

Thiết bị cần calibration có thể có:

```text
last_calibrated_at
next_calibration_at
calibration_interval
calibration_status
```

---

# 12. INCIDENT MANAGEMENT

Incident có:

```text
id
 equipment_id
 reported_by
 severity
 category
 description
 detected_at
 status
 assigned_to
 resolution
 resolved_at
 attachments
```

Severity:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Nếu incident nghiêm trọng, hệ thống có thể tự đưa equipment thành `BROKEN` hoặc `RESTRICTED` theo policy; không để AI tự quyết định.

---

# 13. CHECK-IN / CHECK-OUT

## 13.1. Check-in

Có thể dùng:

- Booking ID.
- QR code.
- Equipment QR.
- User authentication.

Validation:

```text
booking belongs to user
current time within check-in window
equipment matches booking
booking not cancelled
```

## 13.2. Check-out

Thu thập:

- actual start.
- actual end.
- equipment condition.
- incident report.
- optional usage notes.

---

# 14. NO-SHOW POLICY

Ví dụ cấu hình:

```text
checkInGraceMinutes = 20
```

Sau 20 phút không check-in:

```text
WARNING
```

Sau ngưỡng tiếp theo:

```text
NO_SHOW
release resource
notify user
record no-show history
```

Không nên tự động áp penalty nếu chưa có policy rõ ràng.

---

# 15. EQUIPMENT RECOMMENDATION DOMAIN

AI/Recommendation Engine phải dựa trên capability, không chỉ tên thiết bị.

Mỗi equipment nên có structured capabilities:

```text
measurement_type
accuracy
range
temperature_range
capacity
interface
supported_protocol
supported_sample_type
application_tags
```

Ví dụ query:

> “Thiết bị để đo nhiệt độ với độ chính xác cao.”

Engine:

```text
semantic intent
 -> capability filtering
 -> eligibility filtering
 -> availability filtering
 -> ranking
```

---

# 16. DATABASE DESIGN

## 16.1. Database Recommendation

Khuyến nghị PostgreSQL cho domain scheduling nếu có thể vì hỗ trợ mạnh cho temporal/range constraints và query nâng cao. MySQL vẫn khả thi nếu nhóm đã quen, nhưng cần thiết kế concurrency rất cẩn thận.

## 16.2. Core Tables

### Identity / Access

```text
users
roles
permissions
user_roles
role_permissions
user_profiles
organizations
organization_members
```

### Location / Lab

```text
campuses
buildings
floors
laboratories
lab_policies
```

### Equipment

```text
equipment_categories
equipment
 equipment_specs
 equipment_capabilities
 equipment_documents
 equipment_accessories
 equipment_status_history
 equipment_tags
```

### Booking

```text
bookings
booking_participants
booking_resources
booking_approvals
booking_conflicts
booking_history
booking_policy_versions
```

### Training

```text
training_courses
training_requirements
user_training_records
certifications
```

### Maintenance / Incident

```text
maintenance_plans
maintenance_schedules
maintenance_records
calibrations
incidents
incident_comments
```

### Check-in / Usage

```text
checkins
checkouts
equipment_usage_sessions
```

### Inventory

```text
consumables
inventory_locations
inventory_stock
inventory_transactions
```

### Notification / Audit

```text
notifications
notification_preferences
audit_logs
system_events
```

### AI / RAG

```text
ai_conversations
ai_messages
ai_tool_calls
ai_recommendations
ai_feedback
knowledge_documents
knowledge_document_versions
knowledge_chunks
knowledge_access_logs
```

### Analytics / ML

```text
metric_snapshots
prediction_runs
prediction_results
anomaly_events
```

Tổng số logical tables có thể khoảng 50+ tùy mức triển khai. Không cần tạo tất cả trong migration đầu tiên.

---

# 17. KEY TABLE DETAILS

## 17.1. users

```text
id UUID / BIGINT
username
email
password_hash
status
last_login_at
created_at
updated_at
```

## 17.2. laboratories

```text
id
building_id
name
code
description
capacity
status
opening_time
closing_time
created_at
updated_at
```

## 17.3. equipment

```text
id
laboratory_id
category_id
code
name
serial_number
manufacturer
model
description
operational_status
booking_state
purchase_date
warranty_expiry
created_at
updated_at
version
```

`version` dùng cho optimistic locking nếu cần.

## 17.4. bookings

```text
id
booking_code
requested_by
laboratory_id
purpose
start_at
end_at
status
priority
approval_required
approved_by
approved_at
checkin_deadline
created_at
updated_at
version
```

Không lưu một equipment_id duy nhất nếu tương lai booking có thể cần nhiều resource. Có thể dùng `booking_resources`.

## 17.5. booking_resources

```text
id
booking_id
resource_type
resource_id
start_at
end_at
is_primary
```

Điều này giúp một booking có nhiều tài nguyên.

---

# 18. INDEXING STRATEGY

Các query quan trọng phải có index.

Ví dụ:

```text
bookings(resource/equipment, start_at, end_at, status)
bookings(requested_by, start_at)
equipment(laboratory_id, operational_status)
maintenance_schedules(equipment_id, start_at, end_at)
training_records(user_id, status, expires_at)
notifications(user_id, is_read, created_at)
```

Dùng EXPLAIN/EXPLAIN ANALYZE khi tối ưu.

Không tạo index vô tội vạ.

---

# 19. API CONVENTION

Base URL:

```text
/api/v1
```

## 19.1. Auth

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

## 19.2. Users

```text
GET    /users/me
GET    /users/me/bookings
GET    /users/me/training
GET    /users/me/notifications
```

## 19.3. Labs

```text
GET    /labs
GET    /labs/{id}
GET    /labs/{id}/equipment
```

## 19.4. Equipment

```text
GET    /equipment
GET    /equipment/{id}
GET    /equipment/{id}/availability
GET    /equipment/{id}/maintenance
GET    /equipment/{id}/documents
GET    /equipment/{id}/history
```

## 19.5. Booking

```text
POST   /bookings
GET    /bookings
GET    /bookings/{id}
PATCH  /bookings/{id}
POST   /bookings/{id}/cancel
POST   /bookings/{id}/approve
POST   /bookings/{id}/reject
POST   /bookings/{id}/check-in
POST   /bookings/{id}/check-out
GET    /bookings/{id}/conflicts
GET    /bookings/{id}/alternatives
```

## 19.6. Maintenance

```text
GET    /maintenance
POST   /maintenance
GET    /maintenance/{id}
PATCH  /maintenance/{id}
```

## 19.7. Incidents

```text
POST   /incidents
GET    /incidents
GET    /incidents/{id}
PATCH  /incidents/{id}
POST   /incidents/{id}/assign
POST   /incidents/{id}/resolve
```

## 19.8. Training

```text
GET    /training/courses
GET    /training/requirements
POST   /training/enrollments
GET    /users/me/training
```

## 19.9. Analytics

```text
GET    /analytics/overview
GET    /analytics/equipment-utilization
GET    /analytics/conflicts
GET    /analytics/no-shows
GET    /analytics/maintenance
```

## 19.10. AI

```text
POST   /ai/conversations
POST   /ai/conversations/{id}/messages
GET    /ai/conversations/{id}
POST   /ai/recommendations/equipment
POST   /ai/recommendations/booking
POST   /ai/search
```

AI endpoints không được cho phép client truyền arbitrary internal SQL/tool command.

---

# 20. API RESPONSE STANDARD

Khuyến nghị format:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The selected equipment is unavailable in the requested period",
    "details": []
  },
  "meta": {
    "requestId": "..."
  }
}
```

Dùng error code ổn định để frontend và AI agent không phụ thuộc vào string message.

---

# 21. RECOMMENDED ERROR CODES

```text
AUTH_INVALID_CREDENTIALS
AUTH_FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
EQUIPMENT_NOT_BOOKABLE
BOOKING_CONFLICT
MAINTENANCE_CONFLICT
TRAINING_REQUIRED
TRAINING_EXPIRED
QUOTA_EXCEEDED
OPERATING_HOURS_VIOLATION
APPROVAL_REQUIRED
BOOKING_NOT_CANCELLABLE
CHECKIN_WINDOW_EXPIRED
ALREADY_CHECKED_IN
ALREADY_CHECKED_OUT
IDEMPOTENCY_REPLAY
CONCURRENT_UPDATE
```

---

# 22. FRONTEND INFORMATION ARCHITECTURE

## Public

```text
/
/equipment
/equipment/[id]
/labs
/about
```

## Authenticated

```text
/dashboard
/my-bookings
/calendar
/training
/notifications
/profile
/ai-assistant
```

## Admin

```text
/admin
/admin/users
/admin/roles
/admin/labs
/admin/equipment
/admin/bookings
/admin/maintenance
/admin/incidents
/admin/training
/admin/analytics
/admin/audit
/admin/settings
/admin/ai
```

## Technician

```text
/technician
/technician/equipment
/technician/maintenance
/technician/incidents
```

---

# 23. BOOKING UX

Booking screen phải cho người dùng thấy trước khi submit:

```text
Selected equipment
Requested period
Current availability
Eligibility status
Training status
Potential conflicts
Warnings
Policy summary
Estimated usage
```

Không nên bắt user submit rồi mới báo tất cả lỗi nếu có thể pre-validate.

Tuy nhiên pre-validation chỉ để UX; server validation vẫn bắt buộc.

---

# 24. CALENDAR UX

Calendar cần hỗ trợ:

- Day view.
- Week view.
- Month view.
- Equipment filter.
- Lab filter.
- Status filter.
- User filter cho admin.

Màu sắc chỉ là UI; backend vẫn dùng status enum.

---

# 25. REAL-TIME ARCHITECTURE

Có thể dùng WebSocket/SSE.

Event ví dụ:

```text
BOOKING_CREATED
BOOKING_CANCELLED
EQUIPMENT_STATUS_CHANGED
MAINTENANCE_STARTED
MAINTENANCE_COMPLETED
INCIDENT_CREATED
NOTIFICATION_CREATED
```

Không dùng WebSocket để thay thế database truth.

Realtime message chỉ là signal để client refresh/reconcile state.

---

# 26. NOTIFICATION SYSTEM

Notification model:

```text
id
user_id
type
title
message
channel
status
scheduled_at
sent_at
read_at
metadata
```

Channels:

```text
IN_APP
EMAIL
PUSH
```

Notification types:

```text
BOOKING_CREATED
BOOKING_APPROVED
BOOKING_REJECTED
BOOKING_CANCELLED
BOOKING_REMINDER
CONFLICT_DETECTED
MAINTENANCE_WARNING
EQUIPMENT_DOWN
TRAINING_EXPIRING
INCIDENT_UPDATED
```

---

# 27. AUDIT LOG

Mọi hành động quan trọng phải audit.

```text
id
actor_id
actor_type
action
entity_type
entity_id
before_json
after_json
ip_address
user_agent
request_id
created_at
```

Actions:

```text
CREATE
UPDATE
DELETE
APPROVE
REJECT
CANCEL
CHECK_IN
CHECK_OUT
STATUS_CHANGE
LOGIN
LOGOUT
PERMISSION_CHANGE
```

Không lưu plaintext secret/token/password.

---

# 28. SECURITY BASELINE

## Authentication

- Password hashing bằng Argon2id hoặc bcrypt phù hợp policy.
- Access token ngắn hạn.
- Refresh token rotation nếu triển khai.
- Logout/revocation strategy.

## Authorization

- RBAC.
- Resource-level authorization.
- Không tin role do client gửi.

## API

- Input validation.
- Pagination limits.
- Rate limiting.
- CORS rõ ràng.
- Secure headers.
- Logging không chứa secret.

## Files

- Validate MIME type.
- Size limit.
- File name normalization.
- Virus/malware scanning nếu triển khai production.
- Không expose storage credential.

## AI Security

- Prompt injection defense.
- Tool allowlist.
- Authorization trước tool call.
- Không cho model truy cập DB trực tiếp.
- Mask dữ liệu nhạy cảm.
- Audit AI tool calls.

---

# 29. AI SYSTEM DESIGN

AI phải được xây thành một lớp domain-aware.

## 29.1. AI Components

```text
AI Gateway
Prompt/Context Builder
Intent Router
Tool Registry
RAG Retriever
LLM Adapter
Response Validator
AI Audit Logger
AI Feedback Collector
```

## 29.2. AI Tools

Danh sách tool nên được giới hạn:

```text
search_equipment
get_equipment_detail
check_equipment_availability
get_user_eligibility
get_user_training
find_alternative_slots
find_alternative_equipment
get_lab_policy
get_booking_status
get_user_bookings
create_booking_draft
```

Đặc biệt:

`create_booking_draft` khác `confirm_booking`.

AI nên tạo draft và yêu cầu user confirmation trước khi mutation quan trọng.

Nếu cần tool xác nhận booking, tool phải gọi lại server-side authorization và business rules.

---

# 30. AI TOOL-CALLING FLOW

Ví dụ user:

> “Ngày mai buổi chiều tôi cần dùng máy đo X khoảng 2 tiếng.”

Flow:

```text
User message
  -> intent detection
  -> extract desired resource/time/duration
  -> get current user context
  -> check eligibility
  -> search equipment
  -> check availability
  -> rank slots
  -> return recommendation
  -> user confirms
  -> create booking draft
  -> server validates again
  -> commit booking
  -> audit
  -> notification
```

AI không được tự suy đoán timezone từ ngôn ngữ mơ hồ nếu hệ thống đã có timezone cấu hình; dùng timezone của lab/user policy.

---

# 31. RAG KNOWLEDGE BASE

## Sources

- Equipment manuals.
- SOP.
- Safety instructions.
- Datasheet.
- Lab regulations.
- Training documents.
- FAQ.

## Pipeline

```text
Upload document
  -> extract text
  -> clean
  -> chunk
  -> metadata enrichment
  -> embedding
  -> vector store
```

Metadata tối thiểu:

```text
document_id
equipment_id
laboratory_id
version
page_number
section
source_type
created_at
```

## Retrieval

Kết hợp:

```text
semantic search
+
metadata filtering
+
keyword search
```

AI phải ưu tiên tài liệu mới/đúng version khi policy yêu cầu.

---

# 32. RAG ANSWER POLICY

Khi hỏi về thông số thiết bị:

1. Tìm tài liệu liên quan.
2. Lấy chunk có source metadata.
3. Trả lời có nguồn.
4. Nếu không tìm được, nói rõ không đủ dữ liệu.
5. Không hallucinate thông số.

Ví dụ output:

```text
Theo Equipment Manual v2.1, thiết bị hỗ trợ ...
Nguồn: Manual – page 27.
```

Không khẳng định an toàn hay quy trình thực nghiệm ngoài phạm vi tài liệu/policy được phép.

---

# 33. AI EQUIPMENT RECOMMENDER

Pipeline:

```text
User intent
 -> capability extraction
 -> structured filters
 -> semantic retrieval
 -> eligibility filter
 -> availability filter
 -> ranking
 -> explanation
```

Output:

```json
{
  "equipmentId": "...",
  "matchScore": 0.94,
  "reasons": [
    "Supports required measurement range",
    "User is qualified",
    "Available in requested period"
  ]
}
```

Match score là recommendation score, không phải xác suất khoa học nếu chưa calibration.

---

# 34. AI BOOKING RECOMMENDER

Mục tiêu:

- tìm slot gần yêu cầu nhất;
- giảm chờ;
- giảm conflict;
- tận dụng thiết bị;
- tôn trọng policy.

Luồng:

```text
Requested interval
 -> hard constraint filtering
 -> candidate generation
 -> soft scoring
 -> top-K alternatives
```

---

# 35. AI GUARDRAILS

Bắt buộc:

1. Server vẫn là source of truth.
2. AI không vượt RBAC.
3. AI không truy cập DB trực tiếp.
4. Tool calls có schema validation.
5. Mutation quan trọng cần confirmation hoặc explicit permission.
6. Tất cả tool calls được log.
7. RAG citations được lưu khi cần audit.
8. Prompt không chứa secret.

---

# 36. ANALYTICS

## Core KPIs

### Equipment Utilization

```text
actual usage time / available scheduled time
```

Cần định nghĩa rõ available time; không dùng công thức một cách mơ hồ.

### Booking Conflict Rate

```text
conflicted booking requests / total booking requests
```

### No-show Rate

```text
no-show bookings / approved scheduled bookings
```

### Equipment Downtime

```text
maintenance + broken + calibration duration
```

### Approval Lead Time

```text
approved_at - submitted_at
```

### Booking Completion Rate

```text
completed / approved
```

---

# 37. ADVANCED ANALYTICS

- Peak utilization hours.
- Equipment demand distribution.
- Department utilization.
- User utilization.
- Cancellation patterns.
- No-show patterns.
- Maintenance cost/time.
- Underutilized assets.
- Bottleneck assets.

Không nên chỉ vẽ chart; mỗi metric phải có definition và data source.

---

# 38. PREDICTIVE ANALYTICS

Có thể triển khai sau Core.

## 38.1. Demand Forecasting

Features có thể gồm:

- day of week.
- hour.
- semester.
- course schedule.
- historical bookings.
- department.

Output:

```text
expected utilization
expected booking volume
```

## 38.2. No-show Prediction

Features:

- previous no-show rate.
- booking lead time.
- day/hour.
- duration.
- user history.

Chỉ dùng cho recommendation/alert, không tự động phạt nếu chưa có policy.

## 38.3. Predictive Maintenance

Có thể dùng:

- usage hours.
- incident count.
- maintenance intervals.
- error telemetry nếu có.

Output là risk score, không phải chẩn đoán chắc chắn.

---

# 39. SCHEDULING OPTIMIZATION

Đây là hướng học thuật nâng cao.

## Variables

```text
booking -> selected slot
booking -> selected equipment
```

## Hard Constraints

- no overlap;
- equipment availability;
- user eligibility;
- maintenance;
- operating hours;
- room capacity;
- dependencies;
- quota.

## Soft Objectives

- minimize delay;
- maximize utilization;
- minimize idle time;
- satisfy priority;
- reduce switching;
- improve fairness.

## Possible Algorithms

Chọn một hướng chính:

- Constraint Programming.
- Integer Linear Programming.
- Genetic Algorithm.
- Simulated Annealing.

Đối với đồ án, ưu tiên một thuật toán có thể benchmark bằng dataset mô phỏng.

---

# 40. FAIRNESS / POLICY CONSIDERATIONS

Nếu dùng priority, cần tránh việc một nhóm luôn chiếm tài nguyên.

Có thể thêm:

```text
fairness score
quota
weekly caps
priority budget
```

Mục tiêu:

```text
priority + fairness + utilization
```

Không chỉ:

```text
priority only
```

---

# 41. INVENTORY / CONSUMABLES

Booking có thể yêu cầu vật tư.

Ví dụ:

```text
Equipment X
requires:
- Chemical A x 2
- Cartridge B x 1
```

Booking validation:

```text
check equipment
check permissions
check training
check consumable stock
```

Stock transaction phải transactional nếu trừ tồn thực tế.

---

# 42. CALENDAR INTEGRATION

Có thể hỗ trợ:

- export ICS;
- Google Calendar;
- Outlook.

Booking là nguồn sự thật. Calendar integration chỉ là projection/external synchronization.

Nếu external sync thất bại, booking nội bộ không được rollback chỉ vì calendar API lỗi; phải có retry/outbox nếu cần.

---

# 43. EVENT / OUTBOX PATTERN

Khi booking committed:

```text
DB transaction
  -> booking created
  -> outbox event created
commit

background worker
  -> notification
  -> calendar sync
  -> analytics event
```

Điều này tốt hơn việc gọi trực tiếp email/calendar trong transaction chính.

---

# 44. OBSERVABILITY

Tối thiểu:

- structured logs.
- request ID.
- error tracking.
- health check.
- metrics.
- slow query logging.

Các metric quan trọng:

```text
API latency
booking conflict count
booking commit failures
AI latency
AI tool-call failures
queue depth
notification failures
```

---

# 45. TESTING STRATEGY

## Unit Tests

Test:

- overlap logic;
- policy rules;
- priority scoring;
- eligibility;
- cancellation policy;
- no-show logic.

## Integration Tests

- database transaction;
- repository;
- booking creation;
- maintenance conflict.

## Concurrency Tests

Phải có test nhiều request cùng book một equipment/time slot.

Expected:

```text
exactly one successful commit
remaining requests receive conflict/concurrency error
```

## API Tests

- auth.
- authorization.
- validation.
- pagination.
- error contract.

## E2E Tests

Scenario tối thiểu:

1. Login.
2. Search equipment.
3. Check availability.
4. Create booking.
5. Approval.
6. Check-in.
7. Check-out.
8. Incident.
9. Maintenance.
10. Conflict resolution.

## AI Evaluation

Không đánh giá AI chỉ bằng “trả lời hay”.

Metrics:

- retrieval relevance;
- groundedness;
- tool selection accuracy;
- policy compliance;
- hallucination rate;
- recommendation acceptance rate.

---

# 46. TEST DATA / SEED DATA

Nên có seed:

- 3 campuses.
- 5 buildings.
- 10 labs.
- 50–100 equipment.
- 100–500 users.
- 500+ bookings.
- maintenance history.
- training records.
- realistic conflicts.

Tạo dataset đủ lớn để dashboard và scheduling có ý nghĩa.

---

# 47. API CONTRACT FIRST

Trước khi frontend gọi API ổn định:

1. Define OpenAPI.
2. Define request schema.
3. Define response schema.
4. Define errors.
5. Define authorization.
6. Define examples.

Frontend không được tự bịa endpoint.

---

# 48. BACKEND ARCHITECTURE

Khuyến nghị Modular Monolith trước.

```text
backend/
  src/main/java/.../
    auth/
    users/
    organization/
    labs/
    equipment/
    booking/
    scheduling/
    maintenance/
    training/
    incidents/
    inventory/
    notification/
    analytics/
    ai/
    audit/
    shared/
```

Trong mỗi module:

```text
api/
application/
domain/
infrastructure/
```

Mục tiêu là giữ dependency rõ ràng.

---

# 49. FRONTEND ARCHITECTURE

Khuyến nghị:

```text
app/
components/
features/
services/
lib/
hooks/
types/
```

Tách API client khỏi UI.

Không gọi fetch trực tiếp ở mọi component nếu có thể dùng service layer.

Quản lý:

- auth state;
- server state;
- UI state;
- form validation.

---

# 50. AI SERVICE ARCHITECTURE

Có thể chọn Python service riêng nếu ML/RAG phức tạp.

Giai đoạn đầu:

```text
Spring Boot
   -> AI Gateway
       -> LLM provider
       -> Vector DB
```

Giai đoạn nâng cao:

```text
Spring Boot
   -> AI Gateway
       -> Python AI Service
            -> RAG
            -> ML
            -> Recommendation
```

Không tách service chỉ vì “microservice nghe xịn”. Chỉ tách khi workload/domain boundary thực sự yêu cầu.

---

# 51. INFRASTRUCTURE

Development:

```text
Docker Compose
├── backend
├── frontend
├── postgres
├── redis
├── object storage
└── vector database (optional)
```

Production-ready direction:

```text
Reverse Proxy
Backend
Frontend
DB
Redis
Object Storage
Queue
Observability
```

Không hard-code secrets.

Dùng `.env`/secret manager phù hợp môi trường.

---

# 52. CI/CD

Pipeline:

```text
push
 -> lint
 -> unit tests
 -> integration tests
 -> build
 -> security checks
 -> docker build
 -> deploy
```

PR không được merge nếu:

- test fail;
- lint fail;
- build fail;
- schema migration invalid.

---

# 53. DATABASE MIGRATIONS

Dùng Flyway hoặc Liquibase.

Không chỉnh database production thủ công.

Migrations có version rõ ràng:

```text
V1__init_identity.sql
V2__create_labs.sql
V3__create_equipment.sql
V4__create_booking.sql
...
```

---

# 54. DEVELOPMENT RULES FOR AI CODING AGENTS

Đây là phần bắt buộc nếu giao dự án cho AI.

## Rule 1 — Read before modify

AI phải đọc:

- project blueprint;
- existing architecture;
- database migrations;
- API contracts;
- domain models;
- tests.

Không được tự ý rewrite toàn repo.

## Rule 2 — Preserve architecture

Không tạo module mới nếu domain module hiện có đã phù hợp.

## Rule 3 — No blind implementation

Trước khi code:

1. xác định requirement;
2. xác định affected modules;
3. xác định data changes;
4. xác định API changes;
5. xác định tests.

## Rule 4 — Server-side business rules

Business rules phải được enforce ở backend.

## Rule 5 — AI is not source of truth

AI recommendation không thể thay thế booking engine.

## Rule 6 — Database migrations required

Mọi schema change đều đi qua migration.

## Rule 7 — Test every business rule

Nếu thêm rule mới, phải có test.

## Rule 8 — No silent breaking changes

API/DB contract changes phải được ghi nhận.

## Rule 9 — Security by default

Không log secret.
Không trả sensitive data.
Không trust client roles.

## Rule 10 — Small commits

Một commit nên có một logical purpose.

---

# 55. REQUIREMENT IMPLEMENTATION FORMAT FOR AI

Mỗi task nên được mô tả:

```text
Task ID:
Title:
Goal:
Business Context:
Actors:
Preconditions:
Acceptance Criteria:
Affected Modules:
Database Changes:
API Changes:
UI Changes:
Security Impact:
AI Impact:
Tests:
Migration:
Rollback Considerations:
```

AI phải xác nhận các phần ảnh hưởng trước khi sửa.

---

# 56. DEFINITION OF DONE

Một feature chỉ hoàn thành khi:

- business rule đã implement;
- authorization đúng;
- validation đầy đủ;
- migration hoàn chỉnh nếu cần;
- API documented;
- frontend integrated nếu thuộc scope;
- unit tests;
- integration tests nếu cần;
- audit nếu là mutation nhạy cảm;
- logging/observability phù hợp;
- không tạo regression;
- acceptance criteria pass.

---

# 57. PROJECT PHASES

## Phase 0 — Domain Discovery

Deliverables:

- Problem statement.
- Actors.
- Use cases.
- Glossary.
- Business rules.
- Workflow.
- Non-functional requirements.

## Phase 1 — Architecture & Data

Deliverables:

- Context diagram.
- Container/component diagram.
- ERD.
- API conventions.
- Security model.

## Phase 2 — Core Backend

Order:

```text
Auth
-> Users/Roles
-> Labs
-> Equipment
-> Equipment Policies
-> Booking
-> Availability
-> Conflict
-> Approval
```

## Phase 3 — Operations

```text
Training
Maintenance
Incidents
Check-in/out
No-show
Notification
Audit
```

## Phase 4 — Frontend

Build user/admin/technician flows against stable API contracts.

## Phase 5 — Analytics

Dashboard and KPI definitions.

## Phase 6 — AI Foundation

```text
AI Gateway
-> Tool calling
-> Equipment search
-> Availability tools
-> Booking draft
```

## Phase 7 — RAG

```text
Document ingestion
-> chunking
-> embedding
-> retrieval
-> grounded answer
```

## Phase 8 — Recommendation

```text
Equipment recommendation
Booking recommendation
Conflict resolution
```

## Phase 9 — Advanced Research

Chọn 1–2:

- scheduling optimization;
- predictive maintenance;
- demand forecasting;
- no-show prediction.

## Phase 10 — Hardening

```text
security
load test
concurrency test
observability
CI/CD
documentation
```

---

# 58. MVP RELEASE

MVP phải đạt:

```text
Login
User roles
Labs
Equipment
Availability
Booking
Conflict detection
Approval
Maintenance blocking
Training blocking
Notifications
Admin dashboard
Audit log
```

MVP không phụ thuộc AI.

Đây là nguyên tắc quan trọng để hệ thống vẫn hoạt động khi AI provider lỗi.

---

# 59. AI RELEASE

Sau MVP:

```text
AI Chat
Equipment semantic search
RAG
Availability assistant
Equipment recommendation
Booking recommendation
```

---

# 60. ADVANCED RELEASE

```text
Optimization engine
Predictive analytics
Anomaly detection
IoT integration
```

---

# 61. DEMO SCRIPT / GOLDEN PATH

## Scenario A — Normal Booking

1. Student login.
2. Search equipment.
3. Open detail.
4. View availability.
5. Select time.
6. Server validates.
7. Booking created.
8. Approval if needed.
9. Notification sent.

## Scenario B — Conflict

1. User chooses occupied slot.
2. Server detects conflict.
3. UI shows explanation.
4. Engine finds alternatives.
5. User chooses alternative.
6. Booking succeeds.

## Scenario C — Training Restriction

1. User chooses advanced equipment.
2. Server sees missing certification.
3. Booking blocked.
4. UI suggests training registration.

## Scenario D — Maintenance

1. Equipment has maintenance window.
2. Booking overlaps.
3. Hard conflict.
4. Alternative equipment/time proposed.

## Scenario E — AI Assistant

1. User asks in natural language.
2. AI identifies intent.
3. Calls tools.
4. Checks eligibility.
5. Finds equipment and slots.
6. Explains recommendation.
7. User confirms.
8. Backend performs real booking.

## Scenario F — Incident

1. User scans equipment QR.
2. Reports problem.
3. Incident created.
4. Technician notified.
5. Equipment restricted.
6. Conflicting future bookings reviewed.
7. Affected users notified.

---

# 62. DEMO DATASET STRATEGY

Để demo AI/scheduling, phải có dữ liệu có chủ ý.

Ví dụ:

- Một equipment rất phổ biến.
- Một equipment tương đương ít được sử dụng.
- Một equipment có training requirement.
- Một equipment đang maintenance.
- Một equipment có calibration due.
- Một số booking overlap.
- Một user có no-show history.

Mục tiêu là tạo ra các tình huống để hệ thống thể hiện logic, không phải demo một hệ thống “trống dữ liệu”.

---

# 63. NON-FUNCTIONAL REQUIREMENTS

## Performance

Mục tiêu ban đầu:

- Standard read APIs: p95 < 500 ms trong môi trường demo hợp lý.
- Booking validation: p95 < 1 s nếu không có external dependency.
- AI response: đo riêng latency model/retrieval/tool.

Không tuyên bố SLA production khi chưa benchmark.

## Reliability

- Booking transaction phải atomic.
- Notification failure không được làm mất booking.
- AI outage không làm hệ thống booking ngừng hoạt động.

## Security

- Authorization server-side.
- Password secure hash.
- Audit mutation.
- Input validation.

## Maintainability

- Module boundaries rõ.
- Tests.
- API docs.
- Migration.
- ADRs.

---

# 64. ARCHITECTURE DECISION RECORDS (ADR)

Nên duy trì thư mục:

```text
/docs/adr/
```

Các ADR nên có:

```text
ADR-001-modular-monolith.md
ADR-002-database-choice.md
ADR-003-booking-concurrency-strategy.md
ADR-004-authentication-strategy.md
ADR-005-ai-gateway.md
ADR-006-rag-architecture.md
ADR-007-vector-database.md
ADR-008-scheduling-algorithm.md
```

Mỗi ADR:

```text
Context
Decision
Alternatives
Consequences
```

---

# 65. DOCUMENTATION STRUCTURE

```text
/docs
  /architecture
  /domain
  /api
  /database
  /adr
  /ai
  /scheduling
  /testing
  /deployment
  /reports
```

Các tài liệu quan trọng:

```text
system-overview.md
business-rules.md
booking-engine.md
conflict-engine.md
security-model.md
ai-architecture.md
rag.md
scheduling-optimization.md
```

---

# 66. GIT / BRANCHING STRATEGY

Khuyến nghị:

```text
main
  stable/release

develop
  integration

feature/*
fix/*
refactor/*
```

Ví dụ:

```text
feature/auth
feature/equipment-core
feature/booking-engine
feature/conflict-engine
feature/maintenance
feature/training
feature/ai-assistant
feature/rag
feature/analytics
```

Không merge feature chưa có tests vào develop nếu có thể tránh.

---

# 67. COMMIT CONVENTION

```text
feat: add equipment availability API
feat: implement booking conflict engine
fix: prevent concurrent double booking
refactor: isolate booking policy service
test: add concurrent booking tests
docs: add booking domain rules
chore: update migration
```

---

# 68. OBSERVED METRICS FOR THE THESIS

Nên thu thập benchmark để có số liệu trong báo cáo.

## Booking Engine

- conflict detection latency;
- successful booking rate;
- rejected booking rate;
- concurrency success behavior.

## Recommendation

- top-1 acceptance;
- top-3 acceptance;
- average recommendation score;
- alternative slot distance.

## RAG

- retrieval precision-like metric;
- citation coverage;
- grounded response rate.

## Optimization

- total schedule delay;
- utilization before/after optimization;
- idle time before/after;
- priority satisfaction.

---

# 69. RECOMMENDED ACADEMIC EXPERIMENTS

Nếu cần chiều sâu nghiên cứu, có thể làm 3 experiment chính.

## Experiment 1 — Conflict Detection

So sánh:

```text
Naive availability check
vs
transaction/locking aware booking engine
```

Đo:

- correctness under concurrency;
- duplicate booking rate;
- latency.

## Experiment 2 — Equipment Recommendation

So sánh:

```text
keyword filter
vs
semantic retrieval
vs
hybrid recommendation
```

Đo:

- top-k relevance;
- user acceptance.

## Experiment 3 — Scheduling Optimization

So sánh:

```text
greedy scheduling
vs
selected optimization algorithm
```

Đo:

- utilization;
- delay;
- conflicts;
- fairness.

---

# 70. RISK REGISTER

## Risk: Scope quá lớn

Mitigation:

- MVP first.
- Feature flags.
- Advanced phase separated.

## Risk: Double booking

Mitigation:

- transaction.
- locking/constraints.
- concurrency tests.

## Risk: AI hallucination

Mitigation:

- RAG.
- citations.
- tool-based data retrieval.
- guardrails.

## Risk: AI provider outage

Mitigation:

- graceful degradation.
- booking works without AI.

## Risk: Database complexity

Mitigation:

- migration discipline.
- ERD review.
- modular domain.

## Risk: Microservice overengineering

Mitigation:

- modular monolith first.

## Risk: Poor data quality

Mitigation:

- seed validation.
- data integrity constraints.
- audit.

---

# 71. WHAT NOT TO DO

1. Không xây AI chatbot trước booking core.
2. Không để frontend tự quyết định availability.
3. Không chỉ check conflict ở frontend.
4. Không dùng một `status` field để biểu diễn toàn bộ lifecycle nếu domain cần nhiều dimensions.
5. Không cho AI gọi DB trực tiếp.
6. Không cho AI tự thay đổi policy.
7. Không làm microservices chỉ để “trông chuyên nghiệp”.
8. Không tạo 50 bảng ngay từ ngày đầu nếu chưa có domain mapping.
9. Không bỏ qua concurrency test.
10. Không hard-code priority.
11. Không ghi file upload bừa vào DB.
12. Không log password/token/API key.

---

# 72. FIRST IMPLEMENTATION ORDER

Nếu bắt đầu dự án ngay, thứ tự chính xác khuyến nghị:

```text
1. Create repository
2. Create architecture docs
3. Define glossary
4. Define actors/use cases
5. Define booking business rules
6. Design ERD
7. Choose DB
8. Setup backend modular monolith
9. Setup migrations
10. Implement auth/RBAC
11. Implement lab/equipment
12. Implement availability engine
13. Implement booking transaction
14. Implement conflict engine
15. Implement approval
16. Implement maintenance/training restrictions
17. Implement check-in/out
18. Implement incidents
19. Implement notifications
20. Implement audit
21. Implement frontend core
22. Implement dashboards
23. Add realtime
24. Add AI Gateway
25. Add tools
26. Add RAG
27. Add recommendations
28. Add optimization
29. Load/concurrency testing
30. Final security hardening
```

---

# 73. INITIAL BACKLOG

## EPIC-01 Identity

- Login.
- Refresh token.
- Logout.
- RBAC.
- User profile.

## EPIC-02 Laboratory

- Campus.
- Building.
- Lab.
- Lab policy.

## EPIC-03 Equipment

- CRUD.
- Capability.
- Specification.
- Documents.
- Status history.

## EPIC-04 Booking

- Availability.
- Create.
- Edit.
- Cancel.
- Approval.
- Conflict.

## EPIC-05 Scheduling

- Alternative slots.
- Alternative equipment.
- Priority.
- Ranking.

## EPIC-06 Operations

- Training.
- Maintenance.
- Calibration.
- Incident.
- Check-in/out.

## EPIC-07 Notification

- In-app.
- Email.
- Reminder.

## EPIC-08 Analytics

- KPI.
- Utilization.
- Conflict.
- No-show.

## EPIC-09 AI

- Assistant.
- Tool calling.
- RAG.
- Recommendation.

## EPIC-10 Advanced

- Forecasting.
- Optimization.
- Anomaly detection.
- IoT.

---

# 74. PRIORITIZATION MATRIX

| Feature | Priority | Reason |
|---|---:|---|
| Auth/RBAC | P0 | Foundation |
| Equipment | P0 | Core domain |
| Availability | P0 | Core domain |
| Booking | P0 | Core domain |
| Conflict Engine | P0 | Main technical problem |
| Concurrency Control | P0 | Correctness |
| Approval | P0 | Real workflow |
| Maintenance | P1 | Real lab operation |
| Training | P1 | Eligibility |
| Incident | P1 | Operation |
| Check-in/out | P1 | Actual usage |
| Notification | P1 | Workflow |
| Audit | P1 | Governance/security |
| Analytics | P1 | Management |
| AI Assistant | P1 | Main differentiator |
| RAG | P1 | AI depth |
| Recommender | P1 | AI/domain integration |
| Optimization | P2 | Research extension |
| Forecasting | P2 | Advanced |
| Predictive maintenance | P2 | Advanced |
| IoT | P3 | Future extension |

---

# 75. ACCEPTANCE CRITERIA FOR THE WHOLE SYSTEM

Hệ thống được xem là đạt core quality khi:

1. Hai người không thể cùng thành công đặt một resource trong cùng một interval nếu resource không cho phép overlap.
2. Booking bị maintenance/calibration chặn đúng cách.
3. User thiếu training bị chặn đúng cách.
4. Permission được enforce ở backend.
5. Booking lifecycle nhất quán.
6. Check-in/out ghi nhận thời gian thực tế.
7. Incident có thể đưa resource vào trạng thái phù hợp theo policy.
8. Notification không làm hỏng booking transaction.
9. Audit log ghi lại mutation quan trọng.
10. Dashboard dùng metric có định nghĩa rõ.
11. AI sử dụng dữ liệu thật từ tool/RAG.
12. AI không vượt permission.
13. AI outage không làm booking core ngừng hoạt động.
14. API và DB có migration/versioning.
15. Các rule quan trọng đều có automated tests.

---

# 76. RECOMMENDED DIRECTORY STRUCTURE

```text
lab-management/
├── README.md
├── PROJECT_BLUEPRINT.md
├── docker-compose.yml
├── .env.example
│
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── ai-service/                 # optional later
│
├── docs/
│   ├── architecture/
│   ├── domain/
│   ├── api/
│   ├── database/
│   ├── adr/
│   ├── ai/
│   ├── scheduling/
│   └── testing/
│
├── infra/
│   ├── docker/
│   └── deployment/
│
├── scripts/
│   ├── seed/
│   └── maintenance/
│
└── tests/
    ├── e2e/
    └── performance/
```

Nếu repository đã có cấu trúc khác, AI phải đọc cấu trúc hiện tại trước khi áp dụng thay đổi.

---

# 77. PROJECT GLOSSARY

| Term | Meaning |
|---|---|
| Resource | Tài nguyên có thể được phân bổ, ví dụ equipment/room |
| Equipment | Thiết bị phòng thí nghiệm |
| Booking | Yêu cầu/đặt lịch sử dụng tài nguyên |
| Conflict | Xung đột lịch hoặc policy |
| Hard Constraint | Ràng buộc bắt buộc |
| Soft Constraint | Ràng buộc dùng để scoring/cảnh báo |
| Eligibility | Điều kiện để user được sử dụng resource |
| Certification | Chứng nhận/đào tạo hợp lệ |
| No-show | Booking đã được duyệt nhưng user không đến theo policy |
| Incident | Sự cố xảy ra với resource |
| Maintenance | Bảo trì |
| Calibration | Hiệu chuẩn |
| Utilization | Mức độ khai thác resource |
| RAG | Retrieval-Augmented Generation |
| Tool Calling | AI gọi chức năng backend có kiểm soát |
| AI Copilot | Trợ lý AI hỗ trợ workflow |
| Source of Truth | Nguồn dữ liệu/hệ thống chịu trách nhiệm cuối cùng |

---

# 78. CANONICAL DESIGN PRINCIPLES

## Principle 1 — Domain First

Thiết kế từ nghiệp vụ, không từ UI.

## Principle 2 — Backend Owns Rules

Frontend chỉ hỗ trợ UX.

## Principle 3 — Database Owns Integrity Where Practical

Những invariant quan trọng phải được bảo vệ càng thấp càng tốt.

## Principle 4 — Transactions for Atomic State Changes

Booking/stock/status transitions phải nhất quán.

## Principle 5 — AI Augments, Never Replaces Core Logic

AI recommendation không thay business rule engine.

## Principle 6 — Explainability

Conflict, recommendation và AI answer nên giải thích được nguồn/nguyên nhân.

## Principle 7 — Auditability

Mutation quan trọng phải trace được.

## Principle 8 — Evolvability

Core architecture phải cho phép thêm optimization/ML/IoT mà không phá domain.

---

# 79. FINAL REFERENCE ARCHITECTURE

```text
                           ┌────────────────────┐
                           │       Users        │
                           │ Student/Lecturer   │
                           │ Technician/Admin   │
                           └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │ Next.js Web / PWA  │
                           └─────────┬──────────┘
                                     │ REST/WebSocket
                                     ▼
                ┌──────────────────────────────────────┐
                │          Spring Boot Backend         │
                │            Modular Monolith          │
                │                                      │
                │ Auth / Users / Labs / Equipment     │
                │ Booking / Scheduling / Maintenance   │
                │ Training / Incidents / Inventory     │
                │ Notification / Audit / Analytics    │
                │ AI Gateway                           │
                └──────────────┬───────────────────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                  ▼
       ┌───────────┐      ┌───────────┐      ┌────────────┐
       │ PostgreSQL│      │   Redis   │      │ Object     │
       │           │      │           │      │ Storage    │
       └───────────┘      └───────────┘      └────────────┘
             │
             ├─────────────────────────────┐
             ▼                             ▼
       ┌─────────────┐               ┌──────────────┐
       │ Outbox/Event│               │ Vector Store │
       │ / Queue     │               │ for RAG      │
       └──────┬──────┘               └──────┬───────┘
              │                             │
              ▼                             ▼
       Notifications /             ┌─────────────────┐
       Calendar / Analytics        │ AI / RAG Layer  │
                                   │ LLM + Tools     │
                                   │ Recommendation  │
                                   └─────────────────┘
```

---

# 80. AI AGENT BOOTSTRAP INSTRUCTION

Đây là instruction có thể dùng làm context cho AI coding agent sau khi repository được tạo:

```text
You are an engineering agent working on the Laboratory Resource Management and Intelligent Scheduling Platform.

Treat PROJECT_BLUEPRINT.md as the primary domain and architecture reference.

Before changing code:
1. Inspect the repository structure.
2. Read the relevant module documentation.
3. Inspect existing database migrations and entities.
4. Inspect API contracts and tests.
5. Identify the affected domain modules.
6. Identify required schema/API/business-rule changes.

Implementation rules:
- Do not bypass backend business rules.
- Do not trust frontend availability checks.
- Do not let the LLM directly modify the database.
- Every booking mutation must pass server-side authorization and conflict validation.
- Preserve transactionality and concurrency correctness.
- Every schema change requires a migration.
- Every important business rule requires automated tests.
- Do not silently introduce breaking API changes.
- Prefer modular monolith boundaries over premature microservices.
- AI features must degrade gracefully when the AI provider is unavailable.
- Use tool calling for live domain data.
- Use RAG for equipment/document knowledge.
- Treat the database/backend as the source of truth.
- Never invent domain data, API fields, DB columns, or business rules when repository evidence is available.
- When requirements are ambiguous, inspect project docs/code/tests first and make the smallest consistent change.
- For dangerous or irreversible operations, require explicit confirmation or an authorization boundary.

For every implementation task, produce:
1. Understanding of the requirement.
2. Affected files/modules.
3. Data model changes.
4. API contract changes.
5. Business rules.
6. Implementation.
7. Tests.
8. Validation results.
9. Any risks or remaining work.
```

---

# 81. FIRST 10 ENGINEERING MILESTONES

## M1 — Repository Foundation

Deliver:

- monorepo structure;
- README;
- blueprint;
- Docker Compose;
- CI skeleton.

## M2 — Identity

Deliver:

- authentication;
- RBAC;
- profile;
- audit login events.

## M3 — Lab & Equipment

Deliver:

- labs;
- equipment;
- capabilities;
- documents;
- status history.

## M4 — Availability Engine

Deliver:

- time interval queries;
- operating hours;
- maintenance blocks;
- eligibility checks.

## M5 — Booking Engine

Deliver:

- create;
- cancel;
- approval;
- conflict detection;
- transaction/concurrency tests.

## M6 — Operational Workflow

Deliver:

- training;
- maintenance;
- incidents;
- check-in/out;
- no-show.

## M7 — Frontend Core

Deliver:

- dashboard;
- equipment;
- calendar;
- booking flow;
- admin.

## M8 — Analytics & Realtime

Deliver:

- KPI dashboard;
- notifications;
- realtime availability.

## M9 — AI Foundation

Deliver:

- AI gateway;
- tool calling;
- equipment search;
- availability assistant.

## M10 — AI/RAG & Research

Deliver:

- RAG;
- recommendation;
- scheduling optimization experiment;
- final benchmarking.

---

# 82. FINAL PROJECT NORTH STAR

Toàn bộ hệ thống phải hướng tới câu hỏi trung tâm:

> **Làm thế nào để khai thác tài nguyên phòng thí nghiệm một cách an toàn, công bằng, hiệu quả và có thể giải thích được?**

Mọi tính năng mới nên được đánh giá theo 5 tiêu chí:

```text
1. Có giải quyết vấn đề nghiệp vụ thật không?
2. Có đảm bảo tính đúng đắn dữ liệu không?
3. Có tăng hiệu quả khai thác tài nguyên không?
4. Có cải thiện trải nghiệm người dùng không?
5. Có thể đo lường/kiểm chứng kết quả không?
```

Nếu câu trả lời là “không” cho phần lớn các tiêu chí trên, tính năng đó không nên được ưu tiên chỉ vì nó “trông hiện đại”.

---

# 83. NEXT DOCUMENTS TO CREATE

Sau blueprint này, thứ tự tài liệu tiếp theo nên là:

```text
01-domain-glossary.md
02-use-cases.md
03-business-rules.md
04-er-diagram.md
05-api-spec.yaml
06-booking-engine-design.md
07-conflict-engine-design.md
08-ai-architecture.md
09-rag-design.md
10-scheduling-optimization.md
11-security-model.md
12-test-strategy.md
13-deployment.md
```

Blueprint này là lớp chiến lược. Các tài liệu trên sẽ là lớp implementation specification.

---

# 84. IMPLEMENTATION STATUS TEMPLATE

Mỗi module nên có trạng thái:

```text
NOT_STARTED
DESIGNING
IN_PROGRESS
CODE_COMPLETE
TESTING
VALIDATED
RELEASED
```

Không đánh dấu `DONE` chỉ vì code compile.

`DONE = acceptance criteria + tests + integration validation`.

---

# 85. CHANGE MANAGEMENT

Mọi thay đổi domain lớn phải cập nhật:

1. Blueprint nếu principle thay đổi.
2. Business rules.
3. ERD/migrations.
4. API contract.
5. Tests.
6. AI tools nếu affected.
7. Documentation/ADR.

Không để code chạy theo một domain model và tài liệu chạy theo model khác.

---

# END OF BLUEPRINT

**Primary objective:** Build a reliable laboratory resource management platform first; make it intelligent through scheduling, recommendation, RAG and analytics; only then add advanced optimization, predictive ML and IoT.
