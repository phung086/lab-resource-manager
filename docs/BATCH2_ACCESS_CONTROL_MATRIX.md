# Batch 2 Access Control Matrix

## 1. Scope and authority

This document freezes the Batch 2 authentication, authorization, ownership, and laboratory-scope contract. Authority order is the official graduation assignment, `PRODUCT.md`, Batch 0/1 documentation, the canonical Prisma schema, then the active runtime.

Batch 2 does not change Prisma schema or migration history, classify the five resources whose `category` is `NULL`, implement Batch 3 resource CRUD, or restore optional/research modules. The eleven tests that import removed optional/research services remain separately tracked debt.

## 2. Canonical roles

Runtime roles are exactly:

- `ADMIN`
- `LAB_STAFF`
- `LECTURER`
- `STUDENT`

Lowercase role aliases and `INSTRUCTOR` are invalid. The database role is authoritative on every authenticated request; a role claim in a JWT never grants access by itself.

## 3. Access classes

| Class | Meaning |
|---|---|
| `PUBLIC` | No identity required; response contains no private user data. |
| `AUTHENTICATED` | Valid JWT plus active canonical database user required. |
| `OWNER` | Authenticated user may access only an object owned by their database user ID. |
| `LAB_SCOPED` | `LAB_STAFF` must have a persisted `UserLabAssignment` for the object's resource laboratory. No assignment means no access. |
| `STAFF_ONLY` | `ADMIN` or `LAB_STAFF`; staff scope still applies to `LAB_STAFF`. |
| `ADMIN_ONLY` | Canonical `ADMIN` only. |

Private cross-owner object access returns `404 NOT_FOUND` to avoid leaking object existence. A known staff action outside the staff member's assigned laboratory returns `403 FORBIDDEN`. Missing or invalid scope input fails closed with `400 VALIDATION_ERROR`; it never bypasses scope validation.

## 4. Canonical permission matrix

| Required operation | ADMIN | LAB_STAFF | LECTURER | STUDENT |
|---|---:|---:|---:|---:|
| Register own account | Public request creates `STUDENT` only | Public request creates `STUDENT` only | Public request creates `STUDENT` only | Yes |
| Login / own profile / logout | Yes | Yes | Yes | Yes |
| List and inspect users | All users | No | No | No |
| Activate/deactivate user | Yes | No | No | No |
| Assign canonical user role | Yes | No | No | No |
| Manage staff-to-lab assignments | Yes | No | No | No |
| View permitted resource catalog/status | Yes | Yes | Yes | Yes |
| Manage resource operational status | All labs | Assigned labs | No | No |
| View booking calendar/availability | Yes | Yes | Yes | Yes |
| Create booking | Own identity | Own identity | Own identity | Own identity |
| View booking list/detail | All | Assigned labs | Own | Own |
| Cancel eligible booking | All | Assigned labs | Own | Own |
| Approve/reject booking | All | Assigned labs | No | No |
| Handover/check-out/return/complete | All | Assigned labs | No | No |
| View maintenance windows | Yes | Yes | Yes | Yes |
| Create/update maintenance | All labs | Assigned labs | No | No |
| View/update own notifications | Own | Own | Own | Own |
| Operational dashboard | All labs | Assigned-lab projection | No | No |
| Payment/AI/research operations | Optional, outside Batch 2 | Optional, outside Batch 2 | Optional, outside Batch 2 | Optional, outside Batch 2 |

`LECTURER` and `STUDENT` intentionally share the Batch 2 booking permissions. Any later distinction requires an approved business rule, not an inferred privilege.

## 5. Active core route matrix

Canonical API names use the `/api` prefix. Existing unprefixed mounts are compatibility debt and must not be used by new frontend calls.

