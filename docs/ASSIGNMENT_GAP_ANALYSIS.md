# Assignment Gap Analysis

## 1. Scope authority

This analysis uses the following sources in descending order of authority:

1. Official graduation assignment: **“Xây dựng hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm”.**
2. `PRODUCT.md`, especially the booking lifecycle, real-data rules, backend RBAC, database-level conflict protection and priority order.
3. `docs/PROJECT_DIRECTION.md`, which records the assignment source and the original operational scope.
4. Current repository behavior. Existing code is evidence of implementation state, not evidence that a feature belongs in scope.

The target is a production-quality graduation demo of the required lab workflow. AI, Digital Twin, Pareto, optimization, simulation, MCP and payment are not allowed to delay or distort the required product.

## 2. Executive conclusion

The repository is **not yet a trustworthy implementation of the graduation assignment**. It contains a substantial amount of UI and research/demo work, but the core workflow is split across three incompatible contracts:

- The migration history defines a classic lab-management domain with `lab_staff`, `lecturer`, general resource types, approval, handover/return fields, usage logs, notifications and telemetry.
- The current Prisma schema defines a smaller Smart Booking/VietQR domain with different table columns, enums and only five models.
- The active frontend mixes legacy API-driven screens with newer static/mock “2026” screens that can report login, booking, payment and check-in success without persistence.

The most serious result is that no current database bootstrap path produces a database that is simultaneously compatible with the generated Prisma client and the booking overlap guard:

- `prisma migrate deploy` builds the legacy camelCase schema from migrations.
- The generated Prisma client expects the current mapped snake_case schema in `backend/prisma/schema.prisma`.
- `prisma db push` can create the current schema, but `applyBookingGuard.js` references legacy columns and statuses.

The first development milestone must therefore be a canonical assignment-aligned domain model and a verified migration path. UI redesign is explicitly outside this work.

## 3. Assignment coverage matrix

