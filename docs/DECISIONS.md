# Architecture And Product Decisions

This log records decisions that future agents must preserve unless the user
explicitly approves a replacement decision. Detailed evidence remains in the
linked canonical documents and verified Batch reports.

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
are not backfilled. See OPEN_LAB_UPGRADE_REPORT.md for tests and remaining work.

## 2026-09-23 — Versioned booking pricing checkpoint

Resource pricing is stored per purpose. Server quotes integer VND, rounded up per
minute, and verifies the accepted version/amount during booking creation under
the resource lock. Booking snapshots remain immutable when prices change.
Positive fees create a charge only when CONFIRMED; CHECK_OUT requires a verified
successful payment matching the stored amount and currency. Unpriced resources
remain free. New migration is additive; external roles are still unchanged.
Payment expiry/late callbacks/refunds and external fast booking remain open in
OPEN_LAB_UPGRADE_REPORT.md. Do not represent this checkpoint as a final release.

## 2026-09-23 — Booking checkout at VNPAY

A paid confirmed booking opens its own checkout after submission or through its
booking record. The signed VNPAY URL specifies `vnp_BankCode=VNPAYQR`; VNPAY
hosts the scannable QR and any bank details entry. The application shows the
order amount and redirects to that hosted page. The signed return page links
back to the booking; only verified IPN changes payment status. A historical
zero-fee booking has no payable transaction or QR. Merchant configuration is
absent from local demo and cannot be claimed as a live payment integration.


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
retain admission until they settle. Model generation requires usable evidence and
a complete input no larger than 24,000 UTF-8 bytes. Hardware-off workspace reads
explicitly omit telemetry queries and label monitoring as deferred. Shared client
deadlines never automatically retry business mutations.


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
work. See `reviews/PR22_REVIEW_RESPONSE_20261003.md` for tests and limits.
