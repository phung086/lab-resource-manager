# ChatGPT Project Handoff — Lab Resource Manager

Last synchronized: 2026-09-21

## Purpose

This file is the compact entry point for a new ChatGPT Project. It does not
replace repository evidence. When a claim conflicts with the repository, use
the authority order below and inspect the current branch before answering.

## Repository state

- Repository: `https://github.com/phung086/lab-resource-manager`
- Working branch: `final-graduation-hardening`
- Starting main SHA: `71da1683fc1c8bf842d2fc5b1313b45ac15499c1`
- Verified handoff SHA: `75b17a789f13635cd16b292b94ff3d74c7dc96f2`
- Batch 7 repair/closure commit: `50ecda3a69ef37fc21b572616ac76b3e4975a7d3`
- Branch is pushed; it has not been merged into main.

## Current verdict

- Batch 7 Production Demo Hardening: **GO**
- Batch 8 Smart Laboratory Monitoring implementation: **GO**
- Required graduation scenario: **GO**
- Final UI/UX Polish Pass A (Core Surfaces & Design Foundation): **GO**
- Full B2–6/8 regression and Batch 7 production 10-step rerun: **PASS**
- Real sensor/camera verification: **PENDING REAL HARDWARE**
- No canonical Batch 9 or Batch 10 exists. Do not invent or start one.

## Authority order

1. Official graduation assignment, if supplied.
2. `AGENTS.md` and `.agent/INSTRUCTOR_BASELINE.md`.
3. `docs/srs.md`.
4. `PRODUCT.md`.
5. Approved contracts and `docs/DECISIONS.md`.
6. Verified batch reports and final closure audit.
7. Current implementation.
8. Reference repositories or suggestions.

## Read first

1. `AGENTS.md`
2. `.agent/PROJECT_RULES.md`
3. `.agent/INSTRUCTOR_BASELINE.md`
4. `.agent/DEVELOPMENT_WORKFLOW.md`
5. `docs/srs.md`
6. `PRODUCT.md`
7. `docs/CURRENT_STATE.md`
8. `docs/DECISIONS.md`
9. `docs/FINAL_ASSIGNMENT_CLOSURE_AUDIT.md`
10. `docs/BATCH7_PRODUCTION_DEMO_HARDENING_REPORT.md`
11. `docs/BATCH8_SMART_MONITORING_REPORT.md`
12. Relevant frontend/backend guidelines before proposing code changes.

## Frozen contracts

- Stack: React 19 + Vite 6; Node.js + Express; Prisma 6; PostgreSQL 16.
- Roles only: `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`.
- Booking statuses only: `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`,
  `RETURNED`, `COMPLETED`, `REJECTED`, `CANCELLED`.
- `NO_SHOW` is an outcome/event, never a booking status.
- Intervals use `[startAt, endAt)`.
- `Resource.operationalStatus` is authoritative physical state.
- Resource categories: `ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`,
  `MATERIAL`; subtype is separate.
- Backend authorization is authoritative. `UserLabAssignment` defines
  LAB_STAFF scope.
- Never fake required success, telemetry, history, audit, authorization, or
  persistence.

## Completed work

- Batches 1–6: canonical persistence, RBAC/scope, resources, calendar,
  conflict-safe bookings, operational workflow, conditions, notifications,
  incidents, dashboard, and persisted telemetry.
- Batch 7: ordinary Prisma deployment, production Docker/Nginx health routing,
  research isolation, local quality tooling, service layering, security smoke,
  and official 10-step production demo.
- Batch 8: per-source hashed credentials, source health, threshold precedence,
  deduplicated alerts, one critical incident with provenance, scoped alert
  acknowledgement, private camera metadata/access audit, monitoring UI/history,
  production E2E, and a new additive migration.
- Phase D: final assignment requirement/evidence matrix and final release audit.

## Verified evidence

Fresh isolated PostgreSQL 16 backend results:

- core 27/27;
- Batch 1 concurrency 1/1 and persistence 1/1;
- Batch 1E 11/11;
- Batch 2 10/10;
- Batch 3 9/9;
- Batch 4/4.1 30/30;
- Batch 5 13/13;
- Batch 6 11/11;
- Batch 7 6/6;
- Batch 8 12/12.

Frontend lint has zero errors and 14 documented warnings. Typecheck and build
pass. E2E Batch 2–8 pass. Production Compose verifies Nginx, Express,
PostgreSQL 16, health/readiness, CORS, Helmet, migration status, the official
10-step demo, Batch 8 monitoring, and mobile paths. Full backend and frontend
`npm audit` report zero vulnerabilities at the handoff SHA.

## Database safety

- Never run `prisma db push` on development/shared databases.
- Never edit applied historical migrations or `_prisma_migrations`.
- Batch 8 adds exactly
  `backend/prisma/migrations/20260921000100_add_smart_monitoring/migration.sql`.
- A documented local execution incident applied that additive migration to the
  development DB; the fixture guard stopped, and no historical migration or
  existing data was deleted or rewritten. Do not attempt destructive rollback.

## Remaining debt

- Resource list uses a 250-row cap rather than cursor pagination.
- Five resources remain intentionally unclassified pending human authority.
- Frontend has 14 hook/fast-refresh warnings.
- ESLint 9.39.5 is audit-clean but its major line is marked unsupported.
- Not every administrative metadata mutation has a dedicated immutable audit.
- Optional research/legacy modules remain feature-flagged or await an explicit
  keep/rewrite/retire decision.
- Physical sensor and camera evidence is pending real hardware.

## Rules for the new ChatGPT

- Start by summarizing the current boundary and cite exact repository files.
- Ask what outcome the user wants before proposing a new batch or broad change.
- For code work, inspect the latest branch and diff; never assume uploaded files
  are newer than Git.
- Do not silently redesign architecture, roles, statuses, or persistence.
- Do not restore research modules merely to make legacy tests green.
- Clearly distinguish verified software, assumptions, future ideas, and pending
  hardware evidence.
- Keep all recommendations inside the documented authority and safety rules.

## Suggested first message in the new Project

> Read the uploaded project handoff and canonical documents. Treat the GitHub
> branch `final-graduation-hardening` at SHA
> `75b17a789f13635cd16b292b94ff3d74c7dc96f2` as the latest verified state. First
> summarize the frozen contracts, completed batches, test evidence, remaining
> debt, and the rule that no Batch 9/10 exists. Do not change code yet. Then ask
> me what outcome I want next.
