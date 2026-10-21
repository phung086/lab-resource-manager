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

Load internal maintenance jobs only for ADMIN/LAB_STAFF. CUSTOMER uses the safe
resource schedule. Header/sidebar unread badges use `/notifications/unread-count`,
independent of the50-row notification preview; refresh the count after mutations.
Until a read group belongs to the current account/role/credential-version scope,
do not mount the private workspace with previous cached props. Component keys
alone do not clear App state. Scope changes also close global private dialogs;
late reads from the prior scope cannot authorize displaying its cached data.

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

ADR-044: booking forms show minimum notice separately from session duration.
The baseline is30 minutes even without a LAB policy; respect a larger
`minAdvanceBookingMinutes`. Calendar suggestions round the earliest legal
instant up to the input minute. Final creation always rechecks server time.
Pending payment countdowns use min(paymentDueAt,startAt); the client may hide
an expired payment action but never declare provider success or cancel a record.

Paid booking flow (15/10/2026, ADR-038): PENDING_APPROVAL with paymentDueAt is
awaiting payment, not staff approval. Show the fixed server deadline/countdown,
open checkout after creation, and expose an awaiting-payment queue separate from
legacy approvals. Free bookings confirm immediately. Only server expiry/IPN can
cancel/confirm; a browser clock, redirect or return is not settlement evidence.
The local launcher defaults payments on; explicit LRM_LOCAL_PAYMENTS_ENABLED=false
disables that optional runtime capability without making priced resources free.

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

Calendar planner (user approved 17/10/2026): CUSTOMER starts with resource/time
selection; LAB_STAFF and ADMIN start with a daily resource board. Staff LAB
choices come from the scoped `/laboratories` response. Mobile renders one agenda
entry per event/resource, not repeated hourly booking cards. Weekly comparison
is for one resource and renders day summaries from `/calendar/events`, preserving
events outside the old 08–20 grid; month remains a secondary overview.

Use the stored LAB policy for service hours and duration hints. No policy means
unknown hours, not an invented window. Empty event space and interval-filtered
catalogue candidates are not a booking guarantee. Availability is checked on
the single “Book this time” action before opening the existing price/eligibility/
booking form. Do not add a separate precheck button before that action. Group
continuous free windows instead of listing every half-hour start. Load seven
days of events for the selected resource, subtract occupied intervals, and offer
the next suitable dates inside that loaded range. Switching dates within that
range reuses the projection; never offer unqueried dates as verified free.
Selection-list checks expire after one minute and are invalidated by changed resource/time.
Desktop day events keep proportional interval bars and place readable time/title/
status labels on separate rows; short reservations must not clip time/status.
Full titles remain available through focus/click details. Mobile retains its agenda.
The selection tray can copy a common time to unsaved drafts and check them
sequentially, stopping on rate limit/transport/auth failures. It never creates
bookings in bulk or retries mutations. Per-resource pending/uncertain fences and
independent results are retained. Render limits page only the loaded catalogue;
the resource API cap of 250 is disclosed rather than presented as full totals.

Header and calendar search share ResourceSearchField with one outer focus ring;
the inner input has no border/outline in focus. Calendar hides the header's
global search because its local search already filters rooms/equipment on that
screen. Clearing that local input clears its committed search filter. Use plain
task wording such as “Find an open time” and “Book this time”, not projection,
candidate or precheck terminology in customer-facing copy.

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

ADR-040 (15/10/2026): show role-specific suggestions for staff/admin: today's
schedule, material stock, 7-day report and CUSTOMER search. The same Work bridge
supports every role; operator navigation returns to existing stock/users/operations/
calendar pages. Bridge quick-read answers return immediately without polling Work.
If Work disconnects, preserve internal authenticated local lookups and clearly
describe the limit for open-ended replies. Operator support opens the staff/admin
inbox; only customers create human-help requests or receive booking/support drafts.
Status polling may retry bounded transient GET failures; never retry question
creation or authorization/validation errors automatically.

