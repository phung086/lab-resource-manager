# Instructor Baseline

Sources:

- instructor PDFs stored under `docs/instructor/`
- User-provided normalized notes for the instructor structure and OJT baseline

This file contains instructor requirements relevant to this individual
graduation project.

Team-management procedures such as Daily Meeting, Scrum role assignment,
Tester role separation, and team personnel organization are intentionally not
enforced because this is an individual graduation project.

## Required Documentation

The project should maintain useful working documentation, including:

- SRS
- Coding Convention
- Project Structure
- ERD
- UI/UX Style Guideline
- Backlog or implementation planning where useful
- testing documentation
- security review documentation when relevant

Documentation must support implementation and understanding rather than exist
only for formality.

## Repository Logical Structure

Instructor baseline:

```text
docs/
code/
  frontend/
  backend/
.agent/
test/
```

Current compatibility mapping:

- `/docs` => compliant
- `/frontend` => logical `code/frontend`
- `/backend` => logical `code/backend`
- `/.agent` => project agent rules and local skills
- backend tests live under `/backend/test`
- frontend E2E scripts currently live under `/frontend`

Do not physically move `backend/` or `frontend/` solely to match the example
tree unless explicitly approved.

## Frontend Baseline

The project uses React/Vite.

Logical frontend structure should converge gradually toward:

```text
src/
  assets/
  pages/
  components/
    base/
    features/
  routes/
  layouts/
  lib/
  hooks/
  store/
  types/
  styles/
  providers/
  schemas/
  services/
  utils/
  constants/
```

Quality baseline:

- ESLint
- Prettier
- TypeScript strict-mode direction
- avoid hardcoded colors/text when reusable/configurable
- avoid unused imports
- avoid uncontrolled `any`
- avoid magic numbers
- maintain clean module boundaries

Do not perform a big-bang source restructure. Apply touched-module migration.

## Frontend References

Instructor-provided references:

- Materio
- Untitled UI React
- Untitled UI starter kit

Use them for layout, component organization, design-system consistency,
accessibility, dashboard patterns, and form/table quality.

They must not cause framework migration. Do not migrate React/Vite to Next.js
merely because a reference uses Next.js.

## Backend Baseline

Instructor documentation contains Java and NestJS examples. This project
already uses Node.js + Express + Prisma. Map architectural concepts rather than
replace frameworks.

Expected logical flow:

HTTP route -> middleware -> service -> Prisma/database

Cross-cutting concerns:

- constants
- validation
- errors
- auth/RBAC
- utilities
- configuration

Business logic should live in services rather than being duplicated in routes.

## Testing

Required flows must have automated verification.

Tests should cover:

- business rules
- permissions
- persistence
- negative cases
- concurrency where applicable
- integration
- frontend/backend critical E2E

Optional/research failures must be reported separately from required-core
failures.
