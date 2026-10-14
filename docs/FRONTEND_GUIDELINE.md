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

- User override 10/10/2026: previous visual directions, rollout plans and
  ownership assignments are cancelled. Claude chooses the design and code plan.
  Historical visual/navigation descriptions below document earlier source;
  their palettes, layouts and implementation order are not binding. Keep the
  required business capabilities, real discovery/authentication and contracts.
- Prioritize scanning, forms, tables, clear state, and repeated workflows.
- User clarification 12/10: apply concise, visual task presentation across the
  system. Show actions, state, resource/rental price first; optional explanations
  use HelpDisclosure/details. Keep validation/errors and required safety inputs
  visible. New booking UI uses automatic confirmation and handover stages;
  pending filters/steps appear only for actual legacy records.
- Keep core workflows usable in Vietnamese.
- Use clear loading, empty, no-data, stale, unavailable, validation, and error
  states.
- Do not show fake success for login, booking, payment, notification, telemetry,
  or resource operations.
- Do not let static/demo content appear as verified runtime data.
- Booking checkout receives the current actor and displays payment actions only
  when both booking and charge belong to them and the booking is CONFIRMED.
  Admin access to a customer's record is read access, not permission to pay for
  that customer. The backend independently enforces payment ownership.
  An elapsed hosted-session deadline may display expiry; it never proves failure
  or success at the provider and cannot change settlement evidence.
  VNPAY labels do not promise QR: the server may omit `vnp_BankCode` so the
  merchant offers its supported methods. The hosted-URL guard accepts an absent
  bank code or one uppercase alphanumeric code of 3–20 characters; duplicate,
  empty or malformed values are rejected alongside unsafe origins/protocols.

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
remain unchanged. See `CURRENT_STATE.md` for the verified
boundary and examples of recovery tests.


## Role entry points

`pages/WorkspaceHome.tsx` selects a lazily loaded view from
`components/features/workspace/`. Keep customer discovery and booking,
LAB staff operations and administrative coordination distinct in information
hierarchy. Reuse shared primitives, catalogs and existing authenticated screens.
Carry validated resource/booking/filter context into the destination; action
links open confirmation forms and never perform mutations implicitly. Staff/admin
booking and incident counts cover all authorized records; their previews show one
page. Other bounded lists must continue disclosing their recent-record limits.
See ADR-026, the role workspace refinement report, and
[queue pagination](WORKSPACE_QUEUE_PAGINATION_20261003.md).


## Request deadlines and assistant context

The signed-in Support workspace uses server-owned sessions and persisted messages.
Poll sequentially every 2 seconds, cancel superseded reads, merge by message UUID/
sequence and preserve per-session drafts. Display request failures and offline
state. A staff heartbeat runs every 15 seconds while the workspace stays open;
explicit readiness writes must win over older heartbeat responses. Human handoff
shares only an explicitly chosen, owner-validated server transcript. Quick replies
insert editable text; they never auto-send or change business state.

CUSTOMER handoff uses `CustomerSupportChat` inside the existing assistant dock.
Keep the prior AI turns visible; prepare/confirm the request in that dock, display
WAITING position, then assigned staff and real messages without navigation.
Recover an open session when reopening/reloading the signed-in dock; minimize
pauses reads and retains its unsent draft. Do not run another AI question while
human support is open. Staff/admin retain the operational Support workspace.

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

## Workflow regression contracts

Design and page/component structure are Claude's decision under the current user
request. Preserve role/feature filters, deep links/history, password gates and
unsaved drafts across navigation/locale changes. A resource name is not a unique
booking identity; use IDs. Tables/queues retain authorized totals and pagination.

Resource details and private history are separate authorized reads; load history
on demand. A denied/failed history read must not become fabricated empty history.
Self-declared membership must not grant privileges, pricing waivers or verified
training. A password-set flag is not proof of password strength.

Temporary dialogs/drawers trap focus, restore it, handle Escape and leave background
content inert. Normal navigation remains interactive. Do not leave scroll locks
after changing layout. Delayed reads must not steal focus from active fields.
After failed server sign-out, clear local session consistently; do not claim confirmed
server revocation. Media illustrations/stock must not imply institutional evidence.

