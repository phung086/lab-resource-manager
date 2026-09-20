# Batch 1A - Backup and Restore Validation Report

Status: **COMPLETE - VERIFIED SAFETY SNAPSHOT**
Validated snapshot timestamp: **2026-09-17T09:04:16Z** / **2026-09-17T16:04:16+07:00**
Scope: backup and restore validation only. No application source, `schema.prisma`, migration file, source database row, or source database object was modified.

## A. Source database identity

| Property | Verified value |
|---|---|
| Backend local configuration | `backend/.env` -> `localhost:5432/lab_resources` |
| Root local configuration | `.env` -> `localhost:5432/lab_resources` |
| Docker Compose backend configuration | `postgres:5432/lab_resources` on the Compose network |
| Database | `lab_resources` |
| Database user | `lab_user` |
| PostgreSQL | `16.14`, server version number `160014` |
| Server build | `x86_64-pc-linux-musl`, Alpine build, 64-bit |
| Server address observed through published port | `172.19.0.3:5432` |
| Database OID | `16384` |
| Physical database size at final comparison | `10,738,711` bytes |
| Replica/recovery state | Primary, `pg_is_in_recovery() = false` |
| Application schema | `public` |
| Public tables | 32 total: 31 application tables plus `_prisma_migrations` |
| Docker database service | `lab-resource-manager-postgres-1`, `postgres:16-alpine`, healthy |
| Docker backend service during validation | `lab-resource-manager-backend-1`, exited with code 1 |

Credentials were loaded in-process from the backend environment and were not printed or written to this report. The stopped backend container means there was no active application writer during the snapshot. Row counts captured immediately before and after `pg_dump` were also identical.

## B. Backup file location

Validated custom-format archive:

```text
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.dump
```

This location is outside the Git repository. The archive is not staged or committed.

Associated safety artifacts:

```text
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.metadata.json
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.sha256.txt
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.rows.csv
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.restore.rows.csv
C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.verification.json
```

Backup properties:

| Property | Value |
|---|---|
| Format | PostgreSQL custom archive (`-Fc`) |
| Archive size | `103,074` bytes |
| Archive catalog items | 221 |
| Dump client | `pg_dump (PostgreSQL) 16.14` from the PostgreSQL container |
| Options | Custom format, compression level 9, no owner, no privileges, serializable-deferrable snapshot |
| Source counts stable during dump | Yes |

The dump contains account and business records, including password hashes and user-linked data. It must be treated as a sensitive backup and must not be uploaded or committed.

## C. Backup checksum

Algorithm: **SHA-256**

```text
f43a8dfcad3c36b2f8770fb36b7e01fb616886535d64e6c6691c48387e61fd89
```

The checksum was calculated after copying the archive outside the container and was re-calculated successfully before restore. The checksum sidecar contains the same value and archive filename.

## D. Source row-count manifest

| Table | Source rows | Restored rows | Match |
|---|---:|---:|---:|
| `_prisma_migrations` | 5 | 5 | Yes |
| `ai_conversations` | 0 | 0 | Yes |
| `ai_messages` | 0 | 0 | Yes |
| `behavior_event_logs` | 0 | 0 | Yes |
| `bookings` | 2 | 2 | Yes |
| `buildings` | 1 | 1 | Yes |
| `campuses` | 1 | 1 | Yes |
| `incident_comments` | 0 | 0 | Yes |
| `incidents` | 0 | 0 | Yes |
| `knowledge_chunks` | 8 | 8 | Yes |
| `knowledge_documents` | 4 | 4 | Yes |
| `lab_policies` | 2 | 2 | Yes |
| `laboratories` | 2 | 2 | Yes |
| `maintenance_windows` | 0 | 0 | Yes |
| `notifications` | 10 | 10 | Yes |
| `optimization_decisions` | 1 | 1 | Yes |
| `optimization_runs` | 1 | 1 | Yes |
| `payment_transactions` | 3 | 3 | Yes |
| `policy_versions` | 0 | 0 | Yes |
| `resource_allocations` | 1 | 1 | Yes |
| `resource_capabilities` | 2 | 2 | Yes |
| `resource_requirements` | 1 | 1 | Yes |
| `resource_status_history` | 0 | 0 | Yes |
| `resources` | 9 | 9 | Yes |
| `shipment_orders` | 3 | 3 | Yes |
| `telemetry_samples` | 0 | 0 | Yes |
| `training_courses` | 2 | 2 | Yes |
| `training_requirements` | 1 | 1 | Yes |
| `usage_logs` | 6 | 6 | Yes |
| `user_behavior_scores` | 0 | 0 | Yes |
| `user_certifications` | 1 | 1 | Yes |
| `users` | 5 | 5 | Yes |

