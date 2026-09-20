# Batch 1C - Verified Snapshot Upgrade Runbook

Status: **Batch 1D execution instructions only. Do not execute in Batch 1C.**

## A. Preconditions

- Use a new isolated PostgreSQL 16 database restored from the approved Batch 1A dump.
- Never restore over, resolve, migrate or otherwise mutate the source development database.
- Stop all application writers for the test target.
- Confirm the restored row-count manifest, table count, enum inventory, indexes, constraints, FKs and migration history match Batch 1A/1B evidence.
- Re-run pending-migration equivalence checks before any resolution. Any partial difference is a hard stop.

## B. Backup Identity

- Dump: `C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.dump`
- SHA-256: `f43a8dfcad3c36b2f8770fb36b7e01fb616886535d64e6c6691c48387e61fd89`
- Verified source: PostgreSQL 16.14, database `lab_resources`
- Batch 1A reference restore: `lab_resources_restore_b1a_pg16_20260917t090416z`

Abort if checksum, PostgreSQL major version, restore manifest or catalog fingerprint differs.

## C. Equivalence and Resolution

The verified reference restore classifies both pending migrations as `EXACTLY_EQUIVALENT`:

- `20260820000100_add_booking_guard_constraint`
- `20260820000200_add_orchestration_provenance_and_policy`

Before resolution on the new 1D clone, verify again that:

- `btree_gist` and the exact validated GiST guard exist, with zero active overlap pairs.
- The five orchestration tables have 61 columns, 15 indexes including PKs, 13 constraints, exact defaults/FKs and zero orphans.
- Preserve their existing rows: one each in requirements, allocations, optimization runs and decisions; zero policy versions.
- Both migration records are still absent.
- Both migration SQL SHA-256 values match `BATCH1C_PENDING_MIGRATION_EQUIVALENCE.json`.

Only then, with `DATABASE_URL` explicitly pointing to the isolated clone, run from `backend`:

```powershell
npx prisma migrate resolve --applied 20260820000100_add_booking_guard_constraint
npx prisma migrate resolve --applied 20260820000200_add_orchestration_provenance_and_policy
```

Immediately inspect `_prisma_migrations` through Prisma tooling. Do not edit it manually. If either command is uncertain or fails, stop; do not retry with a different migration name or checksum.

## D. Upgrade Procedure

1. Capture pre-upgrade database identity, row counts, per-table ID sets/content digests, enum distributions, catalog hashes and orphan counts.
2. Confirm booking `no_show=0`, behavior `NO_SHOW=0`, `noShowCount>0=0`, invalid booking/maintenance ranges=0, and `ResourceStatus=reserved=0`.
3. Confirm the only status-authority disagreement is the exact `UAV-M350-RTK-01` row documented in Batch 1B.
4. Resolve the two exactly equivalent migrations as above.
5. Run `npx prisma migrate status`; 1C must be the sole unapplied migration.
6. Run `npx prisma migrate deploy`. Do not use `db push`.
7. Keep the application stopped. Run catalog, data-preservation, Prisma and concurrency tests before any runtime work.

The migration's catalog hashes reject any partially equivalent upgrade shape. Its explicit transaction and table locks ensure enum/guard/FK replacement cannot commit partially.

## E. Expected Data Changes

No application row is deleted. Expected updates are limited to:

- Physical Role labels become uppercase without changing users/IDs.
- Booking statuses map losslessly to canonical uppercase labels; the two existing rows remain one `COMPLETED` and one `CANCELLED`.
- UsageAction labels become uppercase without changing six existing log rows.
- Four unambiguous resources receive categories: one room and three GPU machines.
- Five Raspberry Pi/UAV/camera resources keep null category pending review.
- `UAV-M350-RTK-01.operationalStatus` becomes `MAINTENANCE` under the exact precondition and one migration-owned status-history event is inserted.
- Legacy compatibility status is projected one-way from operational authority.
- Existing notification types remain null; no notification is sent.
- Lifecycle timestamps/outcomes remain null; no historical time/actor is invented.
- Telemetry remains at zero rows; no values are generated.
- `user_lab_assignments` remains empty; the one LAB_STAFF user remains explicitly unassigned.

## F. Exact Batch 1D Verification

1. **Preservation:** all pre-existing table row counts and primary-key sets remain identical except `resource_status_history`, which gains exactly the documented correction row.
2. **Content diff:** only approved enum representations, category backfills, the UAV operational correction and compatibility projection may differ.
3. **Migration history:** eight completed rows are expected: seven prior migrations plus 1C, with no failed/rolled-back ambiguity. Report the exact records and checksums.
4. **Catalog:** compare all target columns, enums, indexes, CHECKs, FKs, triggers and function with `schema.prisma` plus SQL-only objects.
5. **Relations/orphans:** zero orphans after critical FK action changes and new lab assignments.
6. **Prisma reads:** all 32 models count/read; all relation query shapes succeed.
7. **Prisma writes:** canonical create/update tests prove UUID-v4 service IDs, `@updatedAt`, UTC timestamp handling and enum serialization.
8. **no_show fail-close:** in a separate disposable fixture clone, create a legacy `no_show` booking before resolution/application and prove 1C aborts with no partial commit.
9. **Unknown-shape fail-close:** alter one disposable orchestration default/index and prove catalog hash preflight aborts before mutation.
10. **Unknown-value fail-close:** test unknown notification type and an unexpected resource-status disagreement in disposable clones.
11. **Concurrency:** synchronized booking/booking, booking/maintenance in both arrival orders, maintenance/maintenance, adjacent boundary, inactive-state, isolation-contract and rollback cases from the clean runbook.
12. **Error contract:** all overlap paths expose SQLSTATE `23P01`; record constraint diagnostics needed for later `BOOKING_CONFLICT` mapping.
13. **Retention:** protected history blocks resource/booking hard-delete; normal reads and retirement remain valid.
14. **No fake data:** notification and telemetry counts do not increase except deliberate isolated test fixtures.
15. **Restart safety:** do not start the current backend because its runtime enum/status field usage has not yet been migrated.

## G. Rollback and Restore Conditions

If migration execution fails, PostgreSQL must roll back the explicit transaction. Capture the error, catalog and `_prisma_migrations` state; do not manually repair migration metadata.

If post-commit verification fails, discard the isolated clone and restore the same verified dump into a new test database. Do not write a reverse enum migration and do not reuse a database with uncertain migration history.

Source development rollback is out of scope. Eventual source application requires a fresh backup if source data changed after Batch 1A and separate approval after 1D passes.

## H. Prohibited Operations

Still prohibited: applying or resolving against source, `prisma db push`, `migrate reset`, source drop/restore, editing historical migration SQL/checksums, manual `_prisma_migrations` writes, seeding telemetry/notifications, starting the app on the migrated clone, frontend changes, and removal of advanced/research tables.

Passing this runbook proves the verified snapshot upgrade path. It does not approve development-source application or runtime deployment.
