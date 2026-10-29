# Đề xuất cải thiện component (proposals only) — 23/10/2026

Phạm vi: chỉ đọc source + ghi báo cáo. Không sửa app/config/contract/schema/migration,
không commit/push/merge/deploy. Mọi mục dưới đây là **đề xuất**, cần Codex review
severity/rootcause/options/tradeoffs/regression/acceptance/risks trước khi triển khai.

Phân biệt bằng chứng: **[ĐO]** = quan sát trực tiếp từ source/grep đã chạy;
**[SUY]** = suy luận từ source, chưa có kiểm chứng runtime.

---

## P-01 — Audit logs: cắt dọc backend đã sẵn sàng, frontend chưa có (đề xuất ưu tiên 1)

**Quan sát [ĐO]**
- `backend/src/routes/auditEvents.js`: `router.get("/", requireAuth, requireRole(ADMIN, LAB_STAFF), …)` với zod `.strict()` cho `page, limit(≤100), action, targetType, targetId, actorId, labId, resourceId, from, to`.
- `backend/src/services/systemAuditService.js`: 16 `AUDIT_ACTIONS` (USER_CREATED, ACCOUNT_CREDENTIAL_CHANGED, RESOURCE_PRICING_CHANGED, PAYMENT_CHARGE_CREATED, PAYMENT_RECONCILIATION_RESOLVED…), 7 `AUDIT_TARGET_TYPES`, `sanitizeAuditData` loại key `password|secret|token|otp|codeHash|hash`, staff scope theo `userLabAssignment`, `NO_ASSIGNED_LABS` fail-closed, 403 khi `labId` ngoài scope, phân trang `page/limit/skip`.
- `frontend/src/workspaceRoutes.js`: **không có key `logs`** ⇒ `isTabEnabled('logs')` (`frontend/src/config/featureFlags.ts`) luôn `false` ⇒ item "Audit logs" (`frontend/src/components/Sidebar.tsx:59`, gate `role === 'ADMIN'` ở dòng 65) không bao giờ hiện.
- `frontend/src/App.jsx`: không có nhánh render `activeTab === 'logs'`; `frontend/src/components/AppLayout.tsx:170` khai báo `tabTitles.logs` thừa.
- Grep `/audit-events` trên toàn `frontend/`: **0 consumer**. Đây là vùng backend duy nhất 0 consumer (đối chiếu: `users` 8, `loyalty` 4, `lab-workspace` 3, `booking-pricing` 4, `notifications` 3, `calendar` 3, `laboratories` 4, `address` 1, `guest-booking` 1).

**Vì sao đáng ưu tiên**: backend đã làm đúng phần khó (RBAC theo LAB assignment, sanitize secret, phân trang, filter). Phần còn thiếu là UI thuần + wiring, rẻ rủi ro nhất trong danh sách, và biến một API đã có quyền đọc thành tính năng *thấy được*.

**Phương án đề xuất (2 lựa chọn để Codex chọn)**
- **P-01a — màn "Nhật ký hệ thống" riêng** (khớp `tabTitles.logs` đã có sẵn): thêm key `logs` vào `WORKSPACE_ROUTES` + nhánh render trong `App.jsx` + `services/auditEvents.ts` + `hooks/useQueuePage.ts` (lọc action/targetType/labId/date range, phân trang server-side). Khớp ADR-022/SRS dòng 338 (ADMIN đọc toàn hệ thống, LAB_STAFF đọc theo LAB được phân công).
- **P-01b — nhúng vào màn "Quản trị" hiện có** (`admin_management`), không thêm route mới: 1 tab con, giữ `Sidebar` không đổi (bỏ item chết hoặc giữ và trỏ về tab con).

**Rủi ro cần lưu ý**: `Sidebar` hiện gate `logs` là `role === 'ADMIN'` — nếu chọn P-01a thì phải đổi gate sang `staff` (ADMIN+LAB_STAFF) để khớp RBAC API, nếu không sẽ lệch "UI chặn / API cho phép" (vi phạm nguyên tắc "không coi route hiding là authorization").

**Acceptance (đề xuất)**: ADMIN và LAB_STAFF thấy cùng màn; LAB_STAFF chỉ thấy event thuộc LAB được phân; filter theo `action`/`targetType`/`labId`/khoảng thời gian trả đúng tập; phân trang khớp `total`; CUSTOMER vào thẳng URL vẫn bị chặn ở server (không chỉ ẩn nút); không render bất kỳ trường chứa `password|secret|token|otp|hash`; VI/EN đủ nhãn.

**Gate có sẵn để dùng**: `frontend/test_workspace_navigation_ui.mjs`, `test_role_workspaces_ui.mjs`, `test_queue_pagination_ui.mjs`; kèm `.qa/evidence/audit-reads/*` (13 + 18 assertion API đã PASS) làm baseline hành vi server.

---

## P-02 — Home theo vai trò: làm sâu khác biệt ADMIN / LAB_STAFF / CUSTOMER

**Quan sát [ĐO]** (`frontend/src/components/features/workspace/`): `StaffHome.tsx` 577 dòng, `CustomerHome.tsx` 446, `AdminHome.tsx` 248, cùng `WorkspaceTrends.tsx` 31, `HomeComponents.tsx` 31, `homeSelectors.ts`, `homeTypes.ts`. `frontend/src/pages/WorkspaceHome.tsx` chỉ 50 dòng (dispatch).

