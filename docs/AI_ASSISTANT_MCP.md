# LAB assistant and MCP contract

Responses/MCP local checkpoint: 2026-10-05. ChatGPT bridge and its isolated live
verification: 2026-10-14, detailed below. [Setup guide](AI_ASSISTANT_SETUP.md)
explains configuration; [CURRENT_STATE](CURRENT_STATE.md) records actual results
and limits. No production activation or universal model accuracy is implied.

## Runtime modes

19 October2026: bridge MCP additionally exposes `publish_question_partial` with
requestId/generation/sequence/text. Up to three cumulative parts of1500 characters,
current context and all existing actor/grant/expiry checks are mandatory. The
request stays PENDING; final reply alone finishes it. Identical replay is safe;
out-of-order/rewrite/late parts fail. Client polls expose real partial text and
reject regression; cancellation/handoff hides partials. The versioned rules and
plugin source ask the receiver to publish a useful verified first sentence
promptly, targeting5–10s, rather than a waiting acknowledgement. External event
scheduling/subscription readiness must be measured separately. At this checkpoint
Work had no active subscription; no live5–10s provider result is certified.
Explanatory questions no longer trigger catalogue reads through a keyword match.
Disconnected/unconfigured explanatory work reports that a connection is needed.

15 October 2026 continuation (ADR-040): all three roles use the same dock and
Work connection. Clear supported queries read authorized data directly and persist
ANSWERED/authenticated_mcp without a delivery event. `fastQueries.js` is a bounded
VI/EN grammar, not a general model. Mixed/unknown/date-ambiguous questions retain
Work. Disconnected Work leaves internal authenticated quick reads available.
The direct Responses/local service retains its existing synthesis behavior for
resource/slot requests and adds direct operational tools.

New reads: `get_material_stock`, `search_customers`, `get_lab_schedule` and
`get_operations_report`. Staff stock/schedule/reports use current assignments;
CUSTOMER schedule is owner-only, and operator stock/reports/contacts fail403.
Staff contact search follows ADR-034 globally for CUSTOMER only. Contact projections
exclude credentials, addresses, private financial data and room-access secrets.
Schedule intervals are half-open Vietnam-time windows (max31 days), report windows
7/30 days. Full totals precede previews of at most20 rows; missing stock is unknown.
Operational reports retain the canonical planned/actual/measurement distinctions.

Bridge request.context stores server-owned actorRole; absent historical snapshots
mean CUSTOMER. Current role/authVersion is rechecked at create/read/tool/reply and
delivery, including role changes without a version increment. OAuth owner remains
ADMIN but tools use the question's actual actor. Context advertises actorRole,
role-appropriate tools and allowedProposals (empty for operators). Fast lookup
history becomes a re-read marker before it reaches Work; display history remains.
Fast reads have4 admission slots and30 creates/minute/actor; Work creation/cancel
retains6 and ingress180. Event dispatch polls500ms; frontend status GET retries at
most3 transient network/timeout/5xx failures, respecting cancellation/expiry. POST,
auth and invalid payloads are never retried. Database reads retain finite8s
transaction bounds and MCP read budgets. No schema, API key or business writes.

15 October 2026 UX clarification (ADR-039): exact greetings, introductions,
thanks and reviewed workflow guidance can answer locally before provider work.
The bridge persists these as `ANSWERED` with `provider=local` and
`source=local_guidance`, without a delivery event. All customer/connection/busy
guards remain. Mixed questions, general knowledge and changing LAB facts retain
their usual receiver/evidence path. The dock hides provider metadata, keeps real
errors/document evidence, and offers LAB navigation after answers. Its VI/EN
preference is local; subsequent application language changes update it too.
No external-receiver latency improvement is certified by local-guidance tests.

With no `OPENAI_API_KEY` or no `OPENAI_MODEL`, the assistant uses the existing
VI/EN local planner and real authenticated MCP reads. It handles introductions,
resource searches, candidate booking slots, selected results and application
payment guidance. Unknown questions ask for clarification. It does not offer
general conversational intelligence in this mode.

With both settings and `ASSISTANT_CONVERSATION_ENABLED=true`, the backend uses
the installed OpenAI SDK and Responses API to produce a strict intent plan:

- `CHAT`: casual conversation, study help and general knowledge. No LAB facts,
  business action or live web lookup is claimed.
- `CLARIFY`: a short question when the request lacks usable context.
- `PAYMENT`: application-controlled payment guidance based on real feature and
  provider configuration. It does not initiate or confirm a payment.
