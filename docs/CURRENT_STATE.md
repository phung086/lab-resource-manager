# Current Project State

## Phase 3 release gate reliability — 2026-09-25

Branch `fix/release-gate-reliability` starts from the exact accepted Phase B
SHA `91f9d0892a2bcd160cf20917660b92ee58a11ab4`. The previous GitHub result was
10/13: two full-stack E2E jobs and smart-monitoring E2E were red.

Local reproduction verified three test-infrastructure mismatches. Batch 4
exhausted the 180-request global limiter across sequential browser contexts;
Batch 6 expected telemetry states on the intentionally separate Operations
page; Batch 8 opened Telemetry but waited for the old Operations heading. The
E2E selectors now follow the approved Telemetry page, and full-stack workflow
backend processes use an explicit `RATE_LIMIT_MAX=1000` only beside
`NODE_ENV=test`. Production runtime code and the default limit of 180 are
unchanged.

Local PostgreSQL 16 verification is green: required core 33/33, Batch 4
policy/integration 32/32, migration safety 14/14, frontend lint/typecheck/build,
Batch 2/3/4/5/6/8 browser suites, two consecutive Batch 4 runs, and responsive
smoke at 1440, 1280, 768, 390 and 360 pixels. GitHub candidate
`ba302e13eec39bf7d5c4670a7fdec2286fa8f371` passed the requested 13/13 job
matrix. The final documentation-only evidence commit must independently retain
13/13 before Phase C is closed.

## Phase 2 mandatory training eligibility — 2026-09-25

Branch `feat/booking-training-eligibility` now enforces every configured
mandatory `TrainingRequirement` in authoritative booking creation. A requester
must have an `active`, non-expired `UserCertification` for the same course;
missing, expired, revoked, other-user and incomplete multi-course cases fail
with `403 BOOKING_TRAINING_REQUIRED`. No override policy was invented.

Local verification on disposable PostgreSQL 16 passed the required core suite
33/33 and Batch 4 policy/integration suite 32/32. The latter preserves booking
conflict, half-open interval, approval, availability and state-machine behavior
while exercising the training gate at the API boundary. This phase changes no
schema or migration. See `docs/LOCAL_ENGINEERING_VERIFICATION.md` and
`docs/LOCAL_VERIFIED_GAP_MATRIX_20260925.md` for current local evidence and the
remaining release/guest/security gaps.

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

## Phase 1 migration reproducibility — 2026-09-24

P0 fresh deployment is repaired on branch
`feature/fresh-migration-reproducibility`. The root cause was confirmed on a
fresh Windows checkout and PostgreSQL 16: `.gitattributes` produced CRLF bytes
whose Prisma checksums differed from the historical mixed-line-ending values
embedded in the reconciliation migration. No historical migration was edited.

`npm run db:migrate` now applies a reviewed clean-install baseline only to a
truly empty database. Hardening on `fix/migration-baseline-hardening` freezes the
baseline SQL and Prisma schema snapshot, verifies normalized hashes for every
represented migration, and fingerprints the complete critical PostgreSQL
catalog before any official `migrate resolve`. Current `schema.prisma` may now
evolve through forward migrations without regenerating the old baseline.

Existing databases preserve their lineage only when migration rows form a
completed canonical prefix. Unknown objects, foreign/empty/failed/rolled-back
history, and damaged baseline structures fail closed. Resume is supported after
baseline SQL and its marker complete; interruption inside baseline SQL requires
recreating the initially empty database. The 12-case PostgreSQL 16 local safety
matrix passes, including historical-row preservation and future forward
migration compatibility. See
[PHASE1_MIGRATION_REPRODUCIBILITY_REPORT.md](PHASE1_MIGRATION_REPRODUCIBILITY_REPORT.md).

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

## 2026-09-25 — Phase D guest integrity closure

Guest quick booking is now verified on isolated PostgreSQL 16. OTP challenges
are HMAC-only, single-use, limited to five persistent failures, serialized by
normalized email/purpose, protected by a 60-second resend cooldown, and retain
invalidated history. Required email remains fail-closed.

Successful completion uses one database transaction for valid OTP, new account
and address persistence, the canonical booking rules, and OTP consumption.
Booking failure rolls back the entire business outcome. Existing accounts are
reused without public profile or `customerType` overwrite; `INTERNAL` remains
`INTERNAL`. Existing accounts receive no OTP-derived JWT. New accounts retain
the approved temporary phone credential, while backend middleware limits the
session to password setup/me/logout until a real password is established.

Verification: guest PostgreSQL suite 13/13, migration safety 14/14, core 33/33,
Batch 4 32/32, all backend batches green, frontend lint/typecheck/build green,
and browser Batch 2/3/4/5/6/8 green. No schema or migration changed.
