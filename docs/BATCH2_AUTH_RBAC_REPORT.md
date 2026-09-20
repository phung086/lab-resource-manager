# Batch 2 Authentication, RBAC, and Ownership Report

## A. Starting state

Batch 1 was treated as closed and its canonical Prisma schema, eight applied migrations, booking state machine, operational-status authority, and PostgreSQL overlap protection were not redesigned. The development database was read only during Batch 2 verification: PostgreSQL 16.14, database `lab_resources`, 5 users, 9 resources, 8 completed migrations, no incomplete migration, no non-normalized email, and exactly 5 resources with `category IS NULL`. Those five values remain unchanged.

The baseline audit found fake frontend authentication, cached-user trust, inconsistent role checks, incomplete admin and staff-assignment APIs, missing booking-detail ownership, public dashboard data, privacy leakage in public schedule projections, permissive production CORS, and incomplete JWT/error behavior.

## B. Skills used

Available global and project-local skills were inspected. No project-local `SKILL.md` exists, and no installed skill specifically targets this Node.js/Express/Prisma access-control implementation. Per the task boundary, visual design skills were not used. Work used repository evidence, Prisma/PostgreSQL tooling, Node's test runner, Supertest, Vite, and Playwright against live local services.

## C. Access-control matrix

Canonical roles are exactly `ADMIN`, `LAB_STAFF`, `LECTURER`, and `STUDENT`. The frozen permission and endpoint matrix is in `docs/BATCH2_ACCESS_CONTROL_MATRIX.md`. Backend middleware is authoritative; frontend visibility is only a usability aid.

## D. Authentication architecture

- Bearer JWT authentication is stateless.
- Tokens are signed and verified with explicit `HS256`, have configured expiry, and contain only subject and role claims.
- Each protected request reloads the user from PostgreSQL and rejects deleted, inactive, or non-canonical users.
- The database role overrides the token role.
- No authentication path falls back to an in-memory user or fabricated success.

## E. Registration policy

`POST /api/auth/register` normalizes email, validates a strict request shape, hashes the password with bcrypt, and always persists `STUDENT`. Requests containing `role` or another unknown privilege-bearing field fail with `VALIDATION_ERROR`. Duplicate email is `409 DUPLICATE_EMAIL`, including concurrent unique-constraint failure.

## F. JWT/session behavior

Malformed or forged tokens return `AUTH_INVALID`; expired tokens return `AUTH_EXPIRED`; a missing token returns `AUTH_REQUIRED`; an inactive database user returns `ACCOUNT_INACTIVE`. `GET /api/auth/me` returns the revalidated database user. `POST /api/auth/logout` acknowledges a valid stateless session with `204`; the frontend then discards its bearer token. Server-side token revocation is not part of the current architecture.

## G. User-management permissions

Only `ADMIN` can list/inspect users, assign one of the four canonical roles, activate/deactivate accounts, list laboratories, and manage staff assignments. Users are preserved rather than deleted. Changing a user away from `LAB_STAFF` removes that user's lab assignments transactionally. An administrator cannot demote or deactivate their own active account.

## H. LAB_STAFF assignment behavior

`UserLabAssignment` is the only source of staff scope. Only an existing `LAB_STAFF` may receive an assignment to an existing laboratory. Duplicate assignments return `409 DUPLICATE_ASSIGNMENT`; missing objects return `NOT_FOUND`. Unassigned staff have no global fallback. Assignment creation, listing, and removal are database-backed and admin-only.

## I. Ownership rules

Booking requester identity always comes from `req.user.id`; client-supplied `requestedById` is rejected. `LECTURER` and `STUDENT` can list, inspect, and cancel only their own eligible bookings. `LAB_STAFF` can operate only on bookings whose resource belongs to an assigned laboratory. `ADMIN` has cross-lab access.

## J. IDOR protections

Cross-owner private booking reads and cancellations return `404 NOT_FOUND`. Foreign-lab staff requests return `403 FORBIDDEN`. Tests cover path parameters, request bodies, query parameters, direct resource IDs, and booking-to-resource indirection. Public resource/calendar projections omit requester identity and private booking titles.

## K. Route authorization matrix

