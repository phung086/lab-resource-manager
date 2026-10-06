# Redesign specification — LRM v1

This is the coordination design target for the user's requested substantial
frontend redesign, not evidence of completed implementation. UI_CONTRACT.md
contains the frozen implementation vocabulary and assignments.json the paths.

## Product intent
Make a university laboratory product recognizably its own: precise typography,
clear tasks, credible real resource imagery and practical information density.
Redesign composition and information hierarchy, not merely recolor old cards.
Landing explains the LAB and invites exploration; workspaces expose the next
authorized action, calendar context and operational exceptions.

## Composition
Use Swiss alignment and editorial hierarchy within the existing navy/light
academic identity. A bold asymmetrical public hero may contrast with restrained
task screens. Avoid repetitive equal-sized cards, decorative gradient/glow,
invented statistics, giant rounded containers and redundant headings.
Existing lab imagery is available; no generated images or new packages in wave 1.

Dense tools use strong headings, subtle borders, readable rows and deliberate
grouping. Status text and actual next actions take priority over decoration.
Preserve the retractable navigation specified in UI_CONTRACT.

## Rollout
Wave 1: Codex owns shared foundations/shell/role homes; Antigravity owns landing;
three web agents own calendar, operation card/timeline, and profile respectively.
Each is a complete bounded surface with preserved behavior. Remaining surfaces
are allocated after integration review; this wave is not the entire-system finish.
No contributor waits for unpublished token changes; baseline tokens are stable.

## Acceptance
Use UI_CONTRACT layout sizes and typography. Preserve API/RBAC, exports, callbacks,
data semantics, test hooks, keyboard usability, reduced motion and VI/EN.
Verify meaningful hierarchy/composition changes at desktop and mobile, real
empty/loading/error states, and task-specific interactions. A passing build or
generated screenshot alone is insufficient. Codex validates each integrated PR
against the running local app and records remaining limits honestly.

## References
https://www.designprompts.dev/ was reviewed as composition inspiration: Swiss,
Industrial, Academia, Professional and Enterprise directions. It is not a spec,
an asset license or authority over LRM business rules. Existing DESIGN.md and
.impeccable/design.json remain context, interpreted through approved contracts.