- `LAB`: up to three distinct registered read tools, or one historical slot
  selection that the server checks again. Model arguments must pass the original
  MCP schema; unknown tools, extra identity/scope fields and repeated reads fail.

LAB results run through the real Streamable HTTP MCP client at the backend's
loopback `/mcp` endpoint with the caller's bearer. Fresh usable results can be
summarized by the model together with current candidate eligibility. Failed/deferred
lookup or eligibility results are rendered locally; their
failure is never presented as healthy evidence. Provider failure or invalid plans
fall back to the local planner with explicit provenance. MCP failure remains an
error. `ASSISTANT_CONVERSATION_ENABLED=false` retains local planning with optional
grounded model synthesis, while server conversation IDs and result selection
remain available.

No Wikipedia or external web-search tool is registered. No remote MCP server,
assistant write tool, email sender or autonomous payment flow is added. The
model is instructed to acknowledge uncertainty about current external facts.

## Authorization and actions

Roles come from current authenticated database users, never model/browser fields.
`LAB_STAFF` reads retain current persisted `UserLabAssignment` scope, including
the empty scope when no lab is assigned. CUSTOMER booking reads remain
their own. Incident and monitoring reads retain their existing owner/role/lab
contracts. ADMIN's existing global scope is unchanged.

Old resource/slot IDs are references only. Before sending refreshed choice names
to the model, the service reads those IDs again through MCP. Denied/missing choices
clear the references and produce a localized recovery message. Private tool
prose is not stored in provider history. User-authored questions remain original
and may themselves contain sensitive text; they are included in bounded history.

Candidate slots are checked against persisted policy, active bookings and
maintenance, then against current actor eligibility. Only eligible suggestions
receive `PREFILL_BOOKING`. This action opens the canonical form for review and
submission; its backend validates everything again. A chat result does not reserve
a resource. `OPEN_BOOKINGS` and `CHOOSE_CONTEXT` are navigation/form actions.

## Temporary conversation state

The browser sends a server-issued UUID, its current workspace and optional form
context. It never submits a transcript or identity. Conversation ownership binds
the account, hashed bearer session and current role. A foreign, evicted or expired
UUID has the same `409 ASSISTANT_CONVERSATION_EXPIRED` response.

In-process storage retains up to ten turns, 12,000 UTF-8 bytes of serialized
question/reply history, five resource/slot references and 200 sessions per process.
Expiry is 30 idle minutes, checked on access and swept every minute. Raw bearer
credentials and business tool output are not stored. Earlier business replies
become an internal intent marker rather than operational evidence.

The human-support extension separately retains up to twenty displayed question/
answer messages (at most 12,000 serialized UTF-8 bytes) in the same owner-bound,
expiring session. This display transcript is never provider history and contains
no raw tool JSON. The signed-in customer explicitly requests support and chooses
whether to share it; the support API copies server-owned messages into that
durable support record. Staff see the shared prior context as historical text,
not verified current business status. Foreign/expired conversation IDs fail.

Minimize preserves the browser draft, conversation ID and visible turns; locale
changes preserve original questions. New conversation deletes current server
context and clears selected form context while retaining the unsent draft.
Authenticated logout cancels that session's assistant work and deletes its server
context. Reload starts a fresh browser conversation; abandoned server context
expires separately. Restart clears server memory. This does not introduce JWT
revocation or durable assistant storage. An explicitly shared support record
remains after the temporary assistant session is cleared.

## REST API

All paths below require authentication and the `MCP_ASSISTANT_ENABLED` backend
flag. The UI separately requires `VITE_ENABLE_AI_ASSISTANT`.

```http
GET /api/assistant/suggestions
GET /api/assistant/tools
POST /api/assistant/chat
DELETE /api/assistant/conversations/:id
```

The strict chat body supports:

```json
{
  "message": "Cho tôi xem cái thứ hai",
  "locale": "vi",
  "conversationId": "server-issued-uuid",
  "workspace": "resources"
}
```

Omit `conversationId` for a new conversation. Optional `resourceId`, `startAt`,
`endAt`, `durationMinutes` provide explicit form context. Both timestamps must be
present or absent; they include an offset and the start must precede the end.
Duration is 15–480 integer minutes; message length is 2–2,000 characters. Explicit
form values override inferred slot-search arguments. Selecting a historical slot
rechecks its exact resource/time interval instead.

Responses include `answer`, localized `summary`, `locale`, `provider`
(`local`/`openai`), `modelStatus`, `toolsUsed`, `toolResults`, `actions`, `source`,
`generatedAt`, and `conversation: { id, expiresAt, retainedTurns }`. Sources are
`local_guidance`, `authenticated_mcp`, `model_conversation` or `model_guidance`.
The UI renders plain text and collapsible evidence, not raw transport JSON/HTML.

