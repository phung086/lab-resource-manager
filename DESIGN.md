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
rounded:
  public-control: "3px"
  public-card: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
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

### Semantic states

The available badge tokens above are the observed catalog success treatment. The catalog also distinguishes in-use, maintenance, calibration, broken, offline, approval and training states. Preserve their existing styles and readable labels; semantic color is supplementary to text. Physical condition and scheduling availability must remain distinguishable.

## Typography

Use the IBM Plex Sans stack for headings, controls and prose. The technical stack uses IBM Plex Mono for resource codes, operational identifiers, telemetry values, timestamps, calendar times and numbered workflow steps. Use tabular numerals where the implementation aligns measurements or time.

The frontmatter display and headline roles belong to the incumbent public landing layer. Public body copy is limited to 68ch. The approved landing hero now uses a surface override (clamp(40px, 3.9vw, 60px), weight 600) with a 16px introduction, 1.75 line height and 42ch measure. Other operational page headings retain operational-title and supporting copy limited to 72ch. Calendar, booking operations and the shared home heading use a 28px, weight-500 title; calendar/queue supporting copy is 14px with a 65ch measure. Form labels are 0.875rem, weight 600. These are observed surface roles, not a new global type scale.

Catalogue and profile headings use weight 500 (26px and 28px respectively). Resource names use 18px text with a 1.4 line height; LAB text and section navigation use 14px, metadata uses 12px and thumbnail attribution uses 11px with a 1.4 line height. Profile section headings use 20px, dossier headings use 16px, and profile field labels use 14px at weight 400. Access explanations use the body size with a 1.7 line height and a 68ch measure. These are scoped catalogue/profile roles.

Vietnamese diacritics and English expansion must remain readable. Locale is an application preference; names, descriptions supplied by users, and historical evidence retain their original language. Existing partial translation coverage is documented in the local experience report.

## Layout

The landing container is min(1240px, calc(100% - 80px)). Its approved hero has two columns in a 1:1.08 ratio with a 56px gap, a short headline, two actions and one labelled AI LAB illustration. The resource grid starts with three columns at a 24px gap. Search precedes category filters and results. Six initial catalog results are followed by a Show more action. The Check schedule section contains the signed-in worklist and confirmed sessions; signed-out visitors see a sign-in path and can inspect public busy times in resource details. The hero image and section order remain landing composition, not a template for operational pages.

At 1100px the landing margins become 28px per side and resource cards become two columns. Below 1100px the approved hero gap becomes 32px. At 850px the incumbent hero becomes one column and public navigation becomes a toggle. At 760px the approved hero uses 40px vertical padding, a 30px gap and a 40px title. At 540px margins become 18px, resource cards become one column and header account controls wrap.

Register/detail workspaces retain their 1280px maximum width and 24px section gap. They use minmax(220px, .8fr) and minmax(0, 1.7fr) with a 32px gap; at 800px these become one column and paired fields stack. The approved shell has a persistent 240px text sidebar at 1100px and wider. Its main content region is at most 1480px wide with 32px top padding and clamp(24px, 2.8vw, 44px) side padding. Below 1100px a 64px top rail opens the existing accessible overlay; at 760px content padding becomes 24px 18px 40px. This supersedes the older 248px/900px sidebar description.

The shared header carries LAB identity, page/role context, locale and account controls. The footer follows content and offers real role-appropriate destinations and native help disclosures. Calendar controls put resource selection and booking entry on the first desktop row, period navigation and view choice on the second; they stack at 760px. Booking records put resource/purpose beside requester, time and LAB at desktop widths, then stack at narrower widths. Role homes preserve their distinct student, lecturer, staff and administrative tasks. Keep these surface-specific adaptations.

The workspace catalogue uses one divided list. At desktop widths, records align media, name/code/category, LAB, current availability and actions in five columns, with a 20px gap, 18px 22px inset and 124px minimum height. From 701px through 1250px the gap becomes 12px and the inset 16px. At 700px and narrower, a thumbnail/name pair leads into LAB, availability and two actions on full-width rows. Image and category fallback keep the same cover dimensions (76px by 64px, narrowing to 64px wide).

**The Record Alignment Rule.** In the workspace catalogue, image and fallback records share columns and action placement. Technical detail belongs in the dossier so summaries retain a consistent scan path.

The dossier overview places media beside description, state and access facts in a 1.15:1 split with a 28px gap; it stacks at 700px. Profile content is at most 1060px wide. Profile containers use 28px padding, reducing to 20px at 700px, and paired form fields become one column at that breakpoint. Dossier/profile section navigation wraps naturally above a dividing rule and a 24px content gap.

## Elevation & Depth

