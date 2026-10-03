# Database ERD

Read [the generated core ERD](core-erd.md) for the 20 core models and a separate
stock/course-group projection. Relations, keys and cardinality come from Prisma.

Canonical source of truth:

- `backend/prisma/schema.prisma`
- verified Batch 1 persistence reports
- applied Prisma migrations

Do not edit diagrams as a substitute for schema review. When the schema changes
through an approved migration, update ERD artifacts after the migration is
verified.

From `backend/`, run `npm run db:generate` after an approved schema change, then
`npm run docs:erd`. `npm run docs:erd:check` verifies the tracked diagram in CI.
The generator rejects a Prisma client whose schema differs semantically from
the canonical source. Diagrams omit credentials and optional provider modules.
