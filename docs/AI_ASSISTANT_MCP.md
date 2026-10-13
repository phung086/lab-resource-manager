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
the empty scope when no lab is assigned. Student/lecturer booking reads remain
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

## ChatGPT connection research — 13 October 2026

The website already calls Responses through assistantModel and validated plans
through the authenticated local MCP bridge. Retain this path for the LAB chatbot:
server-only API key/model, bounded output, store:false, current identity/LAB scope,
and existing human handoff. No live provider call was verified in this batch.

A ChatGPT plugin exposes LAB tools/UI inside ChatGPT or Codex. For private LAB
data the current bearer-protected /mcp endpoint needs remote HTTPS deployment,
OAuth 2.1 with PKCE, protected-resource and authorization-server discovery,
audience/scope checks and account linking before it can be connected. Reusing
read-only tools is feasible; do not publish today's local JWT as a shared token
or bypass account/LAB access. This is an implementation direction, not a deployed
plugin. See [MCP server](https://developers.openai.com/plugins/build/mcp-server)
and [authentication requirements](https://developers.openai.com/plugins/build/auth).

ChatKit offers an embeddable chat UI, with a custom server integration currently
using its Python SDK; replacing this project's Express chat route would require
an additional adapter/service and fresh auth/history/handoff tests. Do not migrate
frameworks for it. For new work, avoid the retiring Agent Builder-hosted path;
its shutdown is scheduled for 30 November 2026. See
[ChatKit](https://developers.openai.com/api/docs/guides/chatkit).

Sign in with ChatGPT has website identity and eligible plan-usage integrations.
Eligibility/registration for LAB has not been verified; do not assume a paid
ChatGPT account alone supplies website API access. See
[Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart).