| # | Official requirement | Current state | Classification | Evidence | Required outcome |
|---|---|---|---|---|---|
| 1 | Authentication and backend RBAC for `admin`, `lab_staff`, `lecturer`, `student` | Active login/register UI is simulated; backend can authenticate but falls back to in-memory users; most routes have no authorization; current Prisma role enum omits `lab_staff` and uses `INSTRUCTOR` instead of `lecturer` | **BLOCKED / FAKE** | `frontend/src/App.jsx:217`, `frontend/src/components/AuthLoginView.tsx:37`, `frontend/src/components/AuthRegisterView.tsx:38`, `backend/src/middleware/auth.js:19`, `backend/src/routes/auth.js:67`, `backend/prisma/schema.prisma:14` | Real API authentication, one canonical role enum, backend policy on every endpoint, negative authorization tests |
| 2 | Resource management for rooms, equipment, machines, experiment kits and materials | Current schema only supports `GPU_CLUSTER`, `LAB_ROOM`, `MEETING_ROOM`, `EDGE_KIT`; backend exposes reads and status patch only; frontend calls missing create/update endpoints; newer admin screen is static | **INCOMPLETE** | `backend/prisma/schema.prisma:23`, `backend/src/routes/resources.js:15`, `backend/src/routes/resources.js:108`, `frontend/src/App.jsx:732`, `frontend/src/App.jsx:755`, `frontend/src/components/AdminResourceManagementView.tsx` | Assignment-aligned taxonomy, persisted CRUD, status changes, validation, staff/admin authorization and tests |
| 3 | Resource lookup: current status, usage schedule and usage history | Resource reads exist but may silently return mock data; schedule is partial; usage history route is missing; current schema removed usage logs and telemetry samples | **INCOMPLETE / FAKE FALLBACK** | `backend/src/routes/resources.js:53`, `frontend/src/App.jsx:182`, `backend/prisma/schema.prisma:60`, migration `20260723000100_init` | Real resource detail endpoint combining status, schedule and auditable usage history |
| 4 | Booking calendar: day, week and month | Backend returns a fixed current-week grid and ignores documented date-range inputs; primary `SmartCalendarView` uses hard-coded September 2026 data; day/week/month controls do not change the data model | **FAKE / INCOMPLETE** | `backend/src/routes/calendar.js:11`, `frontend/src/components/SmartCalendarView.tsx:60`, `frontend/src/components/SmartCalendarView.tsx:85`, `frontend/src/components/SmartCalendarView.tsx:318` | Date-range calendar API and real day/week/month views backed by persisted bookings and maintenance windows |
| 5 | Backend conflict validation plus database-level concurrent protection | Application pre-check exists but is race-prone; current exclusion constraint script targets legacy columns/statuses; active create path catches any DB error and fabricates a successful in-memory booking | **BLOCKED** | `backend/src/services/bookingService.js:29`, `backend/src/services/bookingService.js:123`, `backend/prisma/applyBookingGuard.js:12`, migration `20260820000100_add_booking_guard_constraint` | Correct half-open interval exclusion constraint on canonical columns/statuses, transaction-safe create, deterministic `409`, real PostgreSQL concurrency test |
| 6 | Handover, check-out, return and confirmation | Legacy UI renders actions for `/approve`, `/reject`, `/check-out`, `/check-in`; backend only implements create, check-in and cancel; primary modal closes after a local callback; current schema has no approval actor or handover/return record | **MISSING / FAKE** | `frontend/src/App.jsx:1619`, `frontend/src/App.jsx:1659`, `frontend/src/App.jsx:1679`, `backend/src/routes/bookings.js:58`, `backend/src/routes/bookings.js:81`, `frontend/src/components/BookingActionModal.tsx:50` | Persisted state machine with role checks, transition validation, actor/timestamp and audit records |
| 7 | Equipment condition before and after use | Legacy migration has `handoverCondition` and `returnCondition`; current schema removed both; condition modal is not connected to persisted transitions | **MISSING** | migration `20260723000100_init`, `backend/prisma/schema.prisma:99`, `frontend/src/components/BookingActionModal.tsx` | Condition reports persisted before handover and after return, linked to booking, resource and operator |
| 8 | Notifications for approval result, upcoming booking and return reminder | Mounted notification route is a process-global in-memory array with no user isolation or authentication; no reminder scheduler/job exists | **FAKE / MISSING** | `backend/src/routes/notifications.js:4`, `backend/src/routes/notifications.js:33`, `backend/src/app.js:117` | User-scoped persisted notifications, authenticated read/update endpoints and scheduled reminder generation |
| 9 | Dashboard: utilization, equipment status, booking statistics and incidents | Dashboard reads resources/bookings but returns hard-coded KPI values; no current Incident model or mounted incident route; primary incident screen uses local static data | **INCOMPLETE / FAKE** | `backend/src/routes/dashboard.js:6`, `backend/src/routes/dashboard.js:27`, `frontend/src/components/IncidentManagementView.tsx:31`, `frontend/src/App.jsx:185` | Real aggregate queries, persisted incidents and role-appropriate dashboard payloads |
| 10 | Graduation documentation and production-quality demo | Documentation is extensive, but runtime behavior contradicts production claims; backend test command fails; CI paths are incorrect for the repository root; core UI can fake success | **BLOCKED** | `README.md`, `.github/workflows/ci.yml`, `backend/package.json`, test run recorded in section 8 | Reproducible clean install, migration, seed, test and demo run with no production mocks |

## 4. Canonical domain required by the assignment

The following is the minimum persistent domain. Names can be refined during implementation, but none of these capabilities may be replaced by UI-only state.

| Entity/capability | Minimum responsibility |
|---|---|
| `User` | Identity, password hash, active state and exactly one canonical role: `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT` |
| `Resource` | Code, name, assignment-aligned type, location, capacity, current operational status, approval policy and technical metadata |
| `Booking` | Requester, resource, purpose, time window, canonical workflow status, approval actor and timestamps |
| `BookingTransition` or `UsageLog` | Immutable actor/action/time/reason history for request, approval, rejection, handover, return, cancellation and status changes |
| `ConditionReport` | Before-use and after-use condition, notes, reporter and timestamp; linked to booking/resource |
| `Notification` | User-scoped approval result, upcoming booking and return reminder with read state |
| `TelemetrySample` | Real lab/resource identity, source, sample time, temperature, humidity, online/offline state and optional verified safety/event signals; absence of data remains absence, not synthetic telemetry |
| `Incident` | Resource, reporter, severity, status, description, resolution and timestamps for dashboard incident reporting |
| `MaintenanceWindow` | Resource downtime that blocks availability and is managed by authorized lab operators |

Payment/VietQR and AI models are not dependencies of this domain. If preserved, they must reference the core domain without changing the required booking lifecycle.

### 4.1 Canonical booking state machine

Batch 0 must freeze the following state machine as one shared contract used by Prisma enums, backend validation, frontend labels/actions and automated tests:

