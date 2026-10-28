# Design System: LAB Resource Manager

## Direction — approved 25/10/2026; liquid-glass amendment 28/10/2026

Light, subtly multicolored, with violet, mint and peach. This replaces the earlier
single-violet, flat cream-paper direction at the user's request. Preserve IBM Plex
Sans/Mono, the LAB identity, real resource images and all business contracts.

### Liquid glass amendment (28/10, user request)

The landing page leads with a full-bleed hero banner: the real LAB photograph
fills the banner, a translucent spectrum veil sits over it, and the headline,
subtitle and CTAs live inside a large liquid-glass panel (backdrop blur 22px +
saturation, ≥.66 white backing so ink text keeps AA). A process marquee runs
along the banner's bottom edge — real capabilities only (rooms, equipment,
booking, hold, handover, return, telemetry, maintenance, support); it pauses on
hover, when the tab is hidden, and renders as a static wrapped list under
reduced motion. Landing sections sit on aurora washes (violet/mint/peach
radials) with translucent glass cards; the CTA band is deep violet glass.
Signed-in dashboards adopt glass mastheads, notices and trends panels; queues,
tickets and data tables stay solid for legibility. `styles/liquid-glass.css`
(loaded last) owns this layer; `@supports` fallbacks raise backing opacity
where backdrop-filter is unavailable. The flat-paper rule now applies to
business surfaces only, not to the landing and dashboard mastheads.

The public entrance invites discovery. Signed-in workspaces prioritize the next
real task. Decoration belongs to the surrounding canvas and page headings; data,
forms, errors and booking states remain legible on solid surfaces.

## Implementation

`frontend/src/styles/spectrum.css` is the shared visual layer, imported after
`global.css` in `main.jsx`. Both PublicShell and AppLayout opt in with `lab-spectrum`.
Feature CSS retains structural behavior; scoped selectors stabilize the presentation
when lazy route styles load. Do not concatenate another historical theme into global.css.

## Color

- Ink #252b43; secondary #586176; lines #dce0eb; canvas #f5f6fc.
- Violet #6040ce / wash #eee9ff: primary action, selected navigation, booking.
- Mint #146b65 / wash #e5f5f0: discovery and resource-related accents.
- Peach #994526 / wash #fff0e5: supporting task groups.
- Soft static gradients combine these washes on canvas and mastheads.
- Existing success/warning/error state pairs keep their semantic meaning. An overdue
  booking retains an urgent surface; decorative category colors are not statuses.

## Type and spacing

Keep local IBM Plex Sans with Vietnamese subsets. Mono is for identifiers and data.
Page titles 26–38px; public display 38–66px, tracking no tighter than -.035em.
Body 14–17px; supporting text at least 12px. Headings balance, paragraphs wrap naturally.
Group controls closely; separate tasks with 20–24px. Cards 12–16px radius, controls
10–12px. Soft offset shadows establish depth; no hard offset blocks or gradient text.

## Task hierarchy

Customer home: split search studio with existing LAB illustration, five category
shortcuts, resource gallery alongside a personal booking panel. Instructions are
progressively disclosed below the gallery and timeline. On mobile the personal
panel comes before the gallery, after search. Booking urgency keeps semantic colors.
`discovery-home.css` owns this composition. Desktop navigation starts expanded at
240px, honoring an explicitly saved collapsed preference. Staff places the workflow
queue before shift context; admin uses separate people and operational health columns.
Catalogue: title before the full-width search/filter row. Calendar retains resource-
first two-step selection with date controls inside step two, and the existing time-first mode.
Public hero: clear headline, concise explanation, discovery CTA, secondary process
link and existing LAB illustration. No invented usage figures or decorative KPIs.

## Motion and accessibility

One 650ms arrival on the masthead/content, then short hover/press responses on
interactive items. No endless background animation added. Respect reduced motion;
keep keyboard focus, labels, disabled states and status text. Input caret, selection,
link underline offset and scrollbar colors follow the palette. Mobile stacks discovery
controls and keeps 44px control targets; existing navigation/dialog behavior remains.

## Verification boundary

See docs/CURRENT_STATE.md for the current checks and limits. A visual refresh is not
certification of every business workflow, every screen or production deployment.

## Resource collection — 26/10/2026

Resource browse uses colored category surfaces and a three/two/one-column collection.
Actual media wins; missing media uses abstract category SVG artwork, never a fictional
asset photograph. Detail places persistent gallery beside identity and booking actions;
mobile reads identity, gallery, actions, details. Gallery studio is opt-in. Motion answers
selection, media changes and panel switches; reduced motion disables it. Hovering or
focusing section buttons never changes content. New styles are in resource-experience.css.
