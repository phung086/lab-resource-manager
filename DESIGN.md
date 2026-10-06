---
name: Lab Resource Manager
description: Precise white and navy interfaces for laboratory discovery and daily operations.
colors:
  primary: "#174d70"
  primary-hover: "#113b57"
  primary-subtle: "#edf4f6"
  white: "#fff"
  canvas: "#f5f7fb"
  raised: "#f1f5f9"
  ink: "#0f172a"
  secondary-text: "#475569"
  muted-text: "#64748b"
  line: "#e2e8f0"
  line-strong: "#cbd5e1"
  public-ink: "#162f43"
  public-body: "#4b6475"
  public-line: "#d5dfe5"
  public-section: "#f3f6f7"
  public-workflow: "#edf3f5"
  process-plate: "#173a50"
  public-focus: "#167992"
  available-bg: "#dcfce7"
  available-text: "#15803d"
  lab-canvas: "#f8fafb"
  lab-surface-muted: "#f4f7f9"
  lab-surface-hover: "#eef3f6"
  lab-ink: "#0f2942"
  lab-secondary-text: "#4a6080"
  lab-muted-text: "#607087"
  lab-navy-hover: "#123552"
  lab-navy-tint: "#e8f1f6"
  lab-line: "#dde4eb"
  lab-line-strong: "#c4cdd6"
  lab-danger: "#be123c"
  lab-danger-bg: "#fff1f2"
typography:
  display:
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(42px, 4.3vw, 66px)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-.035em"
  headline:
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(28px, 2.5vw, 38px)"
    lineHeight: 1.22
    letterSpacing: "-.025em"
  operational-title:
    fontSize: "1.65rem"
    lineHeight: 1.3
    letterSpacing: "-.025em"
  body:
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontSize: "13px"
    fontWeight: 600
  technical:
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace'
  home-title:
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-.025em"
  home-section:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-.02em"
rounded:
  public-control: "3px"
  public-card: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  lab-control: "4px"
  lab-container: "6px"
spacing:
  inline: "8px"
  compact: "12px"
  field: "16px"
  form: "20px"
  section-gap: "24px"
  split: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.public-control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.public-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.public-control}"
    padding: "12px 18px"
  search-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.public-ink}"
    rounded: "{rounded.public-control}"
    padding: "10px 14px"
  resource-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.public-card}"
  available-badge:
    backgroundColor: "{colors.available-bg}"
    textColor: "{colors.available-text}"
    rounded: "{rounded.xs}"
    padding: "3px 8px"
  lab-form:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xs}"
    padding: "{spacing.form}"
  workspace-header:
    backgroundColor: "{colors.white}"
    textColor: "{colors.lab-ink}"
    height: "72px"
  workspace-header-mobile:
    height: "64px"
  home-working-desk:
    backgroundColor: "{colors.white}"
    textColor: "{colors.lab-ink}"
    rounded: "{rounded.lab-container}"
  home-register:
    backgroundColor: "{colors.white}"
    textColor: "{colors.lab-ink}"
    rounded: "{rounded.lab-container}"
    padding: "16px 20px"
---

# Design System: Lab Resource Manager

## Overview

**Creative North Star: "The LAB working record"**

A precise, professional laboratory interface built from white surfaces, navy actions and clear working records. IBM Plex Sans carries interface text; IBM Plex Mono distinguishes resource identifiers and technical values. Borders, alignment and whitespace establish hierarchy.

Public discovery uses a Persuade mode to explain access and lead visitors to resources. Authenticated work uses an Operate mode with registers, forms, ledgers and explicit outcomes. Both share the same visual identity; the landing composition is specific to that surface.

**Key Characteristics:**

- White and navy with restrained semantic color.
- Readable Vietnamese and English across the application.
- Compact corners, clear boundaries and practical information density.
- Truthful resource media, state labels and operational feedback.

This is a scan of the user-authorized local refinement on 29 September 2026. Source evidence: [light redesign](frontend/src/styles/light-redesign.css), [public landing](frontend/src/styles/public-landing.css), [public catalog](frontend/src/styles/public-catalog.css), and [LAB workspace](frontend/src/styles/lab-workspace.css). Component behavior was checked in PublicLanding, PublicResourceCatalog, LabWorkspace and MaintenancePage. The [local experience report](docs/LAB_WORKSPACE_EXPERIENCE_REPORT_20260929.md) owns runtime verification and limitations. This document records visual guidance, not release certification.

