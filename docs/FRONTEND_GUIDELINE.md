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

### Assistant dock — local continuation, 2026-10-05

`AssistantLauncher` opens the authenticated assistant at the lower-right corner.
The desktop chat is nonmodal: keep page scrolling and background controls usable.
Explicit minimize/Escape returns focus to the launcher; minimize if a background
control receives focus behind the dock or another dialog opens. Do not add a page
overlay or a global focus trap. The context chooser and provider/source details
use disclosures; show three concise initial suggestions.

Mount the lazy assistant once per signed-in workspace session. Minimize preserves
the question draft, selected context and at most ten turns in memory, and cancels
active chat work. Reload/logout clears history. Locale switching preserves drafts
and localized tool summaries, while aborting a request in progress. Scroll only
the conversation, never the underlying workspace.

Pass the current workspace and server-issued conversation ID on each chat; never
send browser transcripts, roles or actor IDs. Server context has its own idle
expiry and session binding. Reload starts a fresh conversation; abandoned server
context expires separately. The text New conversation control deletes current
server context and clears selected context while preserving the unsent draft and
restoring composer focus. A 409 expired/foreign conversation retains the draft
and requires explicit reset before further chat. Do not silently retry it.

General model conversation and clarification use response information rather
than claiming checked LAB sources. About reports configured/local mode without
claiming the external connection has passed. API keys stay on the backend.

Allowlisted assistant actions prepare the existing `QuickBookingModal`, navigate
to bookings, or open the context chooser. They never submit a booking or payment.
Enter both explicit Vietnam-time window fields or neither. Relative dates/clock
times the local planner cannot resolve request explicit fields; do not substitute
a different day. Payment guidance follows backend feature/provider readiness and
links to bookings rather than an invented checkout URL.

## Shared project shell — local continuation, 2026-10-04–05

Landing and registration reuse `components/PublicShell.tsx`; authenticated pages
keep `components/AppLayout.tsx`. Both use `base/ProjectBrand.tsx` and
`features/ProjectFooter.tsx`, with scoped rules in `styles/project-shell.css`.
Keep the shared LAB identity, existing IBM Plex typography, white/navy palette,
visible page/role context and restrained text hierarchy. The footer stays at the
end of page content and offers real next destinations and native help disclosures.
`PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` remain the incumbent design
authority; this extension does not regenerate their tokens or repair older drift.

Read the current canonical role for presentation. ADMIN/LAB_STAFF footer paths
lead to bookings/handover and materials; LECTURER/STUDENT paths lead to their
bookings and teaching groups. Use existing navigation callbacks and backend
permissions. Shell links must preserve the required-password gate and open the
existing destination or confirmation form without submitting business actions.
All shell copy uses matching VI/EN catalog IDs and the shared LanguageToggle;
switching language must retain mounted registration and booking drafts.

After permitted workspace shell navigation, scroll to the content start and focus
`workspace-main`, including when the selected tab is already active. Delayed
public-section alignment is consumed once and cancelled when the user interacts,
so a completed catalog read cannot take focus from an active field. Before closing
an account popover action for assistant/refresh, focus the persistent account
trigger so keyboard focus can return after the lazy modal closes.

This continuation prioritizes desktop web. Narrow viewport checks cover reachability,
focus and horizontal overflow; they do not establish deep mobile optimization.
See [local shell report](../artifacts/local-project-shell-20261004/REPORT.md) and
[design handoff](../artifacts/local-project-shell-20261004/DESIGN_HANDOFF.md) for
the tested boundary, evidence and remaining work. No new numbered Batch is opened.

## Approved desktop navigation and task hierarchy — 2026-10-05

Load `styles/final-workspace.css` after the existing shell styles. The approved
desktop panel is 240px wide from 1100px and contains text destinations using the
incumbent role/feature filters. It is ordinary navigation, not a modal: desktop
content stays interactive and the document remains scrollable. Below that width,
retain the overlay's focus trap, Escape dismissal and focus restoration. Changing
the breakpoint closes the overlay and clears the search; do not carry a mobile
scroll lock into desktop mode.

Keep the shared branded header and footer. Resource/calendar selection and period
controls have separate rows. Booking queues lead with resource/purpose and show
only the operational context needed to choose the next action. Preserve server
totals, status filters, pagination, deep links and evidence forms. The resource
name is not a unique booking identity; pagination tests use the booking ID.

The landing hero is one labelled generated LAB illustration with explicit image
dimensions and prompt provenance. It does not establish facts about institutional
rooms or replace actual resource media. The catalogue, check-schedule section and
required authentication/guest-booking paths remain real backend flows.

Treat resource information and private history as separate reads. Open authorized
resource details without requesting history. Fetch history only when its section
is selected; a denied history read shows localized feedback in that section while
resource details and the calendar action remain available. Never bypass backend
LAB-scope checks or turn a denied/failed read into a fabricated empty history.
On failed server sign-out, clear the local React workspace consistently with the
API client's local credential cleanup; do not report server revocation as confirmed.

See [the local build report](../artifacts/local-final-ui-20261005/REPORT.md) for
verification, screenshots, documentation and the remaining broader page scope.


## Catalogue and profile disclosure — 2026-10-05

Catalogue search and filters start collapsed. Keep filter values when closing the
panel, show an active count and retain an accessible reset. Resource cards lead
with name, LAB, current availability and attributed media already provided by the
API. Names and the detail action both open the dossier. Technical specifications,
usage guidance, schedule and private activity belong in dossier sections.

Profile uses personal information, security, access requirements and activity
sections. Keep forms mounted when switching sections or languages to preserve
unsaved input. Use human labels rather than internal role/classification codes.
Self-declared membership must never imply verified authority, discounted prices
or a waiver of safety training. A password-set flag is not proof of password
strength. Shared header/footer and server permissions remain authoritative.

Surface styles live in `styles/catalog-profile.css`, loaded after the shared
workspace styles. Figma adaptations and scoped verification are recorded in
`artifacts/catalog-profile-refinement-20261005/`.


### Navigation update — 2026-10-06

The user requested retractable navigation again. This supersedes the always-visible desktop sidebar decision: default to an 80px shortcut rail; Menu opens a searchable drawer. Desktop users may pin the full 300px menu; closing it removes the pin. Pin preference is stored locally. Below 1100px, use a horizontal shortcut bar and a modal drawer; never reserve a full sidebar on narrow screens. Keep existing role and feature filters. Temporary drawers trap focus, support Escape/backdrop dismissal, and make background content inert. Pinned navigation leaves the content interactive.

Visual direction: quiet blue-gray surfaces, clear navy active marker, consistent icons and explicit Menu control. References: https://linear.app/now/behind-the-latest-design-refresh and https://atlassian.design/components/navigation-system/layout .
