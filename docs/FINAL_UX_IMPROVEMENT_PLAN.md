# UX Audit Summary

Date: 2026-09-28. Scope: authorized frontend experience refinement after release
candidate `78eb7f4`; not project closure or a new business-feature batch.
Plan written before application edits. See SKILL_REVIEW_SUMMARY.md for standards.

## Strengths

- Light academic identity, blue primary actions, clear Vietnamese copy, local
  typography and reusable status/spacing tokens already form a coherent system.
- Landing states the resource lifecycle and labels its LAB diagram as illustrative.
- Public catalog places operational, approval and training information near actions.
- Student/lecturer workspace has actionable queues, resource search and own bookings.
- Staff operations separate approval, handover, return, completion and history.
- Monitoring separates source health from physical status and acknowledges no data.
- Auth has labels/error focus; shared modals already trap/restore focus; tables and
  operational cards have responsive treatments. Preserve these investments.
- Payment settlement remains backend-authoritative; audit evidence is persisted.

## Review coverage and evidence

Source review: App/workspace routing, public landing/catalog, guest wizard, login,
shared layout/modal/sidebar, resource detail, profile, workspace priority queues,
booking operations, monitoring, admin users, payment ledger, media and stylesheet
layers. Existing Batch 2/3/4/5/7/8 and final release evidence inform boundaries.
Initial live Chromium inspection uses the isolated release demo at localhost:18157.
Baseline screenshots: ignored `logs/ux-review/before-*.png`. Five demo resources
have no media. Real photos/video quality cannot be judged from those fixtures.

| Journey | Assessment and implementation focus |
| --- | --- |
| External | Clear discovery CTA; fix detail loading/races, training expectations, time display, wizard focus and navigation, failed media |
| Student / Lecturer | Login → queues → discovery → eligibility → calendar → booking/approval → optional payment → return is represented; preserve established workflows and role rules |
| Staff | Approval-first queues, condition evidence, incidents, maintenance, telemetry and history are already task-oriented; verify rendered screens without changing business operations |
| Admin | Users/assignments need accessible control names; payment review remains optional; dedicated system-audit frontend is absent and deferred |

## Problems Found

### UX-01 — Detail responses can replace the user's current selection

Severity: HIGH

Problem: `openDetails` applies both responses unconditionally, even after another
resource is opened or detail is closed. Failed detail reads silently use list data.

User impact: Wrong-resource context or reopened panels; incomplete prerequisites
can appear authoritative while booking controls remain available.

Recommended improvement: Guard requests by selection generation; cancel their UI
effect on close/unmount. Show detail loading/error/retry; expose booking controls
only after detail loads. Move focus to detail heading and restore the opener.

Affected files: `frontend/src/components/PublicResourceCatalog.tsx`.

### UX-02 — Guest navigation permits invalid transitions and stale context

Severity: HIGH

Problem: Step 3 runs both validations without checking the first result; only the
current step displays its error. Resource switches retain wizard/OTP state. Email
edits retain an OTP UI state tied to the earlier address. Navigation stays enabled
during submission; quote failure appears as zero fee in final review.

User impact: Hidden errors, misdirected OTP attempts, uncertain fee, ambiguous
progress during submission. Backend still rejects invalid mutations.

Recommended improvement: Sequentially validate requested transitions, focus step
headings/errors, reset wizard on resource identity change, clear OTP UI on email
change, freeze navigation during requests and distinguish unavailable quote from free.

Affected files: `frontend/src/components/GuestQuickBookingPanel.tsx`, public catalog,
`frontend/src/styles/guest-booking.css`.

### UX-03 — Training guidance contradicts mandatory prerequisites

Severity: HIGH

Problem: Guest copy promises guidance at handover despite mandatory certification
being required before booking.

User impact: Customers supply identity/OTP expecting to finish an ineligible request.

Recommended improvement: State that all required certificates must be active before
booking; direct users without them to LAB staff. Keep server eligibility authority.

Affected files: `frontend/src/components/GuestQuickBookingPanel.tsx`.

### UX-04 — Public schedule uses browser time and misleading maintenance rows

Severity: HIGH

Problem: `Intl.DateTimeFormat` omits the canonical timezone; all maintenance rows,
including cancelled/completed, appear under busy times. Truncated rows are not disclosed.

User impact: Different browsers can display different booking hours or false blocks.

