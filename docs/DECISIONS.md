# Architecture And Product Decisions

This log records decisions that future agents must preserve unless the user
explicitly approves a replacement decision. Detailed evidence remains in the
linked canonical documents and maintained contracts and reproducible tests.

## ADR-001 - PostgreSQL And Prisma Remain Canonical

Status: Accepted

The project uses PostgreSQL 16 and Prisma. Do not replace PostgreSQL with
MySQL, SQLite, an in-memory store, or another persistence layer. Apply approved
migrations with `prisma migrate deploy`; never use `prisma db push` on shared
or development databases and never edit applied migration history manually.

## ADR-002 - Resource Operational Status Is Authoritative

Status: Accepted

`Resource.operationalStatus` represents physical operational state.
Availability is derived from operational status, bookings, maintenance, and
policy. `RESERVED` is not a physical operational state, and compatibility
`Resource.status` must not become the source of truth.

## ADR-003 - NO_SHOW Is Not A Booking Status

Status: Accepted

`NO_SHOW` remains a booking outcome/event. Canonical `BookingStatus` values are
`PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`, `COMPLETED`,
`REJECTED`, and `CANCELLED`.

## ADR-004 - React/Vite And Express Are Retained

Status: Accepted

The frontend remains React/Vite and the backend remains Node.js/Express/Prisma.
Instructor Java/NestJS examples and Materio/Untitled UI references provide
architectural or design guidance only; they do not authorize a framework
migration.

## ADR-005 - Root Frontend And Backend Folders Remain In Place

Status: Accepted

`frontend/` and `backend/` are the logical equivalents of instructor
`code/frontend/` and `code/backend/`. Do not move them solely to imitate a
sample folder tree because current Docker, CI, scripts, imports, and Prisma
paths depend on the established layout.

## ADR-006 - Backend Authorization Is Authoritative

Status: Accepted

UI visibility is only a usability aid. Every sensitive operation must enforce
authentication, current database-user state, canonical role, ownership, and
laboratory scope at the backend. `UserLabAssignment` is the source of
`LAB_STAFF` scope, and unassigned staff fail closed.

## ADR-007 - Core Runtime Cannot Fake Success

Status: Accepted

Required workflows may not fall back to mock stores, sample data, fake auth,
fake bookings, fake notifications, fake telemetry, or fake payment success.
Infrastructure failure remains visible as failure.

## ADR-008 - Required Graduation Workflow Has Priority

Status: Accepted

Booking, approval, handover, return, resource operation, persisted history,
notification, and required monitoring take priority over AI, optimization,
Digital Twin, simulation, payment, and other research/showcase modules.

## ADR-009 - AI Is Decision Support Only

Status: Accepted

AI may search, explain, summarize, and recommend from real project data. It
must not override authorization, policy, operational state, booking rules, or
human approval responsibility.

## ADR-010 - Batch Boundaries Require Explicit Authorization

Status: Accepted

An agent must stop after the requested scope, report verification and risks,
and wait for the user before starting the next batch. A report saying `GO` is
a readiness recommendation, not authorization to implement.

## ADR-011 - Unresolved Resource Categories Must Not Be Guessed

Status: Accepted

Category and technical subtype are separate dimensions. Resources with an
unresolved category remain unresolved until an authorized reviewer records a
real decision; agents must not infer category from subtype or name.

## ADR-012 - Repository And Project Context Have Separate Roles

Status: Accepted

The repository is the source of truth for code, contracts, reports, and local
agent rules. A ChatGPT Project may coordinate work using selected canonical
sources and GitHub, while Google Drive may hold thesis/reference documents.
Web context does not replace local repository verification, and unpushed local
changes are not visible through GitHub.

## ADR-013 - Asia/Ho_Chi_Minh Is The Canonical Scheduling Timezone

Status: Accepted

Scheduling policy and operational timestamps are interpreted for the laboratory
in `Asia/Ho_Chi_Minh` (UTC+07:00). Browser or server local timezone must not
change weekend, working-hour, booking-slot, or operational timestamp semantics.

## ADR-014 - Booking Handover Synchronizes Physical Resource State

Status: Accepted

A successful `CONFIRMED -> CHECKED_OUT` handover changes an `AVAILABLE`
resource to `IN_USE` in the same transaction. A successful
`CHECKED_OUT -> RETURNED` operation changes `IN_USE` back to `AVAILABLE`.
A more serious authoritative physical state such as `BROKEN`, `MAINTENANCE`,
`CALIBRATION`, `RETIRED`, or `OFFLINE` is never silently overwritten by
the return workflow. Real physical changes must be recorded in
`ResourceStatusHistory`.

## ADR-015 - Production Uses Ordinary Prisma Migration Deployment

Status: Accepted

Production and clean release environments run the repository's tracked
`prisma migrate deploy`, verify `prisma migrate status`, then seed only the
configured first administrator. Batch 7 finalization verified the complete
migration history on clean PostgreSQL 16 in the Linux production image. The
temporary checksum-compatibility bridge is retired because it is no longer
needed and its cross-filesystem move failed closed during production startup.
Historical migration SQL and `_prisma_migrations` remain immutable.

## ADR-016 - Telemetry Sources Have Persisted Scoped Identities

Status: Accepted