| State | Meaning | Allowed next states |
|---|---|---|
| `PENDING_APPROVAL` | A persisted request is waiting for an authorized operator because the resource requires approval | `CONFIRMED`, `REJECTED`, `CANCELLED` |
| `CONFIRMED` | The booking is valid and reserved; resources that do not require approval enter this state immediately after creation | `CHECKED_OUT`, `CANCELLED` |
| `CHECKED_OUT` | Handover is complete, before-use condition has been recorded and the resource is with the requester | `RETURNED` |
| `RETURNED` | The resource has been received back and after-use condition has been recorded; final operator confirmation is pending | `COMPLETED` |
| `COMPLETED` | The booking lifecycle and return confirmation are complete | Terminal |
| `REJECTED` | An authorized operator rejected a pending request with a reason | Terminal |
| `CANCELLED` | The requester or an authorized operator cancelled according to policy, with actor and reason recorded | Terminal |

Rules:

- A resource with `requiresApproval = true` creates a booking in `PENDING_APPROVAL`; otherwise it creates it directly in `CONFIRMED`.
- Payment is not a booking state and must not be required to reach `CONFIRMED`.
- QR arrival/check-in may be retained as an optional timestamped event attached to a confirmed booking. It must not become a mandatory state in the official lifecycle.
- Every transition is validated server-side and recorded with actor, timestamp and reason/condition where applicable.
- Only active reserving states participate in database overlap protection: `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT` and `RETURNED`. Terminal states do not block future time ranges.
- Status aliases, mixed casing and legacy values are migrated once at the persistence boundary; they are not propagated as permanent compatibility values.

### 4.2 Canonical roles and permission matrix

The core role enum is frozen to exactly `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`. No `INSTRUCTOR`, lowercase duplicate or inferred role alias is permitted in the canonical database or authorization checks.

Legend: **Own** means records owned/requested by the current user; **All** means all records in the authorized lab scope; **—** means denied. Service credentials for telemetry ingestion are separate from human roles.

| Assignment-required operation | `ADMIN` | `LAB_STAFF` | `LECTURER` | `STUDENT` |
|---|---:|---:|---:|---:|
| Sign in and read own profile | Own | Own | Own | Own |
| Create/deactivate users and assign roles | All | — | — | — |
| List resources and read current status | All | All | All | All |
| Read resource schedule | All | All | All | All |
| Read usage history | All | All | Own/relevant | Own/relevant |
| Create/update/archive resources | All | All | — | — |
| Change resource operational status | All | All | — | — |
| View maintenance windows | All | All | All | All |
| Manage maintenance windows | All | All | — | — |
| Create a booking | Own or audited on-behalf | Own or audited on-behalf | Own | Own |
| View bookings | All | All | Own | Own |
| Approve/reject bookings | All | All | — | — |
| Cancel booking | All with reason | All with reason | Own under policy | Own under policy |
| Record handover/check-out and before-use condition | All | All | — | — |
| Record return, after-use condition and final confirmation | All | All | — | — |
| Read own notifications and mark them read | Own | Own | Own | Own |
| Report an incident | All | All | Own submission | Own submission |
| Triage/resolve incidents | All | All | — | — |
| View required dashboard/status metrics | All | All | Scoped | Scoped |
| View audit trail | All | All | Own/relevant | Own/relevant |

Every row requires backend enforcement and positive/negative integration tests. Frontend visibility is only a usability concern and is never an authorization control.

## 5. Module classification

### 5.1 REQUIRED

These modules implement an explicit assignment requirement. Their current implementation may still be incomplete or fake.

