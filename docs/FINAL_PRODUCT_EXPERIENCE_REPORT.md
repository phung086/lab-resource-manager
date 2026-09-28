# Product Experience Review

Date: 2026-09-28. Base: the local UX pass began from release candidate `78eb7f4`
and was synchronized to live `origin/main` (`235e45e83d6e3a77ceb93b7f138d98e153578751`)
on branch `sync/product-experience-20260928`. This report covers the authorized
Product Experience refinement and synchronization work, not project closure.

GitHub synchronization result: PR #20 merged into `main` at
`77386e0514cd962ad219f1a2c9b7c138d87d6ec4`. All 14 PR checks passed before
merge, and all 9 post-merge checks on `main` passed after merge.

Reviewed local design skills first, then canonical project context and release
evidence, frontend composition and all requested journey families. Wrote
[SKILL_REVIEW_SUMMARY.md](SKILL_REVIEW_SUMMARY.md) and
[FINAL_UX_IMPROVEMENT_PLAN.md](FINAL_UX_IMPROVEMENT_PLAN.md) before application edits.

The existing product has a coherent light academic interface and operational
workflows. The highest-value changes were predictable resource selection, truthful
prerequisites and schedule display, recoverable guest forms, media resilience and
accessible administrative actions. The landing identity and workspace architecture
were retained.

# Applied Design Principles

- **Eligibility before commitment:** wait for resource detail before offering booking;
  explain mandatory training before identity and OTP steps.
- **Visible, accurate state:** loading is distinct from failure; quote absence is
  distinct from free; physical availability is distinct from a valid booking slot.
- **Predictable interaction:** ignore obsolete detail responses, preserve focus,
  validate wizard steps in sequence and disable navigation during submissions.
- **Consistent hierarchy:** reuse semantic status colors and existing typography;
  simplify the wizard progress to Lịch đặt / Liên hệ / Xác thực with a full step heading.
- **Accessible operation:** focus errors/step headings, label admin controls with
  their target user, keep text and icons beside state color, respect reduced motion.
- **Purposeful media:** preserve attribution and full detail imagery; provide failure
  presentation without inventing photographs, streams or operational evidence.

# UX Improvements Implemented

1. Public resource detail ignores stale responses after another selection, close or
   unmount. Detail loading/error and retry are explicit. Booking controls wait for
   successful detail; physically blocked resources do not show the guest wizard.
2. Detail opening focuses its heading and closing restores the initiating control.
   Reduced-motion users get immediate scrolling.
3. Guest wizard checks step-one validity before step three, focuses visible errors
   and new step headings, and starts fresh when the resource changes.
4. Changing email clears the old OTP UI state. Navigation, resend and confirmation
   are disabled while OTP/booking requests are pending. Server rules remain unchanged.
5. Training copy states that valid mandatory certificates are needed before booking
   and that OTP does not replace them. Users without certification are directed to LAB staff.
6. Public busy times use the shared Vietnam formatter with an explicit UTC+07:00
   label. Cancelled/completed maintenance is excluded from busy previews; truncated
   previews and empty schedules are explained.
7. Corrected escaped status/access classes, license attribution and list keys.
8. Added a small public media preview component: lazy/async images, native controlled
   video with metadata preload, fallback descriptions and visible load failure.
   Detail media has a reserved aspect ratio and uses contain to avoid cropping equipment.
9. Guest progress controls use three wrapping columns and minimum 44px height;
   completed steps use the darker existing success token. Form controls and long
   contact values fit narrow containers; action rows wrap.
10. Admin users table has an accessible caption; role, activation and lab-assignment
    controls identify their target user. Mutation logic and authorization are unchanged.
11. Public pricing read and quote endpoints now support the unauthenticated guest
    booking flow. Pricing writes remain authenticated and ADMIN-only.

# Before/After Comparison

| Before | After | Evidence |
| --- | --- | --- |
| Slow response could reopen closed detail or replace a newer resource | Only the current selection updates | Delayed live-response browser checks |
| Detail failure silently retained list-derived prerequisites | Explicit failure/retry; booking waits for detail | Injected 503, then real successful retry |
| Step-three click could bypass step-one validation | Invalid step remains visible and receives focus | Invalid-time navigation check |
| Previous resource's wizard state survived switching | Resource identity remounts the wizard | Switch/reset browser check |
| Guest copy suggested training at handover | Certification prerequisite stated before booking | Source and training presentation fixture |
| Browser timezone affected public busy times | Canonical Vietnam hours | Los Angeles browser against live schedule |
| Cancelled maintenance appeared busy | Only scheduled/in-progress maintenance shown | Browser-only maintenance fixture |
| Literal interpolation broke colors/license and keys | Actual state classes and attribution | Rendered semantic class/caption checks |
| Broken media presented native failures | Named, truthful fallback keeps resource information usable | Injected image/video network failures |
| Long progress labels crowded narrow sidebar | Compact labels and wrapping, consistent touch targets | Desktop/tablet/390px/360px captures |
| Unnamed admin row selects | Contextual names and table caption | Real demo admin DOM checks |

