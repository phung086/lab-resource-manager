# Frontend extension — temporary design review

Date: 2026-09-22. Disposition: **SHIP for human visual review**. Human visual approval remains pending. This is a temporary implementation record, not a replacement for the accepted frontend baseline or canonical project documentation.

## Overview

The extension preserves the existing light operational interface: pale neutral canvas, white surfaces, blue actions, restrained borders and familiar status badges. It follows the booking-centered purpose in `PRODUCT.md` and the incumbent system in `frontend/src/styles/light-redesign.css`; it does not establish a new visual identity.

`WorkspaceHome.tsx` adds a role-aware entry point with resource search, four booking-state counts, upcoming bookings, persisted notification summaries and work shortcuts. Students and lecturers see their own booking context; staff and administrators receive operational wording and destinations. Loading, failed loading and empty data remain distinct states. Counts summarize the records supplied to the page; they are not a new global analytics contract.

`AuthIdentity.tsx` consolidates login and registration identity content with a compact, inline SVG laboratory diagram and a search → booking → handover sequence. Registration retains the explanation that new accounts are students. Password visibility controls accompany the existing forms.

Resource discovery adds result counts, name/code sorting, current-availability filtering, location and approval context, and direct calendar actions. Copy distinguishes current availability from future scheduling. Notifications gain all/unread filters and a booking destination while preserving API-backed read operations. The shell adds Home, a skip link, a footer and a compact mobile Menu that closes after navigation.

## Colors and typography

Reused tokens remain authoritative in the incumbent stylesheet:

- White surfaces and the pale canvas (`--surface`, `--canvas`), neutral borders (`--line`, `--line-strong`) and existing primary/secondary text roles.
- Blue interaction tokens (`--accent`, `--accent-hover`, `--accent-border`, `--blue-50`) and existing semantic status colors.
- Plus Jakarta Sans for interface text and IBM Plex Mono for technical contexts, with the existing fallback stacks. No font or palette replacement.
- Existing 8px/12px component radii, soft elevation, visible focus treatments and motion vocabulary.

The extension declares `--space-section: 24px` for the Home column gap and `--control-height: 44px` for discovery actions. It also declares `--space-control: 12px`, which currently has no consumer; it is not evidence of an adopted spacing scale. No additional color, font, shadow or motion token family was introduced.

## Layout and components

Home uses a four-column status strip and a 1.7:1 content split. Below 1100px the content stacks; below 540px the status strip becomes two columns and search/shortcuts stack. Below 900px the sidebar becomes a compact top bar with an explicit Menu control. Navigation uses two columns when expanded, then one column below 540px. Mobile auth retains a short identity heading and suppresses the supporting illustration and journey; form inputs use 16px text.

New content uses incumbent buttons, panels, badges, borders and focus states. Home panels remove their shadow so hierarchy comes from spacing and headings. The illustration uses inline vector geometry and existing blue tokens; there are no new raster assets, dependencies or frameworks.

## Evidence and inherited drift

- The independent visual reviewer reported inspecting 21 screenshots and found no material issue, with a **SHIP for human visual review** disposition. That is a review recommendation, not recorded user approval.
- `capture-results.json` records 49 captures at desktop 1440px, tablet 768px and mobile 390px widths, each with `overflow: false`. This checks page-level overflow; it does not assert that internally scrollable calendars or tables need no horizontal scrolling.
- This documentation pass additionally inspected `student_home_desktop.png` and `login_mobile.png` against the component source and stylesheet diff.
- Existing calendar corrections are preserved in the working tree. Calendar navigation, slot affordances, booking review and conflict behavior belong to that inherited work; the Home/auth extension does not claim them as a newly designed system.
- `detector.json` contains four heuristic warnings concerning inherited dark-class compatibility selectors and the existing current-day stripe. They are recorded as inherited findings, not resolved by this extension.
- Reviewer observations retained for human review: subtle mobile horizontal-scroll cues, dense filter controls, raw ISO time in persisted notification message bodies, and required-marker wrapping. No additional polish pass was performed.

## Limits and boundary

Screenshots demonstrate rendered appearance with the captured data and viewports; they do not independently prove backend authorization, persistence, production readiness, assistive-technology coverage or physical hardware operation. Runtime and regression results belong in the task's verification report. Existing backend contracts, canonical roles/statuses, schema and migrations remain outside this design extension.

Canonical documentation changes are deferred until visual approval. This pass writes only this temporary review file; it does not create `DESIGN.md` or `.impeccable/design.json`, amend `CURRENT_STATE`, `DECISIONS` or a handoff, or authorize another batch.
