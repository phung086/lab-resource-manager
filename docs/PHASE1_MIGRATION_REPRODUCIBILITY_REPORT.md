# Phase 1 — migration reproducibility report

Date: 2026-09-24
Branch: `feature/fresh-migration-reproducibility`

## Status

**PASS locally on isolated PostgreSQL 16.15.** GitHub CI confirmation remains a
merge gate after the branch is pushed.

## Root cause

The historical reconciliation migration expects SHA-256 values captured from
the original Windows files, which contain mixed line endings. Git stores LF
blobs and `.gitattributes` checks migration SQL out as CRLF. A genuinely fresh
checkout therefore changes the bytes of all seven predecessor migrations.
Prisma records those new hashes, and the reconciliation migration rejects them.

The failure was reproduced on a fresh checkout against PostgreSQL 16.15. The
first seven migrations applied and Prisma recorded the predicted CRLF hashes;
`20260917000100_reconcile_canonical_persistence` then failed. The same database
chain from the original mixed-byte worktree applied all twelve prior migrations,
confirming that the failure is byte/checksum portability rather than schema SQL.

## Implementation

- Added a reviewed schema-only clean baseline generated from the successfully
  migrated canonical PostgreSQL 16 schema.
- Added an explicit manifest listing the twelve migrations represented by that
  baseline and a normalized `schema.prisma` SHA-256 guard.
- Added `deployCanonicalMigrations.mjs`:
  - baselines only a completely empty `public` schema;
  - uses Prisma `migrate resolve --applied`, never direct migration-table edits;
  - resumes an interrupted baseline through durable deployment metadata;
  - preserves existing Prisma migration lineages;
  - rejects unknown non-empty schemas;
  - runs normal forward `migrate deploy` and `migrate status` afterward.
- Added one forward migration for deployment-baseline metadata. Historical
  migrations were not edited.
- Added fresh PostgreSQL 16 deploy and idempotent repeat deploy to normal CI.

## Database impact

Existing databases receive one additive internal table:
`_lrm_deployment_baselines`. It remains empty for historical lineages. Clean
installs retain one row identifying the reviewed baseline. No application data,
canonical enum, booking constraint, role, or business model was changed.

## Verification

| Check | Result |
| --- | --- |
| Reproduce old fresh-checkout failure on PostgreSQL 16 | PASS |
| Capture Prisma's seven predecessor checksums | PASS; matched predicted fresh CRLF hashes |
| Clean baseline deploy to empty PostgreSQL 16 | PASS |
| Repeat canonical deploy | PASS; no pending migrations |
| Resume after only 3/12 baseline resolves | PASS |
| Upgrade existing 12-migration lineage with forward metadata migration | PASS |
| Reject unknown non-empty schema | PASS |
| Clean-baseline schema vs existing-lineage schema-only dump | PASS; identical |
| Prisma schema diff against clean baseline database | PASS; no difference |
| `prisma validate` and client generation | PASS |
| Backend lint | PASS |
| Backend required/core tests | PASS, 27/27 |

## Remaining risk

The branch still requires a successful GitHub Actions run from a Linux fresh
checkout. Future changes to `schema.prisma` must regenerate and review the clean
baseline or the deployment script will fail closed on its schema hash guard.
Phase 1 does not implement training eligibility or guest-booking changes.
