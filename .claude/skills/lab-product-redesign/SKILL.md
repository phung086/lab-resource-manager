---
name: lab-product-redesign
description: Audit, implement, resume or verify a major LAB Resource Manager frontend redesign while preserving required product capabilities and backend contracts.
disable-model-invocation: true
argument-hint: "audit | implement | resume | verify"
---
# LAB product redesign

Mode: $ARGUMENTS. Read CLAUDE.md, AGENTS.md and the mandatory source documents.
Read ../../WORKFLOW.md for runtime, commands and environment limitations.
This is a user-invoked workflow, not permission to start unrelated batches.

## Scope and decisions
A major redesign can change information architecture, page composition, visual
language, component structure, density and interaction within the authorized frontend
scope. Do not preserve weak composition just because it exists. Keep React/Vite,
backend/API contracts, roles/statuses, RBAC, real data and required business workflows.
Do not invent KPI/history/telemetry, bypass migrations, or revive retired features.

Preserve dirty working-tree changes. Capture a baseline diff before editing; review
your incremental changes rather than attributing pre-existing work to yourself.
Don't create a new worktree and silently omit the user's uncommitted UI.

User instructions determine whether a design decision needs approval. Ask only for a
real conflict with an explicitly approved UX/business requirement or expanded scope;
do not ask users to choose routine colors/fonts. An audit-only request must stop
before application edits. An implementation request must continue through its agreed
scope without artificial approval checkpoints between ordinary phases.

## Audit
1. Verify cwd, branch, worktree, scripts and runtime using /lab-preflight.
2. Inventory routes/screens, role-to-job map and must-preserve capability matrix from
   SRS, actual handlers and API behavior. Include hidden/feature-gated scope separately.
3. Inspect actual public and authenticated UI with local Browser or Playwright MCP.
   Use existing demo users; avoid mutations while auditing. Capture baseline images.
4. Separate structural UX issues from visual issues. Cite screen/component evidence.
5. Offer two materially different directions in composition, hierarchy and density,
   not two palettes. Explain effects on landing, shell, staff home, catalog/detail
   and booking. Select the stronger direction based on LAB work and demo clarity.
6. Record conclusions in docs/ui-redesign/REDESIGN_SPEC.md with proposal/acceptance
   status. Audit may write documentation when requested, but not application code.

## Specification and continuity
Before implementation, persist the selected authorized direction, IA/navigation,
role strategy, tokens, typography, density, component/state conventions, accessibility,
responsive behavior and capability matrix. Tie each changed prior decision to its
actual authorization. Align DESIGN.md and relevant guidelines after accepted changes.
Maintain docs/ui-redesign/PROGRESS.md with completed/incomplete screens, evidence,
known regressions and next action. Do not claim a planned design is already approved.

## Implement
1. Build a coherent representative slice: shell, staff workspace, catalog/detail and
   booking form with real API behavior. Preserve old functionality while migrating.
2. View and exercise desktop/mobile results before propagating. If the result is just
   a recolor, revisit composition. If usability worsens, correct it first.
3. Roll out to remaining in-scope role homes, calendar, operations and admin screens
   by functional group. Continue until the requested boundary, not one attractive page.
4. Remove obsolete CSS/components only after verifying remaining callers. Avoid new
   all-purpose override stylesheets and unnecessary dependencies.
5. TasteSkill at ~/.claude/skills/design-taste-frontend/SKILL.md may support public-page
   composition and visual review; it does not govern dashboards/tables/booking flows.

## Verify
Run existing frontend lint, typecheck, i18n and build gates plus relevant regression
checks. Inspect a test before running it: some UI tests seed or mutate a database.
Use an isolated approved test database for mutation suites; never turn the active demo
into a destructive test target. Follow backend guidance if backend is genuinely in scope.

Check every in-scope role can reach required functions; inspect representative real
routes at 1440x900, 1366x768 and 390x844. Check VI/EN, drafts, focus, modal scrolling,
long content, empty/loading/errors, pagination and date/time semantics. Don't invent
backend responses to claim a live end-to-end pass. Controlled fault injection may test
error handling only when clearly identified as a test, not demo/runtime evidence.

Read the final diff and challenge completeness: lost actions, inaccessible controls,
untranslated copy, old/new style drift and regressions. Fix confirmed issues and
rerun affected checks. Report commands/results, before/after evidence and limits.

## Resume
Read REDESIGN_SPEC.md and PROGRESS.md, inspect the current diff/runtime, continue the
next unfinished authorized group. Preserve design decisions across sessions; re-audit
only when new evidence or instructions justify it. Do not require optional /goal,
/verify or /doctor prompt-audit commands to exist; use this workflow directly.
