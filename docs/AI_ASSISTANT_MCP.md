# LAB assistant and MCP contract

Current local continuation: 2026-10-05. No new numbered Batch or live provider
activation. [Setup guide](AI_ASSISTANT_SETUP.md) explains configuration; the
verification report (historical run output; retired)
records the tested environment and limits.

## Runtime modes

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

## ChatGPT account bridge — 13 October 2026

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
navigation paths. Dynamic values require a fresh scoped tool read; prior answers
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
The private workflow plugin [LAB Customer Support](https://chatgpt.com/plugins/plugins_6ace18242404819191817976606cf5ce)
is at version 0.1.2. Read-back confirms the original metadata/audience/MCP config,
review-draft guidance and general-question evidence/uncertainty rules.
Its web listing currently exposes a desktop-only launch. The private web app
[LAB Support Connection](https://chatgpt.com/plugins/plugin_asdk_app_6ace1b6f93dc8191b806163d21a005d7)
completed client registration and real user consent in Chrome. Authorization and
token requests now ignore unknown extensions per RFC6749 while keeping required
security fields exact. A real ChatGPT Chat call for an unknown request ID returned
NOT_FOUND. Work Cloud reports exhausted usage; no event subscription or automatic
website answer has been certified. ADMIN status separates authorized from ready
(an active event subscription). Account replacement is awaiting the user's login.

Verified local checks: 26 backend bridge/security/protocol cases, nine frontend
poll/cancellation/redirect/proposal cases; protocol replies use labelled test fixtures.
Canonical booking/support HTTP confirmations were also checked in the isolated
DB: changed quotes and overlaps rejected, valid booking automatically CONFIRMED,
payment remained pending, duplicate support request IDs created one WAITING session.
The 21 live-model evaluation scenarios are versioned in
`backend/test/fixtures/chatgptBridgeEvaluation.json`; they have not been graded.
A guarded PostgreSQL `lab_resources_chatgpt_bridge_test` and loopback review
8001/8002/5174 do not use the shared business database. Only OAuth/MCP gateway
paths are public in the temporary review tunnel; business endpoints return 404.
See AI_ASSISTANT_SETUP and INTEGRATION_GUIDE before enabling on the real runtime.
Repeatable integration testing may use the separately guarded
`lab_resources_chatgpt_actions_test`, leaving the OAuth review database untouched.

Official sources checked 13 October 2026:
- [MCP Events](https://developers.openai.com/plugins/build/mcp-events)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [OAuth](https://developers.openai.com/plugins/build/auth)
- [Plan-usage boundaries](https://developers.openai.com/siwc/token-sharing-open-source)
- [Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
