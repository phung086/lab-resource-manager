# Batch 3 - Canonical Resource Management Report

Ngày xác minh: 2026-09-19
Nguồn sự thật: `PRODUCT.md`, phạm vi đồ án chính thức và các contract đã đóng băng trong Batch 0-2.

## A. Starting Point

- Batch 1 đã đóng: schema canonical, forward migration và PostgreSQL guard hoạt động.
- Batch 2 đã đóng: authentication, bốn role canonical, ownership và lab scope được thực thi ở backend.
- Batch 3 bắt đầu với hai đường quản lý tài nguyên chồng lấn, UI có dữ liệu mô phỏng, API status cũ và năm resource chưa được phân loại.
- Không thay đổi `schema.prisma`, migration hay dữ liệu của development database trong Batch 3.

## B. Skills Used

- Dùng `ui-ux-pro-max` cho tính khả dụng của form, bảng quản trị, error summary, focus, responsive layout và accessibility.
- Không dùng skill thiết kế để redesign toàn cục. Thay đổi UI chỉ phục vụ workflow quản lý tài nguyên canonical.
- Không dùng AI/optimization/Smart Lab để quyết định dữ liệu nghiệp vụ.

## C. Resource Audit

- Audit trước triển khai nằm tại `docs/BATCH3_RESOURCE_AUDIT.md`.
- Development DB tại thời điểm kiểm tra: PostgreSQL 16.14, database `lab_resources`, 9 resources, 2 active laboratories, 3 resources có lab, 6 chưa có lab.
- Năm resource bắt buộc giữ nguyên `category = NULL` đã được xác minh lại sau triển khai.
- `Resource.operationalStatus` là trạng thái vận hành authoritative; `Resource.status` chỉ còn là compatibility projection khi ghi.
- Availability theo thời gian được suy ra từ trạng thái vận hành, booking và maintenance; `RESERVED` không phải trạng thái vật lý.

## D. Canonical API

| Method | Endpoint | Access | Persistence |
|---|---|---|---|
| GET | `/api/resources` | Public catalog policy đã đóng băng ở Batch 2 | PostgreSQL |
| POST | `/api/resources` | `ADMIN`, `LAB_STAFF` theo lab scope | PostgreSQL + audit |
| GET | `/api/resources/:id` | Public catalog policy đã đóng băng ở Batch 2 | PostgreSQL |
| PATCH | `/api/resources/:id` | `ADMIN`, `LAB_STAFF` theo lab scope | PostgreSQL + audit |
| PATCH | `/api/resources/:id/operational-status` | `ADMIN`, `LAB_STAFF` theo lab scope | Transaction + history + audit |
| POST | `/api/resources/:id/retire` | `ADMIN`, `LAB_STAFF` theo lab scope | Non-destructive + history + audit |
| GET | `/api/resources/:id/schedule` | Public schedule, không lộ requester identity | PostgreSQL |
| GET | `/api/resources/:id/history` | Authenticated | PostgreSQL |
| GET | `/api/laboratories` | Authenticated, role-scoped | PostgreSQL |
| GET | `/api/laboratories/:id` | Authenticated, role-scoped | PostgreSQL |
| POST/PATCH | `/api/laboratories[/:id]` | `ADMIN` | PostgreSQL |

API cũ `PATCH /api/resources/:id/status` không còn là contract canonical. Payload giả lập và field derived/immutable bị strict validation từ chối.

## E. Taxonomy

- Assignment-level category: `ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`, `MATERIAL`.
- Technical subtype: `ROOM`, `GPU_SERVER`, `RASPBERRY_PI`, `UAV`, `CAMERA`, `KIT`, `MATERIAL`, `OTHER`.
- Category và subtype là hai chiều độc lập; subtype không tự suy đoán category.
- Create cho phép category chưa xác định; review category là thao tác explicit của người có quyền.

## F. Operational Status Authority

