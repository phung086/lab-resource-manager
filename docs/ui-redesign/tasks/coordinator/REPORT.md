# Coordinator foundation and role homes

Baseline: bd83a97c4f9e30376134064c013cc133bf5e02a7, branch
`codex/lrm-redesign-coordinator`, primary checkout C:/Projects/lab-resource-manager.

## Implemented scope

- Compact shared header with a plain LAB home action; 72px desktop and 64px
  mobile composition, 44px narrow controls. Existing account actions remain.
- Retained default 80px navigation rail, searchable modal drawer, optional
  300px desktop pin, focus management and horizontal navigation below 1100px.
- Shared workspace variables now alias the established `--lab-*` token API.
  Muted text is #607087: contrast 5.04 on white, 4.82 on canvas and 4.69 on
  muted surfaces. No token name or semantic role changed.
- Student finder and next-use context form one working desk. Priorities are a
  compact divided strip; real resources, classes and account roles use registers.
  Staff queues remain the main operational task. Empty states align to their
  sections and retain real recovery/navigation actions.
- Removed redundant home rules from final-workspace.css; workspace-home.css
  owns home composition. Shared CSS imports precede App/component imports.
  Unused lab-app-shell/lab-landing imports removed; their source files retained.
- Updated paired DESIGN.md and .impeccable/design.json for this shared scope.

No contributor-owned file, backend, API, schema, authorization, status/category,
dependency, data selector or numbered Batch changed. Existing exports, handlers,
route parameters, draft state and test hooks remain.

## Verification

- Frontend `npm run test:required`: 2214 VI/EN keys, 8 tests, lint zero errors
  with 9 existing warnings, typecheck and production build passed after final fixes.
- Existing read-only navigation suite: 129 passes, zero browser exceptions.
  Covered four roles, pin persistence, drawer focus/keyboard, history, locales,
  dependency failure and no-overflow layouts at 375/768/1024/1440.
- Existing bilingual suite: 365 passes, zero browser exceptions. Covered
  translation/accessibility labels, draft continuity and recovery using local API.
- Additional local read-only confirmation: 91 passes, zero browser exceptions.
  Four roles in VI/EN at 1440/1280/768/390/375; compact header and overflow,
  finder draft/category and exact-resource calendar forwarding verified.
- Independent finish review: ship within coordinator scope after correcting
  narrow touch widths and replacing one partial admin EN mobile capture.
- Impeccable detector on changed UI targets: no findings. Git diff whitespace
  check passed; sidecar JSON parsed.

Local evidence, not committed: `.impeccable/review/coordinator/` contains
navigation-confirm/results.json, bilingual/bilingual-results.json, final/results.json,
16 final full-page VI/EN desktop/mobile captures, and the read-only confirmation
script. UI localhost5173/API localhost8000 use the existing seeded local demo.
An initial navigation attempt used 127.0.0.1 while runtime used localhost; its
failure interception missed the API. Corrected test configuration passed without
changing tests or application behavior. The confirmation waits for the asynchronously
loaded exact-resource option before checking the selected calendar resource.

## Limits and next boundary

Populated classes, next bookings and urgent home states were reviewed from source;
the shared local demo remains largely empty. No booking/group mutation or database
reset was run for this work. Fresh isolated CI remains the integration gate.

The four contributor assignments are not integrated here. See
../../INTEGRATION_REVIEW.md for pending PR review and required corrections.
This is the coordinator portion of wave 1, not the whole-system redesign finish.