15/10/2026 clarification (ADR-039): the chatbot has a `LocaleScope` over the shared
catalogs. Its VI/EN does not activate/store the global locale or change html.lang;
later application changes replace the local preference. Preserve drafts/history
and cancel active work on an effective locale change. Optimistically display the
outgoing turn, clear only the sent draft immediately, retain failure/cancellation
with explicit retry and never overwrite a newer draft when the reply arrives.
Use neutral waiting text; omit About/provider/response metadata from the dock.
Keep actual document sources and real errors. Completed answers expose navigation
to existing LAB resource/booking screens without business mutations.

`AssistantLauncher` opens the authenticated assistant at the lower-right corner.
The desktop chat is nonmodal: keep page scrolling and background controls usable.
Explicit minimize/Escape returns focus to the launcher; minimize if a background
control receives focus behind the dock or another dialog opens. Do not add a page
overlay or a global focus trap. The context chooser and actual document citations
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

Response provenance stays explicit in the API. Ordinary conversations do not
claim checked LAB sources or expose provider metadata in the dock. Connection
failures remain visible; API keys stay on the backend.

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

Auth credentials live in sessionStorage through authStorage, never persistent
localStorage. SessionGuard is mounted across public/workspace routes; it reads
server deadlines, warns before expiry, and checks on visibility return. Only
trusted pointer/key actions (at most once/minute) or explicit Continue send
activity; background polling does not. Absolute expiry cannot be extended.
Sign-out and credential changes notify the shared guard; stale401 guards remain.
The profile shows actual session timestamps/deadlines and logout-all. A tab's
storage is still JavaScript-accessible and is not an XSS mitigation by itself.

QuickBookingModal first submits a preflight/read request and then a review.
Contact/time/fulfillment/quote changes invalidate review; after60s it rechecks.
Only the separate final confirmation creates a booking. Do not describe preflight
as a reservation. Guest uncertain-response fencing prevents automatic resubmits;
keep draft and direct the customer to history/staff for verification.

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

Profile uses a shared identity strip, four section controls and contextual
membership/help alongside the main task; mobile puts the main task first.
Contact editing excludes organization and self-declared classification and must
omit both from PATCH, preserving stored compatibility data. Hidden sections keep
drafts; validation opens a collapsed address before focusing its invalid field.
Activity bars use the authoritative all-time booking summary, with explicit
counts and shares in a semantic table. Missing or inconsistent summaries are
unavailable, not an empty history. Do not invent monthly trends or access scores.
Password progress reflects the existing challenge/success state only.

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

## Assistant launcher and support workspace

The shared RobotMascot is a code-native SVG, reused in the bottom-right launcher
and conversation header. Keep the launcher outside Header, clear of the resource
selection tray; the nonmodal panel sits above it, fits dynamic viewport height,
restores keyboard focus on minimize and retains drafts. Respect reduced motion.
Support CUSTOMER uses New request/My sessions beside the conversation. Preserve
server sessions, drafts, owner/lab scope and current mutation confirmation flows;
STAFF/ADMIN retain their operational queue/presence/requeue responsibilities.

### Header và kết nối trợ lý (17/10/2026)

Tìm nhanh trên header chuyển query qua route tài nguyên và guard điều hướng
hiện có. Tìm tự do mở nhóm Tất cả; không để nhóm mặc định che kết quả tìm kiếm.
Lối tắt theo role, thu gọn trên màn nhỏ; giữ chức năng trong menu đầy đủ.
Nhãn mascot chỉ hiện hover/focus-visible, accessible name luôn còn.

Kiểm tra trạng thái trợ lý khi mở widget và khi user yêu cầu, cache resources;
không dùng polling để thay cho việc khôi phục consumer Work Cloud. Phân biệt
tra cứu nội bộ với câu hỏi mở, không gắn lỗi provider lên toàn bộ khả năng LAB.
Kiểm tra trạng thái không đăng ký/gia hạn receiver. Không tự retry câu hỏi ghi
hoặc đổi provider sau lỗi; giữ câu hỏi/draft và phản ánh BRIDGE_UNAVAILABLE.
