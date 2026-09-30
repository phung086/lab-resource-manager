# Role workspace refinement — 2026-09-30

User-authorized continuation on `codex/lab-workspace-ui-draft`, draft PR #22.
This pass replaces the generic signed-in overview with four task-focused entry
points while keeping the existing bilingual, read-only assistant and business
workflow contracts. No runtime dependencies, schema changes or hardware work.

## Entry points and next actions

| Role | First task | Context and direct destinations |
| --- | --- | --- |
| STUDENT | Find a room, equipment or experiment kit | Search/category → catalogue; resource → its calendar; next/in-use booking → exact booking; personal requests and course groups |
| LECTURER | Prepare assigned practical groups | Group → members, submitted learning goals and feedback; own confirmed/pending requests; teaching calendar |
| LAB_STAFF | Work through the LAB queue | Review, handover, return and inspection stages; overdue returns first; exact booking action form; scoped maintenance and materials |
| ADMIN | Coordinate resources and access | System resource/active-account totals; role → filtered directory; unresolved classification → filtered catalogue; staff assignments, groups and incidents |

A shared shell, typography, spacing, components and VI/EN keys connect these
views. Each role view is loaded on demand. Course summaries use one cancellable
read on home entry; LAB_STAFF does not request the teaching endpoint. Group counts
mean actual members and submitted activities, not inferred pending reviews.

Destination parameters are validated against existing categories, filters and
roles. Catalogue/category, calendar resource, course group and directory role
survive reload. A booking action link only opens the existing confirmation form
after checking the authenticated list, current status and presentation role.
Submitting still uses the existing API permission, LAB scope, evidence and state
checks. Dismissing a form does not write business data. Choosing a booking filter
clears a previously linked single-booking view. Form input and staff stage selection
survive a language change.

The existing booking list is capped at 100 recent records and incidents at 50 by
default. Work-count labels explicitly disclose this scope; they are not global
queue totals. The administrative resource total comes from the dashboard summary,
not the capped resource catalogue. Admin role counts include active and inactive
accounts, while the banner separately labels active accounts. Historical pagination
and uncapped queue aggregation remain a separate API task for a larger production
workload. No new aggregate query or per-class fan-out is introduced here. Directory
assignment requests now have at most four in flight.

## Design research and adopted decisions

- [Airbnb reservations redesign](https://www.airbnb.com/resources/hosting-homes/a/reservations-redesigned-765): put actionable reservations and their context together; adapt to booking details and LAB action stages.
- [GetYourGuide supplier navigation](https://supply.getyourguide.support/hc/en-us/articles/14198310316701-Supplier-Portal-Navigation-menu): organise navigation by operational tasks.
- [GetYourGuide bookings](https://supply.getyourguide.support/hc/en-us/articles/19011387701661-Navigating-the-Bookings-Section-in-the-Supplier-Portal): prioritise requests needing attention, with direct booking records and clear filters.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): use hierarchy, restraint, contrast, visible focus, responsive layout and reduced motion. Automated design searches still suggested marketing layouts after one narrower retry; those layouts and proposed font/palette changes were rejected. Existing IBM Plex, Lucide, React/Vite and shared project tokens stay authoritative. No library is added to the runtime.

Core-data failure suppresses work counts and offers retry. Course failure stays
inside its section and leaves the core workspace usable. Empty states offer a
relevant next action; no fake photos, operational metrics or inferred availability.
Resource condition is explicitly separate from time-slot availability. All new UI
copy uses the existing integrity-checked catalogs; original names, learning goals,
booking purposes, evidence and notes remain unchanged.

## Verification

Local required frontend checks pass: catalog parity/integrity/source audit,
locale recovery, lint (14 existing warnings, zero errors), TypeScript and production
build. Catalogs now have 2,107 matching VI/EN keys. The main JS entry is approximately
354.14 kB / 105.17 kB gzip, compared with 350.55 / 104.35 kB before this pass; role
views load separately. No runtime package was added.

Local Chromium visual fixture QA covers all four roles, VI/EN and 375, 768, 1024,
1440 px, with no horizontal overflow or browser exceptions. Fixtures are confined
to the temporary test harness and are not application fallbacks or database evidence.

`npm run test:ui:roles` is added to the existing isolated PostgreSQL CI job. It
creates real bookings through authenticated APIs, moves them through approval,
handover and return, and submits a real teaching activity. It verifies role-specific
entry points, exact-record navigation, validated filters, reload, locale draft
continuity, permission-negative action links, no implicit writes and class-error
recovery. Existing navigation and bilingual suites remain mandatory. CI results
for this implementation commit are recorded after the run completes.

This remains a draft development update, not a main merge or production deployment.
External SMTP/model/payment services and hardware are outside this UI verification.