Every production telemetry write is authenticated by a stable persisted source
bound to one laboratory and resource. A source credential consists of a public
identifier and high-entropy secret; only a salted derived hash is stored, and
comparison is timing-safe. The server resolves scope from the credential and
does not trust payload source, laboratory, or resource claims. Source active,
reported-online, last-seen, and freshness state remain separate from
`Resource.operationalStatus`.

## ADR-017 - Monitoring Policy And Alert Episodes Are Durable

Status: Accepted

Monitoring thresholds use deterministic field-level precedence:

`resource override -> laboratory configuration -> documented system default`.

Accepted samples are evaluated by the backend. Active conditions use stable
deduplication keys, source-scoped advisory locks, and database uniqueness so
polling or concurrent delivery produces one alert episode. A qualifying
verified critical alert may create one incident, and that incident retains its
source, sample, and alert provenance. Automation never changes authoritative
physical resource state.

## ADR-018 - Camera Capability Is Metadata-First And Audited

Status: Accepted

Camera records are disabled or not configured by default. The required release
exposes scoped metadata only and never fabricates video. Private endpoint data
is not returned to clients. ADMIN and correctly assigned LAB_STAFF are the only
authorized operational roles, and every authenticated access attempt is
persisted with actor, scope, purpose, timing, and outcome, including denials.

## ADR-019 - Monitoring Delivery Uses Persisted Polling

Status: Accepted

Batch 8 uses polling plus persisted sample, alert, incident, source, and camera
history rather than SSE or WebSocket. PostgreSQL remains the source of truth,
and reconnecting reconstructs state without relying on transient socket data.
No UI may claim a live realtime stream unless a future explicitly authorized
implementation adds and verifies one.

## ADR-020 - Compose Environment Names Are Host-Collision Safe

Status: Accepted

Compose accepts the host-side `LRM_LOG_FORMAT` variable and maps it to the
container's `LOG_FORMAT`. This prevents unrelated host tooling variables from
silently overriding the validated production value. Other production secrets
and origins remain explicit and fail closed.
# 2026-09-23 — Open LAB iterative upgrade (user-approved, in progress)

The user approved serving internal and external users with resource/purpose-based
fees, fast booking with email verification, and automatic account provisioning.
Phone numbers must not be initial passwords. Pricing, verified external identity,
Vietnam administrative address selection, and booking-linked VNPAY remain pending
implementation; approval here is not evidence they have shipped.

Implemented contract extension: a booking owner may return their own ROOM while
CHECKED_OUT. The server records RETURN and COMPLETE audit events atomically and
persists COMPLETED with actualEndAt/returnedAt/completedAt and required condition
evidence. Original planned times stay intact; COMPLETED releases the slot guard.
This is the owner's declaration, not a fabricated staff inspection. Hard physical
states remain authoritative. Equipment still requires staff receipt/inspection.
Existing staff transition endpoints retain their authorization rules.

Booking creation and transitions now notify active ADMIN users and assigned
LAB_STAFF; owners receive transition outcomes. Notifications commit with the
booking operation and deduplicate per booking/event/recipient. Historical events
are not backfilled. See CURRENT_STATE.md for tests and remaining work.

## 2026-09-23 — Versioned booking pricing checkpoint

Resource pricing is stored per purpose. Server quotes integer VND, rounded up per
minute, and verifies the accepted version/amount during booking creation under
the resource lock. Booking snapshots remain immutable when prices change.
Positive fees create a charge only when CONFIRMED; CHECK_OUT requires a verified
successful payment matching the stored amount and currency. Unpriced resources
remain free. New migration is additive; external roles are still unchanged.
Payment expiry/late callbacks/refunds and external fast booking remain open in
CURRENT_STATE.md. Do not represent this checkpoint as a final release.

## 2026-09-23 — Booking checkout at VNPAY

A paid confirmed booking opens its own checkout after submission or through its
booking record. The signed VNPAY URL specifies `vnp_BankCode=VNPAYQR`; VNPAY
hosts the scannable QR and any bank details entry. The application shows the
order amount and redirects to that hosted page. The signed return page links
back to the booking; only verified IPN changes payment status. A historical
zero-fee booking has no payable transaction or QR. Merchant configuration is
absent from local demo and cannot be claimed as a live payment integration.


### 2026-10-13 clarification — Merchant-supported payment methods

`VNPAY_BANK_CODE` is configurable. An absent variable preserves `VNPAYQR` for
existing environments; an explicit empty value omits `vnp_BankCode` and lets
VNPAY offer the merchant's supported methods. A configured code must be 3–20
uppercase alphanumeric characters and is included in the HMAC signature.
QR is available only when enabled for that merchant. The application uses
generic VNPAY payment labels; frontend URL validation preserves HTTPS/domain
guards and rejects duplicate or malformed bank codes. Production Compose must
preserve the difference between absent and empty values. This changes method
selection only: verified server IPN remains the settlement authority, and a
browser Return or QueryDr diagnostic cannot mark a payment successful.

## 2026-09-24 — External quick booking identity and LAB loyalty checkpoint

