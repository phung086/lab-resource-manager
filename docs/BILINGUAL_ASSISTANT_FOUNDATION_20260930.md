# Bilingual and read-only assistant foundation — 2026-09-30

Continuation of the interrupted work in draft PR #22 on
`codex/lab-workspace-ui-draft`. This is a foundation for subsequent UI/workflow
refinement, not a production deployment or a new numbered Batch.

## One translation contract

The canonical authoring source is `frontend/src/locales/catalog/{vi,en}.json`.
Both languages contain **1,947 identical keys**. Existing `core.*` consumers
remain compatible through a cached dictionary adapter; active screens use
stable catalog IDs. Superseded `en-ui.json`, inline dictionaries and the separate
workspace error map are removed. There is no silent Vietnamese fallback when
English is selected.

`npm run i18n:sync` projects shared API/assistant/enum/email/notification/calendar/
profile messages into the backend and updates the byte-length/SHA-256 manifest.
`npm run test:i18n` verifies parity, interpolation parameters, nonempty values,
English copy, projection consistency and source usage. The source gate follows
67 active modules, resolves JS-style imports of TypeScript files, checks template
literals and rejects translation resolution at module initialization. Retired
research surfaces remain isolated and are outside the active bilingual boundary.
New feature copy should use descriptive semantic keys, not raw text or a second
translation mechanism.

The browser loads only the selected catalog and deduplicates in-flight reads.
It verifies the catalog before activating the language or saving the preference.
Timeout/fetch/integrity failure keeps the previous language and mounted forms;
Retry makes a fresh request. Saved English can start and recover without first
loading Vietnamese. This loader uses Web Crypto on HTTPS or localhost.

API requests carry `Accept-Language` and `X-LRM-Locale`; explicit selection wins.
Responses declare `Content-Language`. Error codes/status/details remain stable;
error presentation is localized at the boundary. Client errors retain IDs, and
parameterized notices retain `{key, params}`, so a language switch also changes
already-visible system feedback. Calendar weekdays, redacted titles, maintenance
labels, profile explanations and notification templates use the same catalog.
Scheduling still uses canonical Vietnam time.

Names, resource descriptions/media captions, SOP excerpts, addresses, user-entered
notes and historical evidence retain their original content. Translation never
rewrites a booking, certifies a device, changes a role or translates user data
into a fabricated record. Existing notification keys and recognized legacy types
render in the selected language; unknown historical content is preserved.

## Assistant behavior and bounded work

The signed-in assistant uses authenticated, read-only MCP tools. Each tool uses
the current database user and the existing object/lab-scope checks. Students and
lecturers read their own bookings/notifications; LAB_STAFF uses
`UserLabAssignment`; ADMIN keeps the existing global operational scope. Canonical
resource categories are used for equivalent VI/EN category searches, rather than
assuming every resource name is Vietnamese.

Deterministic tool summaries contain message IDs, original data and timestamps,
and can render again in either language. Optional model output is separate and
keeps its original response language with an explanation when the interface
changes. Both the question draft and the tool history survive an in-dialog
language switch; a request in progress is cancelled. History is ephemeral and
bounded to ten turns. Closing/unmounting also cancels work.

`provider`, `modelStatus` and source information distinguish actual model output
from a grounded local summary. Missing MCP/data fails as an error, not empty
healthy data. Missing external-model configuration uses the local tool reader;
provider failures use the verified summary and report the failure.

Default limits:

| Setting | Default | Behavior |
| --- | --- | --- |
| `ASSISTANT_MAX_CONCURRENT` | 4 | Active chat requests per server process; no waiting queue |
| `ASSISTANT_RATE_LIMIT_PER_MINUTE` | 6 | Chat starts per authenticated account |
| `ASSISTANT_TIMEOUT_MS` | 30000 | Overall deadline, bounded to 1–60 seconds |
| `ASSISTANT_TOOL_TIMEOUT_MS` | 10000 | SDK tool deadline, bounded to 0.5–15 seconds |
| `ASSISTANT_MODEL_FAILURE_THRESHOLD` | 3 | Failures before pausing provider calls |
| `ASSISTANT_MODEL_COOLDOWN_MS` | 30000 | Pause before one recovery probe |

