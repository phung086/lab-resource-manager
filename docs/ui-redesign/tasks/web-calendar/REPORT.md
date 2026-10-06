# web-calendar redesign report

Date: 2026-10-06  
Task: `web-calendar`  
Scope class: `lrm-calendar-redesign`  
Branch: `codex/lrm-ui-web-calendar`

## Baseline

- Repository: `phung086/lab-resource-manager`
- Verified default branch: `main`
- BASE_SHA before edits: `bd83a97c4f9e30376134064c013cc133bf5e02a7`
- Baseline tree: `fb3958440c08b781253a09ae678512fa81c321d5`
- The branch was created directly from that verified main SHA.
- Historical revisions `a5472d4` and `43b1832` were not used as the implementation baseline.
- This web environment exposes GitHub repository APIs rather than a local checkout, so a literal local `git status --short` was not available. GitHub branch metadata showed the target branch did not exist before creation.

## Required reading completed

Read from the verified baseline before implementation:

1. `AGENTS.md`
2. `.agent/PROJECT_RULES.md`
3. `.agent/INSTRUCTOR_BASELINE.md`
4. `.agent/DEVELOPMENT_WORKFLOW.md`
5. `docs/srs.md`
6. `docs/convention.md`
7. `docs/PROJECT_STRUCTURE.md`
8. `docs/CURRENT_STATE.md`
9. `docs/DECISIONS.md`
10. `docs/FRONTEND_GUIDELINE.md`
11. relevant verified calendar report: `docs/BATCH4_BOOKING_CALENDAR_REPORT.md`
12. `docs/ui-redesign/TEAM_PLAN.md`
13. `docs/ui-redesign/UI_CONTRACT.md`
14. `docs/ui-redesign/REDESIGN_SPEC.md`
15. `docs/ui-redesign/PROGRESS.md`
16. `docs/ui-redesign/assignments.json`
17. `docs/ui-redesign/tasks/web-calendar/BRIEF.md`
18. `.agents/skills/lrm-team-design/SKILL.md`

No persistence work was performed, so the Prisma schema was not needed for implementation.

## Files changed

Only task allowlist files are changed:

- `frontend/src/components/SmartCalendarView.tsx`
- `frontend/src/components/calendar/CalendarToolbar.tsx`
- `frontend/src/components/calendar/CalendarEventCard.tsx`
- `frontend/src/styles/redesign/calendar.css`
- `docs/ui-redesign/tasks/web-calendar/REPORT.md`

## Implementation

### Calendar surface and scope

- Added the task root class `lrm-calendar-redesign` to the existing calendar page.
- Imported exactly one task stylesheet from the allowed `SmartCalendarView.tsx`.
- Kept existing calendar classes/test hooks and restored the existing `.calendar-active-resource-badge` hook expected by the verified calendar browser test.
- Reused existing locale key `ui.calendar_for_31b82581`; no locale catalog or manifest was changed.

### Toolbar hierarchy

- Reorganized the toolbar into a resource/action row and a time-navigation/view row.
- Resource selection stays the first workflow control and preserves `#calendar-resource-select`, value changes and callbacks.
- Kept Today, previous/next, refresh, Day/Week/Month controls and New booking callbacks unchanged.
- Grouped the legend as a quiet status strip beneath the controls.
- Narrow layouts stack controls and keep at least 44px interaction targets.

### Event presentation

- Full events now prioritize title, canonical booking status, Vietnam-time interval and resource name.
- Compact month events expose title, start time and a status/maintenance marker instead of relying on a single truncated line.
- Maintenance/calibration events are explicitly labelled with the existing maintenance/calibration locale keys and do not masquerade as booking status.
- Own-booking marker remains text/icon assisted rather than color-only.
- Long event/resource labels use bounded wrapping/ellipsis appropriate to compact/full variants.

### Day / week / month presentation

- No schedule algorithm or calendar library was changed.
- Existing WeekSchedule/DaySchedule/MonthSchedule source is untouched.
- Scoped CSS gives week and month views contained horizontal scrolling rather than page-wide overflow.
- Week slots preserve booked/mine/maintenance/offline distinctions.
- Day view is converted visually to a denser ruled schedule while retaining slot/event controls.
- Month view is converted visually to a dense grid suitable for three compact events plus the existing overflow count.

### Preserved behavior

No change was made to:

- API routes or request parameters
- availability/business rules
- RBAC or permission logic
- canonical booking/operational statuses
- slot -> booking contract `{ resourceId, startAt, endAt }`
- event click -> booking detail behavior
- empty/loading/error retry flows
- `Asia/Ho_Chi_Minh` conversion helpers
- Day/Week/Month data loading behavior
- resource deep-link selection logic
- QuickBookingModal behavior
- existing VI/EN catalog data

## Verification performed

### Repository/diff checks

GitHub compare from BASE_SHA to implementation commit `6e04bb6fa78d6ad495e39c3ed4cf113e08c3707d` reported exactly four application files before this REPORT was added:

- SmartCalendarView.tsx
- CalendarToolbar.tsx
- CalendarEventCard.tsx
- calendar.css

No file outside the task allowlist was changed.

### Scope gate

The required command is:

`node scripts/check-redesign-scope.mjs --task web-calendar --base bd83a97c4f9e30376134064c013cc133bf5e02a7`

It was **not executed** in this web session because the available GitHub connector is a repository API, not a root shell/runtime. I did not claim this command passed. The API compare above is a path-level cross-check only, not a substitute for the script.

### Frontend required checks

`npm ci` and `npm run test:required` were **not executed** because this session has no checked-out Node/npm environment. No build/typecheck/lint success is claimed from this session.

### Browser/runtime checks

No real frontend/backend browser runtime is exposed to this web session, and Windows localhost is not reachable through the GitHub connector. Therefore I did not claim visual verification at 1440/1280/768/390/375, VI/EN, focus or live interaction.

The implementation was designed against the existing verified browser hooks and the current Batch 4 E2E source, including:
- `#calendar-resource-select`
- `.calendar-active-resource-badge`
- Day/Week/Month switching
- day-slot click
- maintenance resource flow
- 390px mobile coverage in the existing suite

These are source-level compatibility checks, not fresh runtime proof.

## Label proposals

None required. All new visible semantics reuse existing VI/EN catalog keys.

## Shared change requests

None.

## Remaining risks

- Coordinator must run the exact scope gate and `frontend/npm run test:required` in a real checkout.
- Coordinator must visually verify current integrated cascade because older global/final-workspace calendar rules still exist outside this task's ownership; the task stylesheet is scoped to override presentation without editing shared CSS.
- Real browser acceptance is still required at 1440, 1280, 768, 390 and 375 px, in VI and EN, with keyboard focus and dense/long-label event fixtures.
- Dense month cells still inherit the existing product rule of rendering the first three events plus an overflow count; this task did not change event pagination/data semantics.
- The status badge component itself is shared and outside this allowlist, so its inline semantic colors remain unchanged.

## Boundary

Task `web-calendar` only. No backend, schema, dependency, global CSS, shared shell, locale manifest/catalog, other redesign task or numbered Batch was modified.
