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
