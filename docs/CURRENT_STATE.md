# Current Project State

## Phase 0 verified gap audit — 2026-09-24

The current `main` HEAD is `dbab294`. The external business/UX review is in
open PR #5 and has not been merged into `main`. The read-only baseline and
current evidence matrix are in
[CURRENT_VERIFIED_GAP_MATRIX_20260924.md](CURRENT_VERIFIED_GAP_MATRIX_20260924.md).
At this HEAD, general CI passes but three GitHub workflows that exercise fresh
PostgreSQL migration/startup fail. Local checks found a deterministic mismatch
between the historical mixed-line-ending checksum expectations and the bytes
produced by a fresh CRLF checkout. An isolated PostgreSQL 16 validation and a
safe canonical deployment strategy are required before claiming clean deploy.
Mandatory training is also not enforced in `createBooking`; guest OTP/account
and booking use separate transactions. These are current gaps, despite the
historical verified milestones below.

## Active local work — 2026-09-23

User has approved an iterative Open LAB upgrade for internal/external users,
resource/purpose fees, fast booking with verified email, ROOM self-return,
administrative booking notifications, and separate operations/telemetry screens.
This is **in progress, not final**. Read [OPEN_LAB_UPGRADE_REPORT.md](OPEN_LAB_UPGRADE_REPORT.md)
for implementation and verification status before continuing local agent work.
Checkpoint 2026-09-23: routing, split monitoring views, ROOM self-return, booking
notifications and versioned resource/purpose pricing with automatic charges are
implemented and tested. Fast booking/OTP/address and payment expiry remain pending.
The closure statements below describe historical milestones, not this upgrade.

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

## Historical Frontend Milestone: Final UI/UX Master Polish Pass

- Status: **VERIFIED GO**; historical verified dark/master-polish baseline committed at SHA: `81675fb0293535c6205da3b19a12b2f1f2dfe467`.
- Mounted required-core auth, resource, calendar, booking, operations, incident, notification, and monitoring surfaces visually harmonized and keyboard-accessible.
- Historical review evidence preserved as 23 screenshots in `frontend/screenshots_ui_final_review/`.

## Post-Closure Light UI & Motion Redesign — Final Frontend Baseline

- Status: **VERIFIED GO / SOURCE CLOSED**. Current accepted frontend baseline:
  `ff85dc76e74d40fa4a9b6cdf185e9815a6b8c3a7`.
- Authoritative Post-Closure Milestone Chain:
  - Historical Final UI/UX Master Polish: `81675fb0293535c6205da3b19a12b2f1f2dfe467`
  - Previous final docs closure: `1b9d5e9d8a272a3dab94bae4a8e9990fc51135c1`
  - Light UI & Motion redesign candidate: `155482f245cc84d033567ff4700dedb1b0b34b6c`
  - Final semantic cleanup: `1ae1423a4db3dc4d405820282f812b7abf3e2218`
  - Final one-line accessibility correction / CURRENT ACCEPTED FRONTEND BASELINE: `ff85dc76e74d40fa4a9b6cdf185e9815a6b8c3a7`
- Scope: Frontend presentation, accessibility, and responsive interaction only.
  No backend contract changes. No API changes. No Prisma changes. No migrations.
  No Docker changes. No research activation. This is NOT Batch 9 or Batch 10.
- Design Summary:
  - Light-first academic and enterprise laboratory operations UI with white surfaces on a pale neutral canvas;
  - Blue primary interaction system with distinct semantic status tokens;
  - Plus Jakarta Sans UI typography paired with IBM Plex Mono for technical and telemetry contexts;
  - Subtle card elevation, restrained hover translations, horizontal icon/action micro-motion, and dropdown fade/translate transitions;
  - Sticky application headers and calendar navigation surfaces where safe;
  - Fully responsive desktop, tablet (768×1024), and mobile (390×844) layouts;
  - `prefers-reduced-motion` compliance across all CSS animations;
  - Improved accessible naming: localized modal dismissal (`aria-label="Đóng hộp thoại"`), explicit Vietnamese icon-only header controls (`Làm mới dữ liệu`, unread notification counts), and accurate popover trigger semantics.
