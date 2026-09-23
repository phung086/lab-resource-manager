# Batch 7 Production Demo Hardening Report

Date: 2026-09-21

Branch: `final-graduation-hardening`

Synchronized starting SHA: `71da1683fc1c8bf842d2fc5b1313b45ac15499c1`

Verdict: **GO**

## Scope and authority

Batch 7 hardened the already verified required graduation workflow. It did not
change the canonical roles, booking statuses, resource taxonomy, authoritative
`Resource.operationalStatus`, or the React/Vite + Express/Prisma/PostgreSQL 16
architecture.

The pre-implementation classification and evidence are recorded in
`docs/FINAL_PREIMPLEMENTATION_AUDIT.md`.

## First production failure and migration conclusion

The first production-like Compose start failed before the API could start. The
legacy migration bridge attempted to rename a migration directory from
`/app/prisma` to `/tmp`, and Linux returned `EXDEV` because the paths were on
different filesystems.

The same clean isolated PostgreSQL 16 database then accepted the complete
tracked migration chain with ordinary `prisma migrate deploy`; `prisma migrate
status` reported the schema up to date. The bridge was therefore unnecessary,
not a genuine clean-deploy requirement.

Resolution:

- removed `backend/scripts/deployCanonicalMigrations.mjs`;
- made `db:deploy` run tracked migration deploy, migration status, then guarded
  administrator seeding;
- simplified active Batch 5, 6, and 7 workflows to use the tracked migration
  chain without hiding, moving, or rewriting migration files;
- left all eight historical applied migration files byte-for-byte untouched;
- documented ordinary clean deployment as the canonical path.

Clean deployment was verified on eight independent marker-guarded local
PostgreSQL 16 databases and in a Linux production image.

## Required-core and research boundary

- Optional AI, optimization, payment, Digital Twin, simulation, orchestration,
  audit-log showcase, and other research surfaces are excluded from the default
  navigation.
- Optional frontend modules are dynamically imported only when
  `VITE_ENABLE_RESEARCH_FEATURES=true`.
- The default production entry bundle fell from approximately 622 kB to 392 kB
  minified; optional surfaces are emitted as separate chunks.
- Required booking, resource, operations, notification, incident, telemetry,
  and dashboard routes remain eager and unchanged in authority.

## Quality and security hardening

- Backend user creation now delegates password hashing and persistence to a
  service rather than performing direct Prisma writes in the route.
- Backend and frontend lint/typecheck use repository-pinned local tooling; no
  lint gate downloads an ephemeral tool at runtime.
- Direct database test entry points set a deterministic log format and no
  longer inherit an invalid host-level `LOG_FORMAT`.
- Production dependency audit: backend 0 vulnerabilities; frontend 0
  vulnerabilities.
- CSV parsing and email dependencies were upgraded to their patched releases;
  the Prisma CLI's merge dependency is pinned to the patched release through an
  override and passed generate/migrate/status validation.
- Invalid CORS origin returned 403. Helmet/proxy headers included
  `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.

## Verification evidence

Backend, isolated PostgreSQL 16:

- core: 27/27 pass;
- Batch 1 concurrency: 1/1 pass;
- Batch 1 persistence: 1/1 pass;
- Batch 1E runtime: 11/11 pass;
- Batch 2 auth/RBAC: 10/10 pass;
- Batch 3 resources: 9/9 pass;
- Batch 4/4.1 booking/calendar: 30/30 pass;
- Batch 5 operations: 13/13 pass;
- Batch 6 monitoring: 11/11 pass;
- Batch 7 hardening: 6/6 pass.

Frontend:

- lint: pass with zero errors;
- TypeScript check: pass;
- production build: pass;
- Batch 2 auth/RBAC E2E: pass;
- Batch 3 resource E2E: pass;
- Batch 4 calendar/conflict E2E: pass;
- Batch 5 operations E2E: pass;
- Batch 6 monitoring E2E: pass;
- Batch 7 official 10-step graduation E2E: pass.

Production-like Compose:

- frontend, backend, and PostgreSQL services healthy;
- `/health`: 200;
- `/api/health`: 200;
- `/api/health/ready`: 200 with `database=ready`;
- guarded demo infrastructure seed: pass;
- migration status: up to date;
- production security smoke: pass.

## Remaining non-blocking debt

- Existing React hook/fast-refresh findings remain warnings, not suppressed
  errors. They are concentrated in older mixed view modules and should be
  reduced only through scoped refactors.
- Research-only tests remain outside the required gate and require explicit
  restore/rewrite/retire decisions.
- Batch 8 monitoring is a separate extension and must not change the canonical
  booking lifecycle or make automation authoritative for physical state.

## Verdict

Batch 7 required-core implementation, clean deployment, production startup,
security smoke, regression matrix, and demo walkthrough are green. The project
is safe to proceed to the explicitly authorized Batch 8 extension.