| Module | Main files | Current disposition |
|---|---|---|
| Authentication and session | `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`, `frontend/src/api.js`, `frontend/src/components/AuthLoginView.tsx`, `frontend/src/components/AuthRegisterView.tsx` | Keep module; replace all fake/fallback behavior with real API behavior |
| User and role administration | `backend/src/routes/users.js`, `frontend/src/components/UserRoleManagement.tsx` | Keep; implement canonical roles, backend admin authorization and persistence |
| Resource catalog and management | `backend/src/routes/resources.js`, `frontend/src/App.jsx` `ResourceView`, `frontend/src/components/AdminResourceManagementView.tsx`, `LabFloorplan.*`, `ResourceDetailsModal.tsx`, `ResourceStatusModal.tsx` | Keep; consolidate onto one real API-driven implementation |
| Resource schedule/history | `backend/src/routes/calendar.js`, expected usage-log API, resource detail UI | Keep; add missing history and real date-range schedule |
| Booking and calendar | `backend/src/routes/bookings.js`, `backend/src/services/bookingService.js`, `frontend/src/components/SmartCalendarView.tsx`, `frontend/src/components/QuickBookingModal.tsx`, legacy `BookingView` in `App.jsx` | Keep; replace mock paths and unify request/response fields |
| Conflict prevention | `backend/src/utils/bookingOverlap.js`, `backend/src/services/availabilityService.js`, `backend/prisma/applyBookingGuard.js` | Keep; rewrite against canonical schema and test with PostgreSQL concurrency |
| Approval/handover/return | booking routes/services, `frontend/src/components/BookingActionModal.tsx`, booking actions in `App.jsx` | Keep; backend endpoints, state machine and condition persistence are missing |
| Notifications | `backend/src/routes/notifications.js`, `frontend/src/components/NotificationCenter.jsx`, notification UI in `App.jsx` | Keep; replace global memory data with user-scoped persistence and jobs |
| Dashboard and required statistics | `backend/src/routes/dashboard.js`, `frontend/src/components/MissionControlOverview.jsx` | Keep; compute real utilization/status/booking/incident metrics |
| Incident tracking | missing backend/model, `frontend/src/components/IncidentManagementView.tsx`, legacy `IncidentView` in `App.jsx` | Keep; implement persistence and role-controlled workflow |
| Real equipment monitoring | `backend/src/metrics.js`, telemetry data contract, `frontend/src/monitoring.js`, `TelemetryNodeCard.tsx`, monitoring/dashboard views | Keep; only display real samples and explicit unavailable/stale states |
| Graduation demo and core tests | `README.md`, deployment docs, `.github/workflows/ci.yml`, core backend/frontend test suites | Keep; make clean install and demo reproducible |

### 5.2 SUPPORTING

These modules directly support a required workflow but must not become independent scope expansions.

| Module | Main files | Boundary |
|---|---|---|
| Maintenance windows | `backend/src/routes/maintenance.js`, `backend/src/services/availabilityService.js`, maintenance UI in `App.jsx` | Supports accurate resource status and availability; mount only after schema alignment |
| Audit/history presentation | `frontend/src/components/AuditLogsView.tsx`, legacy log view, data serializers | Supports usage history and accountable transitions; data must originate from persisted logs |
| Policy/eligibility | `backend/src/services/policyEngine.js`, `frontend/src/components/PolicyRulesConfig.*` | Limit to rules needed by booking/resource access; no optimizer dependency |
| Quota/training/certification | `SafetyQuizModal.*`, training views, `QuotaFairnessDashboard.*` | Preserve only when directly used as booking eligibility rules from `PRODUCT.md`; otherwise feature-flag |
| QR check-in | `QrCheckInModal.tsx`, `QrCheckinModal.jsx`, `QrCodeSvg.tsx` | Optional interaction for a real booking transition; never allowed to simulate success |
| Email delivery | `backend/src/services/emailService.js` | Delivery adapter for persisted notifications; development logging must be explicit and never claim production delivery |
| Resource import and admin seed | `backend/scripts/importResources.js`, `backend/prisma/seedAdmin.js` | Supports demo setup; must validate against canonical schema and fail loudly on invalid production config |
| Prometheus and health/readiness | `backend/src/metrics.js`, health endpoints, Docker/Prometheus configuration | Supports monitoring and production-quality demo; readiness must query PostgreSQL |
| i18n, accessibility and error boundary | `frontend/src/i18n.js`, `ErrorBoundary.jsx`, shared modal/layout components | Cross-cutting support for the required UI |

### 5.3 OPTIONAL_ADVANCED

Keep source code, but remove these modules from the default core navigation and release gate until all required workflows are complete end-to-end. They must be feature-flagged or placed under an Advanced/Research area and must not fabricate production data. Digital Twin, Pareto, GA/NSGA-II, simulation and related research modules must block neither the official core workflow nor the later Smart Laboratory Monitoring extension.

