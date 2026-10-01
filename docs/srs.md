# Software Requirements Specification

## Lab Resource Manager

| Document field | Value |
|---|---|
| Document ID | LRM-SRS-001 |
| Version | 1.1 |
| Status | Working baseline for the current project checkpoint |
| Prepared | 28 September 2026 |
| Product | Lab Resource Manager |

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the users, system boundary, interfaces, functional behavior, quality requirements, and acceptance conditions for Lab Resource Manager. It provides a reviewable baseline for implementation and progress reporting. The presence of a requirement in this document does not by itself prove that the related feature is complete or deployed.

### 1.2 Scope

Lab Resource Manager is a web application for discovering and operating shared university laboratory resources. Its primary workflow covers resource discovery, availability review, booking, approval where required, handover, return, and operational history. Supporting capabilities include account and laboratory administration, maintenance, notifications, incident handling, monitoring, and reporting.

External quick booking, pricing/payment, and AI assistance are incremental or supporting capabilities. They must not override core authorization, booking rules, physical resource status, or human approval. Real payment-provider settlement and physical hardware verification require their own external configuration and evidence.

### 1.3 Definitions and conventions

- **Shall** identifies a mandatory requirement; **should** identifies a recommended quality target.
- A **booking owner** is the authenticated user who created a booking.
- **Availability** is derived from operational status, bookings, maintenance windows, and policy; it is not a separate physical status.
- Time intervals are half-open: `[startAt, endAt)`, so one booking may end when another begins.
- `NO_SHOW` is an outcome/event, not a booking status.
- Requirement identifiers: `FR` functional, `NFR` non-functional, `BR` business rule, and `AC` acceptance criterion.

### 1.4 References

- `PRODUCT.md` — product purpose, users, principles, and priority.
- `docs/convention.md` — naming, layering, API and validation conventions.
- `docs/PROJECT_STRUCTURE.md` — repository layout and responsibilities.
- `docs/CURRENT_STATE.md` and verified Batch reports — implementation and verification evidence.
- `backend/prisma/schema.prisma` — persisted data model and canonical enums.

## 2. Overall Description

### 2.1 Product perspective

The system is a browser-based frontend backed by an HTTP API and PostgreSQL database. The frontend is implemented with React and Vite. The backend uses Node.js, Express, Prisma, and PostgreSQL 16. The API and database are authoritative for authentication, permissions, business rules, and persisted state.

### 2.2 Product functions

At a high level, the system supports:

1. Account registration, login, account administration, and laboratory assignment.
2. Public and authenticated resource discovery, detail, and schedule views.
3. Booking requests, policy checks, approval, cancellation, handover, return, and completion.
4. Resource operation, maintenance windows, incident records, notifications, audit history, and dashboards.
5. Persisted telemetry and alert workflows when a real configured source supplies data.
6. Optional external-customer quick booking, purpose-based pricing, and payment-provider integration when configured.
7. AI-assisted explanation and lookup as decision support only.

### 2.3 User classes

| Actor | Main responsibilities | Authorization boundary |
|---|---|---|
| `ADMIN` | Manage users, roles, laboratory assignments, resources, policies, and cross-lab administration | Global administrative permission, enforced by backend |
| `LAB_STAFF` | Operate resources, process bookings, maintenance, monitoring, and incidents | Limited to laboratories assigned through `UserLabAssignment` |
| `LECTURER` | Discover resources and manage own bookings | Authenticated self-service; no staff operations |
| `STUDENT` | Discover resources and manage own bookings | Authenticated self-service; external business identity may be separately marked `EXTERNAL` |

Public visitors may view explicitly public catalog and schedule projections. Public access does not grant booking mutation or account privileges.

### 2.4 Operating environment

- Modern desktop and mobile web browsers.
- Frontend single-page application served by Vite during development and a web server/container in deployment.
- Node.js/Express API, Prisma persistence, and PostgreSQL 16.
- Docker Compose and GitHub Actions support local/release workflows where configured.
- Scheduling and operational timestamps use `Asia/Ho_Chi_Minh` semantics.

### 2.5 Constraints and assumptions

