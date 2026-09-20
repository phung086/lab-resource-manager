# Batch 5 — Canonical Operational Booking Workflow Report

Date: 2026-09-20  
Branch: `batch5-operational-workflow`  
Starting main commit: `08dbf7441a975db22d8266f61bf0d3e0f289e4c1`  
Verification code baseline: `087d0db1d715acda5da754fed9b2259e2b3a403c`  
Status: **COMPLETE & VERIFIED — HARD STOP (BATCH 6 NOT AUTHORIZED)**

## 1. Required Core Delivered

Batch 5 completes the graduation-required operational workflow on the canonical PostgreSQL + Prisma architecture:

`PENDING_APPROVAL -> CONFIRMED -> CHECKED_OUT -> RETURNED -> COMPLETED`

with the alternative terminal transition:

`PENDING_APPROVAL -> REJECTED`

Implemented behavior:

- ADMIN and assigned LAB_STAFF can approve/reject operational bookings.
- Rejection requires a non-empty persisted reason.
- CHECK_OUT requires real `conditionBefore` evidence.
- RETURN requires real `conditionAfter` evidence.
- `actualStartAt`, `returnedAt`, `actualEndAt`, and `completedAt` are server timestamps.
- CHECK_OUT atomically synchronizes AVAILABLE -> IN_USE when the physical resource is eligible.
- RETURN atomically synchronizes IN_USE -> AVAILABLE.
- BROKEN, MAINTENANCE, CALIBRATION, RETIRED, and OFFLINE are never silently overwritten by the return workflow.
- Every booking transition creates one durable transition `UsageLog`.
- Real physical-state changes create `ResourceStatusHistory` plus the existing resource status audit log.
- Approval/rejection creates the owner's persisted in-app notification in the same transaction.
- `GET /api/bookings/:id/history` exposes persisted workflow evidence with owner/LAB_STAFF/ADMIN authorization.
- STUDENT and LECTURER cannot execute staff transitions.
- LAB_STAFF scope remains authoritative through `UserLabAssignment`.
- Competing operators are serialized by the booking row lock and canonical state machine.
- No new `BookingStatus`, role alias, payment state, QR authority, or AI authority was introduced.

## 2. Operational Concurrency & State Integrity

Verified with real PostgreSQL 16:

- concurrent APPROVE versus REJECT commits exactly one legal transition;
- duplicate concurrent CHECK_OUT commits one handover transition;
- one corresponding physical-state transition is persisted;
- invalid second transitions fail with `BOOKING_INVALID_TRANSITION`;
- Batch 4 GiST overlap protection remains intact;
- half-open booking intervals remain intact;
- current `IN_USE` is reported as physical IN_USE while future non-overlapping scheduling availability is not blanket-blocked.

## 3. Frontend Operational Workflow

The canonical booking operations path now follows the instructor-aligned touched-module structure:

`pages/operations/BookingOperationsPage.tsx`
-> `components/features/operations/BookingOperationsView.tsx`
-> cards / workflow timeline / action modal
-> `services/bookingOperations.ts`
-> backend API.

The workflow provides:

- pending approval queue;
- confirmed handover queue;
- checked-out/in-use queue;
- returned-awaiting-completion queue;
- history for COMPLETED/REJECTED/CANCELLED;
- persisted condition evidence;
- persisted operational timeline;
- owner read-only visibility;
- ADMIN global visibility;
- LAB_STAFF assigned-lab visibility;
- mobile operational cards;
- explicit form validation and duplicate-submit protection.

`BookingActionModal` no longer contains the previous UAV/DJI defaults or pre-confirmed inspection facts.

Fake QR/door/SSH/Jupyter success is not part of REQUIRED CORE and remains behind the research feature flag.

## 4. Timezone

ADR-013 preserves `Asia/Ho_Chi_Minh` / UTC+07:00 as the scheduling timezone.