The user approved quick booking for external Open LAB customers. Canonical roles
remain unchanged: an external customer authenticates as role `STUDENT`, while
`User.customerType=EXTERNAL` carries the business distinction. The quick booking
flow requires Vietnamese administrative address selection, email OTP, and
persisted default address. Per the user's explicit latest instruction, newly
provisioned external accounts use email as login and phone number as the initial
password, but the account is marked `passwordResetRequired=true` so the user is
prompted to establish a real password after first access. OTP sending must use
real SMTP and fail visibly when SMTP is missing.

LAB loyalty is recorded as a booking/payment signal, not as authorization: points,
tier, discount, and priority boost never bypass booking policy, approval, RBAC,
or staff inspection responsibilities.

## ADR-021 - Clean Installs Use A Reviewed Prisma Baseline

Status: Accepted; supersedes ADR-015 for completely empty databases.

Historical applied migration SQL and `_prisma_migrations` remain immutable.
Because fresh checkout line-ending normalization changes the predecessor
checksums expected by the historical reconciliation migration, a completely
empty database uses the reviewed baseline at
`backend/prisma/baseline/20260924000100_clean_baseline`. The deployment command
verifies frozen SQL/schema artifacts and each represented historical migration,
then records included migrations through Prisma's official `migrate resolve`
only after a deterministic PostgreSQL catalog fingerprint passes. The baseline
is tied to its own frozen `schema.prisma` snapshot, never to the current live
schema. Forward migrations may evolve the live schema without changing the old
baseline; a future baseline requires a new ID and directory.

Existing databases retain their original Prisma lineage only when completed
migration rows form an accepted canonical prefix. Foreign, empty, failed,
rolled-back, duplicated, out-of-order, unknown non-empty, and structurally
damaged baseline states fail closed. Automatic resume begins after baseline SQL
and its final marker complete; interruption inside baseline SQL requires
recreating that initially empty database. Required CI includes fresh and repeat
deployment plus the PostgreSQL 16 migration-safety matrix.

## ADR-022 - System Audit Trail And Administrative Accountability

Status: Accepted

A generic, append-only `SystemAuditEvent` table provides durable accountability
for security-sensitive administrative and business events that lack complete
transactional provenance in specialized domain models:
- User role changes (`USER_ROLE_CHANGED`)
- User activation/deactivation (`USER_ACTIVATION_CHANGED`)
- Laboratory assignment additions and removals (`LAB_ASSIGNMENT_ADDED`, `LAB_ASSIGNMENT_REMOVED`)
- Resource pricing changes (`RESOURCE_PRICING_CHANGED`)
- Guest account creation and reuse (`GUEST_ACCOUNT_CREATED`, `GUEST_ACCOUNT_REUSED`)
- Administrative financial actions (`PAYMENT_CHARGE_CREATED`)

Key governance and security guarantees:
1. Append-only and immutable: no update (`PUT`/`PATCH`) or deletion (`DELETE`)
   endpoints exist for system audit events.
2. Transactional coupling: the audit event must be persisted inside the same
   atomic Prisma transaction as the underlying mutation. If the audit write
   fails, the business mutation rolls back.
3. Survivability: target IDs and snapshots survive row deletions (such as
   revoked lab assignments or removed users via `ON DELETE SET NULL` on foreign
   keys and string-based target references).
4. Strict RBAC: ordinary users (`STUDENT`, `LECTURER`) and unauthenticated
   clients fail closed (`403`). `LAB_STAFF` can only read audit records scoped
   to their assigned laboratories. `ADMIN` has global read access.
5. Data minimization and secret prevention: passwords, tokens, OTP codes, and
   secrets are strictly sanitized before persistence. Before and after states
   capture only the minimal mutated attributes.
6. Retention: automated destructive cleanup is not implemented and remains
   an open business policy decision.

## ADR-023 - Signed IPN Authority And Explicit Payment Reconciliation

Status: Accepted

Payment is a separate, optional lifecycle below the canonical booking and
safety rules. The authoritative amount is the immutable booking pricing
snapshot, and payment initiation is allowed only for a positive-fee booking in
`CONFIRMED`. Free bookings have no synthetic payment record.

A VNPAY browser return is presentation-only. Only a correctly signed server
IPN that also matches the configured merchant, amount, transaction reference,
and unique provider transaction number may settle the local payment. Callback
processing is transactional, idempotent, and monotonic: `success` is never
downgraded by a later failure callback, while an earlier failure or expired
session may be upgraded by final signed success evidence.

Each hosted checkout session has persisted creation and expiry time. The system
reuses only a still-valid pending session and enforces at most one active
pending transaction per booking. Expired sessions are preserved as evidence
and replaced with a new transaction and transaction reference.

A successful settlement never resurrects a cancelled or rejected booking.
Instead, the payment remains `success` and receives `manual_review`
reconciliation state. ADMIN resolution requires a reason and an append-only,
transaction-coupled audit event. Internal resolution records that the exception
was reviewed; it neither changes the booking/payment settlement nor claims a
provider refund. QueryDr and refund remain external integrations pending real
merchant credentials and verified provider evidence.

## ADR-024 - LAB workspace and course-group responsibilities

Status: Accepted in user-authorized local continuation, 2026-09-29.

- VI/EN is an application-wide presentation preference, not a course attribute.
- The landing retains the signed-in worklist and confirmed schedule in Check
  schedule. Public projections preserve booking privacy.
