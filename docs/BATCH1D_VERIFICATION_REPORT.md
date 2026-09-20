# Batch 1D - Isolated Migration Execution and Concurrency Verification

Status: **EXECUTION COMPLETE ON ISOLATED DATABASES; DEVELOPMENT DATABASE UNCHANGED.**

Final migration SHA-256: `64a214a446b5c7564229f1385f50b1ffc897814931b72b619d98e873d5b7905d`.

## A. Environment

| Item | Verified value |
|---|---|
| PostgreSQL server | 16.14, local Docker container |
| Prisma Client | 6.19.3 |
| Clean target | `lab_resources_b1d_clean_20260918t0308` |
| Upgrade target | `lab_resources_b1d_upgrade_20260918t0308` |
| No-show fail-close target | `lab_resources_b1d_noshow_20260918t0308` |
| Rollback restore target | `lab_resources_b1d_rollback_20260918t0308` |
| Approved dump SHA-256 | `f43a8dfcad3c36b2f8770fb36b7e01fb616886535d64e6c6691c48387e61fd89` |

Every test helper rejects non-local hosts, the source name `lab_resources`, and database names without the explicit `lab_resources_b1d_` marker. No normal application process was pointed at a migrated target.

## B. Skill Usage

No installed global or project-local skill specializes in PostgreSQL, Prisma migrations, transaction testing or database integrity. UI/design skills were intentionally not used. Verification used repository evidence, Prisma CLI/Client, PostgreSQL 16 tools and Node's test runner directly.

## C. Clean Replay Result

**PASS.** A database with zero public tables replayed all eight checked-in migrations through `prisma migrate deploy`. Final inventory is 33 tables including `_prisma_migrations`, 362 columns, 85 constraints, 100 indexes and 46 foreign keys. All canonical enums, lifecycle fields, GiST/CHECK constraints, `user_lab_assignments`, notification dedupe and telemetry extensions exist. Advanced/research tables remain present. No seed ran and the clean database returned to zero application rows after tests.

## D. Snapshot Upgrade Result

**PASS.** A new database was restored from the approved Batch 1A dump with PostgreSQL 16.14 `pg_restore`, using `--single-transaction`, `--exit-on-error`, no owner and no privileges. The forward migration applied successfully after supported history resolution. Application rows changed from 66 to 67 only because the documented UAV reconciliation inserted one status-history row.

## E. Migration-History Resolution Result

Read-only equivalence on the actual upgrade clone reconfirmed both migrations as `EXACTLY_EQUIVALENT` before resolution:

- `20260820000100_add_booking_guard_constraint`
- `20260820000200_add_orchestration_provenance_and_policy`

Pre-resolution history had five completed records. The following supported commands produced seven completed records without changing application-row counts:

```powershell
npx prisma migrate resolve --applied 20260820000100_add_booking_guard_constraint
npx prisma migrate resolve --applied 20260820000200_add_orchestration_provenance_and_policy
```

Applying 1C then produced exactly eight completed migration records. No `_prisma_migrations` row was edited manually.

## F. Pre/Post Data-Preservation Comparison

| Area | Before | After | Result |
|---|---:|---:|---|
| Application rows | 66 | 67 | PASS: one expected history row |
| Users | 5 | 5 | IDs preserved |
| Resources | 9 | 9 | IDs preserved |
| Bookings | 2 | 2 | IDs preserved |
| Orchestration/research rows | 4 | 4 | IDs preserved |
| `_prisma_migrations` | 5 | 8 | Two resolves plus 1C |
| FK orphans | 0 | 0 | PASS across 46 FKs |
| Telemetry samples | 0 | 0 | No fabricated data |

No other table changed row count. Roles became uppercase; booking statuses became `COMPLETED=1` and `CANCELLED=1`; UsageAction values converted losslessly. Historical lifecycle fields and notification types/dedupe keys remain null. Five unresolved resources remain nullable and explicitly listed in `BATCH1D_RECONCILIATION.json`.

## G. Clean-vs-Upgrade Schema Equivalence

**PASS.** Both final catalogs have SHA-256 `f4b0fe5d43dc74a72e7796299851d284d7121d2a85a53a9cec14987ce7e7bb11`. Tables, columns/order/types/nullability/defaults, enums, indexes, FKs/actions, CHECK/exclusion constraints and extensions match exactly. Only data and database identity differ.

## H. Prisma Read/Write Results

**PASS on both databases.** `prisma format`, `prisma validate` and `prisma generate` passed. Integration tests proved canonical-role user creation and invalid-role rejection; resource subtype/category separation; operational status updates; lab assignment uniqueness/FKs; approval and non-approval booking persistence; lifecycle evidence; attributable user/system audit; before/after conditions; notification types/dedupe; nullable/0/100 humidity; verified/unverified signal metadata; no-data behavior; and invalid humidity rejection.

## I. Booking Concurrency Tests

**PASS with real concurrent transactions on both databases.** Overlapping booking pairs produced exactly one commit and one SQLSTATE `23P01`. Five simultaneous identical attempts produced exactly one active reservation and four deterministic `23P01` failures. `RETURNED` blocks overlap. `COMPLETED`, `REJECTED` and `CANCELLED` do not block. Adjacent `[start,end)` intervals both commit.

## J. Booking-Maintenance Concurrency Tests

