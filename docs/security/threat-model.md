# Laboratory application threat model

Updated 2026-10-19 from the current Express/Prisma implementation. This replaces
the old Smart Lab V2 assumptions. It is a control inventory, not penetration-test
certification. Required booking operations take priority over optional integrations.

## Trust boundaries and controls

| Surface / threat | Implemented control | Limit or remaining work |
|---|---|---|
| Forged role, inactive account, cross-lab access | HS256 bearer verification; current persisted active user/role; canonical ADMIN/LAB_STAFF/CUSTOMER; owner/lab checks in queries and services | Client navigation and CORS are not authorization; every new route needs equivalent checks |
| Old records hidden by recent caps | Scoped server paging, counts/groups and rows in one repeatable-read transaction | Resource and stock-history lists have separate caps; offset pages can move between requests during concurrent writes |
| Double booking / invalid transitions | Resource row locks, PostgreSQL exclusion constraint, half-open intervals and transition validation | No universal booking idempotency claim; stock movement IDs separately provide replay protection |
| Login guessing | Public registration/password changes use bcrypt cost 12; auth IP limit defaults to 10/15min in production; general API 180/min with separate MCP bucket | No account lockout or refresh rotation; IP limiting alone cannot stop distributed guessing |
| Guessable guest setup credential | Password login rejects EXTERNAL accounts with passwordResetRequired, using generic AUTH_INVALID; the email-verified booking session can complete password setup | Losing the setup session has no self-service recovery yet. Password setup now requires a fresh delivered OTP; authVersion revokes previous tokens |
| Stolen session / XSS | Strict HS256 issuer/audience/iat/exp/sid; persisted AuthSession checked with current account/version; default30m idle/8h absolute; logout revokes sid, logout-all/credential changes invalidate earlier versions; tab sessionStorage; Nginx CSP and React escaping | Storage remains accessible to XSS; a stolen bearer can send activity until absolute expiry. No refresh credential or BFF cookie flow. Background reads never extend idle. Existing JWTs need re-login on upgrade; requests already admitted before revocation may finish |
| Assisted reset abuse / OTP guessing | Immutable registered email, actor/target/purpose/version-bound HMAC, actual SMTP acceptance, 10-minute expiry, 60-second resend cooldown, five attempts and transaction-coupled audit; no administrator bypass | Consent depends on the customer retaining control of their email and sharing a code only for requested assistance; external inbox not verified |
| Account removal racing booking/support | Shared User row locks and current active/version check; open bookings/support prevent removal, support also blocks deactivation/role change | Soft removal retains history; public recovery/email change remain separate work |
| Loyalty/price tampering | Eligible settled VND spending, current authenticated owner, policy/tariff versions and immutable base/discount/net snapshot | Guest keeps accepted public price; points are informational, not redeemable credit |
| Input / information disclosure | Zod contracts for sensitive flows; stable API errors and guarded DB failures; public-safe schedule/identity projections | Review coverage per endpoint; do not claim universal strict schemas or penetration testing |
| Metrics disclosure | Production exact bearer check with timing-safe comparison; absent configuration returns 503; query tokens do not authorize | Development remains public unless configured. Optional Prometheus host UI binds loopback; restrict host access |
| Container privilege | Production API node user (UID 1000); image creates writable app/data directory; dev packages pruned while Prisma CLI remains for migrations | Mount ownership, host/network security remain required; verify the actual image at release |
| Telemetry spoofing/replay | Persisted source credential hash, lab/resource scope, ingestion validation and provenance | Hardware evidence is separate; simulated feeds/statistical filtering are not verified physical protection |
| Assistant tool abuse | Authenticated actor-bound read tools, validation, bounded concurrency/deadlines and missing/deferred evidence handling | Current assistant grants no write operations. Prompt/model output cannot approve bookings or change physical state |
| Payment callback forgery | Optional VNPAY verifies signed callback and merchant/transaction data; browser return cannot settle | Live provider delivery/reconciliation needs separate evidence; disabled by default |
| Media/email integration | Configured host/type/size/storage policy and persisted media scope; required email needs configured transport | Credentials, TLS, retention and actual delivery/assets remain deployment checks; no fake success |

## Verification entry points

- `test:release-security`: configuration/security and actual HTTP metrics tests
  (missing, wrong, valid header, query rejection and development behavior).
- `test:batch2`, `test:phase-e`: database-backed role, ownership and privacy cases.
- `test:batch1:concurrency`, `test:batch4`, `test:batch5`: persisted conflicts and
  operations. Historical concurrency evidence is not a newly run benchmark.
- `test:queue-pagination`: complete scoped queues/totals, assignment revocation,
  forged identities, invalid filters and legacy text IDs.
- `test:lab-workspace`, `test:batch8`, `test:guest-integrity`, `test:phase-h`:
  stock/teaching, monitoring, OTP and optional payment contracts.

- test:accounts:integration and test:loyalty:integration: OTP transport/binding/attempts,
  session revocation, concurrent removal, audit rollback and verified spend/policy.
- Frontend test_api_request.mjs guards stale 401 after session renewal;
  test:ui:accounts uses the actual isolated API and loopback SMTP.

These identify relevant checks; consult [current state](../CURRENT_STATE.md) and
review follow-up (historical run output; retired) for checks actually run
on this working tree. Worker counts, coverage and physical-device claims require
real evidence.

## Remaining security work

Prioritize account-level/distributed abuse controls, optional administrator MFA,
secure recovery, dependency alerts and
targeted authenticated API regression coverage. On 18/10 the MCP client was
upgraded from 2.0.0 to 2.3.1 for
[GHSA-6qxp-vccf-f47h](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h).
Production-only npm audits reported zero advisories for both apps. Full backend
audit still reports three High entries in the nodemon/chokidar/braces development
chain; the actual production image was checked to exclude those packages.
This is dependency inventory, not proof of exploitability or a penetration test.
Do not apply `npm audit fix --force` or downgrade tooling to silence an advisory.

Configure HTTPS at the approved deployment boundary before external use, restrict
DB/metrics access, protect and rotate credentials, and verify restoration from
an actual backup. A local build does not establish these deployment conditions.

19/10 references: [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[REST/JWT lifecycle](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
Session deadlines/revocation are enforced in the database-backed request path;
browser countdowns/cleanup are UX/retention aids. The activity endpoint cannot
prove human presence, and tab storage does not eliminate XSS. Public SEO is
explicitly opted in, while private/auth/error HTML remains noindex; robots is
not an authorization control. These controls are not a full penetration test.
