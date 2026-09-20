# Batch 1C - Clean PostgreSQL 16 Runbook

Status: **Batch 1D execution instructions only. Do not execute in Batch 1C.**

## A. Preconditions

- Use an isolated PostgreSQL 16 instance/database created for Batch 1D.
- Confirm the target is not the source development database and contains no application rows.
- Confirm the Batch 1A dump and SHA-256 rollback baseline are still available, even though the clean path does not restore it.
- Keep application processes and seeds stopped.
- Use the repository's reviewed migration files without modification.
- Record database name, host, server version and start timestamp without credentials.

## B. Backup Identity

Required safety baseline:

- File: `C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.dump`
- SHA-256: `f43a8dfcad3c36b2f8770fb36b7e01fb616886535d64e6c6691c48387e61fd89`
- Source PostgreSQL: 16.14

Abort if the file is missing or the checksum differs.

## C. Clean-Path Procedure

1. Create a new isolated PostgreSQL 16 database with no application schema/data beyond normal PostgreSQL defaults.
2. Point `DATABASE_URL` only to that test database. Log the database identity with credentials redacted.
3. Run `npx prisma migrate status` and confirm no repository migration has been applied.
4. Run `npx prisma migrate deploy` from `backend`. Do not run `db push` and do not seed first.
5. Confirm all eight migration records, including 1C, are successful and no failed/unfinished record exists.
6. Run Prisma validation/generation and the Batch 1D catalog verifier against this test database.
7. Execute clean-path tests below, then retain evidence or discard the isolated database.

No `migrate resolve` is used on the clean path. The two August migrations must execute normally before 1C.

## D. Expected Migration Behavior

The 1C SQL identifies `clean` only when all 19 Batch 1B out-of-band tables and `resources.operationalStatus` are absent. It then requires all 12 pre-1C application tables to be empty. Any row aborts to avoid fabricating historical timestamps or provenance.

It creates the 19 preserved application/advanced tables, extends the initial core tables to the verified baseline shape (including `maintenance_windows.cost` and `vendor`), then applies the canonical enums, lifecycle fields, constraints, audit retention, staff scope, notifications and telemetry additions. The clean path must be empty before its seven-label `ResourceType` is replaced by the canonical eight-label subtype enum. Optional/advanced tables are preserved; no feature data is seeded.

## E. Exact Batch 1D Tests

1. **Migration replay:** all migrations apply in order on PostgreSQL 16; no manual SQL or resolve operation.
2. **Catalog:** 32 Prisma application models map to tables; expected columns, enum labels, indexes, FKs, CHECKs, GiST constraint, function and two triggers exist.
3. **Prisma contract:** `prisma validate`, `prisma generate`, model count/read and relation query-shape checks pass.
4. **Core writes:** create/update representative campus, lab, scoped user, resource, booking, usage log, notification and telemetry rows using application UUID v4 IDs and UTC timestamps.
5. **Enum negatives:** legacy lowercase Role/BookingStatus/OperationalStatus writes fail.
6. **Range negatives:** equal or reversed booking and maintenance ranges fail with CHECK violations.
7. **Booking concurrency:** two separate transactions attempt the same active resource/range; exactly one commits and one receives SQLSTATE `23P01`.
8. **Booking/maintenance concurrency:** run both arrival orders with synchronized separate connections; exactly one commits and one receives `23P01`.
9. **Maintenance concurrency:** overlapping active maintenance windows serialize and one receives `23P01`.
10. **Isolation contract:** scheduling writes under non-`READ COMMITTED` isolation are rejected with SQLSTATE `25000`.
11. **Boundary behavior:** adjacent half-open ranges `[10:00,11:00)` and `[11:00,12:00)` both commit.
12. **Inactive behavior:** rejected/cancelled/completed bookings and completed/cancelled maintenance do not reserve time.
13. **Audit actor checks:** USER requires `userId`; SYSTEM/SERVICE require non-empty `actorRef` and no fake user.
14. **No-show transaction:** a test fixture records `CANCELLED + NO_SHOW + outcomeAt + UsageLog.NO_SHOW`; no `NO_SHOW` booking state exists.
15. **Notification idempotency:** duplicate non-null `dedupeKey` fails; legacy null keys remain allowed.
16. **Telemetry truth:** null humidity/signals is accepted, 0 and 100 are accepted, out-of-range humidity fails, and no sample is generated automatically.
17. **Retention:** hard-delete of a resource/booking with protected history is rejected by FK constraints.
18. **Staff scope persistence:** duplicate assignments fail; unassigned LAB_STAFF has no inferred assignment.
19. **Transaction rollback:** force a late assertion failure in a disposable clone and prove no partial enum/constraint/data changes commit.

## F. Post-Migration Assertions

- Role labels are exactly `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`.
- Booking labels are exactly the seven canonical lifecycle states.
- Reserving statuses in the GiST predicate are exactly `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`.
- `Resource.status` still exists only as compatibility; `operationalStatus` is populated and authoritative.
- Category remains nullable; no fabricated classifications appear.
- All clean tables remain empty until test fixtures are deliberately inserted.
- `_prisma_migrations` checksums match repository files.

## G. Rollback

No down migration is authorized. On failure, preserve logs and discard the isolated clean database. Recreate a new empty test database for the next attempt. Never point cleanup commands at the development source database or its volume.

## H. Prohibited Operations

Do not run `prisma db push`, `prisma migrate reset`, source-database drop/restore, historical migration edits, manual `_prisma_migrations` writes, seeds before migration, application deployment/restart, or any frontend change.

Passing this runbook proves the repository can build a clean canonical persistence state. It does not approve source application.
