# Batch 1E - Canonical Persistence Cutover Report

Status: **COMPLETE - GO FOR BATCH 2**
Cutover date: **2026-09-18**
Scope: Batch 1E-L2 through 1E-U. Batch 2 was not started.

## A. Executive result

| Gate | Result | Evidence |
|---|---|---|
| 1E-L2 isolated runtime | PASS | PostgreSQL 16 canonical clone; 10 runtime areas and controlled outage verified |
| 1E-M fresh backup | PASS | PostgreSQL 16 custom-format archive outside repository |
| Backup restore verification | PASS | 32/32 tables, 71/71 rows, IDs, digests, history and catalog match |
| 1E-N migration resolution | PASS | Two pending migrations independently classified `EXACTLY_EQUIVALENT` |
| 1E-O migrate deploy | PASS | Canonical forward migration applied by `prisma migrate deploy` |
| 1E-P postflight | PASS | Canonical fingerprint, integrity and preservation checks pass |
| 1E-Q Prisma regeneration | PASS | format, validate and generate pass with Prisma 6.19.3 |
| 1E-R backend smoke | PASS | Real development DB HTTP smoke; fixtures fully removed |
| 1E-S rollback readiness | PASS | Backup checksum stable and restored pre-cutover clone retained |
| 1E-T required regression | PASS | 27 core unit tests, 12 L2 integration tests and 2 DB integrity tests pass |
| Optional/research regression | NOT_BLOCKING | 7 pass; 11 legacy test files fail at import because their modules no longer exist |

## B. 1E-L2 isolated integration

Target: `lab_resources_b1e_l2_20260918t150258` cloned from the verified Batch 1D canonical clean database. The helper rejects non-local hosts, the source database name and targets without the `lab_resources_b1e_` marker.

Verified behavior:

1. Real bcrypt/JWT authentication, inactive users, forged/expired tokens and DB-backed `/auth/me`.
2. ADMIN global access and LAB_STAFF assignment scope; LECTURER/STUDENT staff-operation denial.
3. Approval-required booking -> `PENDING_APPROVAL`; immediate booking -> `CONFIRMED`; no payment dependency.
4. Persisted lifecycle and audit evidence through approve, check-out, return and complete; rejection/cancellation and invalid transitions.
5. Concurrent booking maps to HTTP 409 `BOOKING_CONFLICT`; direct PostgreSQL evidence contains SQLSTATE `23P01`.
6. Booking/maintenance exclusion in both directions, non-overlap and different-resource success under `READ COMMITTED`.
7. `Resource.operationalStatus` is authoritative; reservation and maintenance availability are derived by interval.
8. Notifications are persisted, user-scoped and update `readAt` in PostgreSQL.
9. Readiness uses a real PostgreSQL probe.
10. Controlled DB outage returns explicit failure for auth, booking, resources, calendar and notifications; no mock success is returned.

Runtime defects found and corrected by L2 included missing application-generated IDs, an invalid `text = uuid` row lock, incomplete LAB_STAFF lab scoping, non-atomic booking/audit writes, stale transition reads, legacy status overriding the authoritative operational state, silent calendar DB fallback and local-date/UTC calendar drift.

## C. Fresh backup and restore

| Property | Value |
|---|---|
| Source DB | `lab_resources`, PostgreSQL 16.14 |
| Backup | `C:\Users\Admin\LabResourceManagerBackups\Batch1E\lab_resources_batch1e_pg16_20260918T081018Z.dump` |
| Format | PostgreSQL custom archive (`pg_dump -Fc`, PG16 tools) |
| SHA-256 | `4a0f4c55b164bb1b18a966b4f6ea89110ae63745c8dfaeb2edf910fc4e340be9` |
| Source before/after dump | 32 tables, 5 migrations, 71 total rows, unchanged |
| Pre-cutover catalog SHA-256 | `f9304350c949f946ab4479dfdfe223d4ece756590079d641cb714f8ab8182348` |
| Restore DB | `lab_resources_b1e_backup_restore_20260918t081018z` |
| Restore comparison | Exact catalog, row count, row digest, ID and migration-history match |

The dump, checksum, source/restore snapshots and verification JSON files are outside Git. The restored pre-cutover clone is retained for rollback readiness.

## D. Migration history and deploy

The following pre-existing objects were reconfirmed on the development source in a read-only repeatable-read transaction before resolution:

| Migration | Classification | SHA-256 |
|---|---|---|
| `20260820000100_add_booking_guard_constraint` | `EXACTLY_EQUIVALENT` | `658716b3be743f2bbd81b1c2f4dee5248eb1b9751a8eea693ed19b5a2b32eedb` |
| `20260820000200_add_orchestration_provenance_and_policy` | `EXACTLY_EQUIVALENT` | `ca0da76bb6ef6c8d1f04a518cc8398446e499c0c11bcf70e3155937b61b691c3` |

Both were recorded only with `prisma migrate resolve --applied`. `_prisma_migrations` was not edited manually. The approved migration `20260917000100_reconcile_canonical_persistence` was then applied by `prisma migrate deploy`.

Applied migration SHA-256:

```text
64a214a446b5c7564229f1385f50b1ffc897814931b72b619d98e873d5b7905d
```

`prisma db push`, destructive reset and automatic seed were not used.

## E. Postflight and data preservation