Suggestions report booleans for key/model presence and `CONFIGURED_UNVERIFIED`
when both exist. This is configuration status, never proof of provider access or
answer quality. Neither the key nor its value is returned to the browser.

## Registered MCP tools

| Tool | Existing data boundary |
|---|---|
| `get_operational_summary` | Explicit overview request within actor scope |
| `search_resources` | Canonical category, subtype and physical state |
| `get_resource_detail` | Authorized resource and persisted lab policy |
| `find_available_slots` | Policy, bookings and maintenance; candidates only |
| `check_booking_conflicts` | Interval conflicts without foreign booking identity |
| `get_my_bookings` | Authenticated actor's own bookings |
| `get_booking_detail` | Existing booking access rules |
| `list_notifications` | Authenticated actor's own notifications |
| `search_knowledge_base` | Active persisted document chunks and source metadata |
| `recommend_equipment` | Actual resource data; missing specs stay unknown |
| `check_user_eligibility` | Actor training and resource/lab booking policy |
| `get_incidents` | Existing personally reported/assigned lab/global scope |
| `get_monitoring_summary` | Authorized staff/admin data; hardware-off deferred |

Tools are read-only. Their `limit`/scan bounds describe previews, not full queue
aggregation. The workspace booking/incident pagination contract is unchanged.

## Finite work and deployment limits

Defaults: six chat/reset requests per account per minute, four active assistant
answers per process, one active answer per account, 30-second overall deadline and
10-second tool timeout. A turn has at most 13 MCP tool reads: five choice refreshes,
three distinct planned reads and five eligibility checks. MCP also retains its
separate ingress/account admission and rate budgets.

Each provider data payload is bounded to 24,000 serialized UTF-8 bytes, including
history/context/results. Fixed instructions/schema are separately finite. SDK
retry count is zero; timeout is at most 15 seconds per call. Planning has a
2,000-token output cap; synthesis has 900. A LAB turn can call the provider twice.
Repeated failures pause calls using the existing process-local circuit breaker.
Cancellation releases admission and does not commit late history. Pending
non-cancellable Prisma work retains MCP admission until it settles.

These controls and memory are single-process. Multiple replicas would require
shared admission/memory or a deliberate sticky-session design and fresh tests.
Responses use `store:false`; this alone does not define the provider's retention
policy. Model prose may still be inaccurate. Review live provider behavior after
configuration, especially dates, follow-up intent, privacy and cost.

## Official API references