- Canonical roles are exactly `ADMIN`, `LAB_STAFF`, `LECTURER`, and `STUDENT`.
- Canonical booking statuses are `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`, `COMPLETED`, `REJECTED`, and `CANCELLED`.
- Canonical physical operational statuses are `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, and `OFFLINE`.
- Resource categories are `ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`, and `MATERIAL`; technical subtype is a separate field.
- PostgreSQL and tracked Prisma migrations are authoritative. Applied migration history is immutable.
- External SMTP, payment credentials, telemetry sources, object storage, and physical devices are available only when separately configured and verified.
- The instructor's example `code/frontend/` and `code/backend/` map logically to the repository's existing `frontend/` and `backend/`; the repository is not physically rearranged solely to imitate the diagram.

## 3. External Interface Requirements

### 3.1 User interface

The UI shall provide role-appropriate navigation, clear booking and operational states, validation feedback, and responsive layouts. Important status and warning information shall not rely on color alone. Public views shall show only safe resource and schedule information and shall not reveal requester identity or private booking titles.

### 3.2 Software interfaces

- The frontend communicates with the backend through HTTP API routes under `/api`.
- API mutations shall use backend authentication, authorization, validation, and service logic.
- The backend communicates with PostgreSQL through Prisma and tracked migrations.
- Optional integrations include SMTP, VNPAY, S3-compatible storage, Prometheus/telemetry agents, and configured AI services. Missing required configuration shall be reported as unavailable or failed; it shall not be represented as success.

### 3.3 API error interface

Errors shall use the stable shape `{ "error": { "code", "message", "details" } }` when returned by the canonical API contract. Responses shall not disclose passwords, tokens, SQL, Prisma internals, or stack traces.

## 4. Functional Requirements

### 4.1 Authentication and accounts

| ID | Requirement |
|---|---|
| FR-AUTH-01 | The system shall authenticate users using persisted account credentials. |
| FR-AUTH-02 | Public self-registration shall create only the canonical `STUDENT` role. |
| FR-AUTH-03 | For each protected request, the backend shall verify the current database user exists and is active before authorizing the operation. |
| FR-AUTH-04 | An `ADMIN` shall be able to manage user roles, activation, and laboratory assignments. |
| FR-AUTH-05 | The system shall not treat client-side route hiding or client-provided user/role/laboratory identifiers as authorization. |
| FR-AUTH-06 | When external quick booking is enabled, the system shall verify the configured email OTP flow before creating/reusing an external account and proceeding with booking. The account shall retain role `STUDENT` and may carry `customerType=EXTERNAL`. |

### 4.2 Resource catalogue and administration

| ID | Requirement |
|---|---|
| FR-RES-01 | The system shall display public-safe resource catalogue information and a privacy-safe schedule projection. |
| FR-RES-02 | `ADMIN` and correctly assigned `LAB_STAFF` shall be able to create and update resources within their authorization scope. |
| FR-RES-03 | The system shall keep resource category separate from technical subtype and shall not infer unresolved categories. |
| FR-RES-04 | `Resource.operationalStatus` shall be the authoritative physical state. Resource retirement shall preserve historical records. |
| FR-RES-05 | The system shall record and display persisted resource history when supported by the relevant workflow. |

### 4.3 Scheduling and booking

| ID | Requirement |
|---|---|
| FR-BKG-01 | An authenticated user shall be able to request a booking for an eligible resource and time interval. |
| FR-BKG-02 | The system shall evaluate resource policy, operational state, maintenance windows, eligibility, and existing bookings before accepting a request. |
| FR-BKG-03 | A booking that requires approval shall enter `PENDING_APPROVAL`; a policy-approved immediate booking may enter `CONFIRMED`. |
| FR-BKG-04 | Authorized staff shall be able to approve or reject eligible pending bookings. |
| FR-BKG-05 | A booking owner shall be able to view and cancel only their own eligible bookings. |
| FR-BKG-06 | The system shall prevent overlapping active bookings at the database level, including concurrent requests. |
| FR-BKG-07 | Availability shall be derived from operational status, booking intervals, maintenance windows, and applicable policy. |
| FR-BKG-08 | Public schedule data shall omit requester identity and private booking titles. |

### 4.4 Handover and return

| ID | Requirement |
|---|---|
| FR-OPS-01 | Authorized staff shall be able to check out eligible confirmed bookings and record the operational handover. |
| FR-OPS-02 | A successful checkout shall synchronize eligible available resource state to `IN_USE` transactionally. |
| FR-OPS-03 | Authorized staff shall be able to record return and completion evidence for eligible bookings. |
| FR-OPS-04 | An authenticated owner may self-return a checked-out `ROOM` booking only through the approved owner-return workflow and with required condition evidence. This records the owner's declaration, not a staff inspection. |
| FR-OPS-05 | A return shall not silently overwrite a hard physical state such as `BROKEN`, `MAINTENANCE`, `CALIBRATION`, `RETIRED`, or `OFFLINE`. |
| FR-OPS-06 | The system shall retain booking event/history evidence for supported operational transitions. |

### 4.5 Maintenance, notifications, incidents, and audit

| ID | Requirement |
|---|---|
| FR-SUP-01 | Authorized staff shall be able to persist maintenance windows; blocking maintenance shall affect derived availability. |
| FR-SUP-02 | Booking and operational events shall create user-scoped in-app notifications where the workflow defines recipients. In-app persistence shall not imply email or push delivery. |
| FR-SUP-03 | The system shall allow authorized incident workflows to record, review, and resolve persisted incidents. |
| FR-SUP-04 | Security-sensitive administrative and business mutations shall be recorded in append-only audit history where defined by the data model. |

### 4.6 Monitoring and telemetry

| ID | Requirement |
|---|---|
| FR-MON-01 | The system shall accept telemetry only from an authenticated, configured source associated with persisted laboratory/resource scope. |
| FR-MON-02 | The system shall distinguish current, stale, unavailable, and no-data states. No sample shall be shown as a fabricated healthy state. |
| FR-MON-03 | A monitoring alert may create a persisted incident only under approved policy and with source/sample provenance. |
| FR-MON-04 | Automated monitoring shall not change authoritative physical resource state. |

### 4.7 Pricing, payment, and AI assistance

| ID | Requirement |
|---|---|
| FR-EXT-01 | When pricing is configured, the server shall calculate a quote from the persisted resource/purpose pricing rule and preserve the accepted booking price snapshot. |
| FR-EXT-02 | A browser return from a payment provider shall not settle a transaction. Only a valid, verified server callback matching configured merchant and transaction data may update payment state. |
| FR-EXT-03 | Payment unavailability shall remain visible; the system shall not fabricate a successful payment or require payment as a canonical booking status. |
| FR-EXT-04 | AI assistance may search, explain, summarize, or recommend using available data but shall not override authorization, operational state, policy, booking rules, or human approval. |

## 5. Data and Business Rules

| ID | Rule |
|---|---|
| BR-01 | Booking intervals are half-open `[startAt, endAt)` and must have `startAt < endAt`. |
| BR-02 | Active booking overlap protection must be enforced in the database; application pre-checks alone are insufficient. |
| BR-03 | `NO_SHOW` is an event/outcome and shall never be added to `BookingStatus`. |
| BR-04 | Availability is a derived scheduling result; `RESERVED` is not a physical resource state. |
| BR-05 | `LAB_STAFF` scope comes from persisted `UserLabAssignment`; unassigned staff fail closed. |
| BR-06 | Ownership, role, active state, and laboratory scope are verified by backend authorization for sensitive operations. |
| BR-07 | Applied migration files and migration records are immutable; releases use the approved migration deployment workflow. |
| BR-08 | Core runtime workflows shall not fall back to fake authentication, booking, notification, telemetry, or payment success. |
| BR-09 | Operational time interpretation uses `Asia/Ho_Chi_Minh`. |

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-SEC-01 | Sensitive operations shall be protected by backend authentication, authorization, input validation, ownership checks, and laboratory-scope checks as applicable. |
| NFR-SEC-02 | Production shall fail closed when critical secrets or security configuration are missing. Secrets shall not be committed to source control. |
| NFR-DATA-01 | Persistent business state shall use PostgreSQL and Prisma migrations; destructive schema shortcuts shall not be used on shared/development databases. |
| NFR-DATA-02 | Business mutations that require history/audit shall persist their evidence transactionally with the mutation where specified. |
| NFR-API-01 | API errors shall follow the documented stable error shape and avoid leaking implementation details. |
| NFR-UX-01 | Core screens shall work on supported desktop and mobile viewport sizes and expose keyboard-usable controls and clear focus states. |
| NFR-UX-02 | The interface shall provide understandable validation, empty, stale, unavailable, and failure states. |
| NFR-OPS-01 | A clean environment shall have documented, repeatable build, migration, and test commands. |
| NFR-OPS-02 | Release checks shall distinguish required core failures from optional/research workflow failures. |

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Unauthenticated users cannot perform protected account, booking, resource-operation, or administration mutations. |
| AC-02 | `LAB_STAFF` cannot operate outside assigned laboratories; an unassigned staff account is denied. |
| AC-03 | A booking conflict is rejected even when competing requests arrive concurrently. |
| AC-04 | A resource in a hard unavailable operational state is not shown as schedulable merely because no booking overlaps. |
| AC-05 | Public schedule projections do not disclose requester identity or private titles. |
| AC-06 | Booking handover and return preserve truthful operational state and event evidence. |
| AC-07 | Missing SMTP, telemetry, payment, or storage configuration is reported as unavailable/failure where that integration is required. |
| AC-08 | Automated checks and demo evidence are described with their environment, scope, and known limitations; they are not generalized into production certification. |

## 8. Current Status and Traceability Notes

This SRS defines the working product requirements. Current implementation evidence is maintained separately in `docs/CURRENT_STATE.md`, Batch reports, and release/demo runbooks. At the 28 September 2026 checkpoint, core booking, operations, administration, notifications, persisted monitoring, and product-experience work have implementation and automated verification evidence. External SMTP OTP and a live VNPAY merchant transaction remain environment-dependent; physical sensor/camera verification requires real hardware. Optional AI and research workflows are supporting/experimental and do not define the required graduation core.

Requirement status shall be assessed against current code and verification artifacts before each progress report. A passing isolated test or demo does not alone establish production deployment or real-world use.

## Appendix A. Out of Scope for Required Core

- Framework migration or physical source-directory relocation solely to match a reference tree.
- Payment as a booking status or mandatory condition for all bookings.
- Digital Twin, simulation, optimization, genetic scheduling, or research modules as production-core behavior unless separately approved.
- Fabricated telemetry, history, audit, hardware inspection, usage statistics, or benchmark results.
- Production readiness claims that exceed the verified environment and evidence.

## Appendix B. User-approved LAB workspace extension (2026-09-29)

- LAB-UX-01: Provide global VI/EN controls and preserve current form data when
  switching locale. Track residual untranslated interface text separately.
- LAB-UX-02: Place private worklists and confirmed sessions in the signed-in
  landing Check schedule section; keep public schedules privacy-safe.
- LAB-STOCK-01: Persist material receipts/issues with quantity, unit, reason,
  reference and actor. Staff are lab-scoped; admin has global access and records
  inventory-count adjustments. Prevent negative/concurrently overspent stock.
- LAB-STOCK-02: Repeated identical movement IDs have one ledger effect. Changed
  retries fail. Maintenance-linked issues require an open job in the same lab.
- LAB-MAINT-01: Preview affected bookings, reject overlaps, require reasons for
  schedule/status changes, and preserve closed jobs. Resource physical state is
  verified separately; completing maintenance does not certify safe operation.
- LAB-TEACH-01: Admin assigns lecturer-owned course groups. Lecturers supervise
  their groups; students submit/revise their own activities. Academic endorsement
  does not replace staff resource approval, handover or return.
- LAB-MEDIA-01: Show image/video details with truthful loading/unavailable states;
  fail clearly when storage is unconfigured. Reference media is labeled.

Implementation and verification boundaries are recorded in
`LAB_WORKSPACE_EXPERIENCE_REPORT_20260929.md`.


## Appendix C. User-approved bilingual assistant foundation (2026-10-01)

- LAB-I18N-01: Active UI and system feedback shall use matching VI/EN message
  catalogs. Integrity/load failures shall preserve the last valid locale and
  drafts, with explicit recovery; original user evidence shall remain unchanged.
- LAB-AI-01: Global assistant lookups shall use authenticated read-only tools and
  existing account/object/lab scope. Suggested actions shall return to normal
  confirmation forms and never perform implicit business mutations.
- LAB-AI-02: Assistant/MCP work shall have finite independent admission/rate
  budgets, deadlines and cancellation. Model calls shall require usable evidence,
  bounded input/output and failure recovery with truthful provenance.
- LAB-LOAD-01: Shared requests shall preserve caller cancellation, have finite
  response deadlines and avoid automatic mutation retries after uncertainty.
- LAB-HW-01: Normal hardware-off business views shall omit camera/sensor reads
  and disclose deferred monitoring without fabricated health data.

See ADR-025 and `ASSISTANT_REQUEST_HARDENING_20261001.md` for the implemented
boundary and verification evidence.