| Check | Result |
|---|---|
| Final public tables / migrations / total rows | 33 / 8 / 75 |
| Existing IDs | Preserved across every pre-cutover table |
| Expected row deltas | +3 migration rows; +1 reconciliation status-history row; new assignment table empty |
| Canonical catalog SHA-256 | `f4b0fe5d43dc74a72e7796299851d284d7121d2a85a53a9cec14987ce7e7bb11` |
| Batch 1D canonical equivalence | Exact |
| Roles | `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT` |
| Booking states | `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`, `COMPLETED`, `REJECTED`, `CANCELLED` |
| Booking outcome | `NO_SHOW` preserved separately |
| Invalid booking / maintenance ranges | 0 / 0 |
| FK orphans | 0 |
| Reserved compatibility rows | 0 |
| Null operational status | 0 |
| Booking GiST guard | Present and validated |
| Schedule-integrity triggers | 2 enabled |
| Telemetry rows | 0 before and after; no values generated |
| Unresolved categories | 5 preserved unresolved |
| Advanced/research data | Row counts, IDs and content digests preserved |

The unresolved resources remain `CAM-D435I-01`, `EDGE-RPI5-01`, `RPI-KIT-05`, `UAV-M350-RTK-01` and `UAV-MATRICE-300`.

## F. Smoke and regression

Development post-cutover smoke passed for liveness, DB readiness, login, `/auth/me`, resource read, booking read/create, overlap conflict, valid and invalid transitions, allowed LAB_STAFF scope and denied cross-lab access. A final exact snapshot comparison confirms all smoke fixtures were removed.

Required regression results:

- Core/current unit suite: **27/27 PASS**.
- Batch 1E integration suite: **12/12 PASS**.
- Canonical Prisma persistence and real DB concurrency: **2/2 PASS**.
- Development post-cutover smoke: **PASS**.

Optional/research suite result: **7 pass, 11 legacy files fail before test execution**. The failures are missing-module imports for deleted legacy implementations: concurrency benchmark, conflict forecasting, genetic scheduler, hybrid dispatch, VNPay integration, MQTT subscriber, multi-objective engine, priority scheduler, Digital Twin V2 and eligibility service. These modules are outside the required graduation workflow and did not affect the core gates. They remain explicit technical debt; they were not recreated or allowed to block the official workflow.

## G. Rollback readiness

Rollback trigger: any critical postflight, schema-equivalence, preservation or smoke failure. The approved response is to stop writers, restore the fresh custom-format archive, verify the original fingerprint `f9304350...2348`, and keep the backend stopped. No reverse SQL is approved.

Readiness evidence:

- The archive checksum was recalculated after cutover and still matches.
- The restored pre-cutover clone remains available with 32 public tables.
- Its snapshot exactly matches the source pre-cutover snapshot.
- No rollback was required because every critical gate passed.

## H. Final database status

`lab_resources` is migrated, canonical and clean at 8/8 migrations. It has 33 public tables, 75 total rows including migration history, zero FK orphans and the Batch 1D canonical catalog fingerprint. No test fixtures or active database sessions remain. The Docker backend writer remains stopped intentionally at the Batch 1E hard stop; PostgreSQL remains available.

## I. Files modified for Batch 1E

Runtime and persistence:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260917000100_reconcile_canonical_persistence/migration.sql`
- `backend/src/constants/bookingStatus.js`
- `backend/src/constants/roles.js`
- `backend/src/app.js`
- `backend/src/middleware/auth.js`
- `backend/src/middleware/errors.js`
- `backend/src/middleware/labScope.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/bookings.js`
- `backend/src/routes/calendar.js`
- `backend/src/routes/dashboard.js`
- `backend/src/routes/maintenance.js`
- `backend/src/routes/notifications.js`
- `backend/src/routes/resources.js`
- `backend/src/routes/users.js`
- `backend/src/services/availabilityService.js`
- `backend/src/services/bookingService.js`
- `backend/src/utils/bookingOverlap.js`
- `backend/src/utils/dataContract.js`

Verification artifacts:

- `backend/scripts/captureBatch1EState.mjs`
- `backend/scripts/verifyBatch1EState.mjs`
- `backend/scripts/verifyPendingMigrationEquivalence.mjs`
- `backend/test/helpers/batch1eDatabase.js`
- `backend/test/batch1e/integration.runtime.test.js`
- `backend/test/batch1e/integration.failure.test.js`
- `backend/test/batch1e/postcutover.smoke.test.js`
- Existing Batch 1E unit tests and Batch 1D persistence/concurrency tests
- `docs/BATCH1E_PENDING_MIGRATION_EQUIVALENCE.json`
- `docs/BATCH1E_CUTOVER_REPORT.md`

## J. Remaining blockers and recommendation

Required core blocker count: **0**.

Non-blocking debt:

1. Eleven optional/research test files reference implementations that no longer exist and must be retired, restored behind feature flags, or rewritten against maintained modules in a later approved batch.
2. The optional payment/research surfaces remain outside the verified core graduation scenario and must not be treated as production-ready based on this report.
3. Five resource categories remain intentionally unresolved pending authoritative classification.

Recommendation: **GO for Batch 2**, limited to the approved required graduation scope. Do not treat optional/research modules as validated, and do not start them ahead of the official booking, handover, condition, notification and dashboard requirements.