New public surfaces are predominantly flat: cards, primary actions and the authentication split use borders and tonal separation with no shadow. Operational registers use rules and a selected-row inset stroke. The approved workspace card/form/disclosure surfaces, booking records and calendar toolbar use borders with no resting shadow. Existing modal and unrelated shared elevation remain in place; the sidecar keeps their source values for compatibility. Older inherited hover elevation is not a new surface rule.

Focus is explicit: incumbent shared controls use a 2px navy outline with 2px offset; the workspace shell uses its existing 3px blue outline with 3px offset, and the public surface uses a 3px public-focus outline with 4px offset. Input focus also uses the existing translucent blue ring. Public color transitions and the approved sidebar/stage/action color and border feedback run for .16s ease-out only when reduced motion is not requested. The workspace disables animations/transitions under reduced motion. Existing menu/detail transitions remain; refreshed queue records receive no entrance animation.

Catalogue records, filters and profile containers are flat with dividing borders. Record hover changes only the pale background; it adds no lift or shadow. Catalogue background feedback and dossier/profile section color/border feedback use 160ms ease, disabled for reduced motion.

## Shapes

Use compact corners on new surfaces: public controls use public-control, public resource cards use public-card, and new operational forms/disclosures use xs. Register rows are square with dividing rules. These values support the precise LAB direction.

The approved workspace reuses the existing compact sizes: 4px corners on actions, desktop text-navigation rows, stage filters and calendar view controls; 6px corners on inputs, booking records, calendar toolbar and shared form/card containers. These scoped rules reuse public-card and xs values without adding another radius scale.

The catalogue list, filter disclosure and profile containers reuse sm corners (8px). Catalogue rows and section-navigation buttons are square; thumbnails and category fallback use public-card corners (4px). These surface choices extend the existing radius vocabulary.

The sm/md/lg tokens remain in the shared stylesheet as observed legacy values. Narrow overlay items retain 9px corners; catalog detail/media/eligibility areas still contain 10–14px radii. Older role homes retain nested cards, banner metrics, repeated empty-state icons and small scope footnotes. This is known visual drift, not an instruction to propagate it onto new LAB surfaces or to rebuild unrelated components.

## Components

### Buttons

Public actions use navy or bordered white, compact corners, a minimum height of 48px and a label with a small directional icon where useful. Primary hover deepens the navy; secondary hover uses a subtle pale surface. Public login uses a 44px minimum height. Approved workspace actions, queue stage filters and calendar controls use at least 44px height and the 4px compact corner; older operational actions retain their existing 40px minimum. Keep disabled and in-progress states explicit.

### Search and fields

The public catalog search is a visible labeled field, at most 520px wide, with a 46px minimum input height. It searches name, resource code and location. The workspace catalogue reveals labeled search and filters through an expanded-state button. Closing the panel preserves values; its active count and reset remain reachable. Forms use fieldsets, visible labels and input state feedback; new operational fields have a 42px minimum height, 10px 12px padding and inherit the shared field styling. Do not hide the label in a placeholder.

### Navigation

The public header is sticky and provides resource, schedule and process links, a VI/EN selector and account action. Mobile navigation has an explicitly named toggle with expanded state. At 1100px and wider the workspace sidebar displays grouped text destinations using the existing role/feature filters. Rows use 14px text, 10px 14px padding and a 44px minimum height. The active desktop row is white with navy text and weight 600; its pale sidebar ground and quiet hover tint provide separation. Narrow layouts retain the searchable overlay, focus trap, Escape dismissal and focus restoration. Desktop content remains keyboard reachable beside the sidebar. Preserve current-state semantics and focus the destination main content after navigation.

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

### Don't:

- **Don't** copy the landing hero, workflow plate or section order into every operational screen.
- **Don't** introduce decorative gradients, excessive rounding or decorative floating panels into the new LAB surfaces. The compact nonmodal assistant dock is a purposeful exception that keeps the workspace usable.
- **Don't** communicate resource condition, booking status or warnings through color alone.
- **Don't** present reference photographs, missing telemetry or unconfirmed operations as verified institutional evidence.
- **Don't** display internal account classification codes as an explanation of access or imply that self-declared membership grants verified privileges.


### Navigation update — 2026-10-06

The user requested retractable navigation again. This supersedes the always-visible desktop sidebar decision: default to an 80px shortcut rail; Menu opens a searchable drawer. Desktop users may pin the full 300px menu; closing it removes the pin. Pin preference is stored locally. Below 1100px, use a horizontal shortcut bar and a modal drawer; never reserve a full sidebar on narrow screens. Keep existing role and feature filters. Temporary drawers trap focus, support Escape/backdrop dismissal, and make background content inert. Pinned navigation leaves the content interactive.

Visual direction: quiet blue-gray surfaces, clear navy active marker, consistent icons and explicit Menu control. References: https://linear.app/now/behind-the-latest-design-refresh and https://atlassian.design/components/navigation-system/layout .
