# Final Assignment Closure Audit

Date: 2026-09-21

Branch: `final-graduation-hardening`

Starting main: `71da1683fc1c8bf842d2fc5b1313b45ac15499c1`

Boundary: Phase D final release/assignment closure; this is not Batch 9.

## Executive verdict

The required graduation workflow and its supporting operational monitoring are
implemented with real Express APIs, PostgreSQL persistence, backend RBAC,
validation, deterministic errors, automated integration tests, and a
production-like Nginx/Express/PostgreSQL 16 demonstration.

**Final graduation scenario: GO.**

This verdict covers software implementation and controlled isolated fixtures.
It does not claim certification, Internet-scale operations, or physical sensor
and camera verification. Physical monitoring remains **PENDING REAL HARDWARE**.

## Requirement-to-evidence matrix

| Official requirement | UI path | API/persistence | Authorization and validation | Automated/demo evidence | Documentation |
|---|---|---|---|---|---|
| Authentication and four canonical roles | Login/profile and ADMIN user management | `/api/auth`, `/api/users`; `User` | Active-user checks; ADMIN creation; exact roles; public registration STUDENT-only | core, B2 10/10, auth E2E, demo step 1 | SRS, B2 reports, demo runbook |
| LAB_STAFF laboratory assignment | ADMIN user/lab management | `/api/users/:id/laboratories`; `UserLabAssignment` | ADMIN mutation; unassigned/foreign staff fail closed | B2, B3, B5, B6, B8; demo step 2 | SRS, B2/B3/B5/B8 reports |
| Resource management and five categories | Resource catalogue/detail/admin forms | `/api/resources`, `/api/laboratories`; `Resource`, status history | ADMIN/global and assigned-staff scope; category/status validation; retirement rules | B3 9/9, resource E2E; demo step 3 | B3 report, walkthrough/runbook |
| Truthful resource status, schedule, history | Resource detail and calendar | resource detail/history/calendar APIs; bookings, status history, maintenance | Scope/ownership privacy; `Resource.operationalStatus` authoritative | B3/B4/B5; demo step 4 | SRS, ADR-002/014 |
| Day/week/month calendar and availability | Calendar navigation and quick booking | `/api/calendar`, availability/booking services; `Booking`, `MaintenanceWindow`, `LabPolicy` | Date ranges, timezone, `[startAt,endAt)`, policy, maintenance, privacy | B4/4.1 30/30, calendar E2E; demo step 5 | B4 report, ADR-013 |
| Persisted booking and database conflict protection | Quick booking/booking list | `/api/bookings`; `Booking`; PostgreSQL exclusion constraint | Ownership, lab scope, state validation, deterministic 409 `BOOKING_CONFLICT` | B1 concurrency/persistence, B4; demo steps 6-7 | B4/B7 reports |
| Approval, handover, return, completion | Operations workspace | booking transition endpoints; booking, transition/history and condition evidence | Canonical state machine; assigned staff only; actor/time/reason/condition validation | B5 13/13, operations E2E; demo step 8 | B5 report/walkthrough |
| Durable notifications and reminders | Notification centre | `/api/notifications`; `Notification` | User ownership, authenticated reads/updates, transition-driven messages | B5/B6, monitoring E2E; demo step 9 | B6 report/walkthrough |
| Incidents and operational dashboard | Incident and dashboard views | `/api/incidents`, `/api/dashboard`; `Incident` and aggregate queries | Reporter/owner visibility; assigned-staff triage; no static KPI fallback | B6 11/11, B8 provenance, dashboard E2E; demo steps 9-10 | B6/B8 reports |
| Persisted telemetry and five truthful states | Monitoring dashboard | `/api/telemetry`; `TelemetrySample`, `TelemetrySource`, thresholds | Per-source token, server-resolved scope, range/time checks, staff scope | B6, B8 12/12, monitoring and smart-monitoring E2E | B6/B8 reports |
| Deduplicated alerts and incident linkage | Alert list/acknowledgement | telemetry alerts API; `MonitoringAlert`, linked `Incident` | Stable rule/dedupe identity, advisory lock, unique constraint, scoped acknowledgement | B8 concurrent test and production E2E | B8 report/ADR-017 |
| Camera metadata/privacy/audit | Monitoring camera metadata cards | telemetry camera APIs; `Camera`, `CameraAccessAudit` | ADMIN/assigned staff; raw URL private; all authenticated attempts audited | B8 integration/E2E | B8 report/ADR-018 |
| Production-quality reproducible demo | Core application via Nginx | Docker production images, ordinary Prisma deployment, PostgreSQL 16 | Fail-closed env, CORS, Helmet, readiness, research default-off | B7 10-step E2E, B2-8 E2E, clean migration/full matrix | deployment guide, B7/B8 reports, runbook |

