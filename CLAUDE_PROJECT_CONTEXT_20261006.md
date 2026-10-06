# Bàn giao toàn bộ ngữ cảnh — Lab Resource Manager

Ngày đối chiếu: **2026-10-06, Asia/Saigon**. Bản bàn giao dành cho Claude và
người tiếp tục đồ án, gồm sản phẩm, nghiệp vụ, kiến trúc, lịch sử, GitHub,
working tree local, UX, kiểm thử, tích hợp, runtime và việc còn lại.

Đây là bản đồ để đọc dự án, không thay thế SRS, quy tắc hoặc source. Trạng thái
GitHub đã kiểm tra qua Git fetch và GitHub connector. Các kết quả test local
được dẫn từ lần chạy đã ghi nhận; không chạy lại toàn bộ regression trong lần
bàn giao tài liệu này. Nội dung credential thật và database dump không được đưa vào.

## 1. Mục tiêu đồ án và cách hiểu sản phẩm

Lab Resource Manager là ứng dụng quản lý quyền tiếp cận và vận hành tài nguyên
dùng chung trong trường đại học/phòng thí nghiệm. Sinh viên và giảng viên tìm
phòng/thiết bị phù hợp, xem lịch, kiểm tra điều kiện, gửi yêu cầu và theo dõi việc
sử dụng. Nhân viên LAB và admin duyệt, bàn giao, nhận trả, quản lý tài nguyên,
bảo trì, sự cố, vật tư, tài khoản và lịch sử.

Luồng trung tâm: **tìm tài nguyên → xem lịch/eligibility → đặt lịch → duyệt nếu
cần → bàn giao → sử dụng → trả → hoàn tất → lịch sử/audit**. Thanh toán phụ thuộc
policy và cấu hình, không mặc định bắt buộc cho mọi booking. AI chỉ hỗ trợ tra
cứu/giải thích/gợi ý, không thay quyền quyết định hoặc backend rules.

Đồ án có cả phần Open LAB cho người ngoài, học phần, monitoring và nghiên cứu.
Không biến tất cả module có trong repository thành core hoặc thành tính năng đã
triển khai thực tế. Ưu tiên: correctness → security → business rules → data
integrity → UX → monitoring → AI → optimization → experimental features.

Nguồn: [SRS](srs.md), [PRODUCT](../PRODUCT.md),
[hướng dự án](PROJECT_DIRECTION.md), [bài toán/closure](FINAL_ASSIGNMENT_CLOSURE_AUDIT.md).

## 2. Nguồn thẩm quyền và quy trình làm việc

Đọc [AGENTS](../AGENTS.md), rồi theo đúng Mandatory Reading Order:
`.agent/PROJECT_RULES.md` → `INSTRUCTOR_BASELINE.md` → `DEVELOPMENT_WORKFLOW.md`
→ `docs/srs.md` → `convention.md` → `PROJECT_STRUCTURE.md` → `CURRENT_STATE.md`
→ `DECISIONS.md` → guideline frontend/backend → báo cáo liên quan → Prisma schema
khi đụng persistence.

Khi mâu thuẫn: đề bài tốt nghiệp chính thức → yêu cầu giảng viên/IOC → SRS →
PRODUCT → kiến trúc/hợp đồng đã duyệt → báo cáo verified → implementation →
reference/template → đề xuất agent. Các PDF giảng viên nằm trong `docs/instructor/`.

Mỗi task: inspect → đọc → chốt phạm vi → đọc implementation → sửa coherent nhỏ
→ test phù hợp → review diff → cập nhật tài liệu cần thiết → báo giới hạn → dừng
ở phạm vi được giao. Không tự suy ra Batch 9/10 hoặc bắt đầu một Batch mới.

## 3. Local và GitHub đang khác nhau thế nào

Repository: https://github.com/phung086/lab-resource-manager (public).