| Method | Canonical endpoint | Required access | Object rule | Baseline finding (pre-implementation) |
|---|---|---|---|---|
| GET | `/health` | PUBLIC | Liveness only | Correct |
| GET | `/health/ready` | PUBLIC | Real PostgreSQL probe | Correct |
| GET | `/metrics` | PUBLIC deployment policy | No user records | Mounted; deployment exposure remains an ops concern |
| POST | `/api/auth/register` | PUBLIC | Always creates `STUDENT`; reject privilege fields | Role is forced but unknown role fields are silently stripped; normalization missing |
| POST | `/api/auth/login` | PUBLIC + auth rate limit | Active canonical DB user | Real DB/bcrypt; error codes and normalization incomplete |
| POST | `/api/auth/logout` | AUTHENTICATED | Stateless acknowledgement; client clears bearer | Missing |
| GET | `/api/auth/me` | AUTHENTICATED | Current DB user only | Present |
| GET | `/api/users/me` | AUTHENTICATED | Current DB user only | Present duplicate profile route |
| GET | `/api/users` | ADMIN_ONLY | All users | Present |
| GET | `/api/users/:id` | ADMIN_ONLY | Single user, safe projection | Missing |
| PATCH | `/api/users/:id/role` | ADMIN_ONLY | Canonical role only | Present; assignment invariants incomplete |
| PATCH | `/api/users/:id/active` | ADMIN_ONLY | Preserve referenced user; no delete | Present |
| GET | `/api/users/:id/lab-assignments` | ADMIN_ONLY | Persisted assignments | Missing |
| POST | `/api/users/:id/lab-assignments` | ADMIN_ONLY | Target must be `LAB_STAFF`; lab must exist | Missing |
| DELETE | `/api/users/:id/lab-assignments/:laboratoryId` | ADMIN_ONLY | Idempotent/not-found policy explicit | Missing |
| GET | `/api/resources` | PUBLIC | Catalog and operational state only | Present |
| GET | `/api/resources/:id` | PUBLIC | Resource and non-private schedule data only | Present; currently returns booking records and must use a safe projection |
| PATCH | `/api/resources/:id/status` | STAFF_ONLY + LAB_SCOPED | `ADMIN` all; staff assigned lab | Present |
| GET | `/api/calendar/slots` | PUBLIC | Availability; no private booker identity | Present but leaks title/booker and cannot identify caller because auth is absent |
| GET | `/api/bookings` | AUTHENTICATED | Admin all; staff assigned labs; others own | Present |
| GET | `/api/bookings/my-bookings` | AUTHENTICATED + OWNER | Current DB user only | Present |
| GET | `/api/bookings/:id` | AUTHENTICATED | Admin all; staff assigned lab; others owner, otherwise 404 | Missing |
| POST | `/api/bookings` | AUTHENTICATED | `requestedById` always `req.user.id` | Present; negative forgery test required |
| POST | `/api/bookings/:id/approve` | STAFF_ONLY + LAB_SCOPED | Booking resource lab | Present |
| POST | `/api/bookings/:id/reject` | STAFF_ONLY + LAB_SCOPED | Booking resource lab | Present |
| POST | `/api/bookings/:id/check-out` | STAFF_ONLY + LAB_SCOPED | Booking resource lab | Present |
| POST | `/api/bookings/:id/return` | STAFF_ONLY + LAB_SCOPED | Booking resource lab | Present |
| POST | `/api/bookings/:id/complete` | STAFF_ONLY + LAB_SCOPED | Booking resource lab | Present |
| POST | `/api/bookings/:id/cancel` | AUTHENTICATED | Admin all; staff assigned lab; others owner | Present; response policy/test coverage incomplete |
| GET | `/api/maintenance` | AUTHENTICATED | Read-only schedule | Present |
| POST | `/api/maintenance` | STAFF_ONLY + LAB_SCOPED | Body `resourceId` | Present; scope middleware currently fails open on missing ID |
| PATCH | `/api/maintenance/:id` | STAFF_ONLY + LAB_SCOPED | Current and target resource labs | Present with manual target check; current-resource check must be explicit |
| GET | `/api/notifications` | AUTHENTICATED + OWNER | Own notifications | Correct |
| POST | `/api/notifications/read-all` | AUTHENTICATED + OWNER | Own notifications | Correct |
| POST | `/api/notifications/:id/read` | AUTHENTICATED + OWNER | Own notification, otherwise 404 | Correct |
| GET | `/api/dashboard` | STAFF_ONLY | Admin all; staff assigned-lab projection | Currently PUBLIC and global |

## 6. Mounted optional routes

These routes are not graduation-core deliverables and are not made complete in Batch 2. They still cannot remain unprotected when mounted.

| Route family | Current state | Batch 2 security boundary |
|---|---|---|
| `/api/payments/*` | Public, includes mock confirmation and ledgers | Keep source preserved but unmount the router until its legacy persistence and fake-success paths are reconciled. No payment workflow expansion. |
| `/api/admin/transactions` | Public direct handler | Remove the duplicate direct handler; no payment ledger is mounted in Batch 2. |
| `/api/ai/*` | Public optional endpoints | Keep source preserved but unmounted. No AI implementation work. |
| `analytics` | File exists, not mounted, uses lowercase roles | Leave unmounted; track for `RESTORE`, `REWRITE`, `FEATURE_FLAG`, or `RETIRE`. |
| `assistant` | File exists, not mounted | Leave unmounted; track as optional debt. |

## 7. Confirmed defects and implementation decisions