During CI hardening, Batch 4 regression and E2E fixtures were made explicitly Vietnam-time deterministic so Linux/UTC GitHub runners and Windows/local development produce the same policy outcomes.

## 5. Backend Verification — GitHub Actions

Workflow: **Batch 5 Backend Regression**

Latest required-core PASS verifies:

| Gate | Result |
|---|---|
| Backend core | **27/27 PASS** |
| Batch 1 booking concurrency DB | **1/1 PASS** |
| Batch 1 persistence DB | **1/1 PASS** |
| Batch 1E runtime | **11/11 PASS** |
| Batch 2 auth/RBAC | **10/10 PASS** |
| Batch 3 resources | **9/9 PASS** |
| Batch 4/4.1 booking/calendar | **30/30 PASS** |
| Batch 5 operational workflow | **13/13 PASS** |

The workflow uses isolated PostgreSQL 16 databases and never targets the development database.

The Batch 1C reconciliation SQL is executed only through an ephemeral CI bootstrap copy needed because old migration checksum snapshots were recorded on the verified Windows workspace. Tracked historical migration files remain unchanged and `git diff --exit-code -- prisma/migrations` is enforced.

## 6. Full-stack E2E & Runtime Verification — GitHub Actions

Workflow: **Batch 5 Full-stack E2E**  
Verified run: `35518018753`

Environment:

- PostgreSQL 16 service;
- isolated databases for Batch 2, 3, 4, and 5 E2E;
- real Express backend;
- real React/Vite frontend;
- real headless Chromium;
- no mocked API success.

Results:

- Batch 2 frontend auth E2E: **PASS** — unauthenticated + STUDENT + LAB_STAFF + ADMIN + LECTURER.
- Batch 3 frontend resource E2E: **PASS** — STUDENT + LECTURER + LAB_STAFF + ADMIN.
- Batch 4 frontend calendar E2E: **PASS** — booking, privacy, conflict, maintenance, effective approval, mobile.
- Batch 5 frontend operations E2E: **PASS** — approval, handover, condition-before, return, condition-after, completion, timeline, rejection validation, owner visibility, foreign-lab scope, ADMIN global visibility, mobile.
- Frontend production build: **PASS**, Vite build completed in **2.65s** on the verified full-stack run.
- `GET /health`: **PASS**.
- `GET /health/ready`: **PASS** with live DB probe.
- Allowed-origin CORS header: **PASS**.
- Helmet `X-Content-Type-Options: nosniff`: **PASS**.
- E2E screenshots uploaded as a GitHub Actions artifact.

## 7. Standard CI

Latest branch CI also passes:

- backend `npm test`: **PASS**;
- frontend `npm run build`: **PASS**;
- production Docker Compose configuration validation: **PASS**.

## 8. Database Safety

- Schema migration changed: **NO**
- New migration created: **NO**
- Historical migration edited: **NO**
- `_prisma_migrations` manually modified: **NO**
- `prisma db push` used on development/shared DB: **NO**
- Development DB destructively modified: **NO**
- Test data uses guarded isolated database names only.

## 9. Structure / Instructor Baseline

Logical root mapping remains approved:

- `frontend/` == instructor `code/frontend/`
- `backend/` == instructor `code/backend/`
- `backend/test/` == backend test location
- frontend E2E stays under `frontend/`

No risky root relocation was performed.

Batch 5 advances touched-module migration toward:

- `src/pages/operations/`
- `src/components/features/operations/`
- `src/services/`
- `src/types/`
- `src/styles/`
- shared `src/utils/`

See `docs/FRONTEND_STRUCTURE_QUALITY_AUDIT.md`.

## 10. SEO Foundation

Status remains **SEO FOUNDATION READY — NOT VERIFIED IN PRODUCTION**.

Implemented/audited:

- product-accurate Vietnamese metadata;
- authenticated app `noindex` strategy;
- private routes are not exposed for SEO;
- robots policy documented;
- sitemap deferred until real public indexable routes exist;
- canonical production URL deferred until a production domain exists;
- React/Vite retained; no framework migration.