| Nơi | Revision/nhánh tại lúc đối chiếu | Ý nghĩa |
|---|---|---|
| `C:/Projects/lab-resource-manager` | `codex/lab-workspace-ui-draft`, HEAD `43b18328f80a1297c236b69e5496cc8afce86d72` | Nơi sửa hiện tại; chứa nhiều thay đổi chưa commit |
| GitHub `main` | `a5472d480971293394c79a91eb142ef27c69fc6e` | Merge PR #22, code đã xuất bản |
| `C:/Projects/lab-resource-manager-main` | detached `a5472d4` | UI main để so sánh; chỉ package scripts có sửa local cho runtime chung |
| `C:/Users/Admin/.codex/worktrees/ebb8/lab-resource-manager` | detached `790727c` | Worktree cũ, không phải source UI hiện tại ở 5173 |

**PR #22 đã merge**, ngày `2026-10-05T15:45:16Z` (22:45 giờ Việt Nam).
Title vẫn chứa chữ Draft và body giữ một số câu trước merge; trạng thái merged
trong metadata là kết quả hiện tại. Nhánh `origin/codex/lab-workspace-ui-draft`
đã xóa; local branch vẫn còn và cấu hình upstream cũ có thể hiện gone.
Không coi PR này là draft đang mở hoặc tự push để khôi phục branch remote.

`HEAD...origin/main` có 0 commit riêng phía local, 1 commit merge phía main.
`git diff HEAD origin/main` rỗng: **cây code đã commit giống nhau**. Tuy vậy,
working tree local khác main đáng kể. Trước khi thêm tệp bàn giao, Git ghi nhận
111 entry thay đổi/untracked; tracked diff với main có 61 file, cộng nhiều file
untracked. Các con số này là snapshot, phải kiểm tra lại trước khi sửa/commit.

GitHub search tại lúc đối chiếu không có PR đang mở và không có issue đang mở.
Backlog thật vẫn có trong repository; không có issue mở không có nghĩa hết việc.
Mọi tuyên bố về tip mới nhất sau ngày này cần fetch/query lại.

