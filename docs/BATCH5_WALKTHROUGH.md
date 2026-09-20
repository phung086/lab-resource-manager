# Batch 5 Walkthrough — Canonical Operational Booking Workflow

Date: 2026-09-20  
Canonical repository: `phung086/lab-resource-manager`  
Merged Batch 5 commit: `a9589d9940c7984324152f8a5636f5f67189b322`  
Post-merge state sync: `d56012a1d3067bd93718045363691ac205022c7f`  
Status: **COMPLETE & VERIFIED**

This walkthrough is intentionally written for future Codex/Antigravity sessions that
pull the repository without prior chat context. It explains what Batch 5 changed,
which contracts are now authoritative, where the implementation lives, how it was
verified, and what Batch 6 must build on top of.

## 1. Read This Before Touching Batch 5 or Later Work

Authority order remains:

1. official graduation assignment;
2. `.agent/INSTRUCTOR_BASELINE.md`;
3. `AGENTS.md` and `.agent/PROJECT_RULES.md`;
4. `docs/srs.md`, `PRODUCT.md`, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`;
5. verified batch reports and this walkthrough;
6. current implementation.

Never redesign the architecture from scratch.

Canonical stack:

- React 19 + Vite 6;
- Node.js + Express;
- Prisma 6;
- PostgreSQL 16;
- backend layering: route -> middleware -> service -> Prisma;
- backend authorization is authoritative.

## 2. Frozen Contracts

Roles:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

Booking lifecycle:

`PENDING_APPROVAL -> CONFIRMED -> CHECKED_OUT -> RETURNED -> COMPLETED`

Additional terminal states:

- `REJECTED`
- `CANCELLED`

`NO_SHOW` is a booking outcome/audit event, never a `BookingStatus`.

Active reserving statuses remain:

- `PENDING_APPROVAL`
- `CONFIRMED`
- `CHECKED_OUT`
- `RETURNED`

Intervals use half-open semantics: `[startAt, endAt)`.

`Resource.operationalStatus` is the physical-state authority. Booking status and
physical resource status are different dimensions.

## 3. What Batch 5 Completed

Batch 5 implements the required graduation workflow for approval, handover,
return and completion.

### Approval

`PENDING_APPROVAL -> CONFIRMED`

Allowed:

- ADMIN globally;
- LAB_STAFF only for assigned laboratories.

Persisted evidence:

- `approvedById`
- `approvedAt`
- one transition `UsageLog`
- real `BOOKING_APPROVED` notification for the booking owner.

### Rejection

`PENDING_APPROVAL -> REJECTED`

A non-empty rejection reason is required and persisted.

Persisted evidence:

- rejection transition `UsageLog`;
- actual reason;
- real `BOOKING_REJECTED` notification.

### Handover / Check-out

`CONFIRMED -> CHECKED_OUT`

Required:

- non-empty `conditionBefore`.

Persisted:

- `handoverCondition`
- `actualStartAt`
- transition `UsageLog`.

When physically valid:

`Resource.operationalStatus: AVAILABLE -> IN_USE`

The physical transition is audited in `ResourceStatusHistory`.

### Return

`CHECKED_OUT -> RETURNED`

Required:

- non-empty `conditionAfter`.

Persisted:

- `returnCondition`
- `returnedAt`
- `actualEndAt`
- transition `UsageLog`.

When physical state is still `IN_USE`:

`IN_USE -> AVAILABLE`

More serious physical states such as BROKEN, MAINTENANCE, CALIBRATION, RETIRED
or OFFLINE are not blindly overwritten.

### Completion

`RETURNED -> COMPLETED`

Persisted:

- `completedAt`
- one transition `UsageLog`.

Existing handover/return evidence is never erased.

## 4. Authorization Rules

ADMIN:

- global operational authority.

LAB_STAFF:

- operations only for laboratories assigned through `UserLabAssignment`;
- unassigned staff fail closed.

LECTURER / STUDENT:

- own booking read/history visibility;
- no approve/reject/check-out/return/complete authority.

Client-side button visibility is not authorization.

## 5. Concurrency and Transaction Rules

All operational transitions use the canonical booking transition service.

The service:

1. opens a PostgreSQL transaction;
2. row-locks the booking;
3. reloads current persisted status;
4. validates the canonical state transition;
5. validates required evidence;
6. updates booking state;
7. synchronizes physical resource state when applicable;
8. writes audit/history;
9. writes approval/rejection notification when applicable;
10. commits atomically.

Competing transitions are serialized.

Verified cases include:

- simultaneous APPROVE versus REJECT -> exactly one legal winner;
- duplicate simultaneous CHECK_OUT -> one transition and one physical-state change.

Never duplicate transition rules in route handlers.

## 6. Important Backend Files

Primary files:

- `backend/src/services/bookingService.js`
- `backend/src/services/resourceService.js`
- `backend/src/routes/bookings.js`
- `backend/src/routes/notifications.js`
- `backend/src/middleware/labScope.js`
- `backend/src/constants/bookingStatus.js`
- `backend/prisma/schema.prisma`

Batch 5 test:

- `backend/test/batch5.operational-workflow.integration.test.js`

Batch 5 isolated database helper/seed:

- `backend/test/helpers/batch5Database.js`
- `backend/scripts/seedBatch5E2E.mjs`

No Batch 5 schema migration was needed.

## 7. Important Frontend Files

Canonical touched-module path:

`pages/operations/BookingOperationsPage.tsx`
-> `components/features/operations/BookingOperationsView.tsx`
-> operational cards/timeline/action modal
-> `services/bookingOperations.ts`
-> backend API.

Important files:

- `frontend/src/pages/operations/BookingOperationsPage.tsx`
- `frontend/src/components/features/operations/BookingOperationsView.tsx`
- `frontend/src/components/features/operations/BookingOperationCard.tsx`
- `frontend/src/components/features/operations/BookingWorkflowTimeline.tsx`
- `frontend/src/components/BookingActionModal.tsx`
- `frontend/src/services/bookingOperations.ts`
- `frontend/src/types/booking.ts`
- `frontend/src/utils/timezone.ts`

Batch 5 E2E:

- `frontend/test_batch5_operations_e2e.mjs`

Do not move operational business logic back into `App.jsx`.

## 8. Fake / Research Boundary

The required operational workflow does not use fake QR or hardware success.

Legacy/research behavior such as:

- QR scanner simulation;
- fake door unlock;
- fake SSH/JupyterHub access;
- VietQR payment demo;

must remain outside REQUIRED CORE and behind explicit research/feature boundaries.

Do not restore those flows to make legacy UI/tests green.

## 9. Timezone

Canonical scheduling timezone:

`Asia/Ho_Chi_Minh` / UTC+07:00.

Do not regress to machine-local/browser-local time semantics for scheduling
policy or E2E fixtures.

Relevant decision is recorded in `docs/DECISIONS.md`.

## 10. Verification Evidence

Backend verified with PostgreSQL 16:

- core: 27/27 PASS;
- Batch 1 persistence/concurrency: PASS;
- Batch 1E: 11/11 PASS;
- Batch 2: 10/10 PASS;
- Batch 3: 9/9 PASS;
- Batch 4/4.1: 30/30 PASS;
- Batch 5: 13/13 PASS.

Full-stack verification uses:

- real Express backend;
- real React/Vite frontend;
- isolated PostgreSQL 16;
- headless Chromium.

Frontend regressions:

- Batch 2 auth E2E: PASS;
- Batch 3 resource E2E: PASS;
- Batch 4 calendar E2E: PASS;
- Batch 5 operations E2E: PASS.

Runtime smoke:

- `/health`: PASS;
- `/health/ready`: PASS;
- allowed-origin CORS: PASS;
- Helmet header smoke: PASS.

Standard CI on merged main:

- backend: PASS;
- frontend build: PASS;
- Docker Compose production config: PASS.

Canonical detailed evidence lives in:

- `docs/BATCH5_OPERATIONAL_WORKFLOW_REPORT.md`

## 11. Structure and SEO Work Carried Forward

Batch 5 also established incremental frontend-structure and SEO baselines.

Read:

- `docs/FRONTEND_STRUCTURE_QUALITY_AUDIT.md`
- `docs/SEO_BASELINE_AUDIT.md`

Rules:

- keep React/Vite;
- do not big-bang restructure;
- move touched modules progressively toward pages/features/services/types/etc.;
- SEO applies only to public indexable surfaces;
- authenticated operational/admin pages remain noindex/private;
- current status is `SEO FOUNDATION READY`, not production SEO verified.

## 12. Known Non-blocking Debt

Known debt after Batch 5 includes:

- resource list 250-row cap;
- Vite main-bundle size warning;
- five unresolved resource categories;
- incomplete project-wide frontend lint/Prettier/Husky/strict TypeScript convergence;
- automatic NO_SHOW handling deferred;
- realtime WebSocket/SSE deferred;
- optional/research tests referencing retired modules;
- optional QR/access-control hardware integration deferred.

Do not silently turn these into Batch 6 scope unless the approved Batch 6 plan
requires them.

## 13. Batch 6 Handoff

The authoritative roadmap defines Batch 6 as:

**Notifications, incidents and dashboard**

Required Batch 6 scope:

1. booking upcoming reminders and return reminders;
2. user-scoped notification delivery/read state;
3. persisted incident reporting and staff resolution;
4. real dashboard aggregates for utilization, resource status, booking statistics
   and incidents;
5. minimal real telemetry ingestion/storage;
6. deterministic telemetry UI states:
   `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, `NO_DATA`;
7. no fabricated telemetry.

Batch 6 must build on Batch 5. It must not redefine booking lifecycle,
operational-status authority, role scope, or concurrency guarantees.

Read `docs/ASSIGNMENT_GAP_ANALYSIS.md` before implementing Batch 6.

## 14. Safety Gates for Future Agents

Never:

- use `prisma db push` on development/shared databases;
- edit historical applied migrations;
- edit `_prisma_migrations` manually;
- invent telemetry/history/audit/runtime evidence;
- make AI authoritative;
- restore fake success into required core;
- begin the next batch automatically.

At the end of every batch:

1. run narrow tests;
2. run required regressions;
3. run frontend E2E;
4. run build/runtime smoke;
5. update the batch report;
6. update `docs/CURRENT_STATE.md` only with verified facts;
7. hard stop until the next batch is explicitly authorized.