The approved local extension on 5 October 2026 adds persistent desktop text navigation, a resource-first calendar toolbar, shorter booking records and shared role-home styling within this world. [Final workspace styles](frontend/src/styles/final-workspace.css) load after the incumbent styles and [shared project shell](frontend/src/styles/project-shell.css). The [design handoff](artifacts/local-final-ui-20261005/DESIGN_HANDOFF.md) and [finish review](artifacts/local-final-ui-20261005/FINISH_REVIEW.md) cover landing, calendar, booking queue and shared shell/home styling. The token frontmatter remains the incumbent primitive vocabulary; scoped surface overrides are described below. The 50-frame preparation map is a planning inventory, and these records do not certify every screen or mutation.

The subsequent catalogue, resource dossier and profile refinement uses [catalogue/profile styles](frontend/src/styles/catalog-profile.css), loaded after final workspace styles. It extends this world with aligned resource records, collapsed search/filter controls and shared section navigation. Source behavior is in ResourceManagementView, ResourceDetailsModal and ProfilePage; the [refinement report](artifacts/catalog-profile-refinement-20261005/REPORT.md) and [fix verdict](artifacts/catalog-profile-refinement-20261005/FIX_VERDICT.md) own the scoped verification and remaining limits.

The coordinator's wave 1 continuation on 6 October 2026 modernizes the shared header, CSS cascade and role homes under [UI_CONTRACT](docs/ui-redesign/UI_CONTRACT.md) and [REDESIGN_SPEC](docs/ui-redesign/REDESIGN_SPEC.md). Sources are [Header](frontend/src/components/Header.tsx), [shared foundations](frontend/src/styles/lab-design-system.css), [final workspace](frontend/src/styles/final-workspace.css), [home styles](frontend/src/styles/workspace-home.css), and the workspace HomeComponents, StudentHome and AdminHome components. Global foundations load before App's surface imports in [main](frontend/src/main.jsx); unused lab-app-shell and lab-landing imports are removed while their files remain. Home layout now belongs to its dedicated lazy-loaded sheet. The new lab-prefixed frontmatter entries describe the frozen shared CSS API alongside the preserved incumbent surface primitives. This record covers the coordinator changes only; pending contributor landing, calendar, operation and profile changes are not integrated or documented as delivered. Earlier required frontend checks passed according to the coordinator run. The [navigation confirmation](.impeccable/review/coordinator/navigation-confirm/results.json) records 129 checks with no errors on frontend 5173/API 8000; the [final role-home confirmation](.impeccable/review/coordinator/final/results.json) adds 91 checks with no browser errors across all four roles, VI/EN and 1440/1280/768/390/375px widths, including finder draft preservation, query/category forwarding and exact-resource calendar navigation. Final captures follow the import-order and mobile-target corrections. These are read-only local UI checks; no shared-database business mutations, whole-system completion or independent review verdict is claimed.

## Colors

The primary palette pairs laboratory navy with cool white and slate neutrals.

### Primary

- **Laboratory navy** (primary): public primary actions and shared authenticated actions.
- **Deep navy** (primary-hover): hover feedback for primary actions.
- **Pale navy tint** (primary-subtle): selected operational rows and navigation context.
- **Process navy** (process-plate): the landing workflow figure only.

### Neutral

- **White** (white): content surfaces and public page background.
- **Cool canvas** (canvas): the authenticated application background.
- **Raised slate** (raised): supporting areas and input disabled backgrounds.
- **Ink, secondary text and muted text**: descending text hierarchy on operational screens.
- **Public ink and public body**: the slightly softer navy text of public discovery.
- **Line and strong line**: content divisions and field boundaries; public-line is the landing counterpart.
- **Public section and public workflow**: subtle alternating landing sections.

