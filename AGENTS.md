# LAB RESOURCE MANAGER - AGENT INSTRUCTIONS

This repository is an existing graduation project. These instructions apply to
Codex, Antigravity, Claude Code, Cursor, and any other coding agent working on
this repository.

## Mandatory Reading Order

Before modifying any file, read:

1. `.agent/PROJECT_RULES.md`
2. `.agent/INSTRUCTOR_BASELINE.md`
3. `.agent/DEVELOPMENT_WORKFLOW.md`
4. `docs/srs.md`
5. `docs/convention.md`
6. `docs/PROJECT_STRUCTURE.md`
7. `docs/CURRENT_STATE.md`
8. `docs/DECISIONS.md`
9. `docs/FRONTEND_GUIDELINE.md` when touching frontend
10. `docs/BACKEND_GUIDELINE.md` when touching backend
11. Relevant verified Batch reports
12. `backend/prisma/schema.prisma` when touching persistence

Do not begin implementation before understanding the relevant documents.

## Authority Order

When sources disagree, use this order:

1. Official graduation assignment
2. Instructor IOC/source-structure requirements
3. `docs/srs.md`
4. `PRODUCT.md`
5. Approved canonical architecture and contracts
6. Verified Batch reports
7. Current implementation
8. Reference repositories/templates
9. Agent suggestions

Reference projects are examples only. They must not override the approved
project architecture.

## Current Architecture

- Frontend: React/Vite in `frontend/`.
- Backend: Node.js/Express/Prisma in `backend/`.
- Database: PostgreSQL 16 with Prisma migrations.
- `frontend/` is the logical equivalent of instructor `code/frontend/`.
- `backend/` is the logical equivalent of instructor `code/backend/`.

Do not physically move `frontend/` or `backend/` solely to match an example
folder tree.

## Mandatory Project Contracts

Canonical roles:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

Canonical `BookingStatus`:

- `PENDING_APPROVAL`
- `CONFIRMED`
- `CHECKED_OUT`
- `RETURNED`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`

`NO_SHOW` is an outcome/event, not a `BookingStatus`.

`Resource.operationalStatus` is authoritative for physical operational state.
Scheduling availability is derived from operational status, bookings,
maintenance windows, and policy.

Canonical `OperationalStatus`:

- `AVAILABLE`
- `IN_USE`
- `MAINTENANCE`
- `CALIBRATION`
- `BROKEN`
- `RETIRED`
- `OFFLINE`

Canonical resource categories:

- `ROOM`
- `EQUIPMENT`
- `MACHINE`
- `EXPERIMENT_KIT`
- `MATERIAL`

Technical subtype remains separate from category. Never guess unresolved
resource categories.

## Safety Rules

Never:

- run `prisma db push` against development/shared databases
- edit historical applied migrations
- manually edit `_prisma_migrations`
- introduce mock/fake success into required runtime flows
- restore retired optional modules merely to make legacy tests green
- change frameworks without explicit approval
- redesign project architecture from scratch
- silently modify canonical roles/statuses
- fabricate telemetry/history/audit evidence
- weaken RBAC to make frontend work
- treat client-side route hiding as authorization
- start the next batch unless the user explicitly asks

## Development Rule

For every task:

1. Inspect repository state.
2. Read relevant documents.
3. Identify exact scope.
4. Inspect current implementation.
5. Implement the smallest coherent change.
6. Test.
7. Inspect diff.
8. Document relevant changes.
9. Report remaining risks.
10. Stop at the requested batch boundary.

Required graduation workflow always has priority over AI, optimization,
Digital Twin, payment, experimental scheduling, research modules, and showcase
features.

Priority:

Correctness > Security > Required Business Rules > Data Integrity > UX >
Monitoring > AI > Optimization > Experimental Features.