- MATERIAL inventory uses transactional receipts, issues and adjustments with
  immutable movement history, fixed units, nonnegative balance and retry IDs.
  LAB_STAFF is limited by UserLabAssignment; ADMIN alone records adjustments.
- A material issue linked to maintenance requires an open job in the same lab.
- Maintenance changes require reasons and conflict revalidation. They do not
  silently relocate bookings or certify the resource's physical safety.
- Course groups represent academic supervision. ADMIN assigns the lecturer;
  lecturers manage assigned groups, students submit their own learning goals.
  Academic review is separate from resource approval and operational handover.
- Original user content and historical evidence are not rewritten by translation.


## ADR-025 — Shared locale messages and bounded read-only assistance

Status: Accepted in user-authorized continuation, 2026-09-30.

- Canonical VI/EN catalogs author UI and shared server messages; the backend
  consumes a checked projection, never imports frontend runtime code.
- A language is activated only after catalog integrity/schema checks. Failed
  loads leave mounted form state and the last valid language intact.
- System feedback stores message IDs and parameters; user content and historical
  evidence remain original. Canonical codes, dates, roles and state transitions
  are independent of presentation language.
- Assistant facts come from authenticated read-only MCP tools with existing
  account/object/lab scope. Model prose, local summaries and failure states are
  distinguishable. Only form-prefill suggestions are allowed.
- Active work, per-account request rate, deadlines, search scans and provider
  retries are bounded. Abort/close paths release capacity; repeated provider
  failures pause model calls. These gates are per backend process.
- Camera/sensor navigation is opt-in and deferred in normal use. Existing
  persistence/access rules remain available for later verified hardware work.
- Subsequent screen/workflow refinement must use this same contract; do not
  add another raw-text fallback or fake service success path.

Clarification, 2026-10-01: MCP ingress and business API ingress have separate
bounded IP budgets; authenticated account, object and lab checks stay mandatory.
Socket/deadline cancellation reaches tool work, and non-cancellable pending reads
retain admission until they settle. Model synthesis of LAB facts requires usable
evidence and its serialized data payload is at most 24,000 UTF-8 bytes.
Hardware-off workspace reads explicitly omit telemetry queries and label monitoring
as deferred. Shared client
deadlines never automatically retry business mutations.

Clarification, 2026-10-05: the user authorized preparing contextual conversation
before supplying an API key. Responses API planning uses a strict allowlist of
existing read tools; the backend executes validated arguments through actual
authenticated MCP. General conversation/clarification may run without LAB data;
operational facts still require fresh authorized evidence. No writes or remote
MCP access are introduced. All provider data payloads include bounded history
within the same 24,000-byte budget; fixed instructions/schema and outputs are
separately finite. Responses use `store:false`, which is not a provider retention
guarantee.

Conversation memory is process-local, capped and expires after 30 idle minutes.
Ownership binds account, hashed bearer session and current role. Business tool
prose is omitted from history, old choices are re-read, reset deletes the current
conversation and logout cancels/clears session context. Reload starts a new
conversation; old server memory expires separately. This does not add JWT
revocation. Key/model presence is `CONFIGURED_UNVERIFIED` until real provider
behavior is checked. See `AI_ASSISTANT_MCP.md` and `AI_ASSISTANT_SETUP.md`.


## ADR-026: Task-focused role entry points share one workflow boundary

Status: Accepted in user-authorized continuation, 2026-09-30.

- Student, lecturer, LAB staff and administrative home layouts prioritise their
  actual next task, rather than reusing a generic dashboard with different labels.
- Role views load on demand and reuse shared VI/EN components and authenticated
  reads. UI visibility never grants permission or performs a business action.
- Home links carry validated destination context into existing catalogue,
  calendar, teaching, directory and booking screens. Booking actions open the
  ordinary evidence/confirmation form; backend scope and state checks remain final.
- Displayed work counts disclose the bounded recent-record scope. Do not present
  capped arrays as complete institution totals or infer pending academic reviews.
- A resource calendar link resolves the requested authenticated record even beyond
  the initial list cap. Missing or forbidden records produce an explicit error;
  never substitute another resource. Shared language controls remain reachable
  inside modal focus traps without discarding action drafts.
- Shared application reads refresh on session change, home entry and explicit
  refresh/completed mutations. Leaving home reuses loaded records; replacement
  groups abort previous reads and cannot accept stale results.
- Later screen refinements extend the same shell, catalogs and canonical workflow
  rather than adding a parallel routing, translation or role-permission system.

Clarification, 2026-10-03: booking/incident workspace queues now use bounded
server pages with complete scoped totals. Staff/admin queue figures use these
totals; remaining capped previews must still disclose their own limits. Every
page, count and old-record shortcut retains current persisted owner/lab scope.
See `WORKSPACE_QUEUE_PAGINATION_20261003.md` and the review follow-up for evidence.

Security clarification, 2026-10-03: a new external guest's phone-based temporary
credential is not an authentication factor. Password login rejects EXTERNAL
accounts with `passwordResetRequired`; the email-verified booking session may
complete password setup, after which normal login works. Recovery after loss of
that setup session and revocation of existing tokens remain separate unresolved
work. See `CURRENT_STATE.md` for tests and limits.

