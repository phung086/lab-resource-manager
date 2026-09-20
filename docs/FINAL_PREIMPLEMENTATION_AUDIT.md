# Final Preimplementation Audit

Date: 2026-09-21  
Branch: `final-graduation-hardening`  
Starting `main`: `71da1683fc1c8bf842d2fc5b1313b45ac15499c1`

## Scope and authority

This audit precedes the final Batch 7 repair, Batch 8 Smart Laboratory
Monitoring Extension, and final assignment-closure audit. The local workspace
does not contain a separate graduation-assignment brief; the authoritative
local functional mapping is therefore `docs/ASSIGNMENT_GAP_ANALYSIS.md` plus
`docs/srs.md`, under the instructor source documents in `docs/instructor/`.

The audit covered all 399 tracked repository files, all GitHub Actions
workflows, the complete Prisma schema and migration inventory, production and
development Compose files, Dockerfiles, Nginx, backend routes/services/
middleware, frontend application/navigation/core feature paths, tests, E2E
scripts, deployment documentation, and the mandatory Batch reports.

## REQUIRED CORE

- Database-backed authentication and exact canonical roles are implemented.
- Resource CRUD, operational state, schedule, history, and retirement are
  implemented with backend authorization.
- Day/week/month booking, half-open intervals, policy enforcement, and the
  PostgreSQL exclusion constraint are present.
- Approval, rejection, handover, condition-before, return, condition-after,
  completion, history, and physical-state synchronization are persisted.
- Notifications, incidents, dashboard aggregates, and Batch 6 telemetry are
  database-backed and scoped.
- Required backend routes are mounted; payment and AI/research routers are not
  mounted in the core application.
- Production health aliases exist at `/health`, `/api/health`,
  `/health/ready`, and `/api/health/ready`.

Required-core findings to repair before Batch 7 can close:

1. Production startup fails before health checks. The canonical migration
   bridge attempts a cross-filesystem directory rename from `/app` to `/tmp`
   and fails with Linux `EXDEV`.
2. Ordinary tracked `prisma migrate deploy` now succeeds on a clean PostgreSQL
   16 database both on Windows and inside the Linux production image. The
   compatibility bridge is no longer justified and adds failure modes.
3. ADMIN user creation hashes and persists directly in `routes/users.js`,
   violating the required `route -> middleware -> service -> Prisma` layering.
4. The backend core suite inherits an unrelated host `LOG_FORMAT=json`; the
   first unmodified run failed 24/25 at import time. With the documented
   supported `LOG_FORMAT=dev`, the same suite passes 27/27. Test commands must
   be hermetic and use the local toolchain.
5. Batch 7 production-like graduation E2E has not yet run because production
   startup fails at migration deployment.

## SUPPORTING

- Production configuration validation, CORS allowlisting, Helmet headers,
  rate limiting, real database readiness, guarded demo topology bootstrap,
  reminder scheduling, Prometheus configuration, backup/restore scripts, and
  deployment/runbook documentation support the required core.
- Existing Batch 1 migration/concurrency, Batch 1E runtime, Batch 2-6
  integration, and Batch 2-7 E2E suites are release evidence only when rerun
  on this branch.
- The frontend touched-module structure for operations, incidents, monitoring,
  services, and types is consistent with the incremental instructor baseline.

Supporting findings to repair:

1. Backend and frontend lint scripts download ESLint through `npx --yes`.
2. Frontend typecheck downloads TypeScript and React typings through
   `npx --yes -p`.
3. Frontend lint covers only JS/JSX and does not parse TS/TSX.
4. The current production build emits one 621.90 kB JavaScript entry chunk,
   largely because optional modules remain in the static dependency graph.
5. Batch-specific workflows run only for pull requests/manual dispatch. Final
   release-critical coverage must also protect relevant pushes to `main`.

## OPTIONAL/RESEARCH

The following source is valuable but is not required-core release authority:

- VietQR/payment demonstrations;
- QR/door/SSH/Jupyter simulations;
- AI analytics, advisory, diagnostics, copilot, MCP, and RAG;
- Digital Twin and heatmaps;
- Pareto, GA/NSGA-II, optimization, orchestration, and allocation research;
- what-if/scenario simulation;
- static audit/policy/concurrency/fairness/chargeback screens;
- optional research tests and research persistence tables.

The default feature flag is correctly `false`, and disabled research tab IDs
are rejected by the frontend access check. However, `App.jsx` still statically
imports the optional components, so the disabled production bundle still
depends on fake/research modules. These imports must move behind a dedicated
lazy research registry. No research source should be deleted merely to reduce
bundle size.

## LEGACY/RETIRE

- `buildNavItems` and its `useMemo` call in `App.jsx` are dead legacy code.
- The unused `EscalationsView` and `ScenarioSimulationStudio` imports are dead
  compatibility imports.
- `backend/scripts/deployCanonicalMigrations.mjs` is legacy once ordinary
  Prisma deployment is reconfirmed on clean Linux/PostgreSQL 16.
- `db:push`, legacy importer/seed paths, missing-module research tests, and
  duplicate JSX/TSX research implementations must remain outside production
  and be classified during final closure as `KEEP FEATURE-FLAGGED`,
  `REWRITE LATER`, or `RETIRE`.

## Database safety disposition

- No historical migration was modified.
- No `_prisma_migrations` row was edited manually.
- No development/shared database received `prisma db push`.
- Pre-edit database work used isolated Batch 7 databases/Compose volumes.
- A new additive migration is expected for genuine Batch 8 persistence only.
- Historical migration diffs must remain empty throughout the work.

## Pre-edit verification evidence

- Backend install/generate/lint/production-config: PASS.
- Backend required suite, unmodified host environment: FAIL, 24/25, because
  global `LOG_FORMAT=json` is outside the supported Morgan formats.
- Backend required suite with supported `LOG_FORMAT=dev`: PASS, 27/27.
- Batch 7 backend integration on isolated PostgreSQL 16: PASS, 6/6.
- Frontend install/lint/typecheck/build: PASS.
- Frontend production entry chunk: 621.90 kB minified; warning remains.
- Raw clean `prisma migrate deploy` on PostgreSQL 16: PASS on Windows.
- Raw clean `prisma migrate deploy` in Linux production image: PASS; migration
  status reports 8/8 up to date.
- Current production startup: FAIL before health/readiness with `EXDEV` in the
  migration compatibility bridge.

## Gate decision

Batch 7 is **NO-GO** at this audit boundary. Batch 8 must not begin until the
production startup failure, research dependency graph, reproducible quality
toolchain, backend layering, complete regression matrix, and official
production-like 10-step graduation scenario are all verified green.
