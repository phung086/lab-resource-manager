# Laboratory application threat model

Updated 2026-10-03 from the current Express/Prisma implementation. This replaces
the old Smart Lab V2 assumptions. It is a control inventory, not penetration-test
certification. Required booking operations take priority over optional integrations.

## Trust boundaries and controls

| Surface / threat | Implemented control | Limit or remaining work |
|---|---|---|
| Forged role, inactive account, cross-lab access | HS256 bearer verification; current persisted active user/role; canonical ADMIN/LAB_STAFF/LECTURER/STUDENT; owner/lab checks in queries and services | Client navigation and CORS are not authorization; every new route needs equivalent checks |
| Old records hidden by recent caps | Scoped server paging, counts/groups and rows in one repeatable-read transaction | Resource and stock-history lists have separate caps; offset pages can move between requests during concurrent writes |
| Double booking / invalid transitions | Resource row locks, PostgreSQL exclusion constraint, half-open intervals and transition validation | No universal booking idempotency claim; stock movement IDs separately provide replay protection |
| Login guessing | Public registration/password changes use bcrypt cost 12; auth IP limit defaults to 10/15min in production; general API 180/min with separate MCP bucket | No account lockout or refresh rotation; IP limiting alone cannot stop distributed guessing |
| Guessable guest setup credential | Password login rejects EXTERNAL accounts with passwordResetRequired, using generic AUTH_INVALID; the email-verified booking session can complete password setup | Losing the setup session has no self-service recovery yet. Previously issued bearer tokens are not revoked by this change; do not treat this as a session-revocation fix |
| Stolen session / XSS | Bearer header, React text escaping, validated inputs, Helmet API headers, restricted production origins | Frontend stores bearer in localStorage; JWT default 8h. Logout discards the client token without server revocation; password change does not revoke all issued tokens. Session redesign needs coherent migration/tests |
| Input / information disclosure | Zod contracts for sensitive flows; stable API errors and guarded DB failures; public-safe schedule/identity projections | Review coverage per endpoint; do not claim universal strict schemas or penetration testing |
| Metrics disclosure | Production exact bearer check with timing-safe comparison; absent configuration returns 503; query tokens do not authorize | Development remains public unless configured. Optional Prometheus host UI binds loopback; restrict host access |
| Container privilege | Production API node user (UID 1000); image creates writable app/data directory | Mount ownership, host/network security remain required. Current runner still packages development dependencies |
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

These identify relevant checks; consult [current state](../CURRENT_STATE.md) and
[review follow-up](../backlogs/review-followup-20261003.md) for checks actually run
on this working tree. Worker counts, coverage and physical-device claims require
real evidence.

## Remaining security work

Prioritize session revocation/rotation, account-level abuse controls, dependency
alerts and targeted authenticated API regression coverage. Review full and
production-only audits: unused development dependencies are still packaged in
the current runner. Do not apply `npm audit fix --force` or downgrade tooling to
silence an advisory.

Configure HTTPS at the approved deployment boundary before external use, restrict
DB/metrics access, protect and rotate credentials, and verify restoration from
an actual backup. A local build does not establish these deployment conditions.