## ADR-027 — Tài liệu được duy trì và loại bỏ nghiên cứu đã ngừng dùng

Status: Accepted theo yêu cầu người dùng ngày 07/10/2026.

Giữ SRS, convention, cấu trúc, trạng thái ngắn, quyết định, guideline, ERD,
backlog, nguồn giảng viên và runbook hữu ích. Báo cáo AI sau tác vụ, screenshot,
bản sao/output tạm và handoff lặp được ngừng dùng; cập nhật context trong
CURRENT_STATE thay vì yêu cầu agent đọc lịch sử mọi lần chạy. Không viết lại Git.

Gỡ registry/routing nghiên cứu cũ, UI giả sự cố/KPI, benchmark/test import các
module đã retired. Giữ chức năng được chấp thuận, trợ lý MCP read-only và preview
giám sát có nhãn. Đây là retirement của showcase, không loại bỏ năng lực giám
sát bắt buộc hoặc hướng simulator demo. Quyết định này thay ưu tiên bảo tồn
Advanced/Research cũ; không thay role/status, RBAC, schema hay applied migrations.

Tệp runtime/config/test/asset còn được gọi và dữ liệu nghiệp vụ không phải rác.
Chỉ dọn đúng allowlist trong checkout và tài nguyên Docker LAB không còn dùng;
giữ dự án Docker khác và worktree ngoài checkout.

## ADR-028 — Ngữ cảnh Claude theo task và checkpoint có thể kiểm chứng

Status: Accepted theo yêu cầu tối ưu Claude của người dùng ngày 07/10/2026.

Giữ source FE/BE, contracts và runtime. Root AGENTS/quy tắc governance là nền;
đọc complete relevant sections và dependency liên vùng theo CONTEXT_MAP thay
đọc toàn bộ tài liệu cho mọi task. CLAUDE nhập root/area AGENTS, UI rules theo
paths; workflow chuyên biệt chỉ nạp khi cần. CURRENT_STATE lưu checkpoint của
task và checkout, không nhân bản source/log hay tạo report sau mỗi phiên.

Project bắt đầu với compact window 120k và skills ngoài mục tiêu LAB gọi thủ
công. Đây là tham số cần theo dõi, không chứng minh tỷ lệ tiết kiệm. Loại bản
Playwright plugin trùng ở checkout chính, giữ MCP ghim/cấu hình browser hiện có.
Không đổi model/gateway/auth/permissions, ép proxy hỗ trợ tool search, cài thêm
harness/graph/workflow hay chạy EXE tham khảo. So sánh hiệu quả phải tính cả
cache, context qua nhiều lượt và correctness; token log không phải hóa đơn.

## ADR-029 — Chat hỗ trợ có lưu lịch sử và tự giao theo LAB

Status: Accepted theo yêu cầu người dùng ngày 12/10/2026.

Người dùng đã đăng nhập (STUDENT/LECTURER) yêu cầu chat với LAB_STAFF. Staff
bật sẵn sàng; mỗi người một phiên ACTIVE trên toàn bộ LAB được phân công,
nhiều người có thể hỗ trợ đồng thời. Chọn lượt WAITING có ordinal nhỏ nhất
trong phạm vi hợp lệ; người còn chờ thấy vị trí theo LAB. Hoàn tất/hủy sẽ tự
giao lượt tiếp theo. UserLabAssignment hiện tại là authority; admin đọc toàn
bộ và có thể requeue kèm lý do khi cần chuyển người, không gửi thay staff.

SupportSession/Message/Presence lưu PostgreSQL qua migration forward mới.
Transaction advisory lock điều phối dispatch; partial unique indexes bảo vệ
capacity/open request, row locks điều phối gửi/kết thúc. Client UUID hỗ trợ
retry yêu cầu/tin nhắn có kiểm tra cùng nội dung. Tin nhắn, người nhận trước,
lý do và thời điểm xử lý lưu thật; không suy ra booking/payment đã thành công.

Ngữ cảnh AI display có giới hạn, ràng buộc owner/session/role và TTL; chỉ copy
server-owned transcript khi người dùng chọn chia sẻ. Không nhận transcript
tự gửi từ browser và không dùng bản copy làm current business evidence/model
history. Mẫu trả lời chỉ chèn bản nháp để staff kiểm tra rồi gửi.

Bản đầu dùng polling 2 giây, heartbeat 15 giây, TTL presence 45 giây. Offline
không tự giành phiên đang xử lý; admin requeue có audit event và tạm ngừng
nhận của staff cũ. Chưa mở WebSocket, read receipts, attachments hoặc nâng cấp
AI/provider. Không thay canonical role/status, framework hoặc scope nghiệp vụ.

## ADR-030 — Email tự động đăng ký và thanh toán qua outbox

Status: Accepted theo yêu cầu người dùng ngày 12/10/2026.

Đăng ký public và tài khoản mới được tạo sau OTP guest booking enqueue thư
chào mừng trong cùng transaction tạo user/booking. Chỉ verified successful
VNPAY IPN enqueue biên nhận trong transaction settle payment. Không lấy Return
làm settlement và không backfill email từ dữ liệu cũ. Snapshot chỉ chứa thông
tin công khai cần gửi; không chứa password/hash/OTP/token. Không mở thêm luồng
quên mật khẩu hay tự gửi mật khẩu tạm qua email. Guest được nhắc hoàn tất setup
trong phiên OTP đã xác thực; giới hạn recovery cũ không được coi là đã giải quyết.