The signed-in resource catalogue groups ROOM separately from equipment
(EQUIPMENT/MACHINE/EXPERIMENT_KIT), while MATERIAL and unresolved categories
remain accessible in Materials & other. `catalogueGroup` is browsing context,
not a persisted category or API filter. Keep it with search/filter context through
detail, back and selection. Cards use three desktop columns, two on tablet and
one on mobile; customer cards prioritize current availability, while physical
state remains explicitly labelled in the resource dossier and management table.

ResourceSpecifications renders nested JSON/arrays as labelled facts, omitting the
technical environment marker and separate usage guide. Product UI shows persisted
configuration without repetitive demo disclaimers; retain provenance in stored
data/docs and never invent telemetry or business history. ResourcePricingSummary reads actual purpose rates
independently from resource/schedule/history. An unconfigured rate is not a failed
read or proof of free usage; the backend quote remains authoritative for booking.

## Account security and loyalty interface

Staff CUSTOMER management reuses AccessUserManagement; server enforces global
CUSTOMER-only scope. Hide role/LAB assignment controls from staff, read email
without edit, show contact changes separately, and request a reason before remove
or assisted reset. Removed account actions stay unavailable. Use the shared
PasswordChangeForm from shell, profile and assisted reset: password draft then
six-digit OTP, masked recipient, expiry and resend cooldown. Paste/autocomplete
are allowed. Field errors stay next to their field and receive focus. Never
retry credential mutations automatically. On self success store renewed token
before fetching profile; old session is revoked. Missing SMTP remains an error.

Profile renders server-derived loyalty only; show tier, spend and next-tier
progress compactly. Admin policy lives behind an explicit expandable section.
Quotes/checkout show actual stored base, discount and net; omit a breakdown for
legacy snapshots lacking those fields. Never calculate an assumed discount in
UI. Default policy is disabled. Guest booking retains accepted public price.

## UI research direction — 13/10/2026, proposal only

Current source has separate role homes and shared routing/components, so retain
React/Vite and the shell. A full redesign has not been implemented in this batch.

| View | Recommended first screen | Secondary content |
|---|---|---|
| CUSTOMER | Search, category, date/duration, price, availability and Book action | Own next booking, history, loyalty and support |
| LAB_STAFF | Handover, return and inspection queues, overdue items, due care | Incidents, available support handler state, customers |
| ADMIN | Cross-LAB exceptions, pending care, staff assignments and support activity | Accounts/policy, drill-down audit and reports |

Recommendation: a compact service catalogue for customers, an operations table
for staff, and an exception dashboard for admins. Use the same typography,
spacing, status colors and interaction primitives; preserve the existing brand.
All five categories stay discoverable; CustomerHome shortcuts currently cover
ROOM/EQUIPMENT/EXPERIMENT_KIT, so MACHINE/MATERIAL need clear access in a future
home refinement. Customer cards should show image, name/LAB, hourly fee and one
primary action; technical specs expand in detail. Details use explicit tabs or
anchors activated by click/keyboard; optional hover preview must not be the sole
way to open information. Hover navigation alone causes accidental jumps on touch
or while scanning.

Keep room availability visual and equipment in a responsive 3/2/1-column grid;
show true conflict/maintenance reasons on the selected interval. Staff care rows
need a cycle progress meter (hours/uses), near/due badge and next action; detailed
configuration belongs in an edit disclosure. Show unread care notifications as
small alerts with direct resource links. No count/history may be invented to make
a page look busy. New bookings auto-confirm; only render legacy approval when
actual PENDING_APPROVAL exists. Loading, empty, error and forbidden states need
short copy and an appropriate retry/next action.

Suggested acceptance for a later redesign: from discovery to an available priced
booking with one clear primary action per step; keyboard focus and mobile reach;
retained drafts/deep links/VI-EN; complete scoped totals; no fabricated telemetry
or widening permissions. UI research is based on source and the user's screenshots;
new account screens have their own browser QA, which does not certify a whole
system redesign. See INTEGRATION_GUIDE for contract dependencies before changes.

A 401 from an earlier request must not clear a newly installed session: apiRequest
clears only when its captured token is still the current token. Password/contact
error focus runs after the fieldset has been enabled and rendered.
