# Local engineering verification

## Phase A — migration provenance

**PHASE:** A — migration provenance  
**BASE BRANCH:** `fix/migration-lineage-provenance`  
**BASE/VERIFIED HEAD:** `0351d99ab74061abada8ea1e8b37108ff63eeb3c`  
**LOCAL VERIFICATION BRANCH:** `feature/local-migration-verification`

### Environment

- OS: Windows 10 Home, build `10.0.26200`
- Node.js: `v22.15.0`
- npm: `10.9.2`
- PostgreSQL: `16.15` in disposable container
  `lrm-local-engineering-pg16-test-20260925`
- Docker Engine: `28.1.1`
- Docker Compose: `v2.35.1-desktop.1`

### Changes

No runtime, schema, baseline or historical migration change was needed in this
verification phase. The phase added local verification documentation after
re-running the current source.

### Database impact

- Clean local demo and isolated test databases were created only inside the
  disposable PostgreSQL 16 container.
- Historical migration files modified: NO.
- Direct production/runtime `_prisma_migrations` mutation: NO.
- `prisma db push`: NO.
- Shared/development database reset: NO.
- Safety-fixture exception: direct lineage-row mutation occurred only in
  `backend/test/migrationSafetyMatrix.mjs` on
  `lab_resources_local_test_20260925`, as explicitly authorized.

### Business rules

Canonical roles, booking statuses, resource categories, physical operational
states, half-open interval semantics and database overlap protection were not
changed.

### Security impact

Existing-lineage migration rows are accepted only when name, order, completion
state and recorded checksum match the accepted provenance contract. Forged
canonical names with the wrong checksum fail before `migrate deploy`.

### Tests run

| Test | Result |
| --- | --- |
| `backend npm ci` | PASS; 0 vulnerabilities |
| `frontend npm ci` | PASS; 0 vulnerabilities |
| `backend npm run db:generate` | PASS |
| `backend npm run lint` | PASS |
| `backend npm run verify:prod-config` | PASS |
| `backend npm test` | PASS, 27/27 |
| `frontend npm run lint` | PASS, 0 errors and 13 existing warnings |
| `frontend npm run typecheck` | PASS |
| `frontend npm run build` | PASS |
| Production Compose config | PASS |
| Fresh canonical deploy on PostgreSQL 16 | PASS |
| Repeat canonical deploy | PASS |
| `backend npm run test:migration-safety` | PASS, 14/14 scenarios |
| Local frontend/API/readiness smoke | PASS |
| Batch 2 auth browser E2E | PASS |
| Batch 3 resource browser E2E | PASS |
| Batch 4 calendar browser E2E | FAIL at step 5B after HTTP 429 rate limit |
| Batch 5 operations browser E2E | PASS |
| Batch 6 monitoring browser E2E | FAIL due stale Operations/Telemetry expectation |
| Batch 8 smart-monitoring browser E2E | FAIL due stale Telemetry heading selector |

### Migration safety cases

| Case | Result |
| --- | --- |
| Fresh PostgreSQL 16 deployment | PASS |
| Idempotent repeat deployment | PASS |
| Interrupted resolve after three migrations | PASS |
| Legitimate existing lineage and forward migration | PASS |
| Unknown table | PASS — rejected |
| Foreign Prisma history | PASS — rejected |
| Canonical name with forged checksum | PASS — rejected |
| Verified legacy checksum | PASS — accepted |
| Empty Prisma history | PASS — rejected |
| Non-table public object | PASS — rejected |
| Tampered frozen baseline | PASS — rejected |
| Tampered historical migration | PASS — rejected |
| Catalog fingerprint mismatch | PASS — rejected before resolve |
| Future forward migration | PASS |

### External blockers

- SMTP: PENDING EXTERNAL CREDENTIALS
- VNPAY: PENDING EXTERNAL CREDENTIALS and reachable IPN
- R2/S3: PENDING EXTERNAL CREDENTIALS
- Telemetry/camera hardware: PENDING REAL HARDWARE

### Screenshots

Browser suites generated local screenshots during verification. Tracked
screenshot artifacts were restored to their exact HEAD versions after review;
no screenshot churn is included in this phase.

### Known limitations

At the Phase A head, booking authority still lacked mandatory training
enforcement; Phase B below resolves that P0 gap. Three release/full-stack gates
remain red for the locally reproduced reasons recorded in
`docs/LOCAL_VERIFIED_GAP_MATRIX_20260925.md`.