EmailDelivery có unique dedupeKey, FK user, snapshot JSON, locale, lifecycle,
attempts/backoff và lease. Worker claim bằng FOR UPDATE SKIP LOCKED, gửi SMTP
sau commit và chỉ ghi kết quả nếu còn giữ lease token. Thiếu cấu hình giữ
PENDING không tăng attempts; lỗi gửi tối đa năm lần rồi FAILED, operator retry
bằng CLI. Lease hết hạn được recover; lease cuối đã hết lượt ghi
DELIVERY_UNCERTAIN để operator xem xét. Delete user cascade outbox; không suy
ra dữ liệu email cần giữ vĩnh viễn. Các trường snapshot không đưa vào public API.

SMTP thật là bắt buộc; loại fallback Ethereal/console-success. TLS/STARTTLS và
timeout áp dụng, chỉ fixture SMTP loopback trong NODE_ENV=test được plaintext.
SENT là SMTP acceptance, không chứng minh inbox. Message-ID cố định theo delivery
hỗ trợ nhận diện retry nhưng crash sau SMTP acceptance trước DB write có thể
gửi trùng; không hứa exactly-once qua SMTP. Không lưu raw provider error có thể
chứa credential; CLI chỉ đọc trạng thái/configuration flags, không dump env.

Biên nhận dùng thông tin tại thời điểm IPN và giờ Việt Nam. Thanh toán trễ sau
CANCELLED/REJECTED hoặc trùng settlement phải nêu cần đối soát, không đổi lịch.
Registration chọn locale request VI/EN; receipt mặc định VI do IPN không mang
ngôn ngữ khách. Mail quản trị UI, webhook bounce/delivery và lưu lựa chọn ngôn
ngữ khách chưa nằm trong bản này. User chưa có tài khoản SMTP; không ghi live
inbox PASS. VNPAY merchant mã70 vẫn là điều kiện ngoài feature email.

## ADR-031 — Vận hành tài nguyên ảo gắn nghiệp vụ

Người dùng ngày 12/10 thay thế màn kịch bản demo bằng quản lý vòng đời phòng,
máy và linh kiện trong danh mục: bàn giao, vận hành, hoàn trả, hư hỏng, bảo trì
theo ngày/giờ và kiểm tra sau sửa chữa. Phiên vận hành ghi workload/occupancy
do staff khai báo và thời gian server; không tự phát số đo vật lý. Resource
operationalStatus vẫn do thao tác nghiệp vụ có quyền và lịch sử quyết định.
Policy bảo trì không tự cấp chứng nhận an toàn; hoàn thành job và kiểm tra đạt
là hai bước riêng. Migrations đã áp dụng giữ bất biến.

## ADR-032 — Đặt lịch tự xác nhận, giá thuê và chu kỳ bảo trì

Theo yêu cầu người dùng 12/10, booking mới hợp lệ tự CONFIRMED; cờ requiresApproval
legacy không tạo hàng đợi mới. Giữ các trạng thái và API xử lý lịch cũ. Staff
phụ trách bàn giao, nhận trả, di chuyển lịch và hỗ trợ. Di chuyển giữ thời lượng/
phí, optimistic start snapshot, khóa resource/booking và kiểm tra lại xung đột.

Chu kỳ dùng actualStartAt → actualEndAt (phiên đang mượn tính đến hiện tại); số
lượt chỉ tính bàn giao đã hoàn trả sau baseline, không đếm yêu cầu hoặc đổi tải.
Mốc mặc định 80% gửi cảnh báo, 100% gửi đến hạn và chặn sử dụng tiếp. Notification
scoped admin/staff có unique key theo resource/baseline/stage/recipient; đọc lại
DB dưới resource lock để tránh cảnh báo cũ sau inspection. Kiểm tra đạt kết thúc
chu kỳ cũ và xóa cảnh báo khỏi danh sách chưa đọc, giữ lịch sử.

Giá hiện hành là bảng giá nội bộ do hệ thống cấu hình, không phải giá thị trường.
25 tài nguyên có giá riêng; bốn purpose hiện cùng giá để một tài nguyên hiện một
mức thuê. ADMIN sửa rate và duration qua transaction/audit; snapshot booking và
payment cũ không đổi. Resource và LAB cùng giới hạn thời lượng, lấy mức nhỏ hơn.
Không tự ghi payment thành công hoặc bỏ qua đào tạo/trạng thái vật lý.

Clarification cùng ngày: áp dụng trên toàn hệ thống, gồm projections resource,
calendar và AI. Trang khách/tiến trình mới không trình bày chờ duyệt như một bước
mặc định; chỉ hiển thị xử lý legacy khi có bản ghi. Optional guidance mở theo nhu
cầu ở các màn hình chính. Availability chỉ xét các booking/maintenance giao với
khoảng truy vấn; không khóa cả tài nguyên vì có một lịch bảo trì tương lai.

## ADR-033 — Ba vai trò và đăng ký tối giản (13/10/2026)

