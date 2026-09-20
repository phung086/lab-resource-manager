# Batch 7 Audit — Production Demo Hardening

Date: 2026-09-20  
Branch: `batch7-production-demo-hardening`  
Starting main commit: `6cc0eb6131a43364b76f834b4a629c49667421ab`  
Authorization: **Batch 7 explicitly authorized. Batch 8 is not authorized.**

## Authority Read

Batch 7 follows:

1. official graduation assignment;
2. `AGENTS.md`;
3. `.agent/PROJECT_RULES.md`;
4. `.agent/INSTRUCTOR_BASELINE.md`;
5. `.agent/DEVELOPMENT_WORKFLOW.md`;
6. `docs/srs.md`;
7. `PRODUCT.md`;
8. `docs/CURRENT_STATE.md`;
9. `docs/DECISIONS.md`;
10. verified Batch 5/6 reports and walkthroughs;
11. current implementation.

## Official Batch 7 Scope

From `docs/ASSIGNMENT_GAP_ANALYSIS.md`:

1. fix CI paths and split required/core tests from optional research tests;
2. add lint/typecheck/test scripts and enforce them in CI;
3. validate CORS, JWT secrets, readiness database query, logging and production environment checks;
4. put OPTIONAL_ADVANCED modules behind an Advanced/Research boundary;
5. hide payment/VietQR and incomplete/fake screens from the default demo;
6. update deployment and graduation demo documentation using verified behavior only.

Exit gate:

> a clean machine can start the stack and complete the official demo scenario without mock data or fake success.

## Findings Before Hardening

### Production startup — BLOCKER

`backend/Dockerfile` development startup invoked `prisma db push` and the booking-guard helper automatically. This conflicts with the canonical migration policy.

Production `db:deploy` uses `prisma migrate deploy`, but historical migration checksum snapshots were captured from the verified Windows workspace. Linux checkout line endings can therefore make raw clean deployment non-portable.

Disposition:

- remove automatic `db push`;
- preserve migration history;
- keep migration checkout bytes deterministic where possible;
- use a fail-closed canonical deployment bridge for the known verified Batch 1
  checksum-snapshot portability problem;
- prove clean migration deployment on Linux/PostgreSQL 16 without editing
  tracked migration SQL or `_prisma_migrations` manually.

### First admin seed — BLOCKER

`backend/prisma/seedAdmin.js` used lowercase role `admin`, which violates the frozen canonical role `ADMIN`.

Disposition:

- use the canonical role constant;
- fail closed in production when admin bootstrap configuration is invalid.

### User administration — REQUIRED DEMO GAP

The admin UI could change roles/activation/lab assignments but could not create a user. The official graduation demo starts with admin user/resource setup.

Disposition:

- add ADMIN-only persisted `POST /api/users`;
- add a real admin create-user UI;
- preserve public registration as STUDENT-only.

### Frontend optional/research boundary — PARTIAL

The sidebar already hid the AI section unless `VITE_ENABLE_RESEARCH_FEATURES=true`, but:

- research tab IDs were not centrally classified;
- direct tab selection was not denied when the flag was off;
- fake audit/policy/research components still existed as routable App branches;
- payment/QR simulation and safety-demo modals remained in source.

Disposition:

- central feature-boundary contract;
- fail closed for research tabs when disabled;
- default production/demo flag = false;
- fake/research source may remain for later research work, but not in the default demo path.

### Audit log screen — FAKE / RESEARCH

`AuditLogsView.tsx` uses hard-coded actors, IP addresses, hashes and fake QR/optimization actions.

Disposition:

**FEATURE_FLAG / HIDE FROM REQUIRED CORE.**

Booking/resource operational history remains persisted and real through the verified core workflows.

### Policy configuration screen — FAKE / RESEARCH

`PolicyRulesConfig.tsx` saves only local state with timers and claims synchronization that never occurred.

Disposition:

**FEATURE_FLAG / HIDE FROM REQUIRED CORE.**

Runtime LabPolicy enforcement remains backend-authoritative.

### AI / optimization / simulation family — OPTIONAL_ADVANCED

Examples include:

- Efficiency analytics static metrics;
- Smart Advisory fake recommendations;
- Digital Twin;
- What-if simulation;
- Pareto/GA/NSGA-II;
- optimization/orchestration;
- AI diagnostic/copilot;
- concurrency visualization.

Disposition:

**OPTIONAL/RESEARCH. Not a release gate. Hidden by default.**

### Test split — PARTIAL

`npm test` already points to the required core unit suite, while legacy optional/research test files still exist and may reference retired modules.

Disposition:

- preserve required test gate separately;
- expose optional/research test command explicitly;
- never make research failures block graduation core CI.

### Frontend quality tooling — MISSING

Frontend had build/E2E scripts but no lint/typecheck release gate.

Disposition:

- add pinned lint command;
- add incremental TypeScript compiler check for TS/TSX;
- preserve React/Vite; do not migrate framework.

### Production configuration — PARTIAL

Existing production validation already checked PostgreSQL, JWT length, telemetry credential, explicit CORS and admin presence.

Additional hardening required:

- admin email validation;
- admin password length/placeholder check;
- JWT and telemetry credential separation;
- explicit logging format validation;
- automated negative/positive config verification.

### Clean demo infrastructure

A clean canonical database has no fake inventory. Resource creation requires a laboratory.

Disposition:

- provide a guarded **demo-only infrastructure bootstrap** for campus/building/lab/policy;
- it must refuse non-demo database names and non-local/non-compose hosts;
- users and representative resources remain created through real APIs/UI during the graduation scenario;
- production must not auto-seed fake users/resources/bookings.

## Database Safety

Batch 7 must not:

- create a schema migration unless a genuine blocker is proven;
- edit historical migration SQL;
- manually edit `_prisma_migrations`;
- use `prisma db push` on development/shared databases;
- fabricate runtime data/evidence;
- start Batch 8.
