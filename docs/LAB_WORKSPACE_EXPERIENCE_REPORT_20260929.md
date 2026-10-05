# LAB workspace experience — local continuation

## Scope

User requested a precise LAB interface, an attractive readable landing page,
global Vietnamese/English, real operational workflows, resource media,
maintenance rescheduling, material inventory, and course-group supervision.
This continues the existing React/Vite + Express/Prisma project without opening
a new numbered Batch. Existing unrelated working-tree changes are preserved.

## Implemented behavior

- White/navy landing with IBM Plex Sans, resource search, six initial results,
  progressive reveal, resource details and a four-step booking workflow.
- Signed-in worklist and confirmed sessions are inside the landing's Check
  schedule section. Public visitors receive a sign-in path and public resource
  availability without private requester identities.
- Shared locale context, persistent VI/EN selection, translated core forms,
  calendars, navigation, operations, profile and workspace errors. Changing
  language preserves unsaved profile and booking fields.
- Inventory is a persisted ledger for MATERIAL resources. Staff operate only
  within assigned laboratories; admin has global access and exclusively records
  physical-count adjustments. Receipts/issues require references and reasons.
  Row locks prevent concurrent issues from creating negative stock; request IDs
  make identical retries idempotent. Stock units remain fixed after initialization.
- Material issues may link to an open maintenance job in the same laboratory.
- Maintenance supports impact preview, conflict rejection, reasoned rescheduling,
  progress and cancellation. Closed jobs reject edits. Completing a job does not
  certify the equipment or silently change its physical state. Conflicting user
  bookings require coordination; automatic relocation is not implemented.
- Admin assigns course groups and lecturers. Lecturers manage their assigned
  roster and review learning goals. Students submit their own bookings and may
  revise when changes are requested. Academic endorsement never confirms or
  hands over a resource. Student views do not expose peers' activities.
- Resource detail galleries support existing image/video metadata. Upload
  configuration is checked before attempting storage operations. Missing storage
  credentials are surfaced honestly; no fake upload success is introduced.

## Verification

- Backend lint and required test suite passed: 33 core checks and 3 release
  security checks.
- New `test/labWorkspace.integration.test.js` passed three integrated scenarios
  covering stock concurrency/idempotency, role/lab scope, course review/revision,
  maintenance conflicts and closed jobs. It requires a specifically named local
  database `lab_resources_workspace_test`; fixtures are isolated by UUID.
- Frontend required lint/typecheck/build passed. Lint reports 14 warnings, zero
  errors; production main bundle is approximately 580 kB before gzip. These are
  remaining maintenance/performance items, not a clean-warning claim.
- Existing Phase G frontend checks passed.
- `frontend/test_lab_workspace_e2e.mjs` passed 78 desktop/mobile checks across
  four roles, including language persistence, search, details, pagination and
  route layout. This suite is read-only except authentication and does not prove
  every mutation through browser interaction.
- Independent visual review requested two fixes: localized activity booking
  status and a maintenance filtered-empty state with a View all jobs action.
  Both were implemented. The final independent verdict was ship within the
  reviewed scope; renewed mobile captures include all six resource images.
  Course-status and historical-job empty branches were verified from source,
  since the demo has no populated course group. Final review evidence is under `.impeccable/review/`;
  browser evidence is under `logs/lab-build/` (local, ignored artifacts).

## Local environment and limits

The launcher `backend/scripts/startLocalDemo.mjs` runs against the explicitly
named `lab_resources_local_demo` database. Frontend: port 15181. API: port 15005.
PostgreSQL Docker must be running. Forward migrations were deployed only to the
local demo and the isolated workspace test database; no `prisma db push` was used.

Real room/equipment photos, video and storage credentials are still needed.
Demo resource images are labeled reference media, not photos of this institution.
Follow `docs/DEPLOYMENT.md` for `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`,
`MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`,
`MEDIA_PUBLIC_BASE_URL`, bucket CORS, and allowed external media hosts. Keep
credentials outside Git. A configured live upload has not been verified here.

The locale mechanism is global, but translation completeness is not claimed:
some historical event messages, dynamic text and optional research screens retain
their source language. Stored names, user-entered descriptions and audit evidence
are intentionally preserved. Live SMTP, VNPAY, sensors and production deployment
are outside this verification.

## Design and workflow reference

Consulted official [Agilent iLab equipment scheduling guidance](https://help.ilab.agilent.com/37179-using-a-core/264636-schedule-equipment)
for resource-level scheduling and policy-driven access. The local design uses
that operational clarity while retaining this project's canonical roles,
booking states and laboratory-scoped authorization.
