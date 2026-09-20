# Backend Guideline

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL 16
- Node test runner

Do not migrate to Java, NestJS, or another framework merely because an
instructor example uses it.

## Architecture

Use:

route -> middleware -> service -> Prisma

- Routes define HTTP endpoints and response shape.
- Middleware handles authentication, RBAC, lab scope, validation helpers, and
  error normalization.
- Services hold business logic, transitions, transactions, and persistence
  coordination.
- Prisma schema and migrations remain canonical persistence source.

## Authorization

Every sensitive route must verify:

- valid bearer JWT where required
- current active database user
- canonical role
- ownership
- lab scope through `UserLabAssignment` where required

Do not rely on client-provided identity or lab fields.

## Persistence Rules

- Use Prisma migrations for approved schema changes.
- Never run `prisma db push` against shared/development databases.
- Never edit historical applied migrations.
- Never manually edit `_prisma_migrations`.
- Keep PostgreSQL booking overlap protection intact.
- Do not hard-delete records when retirement/deactivation is the approved
  business action.

## Booking Rules

- Use canonical booking statuses only.
- `NO_SHOW` is outcome/event, not status.
- Use half-open intervals `[startAt, endAt)`.
- Map overlap conflicts to `409 BOOKING_CONFLICT`.
- Do not bypass database-level overlap protection.

## Resource Rules

- `Resource.operationalStatus` is authoritative.
- `Resource.status` is compatibility projection only.
- `RESERVED` is not a physical state.
- Changing operational status should be transactional and history-backed where
  schema supports it.
- Retire instead of hard-delete.

## Runtime Truthfulness

Database or infrastructure failure must produce explicit failure. Do not fall
back to mock stores or fake success in core runtime.

Payment, AI, simulation, optimization, and other optional modules must not be
treated as production-core unless verified in an approved batch.

## Error Contract

Use:

```json
{ "error": { "code": "CODE", "message": "Message", "details": null } }
```

Do not expose stack traces, SQL, Prisma internals, JWT internals, or secrets to
clients.

## Verification

Common checks:

```text
cd backend
npm test
npm run test:batch2
npm run test:batch3
```

Use guarded isolated databases for integration tests that need PostgreSQL.