Result: **0 row-count differences across 32 tables**.

## E. Restore database identity

| Property | Verified value |
|---|---|
| Restore database | `lab_resources_restore_b1a_pg16_20260917t090416z` |
| PostgreSQL | `16.14` |
| Database user | `lab_user` |
| Database OID | `43411` |
| Physical database size at final comparison | `10,664,983` bytes |
| Restore tool | `pg_restore (PostgreSQL) 16.14` in the PostgreSQL container |
| Restore mode | New database created from `template0`; `--single-transaction`, `--exit-on-error`, no owner, no privileges |
| Restore result | Success, exit code 0 |

The restore database was created under a new unique name. No `--clean`, drop, overwrite, reset, or source-volume operation was used. It has been retained for Batch 1B preflight or independent inspection.

The 73,728-byte physical-size difference is expected from rebuilding heap/index storage into a new database. Logical rows and catalog definitions match exactly.

## F. Restore verification results

| Verification | Source | Restore | Result |
|---|---:|---:|---|
| Public tables | 32 | 32 | PASS |
| Row-count differences | 0 | 0 | PASS |
| Column catalog entries/differences | 344 / 0 | 344 / 0 | PASS |
| Enum values | 78 | 78 | PASS |
| Indexes | 96 | 96 | PASS |
| Constraints | 77 | 77 | PASS |
| Foreign keys | 44 | 44 | PASS |
| Unvalidated foreign keys | 0 | 0 | PASS |
| FK inventory differences | 0 | 0 | PASS |
| Orphans across all foreign keys | 0 | 0 | PASS |
| Migration rows | 5 | 5 | PASS |
| Invalid booking ranges | 0 | 0 | PASS |
| Overlapping active-booking pairs | 0 | 0 | PASS |
| Booking overlap constraint count | 1 | 1 | PASS |
| Extension inventory differences | 0 | 0 | PASS |

Foreign-key validation was not inferred solely from `pg_restore` success. Every one of the 44 single-column foreign keys was enumerated from `pg_constraint`, confirmed as validated, and checked with a child-to-parent orphan query on both databases. Total orphan count is zero on both sides.

Enum inventories match exactly:

| Enum | Values |
|---|---|
| `BookingState` | `bookable`, `restricted`, `non_bookable` |
| `BookingStatus` | `pending`, `approved`, `rejected`, `cancelled`, `checked_out`, `completed`, `no_show` |
| `CertificationStatus` | `pending`, `active`, `expired`, `revoked` |
| `IncidentSeverity` | `low`, `medium`, `high`, `critical` |
| `IncidentStatus` | `reported`, `triaged`, `assigned`, `investigating`, `resolved`, `verified`, `closed` |
| `MaintenanceKind` | `maintenance`, `calibration` |
| `MaintenanceStatus` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `NotificationSeverity` | `info`, `success`, `warning`, `danger` |
| `OperationalStatus` | `available`, `in_use`, `maintenance`, `calibration`, `broken`, `retired`, `offline` |
| `PaymentStatus` | `pending`, `success`, `failed`, `refunded` |
| `ResourceStatus` | `available`, `reserved`, `in_use`, `maintenance`, `offline` |
| `ResourceType` | `room`, `gpu_server`, `raspberry_pi`, `uav`, `camera`, `kit`, `material`, `other` |
| `Role` | `admin`, `lab_staff`, `lecturer`, `student` |
| `ShipmentStatus` | `pending`, `picking`, `delivering`, `delivered`, `cancelled`, `returned` |
| `UsageAction` | `request`, `approve`, `reject`, `check_out`, `check_in`, `status_change`, `telemetry`, `cancel`, `incident_reported` |

## G. Migration-history inventory

The source and restore `_prisma_migrations` rows match exactly, including migration name, checksum, start/finish timestamps, rollback state, step count, and logs.