| Route family | Access after Batch 2 | Scope |
|---|---|---|
| `/health`, `/health/ready` | Public | Liveness and real PostgreSQL readiness only |
| `/metrics` | Public at app layer | Deployment/network exposure remains an operations control |
| `/api/auth/register`, `/login` | Public, auth-rate-limited | Strict validation; real database/bcrypt |
| `/api/auth/me`, `/logout`, `/change-password` | Authenticated | Current active database user |
| `/api/users/me` | Authenticated | Own safe profile |
| `/api/users`, `/api/users/:id`, `/api/users/laboratories` | Admin only | Safe projections |
| `/api/users/:id/role`, `/:id/active` | Admin only | Canonical values; self-lockout blocked |
| `/api/users/:id/lab-assignments*` | Admin only | Persisted `UserLabAssignment` |
| `/api/resources`, `/api/resources/:id` | Public | Safe resource and schedule projection |
| `/api/resources/:id/status` | Admin or lab staff | Assigned laboratory for staff |
| `/api/calendar/slots` | Public | Availability without private identity |
| `/api/bookings`, `/my-bookings`, `/:id` | Authenticated | Admin all; staff assigned labs; others own |
| `/api/bookings` POST | Authenticated | Requester forced to current user |
| Booking approve/reject/check-out/return/complete | Admin or lab staff | Booking resource laboratory |
| Booking cancel | Authenticated | Admin all; staff assigned labs; others own |
| `/api/maintenance` GET | Authenticated | Staff list projected to assigned labs |
| `/api/maintenance` POST/PATCH | Admin or lab staff | Current and target resource labs |
| `/api/dashboard` | Admin or lab staff | Global for admin; assigned labs for staff |
| `/api/notifications*` | Authenticated | Current user's notifications only |
| Payment, AI, analytics, assistant routers | Unmounted | Preserved optional code, not an active API |

Only canonical `/api` mounts are active. Legacy unprefixed aliases and duplicate transaction handlers are absent.

## L. API error contract