Người dùng yêu cầu thay LECTURER/STUDENT bằng CUSTOMER. Canonical roles là
ADMIN, LAB_STAFF, CUSTOMER; không alias role cũ. Quyết định này thay hợp đồng
actor cũ, phần academic của ADR-024/026 và identity STUDENT của quick booking.
Migration 20261012001000 chuyển tài khoản cũ, giữ ID, credentials và quan hệ;
audit actorRoleSnapshot chuyển sang TEXT để giữ đúng vai trò tại thời điểm sự kiện.
Không sửa baseline/migration cũ hoặc xóa lịch sử. Các màn hình/mutation học phần
ngừng dùng; ADMIN vẫn đọc được archive API. Không chuyển quyền học phần cho khách.

Đăng ký public chỉ email/password (8–128 ký tự), server luôn cấp CUSTOMER.
Tên ban đầu trống, UI dùng email. Khi đặt lịch, cần họ tên 2–255 ký tự và số điện
thoại hợp lệ (10 số bắt đầu bằng 0 hoặc số quốc tế có +). Ghi contact profile và
Booking.contactSnapshot trong cùng transaction; lỗi đặt lịch rollback thay đổi
liên hệ. Lần sau dùng thông tin đã lưu. Địa chỉ/tổ chức không bắt buộc cho booking
đến LAB. Validation giữ field/issue codes an toàn, chỉ rõ trường lỗi, focus đúng
trường; placeholder form không chứa ví dụ dài. Quote, thanh toán, xung đột, care
readiness, tự CONFIRMED và scope staff/owner của ADR-032 vẫn bắt buộc.

## ADR-034 — Quản lý khách hàng và đổi mật khẩu có OTP (13/10/2026)

User cho phép ADMIN quản lý mọi tài khoản và LAB_STAFF quản lý tất cả CUSTOMER,
kể cả khách chưa đặt ở LAB được phân công. Ngoại lệ này chỉ áp dụng tài khoản:
tạo, đọc, sửa liên hệ, kích hoạt/ngừng và xóa mềm, hỗ trợ đổi mật khẩu. Staff
không được đổi role, LAB assignment, sửa/xem tài khoản ADMIN/LAB_STAFF; phạm vi
LAB của tài nguyên, lịch, vận hành, giám sát và chat không thay đổi.

Email đăng ký không thể đổi từ màn quản lý hoặc PATCH profile: nếu staff đổi
email rồi tự nhận OTP thì mất ý nghĩa đồng ý của khách. Mỗi thay đổi mật khẩu
bắt buộc OTP gửi tới email hiện tại. Tự đổi còn cần mật khẩu hiện tại; hỗ trợ
cần lý do 5–500 ký tự. OTP 6 số, hiệu lực 10 phút, gửi lại sau 60 giây, tối đa
5 lần nhập sai; hash gắn actor/target/email/purpose/credential versions, dùng
một lần. SMTP thiếu hoặc từ chối phải báo thất bại; không gửi code qua response,
log hay outbox và không có admin bypass. Đổi mật khẩu ghi audit cùng transaction
và tăng authVersion để vô hiệu hóa mọi phiên cũ; self-service trả JWT mới.

Role/activation cũng tăng authVersion khi đổi. Các token cũ thiếu version chỉ
hợp lệ khi tài khoản còn version 0. Xóa mềm có deletedAt, không xóa lịch sử và
không phục hồi qua activate. Cần xử lý hết booking/loan đang hoạt động trước
khi xóa; lượt hỗ trợ đang mở chặn xóa/ngừng/đổi role cho đến khi đóng hoặc
chuyển handler phù hợp. Tạo lịch/chat khóa User và kiểm tra lại active/version,
không cho in-flight request tạo công việc cho tài khoản đã xóa; tự khóa ADMIN và mất ADMIN hoạt động cuối cùng bị chặn. Account writes
và policy writes dùng cùng advisory lock, recheck actor trong transaction.
Khôi phục mật khẩu public khi mất phiên đăng nhập không thuộc batch này; khách
liên hệ nhân viên hỗ trợ và xác thực email. Đổi email cần luồng riêng đã xác minh.

## ADR-035 — Loyalty theo chi tiêu đã xác thực (13/10/2026)

User chọn chi tiêu làm tiêu chí xét hạng; ADMIN cấu hình ngưỡng và mức giảm.
Một LoyaltyPolicy SYSTEM có version; mặc định tắt ưu đãi, ngưỡng LAB_PLUS
1.500.000đ và LAB_PRIORITY 5.000.000đ, mức giảm tương ứng 3%/5%. UI công khai
trạng thái bật/tắt. Ngưỡng nguyên 1..2.000.000.000đ, priority lớn hơn plus;
mức giảm 0..50%. Save phải có expectedVersion và audit, không ghi đè thay đổi
đồng thời. Điểm hiển thị = floor(chi tiêu/10.000), không phải số dư đổi quà.