## Final release evidence

Backend fresh isolated PostgreSQL 16 results:

| Gate | Result |
|---|---:|
| Core | 27/27 PASS |
| Batch 1 concurrency | 1/1 PASS |
| Batch 1 persistence | 1/1 PASS |
| Batch 1E | 11/11 PASS |
| Batch 2 | 10/10 PASS |
| Batch 3 | 9/9 PASS |
| Batch 4/4.1 | 30/30 PASS |
| Batch 5 | 13/13 PASS |
| Batch 6 | 11/11 PASS |
| Batch 7 | 6/6 PASS |
| Batch 8 | 12/12 PASS |

Frontend lint (zero errors), TypeScript, build, Batch 2/3/4/5/6/8 E2E, and
the Batch 7 official production 10-step E2E passed. Production Compose verified
all three services healthy, Nginx-to-API readiness, PostgreSQL migration status,
CORS rejection/allowance, Helmet headers, official demo, monitoring extension,
and mobile layouts. Backend and frontend production dependency audits each
reported zero vulnerabilities.

## Core fake-success closure

The final whole-repository scan found no mock/fake success, static fake KPI,
fake audit record, fake production telemetry, timer-generated required success,
or payment dependency in the mounted required-core path. Required operations
fail explicitly when authentication, authorization, persistence, validation,
or infrastructure fails.

The repository still contains research, legacy, development, and test fixture
terms. Their classification is deliberate:

### KEEP FEATURE-FLAGGED

- AI advisory/copilot, advanced analytics, Digital Twin, simulations,
  optimization, orchestration, Pareto and GA/NSGA-II sources.
- Optional frontend modules load only through the research registry when
  `VITE_ENABLE_RESEARCH_FEATURES=true`; the production default is false.
- Research algorithms and benchmarks remain available for academic study but
  are not release authority and are outside the required gate.

### REWRITE LATER

- Legacy payment/VietQR and mock-store services must be replaced with a real,
  separately authorized integration before any future activation. Payment is
  never a booking state or required dependency.
- Legacy local-only KPI, audit, QR/door/SSH/Jupyter, policy, and AI showcase
  surfaces require real APIs/persistence before activation.
- Development email logging must never be described as delivered production
  mail; a configured provider remains required for external delivery.

### RETIRE

- Unmounted duplicate JSX/TSX implementations, old compatibility routes, and
  tests tied only to retired optional implementations should be removed after
  an explicit ownership decision. They are not restored merely to make legacy
  research tests green.

## CI release boundary

Core CI continues to run on pull requests. Batch 7 and the new Batch 8 release
gates run for pull requests, pushes to main, and manual dispatch. The Batch 8
gate includes the complete backend matrix plus focused full-stack monitoring
verification on clean PostgreSQL 16.

Recommended required branch checks are core backend/frontend CI, Batch 7
backend regression, Batch 7 production graduation demo, Batch 8 backend full
matrix, and Batch 8 smart-monitoring full-stack. Repository code can define
these workflows, but GitHub branch-protection settings require repository
administrator configuration and were not changed locally.

## Remaining non-blocking debt

- Resource listing retains the documented 250-row cap instead of cursor
  pagination.
- Five resources remain intentionally unclassified pending an authoritative
  human decision.
- Frontend lint retains 14 existing hook/fast-refresh warnings; there are zero
  errors.
- ESLint 9.39.5 is audit-clean but npm marks that major line unsupported; a
  coordinated ESLint/plugin upgrade remains tooling debt.
- The main entry bundle is approximately 397 kB minified; optional research is
  split but older core UI still has scoped refactoring opportunities.
- Not every administrative/laboratory metadata mutation has a dedicated
  immutable audit model.
- Optional research/legacy modules require keep/rewrite/retire decisions before
  any future activation.
- Physical sensor and camera verification is pending real hardware.

## Closure

Batch 7: **GO**.

Batch 8 software implementation: **GO**.

Physical hardware: **PENDING REAL HARDWARE**.

Required final graduation scenario: **GO**.

No Batch 9 or Batch 10 is defined or started.
