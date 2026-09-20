# Batch 5 — Canonical Operational Booking Workflow Report

Date: 2026-09-20  
Branch: `batch5-operational-workflow`  
Starting main commit: `08dbf7441a975db22d8266f61bf0d3e0f289e4c1`  
Status: **IMPLEMENTED — RUNTIME VERIFICATION PENDING**

> This report does not claim PASS for tests that have not actually run. Batch 6 is not authorized.

## Implemented Required Core

- PENDING_APPROVAL → CONFIRMED approval with authenticated approver and timestamp.
- PENDING_APPROVAL → REJECTED with mandatory real rejection reason.
- CONFIRMED → CHECKED_OUT with mandatory `conditionBefore` and `actualStartAt`.
- CHECKED_OUT → RETURNED with mandatory `conditionAfter`, `returnedAt`, and `actualEndAt`.
- RETURNED → COMPLETED with `completedAt`.
- Invalid transitions retain `409 BOOKING_INVALID_TRANSITION`.
- Booking row locking remains the state-transition concurrency guard.
- LAB_STAFF scope is revalidated inside the transition transaction.
- Check-out locks the resource and atomically changes AVAILABLE → IN_USE.
- Return changes IN_USE → AVAILABLE; hard physical states are preserved with an operator warning.
- Real physical changes create ResourceStatusHistory plus status UsageLog.
- Each booking transition creates one transition UsageLog.
- Approval/rejection creates owner Notification in the same transaction.
- `GET /api/bookings/:id/history` exposes persisted workflow events with owner/staff/admin access rules.
- Resource availability no longer treats current IN_USE as an indefinite future scheduling block.

## Frontend

The active bookings tab now mounts:
`pages/operations/BookingOperationsPage.tsx`
→ `components/features/operations/BookingOperationsView.tsx`
→ operation cards/timeline
→ `services/bookingOperations.ts`.

The canonical operation modal contains no hardcoded UAV/DJI booking, fake inspection result, auto-confirmed checklist, or fake hardware success. STUDENT/LECTURER receive owner-level read/cancel UX only; ADMIN/LAB_STAFF receive contextual operational actions.

Fake QR/check-in and VietQR surfaces are not part of the required-core booking workflow and remain research-gated.

## Timezone

Batch 4.1 canonical scheduling timezone remains Asia/Ho_Chi_Minh (UTC+07:00). Batch 5 operational timestamps reuse the same formatter.

## Tests Added

- `backend/test/batch5.operational-workflow.integration.test.js`
- `backend/test/helpers/batch5Database.js`
- `backend/scripts/seedBatch5E2E.mjs`
- `frontend/test_batch5_operations_e2e.mjs`
- scripts: `npm run test:batch5`, `npm run test:e2e:operations`

The integration suite covers approval/rejection, role and lab scope, condition evidence, physical-state synchronization, completion, history/IDOR, concurrent approve-vs-reject, duplicate check-out, and IN_USE current-vs-future availability semantics.

## Database / Migration Status

- Schema migration changed: **NO**
- Historical migration changed: **NO**
- `prisma db push` on dev/shared: **NO**
- `_prisma_migrations` manually modified: **NO**

## SEO / Structure

See `docs/SEO_BASELINE_AUDIT.md` and `docs/FRONTEND_STRUCTURE_QUALITY_AUDIT.md`.
Current SEO status is **SEO FOUNDATION READY**, not production-verified.

## Verification Still Required Before Batch 5 Can Be Marked COMPLETE

Run against isolated PostgreSQL 16:
- backend core;
- Batch 1 persistence/concurrency;
- Batch 1E;
- Batch 2;
- Batch 3;
- Batch 4/4.1;
- Batch 5;
- frontend auth/resource/calendar/operations E2E;
- production build;
- health/readiness/CORS/Helmet.

Until those gates have actual evidence, `docs/CURRENT_STATE.md` must not say Batch 5 is verified.

## Boundary

**HARD STOP. Batch 6 has not been started.**
