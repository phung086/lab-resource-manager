# Phase 1 — migration reproducibility report

Date: 2026-09-24
Source branch: `feature/fresh-migration-reproducibility` at
`c1f9d1e888ccd5475e393f481a1f254ac46ff8af`
Hardening branch: `fix/migration-baseline-hardening`

## Status

**PASS on an isolated PostgreSQL 16 container.** The required CI jobs are part
of the normal workflow; the exact final commit and workflow run are recorded in
the pull request checks and final handoff after GitHub executes them.

## Root cause

The historical reconciliation migration expects SHA-256 values captured from
the original Windows files, which contain mixed line endings. Git stores LF
blobs and `.gitattributes` checks historical migration SQL out as CRLF. A fresh
checkout therefore changes the bytes of predecessor migrations. Prisma records
those new hashes, and the reconciliation migration rejects them.

The first Phase 1 implementation restored clean deployment, but coupled the
baseline guard to the live `backend/prisma/schema.prisma` hash and trusted any
database that merely contained `_prisma_migrations`. That would reject an
ordinary future forward migration and could accept foreign or incomplete
migration history.

## Frozen baseline contract

`backend/prisma/baseline/20260924000100_clean_baseline` is an immutable
historical deployment artifact containing:

- `migration.sql`, the reviewed PostgreSQL 16 schema at the baseline cut;
- `schema.prisma`, the frozen Prisma schema snapshot at that cut;
- `manifest.json`, which records canonical hashes for both artifacts, every
  included historical migration, and the expected PostgreSQL catalog
  fingerprint.

Hashes use UTF-8 text with an optional BOM removed, CRLF and CR normalized to
LF, and the trailing newline preserved. The current live `schema.prisma` is not
compared to the baseline snapshot. It may evolve through later forward
migrations without changing this baseline. A future baseline requires a new
baseline ID and directory; ordinary migrations must never regenerate or mutate
`20260924000100_clean_baseline`.

The catalog fingerprint covers public tables and partitioned tables, views,
materialized views, sequences, enum/domain types, columns/defaults, primary and
foreign keys, unique/check constraints, indexes, non-extension public
functions, non-internal triggers, and public extensions. It therefore includes
the 42 baseline relations plus `btree_gist`, `bookings_no_active_overlap`, both
valid-time constraints, `enforce_resource_schedule_integrity()`, and both
schedule-integrity triggers. `_prisma_migrations` is excluded because Prisma
creates it during the later official resolve step.

## Database classification

The deployment selector classifies the database as one of:

- `EMPTY`: no relevant user-created object exists in `public`;
- `CLEAN_BASELINE`: the accepted marker exists, included migration resolution
  is an allowed prefix, and the frozen catalog fingerprint matches;
- `RECOGNIZED_PRISMA_LINEAGE`: migration rows form a completed canonical
  repository prefix beginning at the accepted origin;
- `UNKNOWN_NONEMPTY`: user-created objects exist without recognized history;
- `INVALID_OR_PARTIAL`: migration history or marker state is empty, foreign,
  duplicated, failed, rolled back, out of order, or otherwise inconsistent.

Only `EMPTY`, structurally verified `CLEAN_BASELINE`, and
`RECOGNIZED_PRISMA_LINEAGE` continue. Unknown and invalid states fail closed.
`prisma migrate resolve --applied` is used only after the frozen catalog
fingerprint has passed; it is never a generic migration-error bypass.

## Recovery boundary

Baseline SQL application is not claimed to be globally resumable. The marker is
written at the end of the baseline SQL. Automatic resume begins only after the
entire baseline SQL and marker have completed and the catalog fingerprint still
matches. If baseline SQL itself is interrupted, the database is classified as
unknown or partial and fails closed; the operator must recreate that initially
empty database and rerun deployment. Once the marker exists, interruption while
recording the twelve included migrations is resumable.

## Database impact

Historical migration SQL and historical `_prisma_migrations` rows are not
modified. Existing recognized lineages keep their row identities, checksums,
timestamps, and logs; only a genuinely pending forward migration may append a
row. Clean databases receive the frozen baseline, official resolve records for
the twelve represented migrations, and all later forward migrations through
normal `prisma migrate deploy`.

## Local verification

The PostgreSQL 16 safety matrix executed all cases below against an isolated
database whose name contains an explicit test marker:

| Case | Result |
| --- | --- |
| Fresh empty database | PASS |
| Idempotent repeat deployment | PASS |
| Resume after 3 of 12 resolve records | PASS |
| Existing legitimate lineage; preserve old rows and append a pending migration | PASS |
| Unknown table | PASS; failed closed |
| Foreign Prisma history | PASS; failed closed |
| Empty `_prisma_migrations` | PASS; failed closed |
| Non-table public object | PASS; failed closed |
| Tampered baseline SQL | PASS; integrity failure |
| Tampered historical migration | PASS; integrity failure |
| Baseline trigger/fingerprint mismatch | PASS before any resolve record |
| Updated current schema plus future forward migration, frozen baseline untouched | PASS |

Additional local gates include Prisma validation/client generation, backend
lint, required backend tests, frontend lint/typecheck/build, and production
Compose configuration. Their final results are recorded in the branch handoff.

## CI-enforced verification

The normal CI workflow retains `fresh-database` for a fresh deploy and repeat
deploy, and adds `migration-safety` for the complete PostgreSQL 16 matrix above.
Backend, frontend, and production Compose jobs remain required. CI evidence is
valid only when every job is green on the exact final PR-head commit.

## Remaining risks

- The baseline catalog fingerprint is PostgreSQL 16-specific by design;
  PostgreSQL major-version upgrades require a separate reviewed migration and
  release exercise.
- Baseline SQL interruption before its marker completes requires recreating the
  initially empty database; deployment does not attempt unsafe inference or
  repair.
- This phase does not implement training eligibility, guest-booking atomicity,
  payment reconciliation, or other business changes.
