# Batch 2.5 - Instructor Compliance And Agent Governance Report

Status: **COMPLETE - GOVERNANCE ONLY**

Applied on top of the current repository state, which already contains verified
Batch 1E, Batch 2, and Batch 3 reports. No business logic, database schema, or
runtime implementation was changed by this governance bootstrap.

## Instructor Requirements Interpreted

The instructor baseline requires useful project documentation, a clear source
structure, agent/project rules, tests, convention, SRS, ERD, UI/UX guideline,
and quality tooling.

Team Scrum procedures, role assignment inside a team, and team-personnel
management are intentionally excluded because this is an individual graduation
project.

## Current Vs Target Folder Mapping

| Instructor baseline | Current project | Decision |
|---|---|---|
| `docs/` | `docs/` | Direct match |
| `code/frontend/` | `frontend/` | Accepted logical equivalent |
| `code/backend/` | `backend/` | Accepted logical equivalent |
| `.agent/` | `.agent/` | Added governance files |
| `test/` | `backend/test`, frontend E2E scripts | Accepted current layout |

`frontend/` and `backend/` were not physically moved to avoid breaking Docker,
Prisma, scripts, CI, imports, and tests.

## Frontend Baseline

The project remains React/Vite. The target structure from instructor notes is
documented as a gradual touched-module migration policy, not a big-bang
restructure.

Frontend guidance now lives in `docs/FRONTEND_GUIDELINE.md`.

## Backend Baseline

The project remains Node.js/Express/Prisma. Instructor Java/NestJS examples are
mapped conceptually to:

route -> middleware -> service -> Prisma

Backend guidance now lives in `docs/BACKEND_GUIDELINE.md`.

## Reference Project Policy

Materio, Untitled UI React, and similar references may inform organization,
accessibility, dashboard patterns, and UI quality. They must not override the
approved architecture or cause framework migration.

## Documentation Inventory

Added:

- `AGENTS.md`
- `.agent/PROJECT_RULES.md`
- `.agent/INSTRUCTOR_BASELINE.md`
- `.agent/DEVELOPMENT_WORKFLOW.md`
- `.agent/skills/lab-project-compliance/SKILL.md`
- `docs/srs.md`
- `docs/convention.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/FRONTEND_GUIDELINE.md`
- `docs/BACKEND_GUIDELINE.md`
- `docs/DB-erd/README.md`
- `docs/UI-UX-style-guideline/README.md`
- `docs/backlogs/README.md`
- `docs/BATCH2_5_INSTRUCTOR_COMPLIANCE_REPORT.md`

Existing useful documentation was preserved.

## Agent Governance Design

The governance layer defines:

- mandatory reading order
- source authority order
- canonical roles/statuses/categories
- persistence safety rules
- no-fake-success rule
- scope discipline
- batch stop condition
- local compliance skill for Codex-compatible agents

Agents that do not support local skills can still follow `AGENTS.md` and
`.agent/*.md`.

## Quality Tooling Status

| Area | Status | Evidence |
|---|---|---|
| ESLint | MISSING | No ESLint config or script found |
| Prettier | MISSING | No Prettier config or script found |
| TypeScript typecheck | MISSING | No `tsconfig` or typecheck script found |
| Strict TypeScript | DEFERRED | Mixed JS/TS frontend; no strict TS config |
| Frontend build | ENFORCED | `frontend/package.json` has `build`; CI runs it |
| Backend tests | ENFORCED | `backend/package.json` has `test`; CI runs it |
| Frontend E2E | PARTIAL | Auth/resource E2E scripts exist; CI currently runs build only |
| Pre-commit hooks | MISSING | No Husky/pre-commit config found |
| CI | PARTIAL | CI exists for backend test, frontend build, Docker config |

Missing tooling should be added incrementally in a later approved quality batch.
Do not aggressively enable strict rules that break hundreds of existing files
inside a governance-only batch.

## Incremental Compliance Roadmap

1. Add ESLint with warning-first or scoped enforcement.
2. Add Prettier and format only touched files or a separately approved format
   batch.
3. Add TypeScript config and typecheck gradually.
4. Move touched frontend modules toward pages/components/base/features/services
   structure.
5. Add frontend E2E to CI once stable and not dependent on local-only state.
6. Add pre-commit hooks only after lint/build/test commands are stable.
7. Add ERD artifacts from `backend/prisma/schema.prisma`.
8. Maintain batch reports for every approved core workflow.

## Validation Results

Governance file creation does not change runtime behavior. Validation completed:

- `cd backend && npm test`: PASS, 27/27 core tests.
- `cd frontend && npm run build`: PASS.

Known existing warning:

- Vite main bundle remains larger than 500 kB after minification. This was
  already documented as performance debt in Batch 2 and Batch 3.

## Hard Stop

Batch 2.5/governance bootstrap stops here. It does not start or modify Batch 4.