**PASS.** Both arrival orders were exercised under contention; only one conflicting write committed. Non-overlapping ranges on one resource both committed, and same-time writes on different resources committed independently. Default Prisma transactions work under `READ COMMITTED`. A `Serializable` scheduling write is rejected with SQLSTATE `25000`, leaves no row and leaks no observable lock. The restriction is necessary for the tested row-lock/fresh-snapshot design; runtime code must not override scheduling transactions to another isolation level.

## K. State-Machine Tests

**PASS for persistence representation; runtime enforcement remains required.** The schema persisted `PENDING_APPROVAL -> CONFIRMED -> CHECKED_OUT -> RETURNED -> COMPLETED` with transition evidence. PostgreSQL intentionally does not enforce the transition graph: a test proved `COMPLETED -> CONFIRMED` can be written directly. Illegal transition rejection must be implemented and tested in the canonical booking service before runtime cutover; this report does not claim DB enforcement.

## L. no_show Verification

**PASS.** The approved snapshot has zero booking no-shows, zero behavior `NO_SHOW` events and zero nonzero no-show counters. Canonical `BookingStatus` excludes `NO_SHOW`; `BookingOutcome.NO_SHOW` plus `UsageLog.NO_SHOW` successfully represents a future event. A disposable legacy fixture with one `status=no_show` failed before mutation with `P0001: Cannot losslessly migrate 1 booking rows with status=no_show; review required`. Its legacy Role enum, booking row and absence of `BookingOutcome` remained unchanged.

## M. Audit Retention Tests

**PASS for the seven designed critical FKs.** Resource and booking deletion with protected history was rejected; audit/condition/transition rows were not cascaded. Resource retirement and terminal booking states remain the operational strategy. Remaining noncritical/optional cascades are unchanged from the reviewed design.

## N. Telemetry/Notification Integrity Tests

**PASS.** No migration-generated telemetry or notifications appeared. Test-only telemetry accepted null, 0 and 100 humidity and rejected 101; verified-signal metadata remained explicit and nullable. Duplicate non-null notification `dedupeKey` was rejected while canonical type persistence succeeded.

## O. Rollback Restore Test

**PASS.** A migrated disposable database was verified at 33 tables/eight migrations and dropped. The approved dump was restored into `lab_resources_b1d_rollback_20260918t0308`. It exactly matches the pre-upgrade clone: 32 tables, five migration records, 71 total rows including migration history, identical row/content digests, migration history and catalog hash.

## P. Re-run and Migrate-Status Verification

**PASS.** A second `prisma migrate deploy` on both final databases reported no pending migrations. `prisma migrate status` reported both schemas up to date. Recaptured inventories show no duplicate index, constraint, backfill or enum transformation.

## Q. Failures Discovered

1. The first upgrade restore attempt used local `pg_restore` 18, which emitted unsupported `transaction_timeout` against PostgreSQL 16. It failed before creating a table. Root cause: client/server major mismatch already documented in Batch 1A.
2. The first no-show fail-close test rolled back correctly but Prisma surfaced only a generic transaction-aborted error. Root cause: the actionable exception occurred inside the migration's explicit transaction and was obscured by subsequent transaction handling.

## R. Fixes Made

1. Restore execution was switched to PostgreSQL 16.14 inside the container; a new clone restored successfully.
2. A read-only no-show preflight was added before `BEGIN` in the new 1C migration. Re-run produced the exact actionable `P0001` error before mutation.
3. Equivalence verification was parameterized for local `lab_resources_b1d_*` clones while preserving localhost/read-only/name guards.
4. Dedicated target guards, snapshot/reconciliation/source-audit scripts and two database test suites were added.
5. Clean replay, upgrade, Prisma integration, concurrency, reconciliation, no-show and rollback checks were all repeated after the migration correction.

Updated migration SHA-256: `64a214a446b5c7564229f1385f50b1ffc897814931b72b619d98e873d5b7905d`.

## S. Remaining Risks

- The current backend still uses legacy enum/field/status contracts and must not run against the canonical schema.
- Illegal booking transitions are not database-enforced; the booking service must enforce and audit them.
- Runtime mapping from SQLSTATE `23P01` to `BOOKING_CONFLICT` is not implemented in this batch.
- Runtime LAB_STAFF authorization does not yet consume `user_lab_assignments`.
- The compatibility `Resource.status` projection is a one-time migration backfill; runtime writers must use `operationalStatus` as sole authority and maintain any temporary projection transactionally.
- One LAB_STAFF remains unassigned and five resource categories remain unresolved by design.
- Scheduling transactions explicitly using Repeatable Read or Serializable will receive `25000`; runtime transaction configuration must be audited.

## T. Source Database Status

**UNCHANGED.** A final read-only audit compared all 32 source tables with the fresh rollback restore. All 71 rows, per-table counts and content digests match. No migration, resolve, reset, restore, seed or schema command targeted `lab_resources`; the original named volume remains intact.

## U. GO / NO-GO Recommendation

**Batch 1D migration verification: GO.** The migration is executable and data-safe on the tested clean and verified-snapshot paths.

**Applying it to the development database now: NO-GO.** Proceed only to a separately approved Batch 1E cutover plan that first coordinates backend enum/query/state-machine/RBAC/error-mapping compatibility, captures a fresh backup if source data changed, stops writers, repeats target identity checks and defines post-cutover smoke/rollback gates. This report does not authorize development-database application.
