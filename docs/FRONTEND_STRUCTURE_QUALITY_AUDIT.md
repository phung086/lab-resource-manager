# Frontend Structure & Quality Audit

Date: 2026-09-20

## Instructor Mapping

The approved repository mapping remains:
- `frontend/` ≡ instructor `code/frontend/`
- `backend/` ≡ instructor `code/backend/`
- `backend/test/` is the backend test location
- frontend E2E scripts remain under `frontend/`

No root-folder relocation is required.

## Target React/Vite Convergence

Batch 5 uses touched-module migration toward:
- `src/pages/operations/`
- `src/components/features/operations/`
- `src/services/`
- `src/types/`
- `src/styles/`
- shared `src/utils/`

The active operational workflow is no longer implemented as additional business logic inside `App.jsx`; `App.jsx` only mounts the page boundary.

## Tooling Status

| Item | Status |
|---|---|
| React 19 + Vite 6 | PRESENT / CANONICAL |
| TypeScript usage | PRESENT, incremental; project still mixed JSX/TSX |
| ESLint | MISSING-REQUIRED/RECOMMENDED follow-up |
| Prettier | MISSING-RECOMMENDED |
| Husky/pre-commit | OPTIONAL/RECOMMENDED |
| Strict TS project-wide conversion | DEFERRED; no big-bang migration |
| Feature/page/service/type separation | IMPROVED IN BATCH 5 |

Batch 5 intentionally does not mass-format or restructure unrelated modules.

## Remaining Structural Debt

`App.jsx` still contains legacy views outside the touched booking operations module. They should be migrated incrementally only when their batch is authorized. Optional/research modules must not be restored or promoted solely for structural symmetry.