Recommended improvement: Reuse Vietnam date formatter, label UTC+07:00, show only
blocking maintenance, disclose the limited preview and explain that absence of busy
rows is not a guarantee of eligibility or availability.

Affected files: `frontend/src/components/PublicResourceCatalog.tsx`.

### UX-05 — Semantic classes and media attribution are escaped literals

Severity: MEDIUM

Problem: Detail status/access classes, license caption and list keys contain escaped
template interpolation. State styles and source attribution do not render as intended.

User impact: Reduced status hierarchy, incorrect license text, duplicate-key warnings.

Recommended improvement: Restore expressions; retain text/icon signals beside color.

Affected files: `frontend/src/components/PublicResourceCatalog.tsx`.

### UX-06 — Media failures lack recovery presentation

Severity: MEDIUM

Problem: Broken image/video URLs show native failures; detail images have no reserved
ratio or fallback alternative when alt text is absent.

User impact: Layout instability and weak resource comprehension during demos/offline use.

Recommended improvement: Small reusable public media renderer with truthful failure
state; reserved frame, contain detail imagery, preserve captions/credits/source links,
native video controls, no autoplay, lazy images and metadata-only video preload.

Affected files: public catalog, new `frontend/src/components/ResourceMediaPreview.tsx`,
`frontend/src/styles/public-catalog.css`.

### UX-07 — Administrator row controls lack contextual accessible names

Severity: HIGH

Problem: User role/lab selects are unnamed; activation and assignment actions do not
identify their target in their accessible names; table has no accessible name.

User impact: Screen-reader users cannot reliably distinguish sensitive per-user actions.

Recommended improvement: Add table caption and contextual labels without altering RBAC.

Affected files: `frontend/src/components/AccessUserManagement.tsx`.

### UX-08 — Wizard density and completed-step contrast

Severity: MEDIUM

Problem: Three long horizontal labels compete within the narrow detail sidebar;
completed green text on pale blue has weak contrast; unbroken contact text can overflow.

User impact: Progress is difficult to scan on mobile and desktop sidebar widths.

Recommended improvement: Compact three-column progress with wrapping labels and 44px
minimum buttons, semantic completed colors, wrapped action rows and long values.

Affected files: `frontend/src/styles/guest-booking.css`.

### UX-09 — Dedicated system audit screen missing

Severity: MEDIUM

Problem: No core frontend consumes the verified append-only audit endpoint.

User impact: Admin defense demonstration needs API evidence for general audit events.

Recommended improvement: Separately scope a production audit viewer; do not activate
the research audit sample. Deferred here because it adds an application surface.

Affected files: future workspace routes/audit feature; existing research AuditLogsView
is not a substitute.

### UX-10 — System-wide CSS and copy debt

Severity: LOW

Problem: Legacy styles, light overrides and feature tokens coexist; some navigation
labels use inconsistent casing; landing contains technical explanatory copy.

User impact: Maintenance burden and occasional excess detail for first-time visitors.

Recommended improvement: Preserve identity in this pass; future consolidation requires
broader visual regression coverage. Do not rewrite the stylesheet architecture now.

### UX-11 — Workspace certification summary needs a scoped follow-up

Severity: MEDIUM

Problem: Rendered student overview shows “Hợp lệ” beside a no-certifications notice.
Source also summarizes a positive certificate count as “Đủ điều kiện an toàn”,
although eligibility belongs to a specific resource and its required courses.

User impact: An overview can suggest broader access than a resource actually allows.

Recommended improvement: Audit the live certification projection and route to training,
then label certificate counts/status without claiming universal eligibility. Discovered
during rendered review; deferred rather than changing the workspace data mapping
without dedicated certification fixtures. Backend eligibility remains authoritative.

Affected files: `frontend/src/pages/WorkspaceHome.tsx` and its training data projection.

## Implementation and verification boundary

Implement UX-01 through UX-08 at the narrowest component level. No new backend/API,
schema, dependency, payment mechanism or business feature. Keep canonical roles,
statuses, existing workspace workflows and optional feature flags.

Run lint, typecheck, build and Phase G tests. Browser checks should cover desktop,
tablet, mobile, keyboard focus, request races, failed requests, media failure, wizard
validation and admin control names. Use live isolated demo reads/auth where possible;
label deliberately intercepted failures as fault-injection tests, never business
success evidence. Do not send real email or mutate release demo records for visual QA.
Full WCAG certification, real SMTP, merchant settlement and hardware remain outside
this phase. Record exact results and remaining limits in the final report.