Errors use one shape: `{ "error": { "code", "message", "details" } }`. Implemented stable codes include `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_EXPIRED`, `ACCOUNT_INACTIVE`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DATABASE_UNAVAILABLE`, and `BOOKING_CONFLICT`, plus narrow domain codes such as `DUPLICATE_EMAIL`, `DUPLICATE_ASSIGNMENT`, and `SELF_LOCKOUT_FORBIDDEN`. JWT, SQL, Prisma internals, and stack traces are not returned to clients.

## M. Frontend auth integration

Login and registration call the live API. Startup treats authentication as unknown until `/api/auth/me` succeeds; cached profile data alone never authenticates. A `401` clears the stored token/profile and emits a session-invalid event. Navigation and tab guards use uppercase canonical roles. The admin user screen reads and mutates real user and assignment data. Core-load failure is explicit and does not substitute mock data.

## N. Password/account security

Password change requires authentication, verifies the current bcrypt hash, rejects reuse of the current password, hashes the new password, and returns explicit errors. There is no fake-success modal. Password reset/email recovery was not introduced because it is outside the approved Batch 2 scope.

## O. Security middleware

Helmet, a bounded JSON body size, global rate limiting, and a stricter auth rate limiter are active. Production CORS accepts only configured explicit origins and returns `403` otherwise. `trust proxy` is opt-in. Production startup validates PostgreSQL URL, non-placeholder JWT and telemetry secrets, explicit CORS origins, and first-admin configuration. `/health/ready` executes a real database probe.

Production smoke result: allowed origin `200` with the expected ACAO header, denied origin `403`, Helmet `nosniff` present, and PostgreSQL readiness `200`.

## P. Backend integration tests

- Batch 2 isolated PostgreSQL integration: `10/10` passed.
- Covered registration, duplicate/privileged registration, login, invalid credentials, inactive account, forged/expired JWT, `/auth/me`, logout, admin APIs, canonical role validation, self-lockout, persisted lab assignments, unassigned/foreign-lab denial, ownership, requester forgery, immediate deactivation, password change, protected routes, and public projection privacy.
- Test database guard allows only localhost and names matching `lab_resources_b2_auth_*`; the development database is explicitly prohibited.

## Q. Frontend E2E results

Live Playwright E2E passed against the isolated PostgreSQL backend and Vite frontend for unauthenticated access plus `STUDENT`, `LAB_STAFF`, `ADMIN`, and `LECTURER`. It verified login, role-specific navigation, real admin user data, `/auth/me` after reload, logout, token removal, and protected-route inaccessibility.

## R. Regression results

- Core backend suite: `27/27` passed.
- Batch 1 canonical persistence and real concurrency: `2/2` passed.
- Batch 1E isolated runtime: `11/11` passed.
- Batch 2 integration: `10/10` passed.
- Frontend production build: passed; only the existing bundle-size warning remains.
- Backend production startup, readiness, CORS, and Helmet smoke: passed.

## S. Known limitations

- Stateless access tokens cannot be revoked individually before expiry; deactivation/deletion still takes effect on the next request because the database user is revalidated.
- PostgreSQL has no general-purpose admin audit model in the frozen Batch 1 schema. Booking/maintenance actions retain their existing persisted history, but user role, activation, and assignment changes do not yet have a dedicated durable audit record. Adding one requires an explicitly approved forward migration; fake or semantically incorrect `UsageLog` records were not created.
- `/metrics` is public at the Express layer and should be restricted by deployment/network policy before an internet-facing deployment.
- The active calendar component still contains legacy static demonstration content. Calendar/resource workflow completion belongs to later core batches and was not expanded in this access-control batch.
- The production bundle is larger than Vite's 500 kB warning threshold; code splitting is a later performance task.

## T. Optional/research debt

Eleven optional/research test files still import removed modules: `concurrency.test.js`, `conflictForecasting.test.js`, `geneticScheduler.test.js`, `hybridDispatch.test.js`, `integrations.test.js`, `mqttTelemetry.test.js`, `multiObjectiveAndBenchmark.test.js`, `optimization.test.js`, `orchestrationV2.test.js`, `reputationScore.test.js`, and `services.test.js`. They require an explicit later decision of `RESTORE`, `REWRITE`, `FEATURE_FLAG`, or `RETIRE`; they must not be restored merely to make tests green.

Legacy payment code still references `mockStore`, but payment/AI/research routers are unmounted and cannot produce production-core responses. Advanced modules remain preserved and do not block the graduation workflow.

## U. Files modified

Batch 2 modified or added:

- `backend/package.json`
- `backend/scripts/seedBatch2E2E.mjs`
- `backend/src/app.js`
- `backend/src/constants/roles.js`
- `backend/src/middleware/auth.js`
- `backend/src/middleware/errors.js`
- `backend/src/middleware/labScope.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/bookings.js`
- `backend/src/routes/calendar.js`
- `backend/src/routes/dashboard.js`
- `backend/src/routes/maintenance.js`
- `backend/src/routes/notifications.js`
- `backend/src/routes/payments.js`
- `backend/src/routes/resources.js`
- `backend/src/routes/users.js`
- `backend/src/services/availabilityService.js`
- `backend/src/services/bookingService.js`
- `backend/test/batch1e/integration.runtime.test.js`
- `backend/test/batch1e/labScope.test.js`
- `backend/test/batch1e/postcutover.smoke.test.js`
- `backend/test/batch2.auth-rbac.integration.test.js`
- `backend/test/helpers/batch2Database.js`
- `frontend/package.json`
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `frontend/src/components/AccessUserManagement.tsx`
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/AuthLoginView.tsx`
- `frontend/src/components/AuthRegisterView.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/SmartCalendarView.tsx`
- `frontend/test_batch2_auth_e2e.mjs`
- `docs/BATCH2_ACCESS_CONTROL_MATRIX.md`
- `docs/BATCH2_AUTH_RBAC_REPORT.md`

Batch 2 did not modify `backend/prisma/schema.prisma`, migration files, or the five `NULL` resource categories. Existing dirty Batch 1 artifacts remain separate.

## V. GO / NO-GO recommendation for Batch 3

**GO for Batch 3 Resource Management.** All required Batch 2 correctness and security gates pass, and no active core authentication fallback remains. Batch 3 should retain the canonical middleware, ownership rules, error contract, isolated-database test guards, and no-fake-success rule. The dedicated administrative audit model and legacy calendar demonstration data remain explicit future core debt and should be scheduled through approved schema/workflow work rather than silently improvised in Batch 2.