Only one chat/MCP request per account is active at a time. Busy, overloaded,
rate-limited and timed-out work have distinct 409/503/429/504 codes and applicable
Retry-After metadata. Abort/deadline paths close connections and release capacity;
MCP capacity is held while an already-started read is finishing. External-model
retries are disabled, model input/output is bounded, and Responses uses
`store: false`. Slot search examines at most 20 resources/4,096 candidates and
yields every 64 candidates. Truncated searches disclose the limit.

Slot actions only prefill a booking form after eligibility checks. The normal
booking API still validates policy, training, availability and pricing when the
user submits. The assistant cannot create, approve, hand over, pay or reserve.
Rate gates and circuit state are process-local; the verified architecture is the
existing single backend instance. Multi-instance shared limits are not claimed.

## Deployment and performance

The examples enable both `MCP_ASSISTANT_ENABLED=true` and
`VITE_ENABLE_AI_ASSISTANT=true`. Docker/Compose now pass those flags and the limit
settings. OpenAI generation additionally requires both `OPENAI_API_KEY` and
`OPENAI_MODEL`; an API key is never shipped in the frontend.

`VITE_ENABLE_TELEMETRY_FEATURES=false` keeps camera/sensor monitoring out of normal
navigation and the operations dashboard. Hardware routes, authorization, schema
and evidence are retained. Hardware regression jobs opt in explicitly. Research
and payments retain their independent flags; payment UI should be enabled only
with the existing backend/provider configuration.

No runtime dependency or schema migration is added. Nginx compresses catalog/JS/
CSS responses and serves hashed assets with long caching and real missing-asset
404s. Main JS is **350.58 kB / 104.37 kB gzip**, versus the previous branch's
441.25 / 130.09. The selected VI catalog adds 153,535 bytes / 44,241 bytes gzip;
EN adds 134,392 / 39,557. These JS figures exclude catalogs, fonts and CSS and are
not a claim that total startup transfer decreased. The second language loads
only when requested; 278 unused UI entries and duplicate maps were removed.

## Verification

All local runtime tests use PostgreSQL 16 with canonical migrations, guarded
loopback URLs and isolated database names. No shared/development DB is reset and
no `prisma db push` is used.

| Gate | Observed result |
| --- | --- |
| Frontend catalog/loader/source, TypeScript, production build | PASS |
| Frontend lint | 0 errors; 14 pre-existing warnings |
| Backend lint, production configuration contract | PASS |
| Backend required units | 38 core + 3 release/security + 10 assistant tests PASS |
| Assistant HTTP/MCP integration | 7 tests PASS: auth/locales, four roles/object scope, read-only counts, slots, timeout/resubmit, cancel/concurrency/overload, account rate limits and OTP locale/escaping |
| Bilingual browser verification | 298 checks PASS across four roles, VI/EN, all enabled destinations, calendar views, resource details, assistant history, form continuity and catalog failure/tamper/startup recovery |
| Navigation browser regression | 104 checks PASS: role gates, keyboard/focus, history, locale, failed reads and four viewport widths |
| Booking/calendar/training regression | 32 tests PASS |
| Operational handover/return regression | 13 tests PASS |
| Guest OTP/identity/transaction regression | 13 tests PASS |
| Stock/course-group/maintenance regression | 3 tests PASS |
| Existing Phase G frontend checks | PASS |

Locale/network latency/tamper injection is confined to test harnesses. OTP
integration captures delivery using the existing NODE_ENV=test-only hook while
persisting actual hashed challenges. Model-failure tests use explicit unit-only
injection; production defaults call real services. None of those tests claims
live SMTP, external OpenAI billing/model quality, payment merchant acceptance,
media object-store acceptance or installed hardware verification.

CI adds catalog/source gates, the guarded real-MCP suite and bilingual browser
checks to existing workflows. The latest head's actual CI status is recorded on
PR #22. Historical reports are retained as historical evidence, not substituted
for current-head checks.

## Continuing the project

Keep this catalog/API/assistant contract when refining screens and workflows.
The next work is role-specific screen detail and practical booking/teaching/
inventory/maintenance usability. Hardware telemetry stays deferred until real
hardware and a separate verification boundary are available. This PR remains a
draft for continued development; it does not merge into `main` or deploy.