| Severity | Defect | Evidence | Target |
|---|---|---|---|
| Critical | Public global dashboard and public transaction ledgers | `backend/src/routes/dashboard.js`, `backend/src/routes/payments.js`, `backend/src/app.js` | Backend role middleware and lab-scoped data |
| Critical | Active frontend login/register create fake JWT/users | `frontend/src/components/AuthLoginView.tsx`, `AuthRegisterView.tsx` | Real API only; explicit failures |
| Critical | Frontend accepts cached user as authenticated without `/auth/me` | `frontend/src/App.jsx`, `frontend/src/api.js` | Bootstrap from server; clear invalid/inactive session |
| High | CORS accepts denied production origins | `backend/src/app.js` callback allows both branches | Reject origin not in configured allowlist |
| High | No login-specific rate limit | `backend/src/app.js`, `backend/src/routes/auth.js` | Small dedicated auth limiter plus existing global limiter |
| High | JWT algorithm not explicit and expiration has no distinct code | `backend/src/middleware/auth.js` | Sign/verify `HS256`; `AUTH_EXPIRED` vs `AUTH_INVALID` |
| High | Inactive/forbidden codes compete with canonical contract | auth middleware/routes | `ACCOUNT_INACTIVE`, `FORBIDDEN` |
| High | Staff scope helper fails open when resource ID is absent | `backend/src/middleware/labScope.js` | Fail closed and support path/body/query extraction as tested |
| High | User detail and lab-assignment admin APIs are absent | `backend/src/routes/users.js` | DB-backed admin-only endpoints |
| High | Booking detail ownership endpoint is absent | `backend/src/routes/bookings.js` | Object-level policy with 404 for cross-owner access |
| High | Public resource/calendar responses expose booking/requester details | resources/calendar routes | Safe public projections; no private identity/title leakage |
| High | Frontend canonical role checks use lowercase values | `frontend/src/App.jsx`, active user/admin components | Uppercase constants only in active core auth flow |
| High | Core data load silently substitutes mock data | `frontend/src/App.jsx` | Explicit unavailable/error state; never fake success |
| Medium | Email is not normalized | auth route | Trim/lowercase before lookup/create |
| Medium | Register silently strips attempted privileged role | Zod default unknown-key behavior | Strict request schema; privilege attempt returns validation error |
| Medium | API client reads the wrong error shape | `frontend/src/api.js` | Read canonical `body.error.{code,message,details}` |
| Medium | No stateless logout endpoint | auth route | Authenticated `204` endpoint; token invalidation limitation documented |

## 8. Stable API error contract

Every API error uses:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permission",
    "details": {}
  }
}
```

Required codes are `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_EXPIRED`, `ACCOUNT_INACTIVE`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DATABASE_UNAVAILABLE`, and existing `BOOKING_CONFLICT`. Domain-specific not-found codes may be normalized to `NOT_FOUND` in Batch 2-owned endpoints. Raw JWT, SQL, Prisma internals, and stack traces never reach clients.

## 9. Frontend enforcement contract

- Authentication starts in an indeterminate bootstrap state and calls real `/api/auth/me` when a token exists.
- A missing, invalid, expired, deleted-user, or inactive-user session clears local storage and renders login.
- Login and registration components call the real API and do not create local users or tokens.
- Navigation filtering uses canonical uppercase roles and is only a usability aid.
- Selecting or deep-linking a forbidden tab renders a clear forbidden state or redirects to the first permitted core tab.
- Core API failure renders an explicit unavailable/error state. Mock datasets are never substituted for active core data.
- Logout calls the stateless backend endpoint when possible, always clears the local bearer, and makes protected content inaccessible.

## 10. Verification gates

Implementation must pass real PostgreSQL integration tests for auth, canonical RBAC, user management, lab assignments, ownership, body/query/path/resource-indirection scope, immediate deactivation, forged/expired JWTs, and requester forgery. Frontend E2E must use the live backend for `STUDENT`, `LAB_STAFF`, and `ADMIN` (plus `LECTURER` when fixture-backed), including reload and logout.

Batch 1 persistence and concurrency regressions remain mandatory. Optional/research missing-module failures are reported separately and do not block Batch 2.

## 11. Closure status

The baseline findings in section 5 are retained as audit evidence. The Batch 2 implementation closes them as follows:

- Authentication is database-backed, uses normalized email, bcrypt, signed `HS256` JWTs, expiration checks, and database revalidation on every protected request.
- Registration accepts a strict request shape and always creates `STUDENT`; privileged self-registration is rejected.
- User detail, activation, canonical role, and persisted laboratory-assignment APIs are `ADMIN` only. Administrators cannot demote or deactivate themselves.
- `LAB_STAFF` access fails closed and is derived only from `UserLabAssignment`, including path, body, query, resource, and booking indirection.
- Booking detail/cancellation enforce owner, assigned-lab staff, or admin policy. Cross-owner private access returns `404`.
- Resource and public calendar projections omit requester identity and private booking detail.
- Dashboard access is restricted to `ADMIN` and `LAB_STAFF`, with assigned-laboratory projection for staff.
- Frontend authentication uses real login, registration, `/auth/me`, change-password, and logout APIs. Cached profile data never establishes a session without server validation.
- Denied production CORS origins return `403`; auth and global rate limits, Helmet, JSON limits, readiness, and production environment validation are active.
- Payment and AI/research routers are preserved but unmounted. Their legacy mock/incomplete services are not reachable from the production core runtime.

Verification passed on isolated PostgreSQL databases: Batch 2 integration `10/10`, Batch 1E runtime `11/11`, persistence/concurrency `2/2`, core unit suite `27/27`, frontend role/session E2E for all four roles, and the production frontend build.
