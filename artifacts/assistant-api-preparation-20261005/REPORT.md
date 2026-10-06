# Contextual assistant preparation — 2026-10-05

## Outcome and scope

Prepared the existing LAB assistant for contextual VI/EN model conversation before
the user adds a real API key. Work stays local on `codex/lab-workspace-ui-draft`,
starting at `43b18328f80a1297c236b69e5496cc8afce86d72`. Existing uncommitted UI work
is preserved. No commit/push, new numbered Batch, schema/migration/reset or live
provider activation was performed.

Running demo: [UI](http://127.0.0.1:15181/), API at `127.0.0.1:15005`; existing
`lab_resources_local_demo` data is reused. The launcher was restarted with the
latest source; its rotating JWT secret requires a fresh sign-in. No additional
Docker stack or unrelated process cleanup was performed.

## Implemented behavior

- Temporary server-owned conversation IDs bind account, hashed bearer session
  and current role. Ten turns/12,000 UTF-8 history bytes, five choices, 200 sessions
  per process and a 30-minute idle expiry bound memory. Browser transcript and
  identity fields are rejected. Reset and logout clear current/session context;
  logout aborts outstanding session work. This does not revoke stateless JWTs.
- The installed OpenAI SDK now supports strict Responses intent planning:
  conversational reply, clarification, application payment guidance, or validated
  existing MCP reads. Unknown/write tools, identity overrides, duplicate tools,
  empty LAB plans and mixed slot-selection/read plans are rejected.
- Existing MCP handlers remain authoritative. Old resource choices are freshly
  authorized before model context is composed. Prior business prose is replaced
  with a non-evidence marker. Selected historical slots are checked at their exact
  resource/interval, with truthful search-window labels. Staff scope remains based
  on persisted assignments; unassigned staff receives no operational scope.
- Grounded synthesis receives fresh lookup results and candidate eligibility,
  including required training. Failed/deferred lookup or eligibility evidence
  prevents factual model synthesis. Only eligible candidates get canonical form
  prefill; no assistant booking/payment mutation is introduced.
- Provider calls retain deadlines, cancellation, finite output, zero SDK retries,
  24,000-byte serialized data budgets and the existing failure circuit. A turn
  allows three distinct planned reads and at most 13 total MCP tool reads.
- The lower-right dock sends the server ID and current workspace, preserves
  draft/locale/minimized conversation state and offers a small New conversation
  text control. Expired/foreign IDs require explicit recovery and preserve drafts.
  Provider/source information distinguishes general chat from checked LAB facts.
- Environment examples and both Compose files expose conversational routing.
  `npm --prefix backend run assistant:check` checks configuration without returning
  keys, querying the DB or calling/billing a provider. Real `.env` files were not
  edited. The current demo enables assistant flags in its launcher; default backend
  file configuration still reports the assistant flag off and `MISSING_KEY`.

No general web search, persistent chat DB, remote MCP connection, streaming,
autonomous approval, email, shipping or payment execution was added.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Backend required gate | 82 pass: 38 core, 6 release security, 38 assistant/transport; zero skipped | [Log](backend-required-final.log) |
| Isolated PostgreSQL + actual REST/MCP | 10 pass, zero skipped | [Log](integration-final.log) |
| Four-role real browser conversation | 122 assertions, zero uncaught errors or booking/payment POSTs | [Log](browser-tests-final.log), [results](verification/result.json) |
| Student dock and canonical form regression | 37 assertions pass; exact resource/Vietnam time, keyboard, failure/cancellation recovery, no booking/payment POST | [Log](widget-regression.log), [results](widget-regression/result.json) |
| Frontend required gate | 2,189 matching VI/EN keys, 83 active source modules, 8 locale/network tests; typecheck/build pass | [Log](frontend-required-final.log) |
| Frontend lint | Zero errors; nine existing warnings in other components | [Frontend log](frontend-required-final.log) |
| Backend lint | Pass | [Log](backend-lint-final.log) |
| Production configuration fixtures | Pass | [Log](production-config.log) |
| Both Compose configurations using examples | `config --quiet` passed; containers were not rebuilt/launched | Commands below |
| Configuration-only preflight | `MISSING_KEY`, no real model set | [Log](preflight-final.log) |

The new unit tests check conversation ownership, expiry/eviction/byte caps,
current-role/session changes, casual chat context, exact historical selection,
inferred versus explicit windows, training eligibility, revoked LAB references,
malformed plans, provider outage/circuit behavior and cancellation/logout late
completion. A local HTTP fixture captures requests from the installed OpenAI
SDK to verify strict schema, history, eligibility, `store:false` and finite output.
This is transport verification against localhost, not live model acceptance.

The real integration suite uses only the guarded local
`lab_resources_assistant_test` database. New cases test foreign UUIDs, forged
history, reset/logout and revoked staff assignment. Booking, payment and audit
counts remain unchanged during assistant interactions. Setup/cleanup only changes
isolated test fixtures; no DB reset/migration was run.

The four-role browser test exercises actual login, local MCP answers, choice
continuation, minimize, VI/EN changes, reset, draft/focus preservation and unknown
conversation recovery. Its invalid-ID test modifies a request and receives an
actual backend 409; it does not simulate 30 minutes of browser idle expiry. TTL
is covered separately by a controlled clock unit test.

Reproducible checks from the repository root:

```powershell
npm --prefix backend run test:required
npm --prefix backend run lint
npm --prefix backend run verify:prod-config
npm --prefix frontend run test:required
node artifacts/assistant-widget-20261005/run-integration.mjs
docker compose --env-file .env.example -f docker-compose.yml config --quiet
docker compose --env-file .env.production.example -f docker-compose.prod.yml config --quiet
$env:LOG_FORMAT='dev'
npm --prefix backend run assistant:check
```

The integration runner privately derives the existing local test DB connection
and verifies its target name; it does not print credentials. The Codex shell
inherits `LOG_FORMAT=json`, which the project's config rejects; preflight was
rerun with the valid local value `dev`. No logging config file was changed.

Browser checks run from `frontend/` with the public demo password supplied via
`UX_DEMO_PASSWORD`, `CHROMIUM_EXECUTABLE_PATH` pointing to installed Chrome and
loopback API/UI URLs. The student regression sets `UX_TEST_ROLES=student` and its
own artifact output directory. Fault injection in that older regression is
test-only failure/cancellation; its booking suggestions use real MCP data.

## Review and documentation

Reviewed the task diff against saved pre-task inputs, rather than treating earlier
local UI work as this change. [Backup manifest](backup/manifest.json) hashes are
verified by [the diff helper](build-task-diff.py). The AppLayout backup reconstructs
the inspected original line by removing only this task's new workspace prop.
[Task diff](task.diff) and [file summary](task-changes.json) record the scope;
`git diff --check` passes. No secrets or real `.env` files are copied into evidence.

Updated the [MCP contract](../../docs/AI_ASSISTANT_MCP.md),
[setup guide](../../docs/AI_ASSISTANT_SETUP.md), SRS Appendix C, ADR-025, backend and
frontend guidelines, current state and documentation index. The previous MCP
document incorrectly described Wikipedia, retired tools and unsupported provider
values; it now matches the current implementation. Historical verified reports
remain unchanged.

Applied the `openai-docs` skill and checked official Responses/conversation,
Structured Outputs and tool-calling guidance. Used UI UX Pro Max keyboard/focus
guidance for reset/recovery while retaining the approved LAB dock layout.

## Remaining verification and risks

1. **No real OpenAI key/model was supplied.** Account access, live strict-schema
   acceptance, natural language quality, relative-date interpretation, latency and
   billing are unverified. Setup is ready for the configuration and smoke tests in
   the guide; the local analyzer is not presented as conversational AI.
2. Model prose may still be inaccurate. Prompts/schema do not prove every answer
   is true. Backend authorization and canonical form validation remain final.
3. Provider payloads can contain original user questions and currently authorized
   business evidence. `store:false` does not define provider retention. Review
   account/provider policy before production. No JWT is sent to the provider.
4. Conversation store, rate admission and circuit are process-local. Replicas need
   a separate shared-state/admission design and tests. Reload does not immediately
   delete abandoned server context; idle expiry/restart removes it. Stored result
   references cover resource/slot choices, not every possible booking-list follow-up.
5. Complex repeated requests can hit separate MCP rate/deadline/scan budgets before
   the chat-rate cap. These are bounded previews, not complete queue aggregation.
6. This is focused assistant verification, not a fresh full-project QA, production
   deployment, external-service/hardware acceptance or comprehensive mobile audit.

No push was performed. The original draft PR and the user's local backup boundary
are preserved.
