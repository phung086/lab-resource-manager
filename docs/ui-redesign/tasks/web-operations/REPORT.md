# web-operations report

Task: `web-operations`  
Branch: `codex/lrm-ui-web-operations`  
Scope class: `lrm-operation-redesign`

## Baseline

- BASE_SHA: `bd83a97c4f9e30376134064c013cc133bf5e02a7`
- Baseline branch: latest verified `main` at task start.
- Before edits, the task branch pointed exactly at BASE_SHA and GitHub compare reported no changed files.
- This web session has no local Git checkout because the container cannot resolve `github.com`. Repository reads/writes use the authenticated GitHub connector; therefore `git status --short` was not executed locally and is not claimed.

## Files

- `frontend/src/components/features/operations/BookingOperationCard.tsx`
- `frontend/src/components/features/operations/BookingWorkflowTimeline.tsx`
- `frontend/src/styles/redesign/operations.css`
- `docs/ui-redesign/tasks/web-operations/REPORT.md`

## Changes

- Booking cards now lead with the real resource identity and purpose, then present schedule, requester, laboratory, and canonical booking status in a readable operational facts band.
- Existing evidence, physical-state warning, fee text, permission gates, action conditions, callbacks, booking ID hook, and canonical statuses are preserved.
- Workflow actions remain in their original logical order, with secondary history/payment actions visually separated from the next authorized operation by the existing spacer.
- The workflow timeline now separates lifecycle progression from persisted history. The current non-terminal step uses `aria-current="step"`; terminal `REJECTED`/`CANCELLED` states are shown explicitly without pretending they are lifecycle stages.
- For terminal records, the lifecycle strip only marks the latest canonical stage supported by persisted timeline `fromStatus`/`toStatus` evidence. Empty history does not fabricate reached stages.
- Persisted history remains in API order and now gives time, action, actor/role, status transition, reason, and condition evidence distinct hierarchy. Long reasons/conditions wrap and preserve line breaks.
- Empty history has an explicit bounded empty state.
- Dedicated task CSS uses only existing `--lab-*` tokens, IBM Plex through `--lab-font-sans`/`--lab-font-mono`, scoped selectors under `lrm-operation-redesign`, and responsive layouts. No shared token/theme is redefined.
- No new locale key or user-facing label was required, so there is no VI/EN catalog proposal.

## Verification

Implementation commit: `6292ddd5f0319d6e75ed13c18d0ce11a90fc55b8`.

- GitHub baseline/branch comparison before edits: **PASS** — branch was identical to BASE_SHA.
- Trusted PR scope gate **PASS** in GitHub Actions (`LRM Redesign File Scope`). It executed `node scripts/check-redesign-scope.mjs --task web-operations --base bd83a97c4f9e30376134064c013cc133bf5e02a7` against the PR head and accepted only the four allowlisted paths.
- Frontend CI **PASS**. The job ran `npm ci`, `npm run test:i18n`, `npm run lint`, `npm run typecheck`, and `npm run build`. These are the constituent checks of `npm run test:required`; the wrapper command itself was not invoked as one command in this web session.
- Supporting PR checks **PASS** at the implementation commit: main CI, Batch 7 production-like demo, Batch 8 smart-monitoring release gate, Phase H payment reconciliation, backend, migration safety, queue pagination, workspace navigation, Docker config, and fresh-database jobs.
- Batch 5 Full-stack E2E: **FAILED BEFORE ANY E2E SUITE RAN**. The production frontend bundle built successfully, then the workflow's dev-server readiness loop could not connect to `127.0.0.1:5177` for 60 seconds and exited with curl code 7. The operations assertions were therefore not executed.
- Batch 6 Full-stack E2E: **FAILED AT THE SAME FRONTEND READINESS BOUNDARY** before its browser suites ran; `127.0.0.1:5177` never became reachable.
- Direct browser/runtime review at 1440/1280/768/390/375 and VI/EN: **NOT RUN**. This web environment cannot access the user's Windows localhost and has no local checked-out runtime.

## Visual/runtime limitation

No visual acceptance claim is made from source or production build output alone. The coordinator still needs real runtime review for desktop/tablet/mobile, both locales, focus behavior, long-content cases, terminal states, and empty history before integration.

The two failed full-stack workflows are not evidence of an operation-component assertion failure: both stopped while waiting for the frontend dev server and never entered auth/resource/calendar/operations E2E. This task did not edit CI or package scripts because they are outside the allowlist.

## Shared requests

- **CI/runtime owner:** repair or re-run the Batch 5/6 full-stack frontend startup outside this task. Those workflows currently start the frontend with `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5177`, while the current `frontend/package.json` `dev` script invokes `scripts/dev-local.mjs`; the observed jobs never exposed port 5177. Do not fix this from the `web-operations` branch because workflow/package files are outside its allowlist.
- No locale key, shared token, shell, brand, API, RBAC, backend, schema, migration, dependency, or global CSS change is otherwise requested.

## Risks

- The new scoped stylesheet intentionally overrides legacy operation-card/timeline presentation while keeping old classes for existing hooks; integrated cascade still needs visual confirmation in the real app.
- Terminal progress uses only persisted history fields already returned by the booking history API. If a historical terminal record has no persisted timeline evidence, the terminal state is shown but no prior lifecycle step is asserted.
- Existing `BookingStatusBadge` uses its current inline semantic colors; this task does not change that shared component.
- Browser-level Batch 5 operation assertions remain unverified on this PR until the unrelated frontend-startup failure is repaired/re-run.
- Final merge remains coordinator-owned. This task must not be merged directly to main.
