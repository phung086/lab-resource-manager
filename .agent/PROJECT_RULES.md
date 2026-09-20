# Lab Resource Manager - Project Rules

## Product

The system is a Smart Laboratory Management Platform centered on:

Resource Management -> Scheduling -> Operational Workflow -> Monitoring ->
Incident Handling -> Analytics -> AI Assistance.

AI is supporting functionality, not business authority.

## Required Roles

Use exactly:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

No aliases. Do not introduce lowercase role duplicates, `INSTRUCTOR`, or
`RESEARCHER` as core roles.

## Persistence

- PostgreSQL 16 and Prisma are canonical.
- Migration files and verified history are authoritative.
- Use `prisma migrate deploy` for approved migrations.
- Never use `prisma db push` for shared/development environments.
- Never manually edit `_prisma_migrations`.

## Authentication And Authorization

Backend authorization is authoritative.

Every sensitive operation must verify:

- authentication
- current database user
- active state
- role
- ownership
- laboratory scope where required

Never trust `userId`, `requestedById`, `laboratoryId`, role, status, or
authorization-relevant fields supplied by clients without server-side
validation and authorization.

`UserLabAssignment` is the source of `LAB_STAFF` laboratory scope. Unassigned
staff must fail closed.

## Booking

Canonical lifecycle:

`PENDING_APPROVAL` -> `CONFIRMED` -> `CHECKED_OUT` -> `RETURNED` -> `COMPLETED`

Additional terminal states:

- `REJECTED`
- `CANCELLED`

`NO_SHOW` is an outcome/event, not a booking status.

Booking overlap must remain protected at the database level. Time intervals are
half-open: `[startAt, endAt)`.

## Resource

`Resource.operationalStatus` is authoritative.

Canonical operational states:

- `AVAILABLE`
- `IN_USE`
- `MAINTENANCE`
- `CALIBRATION`
- `BROKEN`
- `RETIRED`
- `OFFLINE`

`Resource.status` is compatibility projection only. `RESERVED` is never a
physical operational state.

Resource category:

- `ROOM`
- `EQUIPMENT`
- `MACHINE`
- `EXPERIMENT_KIT`
- `MATERIAL`

Technical subtype remains separate. Never guess unresolved categories.

## Required Runtime Policy

No core runtime operation may silently fall back to:

- `mockStore`
- sample data
- fake auth
- fake booking
- fake notification
- fake telemetry
- fake payment success

Infrastructure failure must remain visible as failure.

## Architecture

Backend:

route -> middleware -> service -> Prisma

Frontend:

page/view -> feature/base component -> service/API wrapper -> API

Avoid business logic directly in pages or routes when it belongs in services,
middleware, constants, schemas, or utility modules.

## Optional And Research Modules

Optional/research modules must:

- remain isolated
- not block core graduation workflow
- not be treated as production-ready without verification
- be feature-flagged or clearly marked if surfaced

Do not restore optional modules merely to satisfy old legacy tests. Decide
explicitly: `RESTORE`, `REWRITE`, `FEATURE_FLAG`, or `RETIRE`.