- [Responses conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Application tool-calling flow](https://developers.openai.com/api/docs/guides/function-calling)
- [Remote MCP guidance](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

This implementation executes validated plans through its authenticated local MCP
bridge. It does not expose localhost to a remote provider or use remote MCP
authorization to bypass current backend scope.

## ChatGPT account bridge — 14 October 2026

ADR-036 adds the requested optional customer question → ChatGPT Work/Cloud →
LAB reply path. It is separate from JWT-protected internal `/mcp` and Responses.
The bridge uses `/mcp/support-bridge`, protocol 2026-07-28 and MCP Events. All
customer requests/outbox/subscriptions/grants are persisted; ingress is bounded.
It is disabled unless explicitly configured. No API key is needed for this path,
but an installed connection, ADMIN OAuth consent and subscribed Work chat are.

Three remote tools: `get_question_context`, `read_question_data` and
`publish_question_reply`. The last writes chat text and optional review drafts,
never business records. Read schemas allow
catalogue/detail/slots/conflicts/eligibility, owned bookings/notifications/incidents,
resource tariff/rental quote, active LAB support options and owned payment/loyalty/support status. Business
reads use the request's current CUSTOMER identity, not the OAuth owner's ADMIN
scope. No passwords, tokens, contact snapshots, provider URLs, other customers'
records, private support transcripts or global operational audit are projected.

`src/chatgptBridge/knowledge.js` holds 16 reviewed business topics, versioned with
code: roles/registration/OTP, catalogue, auto confirmation, interval/policy/care,
prices, verified payments, handover/moves/cancellation, incidents, loyalty, FIFO
support, emails and privacy. Context includes this version, fresh time and safe
navigation paths. `timeContext` supplies Asia/Ho_Chi_Minh time and explicit today/
tomorrow dates; relative dates must use these values rather than the UTC calendar
or conversation history. Version 2026-10-14.1 adds this rule after two live answers
selected the wrong local date. Version 2026-10-14.2 also requires an opened
primary data row, matching timestamp/units/columns before quoting changing
external numbers. A snippet, URL or timestamp alone is insufficient; missing
dynamic values or conflicting sources require an explicit verification limit.
Dynamic values require a fresh scoped tool read; prior answers
are conversation only. Publish requires the current context version. This is
retrieval/grounding, not fine-tuning, and does not certify model accuracy.

Optional `proposals` is a strict discriminated union: at most one BOOKING and one
STAFF_SUPPORT. Server checks current resource/LAB, policy, overlap, care, training
and quote, or active assigned staff. It derives display names and quote itself;
model-supplied actor, price, URL or unsupported action is rejected. Drafts expire
after five minutes or request expiry, whichever comes first. Identical answer and
proposal replay is idempotent after PostgreSQL JSONB key reordering. The customer
opens the ordinary booking or support form; only its explicit submission performs
the business action. Those APIs retain current auth/RBAC, version/quote checks,
booking exclusion and support idempotency/dispatch. A typed yes does not submit.

OAuth: exact configured ChatGPT callbacks, S256 PKCE, explicit audience/scopes,
ADMIN consent, hashed code/access/refresh tokens, refresh rotation/replay revocation
and credential-version rechecks. Replacement revokes the prior connection and
pending work. Callback HTTPS requires public DNS answers, pinned IP and TLS;
redirects are refused. Webhooks sign exact bytes with Standard Webhooks, verify
challenge before activation, encrypt secrets and retry at most five times.

Request timeout is ten minutes. Context/data reads are capped at 13 and 24 KB;
conversation reads include at most ten answered turns in the last thirty minutes.
One pending request/customer; four MCP operations/process, one active/grant.
Subscription TTL is at most 24 hours and must be refreshed by the receiver.
Delivery 2xx is receipt, not an answer. Handoff/cancellation/expiry/revocation rejects
late replies. Persisted chat records do not disappear when context TTL expires;
a deletion/retention policy must be defined before production. Multi-replica
admission has not been certified. Bridge transcripts are not automatically copied
to human support; the customer's existing staff-chat button remains available.

Private package source is `plugins/lab-support-bridge`. Build its endpoint config
with `backend/scripts/buildChatgptBridgePlugin.mjs`; the script checks HTTPS/OAuth
metadata and anonymous rejection before producing the package in ignored logs.
No credentials belong in plugin files. Installation alone is not a connection.
Portable source is version 0.1.4. For Work Cloud, first register the custom app
in the target account, then build with its registered app ID or add the same skill
to that app's exported package without changing OAuth or other app metadata.
The private app [LAB Support Connection 14-10](https://chatgpt.com/plugins/plugin_asdk_app_6ace700c035081919aaecc37ed2c87db)
completed real consent and a VERIFIED event subscription. Its exported package
was updated to 1.0.1 (Apps 1, Skills 1), preserving the app ID and metadata.
Authorization/token requests ignore unknown RFC6749 extensions while keeping
required security fields exact. ADMIN status separates authorized from ready.

Actual automatic Work replies were observed for nine customer questions, with
the first submitted and displayed in the website UI. Two selected the wrong
Vietnamese next-day date; the timeContext fix passed automated checks and live
retests for cases 2/5, using October 15 and the customer's actual confirmed room.
Cases 10–15, then 16–21 received real replies. Initial case 19 is a content FAIL:
its three exchange-rate values differed by 20 VND from the opened Vietcombank
table while claiming the same 09:23 timestamp. A real reply/citation is not proof
of correctness. Knowledge/skill now require primary data rows. The live retest
answered in 42.5 seconds, correctly stating that the fetched primary page omitted
the USD row and linking the official lookup instead of inventing a number.
This passes the verification-limit criterion, not a live exchange-rate quote.
Case ten received its event but stopped before replying when shared Work quota
became exhausted. It was cancelled via the owning CUSTOMER API, not marked PASS.
Later case 16 also stopped on quota and was cancelled; its resumed run answered
correctly without changing price or bypassing conflicts. Fresh usage showed
0% remaining five-hour quota and 69% weekly; the user chose another account.
The replacement account PĐ HƯNG Plus now shows 79% five-hour and 65% weekly
remaining. Its old app endpoint is stale, so [LAB Support Connection Current](https://chatgpt.com/plugins/plugin_asdk_app_6ace7c55a1b0819184522db6d50521e5)
was registered at the current review endpoint. Skill 1.0.1 was saved and read
back through Plugin Creator with unchanged app mapping/metadata. Fresh ADMIN
consent and subscription completed. One real UI BOOKING proposal created no
booking before confirmation; editing/closing the form was read-only. Confirmation
created booking ce570c2b-2afc-4d2b-a2e0-6e7965f80550 for October 15, 10–11 Vietnam
time, 60,000 VND; resubmitting its interval was rejected and only one persisted.
The model read the owned pending payment correctly, without provider settlement.

After the review processes and quick tunnel stopped, the test DB/API/UI were
restored without resetting data. The old hostname could not be reused. The
replacement [LAB Support Connection Local](https://chatgpt.com/plugins/plugin_asdk_app_6acf0120dd18819185e94ea9078f09c5)
uses transmission-pubmed-paxil-isle.trycloudflare.com with grant at 11:18 Vietnam
time and one VERIFIED subscription. It is now 1.0.2, preserving original exported
metadata/app mapping and adding stricter evidence instructions. Fresh browser
usage at 11:08 showed 100% five-hour and 53% weekly remaining after natural reset;
no reset credit or purchase was used. A fresh STAFF_SUPPORT request answered in
56.7 seconds with three scoped reads. No support session existed before customer
confirmation. The customer edited its prefilled form and submitted through the
website; session 28b50da9-c3b1-4f92-8c23-2a6ca2c428a1 displayed WAITING #1.
Authenticated staff availability assigned it automatically, staff sent a message
through the normal API, the customer replied in the UI, and staff closed it.
ADMIN read all seven messages/events and the correct handler through its API;
the customer's UI retained the closed transcript. Staff/admin UI and live
multi-staff queue coverage are not implied by this single-staff run.

Later October14 checkpoint: one installed [LAB Support](https://chatgpt.com/plugins/plugin_asdk_app_6acf13e36eec81918a51082417a0e8b7),
Cloud1.0.1, at the fixed ngrok dev domain projector-blaspheme-angelfish.ngrok-free.dev.
The four earlier LAB packages were uninstalled; the same Work consumer switched
to this app, renamed Tiếp nhận hỗ trợ LAB, with one VERIFIED subscription. Its
first real customer UI reply arrived in33.6seconds with one read. The shortened
consumer also answered an owned-booking question correctly in48.5seconds and
the general equation in105.9seconds. No manual GPT send occurred after those
customer requests; latency remains too high and variable for instant chat. The
consumer prompt avoids redundant reads after publish; host batching/debounce
configuration was not exposed. There is no few-second latency guarantee.
Local gateway8003 routes only exact OAuth/MCP paths to8002 and main API/VNPAY to
8000; review business API remains private. Customer STAFF_SUPPORT review now
stays in the existing assistant dock without navigation, including queue/status,
staff messages and closure. The guarded support regression passed9 backend and
22 UI checks, including parallel staff/FIFO, admin history/requeue, reopen after reload and network
recovery. The live single-staff dock flow also completed. A bridge transcript is
retained visually in that signed-in dock but is not yet copied to staff history.

Verified local checks: 28 backend bridge/security/protocol/time cases, nine frontend
poll/cancellation/redirect/proposal cases; protocol replies use labelled test fixtures.
Canonical booking/support HTTP confirmations were also checked in the isolated
DB: changed quotes and overlaps rejected, valid booking automatically CONFIRMED,
payment remained pending, duplicate support request IDs created one WAITING session.
The 21 live-model evaluation scenarios are versioned in
`backend/test/fixtures/chatgptBridgeEvaluation.json`; the live subset and failures
above must not be replaced by protocol fixtures or treated as an all-content pass.
See SYSTEM_TEST_GUIDE for role-by-role steps and explicit PASS/FAIL/BLOCKED status.
A guarded PostgreSQL `lab_resources_chatgpt_bridge_test` and loopback review
8001/8002/5174 do not use the shared business database. Only OAuth/MCP gateway
paths are public in the temporary review tunnel; business endpoints return 404.
See AI_ASSISTANT_SETUP and INTEGRATION_GUIDE before enabling on the real runtime.
Repeatable integration testing may use the separately guarded
`lab_resources_chatgpt_actions_test`, leaving the OAuth review database untouched.

Official sources checked 14 October 2026:
- [MCP Events](https://developers.openai.com/plugins/build/mcp-events)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [OAuth](https://developers.openai.com/plugins/build/auth)
- [Plugin package and registered apps](https://developers.openai.com/plugins/build/plugins)
- [Shared usage and pricing](https://learn.chatgpt.com/docs/pricing)
- [Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