Nguồn: [PR #22](https://github.com/phung086/lab-resource-manager/pull/22),
[main snapshot](https://github.com/phung086/lab-resource-manager/tree/a5472d480971293394c79a91eb142ef27c69fc6e),
[GitHub evidence JSON](../artifacts/claude-context-20261006/github-evidence.json),
[local inventory JSON](../artifacts/claude-context-20261006/local-inventory.json).

## 4. Hợp đồng nghiệp vụ phải giữ

### Vai trò và phạm vi

| Role | Trách nhiệm/quyền |
|---|---|
| `ADMIN` | Quản trị toàn hệ thống: tài khoản, phân công LAB, tài nguyên, policy và vận hành |
| `LAB_STAFF` | Vận hành chỉ các LAB được giao qua `UserLabAssignment`; chưa phân công thì fail closed |
| `LECTURER` | Booking của mình và giám sát nhóm học phần được giao; không tự có quyền nhân viên LAB |
| `STUDENT` | Booking/hoạt động học phần của mình, nhóm có membership |

Khách Open LAB vẫn là role `STUDENT`; `customerType=EXTERNAL` là phân loại
nghiệp vụ, không phải role mới hoặc chứng nhận quyền lợi. Backend kiểm tra user
hiện tại/active, role, ownership và scope cho mỗi thao tác nhạy cảm.

### Booking và tài nguyên

- `BookingStatus`: `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`,
  `COMPLETED`, `REJECTED`, `CANCELLED`.
- `NO_SHOW` là outcome/event; không thêm vào BookingStatus.
- Khoảng thời gian `[startAt,endAt)`. Chống overlap có bảo vệ PostgreSQL;
  precheck ở frontend/service không thay database constraint/locking.
- Scheduling dùng `Asia/Ho_Chi_Minh`/UTC+07, không dùng timezone máy trình duyệt
  để quyết định working hours, weekend hoặc booking dates.
- `OperationalStatus`: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `CALIBRATION`,
  `BROKEN`, `RETIRED`, `OFFLINE`. `Resource.operationalStatus` là thẩm quyền vật lý.
- `Resource.status` chỉ compatibility. Availability tính từ physical status,
  lịch đặt, maintenance và policy; reserved không phải trạng thái vật lý.
- Category: `ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`, `MATERIAL`.
  Technical subtype tách biệt; category chưa xác định phải được quyết định thật.
- Handover có condition-before/actor/timestamp; return có condition-after.
  Checkout AVAILABLE → IN_USE và return IN_USE → AVAILABLE phải transactionally
  đúng. Không ghi đè BROKEN/MAINTENANCE/CALIBRATION/RETIRED/OFFLINE khi trả.
- Owner có luồng self-return riêng cho ROOM; đó là khai báo của owner, không phải
  bằng chứng kiểm tra vật lý của staff. Thiết bị vẫn theo quy trình staff.

### Các phần liên quan

- Calendar public chỉ projection an toàn; không lộ người đặt, tiêu đề riêng hay
  operational notes. History riêng giữ authorization, không giả empty khi gặp 403.
- Training/certification và policy được kiểm tra tại server khi đặt.
- Queue booking/incident có server pagination và tổng scope đầy đủ. Legacy
  không có `page` vẫn giữ capped array contract. Đừng lấy page length làm tổng.
- Stock ledger có receipts/issues/adjustments, idempotency và nonnegative
  balance; staff lab-scoped, inventory adjustment thuộc admin.
- Course groups là giám sát học thuật. Lecturer endorsement không thay staff
  approval, handover hoặc return.
- Maintenance đổi lịch phải preview/recheck conflict và có lý do; kết thúc job
  không tự chứng nhận an toàn vật lý.
- Audit append-only và coupled transaction; không tự xóa evidence/historical data.

Chi tiết: [SRS](srs.md), [decisions](DECISIONS.md),
[backend guideline](BACKEND_GUIDELINE.md), [ERD](DB-erd/core-erd.md).

## 5. Kiến trúc và bản đồ source

React 19/Vite 6, JS/JSX và TS/TSX; Node.js/Express 4, Prisma 6, PostgreSQL 16.
Package manifests/locks là nguồn version cụ thể. `frontend/`, `backend/` là
logical equivalent của `code/frontend/`, `code/backend/` trong mẫu giảng viên;
không chuyển thư mục hoặc đổi Next.js/NestJS/Java theo template tham khảo.

Frontend: page/view → feature/base component → service/API wrapper → API.
Backend: HTTP route → middleware → service → Prisma/database.

| Phần | Entry point và nơi đọc chính |
|---|---|
| Khởi tạo UI/session/routing | `frontend/src/main.jsx`, `App.jsx`, `workspaceRoutes.js`, `api.js` |
| Public landing/register | `components/PublicLanding.tsx`, `PublicShell.tsx`, public catalogue và guest booking components |
| Workspace/header/menu | `components/AppLayout.tsx`, `Header.tsx`, `Sidebar.tsx` |
| Home theo role | `pages/WorkspaceHome.tsx`, `components/features/workspace/` |
| Catalogue/dossier | `ResourceManagementView.tsx`, `ResourceDetailsModal.tsx`, `PublicResourceCatalog.tsx` |
| Lịch và booking | `SmartCalendarView.tsx`, `components/calendar/`, `pages/operations/`, `components/features/operations/` |
| Profile/vật tư/học phần/bảo trì | `pages/ProfilePage.tsx`, `LabWorkspace.tsx`, `MaintenancePage.tsx` |
| Monitoring/report | `pages/monitoring/MonitoringDashboardPage.tsx`, `components/features/monitoring/`, `services/monitoring.ts` |
| AI UI | `components/features/assistant/`, `AssistantLauncher.tsx`, `LaboratoryAssistant.tsx` |
| VI/EN | `providers/LocaleProvider.tsx`, `i18n.js`, `locales/catalog/{vi,en}.json`, `locales/manifest.js` |
| API server | `backend/src/server.js`, `app.js`, `config.js`, `middleware/` |
| Booking/policy/eligibility | `routes/bookings.js`, `calendar.js`; `services/bookingService.js`, `availabilityService.js`, `policyEngine.js`, `trainingEligibilityService.js` |
| Resources/media/history | `routes/resources.js`, `resourceMedia.js`; corresponding `resource*Service.js` |
| Scope/account/audit | `routes/auth.js`, `users.js`, `auditEvents.js`; middleware, `userService.js`, `systemAuditService.js` |
| Guest/payment | `routes/guestBooking.js`, `address.js`, `bookingPricing.js`, `payments.js`; corresponding services/providers |
| Operations/support | `maintenance.js`, `labWorkspace.js`, `notifications.js`, `incidents.js`, `dashboard.js`; corresponding services and `workspaceQueueService.js` |
| Monitoring/hardware | `routes/telemetry.js`; `telemetryService.js`, `telemetryIdentityService.js`, `monitoringAlertService.js`, `cameraService.js` |
| MCP/assistant | `backend/src/assistant/`, `routes/assistant.js`, docs AI_ASSISTANT_MCP/SETUP |
| Persistence | `backend/prisma/schema.prisma`, `migrations/`, reviewed `baseline/` |
| Test/runtime | `backend/test/`, `frontend/test_*.mjs`, `.github/workflows/`, Compose/Dockerfiles, `ops/`, `infra/` |

API mount list tại `backend/src/app.js`: `/api/auth`, `/address`, `/guest-booking`,
`/users`, `/audit-events`, `/resources`, `/laboratories`, `/calendar`, `/bookings`,
`/booking-pricing`, `/maintenance`, `/lab-workspace`, `/dashboard`, `/notifications`,
`/incidents`, `/telemetry`; `/payments` và `/assistant` có feature/config gates.
MCP là authenticated read boundary riêng. Xem actual route files để lấy endpoint,
method, schema; không suy ra API chỉ từ tên component hoặc danh sách trên.

Các model chính: Campus/Building/Laboratory/LabPolicy; User/UserLabAssignment;
Resource/ResourceMedia/ResourceCapability/ResourceStatusHistory;
TrainingCourse/TrainingRequirement/UserCertification;
Booking/MaintenanceWindow/UsageLog/Notification/Incident;
StockItem/StockMovement; TeachingGroup/Membership/Activity;
ResourcePricingRule/PaymentTransaction/SystemAuditEvent;
TelemetrySample/Source, thresholds, MonitoringAlert, Camera/CameraAccessAudit.
Schema cũng có model optional/research; sự tồn tại của model không chứng minh
luồng đang active, dữ liệu thật hoặc backend đã tích hợp đầy đủ.

## 6. Persistence và deploy

Giữ historical applied migration bất biến. Không `prisma db push`, không sửa
`_prisma_migrations` thủ công, không bypass checksums. Dùng npm scripts canonical
trong `backend/package.json`, đặc biệt `db:migrate` gọi
`scripts/deployCanonicalMigrations.mjs`.

ADR-021 supersedes hướng fresh-install của các báo cáo Batch 7 cũ: empty DB dùng
reviewed frozen baseline `20260924000100_clean_baseline`, kiểm tra artifact và
PostgreSQL fingerprint, sau đó official Prisma resolve/deploy theo classifier.
Existing DB chỉ chấp nhận canonical lineage; unknown/partial/foreign fail closed.
Đừng đọc báo cáo cũ nói đã xóa launcher rồi xóa launcher hiện tại.

Canonical source: `DECISIONS.md` ADR-021,
[migration report](PHASE1_MIGRATION_REPRODUCIBILITY_REPORT.md),
`backend/scripts/deployCanonicalMigrations.mjs`, frozen baseline và forward migrations.
Local diff tại lúc bàn giao không có thay đổi schema/migration so với main.

## 7. Lịch sử phát triển và GitHub đã tích hợp

| Mốc | Nội dung, nơi đọc |
|---|---|
| Batch 0/1 | Baseline, schema reconciliation, backup/restore, canonical persistence và concurrency; `BATCH0_*`, `BATCH1*` |
| Batch 2 | Auth/RBAC, current active user, lab scope; `BATCH2_AUTH_RBAC_REPORT.md` và access-control matrix |
| Batch 3/4 | Resource administration, eligibility, booking/calendar và database conflict protection |
| Batch 5 | Approval, handover, return, completion, evidence và operational UI |
| Batch 6 | Notifications, incidents, dashboards và persisted telemetry |
| Batch 7 | Production demo hardening, core/research boundary, release tooling và 10-step graduation demo |
| Batch 8 | Scoped source credentials, thresholds, durable alerts/incidents, private camera metadata/access audit; hardware vẫn cần kiểm chứng thật |
| Phase 0/1 | Gap audit, migration baseline/lineage hardening |
| Phase 2/3 | Mandatory training và release-gate reliability |
| Phase D/E/F | Guest OTP/transaction integrity, privacy/identity governance, append-only transactional system audit |
| Phase G/H | Open LAB booking UX/timezone/eligibility, VNPAY lifecycle và reconciliation |
| 2026-09-28 | PR #17 integration chain; PR #18/#19 docs; PR #20 guest product experience; PR #21 checkpoint |
| 2026-09-29–10-03 | PR #22: role workspaces, VI/EN, stock/course groups, bounded assistant, pagination, graduation review fixes |
| 2026-10-05 | PR #22 merge vào main tại `a5472d4` |
| 2026-10-04–06 local | UI và assistant/report refinements; shared Docker; còn chưa commit/push |

PR #17 hợp nhất implementation chain #6/#8/#9/#11/#12/#13/#14/#15/#16. PR #10
là alternate guest implementation bị supersede, không coi là code cần phục hồi.
Các report/PR còn nhắc branch cũ hoặc pending là lịch sử; đọc review follow-up,
newest decisions và code trước khi biến finding cũ thành việc sửa.

Liên kết: [#17](https://github.com/phung086/lab-resource-manager/pull/17),
[#20](https://github.com/phung086/lab-resource-manager/pull/20),
[#21](https://github.com/phung086/lab-resource-manager/pull/21),
[#22](https://github.com/phung086/lab-resource-manager/pull/22),
[GitHub integration report cũ](GITHUB_INTEGRATION_STATUS_20260928.md).

## 8. Những thay đổi chỉ có ở local hiện tại

**Phải đọc cả modified và untracked files.** `git diff` không bao gồm code mới
untracked; chỉ review diff hoặc chỉ clone GitHub sẽ thiếu các phần dưới.

| Nhóm | Nội dung local và evidence |
|---|---|
| Shared shell/visual identity | Brand/header/footer/public shell, IBM Plex white/navy, role-home rhythm, calendar/booking presentation; `artifacts/local-project-shell-20261004/`, `local-final-ui-20261005/` |
| Catalogue/dossier/profile | Record layout thay tall cards; search/filter disclosure; private history lazy load; giữ draft/profile sections; `artifacts/catalog-profile-refinement-20261005/` |
| Retractable navigation | Rail 80px, searchable drawer, pin desktop 300px, close clears pin, responsive horizontal rail, keyboard/backdrop/Escape; `artifacts/navigation-20261006/` |
| Assistant dock | Lower-right nonmodal dock, minimize/draft continuity, true MCP slot lookup và canonical-form prefill; `artifacts/assistant-widget-20261005/` |
| Assistant response correction | Greetings/identity không bị trả resource summary; unknown hỏi lại, slot intent rõ; `artifacts/assistant-response-fix-20261005/` |
| Contextual conversation | Server-owned bounded memory, planning/general chat/read-only tools, reset/logout/cancel; code `assistantConversation.js`, `assistantModel.js` và `artifacts/assistant-api-preparation-20261005/` |
| Operational report | `GET /api/dashboard/report?days=7|30`, scoped PostgreSQL aggregates và report UI; `operationsReportService.js`, `OperationsReport.tsx`, `artifacts/implementation-direction-20261005/` |
| Rule-preview CLI | `previewMonitoringScenario.mjs`: labelled synthetic rule frames, không ingest/write/persist runtime telemetry/incident; same direction artifact |
| Startup/Docker | `docker-compose.local.yml`, `frontend/scripts/dev-local.mjs`, package scripts; shared backend/database, no FE-triggered build |
| Contract/docs | SRS assistant/report appendices, guidelines, DESIGN, locale catalogs/projection/manifest, env examples; inspect actual diff |

Local report không suy ra thời gian máy đã chạy thật từ booking/maintenance
timestamps. No-show, cancelled, handover/return và schedule aggregates phải giữ
đúng nghĩa. Không thêm chart dự báo/benchmark hoặc repair duration thiếu provenance.

## 9. UX và ý định của người dùng

Người dùng muốn thay đổi hình thức có cá tính và đẹp hơn, không chỉ tối ưu CSS.
Họ phản đối màu thiếu tương phản, không đồng đều, giao diện mẫu AI và menu luôn
mở. Muốn học cách làm của sản phẩm quản lý hiện đại, thao tác nhanh, ít rườm rà.

Hiện giữ LAB identity, IBM Plex, white/navy/blue-gray, icon thống nhất, nhãn
tiếng Việt dễ hiểu. Menu đóng/mở là yêu cầu đã nhắc nhiều lần: giữ compact default,
searchable drawer, optional pin; không đổi lại permanent full sidebar mặc định.
Chỉ ghim khi user chọn, responsive và keyboard dùng được. Desktop/narrow dùng
orientation thích hợp, không tạo nhiều hệ menu độc lập.

Catalogue/profile hiển thị thông tin theo nhiệm vụ và disclosure, giữ input khi
đóng/mở/language switch. Role homes khác hierarchy theo vai trò thật. Các link
chỉ mở đúng destination/form; không submit mutation ngầm. Sidebar hiding không
thay authorization. Loading/empty/error phải trung thực, không zero giả.

CSS được nạp theo thứ tự tại `main.jsx`: `styles.css` → `light-redesign.css` →
`workspace-shell.css` → `project-shell.css` → `final-workspace.css` →
`catalog-profile.css`. Kiểm tra cascade/computed styles trước khi thêm override.
Thay scoped coherent thay vì chồng nhiều patch hoặc redesign toàn bộ ngoài scope.

Nguồn: [DESIGN](../DESIGN.md), [frontend guideline](FRONTEND_GUIDELINE.md),
[UI/UX guideline](UI-UX-style-guideline/README.md), `.impeccable/design.json` và
screenshots trong artifacts. Tham khảo Linear/Atlassian đã dùng cho navigation;
không áp architecture/product rules từ reference vào đồ án.

## 10. VI/EN, assistant và integrations

Canonical UI catalogs `frontend/src/locales/catalog/{vi,en}.json` có parity,
parameter/schema/integrity checks và SHA manifest. Backend messages là generated
projection; không import frontend runtime. Sau đổi copy chạy `i18n:sync` và
`test:i18n`. Không translate lại user content, tài liệu gốc hoặc audit evidence.
Locale failure phải giữ last valid locale và mounted drafts. LF/CRLF đã gây CI
failure trước đây; không hạ integrity checks để chữa.

Assistant authenticated, read-only MCP và bounded calls. Model prose/local
guidance/authorized evidence phân biệt nguồn. General chat không tự claim LAB
facts; factual answer cần fresh scoped evidence. Prefill không create/approve
booking hoặc thanh toán. Memory process-local, có expiry/cap/session-role binding;
reload/replicas không phải persistence conversation đã kiểm chứng. Logout cleanup
không đồng nghĩa JWT revocation.

OpenAI key/model presence là configured, chưa chứng minh live provider, quality
hoặc schema acceptance. Xem `AI_ASSISTANT_SETUP.md`, `AI_ASSISTANT_MCP.md`; không
chuyển key vào frontend/context. Snapshot này không chạy live model/SMTP/payment.

VNPAY browser return không settle; chỉ signed IPN khớp merchant/reference/amount
có thẩm quyền. Payment không resurrect booking cancelled/rejected; reconciliation
manual-review là evidence nội bộ, không phải refund provider. Free bookings
không có payment giả. Local payment/research tắt.

Monitoring dùng persisted polling, source identity và source/lab scope. Offline
sensor không làm resource BROKEN. NO_DATA/STALE/UNAVAILABLE không thành HEALTHY.
Camera metadata có quyền và audit, raw endpoint private; real sensor/video/fire
safety verification còn riêng. Optional integrations SMTP, storage, address
source, payment merchant, hardware và model cần cấu hình và evidence từng môi trường.

## 11. Môi trường local hiện tại

Một backend của nhánh tại 8000, một PostgreSQL và volume
`lrm-local-review_review-data`; Docker project `lrm-local-review`. Hai frontend
nhánh 5173/main 5180 dùng chung dữ liệu. Thay đổi qua một UI xuất hiện ở cả hai;
comparison này không kiểm tra backend main độc lập.

Tại lần kiểm kê bàn giao, hai container đang **stopped**; không tự bật chỉ để
viết tài liệu. Trước đó đã smoke kiểm tra healthy, restart và container reuse.
Giữ dữ liệu hiện tại. Các database/container/image/volume cũ đã xóa theo xác nhận
người dùng; không giả định còn DB cũ để connect/repair.

```powershell
# Backend chung: bật Docker Desktop rồi bật group, hoặc:
cd C:\Projects\lab-resource-manager\frontend
npm run dev:backend

# UI nhánh:
npm run dev

# UI main — terminal riêng:
cd C:\Projects\lab-resource-manager-main\frontend
npm run dev
```

FE `dev` chỉ health check rồi Vite, không build/start Docker. `dev:backend` dùng
fixed project và `--no-build`. `dev:backend:rebuild` chỉ tại frontend nhánh khi
dependencies/schema/Dockerfile cần rebuild. Bind mount + nodemon nạp code backend.
`dev:stop` hoặc `dev:main:stop` dừng backend/database CHUNG, giữ volume.

Demo accounts admin/staff/lecturer/student `@lrm.local`; demo password trong
README. Đây là seeded demo có thật trong PostgreSQL, không production users
hoặc actual institutional history. Tránh đưa real secrets/dumps vào context.
Local launcher phụ thuộc hai sibling paths trên; không mặc định portable mọi máy.

## 12. Kiểm chứng nào có và giới hạn nào còn

**GitHub PR head `43b1832`:** GitHub connector xác nhận 9 PR-triggered workflows
completed/success: CI, B5 backend/full-stack, B6 backend/full-stack, B7 backend/
graduation demo, B8 release gate và Phase H payment reconciliation.
[CI run](https://github.com/phung086/lab-resource-manager/actions/runs/37136435642).
Đây không phải CI cho working tree chưa commit hoặc proof một push run mới trên
merge commit `a5472d4`. Toàn bộ run links nằm trong evidence JSON.

**Local reports:** navigation 2026-10-06 có 129 checks bốn roles/VI-EN/keyboard/
history/fault/viewports; frontend typecheck/build/i18n pass, lint zero errors với
9 existing warnings tại lần chạy. Catalogue/profile có scoped browser và keyboard
evidence; assistant/report có unit, real PostgreSQL/MCP integration và browser
reports trong các artifact tương ứng. Không cộng các count cũ để tuyên bố bộ test
hiện tại đã run toàn diện.

**Shared runtime smoke:** npm dev cả hai paths, browser admin login/home/resources
cùng API 8000, ba role login khác, repeat up và stop/start reuse container IDs.
Chưa rerun full mutation regression, provider live/hardware hay production deploy
sau tất cả các thay đổi local. Một test fault-injection cũ sai API hostname và một
lượt bị 429 đã có successful replay; không weaken limiter vì test chạy dồn.

Lệnh quality cơ bản sau code changes:

```powershell
cd C:\Projects\lab-resource-manager\frontend
npm run test:required

cd C:\Projects\lab-resource-manager\backend
npm test
npm run lint
```

Browser checks cần actual demo URL/env; ví dụ navigation:

```powershell
cd C:\Projects\lab-resource-manager\frontend
$env:UX_FRONTEND_URL='http://localhost:5173'
$env:UX_API_URL='http://localhost:8000/api'
$env:UX_DEMO_PASSWORD='LabDemo!2026Pass'
$env:UX_ROLE_DELAY_MS='25000'
$env:CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:ui:workspace
```

DB integration/migration/concurrency tests phải đọc từng test guard và dùng test
DB riêng. Không trỏ mutation fixtures vào shared demo/database người dùng để lấy
test green. Chỉ mở rộng regression khi phạm vi/failure/risk cần; không bật research
hoặc phục hồi module retired để chiều tests legacy.

## 13. Nợ kỹ thuật và việc còn lại

Nguồn: [prioritized backlog](backlogs/README.md),
[PR22 review response](reviews/PR22_REVIEW_RESPONSE_20261003.md),
[open decisions](OPEN_BUSINESS_DECISIONS.md),
[threat model](security/threat-model.md), [production readiness](PRODUCTION_READINESS.md).

- Security report cũ ghi dev-tool dependency findings; production-only audit có
  scope riêng. Cần audit tại lockfile/revision hiện tại trước khi đổi versions;
  không `npm audit fix --force` hoặc downgrade major theo suggestion máy móc.
- JWT/localStorage, stateless logout, rotation/revocation/account-level lockout
  còn cần contract/test riêng. External guest mất OTP setup session chưa có
  self-service recovery; predictable phone credential đã bị chặn login trước
  password setup, không tuyên bố đã giải quyết toàn bộ session security.
- Valid deep pagination/full counts chưa benchmark 200k records/20 concurrent
  requests. Repeatable Read nhất quán một response, không freeze toàn chuỗi pages.
- OpenAPI/schema drift, router/TypeScript incremental, structured logging,
  formatting và dependency alerts là follow-ups; không big-bang reorganization.
- Resource/stock history cap và current-lab historical authorization có semantics
  riêng. Scope sau resource move không tự là immutable historical scope snapshot.
- Các integration/hardware/AI acceptance thật còn unverified theo môi trường.
  Một configured key, camera URL hoặc test fixture không thay evidence thực.
- UI vẫn có module legacy/cascade debt; không tuyên bố mọi screen hoặc toàn bộ
  50 proposed frames đã redesign. Prior screenshots/GO là scoped evidence.
- Audit retention, verified customer classification và một số guest profile/
  recovery policies chưa có quyết định cuối; không tự đặt policy hoặc xóa history.

## 14. Cách Claude bắt đầu cải tiến cùng chủ dự án

Đầu tiên đọc source và context, kiểm tra actual branch/dirty tree/runtime; trả
lại hiểu biết về sản phẩm, ranh giới local/GitHub, luồng theo role và điểm cần sửa.
Đề xuất vài việc cụ thể theo priority, mỗi việc có screen/module, trigger/lợi ích,
test và stop condition. Ý muốn cải tiến không cho phép triển khai tất cả backlog,
đổi architecture hoặc bắt đầu Batch mới.

Khi một phần đã được giao, triển khai coherent và chủ động trong phạm vi đó;
không chỉ đưa kế hoạch rồi dừng. Nếu nhiều agent cùng tham gia, thống nhất owner
file và tránh sửa đồng thời cùng module. Không stage/commit toàn bộ dirty tree
bằng `git add .`, không reset/clean/stash để tự làm sạch, không push/merge/deploy
chỉ vì bàn giao. GitHub CI phải gắn exact published SHA.

Tài liệu đọc tiếp: [documentation index](README.md). Bản này là điểm vào toàn
project; nội dung trong `CLAUDE.md` là hướng dẫn ngắn cho mỗi phiên.
