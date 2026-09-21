# Current Project State

Last synchronized: 2026-09-21

## Final Boundary

Phases A-D of graduation finalization are complete on branch
`final-graduation-hardening`, synchronized from main SHA
`71da1683fc1c8bf842d2fc5b1313b45ac15499c1`.

Batch 7 repair/closure was verified and committed at
`50ecda3a69ef37fc21b572616ac76b3e4975a7d3`.

Batch 7 Production Demo Hardening and Batch 8 Smart Laboratory Monitoring are
implemented and verified. The final release/assignment closure audit is
recorded in `docs/FINAL_ASSIGNMENT_CLOSURE_AUDIT.md`. There is no canonical
Batch 9 or Batch 10, and neither has been started.

## Post-Closure Frontend Presentation Milestone: Final UI/UX Polish Pass A

- Status: **VERIFIED GO** (frontend-only presentation polish; does not alter backend or canonical contracts).
- Scope: Application shell, authentication views, operational dashboard, and resource catalogue surfaces polished to academic lab production standards.
- Accessibility & Responsiveness: WCAG AA contrast compliance, 44px mobile touch targets, unified `:focus-visible` styling, responsive wrapping across desktop and mobile.
- Verification Evidence:
  - Canonical regression matrix (Batches 2–6 and 8 E2E): 100% PASS on isolated PostgreSQL 16 databases.
  - Official Batch 7 10-step graduation scenario: 100% PASS against canonical production stack (`docker-compose.prod.yml`, Nginx `:8088`, Express, PostgreSQL 16).
  - TypeScript: 0 errors; ESLint: 0 errors (14 pre-existing warnings); Vite production build: PASS.
  - Dedicated visual evidence recorded in `frontend/screenshots_ui_polish_pass_a/`.
- Boundaries Reconfirmed: Batches 1–8 and Phase D final closure remain canonical. No Batch 9/10 exists. Real telemetry hardware remains `PENDING REAL HARDWARE`.

## Final UI/UX Master Polish — Release Candidate Closure

- Status: **VERIFIED GO**; frontend presentation polish is closed. Verified
  frontend baseline SHA: `81675fb0293535c6205da3b19a12b2f1f2dfe467`.
- Mounted required-core auth, resource, calendar, booking, operations, incident,
  notification, and monitoring surfaces are visually harmonized, responsive,
  and more keyboard-accessible without changing backend contracts.
- Batch 2/3/4/5/6/8 frontend E2E regressions passed on isolated PostgreSQL 16
  databases during the polish work. The unchanged official Batch 7 production
  10-step demo was rerun and passed on a new isolated PostgreSQL 16 demo DB
  with the repository-canonical `BOOKING_UPCOMING_REMINDER_MINUTES=10080`,
  `REMINDER_SCHEDULER_ENABLED=false`, and `RETURN_REMINDER_MINUTES=15`.
- Final lint: zero errors, 14 documented warnings; TypeScript check and Vite
  production build: PASS. Main JS: 393.50 kB minified / 112.06 kB gzip.
- Final evidence is curated to 23 screenshots in
  `frontend/screenshots_ui_final_review/`; historical Batch screenshots remain
  unchanged. No backend, Prisma schema, migration, or Docker Compose changes.
- No Batch 9/10 or research activation. Physical sensor/camera verification
  remains **PENDING REAL HARDWARE**. The next work is defense demo preparation,
  report/slides, and project run checklist—not another UI polish pass.

## VERIFIED REQUIRED CORE

- Canonical PostgreSQL/Prisma persistence and database conflict protection.
- Database authentication, exact four-role RBAC, ownership, and laboratory
  scope through `UserLabAssignment`.
- Resource CRUD, canonical categories, operational state, schedule, history,
  maintenance, retirement, and classification review.
- Dynamic Day/Week/Month availability and booking calendar with timezone,
  policy, maintenance, privacy, and `[startAt,endAt)` enforcement.
- Persisted booking creation, approval/rejection, before-condition, checkout,
  after-condition, return, completion, notifications, and auditable history.
- Persisted incidents and real operational dashboard aggregates.
- Official production-like 10-step graduation workflow through
  Nginx/Express/PostgreSQL 16 and Chromium.

## VERIFIED SUPPORTING

- Ordinary `prisma migrate deploy` on clean PostgreSQL 16; all nine migrations
  and migration status verified without a compatibility bridge.
- Production health, readiness, CORS, Helmet/security headers, and fail-closed
  environment validation.
- Optional research frontend dependency isolation and default
  `VITE_ENABLE_RESEARCH_FEATURES=false`.
