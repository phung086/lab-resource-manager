# Resource dossier and frontend refinement — 30 September 2026

Continuation of draft PR #22 on `codex/lab-workspace-ui-draft`. This is a
reviewable development update, not a production release or a new numbered Batch.

## Behavior

- Public and authenticated resource details share one media gallery. Only the
  selected image/video is mounted; video has native controls, inline playback,
  metadata preload and explicit failure feedback. Media already returned by the
  resource detail endpoint is reused instead of requested again. Attribution
  stays visible. No gallery package, autoplay or runtime dependency was added.
- A resource dossier separates media, description, policy, schedule and practical
  instructions. Guest booking is an opt-in disclosure; closing it and changing
  VI/EN preserve entered fields. Existing OTP/training/payment authority remains.
- Resource forms expose preparation, operating steps, return checks and safety
  notes. Authorized ADMIN/scoped LAB_STAFF writes use existing resource POST/PATCH,
  audit and RBAC. Existing technical specs are preserved when editing instructions.
- `specs.usageGuide` is a reserved public JSON object with `beforeUse`, `steps`,
  `afterUse` arrays and `safetyNotes`. Each array accepts at most 20 non-empty
  strings of at most 500 characters; safety notes accept at most 2,000 characters.
  Unknown guide fields are rejected. Normalization preserves prose, including
  numeric/boolean-looking steps and safety-note newlines. Malformed historical
  guides are omitted from read normalization while independent specs survive.
  This uses the existing JSON column; no migration or additional table is needed.
- Restricted/non-bookable resources no longer receive an eligible verdict and
  self-service booking CTA. Midnight opening hours remain `0:00` rather than
  falling back to `8:00`.
- Late detail responses cannot replace the most recently selected resource in
  resource management. Form fields are locked while a save is pending. Media
  forms reset resource-specific metadata, clear incompatible file selections and
  validate file kind/size before requesting an upload ticket.
- Workspace screens load on demand through React.lazy/Suspense. Existing IBM
  Plex font weights use only Latin and Vietnamese subsets. The build's main JS
  entry decreases from 579.82 kB (163.52 kB gzip) to approximately 435 kB
  (129 kB gzip), about 25% smaller. This is entry JS, not the aggregate application
  size; screens still download when visited.

## Practical use

1. ADMIN or assigned LAB_STAFF opens **Quản lý tài nguyên → Sửa**. Describe the
   equipment's purpose, model, accessories and limitations in **Mô tả**.
2. Fill **Hướng dẫn sử dụng thực tế**. Put one verified step on each line. Use the
   actual manufacturer's procedure for the exact model and your LAB's validated
   handover/return checklist. Do not publish credentials or internal secrets here:
   resource descriptions and usage instructions are public catalog content.
3. Save. The detail page presents these instructions in three readable sections
   and a safety callout. Missing instructions are explicitly shown as missing;
   the generic borrowing checklist is separate from machine operating guidance.
4. Open **Ảnh & video của tài nguyên**, select the same resource, and add a
   permitted JPEG/PNG/WebP (maximum 10 MB) or MP4/WebM (maximum 100 MB). Include
   the title, accessible description and source/credit as applicable.
5. Direct uploads require the existing S3/R2 configuration and bucket CORS in
   `docs/DEPLOYMENT.md`. External media must be a direct HTTPS media URL from an
   allowed host, with a source page, author and license. YouTube watch URLs are
   not MP4/WebM media files. There is no new third-party embed integration.
6. Borrowers review the dossier, check training/availability, submit a purpose,
   wait for required approval, record handover and return condition with staff.
   Reading a guide does not confer certification or approval.

## Design reference

Consulted [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
at `09170eec67eefd46a7ae85de61b40c194020f997`: design-system search for laboratory
booking/dashboard, keyboard/focus UX and React lazy-loading guidance. Applied its
minimal, clear hierarchy, visible focus, progressive disclosure and performance
principles while preserving the project's approved white/navy tokens, IBM Plex
fonts and Lucide icons. Its generic amber palette and font suggestions were not
adopted. The skill/catalog is a development reference, not bundled in the app.

## Existing CI failures repaired

Inspected all failing jobs on the original PR head `5916e197`. Six workflows
failed: five browser workflows waited for an obsolete post-login sidebar/label,
and the migration safety matrix inserted a hard-coded September 26 probe before
the new September 28 migration. Migration runtime correctly rejected that history
as a non-canonical prefix.

The core browser suites now explicitly enter the workspace after successful login
and use stable `data-nav-id` attributes instead of old translated navigation text.
The authentication suite retains all four-role visible/hidden assertions and the
logout/session checks. The migration fixture derives a timestamp after the last
real migration. This changes test fixtures only; production lineage validation,
existing migrations and fail-closed protections are unchanged. Full GitHub rerun
results must be checked on the new commit before declaring these workflows green.

## Verification and limits

- Frontend lint/typecheck/build: pass, with the existing 14 lint warnings.
- Backend lint and required core/release suites: pass. Direct execution confirms
  39 assertions across these suites including 3 new usage-guide regression tests.
- Frontend Phase G timezone/wizard/eligibility checks: pass.
- Isolated Playwright UI fixtures verify media selection/failure, native-video
  mounting, zero redundant media requests, midnight policy, restricted booking,
  guide edits preserving specs, modal Escape, VI/EN field preservation and layouts
  at 375/768/1024/1440 px. Run with a frontend server:
  `cd frontend && npm run test:ui:dossier`. Set `UI_BASE_URL` and
  `CHROMIUM_EXECUTABLE_PATH` if needed; captures are local ignored evidence.
- Browser fixture responses are test contracts, not real persisted bookings or
  proof of successful live storage. Existing PostgreSQL integration suites were
  not rerun in this environment, which has no configured PostgreSQL server.
- No real institution images/video, SMTP, VNPAY or physical hardware were verified.
  Upload credentials and model-specific approved instructions must be supplied
  by the managing unit. Draft status and production/merge acceptance are pending.
