# Local verified gap matrix — 2026-09-25

## Baseline

- Repository: `https://github.com/phung086/lab-resource-manager`
- Verified source branch: `fix/migration-lineage-provenance`
- Verified source SHA: `0351d99ab74061abada8ea1e8b37108ff63eeb3c`
- Expected reference SHA: `0351d99ab74061abada8ea1e8b37108ff63eeb3c`
- Relationship: same
- Local verification branch: `feature/local-migration-verification`
- Operating system: Windows 10 Home, OS build `10.0.26200`
- Node.js: `v22.15.0`
- npm: `10.9.2`
- Docker Engine: `28.1.1`
- Docker Compose: `v2.35.1-desktop.1`
- PostgreSQL: `16.15`, disposable container `lrm-local-engineering-pg16-test-20260925`

The worktree was clean before verification. No historical migration file was
changed, `prisma db push` was not used, and no shared/development database was
reset.

## Matrix

| ID | Area | Evidence | Local reproduction | Severity | Fix | Test required |
| -- | ---- | -------- | ------------------ | -------- | --- | ------------- |
| LV-01 | Migration provenance | The canonical deploy classifies existing history only after accepted checksum validation. The 14-case PostgreSQL 16 safety matrix passed, including foreign lineage rejection, forged canonical checksum rejection, accepted legacy checksum, artifact tamper, catalog mismatch and future migration. | PASS on `lab_resources_local_test_20260925`; clean deploy and repeat deploy also passed. | P0 resolved | Keep the frozen baseline and accepted checksum contract immutable. | Keep `npm run test:migration-safety` in required CI. |
| LV-02 | Mandatory training | **RESOLVED on `feat/booking-training-eligibility` at `ce47f83`.** Booking authority now checks every configured mandatory course in the booking transaction. Only an active, non-expired certification for the same user/course is accepted. | PASS: 33/33 core tests and 32/32 Batch 4 policy/integration tests on `lab_resources_b4_booking_training_local_test`. | P0 resolved | Keep the shared training eligibility service authoritative. No override was introduced. | Keep unit and PostgreSQL/API coverage for no requirement, valid, missing, expired, revoked, other user, partial multi-course and complete multi-course. |
| LV-03 | Batch 4 full-stack release gate | Calendar resource selection, booking persistence, cancellation, conflict, maintenance conflict and staff/admin visibility ran successfully. At step 5B, `GET /api/resources` and pricing calls returned HTTP 429 after the suite exhausted the default global request limit of 180; the modal then could not show the effective approval badge. | FAIL locally on `lab_resources_b4_booking_local_test`. Backend log proves the immediate cause is rate limiting, not an incorrect persisted lab policy (`resource.requiresApproval=false`, `labPolicy.requiresApproval=true`). | P1 release | Give controlled E2E runs an explicit higher test-only rate-limit configuration, or reduce redundant suite requests without weakening production rate limiting. | Re-run complete Batch 4 E2E under the exact workflow environment and assert persisted `PENDING_APPROVAL`. |
| LV-04 | Batch 6 full-stack release gate | The current IA separates Operations from Telemetry. `MonitoringDashboardPage` hides telemetry details in operations mode, while the old Batch 6 test opens “Bảng điều khiển vận hành” and expects `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, and `NO_DATA` there. Fresh fixture timestamps and database rows were valid. | FAIL locally on `lab_resources_b6_monitoring_local_test` at `Dashboard must show WARNING`. | P1 release | Update the E2E navigation/assertion to open the Telemetry screen for telemetry states. Keep Operations and Telemetry separate. | Batch 6 full-stack E2E with real API/PostgreSQL. |
| LV-05 | Batch 8 smart monitoring gate | The test opens Telemetry, then waits for the Operations heading `Bảng điều khiển vận hành`. Current intentional Telemetry heading differs. | FAIL locally on `lab_resources_b8_monitoring_local_test` with a 30-second heading timeout. | P1 release | Align the stale selector with the current Telemetry heading and semantics. | Full Batch 8 assigned scope, foreign denial, acknowledgement, privacy and mobile E2E. |
| LV-06 | Guest OTP attempts | Prior audit identifies invalid-attempt increment inside a transaction that throws and rolls back. This phase did not run a real SMTP-backed OTP flow. | Source hypothesis retained; live SMTP reproduction not run. | P1 security | Persist failed attempts outside the rolled-back booking transaction; enforce one active challenge, TTL, resend cooldown, email and IP limits. | SMTP-backed isolated integration tests. |
| LV-07 | Guest booking consistency | Prior audit identifies OTP/account mutation and booking creation in separate transactions, with potential partial state. | Not re-executed in this migration/training boundary. | P1 integrity | Use one coherent transaction/orchestration boundary while preserving the database overlap guard. | Conflict, stale quote, policy, training and unavailable-resource rollback cases. |
| LV-08 | Resource history privacy | The audit reports actor identity exposure from authenticated resource history. | Not re-executed in this boundary. | P1 security | Role-aware projection: ordinary users receive anonymized operational history and their own booking details; assigned staff/admin receive full provenance. | Owner, unrelated user, assigned staff, foreign staff and admin API tests. |
| LV-09 | Temporary credentials | `passwordResetRequired` exists, while the audit reports normal authenticated access is not server-gated. | Not re-executed in this boundary. | P1 security | Enforce the approved temporary-credential lifecycle without changing the canonical four roles. | Auth middleware and sensitive-route tests. |
| LV-10 | External integrations | SMTP, VNPAY merchant/IPN, R2/S3 and physical telemetry/camera credentials or hardware were not supplied. | Local software paths only. | External blocker | Preserve fail-closed behavior and verify when real credentials/hardware are available. | Real service/hardware evidence; local fixtures must not be described as production verification. |

## Locally verified flows at this boundary

| Flow | Result | Evidence |
| --- | --- | --- |
| Static backend baseline | PASS | Phase A: 27/27; Phase B after training coverage: 33/33 |
| Static frontend baseline | PASS | lint with 13 existing warnings and zero errors, typecheck, production build |
| Production Compose interpolation | PASS | `.env.production.example` with `docker-compose.prod.yml` |
| Fresh PostgreSQL 16 migration | PASS | canonical frozen baseline and all 13 migrations |
| Repeat migration | PASS | recognized lineage, no pending migrations |
| Migration safety matrix | PASS | 14/14 scenarios |
| Local application startup | PASS | frontend HTTP 200; `/health`, `/api/health`, `/api/health/ready` HTTP 200 |
| Auth browser E2E | PASS | unauthenticated plus all four canonical roles |
| Resource browser E2E | PASS | STUDENT, LECTURER, assigned LAB_STAFF and ADMIN |
| Calendar browser E2E | PARTIAL / FAIL gate | core steps passed; release gate stopped by HTTP 429 at step 5B |
| Operations browser E2E | PASS | approval, handover, return, completion, scope and mobile |
| Monitoring browser E2E | FAIL gate | stale IA expectation on Operations screen |
| Smart monitoring browser E2E | FAIL gate | stale Telemetry heading selector |
| Mandatory training unit matrix | PASS | 6 focused cases included in 33/33 required core tests |
| Mandatory training API/PostgreSQL integration | PASS | Batch 4 suite 32/32 on isolated PostgreSQL 16 |

## Database mutation exception used by the safety fixture

The user explicitly authorized direct `_prisma_migrations` mutation only inside
the migration safety fixture on a disposable PostgreSQL 16 database whose name
contains `_test` or `_ci`. The run used
`lab_resources_local_test_20260925`. The test file asserts the database marker
before resetting the schema. Direct INSERT/UPDATE statements appeared only in
`backend/test/migrationSafetyMatrix.mjs` to construct foreign, forged and
verified-legacy lineage cases. Runtime and canonical deployment code contain no
direct INSERT/UPDATE/DELETE of `_prisma_migrations`; production deployment still
uses Prisma-supported `migrate deploy` and the reviewed baseline-only
`migrate resolve --applied` path.