# Verification

Executed from `frontend/`:

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS, zero errors and the existing 13 warnings |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; main entry about 502.6 kB / 139.4 kB gzip, Vite chunk-size warning |
| `npm run test:phase-g` | PASS: timezone, wizard utilities, eligibility/temporary-account assertions |
| `node test_product_experience_e2e.mjs` with local demo credentials via environment | PASS, 14 reported check groups |
| Backend `npm run lint` | PASS |
| Pricing HTTP smoke on local demo | PASS: unauthenticated pricing read/quote returned 200; unauthenticated pricing write stayed 401 |
| Impeccable detector on six changed UI/style files | `[]`, no mechanical findings |
| `git diff --check` | PASS; Git reports only ordinary LF/CRLF conversion notices |

Browser coverage includes public detail and guest flow at 1440×960, 768×1024,
390×844 and 360×800, no document overflow, progress target sizing, focus, detail
race/error/retry, timezone labeling, live address selection, unsent final review,
and injected OTP/media/maintenance states. Real student routes: overview, calendar, own bookings,
profile. Real staff routes: overview, bookings, operations, telemetry, incidents,
maintenance. Real admin: user management and named controls. Role screens also
received a 390px layout check. No uncaught page errors in those checks.

Current verification used the guarded local demo launcher on isolated database
`lab_resources_local_demo`: API `http://127.0.0.1:15005`, UI
`http://127.0.0.1:15181`. The launcher applied existing migrations with
`prisma migrate deploy`, ran the idempotent local demo seed and did not use
`prisma db push`. Screenshots and `results.json` are under ignored
`logs/ux-review/`. The browser script is repository source under `frontend/`;
it accepts `UX_FRONTEND_URL`, `UX_API_URL` and optional `UX_STUDENT_*`,
`UX_STAFF_*`, `UX_ADMIN_*` email/password environment variables. No credentials
are embedded in that script.

Initial browser launch was blocked by sandbox process creation; approved local
Chromium execution succeeded. An initial temporary Vite config had a module-resolution
error; using Vite's programmatic server resolved it before verification. Neither
was counted as an application failure. One batched visual review and one confirmation
were used; the confirmation shortened mobile progress labels and waited for loaded
staff queues rather than recording their loading frame.

The live QA used authentication and read-only business routes. The OTP failure was
intercepted before delivery, and no booking/payment/admin mutation was submitted.
No database schema, migration, canonical status/role, RBAC write rule or pricing
mutation path was changed. During synchronization, `backend/src/routes/bookingPricing.js`
was corrected so public guest pricing read/quote routes work without a bearer token,
while unauthenticated pricing writes still return 401. Browser-only media/training/maintenance
fixtures test presentation and are not evidence of business success or real hardware.

# Remaining Limitations

- Dedicated operational system-audit frontend remains absent (UX-09); the research
  audit sample was not enabled.
- Student overview can label no certifications “Hợp lệ” (UX-11). A separate, scoped
  review of certificate projection and resource-specific eligibility language remains.
- Existing legacy/light/feature CSS layering, 13 lint warnings and the main bundle
  warning remain. This pass does not claim comprehensive performance optimization.
- Forms still have broader field-level error association opportunities. This is
  targeted keyboard/DOM/responsive QA, not full WCAG or assistive-technology certification.
- The isolated demo has no real resource media. Native failure/empty states and source
  attribution were verified; real video captions, image relevance/quality and successful
  remote playback need supplied media and review.
- Live SMTP, payment settlement/refunds and physical hardware remain unverified.
  Payment screens were source-reviewed; payment is disabled in this demo runtime.
- No fresh end-to-end booking mutation, staff handover/return mutation or full Batches
  2–8 suite was executed in this pass. Their prior release results remain historical
  evidence at the original SHA; current verification is limited to the gates above.
- No blanket claim of zero regression or production readiness follows from these checks.

# Demo Readiness

The changed product-experience branch is ready for review in the local demo within the verified
scope. Demonstrate catalog → prerequisites → Vietnam-time schedule → guided guest
form, then switch to existing student/staff/admin screens. Use seeded demo resources
honestly; explain missing media and telemetry as missing data. Use existing API evidence
for system audit, and label optional payment/provider limitations.

Before showing an actual booking submission, use the existing isolated release
walkthrough and configured local SMTP; this UX pass did not send email or change demo
bookings. The original production demo on port 18157 still serves its previous build.

This report is synchronized to GitHub through PR #20 and the post-merge `main`
checks. Do not treat it as project closure or as a new backend batch.
