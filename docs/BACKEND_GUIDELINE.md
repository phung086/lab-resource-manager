# Backend Guideline

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL 16
- Node test runner

Do not migrate to Java, NestJS, or another framework merely because an
instructor example uses it.

## Architecture

Use:

route -> middleware -> service -> Prisma

- Routes define HTTP endpoints and response shape.
- Middleware handles authentication, RBAC, lab scope, validation helpers, and
  error normalization.
- Services hold business logic, transitions, transactions, and persistence
  coordination.
- Prisma schema and migrations remain canonical persistence source.

## Authorization

Internal bearer JWTs now require issuer/audience/iat/exp/sid/authVersion and a
current AuthSession as well as the current user. Both required and optional auth
check revocation/idle/absolute expiry; optional invalid credentials confer no
personalized access. Database failure is503. Token issuance is async and can use
the caller transaction for atomic registration/guest setup. Logout revokes sid;
logout-all increments authVersion. No compatibility bypass for pre-session JWTs.
Session activity is explicit, bounded by absolute expiry, and never triggered
by ordinary reads. Hourly cleanup is bounded, separate from expiry enforcement.

Every sensitive route must verify:

- valid bearer JWT where required
- current active database user
- canonical role
- ownership
- lab scope through `UserLabAssignment` where required

Do not rely on client-provided identity or lab fields.

## Workspace queue reads

`GET /api/bookings` and `GET /api/incidents` opt into the paginated contract when
`page` is supplied. Validate all page/filter fields, cap `pageSize` at 100, and
return `{ items, pagination, summary }`. Filter before applying `skip`/`take`;
derive summary counts from the complete authorized scope. Queries without `page`
retain their legacy array contracts and caps.

Apply current `UserLabAssignment` scope inside every staff list and aggregate
query. Admin reads remain global; customer reads retain ownership scope.
Use deterministic ordering with an ID tie-breaker. Items and counts share one
Repeatable Read transaction per response; successive pages are separate snapshots.
See [queue contract and verification](WORKSPACE_QUEUE_PAGINATION_20261003.md).

## Persistence Rules

- Use Prisma migrations for approved schema changes.
- Never run `prisma db push` against shared/development databases.
- Never edit historical applied migrations.
- Never manually edit `_prisma_migrations`.
- Keep PostgreSQL booking overlap protection intact.
- Do not hard-delete records when retirement/deactivation is the approved
  business action.

## Booking Rules

Booking mutations re-read the current actor under the user lock, then lock
resource before booking, matching payment and expiry writers. Recheck role,
authVersion, ownership and current LAB inside the transaction, including cancel.
Hold a share lock on an accepted staff assignment until commit. Reschedule reads
the current LAB/activity/policy after locking; a closed LAB is not movable.
Malformed intervals fail400 before Prisma queries. Released RETURNED records do
not reserve the resource detail projection; resource schedule reads enforce hold
expiry even without a scheduler. Catalogue availability for an explicit rental
interval includes known LAB notice/hours/duration/weekend/horizon and resource
duration limits; this projection does not replace final eligibility checks.

- ADR-044: server minimum notice is `LabPolicy.minAdvanceBookingMinutes`,
  default/floor30 minutes even without a policy row. Quotes, availability,
  preflight, creation (including guests), reschedules and AI suggestions honor it.
  Recheck at the final write. Creation takes resource then LAB share locks;
  ADMIN policy edits take the LAB update lock and audit within one transaction.
  Do not retroactively reject handover of existing confirmed/paid bookings.

- ADR-037: schedulingReleasedAt releases an actual returned booking's hold;
  RETURNED still awaits inspection. Scheduling reads and both GiST/cross-table
  triggers use the release predicate. Do not rewrite legacy returned records.
- Handover/self-check-in requires start−30 minutes <= now < end, eligible paid/free
  booking and fresh resource/LAB/care/training/maintenance/preceding-booking checks.
  Room access is an owner-only no-store read. ADR-041 derives the code from the immutable booking contact phone; missing contact fails closed and shared legacy passwords are not returned. ResourceFulfillment secrets must
  never be included in general resource, model, notification or audit projections.

- Use canonical booking statuses only.
- `NO_SHOW` is outcome/event, not status.
- Use half-open intervals `[startAt, endAt)`.
- Map overlap conflicts to `409 BOOKING_CONFLICT`.
- Do not bypass database-level overlap protection.
- Free eligible bookings automatically CONFIRM through the shared creation
  service. Positive fees use PENDING_APPROVAL + paymentDueAt (min(creation+15 minutes,startAt))
  for automatic payment verification, including guests. Set createdAt and the payment deadline from the same server
  timestamp; do not combine an application-clock deadline with a DB-clock default.
  Staff approval cannot
  bypass this hold. Signed settlement before expiry confirms it; expiry cancels
  and frees the interval. Legacy approval records have no paymentDueAt. See ADR-038.
  For older holds whose stored deadline exceeds startAt, effective expiry is
  startAt. Apply that cap to workers, reads, checkout/retries and callbacks.
  Legacy approval flags remain projected false; AI respects care/duration rules.