### Next phase

Phase B — verify and complete mandatory booking training eligibility on the
existing descendant branch `feat/booking-training-eligibility`. No training
override will be invented.

## Phase B — mandatory booking training eligibility

**PHASE:** B — LAB safety eligibility  
**BASE BRANCH:** `fix/migration-lineage-provenance`  
**BASE SHA:** `0351d99ab74061abada8ea1e8b37108ff63eeb3c`  
**WORK BRANCH:** `feat/booking-training-eligibility`  
**VERIFIED BRANCH HEAD BEFORE LOCAL REPORT:** `ce47f839023dd68f848f398abf31c531de98cefe`

### Changes

- Added one authoritative training eligibility service shared by booking and
  assistant eligibility projection.
- Booking creation now evaluates configured mandatory requirements inside the
  existing booking transaction.
- A certification qualifies only when it belongs to the requester and required
  course, has `active` status, and has no expiry or expires strictly after the
  evaluation time.
- Missing, expired, revoked, wrong-user and incomplete multi-course training
  return `403 BOOKING_TRAINING_REQUIRED` with the missing course list.
- No training requirement preserves existing booking behavior.
- No staff/admin override was invented; D-02 remains an open business decision.
- Batch 4's database helper now honors an explicitly supplied `DATABASE_URL`,
  allowing the guarded suite to use an isolated PostgreSQL instance on a
  non-default local port instead of silently falling back to `.env` port 5432.

### Database impact

No Prisma schema or migration change. The implementation reads existing
`training_requirements` and `user_certifications` rows. Historical migrations,
the frozen baseline and shared/development databases were untouched.

### Business and security impact

Mandatory training is now an enforced server-side booking precondition. Client
visibility and assistant advice are informational; they do not replace the
booking service check. The change closes the verified P0 path that allowed an
untrained user to reserve restricted equipment.

### Tests run

| Test | Result |
| --- | --- |
| Backend lint | PASS |
| Required backend core | PASS, 33/33 |
| Batch 4 policy + PostgreSQL integration | PASS, 32/32 |
| Missing all mandatory courses | PASS — rejected with 403 |
| One course active, one revoked | PASS — rejected with missing course |
| Both mandatory courses active | PASS — booking created |
| Certification belongs to another user | PASS — rejected |
| No mandatory requirement | PASS — eligible |
| Expired certification | PASS — rejected |

### Known limitations

- Resource-to-course configuration remains an administrator/business-owner
  responsibility; the implementation does not guess which equipment requires
  training.
- A training override policy is not approved, so no override exists.
- The three locally reproduced release/E2E gaps LV-03 through LV-05 remain for
  the separately scoped Phase D.

### Next phase

Per the requested phase boundary, stop after opening the Phase B pull request.
The next recommended phase is Phase C guest identity/OTP consistency and must
begin from the accepted Phase B head.

## Phase C — release gate reliability

**PHASE:** C — required CI and browser release gates

**BASE BRANCH:** `feat/booking-training-eligibility`

**BASE SHA:** `91f9d0892a2bcd160cf20917660b92ee58a11ab4`

**WORK BRANCH:** `fix/release-gate-reliability`

### Previous red-gate evidence

The Phase B head completed 10 of 13 GitHub jobs. Both full-stack chains and the
smart-monitoring browser job were red. Local reproduction preserved the exact
causes instead of changing product behavior:

- Batch 4 consumed the global 180-request window across sequential browser
  contexts. The first rejected calls were `GET /api/resources` and
  `GET /api/booking-pricing/:resourceId`, with HTTP 429,
  `X-RateLimit-Limit: 180`, remaining 0 and `Retry-After`.
- Batch 6 opened the Operations Dashboard and expected telemetry-only states
  that the approved split IA renders on the Telemetry page.
- Batch 8 clicked Telemetry correctly but waited for the old Operations heading.

### Changes