- Pinned local frontend/backend quality tooling and zero production dependency
  vulnerabilities.
- Per-source telemetry identity with hashed credentials, activation, rotation,
  and server-resolved source/lab/resource scope.
- Persisted source health, accepted-sample history, lab/resource thresholds,
  alert episodes, acknowledgement/resolution, incident provenance, camera
  metadata, and camera-access auditing.
- Truthful `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, and `NO_DATA` states;
  no synthetic production samples and no fake live camera stream.

## Latest Verified Gates

Backend, each on a fresh isolated PostgreSQL 16 database:

- core: 27/27 PASS;
- Batch 1 concurrency: 1/1 PASS;
- Batch 1 persistence: 1/1 PASS;
- Batch 1E: 11/11 PASS;
- Batch 2: 10/10 PASS;
- Batch 3: 9/9 PASS;
- Batch 4/4.1: 30/30 PASS;
- Batch 5: 13/13 PASS;
- Batch 6: 11/11 PASS;
- Batch 7: 6/6 PASS;
- Batch 8: 12/12 PASS.

Frontend/release:

- frontend lint PASS with zero errors and 14 existing warnings;
- TypeScript check PASS;
- production build PASS; main entry 393.50 kB minified / 112.06 kB gzip;
- Batch 2/3/4/5/6 frontend E2E regressions PASS;
- Batch 8 smart-monitoring desktop/scope/denial/mobile E2E PASS;
- Batch 7 official 10-step production E2E PASS with canonical upcoming
  reminder threshold 10080 minutes;
- production Compose frontend/backend/PostgreSQL health PASS;
- `/health`, `/api/health`, `/api/health/ready` HTTP 200;
- allowed/denied CORS and Helmet header checks PASS;
- production Batch 8 monitoring E2E PASS;
- backend and frontend production dependency audits: 0 vulnerabilities.

## OPTIONAL/RESEARCH

AI, advanced analytics, payment/VietQR, Digital Twin, simulation, Pareto,
GA/NSGA-II, optimization, orchestration, and showcase modules are not required
release authority. Frontend research modules are lazy-loaded only behind the
explicit research flag, which is off by default. Legacy payment/mock-store and
local fake-showcase modules must be rewritten against real services before any
future activation; they do not participate in the core workflow.

## PENDING REAL HARDWARE VERIFICATION

No physical sensor or camera was connected to this environment. Controlled
isolated fixtures verified source protocol, authentication, persistence,
classification, threshold policy, alert deduplication, incident provenance,
RBAC, camera audit, frontend behavior, production routing, and mobile layout.

Physical-device ingestion and real camera connectivity remain:

**PENDING REAL HARDWARE**.

The early-warning UI is explicitly non-certified, not a fire alarm, and not a
replacement for physical safety systems or laboratory procedures.

## Known Non-Blocking Debt

- Resource listing uses a 250-row cap instead of cursor pagination.
- Five resources remain intentionally unclassified pending an authoritative
  human review decision.
- Frontend lint has 14 existing hook/fast-refresh warnings and zero errors.
- ESLint 9.39.5 is audit-clean but npm marks the major line unsupported; a
  future tooling-only upgrade must move ESLint and its React/TypeScript plugins
  together and re-run the complete lint gate.
- The main entry bundle is approximately 393.50 kB minified; older core UI still
  has scoped refactoring opportunities.
- Dedicated immutable audit models are not present for every administrative
  and laboratory metadata mutation.
- Optional/legacy modules and their old tests require explicit
  keep/rewrite/retire decisions before activation.
- Physical sensor and camera evidence is pending real hardware.

## Final Verdict

- Batch 7: GO.
- Batch 8 implementation: GO.
- Required graduation scenario: GO.
- Final UI/UX Master Polish release candidate: GO; frontend polish closed.
- Real hardware verification: PENDING REAL HARDWARE.

## Do Not Start Without Explicit Approval

- any newly defined Batch 9 or Batch 10
- another UI polish pass without a demonstrated regression and explicit request
- framework migration or repository-wide restructure
- AI as business authority
- Digital Twin, simulation, optimization, Pareto, GA/NSGA-II, or showcase
  activation
- payment as a required booking state
- optional/research module restoration
- historical migration edits or shared-database `prisma db push`

## Canonical Handoff Reading

Before future work, read `AGENTS.md`, the `.agent/` rules, this file,
`docs/DECISIONS.md`, the Batch 7 and Batch 8 reports/walkthroughs, and
`docs/FINAL_ASSIGNMENT_CLOSURE_AUDIT.md`.
