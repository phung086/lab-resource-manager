---
name: lrm-team-design
description: Implements a bounded LRM UI task using shared design tokens, isolated file ownership and a reviewed PR handoff across local and web agents.
---
# Portable LRM team design

Read root AGENTS and required documents, then docs/ui-redesign/TEAM_PLAN.md,
UI_CONTRACT.md, assignments.json and the assigned task's BRIEF.md. Apply only
to the task the user gave you. No permission to start other tasks or Batches.

Use the fixed token/font/control vocabulary; change hierarchy and composition
within your surface. Never create a separate theme or modify shared files.
Keep real data, exports/props, state/handlers, permission gates, VI/EN, drafts,
pagination and time helpers intact. Add a root scope class and one task CSS
import in an allowed component. No generic global overrides or new dependencies.

Existing code and screenshots are evidence, not a design mandate. Preview images
may predate the four Cowork CSS files; compare current source before treating
them as the current UI. Design Prompts supplies composition inspiration only.
Do not copy its fictional testimonials, KPIs, claims or pricing into LRM.

Inspect your incremental diff, run the scope script and available frontend
required checks. With actual browser access, inspect desktop/mobile/VI/EN and
fix observed problems in bounded passes. Without a real backend/browser, report
that limitation and leave runtime acceptance to Codex. No simulated success.

Write your own task REPORT.md: changes, exact files, checks/results, preserved
behavior, UI evidence or limitations, shared change requests and remaining risk.
Return an independently reviewable PR (or exact patch if Git tools are read-only).
Never merge to main or broaden your allowlist. Stop at the assigned boundary.