- Verification Chronology:
  - Main Light Redesign Candidate (`155482f2`): Complete regression matrix (B2, B3, B4, B5, B6, B8 E2E) passed 100% on isolated PostgreSQL 16 databases. Unchanged official Batch 7 10-step production demo rerun passed 10/10 with `REMINDER_SCHEDULER_ENABLED=false`, `BOOKING_UPCOMING_REMINDER_MINUTES=10080`, `RETURN_REMINDER_MINUTES=15`, and `VITE_ENABLE_RESEARCH_FEATURES=false` (including `/health`, `/api/health`, `/api/health/ready`, Prisma migration status, CORS, and Helmet security headers).
  - Semantic Cleanup (`1ae1423`): Focused B4 (`test_batch4_calendar_e2e.mjs`: 18.07s PASS) and B5 (`test_batch5_operations_e2e.mjs`: 9.99s PASS) E2E suites rerun and passed on fresh isolated PostgreSQL 16 databases with `prisma migrate deploy`.
  - Final Accessibility Correction (`ff85dc7`): Removed `aria-haspopup="menu"` from the header account trigger to align with popover semantics; verified via fresh `npm run lint` (0 errors, 14 warnings), `npm run typecheck` (PASS), and `npm run build` (PASS; main JS `391.27 kB` minified / `111.53 kB` gzip; CSS `185.83 kB` minified / `39.36 kB` gzip). This change was accessibility semantics only and did not modify runtime/business behavior (B2/B3/B6/B7/B8 were not rerun after this one-line aria fix).
- Visual Evidence:
  - `frontend/screenshots_ui_light_redesign/`: 32 reviewed PNG screenshots covering desktop, mobile (390×844), and tablet (768×1024) across auth, dashboard, resources, resource detail, Day/Week/Month calendar, booking modal, booking conflict, booking success, own bookings, operations, approval, handover, return, history, notifications, incidents, monitoring, admin users, admin resources.
  - `frontend/screenshots_ui_final_review/`: preserved as the previous 23-image evidence set from the master polish pass.
  - Historical Batch screenshots remain unchanged.
- Boundaries & Closure:
  - Frontend source is CLOSED. No further frontend polish is planned without a demonstrated regression and explicit user authorization.
  - Real hardware verification remains **PENDING REAL HARDWARE**.
  - No Batch 9 or Batch 10 exists.
  - Next expected work: defense preparation, graduation report, slides, demo/run checklist, and real hardware verification when hardware is available—NOT another UI pass.

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
- production build PASS; main entry 391.27 kB minified / 111.53 kB gzip;
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
- The main entry bundle is approximately 391.27 kB minified; older core UI still
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
- Historical Final UI/UX Master Polish: GO.
- Post-Closure Light UI & Motion Redesign: **VERIFIED GO; SOURCE CLOSED** (current accepted baseline `ff85dc76e74d40fa4a9b6cdf185e9815a6b8c3a7`).
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

## 2026-09-24 — Open LAB quick booking checkpoint

Code checkpoint implemented for external quick booking: public catalog detail can collect external customer identity, Vietnamese administrative address, email OTP, quote, booking creation, and handoff to bookings/payment; normal registration/profile now persist default address and profile exposes spending/loyalty signals from real payment/booking data. External customers keep canonical role `STUDENT` with `customerType=EXTERNAL`; no new role or booking status was introduced.

Verification completed without live DB: Prisma validate/generate, backend lint, frontend lint/typecheck/build, and address source smoke. Local `DATABASE_URL` points to PostgreSQL on `localhost:5432`, but that server and Docker Desktop are not running in the current environment, so `prisma migrate deploy`, OTP live flow, booking creation, and browser smoke remain pending. SMTP variables are also absent; OTP must fail with `EMAIL_NOT_CONFIGURED` until real SMTP is configured.