| Module family | Main files |
|---|---|
| AI advisory and copilot | `SmartAdvisoryView.tsx`, `AiMissionCopilot.jsx`, `AiCopilotDrawer.*`, `backend/src/routes/ai.js`, `backend/src/routes/assistant.js`, advisory/assistant services |
| MCP and RAG | `backend/src/assistant/mcpServer.js`, `toolHandlers.js`, `assistantService.js`, `backend/src/services/ragService.js` |
| Efficiency/advanced analytics | `EfficiencyAnalyticsView.tsx`, `backend/src/services/efficiencyService.js`, `backend/src/routes/analytics.js` beyond required dashboard aggregates |
| Digital Twin and replay | `DigitalTwinCanvas.jsx`, `DigitalTwinHeatmap.tsx`, `DecisionTimelineReplay.*` |
| Simulation and what-if | `ScenarioSimulationStudio.jsx`, `WhatIfStudio.jsx`, `WhatIfSimulationStudio.tsx` |
| Optimization and allocation | `OptimizationHubView.*`, `OrchestrationWizard.*`, `ParetoFrontierExplorer.*`, `GeneticAlgorithmVisualizer.*` |
| Research diagnostics | `AiDiagnosticStudio.jsx`, advanced RCA/remediation actions |
| Concurrency visualization | `ConcurrencyStressMonitor.*` |
| Advanced conflict/fairness/escalation presentation | `ConflictResolutionQueue.*`, `QuotaFairnessDashboard.*`, `EscalationsView.tsx` beyond the minimum required operational queue |
| Research migrations/tables | migration `20260820000200_add_orchestration_provenance_and_policy` | Preserve data only after canonical core schema is reconciled |

### 5.4 REMOVE_OR_HIDE

“Remove” here means remove from production execution and default navigation. Source may remain temporarily for migration or research reference.

| Module/behavior | Main files | Reason |
|---|---|---|
| VietQR/payment as a required booking step | `backend/src/routes/payments.js`, `backend/src/services/paymentService.js`, `VietQrModal.jsx`, `VietQrPaymentModal.tsx`, `CostChargebackReport.*` | Outside official scope; current booking defaults to `PENDING_PAYMENT` and makes payment a core dependency |
| Mock production data store | `backend/src/services/store.js` and all runtime imports | Violates `PRODUCT.md`; DB failure must be an error, not fake uptime |
| Frontend production fallback dataset | `frontend/src/mockData.js`, fallback logic in `frontend/src/App.jsx:177-207` | Hides missing APIs and database failures |
| Simulated success actions | `AuthLoginView.tsx`, `AuthRegisterView.tsx`, `QuickBookingModal.tsx`, `VietQrPaymentModal.tsx`, `QrCheckInModal.tsx`, static incident/user/admin screens | Violates no-fake-success rule |
| Duplicate JSX/TSX implementations | duplicate pairs for QR check-in, safety quiz, policy config, quota dashboard, conflict queue, orchestration, Pareto, GA, optimization, timeline, copilot and others | Creates ambiguous ownership and behavior drift; retain one implementation per mounted feature after verification |
| Unused/dead compatibility imports and local-only screens | unused component variants and legacy functions in `App.jsx` after canonical flows are selected | Reduce accidental routing to fake implementations; do not delete advanced capability without preserving it behind a clear boundary |
| Demo seed with weak fixed passwords and swallowed failure | `backend/prisma/seedBookingPlatform.js` | Not acceptable in production path; may survive only as an explicit development fixture |

## 6. Confirmed cross-cutting defects

### 6.1 Database and migration split

- `backend/prisma/schema.prisma` validates syntactically, but it does not describe the schema created by the migration directory.
- Initial migrations create camelCase columns such as `fullName`, `passwordHash`, `resourceId`, `startAt` and `endAt`; current Prisma maps to snake_case columns such as `full_name`, `password_hash`, `resource_id`, `start_time` and `end_time`.
- Migrations create `usage_logs`, `notifications`, `telemetry_samples`, `maintenance_windows` and research tables; current Prisma has no models for most of them.
- Current Prisma adds `vietqr_transactions` and `ai_efficiency_metrics`; no migration creates those tables.
- Role, resource and booking enums disagree in names and values.
- The booking exclusion constraint uses legacy columns/statuses. It cannot protect the current schema created by `prisma db push`.

Target: one assignment-aligned Prisma schema, forward migration(s), verified fresh install and verified upgrade path. Do not edit previously applied migrations until the actual database state and deployment history are known.

### 6.2 Core API contract split

- Legacy booking UI sends `startAt`, `endAt` and `purpose` (`frontend/src/App.jsx:995-1003`). The mounted backend create schema requires `startTime` and `endTime` (`backend/src/routes/bookings.js:10-16`).
- Frontend resource status updates call `PATCH /resources/:id`; backend only implements `PATCH /resources/:id/status`.
- Frontend user administration calls `POST /users` and `PATCH /users/:id`; backend implements neither.
- Frontend calls maintenance, assistant and analytics APIs whose router files exist but are not mounted in `backend/src/app.js`.
- Frontend calls usage logs, incidents, training, simulation, optimization, allocations and labs APIs with no mounted backend implementation.

