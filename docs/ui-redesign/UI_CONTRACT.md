# LRM UI contract v1 — shared by five agents

Authorized scope: frontend presentation redesign, 2026-10-06. This contract
coordinates the user-requested work, not a claim that redesigned screens exist.
AGENTS/SRS and approved business contracts remain higher authority.

## One visual direction
Modern academic LAB with Swiss-inspired hierarchy and precise alignment: neutral
light surfaces, navy actions, readable IBM Plex typography, real LAB content.
Landing may have bolder editorial composition; operational screens prioritize
tasks and dense readable records. No independently chosen themes per agent.
Design Prompts is inspiration, not source code or business requirements.

## Frozen shared vocabulary
Use existing `--lab-*` variables in `frontend/src/styles/lab-design-system.css`.
Only Codex coordinator may change shared variables or introduce aliases.

| Purpose | Token / convention |
|---|---|
| Canvas, surface, muted surface | `--lab-canvas`, `--lab-surface`, `--lab-surface-muted` |
| Text | `--lab-text-primary`, `--lab-text-secondary`; muted is supplementary only |
| Primary action | `--lab-navy-700`, hover `--lab-navy-800`, tint `--lab-navy-50` |
| Borders | `--lab-border`, `--lab-border-strong`, `--lab-border-focus` |
| Status | `--lab-success`, `--lab-warning`, `--lab-danger`, `--lab-info` and their bg/border tokens |
| Fonts | `--lab-font-sans` = IBM Plex Sans; `--lab-font-mono` = IBM Plex Mono |
| Spacing | existing `--lab-space-*` 4px scale; 12/16/24/32px for common gaps |
| Radius | `--lab-radius-sm` (4px), `--lab-radius` (6px), `--lab-radius-md` (8px) |

Use text/labels/icons as well as semantic colors. Never use booking state as
physical resource state. Confirm text contrast in the actual rendered state;
an existing token's name is not proof of accessibility. Report an unsuitable
shared token instead of silently redefining it inside a surface.

## Typography, controls and layout
- UI body/form labels 14–16px, metadata 12–13px; page titles 28–32px; section
  titles 18–22px. Public hero may use responsive 40–64px. Natural Vietnamese
  sentence case; uppercase reserved for short codes/overlines.
- Mono only for codes/technical data, not every label. Use existing Lucide
  icons consistently, 16–20px in controls. Decorative icons are aria-hidden.
- Controls generally 40px high, touch targets at least 44px at narrow sizes.
  Clear primary/secondary/danger hierarchy; explicit 2px focus with offset.
  Transitions 120–200ms and respect reduced motion. No hover-driven layout shift.
- Desktop checks 1440 and 1280px; tablet 768px; mobile 390 and 375px. Stack
  task controls sensibly; tables/calendars may scroll inside labelled regions.
  Never introduce page-wide horizontal overflow.
- Keep retractable navigation: compact 80px rail by default, searchable drawer,
  optional 300px desktop pin; horizontal shortcut bar below 1100px. Codex owns
  this shell; other agents must not add another navbar/sidebar.

## CSS boundaries
Each task imports its ONE dedicated stylesheet from its assigned component,
not main.jsx. Scope EVERY normal selector under its task root:
`lrm-public-redesign`, `lrm-calendar-redesign`, `lrm-operation-redesign` or
`lrm-profile-redesign`. Operation card/timeline may each use the operation root
because the card is also used outside the queue page. No global body/html/:root,
generic button/input/table selectors outside the root, shared variable changes,
or !important arms race. Preserve existing classes/test hooks; add the scope
class. Add motion keyframes only with a task-specific name when necessary.
No new framework, font package, icon set or dependency.

## Behavior and copy
Keep component exports/props, handlers, refs, IDs used by forms/tests, server
reads, pagination/totals, error behavior, permission checks and timezone helpers.
Do not mutate business rules under a visual task. Unsaved form input survives
section/locale switches and API failures. API success precedes success feedback.
Modals retain focus trap/restoration; nonmodal assistant stays nonmodal.
Reuse existing VI/EN catalog keys. Catalogs and generated manifest are Codex-only.
If a new label is essential, record its VI/EN proposal in the task report; use
existing keys meanwhile. Never add an undefined key or inline bilingual fallback.

## Evidence and change control
Use the task allowlist, independent branch/checkout, scope gate and frontend
required checks. No agent pushes/merges to main. Only the coordinator integrates
reviewed PRs one at a time. Missing local runtime in a web agent is a stated
limitation; Codex validates that PR visually before merge. Do not fake verification.
Prompt instructions reduce risk; they cannot guarantee correctness or prevent
all semantic conflicts. Review and tests are still required.