- Future booking/maintenance intervals block only intersecting intervals, not
  current catalogue availability. A closed LAB blocks catalogue/calendar/creation.

## Resource Rules

Maintenance duration bounds compare exact elapsed milliseconds, not rounded
minutes. Internal maintenance lists (notes, creators and jobs) require ADMIN or
assigned LAB_STAFF; customers use public-safe resource/calendar projections.
Dashboard actual use selects overlapping actual custody independently of planned
dates, including overdue loans. `/notifications/unread-count` counts the complete
delivered, unread owner scope; a bounded recent-message list is not that total.

- `Resource.operationalStatus` is authoritative.
- `Resource.status` is compatibility projection only.
- `RESERVED` is not a physical state.
- Changing operational status should be transactional and history-backed where
  schema supports it.
- Retire instead of hard-delete.

## Runtime Truthfulness

Database or infrastructure failure must produce explicit failure. Do not fall
back to mock stores or fake success in core runtime.

Payment, AI, simulation, optimization, and other optional modules must not be
treated as production-core unless verified in an approved batch.

## Error Contract

Use:

```json
{ "error": { "code": "CODE", "message": "Message", "details": null } }
```

Do not expose stack traces, SQL, Prisma internals, JWT internals, or secrets to
clients.

## Verification

Common checks:

```text
cd backend
npm test
npm run test:batch2
npm run test:batch3
```

Use guarded isolated databases for integration tests that need PostgreSQL.


## Locale and assistant boundary

ADR-040 extends the request-bound bridge to CUSTOMER/LAB_STAFF/ADMIN. Bind
server-owned role snapshots to each request and recheck current role/authVersion
for context, reads, reply, owner polling and event delivery. The OAuth grant owner
never substitutes for the question actor. New workspace read tools use one fresh
account/scoped Repeatable Read snapshot; operators retain UserLabAssignment and
ADR-034 contact permissions separately. Complete totals precede bounded previews.
No stock ledger means unknown quantity. Only CUSTOMER can receive business-form
proposals. Deterministic fast reads skip Work but retain admission, rate, privacy,
failure and history limits. See AI_ASSISTANT_MCP; do not infer model latency from
local-query benchmarks or introduce a business write through a helper.

Shared server messages come from the generated `src/locales/{vi,en}.json`
projection. Stable API `error.code`/status/details remain authoritative; the locale
middleware renders messages from `X-LRM-Locale`/`Accept-Language` and declares
`Content-Language`. Persist notification IDs/parameters alongside compatibility
text. Never rewrite historical evidence to translate it.

Assistant tools must remain read-only and use the existing authenticated actor,
object access and `UserLabAssignment` scope. Use bounded work and cancellation;
never turn a tool/provider outage into fabricated healthy data. Prefill actions
return through the normal booking form/API. The guarded integration test requires
`ASSISTANT_TEST_DATABASE_URL` pointing to local `lab_resources_assistant_test`.
See `AI_ASSISTANT_MCP.md` for the current contract and `AI_ASSISTANT_SETUP.md`
for configuration; earlier foundation reports describe their original runs.
Backend code must not import frontend runtime packages.

MCP protocol ingress uses a separate bounded IP bucket; never exempt it from
authentication, account rate limits or actor/object/lab scope. Transport aborts
must reach tools, and pending non-cancellable reads retain admission until they
settle. Assistant evidence errors/deferred hardware never start factual model
synthesis. All serialized model data payloads, including history, have a
24,000-byte UTF-8 budget; fixed instructions/schema are separately finite.
Reuse eligibility only within one answer and one resource; never cache it
across users or business submissions. Business dashboards can explicitly request
`includeTelemetry=false`; omit monitoring counts and return `telemetrySummary=null`
with `telemetryIncluded=false` rather than claiming healthy hardware.

Human support uses a separate bounded ingress bucket for campus/shared-IP polling,
then current authentication and a 180 requests/minute account limit; mutations
also have a 60/minute account limit. Support writes coordinate dispatch with a
PostgreSQL transaction advisory lock, and message/closure operations lock the
session row. Partial unique indexes enforce one open customer request and one
active session per staff across labs. Scope is checked against current persisted
assignments on every staff read/write. Presence is not a read receipt. Preserve
handling events and resolutions; chat cannot settle payments or approve bookings.

Local assistant intents must match the question being answered. Identity, greetings and
capability questions return localized application guidance without MCP/model
calls. Unknown questions ask for clarification; never substitute operational
counts as a catch-all answer. `get_operational_summary` requires an explicit
overview/summary intent. Vietnamese `trong` (in) alone must not select slot search.
Keep local guidance marked `source=local_guidance` and the existing finite gates.
ADR-039 adds exact reviewed greetings/thanks/workflow guidance before provider
work. Bridge local replies persist as ANSWERED with local/local_guidance and no
delivery event, preserving connection/customer/busy/rate checks and history.
Mixed questions and changing facts never use this shortcut. External receiver
speed remains environment-dependent; do not label local timings as model latency.