Target: versioned, documented request/response contracts shared by the mounted frontend and backend. A file existing under `routes/` does not count as an implemented endpoint until it is mounted, authorized, persisted and tested.

### 6.3 Authorization failures

The following mounted operations currently lack required backend enforcement:

- all-user listing and quota mutation;
- resource status mutation;
- listing all bookings;
- booking check-in;
- all payment/ledger operations;
- dashboard, notifications and AI endpoints;
- the duplicate `/api/admin/transactions` handler in `app.js`.

`requireRole` also compares raw enum values while the codebase mixes upper- and lower-case roles. A user can therefore be incorrectly denied or incorrectly routed depending on which seed/registration path created the record.

Target: central role constants, endpoint policy matrix, ownership checks for student/lecturer bookings, staff/admin checks for operations, and integration tests for allowed and denied cases.

### 6.4 Fake success and silent fallback

Confirmed production-risk paths include:

- any email/password logs into the current frontend after a timeout;
- registration creates only browser state;
- DB authentication failure can authenticate an in-memory user without a password hash comparison;
- booking creation catches any Prisma error, including constraint errors, and returns an in-memory booking;
- payment lookup invents a booking when none exists and mock confirmation always returns `success: true`;
- primary booking, payment and QR check-in modals show success without API persistence;
- calendar, user management, incidents, audit logs and several dashboard modules use fixed data;
- notifications are shared process memory, not per-user data.

Target: production paths fail explicitly with stable error codes. Development/test fixtures must be enabled only by explicit environment and never share production routes or success copy.

## 7. Missing required features

1. Canonical assignment-aligned Prisma schema and migration path.
2. Exact four-role RBAC model and backend authorization matrix.
3. Persisted resource CRUD covering all official resource categories.
4. Resource usage history and auditable status history.
5. Real day/week/month calendar backed by date-range APIs.
6. Transaction-safe booking creation with a working PostgreSQL exclusion constraint.
7. Approval/rejection workflow for approval-required resources.
8. Handover/check-out/return/confirmation transitions.
9. Before-use and after-use condition reports.
10. Persisted, user-scoped notifications and reminder generation.
11. Persisted incidents and dashboard incident statistics.
12. Real utilization and booking statistics; no hard-coded KPI values.
13. End-to-end error handling that never converts infrastructure failure into success.
14. Core integration, RBAC and real PostgreSQL concurrency tests.
15. Reproducible CI and graduation demo runbook.

## 8. Test and CI state

Observed on 2026-09-17:

- `npx prisma validate`: passes syntax validation only.
- `npm test` in `backend`: **13 passed, 12 failed**.
- Most failures are import-time errors for deleted/missing research services; `verifyLiveEndpoints.js` also assumes an already-running server and fails with `ECONNREFUSED` in an ordinary test run.
- Existing overlap tests validate the interval formula in memory, not the real PostgreSQL exclusion constraint under concurrent requests.
- There are no reliable core RBAC integration tests, booking lifecycle tests, resource CRUD tests, notification persistence tests or frontend unit tests.
- Frontend has only a build script; no lint, typecheck or test script.
- `.github/workflows/ci.yml` uses `lab-resource-manager/backend` and `lab-resource-manager/frontend` as working directories even though the workflow file is already at this repository root. The Docker command uses the same incorrect nested path assumption.

Required quality gates:

1. Prisma format/validate and migration-on-empty-PostgreSQL test.
2. Upgrade migration test from the retained baseline if existing data must be preserved.
3. Backend lint plus unit and API integration tests.
4. Real PostgreSQL concurrent booking test proving one winner and deterministic conflicts.
5. RBAC matrix tests for every protected route.
6. Frontend lint, TypeScript check for TSX, component tests for required flows and a focused end-to-end graduation demo test.
7. Docker Compose configuration and health/readiness smoke test.

## 9. Implementation order focused on assignment gaps

### Batch 0 — Baseline and data safety

1. Capture the actual development/production database schema and whether any data must be preserved.
2. Inventory which current Prisma models, columns, relations, constraints and stored records are valid and actively used; mark each as preserve, normalize, migrate or retire with evidence.
3. Freeze the canonical API field names and the exact role enum: `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`.
4. Freeze the booking state machine in section 4.1 as the single contract for Prisma, backend, frontend and tests. Payment must not be a mandatory booking state.
5. Freeze the permission matrix in section 4.2 and map every mounted assignment-required route to one matrix row.
6. Separate required, supporting and optional route/navigation registration through explicit configuration; do not delete advanced source.

