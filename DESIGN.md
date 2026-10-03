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

The frontmatter display and headline roles belong to the public landing. Public body copy is limited to 68ch; the hero introduction is 17px with a 48ch measure. Operational page headings use operational-title; supporting copy is limited to 72ch. Form labels are 0.875rem, weight 600. These roles reflect observed CSS rather than an invented mathematical type scale.

Vietnamese diacritics and English expansion must remain readable. Locale is an application preference; names, descriptions supplied by users, and historical evidence retain their original language. Existing partial translation coverage is documented in the local experience report.

## Layout

The landing container is min(1240px, calc(100% - 80px)). Its hero has two columns in a 1.2:1 ratio with a 72px gap, and its resource grid starts with three columns at a 24px gap. Search precedes category filters and results. Six initial catalog results are followed by a Show more action. The Check schedule section contains the signed-in worklist and confirmed sessions; signed-out visitors see a sign-in path and can inspect public busy times in resource details.

At 1100px the landing margins become 28px per side and resource cards become two columns. At 850px the hero becomes one column and navigation becomes a toggle. At 540px margins become 18px, resource cards become one column and header account controls wrap. The landing h1 is 42px at this narrow breakpoint.

Operational workspaces use a 1280px maximum width and a 24px section gap. Register/detail views use minmax(220px, .8fr) and minmax(0, 1.7fr) with a 32px gap. At 800px these become one column; paired fields also stack. The application shell has an existing 248px sidebar that switches to expandable top navigation at 900px. Keep these surface-specific adaptations; a hero layout is not a general page template.

## Elevation & Depth

New public surfaces are predominantly flat: cards, primary actions and the authentication split use borders and tonal separation with no shadow. Operational registers use rules and a selected-row inset stroke. Existing shared application components retain soft shadows; the sidecar records their exact source values for compatibility. New operational form surfaces follow the compact, flat treatment.

Focus is explicit: shared controls use a 2px navy outline with 2px offset; the public surface uses a 3px public-focus outline with 4px offset. Input focus also uses the existing translucent blue ring. Public color transitions run for .16s ease-out only when reduced motion is not requested. Preserve the existing reduced-motion accommodations when extending components.

## Shapes

Use compact corners on new surfaces: public controls use public-control, public resource cards use public-card, and new operational forms/disclosures use xs. Register rows are square with dividing rules. These values support the precise LAB direction.

The sm/md/lg tokens remain in the shared stylesheet as observed legacy values. Existing sidebar items use 9px corners; catalog detail/media/eligibility areas still contain 10–14px radii. This is known visual drift, not an instruction to propagate larger radii onto new LAB surfaces or to rebuild unrelated components.

## Components

### Buttons

Public actions use navy or bordered white, compact corners, a minimum height of 48px and a label with a small directional icon where useful. Primary hover deepens the navy; secondary hover uses a subtle pale surface. Public login uses a 44px minimum height. Shared operational actions retain their existing 40px minimum; buttons inside new LAB forms are at least 44px. Keep disabled and in-progress states explicit.

### Search and fields

The catalog search is a visible labeled field, at most 520px wide, with a 46px minimum input height. It searches name, resource code and location. Forms use fieldsets, visible labels and input state feedback; new operational fields have a 42px minimum height, 10px 12px padding and inherit the shared field styling. Do not hide the label in a placeholder.

### Navigation

The public header is sticky and provides resource, schedule and process links, a VI/EN selector and account action. Mobile navigation has an explicitly named toggle with expanded state. Shared sidebar navigation marks the active item with a pale navy surface and an inset navy line. Preserve keyboard focus and current-state semantics.

### Resource cards and badges

Cards combine media, operational and policy labels, category/code, resource name, location and a schedule/details action. They are flat on the landing, with a 19px content inset and a 200px cover area (220px on narrow mobile). Missing media has a labeled placeholder. Reference media is identified in detail captions with credit, license and source when supplied. It must not imply a verified photograph of the actual institution.

Available badges are compact text labels with the semantic foreground/background tokens. Catalog badges use 11px, weight 700, .04em tracking and uppercase text. Preserve distinct labels for physical state, approval and training.

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

### Don't:

- **Don't** copy the landing hero, workflow plate or section order into every operational screen.
- **Don't** introduce decorative gradients, excessive rounding or floating panels into the new LAB surfaces.
- **Don't** communicate resource condition, booking status or warnings through color alone.
- **Don't** present reference photographs, missing telemetry or unconfirmed operations as verified institutional evidence.