See `docs/SEO_BASELINE_AUDIT.md`.

## 11. Remaining Non-blocking Debt

- resource list still uses the existing 250-row cap instead of cursor pagination;
- Vite main bundle remains above the 500 kB warning threshold;
- ESLint/Prettier/Husky and project-wide strict TypeScript convergence remain incremental frontend-quality work;
- five unresolved resource categories remain intentionally unresolved;
- automatic NO_SHOW processing remains deferred;
- realtime WebSocket/SSE remains deferred;
- QR/access-control hardware integration remains optional/research;
- optional/research legacy modules remain outside REQUIRED CORE.

None of these items blocks Batch 5 graduation workflow completion.

## 12. Final Verification Checklist

1. Governance/rules read: **PASS**
2. Starting commit verified: **PASS**
3. Operational workflow audit: **PASS**
4. Approval: **PASS**
5. Rejection: **PASS**
6. Rejection reason validation: **PASS**
7. Check-out/handover: **PASS**
8. conditionBefore required/persisted: **PASS**
9. actualStartAt persisted: **PASS**
10. Resource -> IN_USE synchronization: **PASS**
11. Return: **PASS**
12. conditionAfter required/persisted: **PASS**
13. returnedAt persisted: **PASS**
14. actualEndAt persisted: **PASS**
15. Resource post-return state: **PASS**
16. Completion: **PASS**
17. completedAt persisted: **PASS**
18. Canonical invalid transitions: **PASS**
19. Transition concurrency safety: **PASS**
20. UsageLog audit integrity: **PASS**
21. ResourceStatusHistory integrity: **PASS**
22. Booking history/timeline API: **PASS**
23. Owner IDOR/privacy: **PASS**
24. LAB_STAFF lab scope: **PASS**
25. ADMIN global authority: **PASS**
26. STUDENT/LECTURER operation denial: **PASS**
27. Approval notification: **PASS**
28. Rejection notification: **PASS**
29. QR fake core flow removed/isolated: **PASS**
30. BookingActionModal fake defaults removed: **PASS**
31. Timezone preserved: **PASS**
32. Frontend operational queue: **PASS**
33. Frontend workflow timeline: **PASS**
34. Accessibility on touched workflow: **PASS**
35. Desktop responsive verification: **PASS**
36. Mobile responsive verification: **PASS**
37. Batch 5 backend tests: **13/13 PASS**
38. Batch 5 frontend E2E: **PASS**
39. Backend core regression: **27/27 PASS**
40. Batch 1 regression: **PASS**
41. Batch 1E regression: **11/11 PASS**
42. Batch 2 backend regression: **10/10 PASS**
43. Batch 3 backend regression: **9/9 PASS**
44. Batch 4/4.1 backend regression: **30/30 PASS**
45. Batch 2 frontend auth E2E: **PASS**
46. Batch 3 frontend resource E2E: **PASS**
47. Batch 4 frontend calendar E2E: **PASS**
48. Frontend production build: **PASS**
49. Health/readiness/CORS/Helmet: **PASS**
50. Schema migration changed: **NO**
51. Historical migration changed: **NO**
52. `prisma db push` used on dev/shared: **NO**
53. Development DB destructively modified: **NO**
54. Required-core blockers: **NONE**
55. Supporting debt: **documented above**
56. Optional/research debt: **documented above**
57. `docs/BATCH5_OPERATIONAL_WORKFLOW_REPORT.md`: **UPDATED**
58. `docs/CURRENT_STATE.md`: **UPDATED AFTER VERIFIED GATES**
59. Batch 6 started: **NO**
60. Batch 6 readiness recommendation: **GO FOR BATCH 6 GATING ONLY — explicit user authorization still required**

## Boundary

**BATCH 5 COMPLETE & VERIFIED.**

**HARD STOP. BATCH 6 HAS NOT BEEN STARTED.**