Exit gate: the team can state which persistence elements are preserved, how incompatible data is normalized, which state/role/API contracts are canonical and how any existing data will be migrated or, only with evidence and approval, reset.

### Batch 1 — Canonical database foundation

1. Reconcile and normalize `schema.prisma` against the verified database and assignment domain. Preserve valid existing models, fields, relations and data wherever possible; do not rewrite working persistence without evidence.
2. Produce an explicit old-to-canonical mapping for renamed columns, enum values, relations and tables before changing persistence.
3. Create forward, additive reconciliation migration(s) with backfill and validation steps; do not silently rewrite migration history or destructively drop data.
4. Migrate booking statuses to the frozen state machine and remove payment as a default booking state/dependency.
5. Reconcile the overlap constraint against canonical resource/time/status columns using half-open ranges `[start, end)`.
6. Add database constraints for valid time ranges and indexes needed by schedule/history queries.
7. Add empty-database migration, upgrade-path and real concurrency tests.

Exit gate: preserved data passes reconciliation checks; a clean PostgreSQL database and the supported upgrade path both migrate successfully, seed an admin, accept one booking and reject a concurrent overlap at database level.

### Batch 2 — Authentication and RBAC perimeter

1. Replace frontend simulated authentication with `/auth/login`, `/auth/register` and `/auth/me`.
2. Remove all runtime `mockStore` authentication fallbacks.
3. Enforce exactly `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT` in backend middleware and every mounted route according to section 4.2.
4. Add ownership rules for student/lecturer records and staff/admin operational actions.
5. Add negative tests first: anonymous, wrong role, inactive user, forged/expired token.

Exit gate: no protected action succeeds without a valid database-backed identity and authorization decision.

### Batch 3 — Resource management and lookup

1. Implement persisted resource create/read/update/status/archive operations.
2. Add assignment-aligned resource types and validation.
3. Implement resource detail with current status, upcoming schedule and usage history.
4. Wire one canonical frontend resource/admin implementation; remove production fallback data.

Exit gate: admin/lab staff can manage real resources; all allowed users can inspect trustworthy status and history.

### Batch 4 — Booking calendar and conflict-safe booking

1. Implement date-range availability and booking APIs for day/week/month.
2. Align frontend and backend request fields.
3. Create bookings inside the database protection boundary and map constraint conflicts to `409 BOOKING_CONFLICT`.
4. Support approval-required and immediate-confirmation resources without payment dependency.
5. Wire `SmartCalendarView` and `QuickBookingModal` to real resources/bookings; remove hard-coded dates and success timers.

Exit gate: two concurrent overlapping requests cannot both persist, and the calendar immediately reflects the winning booking.

### Batch 5 — Approval, handover, return and condition records

1. Implement a validated booking state machine.
2. Add approve/reject, handover/check-out, return/complete and cancel endpoints.
3. Persist before-use and after-use condition reports.
4. Record actor, timestamp, reason and transition in immutable history.
5. Connect `BookingActionModal` and booking action controls to those endpoints.

Exit gate: the full required lifecycle is demonstrable and auditable from request through return.

### Batch 6 — Notifications, incidents and dashboard

1. Persist approval results, upcoming-booking reminders and return reminders.
2. Add user-scoped read/update endpoints and reminder scheduling.
3. Implement persisted incident reporting and staff resolution.
4. Replace hard-coded dashboard KPIs with real aggregates for utilization, resource status, bookings and incidents.
5. Implement a minimal real telemetry contract with required fields: `labId`, `resourceId`, `source`, `timestamp`, `temperatureC`, `humidityPercent` and `online`. Optional safety/event signals must include provenance and a verified/unverified flag; unverified signals cannot be presented as facts.
6. Validate resource ownership, timestamp sanity, numeric ranges, source identity and ingestion authorization before accepting a sample.
7. Derive UI state only from accepted samples and lab/resource thresholds: `HEALTHY` for fresh online data within thresholds, `WARNING` for fresh threshold violations or verified warning signals, `STALE` when the latest sample exceeds the configured freshness window, `UNAVAILABLE` when the source explicitly reports offline/unavailable, and `NO_DATA` when no accepted sample exists.
8. Store telemetry history needed by the required dashboard. Never generate fake production telemetry, fill gaps with invented values or turn no-data into healthy.

Exit gate: dashboard, incidents and notifications are reproducible from database state, scheduled events and accepted real telemetry; each telemetry UI state has deterministic tests, including stale, unavailable and no-data.