Configured contextual routing may plan read-only lookups or converse on general
topics using strict Responses JSON output. Validate against the original MCP
schema before executing; reject unknown/duplicate tools and identity overrides.
Planning/general conversation is separate from synthesis of current LAB facts.
Keep `model_conversation`, `model_guidance` and `authenticated_mcp` provenance
distinct. Do not claim external search, business writes or live model readiness.

Use `AssistantConversationStore` for bounded temporary server history. Bind the
ID to the current account, hashed bearer session and role; never accept browser
history or keep tool prose as current evidence. Re-read stored choice IDs through
MCP before exposing refreshed names to a model. Reset/logout clear context; logout
also aborts active session work. Do not imply JWT revocation or shared multi-replica
memory. Cancellation must not commit a late reply. Key/model presence checks
must not echo secrets or send a provider request.

## Automatic account and payment emails

Enqueue EmailDelivery in the same transaction as public registration, a new
OTP-verified guest account, or verified VNPAY settlement. Use explicit public
field snapshots; never include passwords/hashes/OTP/tokens. Email is not account
activation, password recovery, booking approval or payment authority. Return
must not enqueue receipts; preserve cancelled/rejected/reconciliation outcomes.

SMTP runs outside the transaction through a separate scheduler, even when in-app
reminders are disabled. FOR UPDATE SKIP LOCKED, bounded leases and lease tokens
coordinate workers. Missing configuration retains pending emails without using
attempts; delivery errors retry with backoff up to five attempts. Operators can
retry FAILED via the local CLI; SENT cannot be manually resent by that command.
Use stable redacted errors, required TLS, escaped templates and configured
application links. SENT means SMTP acceptance, not verified inbox delivery.
Lease recovery can duplicate a message accepted just before a worker crash.

Registration uses the request locale; VNPAY receipts default to VI. Dates are
explicitly Asia/Ho_Chi_Minh. Read-only `email:check -- --verify --queue` checks
configuration/SMTP and queue states without sending mail. Integration tests
must guard the dedicated localhost `lab_resources_email_test` database and use
loopback SMTP, never real business data or customer inboxes. See ADR-030/README.

## Account management and password verification

ADMIN manages all accounts; LAB_STAFF manages every CUSTOMER, regardless of LAB
assignment, only through the account endpoints. Resource/booking/support scope
is unchanged (ADR-034). List/get use safe projections; password hashes, OTP data
and authVersion are private. PATCH /users/:id accepts contact only (fullName,
phone, organization), never email, role or credentials. DELETE accepts reason
and soft-deletes; active bookings block removal. Removed accounts cannot activate.

POST /auth/password-otp/request: {currentPassword}.
POST /auth/change-password: {challengeId,otp,currentPassword,newPassword}; returns
{accessToken,tokenType,user}, replacing the former 204 contract.
POST /users/:id/password-otp/request: {reason}.
POST /users/:id/password-otp/confirm: {challengeId,otp,newPassword} -> {success:true}.
Request returns {challengeId,maskedEmail,expiresAt,resendAfter}; dates are ISO UTC.
Confirmation requires actual SMTP acceptance, current bound context and one-use
code. Wrong attempts commit even when confirmation fails. Never return/log code
or credentials. SMTP runs outside the transaction; password/challenge consumption
and audit commit together. Strict validation, cooldown and account/auth rate
limits bound mutations; do not automatically retry them. Store only code hashes.

JWT authVersion must match the active current DB user. Sign with authTokens.js;
never mint an unversioned token after a credential change. Recheck actor inside
accountWrite to serialize credential/role/activation/delete and last-admin guards.
Applied migrations are unchanged; new forward account_security migration is required.

## Spending-based loyalty and pricing

GET /loyalty/me returns {tier,points,discountBps,totalSpendVnd,completedBookings,
basis,progress,nextTier,nextThreshold,remainingToNext,policyVersion,enabled} for
current actor only. GET /loyalty/policy is authenticated; PUT is ADMIN-only with
strict fields enabled,plusThreshold,priorityThreshold,plusDiscountBps,
priorityDiscountBps,expectedVersion. Always derive spend from eligible settlements
(ADR-035), not persisted user loyalty fields. Optimistic policy conflicts return
409 LOYALTY_POLICY_CHANGED; unavailable/unsafe totals return LOYALTY_UNAVAILABLE.

Private quote must authenticate a supplied bearer header strictly. Client userId
cannot select a discount owner. AcceptedQuote includes amountVnd,version and
loyaltyPolicyVersion for discounted quotes. Fee snapshot additionally stores
baseAmountVnd,discountAmountVnd,discountBps,loyaltyTier,loyaltyPolicyVersion;
amountVnd is the net. Check again under existing booking/resource and policy locks.
Public guest creation explicitly preserves accepted list price. Free bookings do
not fabricate payment rows. See tests/accountSecurity.integration.test.js and
loyalty.integration.test.js; both refuse business databases.

Account removal and booking creation share User FOR UPDATE; booking/support
creation rechecks active/deleted/version after locking. Support dispatch lock
serializes account removal with requests; open sessions block removal/deactivation
and role change. Account permission checks precede these state guards.
Audit metadata is nullable in Prisma to match the existing applied SQL; services
still write sanitized objects. No historical audit data or migration was rewritten.
