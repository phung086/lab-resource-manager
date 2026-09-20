# Coding And Project Convention

## Naming

- Roles, booking statuses, operational statuses, and resource categories use
  canonical uppercase enum values.
- API fields should use existing contract names. Do not introduce synonyms for
  roles or statuses.
- File and function names should describe business purpose, not batch history,
  unless the file is a verification artifact.

## Folder Responsibilities

- `frontend/`: React/Vite application.
- `backend/`: Express API, Prisma schema, backend tests, backend scripts.
- `docs/`: SRS, structure, conventions, guidelines, Batch reports, runbooks.
- `.agent/`: project-local agent rules and workflow.
- `data/`: import templates and example inventory data.
- `research/`, optional advanced components: non-core unless batch-approved.

## Backend Layering

Use:

route -> middleware -> service -> Prisma

- Routes handle HTTP shape and call middleware/services.
- Middleware handles authentication, authorization, lab scope, and common
  request checks.
- Services hold business logic and transactions.
- Prisma access should be explicit and validated.
- Shared constants belong in `backend/src/constants`.

## Frontend Layering

Use:

view/page -> feature/base component -> API service -> backend API

- Avoid duplicating backend business rules in frontend.
- Frontend can hide unavailable actions for UX, but backend remains authority.
- Prefer feature components for domain workflows and base components for generic
  controls.

## API And Errors

- Use `/api` canonical routes.
- Use stable error shape:
  `{ "error": { "code", "message", "details" } }`.
- Do not expose JWT, SQL, Prisma internals, or stack traces to clients.
- Preserve privacy in public resource/schedule projections.

## Canonical Constants

Do not hardcode role/status/category strings across the codebase when a
central constant exists.

Required roles:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

Required booking statuses:

- `PENDING_APPROVAL`
- `CONFIRMED`
- `CHECKED_OUT`
- `RETURNED`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`

Required operational statuses:

- `AVAILABLE`
- `IN_USE`
- `MAINTENANCE`
- `CALIBRATION`
- `BROKEN`
- `RETIRED`
- `OFFLINE`

## Validation

- Validate request bodies strictly for sensitive mutation routes.
- Reject privilege-bearing unknown fields.
- Validate path/body/query resource and lab scope on the backend.
- Validate time intervals and use half-open `[startAt, endAt)` semantics.

## Environment

- Production must require real critical secrets.
- First admin setup uses `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
  `ADMIN_FULL_NAME`.
- Do not commit real secrets.

## No Fake Success

Core runtime must not use mock stores, sample data, fake auth, fake booking,
fake notification, fake telemetry, or fake payment success.

Optional/research code with simulation must remain isolated and clearly marked.

## Testing

- Backend core tests use Node's test runner.
- Integration tests that need PostgreSQL must guard against development DB
  mutation unless explicitly approved.
- Frontend E2E scripts should use live backend flows where practical.
- Optional/research test failures are reported separately from required-core
  failures.

## Git Hygiene

- Inspect dirty worktree before editing.
- Do not revert user changes without explicit request.
- Keep diffs scoped.
- Do not edit historical applied migrations.
- Do not run destructive database commands.

## Formatting And Linting

The target baseline is ESLint + Prettier + incremental TypeScript strictness.
As of the governance bootstrap, not all tooling is enforced. New work should
avoid adding unused imports, uncontrolled `any`, magic numbers, or hardcoded
business constants.

## Documentation

Update docs when a change affects:

- canonical contracts
- architecture
- workflow
- verification status
- batch boundary
- deployment or operating procedure

Do not create documentation only for formality.
