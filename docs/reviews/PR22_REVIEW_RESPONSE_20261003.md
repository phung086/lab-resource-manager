# PR #22: review corrections

Date: 2026-10-03. Reviewed source: `7424957` on `codex/lab-workspace-ui-draft`.
Input: `Danh_gia_PR22_7424957.docx`. The reviewer disclosed that source/diff/CI
were unavailable; proposed risks are verified against code before changes.
This continues the draft PR without a new Batch, schema change or deployment.

## Confirmed fixes

| Finding | Disposition and evidence |
|---|---|
| D1: inconsistent queue evidence | Queue report now records the current local 63 backend / 6 queue integration / 55 browser checks, 2,122 keys and nine lint warnings. Earlier reports remain revision-specific. |
| D2: current state mixes historical gates | Current status and review link lead CURRENT_STATE; old checkpoints and baseline gates are explicitly historical. QA-01's open status predates its fix in `7424957`. |
| D3: staff audit access | SRS distinguishes scoped audit reads from manual edit/delete. The latter is unavailable to every role; audit read routes permit ADMIN and assigned LAB_STAFF. |
| D4: duplicate appendix / report placement | Permissions moved to Appendix D. Historical review disposition and future work are identified separately; session publication instructions removed from current product state. |
| V1: phone-based guest login | Confirmed. `/auth/login` now returns generic 401 AUTH_INVALID for EXTERNAL accounts requiring password setup, even when the supplied phone matches. Email-verified guest setup can change the password, after which normal login succeeds. PostgreSQL regression verifies the attack and legitimate flow. |
| Additional CI defect | Confirmed in GitHub logs: locale manifest hashed CRLF working files, while Git published LF. `i18n:sync` normalizes actual catalog files before hashing; check mode rejects CRLF with an actionable error. Runtime SHA verification is unchanged. A CLI regression proves exact source byte/hash consistency. |

## Risks checked against source and tests

| Finding | Result |
|---|---|
| V2: maintenance ignores newly selected resource | Not reproduced. `MaintenancePage.payload` reads FormData. Browser regression changes the selection, saves through the real API, and verifies the persisted replacement ID; the original-resource reschedule is also covered. |
| V3: stale impact preview | Save rechecks booking conflicts under a resource row lock; PATCH also locks the job and compares its current updatedAt. A new PostgreSQL case inserts a confirmed booking after an empty preview and verifies that saving returns 409 without moving the job. A deterministic two-writer reschedule stress test was not run; no blanket concurrency certification is claimed. |
| V4: deep page cost | Valid concern at scale. Requests past the computed last page now skip findMany/OFFSET, retaining authorized summaries. Full group counts and valid deep pages remain potentially expensive; 200k-record/20-request load testing was not performed. |
| V5: resource moves change historical scope | Existing current-lab contract, not an immutable ownership snapshot. PostgreSQL tests move a resource A→B→null, verifying old staff loses access, receiving staff gets current scope, null fails closed and admin retains global history. No persistence contract was changed. |
| V6: 403 versus 404 | Existing booking resource-scope behavior retained. Public resource discovery already exposes safe resource IDs. This is not a claim that every error response hides existence; changing this contract is outside the pagination fix. |
| V7: legacy query compatibility | PostgreSQL regression passes lowercase `pending_approval`, `_` and `take` together with a persisted text resource ID. Legacy booking `take` is ignored as before (100 cap); legacy incidents retain their own take handling. Strict unknown-field rejection applies to paginated requests. |
| V8: removed JSX registry references | Active app and research registry use explicit imports, including retained TSX counterparts. Source search and production build found no missing modules; required browser paths pass. Research features remain disabled by default; not every optional research screen was exercised. |

## Verification on the correction tree

- Backend required: 63 tests pass; backend lint passes.
- Frontend required: eight tests pass, 2,122 matching VI/EN keys, 79 source
  modules audited, lint zero errors/nine existing warnings, TypeScript/build pass.
- Queue PostgreSQL: six tests pass, 160 bookings and 86 incidents, scope and
  legacy compatibility included.
- Guest PostgreSQL: 13 tests including parent pass; test-only email delivery
  and address validation are used, with real database writes and HTTP handlers.
- Workspace PostgreSQL: four tests pass, including save-time conflict recheck.
- Real Chromium/API/PostgreSQL: 55 checks pass with no browser exceptions.
- At base `7424957`: three GitHub workflows passed and six failed. The failure
  logs identified the locale integrity defect. Local verification above does
  not substitute for CI on the new published commit.

Local evidence is under ignored `logs/queue-pagination-20261003/`. Isolated test
databases and dedicated test servers are used; existing application databases,
servers and untracked artifacts are preserved.

## Remaining limits

CI follow-up on `e153bc9`: six workflows passed, including the production demo,
payment reconciliation and monitoring release gate. CI's queue, frontend,
backend, database, migration-safety and Docker jobs passed. Three workflows
failed on outdated browser assumptions: navigation failure injection matched
only the old URL without query parameters, and the shared Batch 5 operations
test asserted visibility immediately after a server-side filter change. The
tests now match the booking endpoint with query parameters and wait for the
expected row to become visible; the failure injection also asserts it ran.
These corrections require a new CI run. Local navigation replay could not start
because no application was listening at port 15181; it is not a passing run.

On `8d530d3`, eight of nine workflows passed, including all seven CI jobs and
Batch 5 full-stack. Batch 6 progressed to its incident assertions and exposed the
same immediate-count assumption after page navigation. Its student and foreign
staff cases now wait for the expected incident before checking counts/scope.
The complete result for the latest published commit is recorded in PR #22 checks.

Guest setup recovery after losing the OTP-issued session is not implemented;
phone login is deliberately unavailable until setup completes. This patch also
does not revoke bearer tokens issued before the fix or on password change.
These remain release risks alongside the existing session-revocation backlog.
Full queue counts/deep offsets need a separately measured volume benchmark.
Live SMTP/payment/storage/hardware integrations are not certified by these tests.