- Canonical states: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE`.
- Mọi status change quan trọng chạy trong transaction, khóa row bằng PostgreSQL và ghi `ResourceStatusHistory` cùng `UsageLog`.
- `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE` yêu cầu lý do.
- Resource đã `RETIRED` chỉ `ADMIN` được phục hồi và phải có lý do.
- Compatibility `Resource.status` được chiếu từ `operationalStatus`, không được nhận trực tiếp từ API canonical.

## G. CRUD Result

- List, detail, create và update dùng Prisma/PostgreSQL thật.
- Mã resource được normalize, kiểm tra định dạng và unique ở database.
- Request body dùng Zod strict schema; field không thuộc contract bị từ chối.
- Update tăng version, ghi changed fields và không báo thành công trước khi transaction hoàn tất.
- Không có hard-delete endpoint.

## H. Archive And Retirement

- “Xóa” trong UI được thay bằng “Ngừng khai thác”.
- Retire đặt `operationalStatus = RETIRED`, giữ nguyên booking, maintenance, incident, usage và history.
- Retired resource vẫn tra cứu được và hiển thị trạng thái thật.

## I. Laboratory Scope

- `ADMIN`: xem và quản lý mọi lab/resource.
- `LAB_STAFF`: chỉ tạo, sửa, đổi trạng thái hoặc retire resource trong lab được gán.
- Staff không thể dùng path, body hay đổi lab để vượt scope; cả lab nguồn và lab đích đều được kiểm tra.
- `LECTURER`, `STUDENT`: catalog/detail/schedule read-only; không có action quản trị.
- Lab create/update thuộc `ADMIN`; không mở rộng tenant hoặc organization model.

## J. Unresolved Classification

Năm mã sau vẫn có `category = NULL`, không được Batch 3 tự đoán:

1. `CAM-D435I-01`
2. `EDGE-RPI5-01`
3. `RPI-KIT-05`
4. `UAV-M350-RTK-01`
5. `UAV-MATRICE-300`

UI hiển thị “Chưa phân loại”; admin có thể lọc `classification=UNRESOLVED`, mở form review và lưu quyết định có audit.

## K. Search And Filtering

- Search thực hiện ở backend trên code, name, description, location và laboratory name.
- Filter hỗ trợ laboratory, category, subtype, operational status, unresolved classification và derived availability.
- Availability interval dùng quy ước half-open `[from,to)` và giới hạn tối đa 180 ngày.
- Response hiện giới hạn 250 rows; chưa có cursor pagination.

## L. History

- Timeline tổng hợp dữ liệu đã persisted từ status history, usage log, booking, maintenance và incident.
- Mỗi entry có timestamp, event type, source, reference và actor khi database có actor.
- Không sinh activity giả để lấp empty state.

## M. Schedule

- Schedule trả booking và maintenance thật trong interval yêu cầu.
- Derived availability chỉ dùng active booking states và blocking maintenance states.
- Public schedule không trả tên/email/requester identity.

## N. RBAC And IDOR Verification

- Mutation routes bắt buộc JWT và role ở backend.
- Resource ID được resolve ở database trước khi kiểm tra staff lab scope.
- Staff cross-lab create/update/status/retire trả `403`.
- Student/Lecturer mutation trả `403`; unauthenticated mutation trả `401`.
- Frontend visibility chỉ là UX; không được dùng thay authorization.

## O. Frontend Result

- Một `ResourceManagementView` API-driven phục vụ cả catalog và management mode.
- Student/Lecturer có cards read-only; staff/admin có bảng và action phù hợp scope.
- Create/edit/status/retire giữ form khi API lỗi và chỉ hiện success sau response thành công.
- Detail tải song song resource, schedule và history thật.
- Header không còn trạng thái telemetry giả; AI Copilot chỉ render khi `VITE_ENABLE_RESEARCH_FEATURES=true`.
- Desktop và mobile đã được kiểm tra bằng Playwright screenshot; bộ lọc không bị cắt và mobile dùng navigation ngang.

## P. Accessibility

- Form controls có label; icon actions có accessible name và tooltip.
- Error summary dùng `role=alert` và được focus khi submit thất bại.
- Modal focus vào nút đóng khi mở và phục hồi focus khi đóng.
- Focus-visible được giữ cho input, select và action button.
- Table có caption; status không chỉ dựa vào màu.

## Q. Backend Tests

| Gate | Result |
|---|---|
| Batch 3 integration | PASS, 9/9 |
| Core unit/contract | PASS, 27/27 |
| Batch 2 auth/RBAC integration | PASS, 10/10 |
| Batch 1E isolated runtime | PASS, 11/11 |
| Batch 1D persistence + real concurrency | PASS, 2/2 |

Batch 3 tests bao phủ list/detail/filter, CRUD validation, duplicate code, role/lab scope, IDOR, status authority/history, retirement/restore, classification review, schedule/history và laboratory visibility.

## R. Frontend E2E

- Batch 3 resource E2E: PASS cho `STUDENT`, `LECTURER`, `LAB_STAFF`, `ADMIN`.
- Batch 2 auth E2E regression: PASS cho unauthenticated và bốn role canonical.
- Đã xác minh reload persistence, duplicate API error giữ form, foreign-lab control disabled và backend vẫn từ chối IDOR.
- Frontend production build: PASS; còn warning bundle chính lớn hơn 500 kB.

## S. Mock And Duplicate Cleanup

- Xóa `ResourceView` legacy 269 dòng đã không còn caller.
- Xóa `LabFloorplan.jsx` trùng lặp đã được chứng minh không còn import; bản TSX nghiên cứu được giữ.
- Thay admin resource screen hardcoded bằng canonical API view.
- Thay modal detail/status có telemetry và gợi ý giả bằng dữ liệu persisted và form generic.
- Không có fallback mock hoặc fake success trong workflow Batch 3.

## T. Regression And Production Smoke

- Production config smoke trên isolated Batch 3 DB: `/health` 200, `/health/ready` 200 với PostgreSQL probe thật.
- Helmet headers hiện diện; explicit allowed origin nhận CORS header; origin ngoài allowlist nhận 403.
- Development DB hậu kiểm: 5 users, 9 resources, 5 null categories, 8 applied migrations.
- Không chạy reset, `db push`, hard delete hay migration mới.

## U. Known Limitations

- List đang dùng hard cap 250 thay vì cursor pagination.
- `ResourceStatusHistory.changedById` là scalar hiện hữu, chưa có foreign key; actor cũ có thể hiển thị `null` nếu user không còn tồn tại.
- Lab create/update chưa có audit model chuyên biệt trong schema hiện tại; không mở schema trong Batch 3.
- Generic resource mutation audit dùng `UsageLog.STATUS_CHANGE` vì enum audit hiện tại chưa có event riêng cho resource metadata.
- Header/app shell và nhiều module optional vẫn mang ngôn ngữ thiết kế cũ; Batch 3 không phải redesign toàn hệ thống.
- Vite báo main bundle khoảng 641 kB minified; code splitting được để lại như performance debt.

## V. Optional And Research Debt

- 11 test optional/research tham chiếu module không còn tồn tại vẫn không phải blocker của core.
- Các module đó phải được xử lý trong batch riêng theo một trong bốn quyết định: `RESTORE`, `REWRITE`, `FEATURE_FLAG`, `RETIRE`.
- `Digital Twin`, Pareto, GA/NSGA-II, simulation và research components được giữ, không được nối vào resource contract canonical.
- `QuickBookingModal` và payment UI cũ thuộc Batch 4/optional review, không được Batch 3 âm thầm sửa lifecycle booking.

## W. Files Changed In Batch 3

### Backend

- `backend/package.json`
- `backend/scripts/seedBatch3E2E.mjs`
- `backend/src/app.js`
- `backend/src/constants/resources.js`
- `backend/src/middleware/labScope.js`
- `backend/src/routes/laboratories.js`
- `backend/src/routes/resources.js`
- `backend/src/services/resourceService.js`
- `backend/test/batch1e/integration.runtime.test.js`
- `backend/test/batch1e/postcutover.smoke.test.js`
- `backend/test/batch2.auth-rbac.integration.test.js`
- `backend/test/batch3.resource-management.integration.test.js`
- `backend/test/helpers/batch3Database.js`

### Frontend

- `frontend/package.json`
- `frontend/src/App.jsx`
- `frontend/src/components/AdminResourceManagementView.tsx`
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/BaseModal2026.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/LabFloorplan.jsx` (removed; duplicate/dead)
- `frontend/src/components/ResourceDetailsModal.tsx`
- `frontend/src/components/ResourceManagementView.tsx`
- `frontend/src/components/ResourceStatusModal.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/styles.css`
- `frontend/test_batch3_resources_e2e.mjs`

### Documentation

- `docs/BATCH3_RESOURCE_AUDIT.md`
- `docs/BATCH3_RESOURCE_MANAGEMENT_REPORT.md`

## X. GO / NO-GO For Batch 4

**GO for Batch 4 - Booking Calendar and Required Booking Workflow.**

Điều kiện giữ nguyên khi bắt đầu Batch 4:

- Không thay `operationalStatus` bằng scheduling state.
- Booking availability phải tiếp tục được suy ra theo thời gian và dựa vào PostgreSQL overlap guard.
- Không đổi năm unresolved categories nếu chưa có quyết định review thật.
- Không biến payment thành trạng thái bắt buộc.
- Optional/research tests không được phục hồi bằng implementation giả và không được chặn core workflow.