Chi tiêu chỉ lấy payment success, VND, paidAt tồn tại, provider vnpay/vietqr,
reconciliation none, đúng chủ booking và amount bằng fee đã lưu; loại booking
CANCELLED/REJECTED, refunded, pending, orphan và dữ liệu sai. Profile và loyalty
đọc cùng snapshot RepeatableRead; user loyalty fields cũ không cấp ưu đãi/quyền.
Quote authenticated CUSTOMER dùng chi tiêu hiện hành; public/operator list price.
Báo giá và tạo lịch kiểm tra lại amount, tariff version và loyalty policy version;
feeSnapshot lưu giá gốc, giảm và giá ròng, không đổi booking/payment cũ.
Refund hoặc đổi chính sách làm quote cũ không hợp lệ nếu giá/hợp đồng đổi.
Guest quick booking giữ giá public đã chấp nhận, tránh đổi phí sau OTP; muốn
nhận giảm theo hạng thì đăng nhập trước đặt. Không suy đoán thanh toán thành công
và không trao thêm quyền LAB hay độ ưu tiên hàng đợi hỗ trợ theo hạng.

## ADR-036 — ChatGPT hỗ trợ qua sự kiện và quyền theo câu hỏi (13/10/2026)

Theo yêu cầu user, thêm lựa chọn plugin ChatGPT Work/Cloud cho chatbot CUSTOMER,
giữ Responses/MCP nội bộ hiện có cho đường riêng. Bridge mặc định tắt; bật phải
có HTTPS origin, UI origin, khóa mã hóa 32 byte và redirect ChatGPT chính xác.
OAuth public client dùng PKCE S256, audience cụ thể, ba scope read/reply/events;
ADMIN đồng ý grant 30 ngày và có thể thu hồi. Access 15 phút, refresh 7 ngày xoay
một lần; replay thu hồi cả grant. Đổi chủ kết nối thu hồi grant/subscription và
câu hỏi đang chờ của kết nối cũ. Không sử dụng JWT nội bộ làm token cho ChatGPT.
Authorize và code/refresh exchange bỏ tham số mở rộng không hỗ trợ theo RFC6749
3.1/3.2, không lưu hoặc chuyển tiếp chúng. Trường đã hỗ trợ vẫn kiểm tra kiểu,
S256/client/callback/audience/scope; tham số bảo mật bị lặp bị từ chối.

Câu hỏi và outbox được lưu cùng transaction, gắn CUSTOMER/authVersion và generation
của grant. Event chỉ chứa requestId; 2xx là nhận sự kiện, chưa phải trả lời. Work
chat đọc bộ nghiệp vụ có phiên bản và dữ liệu hiện hành trong phạm vi khách đó;
tool publish ghi nội dung chat và tối đa hai đề xuất xem trước (BOOKING,
STAFF_SUPPORT, mỗi loại một đề xuất), không đổi booking, tài khoản, payment hay care.
Chưa đọc context đúng phiên bản không được publish. Câu hỏi hết hạn sau 10 phút;
chuyển staff, hủy, đổi credential hoặc revoke đều từ chối phản hồi muộn. Tối đa
13 lần đọc và 24 KB dữ liệu động/câu hỏi; lịch sử ngữ cảnh tối đa 10 lượt/30 phút.
Đây là grounding có kiểm soát, không fine-tuning hoặc sao chép toàn DB sang GPT.

Làm rõ 14/10: thời gian tương đối trong câu khách phải lấy từ `timeContext`
Asia/Ho_Chi_Minh (nowVietnam/today/tomorrow), không suy ngày từ UTC `now` hay lịch
sử hội thoại. Nêu ngày cụ thể trước khi tra lịch. Context version tăng khi sửa
quy tắc này; host vẫn phải đọc context mới trước publish.

Callback HTTPS được kiểm tra toàn bộ DNS/IP công khai và ghim IP khi kết nối;
không redirect. Subscription xác minh challenge ký, bí mật mã hóa tại DB và TTL
24 giờ; worker lease/SKIP LOCKED, tối đa 5 lần gửi. Bốn MCP lượt đang chạy/process,
một lượt/grant; hỗ trợ nhiều replica cần kiểm chứng admission chung trước triển khai.
Tin nhắn được lưu bền trong DB; TTL ngữ cảnh không phải chính sách xóa lịch sử.
AI transcript của bridge chưa được sao chép tự động vào phiên staff; khách dùng
nút hỗ trợ hiện có. Plugin phải được cài, OAuth consent và Work chat subscribe;
cài plugin đơn thuần chưa bảo đảm chatbot chạy hoặc đổi account đã hoàn tất.

Theo yêu cầu bổ sung 13/10: bot hỗ trợ khách thao tác bằng form điền sẵn. Server
kiểm tra đề xuất theo quyền CUSTOMER và dữ liệu hiện hành; tên LAB/tài nguyên và
giá lấy từ DB, không nhận giá/actor/URL từ model. Đề xuất hết hạn sau tối đa 5 phút;
khách mở form thường, kiểm tra rồi tự gửi. QuickBookingModal lấy lại quote và API
kiểm tra policy/certification/availability/phiên bản giá tại thời điểm gửi. Support
giữ requestId/idempotency/FIFO/presence hiện có; không dispatch từ tool AI. Không
ghi đè yêu cầu hỗ trợ đã mở hoặc nội dung khách đang nhập. Không có endpoint hay
migration mới cho business writes. Câu hỏi chung ngoài LAB được trả lời khi có
bằng chứng phù hợp; dữ kiện biến động cần host search thực có hoặc nêu giới hạn.
