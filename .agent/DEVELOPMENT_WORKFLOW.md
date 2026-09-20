# Development Workflow

Use this workflow for every task, batch, bug fix, or documentation change.

## 1. Inspect

- Run `git status --short`.
- Identify user/untracked changes before editing.
- Do not revert changes you did not make.

## 2. Read Rules

- Read `AGENTS.md`.
- Read `.agent/PROJECT_RULES.md`.
- Read `.agent/INSTRUCTOR_BASELINE.md`.
- Read this workflow.
- Read `docs/CURRENT_STATE.md` and `docs/DECISIONS.md`.
- Read relevant docs and Batch reports.

## 3. Define Scope

- State the requested batch or task boundary.
- Identify files likely to change.
- Exclude optional/research work unless explicitly requested.

## 4. Inspect Implementation

- Use `rg` or `rg --files` first.
- Read current code before editing.
- Prefer existing patterns and helpers.

## 5. Implement

- Make the smallest coherent change.
- Preserve React/Vite, Express, Prisma, and PostgreSQL.
- Keep frontend and backend contracts aligned.
- Put business logic in backend services/middleware where appropriate.
- Do not fabricate data, telemetry, audit, or runtime success.

## 6. Test

Prefer the narrowest meaningful verification first, then broaden when risk is
higher.

Common commands:

```text
cd backend && npm test
cd backend && npm run test:batch2
cd backend && npm run test:batch3
cd frontend && npm run build
```

Do not run destructive database commands. Do not use `prisma db push` against
development/shared databases.

## 7. Inspect Diff

- Run `git diff --stat`.
- Review touched files.
- Confirm no unrelated files were changed.

## 8. Document

- Update relevant canonical docs or Batch reports only when the change affects
  contracts, workflow, architecture, or verification status.
- Update `docs/CURRENT_STATE.md` after an approved batch changes the verified
  boundary, gates, blockers, debt, or next authorized task.
- Add an entry to `docs/DECISIONS.md` only for an approved durable decision.
- Do not create documentation for formality alone.

## 9. Report

Final reports must include:

- what changed
- what was verified
- what was not verified
- remaining risks
- batch boundary status

## 10. Stop

Stop at the requested boundary. Do not automatically begin the next batch.