| Applied migration | SHA-256 checksum | State |
|---|---|---|
| `20260723000100_init` | `c942177016dabbfa0c3465a5e923bd0edf490f238021b6ca96ab65cdca03be96` | Applied, 1 step, not rolled back |
| `20260723000200_remove_resource_owner_default` | `66a1614148472e82df95e52c3649e6119a54c9029fc0d4b4bc71e25a688939aa` | Applied, 1 step, not rolled back |
| `20260723000300_require_explicit_resource_fields` | `df6b0f54b676d92cda13592f3c55bad7b829d9f79058bc1092bf4894e03b9fa7` | Applied, 1 step, not rolled back |
| `20260727000100_add_i18n_message_keys` | `10b67a12359efa91038b95890c1505666e10648d7dd6a12823088544df2c6ed0` | Applied, 1 step, not rolled back |
| `20260817000100_add_maintenance_windows` | `030a4964d697a5b847f94e38e8e5bbecbf921808867a73f15232864b9597022f` | Applied, 1 step, not rolled back |

The known Batch 0 drift is faithfully preserved in the backup: `20260820000100_add_booking_guard_constraint` and `20260820000200_add_orchestration_provenance_and_policy` are still absent from `_prisma_migrations`, even though corresponding objects exist. The backup validates the current state; it does not repair or hide drift.

## H. Constraint/index verification

Catalog comparison results:

- **96/96 indexes match by table, index name, and `indexdef`.**
- **77/77 constraints match by table, name, type, validation state, and `pg_get_constraintdef`.**
- Constraint composition on both databases is 32 primary keys, 44 foreign keys, and 1 exclusion constraint.
- `btree_gist 1.7` and `plpgsql 1.0` exist on both databases.
- Core unique indexes, booking schedule indexes, notification indexes, telemetry history index, maintenance indexes, training/certification indexes, and optional-module indexes all match.

The booking constraint is present and identical on both databases:

```sql
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (
  status IN ('pending', 'approved', 'checked_out')
)
```

This verifies backup fidelity only. As documented in Batch 0, the constraint still requires canonical status reconciliation in Batch 1B and currently omits the future `RETURNED` state.

## I. Mismatches and restore incident

### Validated source versus restore

**No logical mismatch was found.** There are zero differences in table row counts, columns/defaults/nullability, enums, extensions, indexes, constraints, foreign keys, migration history, booking guard definition, or checked data integrity.

Expected identity-only differences:

| Property | Source | Restore | Assessment |
|---|---|---|---|
| Database name | `lab_resources` | `lab_resources_restore_b1a_pg16_20260917t090416z` | Expected |
| Database OID | `16384` | `43411` | Expected |
| Physical size | `10,738,711` bytes | `10,664,983` bytes | Expected storage-layout difference |

### First restore attempt

An earlier archive was produced with local `pg_dump 18.1`. `pg_restore 18.1` attempted to issue `SET transaction_timeout = 0`, which PostgreSQL 16.14 does not support. The restore stopped with exit code 1. Because `--single-transaction` was used, the attempted restore database contains **0 public tables** and no partially restored application schema:

```text
Database: lab_resources_restore_b1a_20260917t090232z
Result: not validated; retained for transparent inspection
```

That PostgreSQL 18 archive is not the approved safety snapshot. The issue was resolved by recreating the dump and restore with PostgreSQL 16.14 tools. No source database object or row was affected.

## J. GO / NO-GO recommendation for Batch 1B

### Recommendation: **GO, WITH THE VERIFIED SNAPSHOT AS A HARD PRECONDITION**

Batch 1B may begin after explicit approval because:

1. A PostgreSQL 16 custom-format backup exists outside the repository.
2. Its SHA-256 checksum is recorded and verified.
3. It restores successfully into a separate PostgreSQL 16 database.
4. All 32 table counts and all inspected catalog definitions match.
5. All 44 foreign keys are validated and both databases have zero FK orphans.
6. Migration-history drift is preserved and visible rather than silently altered.

Conditions for Batch 1B:

- Use only `lab_resources_batch1a_pg16_20260917T090416Z.dump` as the validated rollback snapshot.
- Keep the source database and named volume intact.
- Do not run `prisma db push` or a destructive reset.
- Reconcile `schema.prisma` and migration history through reviewed forward changes only.
- Re-run the same row/catalog/integrity comparison after any Batch 1B migration on a restored copy before touching the source database.
- Obtain separate approval before schema reconciliation or migration-history resolution.

Batch 1A stops here. No Batch 1B action has been performed.
