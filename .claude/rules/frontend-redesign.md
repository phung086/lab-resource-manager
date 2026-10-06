---
paths:
  - "frontend/**/*"
  - "DESIGN.md"
  - "docs/ui-redesign/**/*"
---
# LAB product frontend

For redesign, solve role tasks and information hierarchy before styling. Preserve
required discovery, scheduling, booking, approval, handover and return capabilities.
Use distinct role workspaces; don't reuse one generic metric-card layout for all roles.
Public pages may be expressive; calendars, tables and operations need scanability,
appropriate density and clear next actions. Avoid decorative metrics and repeated
hero banners. A template-like result is not fixed merely by changing colors/radii.

Use the actual existing API and localized messages. Preserve VI/EN, drafts on locale
switches, explicit physical/booking states, privacy, scoped totals/pagination, error
recovery, keyboard controls and modal focus. Never simulate runtime success.

Audit CSS imports and computed behavior before claiming conflicts. Replace obsolete
styles progressively once callers are migrated; avoid another blanket override layer.
Don't dictate a font/color as a universal anti-AI rule. Justify visual choices through
product context and the selected design specification.

Keep collapsible navigation and existing approved UX until explicitly superseded.
TasteSkill may inform landing/composition; its landing heuristics do not govern dense
product screens. Do not install UI frameworks just because a skill suggests them.

Validate real desktop/mobile screens, long text, loading/empty/error and relevant form
states. Record actual results and limits; build success does not prove usability.
