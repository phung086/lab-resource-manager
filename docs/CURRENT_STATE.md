# Current Project State

Last synchronized: 2026-09-20

## Current Boundary

Batch 4 & 4.1 - Booking Calendar and Required Booking Workflow is complete and verified.

Batch 5 is NOT currently authorized. No agent may begin Batch 5 until the user
explicitly requests it.

## Completed Core Work

- Batch 1E: canonical PostgreSQL/Prisma persistence cutover.
- Batch 2: database-backed authentication, canonical RBAC, ownership, and
  laboratory scope.
- Batch 3: canonical resource CRUD, operational status, retirement, schedule,
  history, classification review, laboratory scope, and API-driven frontend.
- Batch 2.5 governance bootstrap: repository rules, instructor baseline,
  workflow, project-local compliance skill, SRS, conventions, and engineering
  guidelines.
- Batch 4: unified availability & maintenance enforcement in `bookingService`,
  enforced `LabPolicy` rules, calendar privacy contract separating public availability
  from private booker identity, dynamic Day/Week/Month calendar views, and real
  `QuickBookingModal` decoupled from fake payment.

## Canonical Stack

- Frontend: React 19 + Vite 6 in `frontend/`.
- Backend: Node.js + Express in `backend/`.
- ORM: Prisma 6.
- Database: PostgreSQL 16.
- Backend layering: route -> middleware -> service -> Prisma.
- Frontend layering: view/page -> feature/base component -> API wrapper -> API.

## Frozen Contracts

Roles:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

Booking lifecycle:

`PENDING_APPROVAL` -> `CONFIRMED` -> `CHECKED_OUT` -> `RETURNED` -> `COMPLETED`

Additional terminal states: `REJECTED`, `CANCELLED`.

`NO_SHOW` is a booking outcome/event, not a `BookingStatus`.

`Resource.operationalStatus` is authoritative. Scheduling availability is
derived from resource state, bookings, maintenance windows, and policy.

## Latest Verified Gates

- Backend core tests: 27/27 PASS (`npm run test:core`).
- Batch 4.1 booking policy tests: 16/16 PASS (`test/batch4/bookingPolicy.test.js`, including boundary precision and timezone invariance).
- Batch 4.1 booking calendar integration suite: 14/14 PASS (`test/batch4.booking-calendar.integration.test.js`, including >180 days range validation and effective approval requirement).
- Batch 1E isolated runtime: 11/11 subtests PASS (`test/batch1e/integration.runtime.test.js`).
- Batch 1 canonical persistence and real concurrency: 2/2 PASS (`bookingConcurrency.db.test.js`, `persistenceMigration.test.js`).
- Batch 2 auth/RBAC integration: 10/10 PASS (`test/batch2.auth-rbac.integration.test.js`).
- Batch 3 resource integration: 9/9 PASS (`test/batch3.resource-management.integration.test.js`).
- Batch 2 frontend auth E2E: PASS (`npm run test:e2e:auth`).
- Batch 3 frontend resource E2E: PASS (`npm run test:e2e:resources`).
- Batch 4 frontend calendar Playwright E2E: PASS (`npm run test:e2e:calendar`, verifying slot prepopulation, effective approval requirement, dynamic policy, no timer auto-close, conflict 409, maintenance, and mobile responsive).
- Frontend production build: PASS (Vite 6, 0 errors, 3.23s).
- Production readiness / health / CORS / Helmet smoke: PASS (`GET /health` 200, `GET /health/ready` 200).

The latest Batch 4.1 verification on 2026-09-20 passed all backend core tests (27/27), policy unit tests (16/16), Batch 4 integration subtests (14/14), Batch 1/1E/2/3 regressions, all 3 frontend E2E suites, and the frontend production build.

## Current Core Blockers

None reported by the verified Batch 3 report.

## Known Non-Blocking Debt

- Resource list uses a 250-row hard cap instead of cursor pagination.
- Main Vite bundle is approximately 641 kB minified and triggers the existing
  bundle-size warning.
- Five resources remain intentionally unclassified pending an authoritative
  review decision.
- Dedicated durable audit models are not yet available for every admin and
  laboratory metadata mutation.
- Eleven optional/research tests reference retired implementations and require
  an explicit `RESTORE`, `REWRITE`, `FEATURE_FLAG`, or `RETIRE` decision.
- Legacy booking/payment/research UI must be reviewed only within an approved
  later batch and must not redefine the canonical lifecycle.

## Next Authorized Task

No implementation batch is currently authorized.

Batch 4 is complete and verified. The next task in the project roadmap (e.g. Batch 5 - Operational Workflows, Handover & Incident Management) may only be started after explicit user authorization. Before starting any future batch, read:

1. `AGENTS.md`
2. `.agent/PROJECT_RULES.md`
3. `.agent/DEVELOPMENT_WORKFLOW.md`
4. `docs/CURRENT_STATE.md`
5. `docs/DECISIONS.md`
6. `docs/BATCH4_BOOKING_CALENDAR_REPORT.md`
7. the relevant booking and persistence reports

## Do Not Work On Without Explicit Approval

- framework migration or repository-wide restructure
- AI as business authority
- Digital Twin, simulation, optimization, Pareto, GA/NSGA-II, or showcase work
- payment as a required booking state
- custom MCP/orchestrator infrastructure
- optional/research module restoration
- historical migration edits or shared-database `prisma db push`

## Synchronization Rule

After each approved batch, update this file only with verified facts: current
boundary, completed work, test results, blockers, debt, and the next authorized
task. Do not copy speculative plans into current state.
