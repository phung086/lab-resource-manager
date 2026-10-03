# Assistant request hardening — 2026-10-01

Continuation on `codex/lab-workspace-ui-draft`, draft PR #22, from
`d6adc851b94f7acede9080b4946540d7314d7b12`. The existing role workspaces,
catalog loader, modal language controls and shared-read navigation budget remain
the implementation boundary. No numbered Batch, schema migration or runtime
dependency is introduced.

## Business and assistant work have independent budgets

MCP initialization and tool reads previously consumed the same IP bucket as
ordinary API calls. Several internal loopback requests could therefore exhaust
the business allowance. Ordinary ingress retains `RATE_LIMIT_MAX`; MCP ingress
uses a separate allowance of `10 × RATE_LIMIT_MAX` in the same window. Both are
finite and apply before authentication. MCP still requires a current authenticated
database user, its account limiter and its concurrent admission gate.

Transport disconnect and overall deadline signals are combined with the SDK's
tool signal. Cleanup runs once, removes listeners/timers and closes transports.
An already-started Prisma read retains admission until it actually settles;
cancellation does not pretend that a non-cancellable database operation stopped.
Direct MCP requests also have the configured assistant deadline and localized
timeout response.

Eligibility is read once per resource within one answer, even when several slots
use that resource. It is never shared across actors/answers and does not replace
the booking API's final training, policy, availability and pricing checks.

Model generation skips missing, erroneous or deferred evidence. Local guidance
with no tool plan makes no MCP/provider call and declares `source=local_guidance`.
The complete model payload, including the question, is bounded to **24,000 UTF-8
bytes**. Provider retries remain disabled and existing failure-circuit behavior
is retained. Tool errors use the request's VI/EN locale even across loopback MCP.

## Language and request recovery

The assistant duration field starts blank. Explicit form minutes take priority;
otherwise the question supplies hours, minutes, decimal hours or a combined
hour/minute duration. The default is 60 minutes when no duration is stated.
Invalid/ambiguous numeric durations fail validation rather than returning false
availability. Both languages enforce the same 15–480-minute interval. Uppercase
Vietnamese Đ also participates in intent normalization.

The shared API wrapper bounds fetch and response-body reading: **30 seconds**
normally and **65 seconds** for chat. Caller cancellation remains cancellation;
network/body failures and deadlines use catalog IDs. Failed requests do not
silently retry a mutation or clear a valid session. Existing 401 session handling
is preserved. A timeout does not prove a server mutation rolled back, so feedback
asks users to check the result before retrying.

VI/EN catalogs now contain **2,115 matching keys** and a checked backend
projection. Assistant source documents display original titles, optional versions,
filenames and excerpts as escaped React text, rather than raw transport JSON.
Original user/resource/document evidence is not translated or rewritten.

## Hardware remains deferred

With `VITE_ENABLE_TELEMETRY_FEATURES=false`, shared workspace loads request
`/api/dashboard?includeTelemetry=false`. The dashboard skips camera, threshold,
sample and hardware-alert relations, while preserving operational resource,
booking, incident and unread-notification counts and assigned-lab scope.
`telemetryIncluded=false`, `telemetrySummary=null` and omitted monitoring counts
distinguish deferred work from a healthy zero measurement.

The legacy authenticated dashboard without that option and hardware endpoints
retain their contracts for opt-in regressions. Assistant monitoring additionally
requires `HARDWARE_TELEMETRY_ENABLED=true`, default false in environment examples
and production Compose. Disabled monitoring reports deferred and performs no
hardware read. Role checks still run before that response.

## Verification boundary

| Gate | Evidence |
| --- | --- |
| Required backend tests | 60 local tests pass: 38 core, 3 security, 19 assistant/runtime/HTTP transport |
| MCP transport faults | Actual HTTP/SDK harness verifies independent finite ingress limits, in-tool cancellation, non-cooperative read admission and direct deadlines; handler fixtures are test-only |
| Frontend catalog/network checks | 7 local tests pass, including fetch/body deadlines, cancellation, stable localized errors, no mutation retry, session handling and catalog integrity/recovery |
| Catalog/source audit | 2,115 matching keys, checked parameters/projection/manifest; 76 active modules audited |
| Static/build/configuration | Backend lint and production config pass; frontend lint has zero errors/13 existing warnings, typecheck and build pass |
| Guarded PostgreSQL integration | Existing CI suite adds real MCP slot reads under a two-request API budget, 90-minute duration, deferred business dashboard, role/lab boundaries and loopback error locale |
| Four-role bilingual browser suite | Existing CI suite adds untouched/explicit duration requests and draft persistence during a language switch, using real authenticated responses |

The last two rows are required CI coverage; exact current-head outcomes are
recorded on [PR #22](https://github.com/phung086/lab-resource-manager/pull/22).
Historical report counts remain historical, not substituted for current-head
results. Main JS entry measured locally is **355.20 kB / 105.65 kB gzip**, excluding
catalogs, fonts, CSS and lazy chunks.

This remains a single-backend-process limit/circuit implementation. No shared
multi-instance limiter, live external model quality/billing, SMTP delivery,
payment merchant acceptance, hardware installation or production load-test
guarantee is claimed. No main merge or deployment is included.