The coordinator shell and homes consume the `--lab-*` API: lab-canvas, lab-surface-muted and lab-surface-hover describe its cool neutral grounds; white maps to `--lab-surface`; lab-ink, lab-secondary-text and lab-muted-text map to `--lab-text-primary`, `--lab-text-secondary` and `--lab-text-muted`. Primary remains `--lab-navy-700`; lab-navy-hover and lab-navy-tint map to `--lab-navy-800` and `--lab-navy-100`; lab-line and lab-line-strong map to the shared border tokens. Root workspace variables alias these shared values rather than choosing another palette. Supplementary muted text replaces its previous lighter value (#7a8fa8) for contrast without changing the CSS name; the final value measures 5.04:1 on white, 4.82:1 on lab-canvas and 4.69:1 on lab-surface-muted. Use secondary text for explanatory copy and retain rendered contrast checks. The legacy muted-text primitive and the public, catalogue and profile surface-specific palette remain separate from this shared mapping.

### Semantic states

The available badge tokens above are the observed catalog success treatment. The catalog also distinguishes in-use, maintenance, calibration, broken, offline, approval and training states. Preserve their existing styles and readable labels; semantic color is supplementary to text. Physical condition and scheduling availability must remain distinguishable.

## Typography

Use the IBM Plex Sans stack for headings, controls and prose. The technical stack uses IBM Plex Mono for resource codes, operational identifiers, telemetry values, timestamps, calendar times and numbered workflow steps. Use tabular numerals where the implementation aligns measurements or time.

The frontmatter display and headline roles belong to the incumbent public landing layer. Public body copy is limited to 68ch. The approved landing hero now uses a surface override (clamp(40px, 3.9vw, 60px), weight 600) with a 16px introduction, 1.75 line height and 42ch measure. Other operational page headings retain operational-title and supporting copy limited to 72ch. Calendar, booking operations and the shared home heading use a 28px, weight-500 title; calendar/queue supporting copy is 14px with a 65ch measure. Form labels are 0.875rem, weight 600. These are observed surface roles, not a new global type scale.

Catalogue and profile headings use weight 500 (26px and 28px respectively). Resource names use 18px text with a 1.4 line height; LAB text and section navigation use 14px, metadata uses 12px and thumbnail attribution uses 11px with a 1.4 line height. Profile section headings use 20px, dossier headings use 16px, and profile field labels use 14px at weight 400. Access explanations use the body size with a 1.7 line height and a 68ch measure. These are scoped catalogue/profile roles.

Role homes use home-title for greetings, home-section for section headings, 16px/weight-500 record names, 14px priority labels and 12–13px supporting text. The finder has a 30px/weight-500 heading; mobile greetings reduce to 24px and section headings to 18px. Priority counts use tabular numerals at 24px. The compact shared header uses 14px/weight-500 page context and 12px role context; its plain LAB home link uses 18px brand text and 12px supporting text.

Vietnamese diacritics and English expansion must remain readable. Locale is an application preference; names, descriptions supplied by users, and historical evidence retain their original language. Existing partial translation coverage is documented in the local experience report.

## Layout

The landing container is min(1240px, calc(100% - 80px)). Its approved hero has two columns in a 1:1.08 ratio with a 56px gap, a short headline, two actions and one labelled AI LAB illustration. The resource grid starts with three columns at a 24px gap. Search precedes category filters and results. Six initial catalog results are followed by a Show more action. The Check schedule section contains the signed-in worklist and confirmed sessions; signed-out visitors see a sign-in path and can inspect public busy times in resource details. The hero image and section order remain landing composition, not a template for operational pages.

At 1100px the landing margins become 28px per side and resource cards become two columns. Below 1100px the approved hero gap becomes 32px. At 850px the incumbent hero becomes one column and public navigation becomes a toggle. At 760px the approved hero uses 40px vertical padding, a 30px gap and a 40px title. At 540px margins become 18px, resource cards become one column and header account controls wrap.

Register/detail workspaces retain their 1280px maximum width and 24px section gap. They use minmax(220px, .8fr) and minmax(0, 1.7fr) with a 32px gap; at 800px these become one column and paired fields stack. At 1100px and wider the shell defaults to an 80px shortcut rail with a searchable temporary drawer and optional 300px pinned menu. Below 1100px it uses a horizontal 64px shortcut bar and modal drawer. Its main content region is at most 1480px wide with 32px top padding, clamp(24px, 2.8vw, 44px) side padding and 48px bottom padding; at 760px content padding becomes 24px 18px 40px. This reconciles the 6 October retractable-navigation update and supersedes the prior persistent 240px sidebar description.

The shared header carries LAB identity, page/role context, locale and account controls. The footer follows content and offers real role-appropriate destinations and native help disclosures. Calendar controls put resource selection and booking entry on the first desktop row, period navigation and view choice on the second; they stack at 760px. Booking records put resource/purpose beside requester, time and LAB at desktop widths, then stack at narrower widths. Role homes preserve their distinct student, lecturer, staff and administrative tasks. Keep these surface-specific adaptations.

The shared header has a 72px minimum height at desktop widths and 64px at 760px and narrower. Desktop repeats identity as a compact text home link rather than another large symbol; the mobile header hides that link and keeps page/role context, locale and account controls below the shortcut bar. Narrow notification, avatar and locale controls retain a 44px minimum target width and height.

Role homes use a 32px section rhythm and a 2:1 main/related-work split with a 32px gap. The student finder and next-booking area share one bordered white working desk, with a muted next-booking column divided by a rule. At 1000px, ordinary content and staff queue splits stack; the working desk and lecturer/admin lead boards stack at 760px. The priority strip becomes one divided column at 760px. Resource, class and role records remain one-column registers; narrow resource/class rows wrap metadata and actions under their identity. At 420px the finder controls and next-booking facts stack completely. These compositions belong to role homes, not public discovery or other operational pages.

The workspace catalogue uses one divided list. At desktop widths, records align media, name/code/category, LAB, current availability and actions in five columns, with a 20px gap, 18px 22px inset and 124px minimum height. From 701px through 1250px the gap becomes 12px and the inset 16px. At 700px and narrower, a thumbnail/name pair leads into LAB, availability and two actions on full-width rows. Image and category fallback keep the same cover dimensions (76px by 64px, narrowing to 64px wide).

**The Record Alignment Rule.** In the workspace catalogue, image and fallback records share columns and action placement. Technical detail belongs in the dossier so summaries retain a consistent scan path.

The dossier overview places media beside description, state and access facts in a 1.15:1 split with a 28px gap; it stacks at 700px. Profile content is at most 1060px wide. Profile containers use 28px padding, reducing to 20px at 700px, and paired form fields become one column at that breakpoint. Dossier/profile section navigation wraps naturally above a dividing rule and a 24px content gap.

## Elevation & Depth

New public surfaces are predominantly flat: cards, primary actions and the authentication split use borders and tonal separation with no shadow. Operational registers use rules and a selected-row inset stroke. The approved workspace card/form/disclosure surfaces, booking records and calendar toolbar use borders with no resting shadow. Existing modal and unrelated shared elevation remain in place; the sidecar keeps their source values for compatibility. Older inherited hover elevation is not a new surface rule.

Focus is explicit: incumbent shared controls use a 2px navy outline with 2px offset; the workspace shell uses its existing 3px blue outline with 3px offset, and the public surface uses a 3px public-focus outline with 4px offset. Input focus also uses the existing translucent blue ring. Public color transitions and the approved sidebar/stage/action color and border feedback run for .16s ease-out only when reduced motion is not requested. The workspace disables animations/transitions under reduced motion. Existing menu/detail transitions remain; refreshed queue records receive no entrance animation.

Catalogue records, filters and profile containers are flat with dividing borders. Record hover changes only the pale background; it adds no lift or shadow. Catalogue background feedback and dossier/profile section color/border feedback use 160ms ease, disabled for reduced motion.

Home panels are transparent and unboxed. The lead board and registers use white surfaces and thin borders without resting shadow; flat priority cells use rules and a danger tint only for nonzero urgent work. Home interactive controls use a 2px shared-focus outline with 3px offset. Priority, class, role and refresh hover feedback uses the shared 120ms easing only when reduced motion is not requested.

## Shapes

Use compact corners on new surfaces: public controls use public-control, public resource cards use public-card, and new operational forms/disclosures use xs. Register rows are square with dividing rules. These values support the precise LAB direction.

The approved workspace reuses the existing compact sizes: 4px corners on actions, desktop text-navigation rows, stage filters and calendar view controls; 6px corners on inputs, booking records, calendar toolbar and shared form/card containers. These scoped rules reuse public-card and xs values without adding another radius scale.

The catalogue list, filter disclosure and profile containers reuse sm corners (8px). Catalogue rows and section-navigation buttons are square; thumbnails and category fallback use public-card corners (4px). These surface choices extend the existing radius vocabulary.

The coordinator home lead boards and register containers use lab-container corners (6px), while their divided rows and priority cells are square. Compact home controls use the frozen lab-control value (4px). The current navigation drawer rows use 6px corners and rail controls use 7px corners.

The sm/md/lg tokens remain in the incumbent shared stylesheet as observed legacy values; they are separate from the frozen `--lab-radius-*` API. Catalogue detail/media/eligibility areas still contain 10–14px radii. This pre-existing drift outside the coordinator boundary remains recorded, not an instruction to propagate it onto new LAB surfaces or rebuild unrelated components.

## Components

### Buttons

Public actions use navy or bordered white, compact corners, a minimum height of 48px and a label with a small directional icon where useful. Primary hover deepens the navy; secondary hover uses a subtle pale surface. Public login uses a 44px minimum height. Approved workspace actions, queue stage filters and calendar controls use at least 44px height and the 4px compact corner; older operational actions retain their existing 40px minimum. Keep disabled and in-progress states explicit.

### Search and fields

The public catalog search is a visible labeled field, at most 520px wide, with a 46px minimum input height. It searches name, resource code and location. The workspace catalogue reveals labeled search and filters through an expanded-state button. Closing the panel preserves values; its active count and reset remain reachable. Forms use fieldsets, visible labels and input state feedback; new operational fields have a 42px minimum height, 10px 12px padding and inherit the shared field styling. Do not hide the label in a placeholder.

### Navigation

The public header is sticky and provides resource, schedule and process links, a VI/EN selector and account action. Mobile navigation has an explicitly named toggle with expanded state. Workspace navigation defaults to the compact rail; Menu opens grouped text destinations with Vietnamese accent-insensitive search and existing role/feature filters. Drawer rows use 14px text, 11px 12px padding and a 44px minimum height; the active row combines navy text, weight 600, a pale blue ground and an inset 3px navy marker. Temporary drawers are modal at desktop and narrow widths: focus enters search, Tab stays within visible controls, background content becomes inert, Escape/backdrop/Close dismiss and restore focus. Desktop users may pin the 300px menu; pinned navigation leaves content interactive and the local preference survives reload. Closing removes the pin. Destination selection focuses main content. Below 1100px the shortcuts are horizontal and the menu remains modal. The [6 October navigation evidence](.impeccable/review/coordinator/navigation-confirm/results.json) owns runtime assertions; the user-selected reference direction came from [Linear](https://linear.app/now/behind-the-latest-design-refresh) and [Atlassian](https://atlassian.design/components/navigation-system/layout).

### Role-home working desk and registers

Student discovery leads with a labelled resource finder and next-booking facts or a useful left-aligned empty state. Resource rows show code/category, name, LAB, physical-state text and the exact-resource calendar action. Class rows align code/term, class name, lecturer, membership/activity counts and the existing destination. Admin role rows align role explanation, count and directory action; lecturer/admin lead boards use white surfaces and a separated academic note or totals area. These replace the previous nested home cards and dark metric banner.

Priority cells put a readable task label and hint before the count and directional action. Scope notes use readable 12px supplementary text: student/lecturer recent-record previews remain bounded, while staff/admin booking and incident figures use server summary totals. Maintenance previews retain their own bounded scope. Empty states place one small contextual icon beside title, explanation and existing action; they do not turn failed reads into zero work.

The staff home keeps its real five-row server queue and pagination. Four stage controls use a navy bottom rule and pressed state; records show code/state, resource, requester/purpose, Vietnam time, LAB and the existing evidence/confirmation destination. At narrow widths stage controls become two columns and record actions follow their content. Loading, failure/retry and empty states remain separate; all authorization and mutation semantics stay with the existing business workflow.

**The Home Register Rule.** Within role homes, use one working desk for the leading task and divided registers for repeated resources, classes and roles. Keep section panels unboxed and preserve readable scope, state and destination labels.

### Calendar and booking records

The resource selector names the current resource once and leads into the existing booking form. Period navigation, Day/Week/Month selection and text-labelled legend stay next to the calendar. Booking records lead with resource name and purpose, then requester, Vietnam time and LAB. Status has a readable label; eligible actions use explicit verbs and open the existing protected confirmation/evidence forms. Filters and pagination retain server scope and totals. Detail evidence appears only when supplied by the record.

### Landing illustration

The landing uses one 3:2 LAB workbench illustration with a 4px corner and localized alt text/caption. Its AI provenance remains visible in VI/EN and in the asset record. It is conceptual material for this surface and must not be presented as an institutional photograph or resource evidence.

### Resource cards and badges

Cards combine media, operational and policy labels, category/code, resource name, location and a schedule/details action. They are flat on the landing, with a 19px content inset and a 200px cover area (220px on narrow mobile). Missing media has a labeled placeholder. Reference media is identified in detail captions with credit, license and source when supplied. It must not imply a verified photograph of the actual institution.

Available badges are compact text labels with the semantic foreground/background tokens. Catalog badges use 11px, weight 700, .04em tracking and uppercase text. Preserve distinct labels for physical state, approval and training.

### Workspace catalogue records

Compact records use an API-provided thumbnail with a reference caption where applicable, or a category icon in the same cover slot. Name and detail action both open the dossier; the calendar action carries the exact resource. Name/code/category, LAB and current availability lead the scan. Record availability labels use 12px at weight 400, and the action column uses 13px labels with 40px minimum height. Full attribution stays in the dossier. Missing or failed media retains truthful feedback.

### Dossier and profile sections

Shared section navigation uses 14px text, 14px 2px padding and a 44px minimum height. The active button has navy text, weight 500 and a 2px bottom rule; hover changes the text color. Buttons expose pressed state, and inactive content is hidden.

The dossier offers overview, specifications with usage guidance, schedule and history. Public resource information and schedule remain available independently of the protected history read. History loads when selected; denial or failure stays in that section, with retry for recoverable failures. The exact-resource calendar action stays in the modal footer. Closing details restores keyboard focus to the connected opener.

**The Section Continuity Rule.** Dossier and profile sections preserve surrounding identity and navigation. Keep profile forms mounted across section and locale changes so unsaved input survives.

Profile sections group personal information, security, access requirements and activity. A name/email/role summary provides context above them. Access guidance uses human language and an optional explanation disclosure; self-declared membership does not imply verified authority, price benefits or training exemption. Password setup feedback describes the stored flag without claiming password strength.

### Registers, ledgers and maintenance

Registers use a strong top rule and square selectable rows; ledgers use quiet dividers, readable dates and space for reasons and user content. Forms and disclosures use the compact xs corner. Maintenance presents affected bookings before saving and makes filtered-empty state actionable with View all jobs. Completion copy preserves the distinction between a recorded job and verified physical equipment condition.

### Truthful feedback

Loading uses status text, failures use alerts, and completed mutations show confirmation only after the API succeeds. Empty lists explain their scope or filter. Preserve input while errors are resolved. Browser-tested behavior and integration limits belong to the experience report; this visual specification does not claim exhaustive accessibility or translation certification.

## Do's and Don'ts

### Do:

- **Do** keep resource search easy to find and keep signed-in tasks within the landing Check schedule section.
- **Do** use IBM Plex Sans for interface text and IBM Plex Mono for identifiers, times, measurements and sequence numbers where it aids scanning.
- **Do** translate interface labels and status descriptions in VI/EN while preserving stored user content and historical evidence.
- **Do** label reference media and retain source, credit and license information when provided.
- **Do** show distinct loading, filtered-empty, unavailable, validation and failure states with keyboard-visible focus.
- **Do** keep workspace catalogue media, identity, LAB, availability and actions aligned across image and category fallback records.
- **Do** preserve profile drafts when changing sections or VI/EN, and keep protected history feedback inside the dossier history section.
- **Do** use the frozen `--lab-*` API for coordinator shell/home styling, keep role-home scope notes readable and preserve distinct loading, empty and failed reads.
- **Do** preserve the compact rail, searchable temporary drawer and optional desktop pin with their existing focus behavior.

### Don't:

- **Don't** copy the landing hero, workflow plate or section order into every operational screen.
- **Don't** introduce decorative gradients, excessive rounding or decorative floating panels into the new LAB surfaces. The compact nonmodal assistant dock is a purposeful exception that keeps the workspace usable.
- **Don't** communicate resource condition, booking status or warnings through color alone.
- **Don't** present reference photographs, missing telemetry or unconfirmed operations as verified institutional evidence.
- **Don't** display internal account classification codes as an explanation of access or imply that self-declared membership grants verified privileges.