### Batch 7 — Production demo hardening

1. Fix CI paths and split core tests from optional research tests.
2. Add lint/typecheck/test scripts and enforce them in CI.
3. Validate CORS, JWT secrets, readiness database query, logging and production environment checks.
4. Put OPTIONAL_ADVANCED modules behind an Advanced/Research boundary.
5. Hide payment/VietQR and any incomplete/fake screen from the default demo.
6. Update deployment and graduation demo documentation using only verified behavior.

Exit gate: a clean machine can start the stack and complete the official demo scenario without mock data or fake success.

### Batch 8 — Smart Laboratory Monitoring Extension

This batch may begin only after the complete 10-step official core graduation scenario in section 10 passes in CI and in the production-like demo environment.

1. Integrate real temperature and humidity sensors using authenticated source identities and the Batch 6 telemetry contract.
2. Track sensor health, last-seen time and explicit offline state independently from the measured resource state.
3. Configure lab/resource-specific thresholds and generate deduplicated alerts from real accepted samples.
4. Create telemetry-triggered incidents with source sample/event references, timestamps and acknowledgement workflow.
5. Add a simple **non-certified** smoke/fire early-warning prototype. Label it clearly as an experimental early-warning aid, not a certified fire-alarm or life-safety system; it must never replace required physical safety equipment or procedures.
6. Integrate camera metadata and optional live view for authorized roles. Raw camera access is denied by default and limited to explicitly authorized `ADMIN`/`LAB_STAFF` users or another role granted a documented scoped permission.
7. Record every camera access attempt and session with actor, resource/camera, purpose, start/end time and outcome in the audit trail.
8. Use WebSocket or SSE where realtime delivery materially improves monitoring; retain authenticated polling/recovery and persisted history as fallback truth.
9. Add telemetry history and monitoring dashboards for temperature, humidity, source health, alerts and linked incidents.
10. AI may summarize or explain verified telemetry and linked incidents. It must cite the source/time range and cannot invent, interpolate or silently fill missing values.
11. Keep Digital Twin, Pareto, GA/NSGA-II, simulation and other research modules optional and independently feature-flagged. They cannot become dependencies of Smart Monitoring.

Exit gate: real sensor data can travel from an authenticated source to persisted history, deterministic state/alert evaluation, staff acknowledgement and audit without synthetic production values; camera access is authorized and audited.

## 10. Required graduation demo scenario

The production-quality demo should prove the assignment with one deterministic workflow:

1. Admin creates users and a representative set of rooms, equipment, machines, kits and materials.
2. Student or lecturer logs in and inspects a resource's current status, schedule and history.
3. User switches calendar day/week/month, selects an available slot and submits a booking.
4. A concurrent conflicting request is rejected by PostgreSQL protection.
5. Lab staff receives and approves the request when approval is required.
6. User receives the approval result and upcoming reminder.
7. Lab staff records before-use condition and hands over/checks out the resource.
8. Lab staff receives the resource, records after-use condition and completes the booking.
9. The user sees history; dashboard statistics and resource status update from persisted data.
10. An incident can be reported and appears in the operational dashboard.

Optional AI may explain a conflict or suggest an alternative slot only after this scenario is fully passing.

The 10 steps above are the unchanged **CORE graduation demo** and remain the release gate for Batch 8.

### 10.1 Optional Smart Lab Demonstration

This is a separate extension demo and never substitutes for a failed or incomplete core demo:

1. A real sensor submits a temperature/humidity measurement with source and timestamp.
2. The monitoring dashboard updates from the accepted persisted sample.
3. A real subsequent measurement violates a configured threshold.
4. The system creates a warning and, according to policy, a linked incident without duplicating the same event.
5. An authorized lab staff member acknowledges the warning/incident.
6. Telemetry history and the audit trail show the measurement, threshold decision, incident and acknowledgement.
7. An authorized operator may optionally open the related camera view; the access is denied to unauthorized roles and recorded in the camera audit log.

## 11. Definition of assignment-gap closure

The required scope is complete only when every required feature has all of the following:

- a usable UI path;
- a mounted API endpoint;
- PostgreSQL persistence through the canonical Prisma schema;
- backend authorization and ownership rules;
- request and state-transition validation;
- explicit error handling with no production fallback or fake success;
- automated tests at the appropriate unit, integration and concurrency levels;
- verified inclusion in the graduation demo and documentation.

Passing a frontend build, showing a static screen or having an unmounted route file does not satisfy a requirement.
