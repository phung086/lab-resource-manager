# Frontend Guideline

## Stack

- React
- Vite
- JavaScript/JSX and existing TypeScript component files
- CSS currently centralized in `frontend/src/styles.css`

Do not migrate to another frontend framework without explicit approval.

## Logical Structure

Converge gradually toward:

```text
src/
  assets/
  pages/
  components/
    base/
    features/
  routes/
  layouts/
  lib/
  hooks/
  store/
  types/
  styles/
  providers/
  schemas/
  services/
  utils/
  constants/
```

Current components may remain in `src/components` until touched. When editing a
module, improve local placement only when it reduces risk and does not cause a
large unrelated diff.

## UI Principles

- Build operational screens, not marketing pages.
- Prioritize scanning, forms, tables, clear state, and repeated workflows.
- Keep core workflows usable in Vietnamese.
- Use clear loading, empty, no-data, stale, unavailable, validation, and error
  states.
- Do not show fake success for login, booking, payment, notification, telemetry,
  or resource operations.
- Do not let static/demo content appear as verified runtime data.

## Authorization

- Frontend visibility is UX only.
- Backend remains authority for every sensitive action.
- Use canonical uppercase roles.
- Handle `401` by clearing local session state and requiring re-authentication.

## Data Access

- Use the live API for core workflows.
- Reuse the loaded shared records when leaving home. Refresh on session change,
  home entry or explicit user/mutation refresh; cancel superseded bulk reads and
  ignore their results. Do not issue another bulk load for every navigation click.
- Avoid importing `mockData.js` into production-core flows.
- Preserve optional/research simulations behind explicit flags or isolated
  surfaces.
- Booking and incident operation queues use server pagination through
  `hooks/useQueuePage.ts`, with 20 rows per page; the staff home queue uses five.
  Reset the page when actor/filter changes, cancel superseded requests, hide stale
  actionable rows during loading/failure, and refresh after confirmed mutations.
  Clamp an emptied last page after refresh. Read totals from the server summary,
  never from the current page length. Use the shared accessible VI/EN
  `QueuePagination` control and preserve keyboard focus after changing pages.

## Forms And Tables

- Keep labels connected to inputs.
- Preserve user input when API mutation fails.
- Focus error summary or first invalid field on submit failure.
- Avoid success toasts before the backend confirms persistence.
- Tables should have captions or equivalent accessible names.

## Accessibility

- Support keyboard navigation.
- Keep visible focus states.
- Do not communicate status by color alone.
- Icon-only controls need accessible names and tooltips.
- Modals should manage focus on open and restore focus on close.

## Design References

Materio and Untitled UI references can inform component organization, spacing,
dashboard patterns, and accessibility. Do not copy framework architecture
blindly and do not migrate React/Vite to Next.js because a reference uses it.

## Verification

Use at least:

```text
cd frontend
npm run build
```

When touching auth or resource workflows, also consider:

```text
npm run test:e2e:auth
npm run test:e2e:resources
```


## Shared locale contract

Use `useLocale().t(key, params)` with canonical IDs in `src/locales/catalog`.
Add matching VI/EN entries and run `npm run i18n:sync`; CI runs `test:i18n`.
Do not resolve messages at module initialization or add inline bilingual pairs.
Keep parameterized notices as `LocaleMessage` descriptors until render. Preserve
form state during locale changes and original user/resource content. Use the shared
`components/base/LanguageToggle.tsx` in headers and modal focus traps so language
changes remain reachable while a form is open. Calendar
labels and assistant tool summaries carry keys; business codes and Vietnam time
remain unchanged. See `BILINGUAL_ASSISTANT_FOUNDATION_20260930.md` for the verified
boundary and examples of recovery tests.


## Role entry points

`pages/WorkspaceHome.tsx` selects a lazily loaded view from
`components/features/workspace/`. Keep student discovery, lecturer teaching,
LAB staff operations and administrative coordination distinct in information
hierarchy. Reuse shared primitives, catalogs and existing authenticated screens.
Carry validated resource/group/booking/filter context into the destination; action
links open confirmation forms and never perform mutations implicitly. Staff/admin
booking and incident counts cover all authorized records; their previews show one
page. Other bounded lists must continue disclosing their recent-record limits.
See ADR-026, the role workspace refinement report, and
[queue pagination](WORKSPACE_QUEUE_PAGINATION_20261003.md).


## Request deadlines and assistant context

Use the shared `apiRequest` cancellation and deadline boundary: normal requests
wait at most 30 seconds, chat 65 seconds, including response-body reads. Preserve
caller cancellation and catalog error IDs. Do not automatically retry mutations
after a timeout; the backend may already have committed. Leave assistant duration
blank until the user explicitly chooses minutes, so VI/EN question duration is
not silently replaced by a UI default. Use the canonical Vietnam-time conversion.
Render original document titles, versions and excerpts as text; never expose raw
transport JSON or render source content as HTML. Hardware-off workspace reads
request `/dashboard?includeTelemetry=false` without adding a second data loader.