- Batch 6 now opens `Giám Sát Telemetry` before asserting source scope,
  `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, `NO_DATA`, truthful missing-data
  text and mobile telemetry cards.
- Batch 8 waits for the semantic `Giám sát telemetry` heading. Alert
  acknowledgement, source health, camera truthfulness, denial and mobile
  assertions remain intact.
- The Batch 5 and Batch 6 full-stack workflow processes set
  `RATE_LIMIT_MAX=1000` next to `NODE_ENV=test`. Each suite already starts a
  fresh backend process, so limiter state is isolated between suites. Runtime
  code, the secure default of 180 and production configuration are unchanged.

### Local verification

| Gate | Result |
| --- | --- |
| Backend generate, lint and production config | PASS |
| Required backend core | PASS, 33/33 |
| Batch 4 policy + PostgreSQL integration | PASS, 32/32 |
| Migration safety matrix | PASS, 14/14 |
| Frontend lint | PASS, 0 errors and 13 existing warnings |
| Frontend typecheck and production build | PASS |
| Batch 2 auth E2E | PASS |
| Batch 3 resource E2E | PASS |
| Batch 4 calendar E2E | PASS twice consecutively on one backend process |
| Batch 5 operations E2E | PASS |
| Batch 6 monitoring E2E | PASS |
| Batch 8 smart-monitoring E2E | PASS |
| 1440, 1280, 768, 390 and 360 viewport smoke | PASS |

The viewport smoke covered the public resource catalog, booking calendar,
staff booking operations and Telemetry page, including horizontal-overflow
checks. Browser suites rewrote tracked screenshots during execution; those
generated files were restored and are not part of this change.

### Database and product impact

All browser runs used new disposable PostgreSQL 16 databases ending in
`_test`. No schema, migration, training policy, booking policy, route, heading
or runtime limiter implementation changed. No `prisma db push` was used, and
no production/runtime code directly wrote `_prisma_migrations`.

### GitHub status

Release candidate `ba302e13eec39bf7d5c4670a7fdec2286fa8f371` completed
13/13 checks successfully. Pull-request path filters started ten jobs; the
three backend-regression workflows were explicitly dispatched on the same SHA
to preserve the requested full matrix.

| Workflow run | Jobs | Conclusion |
| --- | --- | --- |
| `36137301540` | backend, frontend, docker, fresh-database, migration-safety | SUCCESS |
| `36137301542` | Batch 6 fullstack-e2e | SUCCESS |
| `36137301620` | Batch 5 fullstack-e2e | SUCCESS |
| `36137301560` | required-regression, smart-monitoring-e2e | SUCCESS |
| `36137301578` | production-like-demo | SUCCESS |
| `36137371600` | backend-regression | SUCCESS |
| `36137374819` | backend-regression | SUCCESS |
| `36137378056` | backend-regression | SUCCESS |

This chronology commit changes documentation only. Its resulting final SHA is
also required to complete the same 13/13 matrix before Phase C is declared
complete; the final SHA is reported with the pull request evidence.

## Phase D — guest booking, OTP, and identity integrity

**BASE BRANCH:** `fix/release-gate-reliability`

**BASE SHA:** `eb6a6876be2797d0b9903694e377c8e78497c487`

**WORK BRANCH:** `fix/guest-booking-integrity`

### Before

The pre-change guest service incremented `EmailOtp.attempts` and then threw in
the same Prisma transaction, so an invalid attempt rolled back. Repeated sends
created multiple outstanding challenges. Successful OTP verification and
account provisioning committed before the authoritative `createBooking`
transaction, leaving a consumed OTP and created/rewritten user when conflict,
training, quote, policy, resource, or database booking checks failed. Existing
users were rewritten from the public payload, including changing trusted
`INTERNAL` classification to `EXTERNAL`. Guest completion also issued a normal
JWT for every matching email, and `passwordResetRequired` had no backend gate.

| Scenario | OTP state before fix | User state before fix | Booking state before fix | Result before fix | Required result |
| --- | --- | --- | --- | --- | --- |
| Valid send | New hashed row | unchanged | unchanged | success only with required SMTP | one active challenge |
| Wrong OTP | increment attempted, then rolled back | unchanged | none | `OTP_INVALID`, attempts remained 0 | persist attempt |
| Five wrong OTPs | attempts remained below limit | unchanged | none | effective lock not reached | fifth failure locks |
| Expired OTP | outstanding expired row | unchanged | none | generic invalid response | `OTP_EXPIRED` |
| Resend | another outstanding row | unchanged | none | multiple active challenges | old challenge invalidated |
| Old OTP after resend | old row still outstanding | could proceed | could be created | old OTP could still validate | old OTP rejected |
| Successful OTP | consumed before booking | created/rewritten | second transaction | partial state possible | one atomic outcome |
| New external user | consumed | new `EXTERNAL`, phone password, reset flag | later transaction | normal JWT issued | restricted setup session |
| Existing EXTERNAL | consumed | submitted profile overwrote stored profile | later transaction | normal JWT issued | reuse without overwrite or OTP login |
| Existing INTERNAL | consumed | silently changed to `EXTERNAL` | later transaction | trusted identity lost | preserve `INTERNAL` |
| Conflict/stale quote/resource/training failure | already consumed | create/update already committed | rejected | harmful partial state | roll back OTP/account |
| Invalid address | unchanged | unchanged | none | rejected before transaction | preserve behavior |
| SMTP unavailable | created row deleted | unchanged | none | fail closed | fail closed, retain audit row as consumed |

### After

- A PostgreSQL transaction-scoped advisory lock serializes each normalized
  `email + purpose` identity for send, resend, attempt, and consumption.
- A 60-second per-email cooldown applies in addition to the existing route/IP
  limiter. Resend consumes prior outstanding rows, preserves them as evidence,
  creates one new challenge, and resets attempts.
- Invalid verification returns an outcome from the transaction. This commits
  the atomic attempt increment before the route throws the stable API error.
- Valid OTP verification, new-account provisioning, address persistence,
  authoritative booking creation, and OTP consumption now commit in one
  database transaction. `createBookingWithTransaction` is the sole booking
  rule path; `createBooking` remains a compatibility wrapper.
- Existing accounts are reused without profile, address, password, reset flag,
  role, or `customerType` overwrite. Existing users receive no OTP-derived JWT
  and must use their established login.
- New quick-booking accounts retain the approved phone-based temporary
  credential, receive a normal signed JWT with a server-enforced restricted
  state, and may use only profile/me, password change, and logout until reset.
- OTP is generated with `crypto.randomInt`, stored only as HMAC-SHA256, compared
  with `timingSafeEqual`, expires after ten minutes, permits five failures, and
  is single-use. Plaintext interception exists only behind `NODE_ENV=test`.

### PostgreSQL 16 evidence

Primary guest database: `lab_resources_guest_phase_d_test`. The database name
contains `_test`, was created inside disposable container
`lrm-local-engineering-pg16-test-20260925`, and reported PostgreSQL 16.x.
Guest integration passed 13/13 assertions, including hashed storage, persistent
attempts, fifth-attempt lock, expiration, resend, single use, new/existing
identity behavior, temporary credential restriction, conflict/training/stale
quote/unavailable/database rollback, address failures, SMTP failure, retry, and
simultaneous consumption.

| Gate | Result |
| --- | --- |
| Migration safety | PASS, 14/14 |
| Required core | PASS, 33/33 |
| Batch 1E | PASS, 11/11 |
| Batch 2 backend | PASS, 10/10 |
| Batch 3 backend | PASS, 9/9 |
| Batch 4 policy/PostgreSQL | PASS, 32/32 |
| Batch 5 backend | PASS, 13/13 |
| Batch 6 backend | PASS, 11/11 |
| Batch 7 backend | PASS, 6/6 |
| Batch 8 backend | PASS, 12/12 |
| Guest integrity/PostgreSQL | PASS, 13/13 |
| Backend lint / production config | PASS / PASS |
| Frontend lint / typecheck / build | PASS with 13 existing warnings / PASS / PASS |
| Browser Batch 2/3/4/5/6/8 | PASS / PASS / PASS / PASS / PASS / PASS |

No Prisma schema change or migration was needed. Historical migrations and the
frozen baseline were unchanged; `prisma db push` was not used. The migration
safety matrix used `lab_resources_migration_phase_d_test`. Its direct
`_prisma_migrations` fixture writes remained confined to
`backend/test/migrationSafetyMatrix.mjs`; runtime and production deployment
code contain no direct writes to that table.

### Limitations and decisions

Real SMTP credentials were not supplied, so local delivery was verified with
an explicit test-only interceptor and the production path was verified to fail
closed without SMTP. D-03 remains open: self-declared `customerType` exists in
registration/profile, but current pricing, access, training, quota, and booking
authority do not consume it. Existing external profile updates from a public
guest submission are intentionally disabled pending an approved policy.