**Đề xuất**: mỗi role-home nên có 3 tầng rõ ràng: *việc cần tôi làm hôm nay* / *cảnh báo vận hành* / *trạng thái hệ thống*. Hiện tại `homeSelectors.ts` là nguồn chọn dữ liệu dùng chung — đề xuất mở rộng nó thành selector theo vai trò thay vì nhân bản logic trong từng `*Home.tsx`.

**Acceptance**: 3 role, 2 ngôn ngữ, 2 viewport; mỗi home có ít nhất 3 khối dữ liệu khác nhau theo vai trò; số liệu khớp API nguồn; không hiện phần chưa có quyền.

**Gate**: `test_role_workspaces_ui.mjs`, `test_operations_report_ui.mjs`.

---

## P-03 — Tách các surface quá lớn (kỹ thuật + điểm chấm "chất lượng dự án")

**Quan sát [ĐO]** (số dòng `wc -l`): `QuickBookingModal.tsx` 723 (khoảng 20 `useState`), `ResourceManagementView.tsx` 631 (3 mục quản trị, khoảng 20 state), `PublicResourceCatalog.tsx` 555, `ResourceDetailPage.tsx` 514, `MaintenancePage.tsx` 236.

**Đề xuất**: theo đúng pattern sẵn có của repo (`src/services/` + `src/hooks/useQueuePage.ts`), tách:
- `QuickBookingModal.tsx` → `services/bookingDraft.ts` (state form + biến đổi payload) + `components/booking/*` (bước chọn tài nguyên / lịch / xác nhận).
- `ResourceManagementView.tsx` → 3 view con theo mục đã có, dùng chung `useQueuePage`.
- `ResourceDetailPage.tsx` / `PublicResourceCatalog.tsx` → tách phần *fetch + map DTO* ra `services/`, phần *render* giữ trong page.

**Acceptance**: file mới ≤ ~350 dòng; không đổi hợp đồng API, không đổi text i18n đã có; `npm run test:required` (locale/API test, lint, typecheck/build) xanh; gate UI cũ vẫn xanh.

**Gate**: `test_resource_catalogue_ui.mjs`, `test_resource_dossier_ui.mjs`, `test_incident_validation.mjs`.

---

## P-04 — Mở các surface đang bị feature flag ẩn (payments / monitoring / AI assistant)

**Quan sát [ĐO]**: `frontend/src/config/featureFlags.ts` chỉ bật `monitoring` khi `TELEMETRY_FEATURES_ENABLED` và `payments` khi `PAYMENT_FEATURES_ENABLED`; backend mount `/api/payments` và `/api/assistant` cũng là **conditional** trong `backend/src/app.js`. Build mặc định ⇒ người đánh giá mở app không thấy thanh toán/telemetry/AI assistant.

**Đề xuất [SUY]**: hoặc (a) mặc định bật trong bản demo/đánh giá với dữ liệu thật, hoặc (b) thêm một "bản tính năng" trên UI để bật/tắt và hiển thị trạng thái, hoặc (c) ít nhất đưa các màn này vào tài liệu/screenshot đánh giá. Cần ràng buộc cụ thể: bật flag cũng phải bật route mount phía backend cùng lúc.

**Rủi ro**: bật `payments` mở ra luồng ghi (charge/receipt) — trên demo đang có giới hạn "không business write". Đề xuất chỉ bật ở môi trường QA tách biệt.

**Gate**: `test_support_ui.mjs`, `test_operations_report_ui.mjs` + kiểm `npm run test:required`.

---

## P-05 — Độ mỏng của vài vùng backend (đề xuất kiểm chứng trước khi đầu tư)

**Quan sát [ĐO]**: `address` và `guest-booking` mỗi đúng 1 consumer phía frontend. **Lưu ý đo lường**: con số "0 consumer" trước đó được suy ra từ *tên service module*, không phải từ path — path-level cho thấy `/dashboard` và `/loyalty` **có** xuất hiện ở frontend. Vì vậy các vùng "mỏng" chỉ nên coi là **danh sách nghi cứu**, chưa phải kết luận.

**Đề xuất**: trước khi đầu tư, đo tiêu chí *độ dày nghiệp vụ* (số route/service trên một miền) thay vì *số consumer*: guest-booking, address, loyalty, lab-workspace, notifications, planning. Miền nào mỏng và giá trị nghiệp vụ cao thì đưa vào đề xuất tiếp.

---

## Thứ tự đề xuất theo vài tuần còn lại

| # | Hạng mục | Rủi ro | Chi phí ước tính | Giá trị chấm điểm |
|---|---|---|---|---|
| 1 | P-01 audit (chọn a hoặc b) | Thấp–TB (RBAC gate) | Nhỏ–TB | Cao: biến API sẵn có thành màn thấy được, khớp SRS/ADR |
| 2 | P-02 home theo vai trò | Thấp | TB | Cao: ra quy trình thực tế (nghiệp vụ lab) |
| 3 | P-03 tách file lớn | Thấp (refactor) | TB | TB–Cao: cấu trúc dự án, khả năng bảo trì |
| 4 | P-04 mở flag surface | TB (mở luồng ghi) | Nhỏ (nếu chỉ bật ở QA) | Cao (perceived capability) |
| 5 | P-05 khảo sát độ mỏng | Chỉ đọc | Nhỏ | Trung bình |

**Ranh giới**: không đề xuất thay đổi role/status chuẩn, không `db push`, không thêm router/store/locale song song, không sửa migration đã áp dụng.
