# Five-agent LRM redesign — coordination plan

Date: 2026-10-06. This request prepares/publishes a baseline, installs Antigravity
skills and provides assignments. Application redesign begins when the user sends
the corresponding prompt. No new numbered Batch or backend redesign is implied.

## Ownership and wave 1

| Agent | Task ID | First deliverable | Isolation |
|---|---|---|---|
| Codex | coordinator | shared tokens/CSS order, shell and role homes; integration/QA | primary checkout, coordinator branch |
| Antigravity | ag-landing | public landing composition and its scoped CSS | separate local worktree/branch |
| ChatGPT web 1 | web-calendar | calendar controls and event presentation | own branch + PR |
| ChatGPT web 2 | web-operations | operation card and workflow timeline | own branch + PR |
| ChatGPT web 3 | web-profile | profile presentation/disclosure | own branch + PR |

Read `assignments.json` for exact allowed paths. No two contributor tasks own
the same file. Codex does not concurrently edit contributor-owned files. Other
screens (catalog/dossier, booking forms, incidents, maintenance, teaching,
administration, reports and assistant presentation) remain coordinator-owned
or unassigned; delegate further only after wave 1 is reviewed. This is how we
cover the system without giving each agent a dangerous whole-project rewrite.

## Start and shared dependencies
1. The coordinator publishes the tested local source baseline plus this contract.
   All four contributors start from that published main revision and inspect
   mandatory docs, UI_CONTRACT and their task source. No broad duplicate audit.
2. Tokens named in UI_CONTRACT are already defined in the baseline. Contributors
   can use that frozen API immediately; do not wait for private local Codex work.
   Codex may fix shared cascade/contrast but must retain token names/semantics.
3. Three web agents must have an actual Git editing/PR environment. A read-only
   GitHub connector cannot change a repository. If tools are read-only, return
   a patch and task report for Codex to apply; never claim a push/PR occurred.
4. Antigravity works in `C:/Projects/lrm-redesign-antigravity`, on
   `codex/lrm-ui-ag-landing`. Open this folder in the IDE, not the primary
   `C:/Projects/lab-resource-manager`. Check the prepared checkout exists first.
5. Public source baseline is not a public demo deployment. Web agents cannot
   reach Windows localhost. They may run their own disposable frontend environment
   only if their tools support it; never invent a real backend/runtime success.

## Immutable files for contributors
AGENTS/CLAUDE/DESIGN, shared spec/contract/manifest, main.jsx/App.jsx, global CSS,
locale catalogs/manifest/backend projections, shared brand/header/footer/modal,
backend/persistence, dependencies/lockfiles, environment files and CI/tooling.
Requests for shared changes go in the contributor's own report, not a common
PROGRESS file or another task's files. Cross-task reading is allowed; edits are not.

## Integration
- Contributors create small PRs; do not merge, force-push, overwrite others,
  reset/clean/stash or silently expand the allowlist. Branch IDs are fixed.
- Scope check: `node scripts/check-redesign-scope.mjs --task TASK --base origin/main`
  (use a verified baseline commit instead when origin is unavailable).
- Run frontend `npm run test:required`. Existing 9 lint warnings are baseline;
  do not clean unrelated modules. Check CSS/JSX and preserve business handlers.
- Coordinator reviews reports/requests and then integrates one PR at a time,
  runs shared checks and real browser desktop/mobile/VI/EN checks, including
  branch-specific failure states and unchanged core flows. CI must be green
  at the actual integrated head before calling it a verified redesign.
- If a PR changes outside its allowlist, or changes props/handlers/business
  behavior unexpectedly, return it for correction. A path gate alone is not a
  correctness or security proof. Do not grant bypass/admin merge permissions.
- After wave 1, record progress and only then allocate the next bounded set.

## Continuity
Root AGENTS mandatory reading stays in force. Reuse unchanged context in the
same session. `.agents/skills/lrm-team-design/SKILL.md` is a compact portable
workflow available in Git; web agents can read it without an installed skill
system. Personal Antigravity skills are on this Windows machine only.
Historical evidence/backup archives not required to build are retained locally;
reports may link to local screenshots that are not included in the new baseline.

## Prepared skills and documentation
Antigravity global skills: `C:/Users/Admin/.gemini/config/skills/` (impeccable,
ui-ux-pro-max, design-system, design-taste-frontend, lab-preflight,
lab-product-redesign). Verify active loading in IDE Customizations/new session.
Installed files and parsers do not prove an IDE model invocation was successful.
Official sources: https://www.antigravity.google/docs/skills?tab=ide and
https://www.antigravity.google/docs/rules/ . No proxy/model/secrets changed.
