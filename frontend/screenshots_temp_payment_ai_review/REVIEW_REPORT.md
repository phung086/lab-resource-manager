# Payment + MCP AI integration — human review report

Date: 2026-09-22. Final verdict: **GO FOR HUMAN REVIEW** for the optional code integration, not live financial/provider readiness.

## Pre-flight and boundaries

- Branch: `final-graduation-hardening`; HEAD and origin branch: `0bb0d020f86d0ab93b783d637f60d9422e1ff4d2`. No commit, push, merge or tag.
- Preserved inherited 2026 frontend transformation (22 tracked frontend changes plus AuthIdentity/WorkspaceHome and historical review artifacts). New work builds on that diff; `working-tree.txt` and `diff-stat.txt` describe the combined tree, not a clean baseline.
- React/Vite + Express/Prisma/PostgreSQL 16 retained. Zero schema changes, zero new/edited migrations, zero canonical docs/.env.example edits. Existing nine migrations applied only using `prisma migrate deploy` in isolated test databases.
- Mandatory canonical roles, booking lifecycle, resource categories and operational status preserved. Payment cannot approve/complete a booking. Old `/api/ai` remains unavailable. No next batch started.

## Booking LAB → payment

The latest user clarification is implemented: canonical booking success offers “Xem khoản thanh toán của lịch đặt”; owner booking cards offer “Thanh toán lịch đặt”. Both carry the persisted booking ID to the scoped payment screen. ADMIN has the same handoff for explicit charge creation. LAB_STAFF cannot administer charges or read another person's financial transactions.

An actual `ROOM` booking was submitted through the existing form in an isolated browser test. With no administrator-created charge, the payment page truthfully stays empty. ADMIN then created a 45,000 VND test charge through the UI; the owner generated a VNPAY Sandbox URL for that same booking. This is a test fixture amount, not a product fee. A signed failed callback changed only the payment and removed the obsolete payment link. Core booking status remained unchanged. See `lab-room-payment.log` and the three `lab_room_*.png` captures.

No fee schedule, mandatory prepayment, or automatic charge has been invented. Those business rules were not approved in the brief. The payment model remains associated with any authorized booking; the new entry points make the LAB-room use case direct.

## Payment architecture and access

- Backend `PAYMENTS_ENABLED` and frontend `VITE_ENABLE_PAYMENT_FEATURES` default false. Provider flags independently default false.
- Reuses existing PaymentTransaction fields and lowercase payment enum (`pending/success/failed/refunded`), separate from uppercase BookingStatus.
- ADMIN explicitly creates positive integer VND charges from an existing booking. Owner identity comes from persisted booking data. Advisory transaction lock serializes duplicate charge attempts; pending/success duplicates are rejected.
- Owner initiates payment; ADMIN can inspect ledger/receipts. Foreign ownership returns nonenumerating 404. Staff/lecturer/student cannot access admin financial endpoints. Service also enforces ADMIN on ledger access.
- Ledger supports status, provider, text, optional date filters in API, and booking ID; UI exposes status/provider/search and scoped booking handoff. Results capped at 100; not full pagination.
- Browser cannot supply amount/provider status through initiation requests. Provider choice is locked after initiation to prevent an old callback crossing payment methods.

## VNPAY Sandbox

Implementation follows [official VNPAY payment documentation](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) and [HMAC migration guidance](https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html): sorted UTF-8 percent-encoded parameters, spaces encoded as `+`, HMAC-SHA512, integer VND × 100, UTC+7 dates and 15-minute URL expiry. Only the official sandbox payment URL is accepted.

IPN validates scalar fields, timing-safe signature, merchant, reference, stored amount, provider/currency and pending state. Success requires both response/status `00`, transaction number and valid provider timestamp. Conditional update means concurrent/replayed callbacks cannot overwrite final status. Return URL verifies the signature and displays informational HTML only; it never writes payment state. IPN URL is configuration for merchant registration, not an invented checkout parameter.

**MANUAL VNPAY SANDBOX: NOT RUN — CREDENTIALS NOT PROVIDED.** Local environment presence checks found no usable merchant/secret/return/IPN configuration. Signing and callback tests use an explicitly isolated test secret; the success receipt is generated from a real signed test callback, not live merchant processing.

Limitations: no refunds/reconciliation workflow was added; repeated initiation returns the persisted URL, so an expired pending URL is not automatically renewed. Operational recovery for provider silence/expired pending charges needs an approved reconciliation policy before live use. Failed transactions can be followed by a new explicit ADMIN charge. Return page tells the user to return and refresh; no frontend query-string success authority exists.

## VietQR

QuickLink mode uses configured bank BIN, account, name, template, stored amount and a 24-character transaction reference. Paired client/API credentials select the official generate API with timeout and validated PNG response; no API failure becomes mock success. References: [official QuickLink](https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/) and [generate API](https://www.vietqr.io/en/generate/).

QR creation always leaves payment pending; UI says “Đang chờ đối soát”. No user/admin “confirm paid” endpoint was introduced. **VIETQR LIVE ACCOUNT: NOT CONFIGURED.** Only the isolated automated fixture used a TEST FIXTURE ONLY recipient. The QR screenshot is real QuickLink rendering for that fixture, not a live-account endorsement. Credentialed generate-API/live bank reconciliation was not exercised.

## Receipt

Internal receipt is available only for persisted success with paidAt. Shows transaction reference, amount/currency, payer, booking/resource, payment date and generation date. Explicit disclaimer: “Không thay thế hóa đơn điện tử/tài chính theo quy định.” Printing uses the same persisted receipt data. Chromium export verified one A4 page using Poppler; rendered `receipt_print.png` was opened and independently reviewed. `internal_receipt_test_fixture.pdf` is automated fixture evidence, not a real payment receipt.

## MCP and grounded assistant

Official stable SDK packages `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/node` pinned to 2.0.0 in backend only. Installed SDK docs/types and [official v2 migration documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md) were consulted. Streamable HTTP `/mcp`, stateless per request, JWT auth before dispatch and actor bound from current database user; explicit Origin allowlist. No browser-supplied server URL. Backend assistant opens an official MCP Client to a fixed loopback endpoint and forwards actor authorization.

Canonical read-only tools:

1. get_operational_summary
2. search_resources
3. get_resource_detail
4. find_available_slots
5. check_booking_conflicts
6. get_my_bookings
7. get_booking_detail
8. list_notifications
9. search_knowledge_base
10. recommend_equipment
11. check_user_eligibility
12. get_incidents
13. get_monitoring_summary

Strict JSON schemas reject extra arguments/noncanonical enum values and bound result sizes. Students/lecturers see own bookings/notifications, staff follows UserLabAssignment; unassigned staff fails closed. ADMIN global summary is tested. Catalog remains readable per existing policy. Booking conflicts hide foreign booking/requester identities; intervals are half-open. Slot tools read real booking/maintenance/LabPolicy/operational state; proposed slots do not reserve anything. Mandatory training checks gate booking prefill actions. All public-table contents were hashed before/after read-only calls and compared unchanged. Missing telemetry remains NO_DATA.

Knowledge results cite stored document/chunk metadata only; no external invented SOP. Search is deterministic lexical matching, not vector retrieval. Recommendation uses actual stored specs and never infers missing VRAM.

**OPENAI: NOT CONFIGURED.** Local Vietnamese intent routing calls MCP and formats its results; it is a bounded deterministic assistant, not unrestricted natural-language reasoning. If OPENAI_API_KEY and OPENAI_MODEL are explicitly provided, the existing OpenAI SDK uses Responses with `store:false`, timeouts and no model mutation tools; model failure falls back to tool results. [Official Responses text guidance](https://developers.openai.com/api/docs/guides/text) informed this integration. Live model execution was not tested without a key. Conversation stays in component memory while the panel is open, with no DB conversation writes.

Booking prefill opens the canonical form and requires the user to submit; backend revalidates then. No create/approve/cancel/payment mutation tool exists. Tools/results remain the evidence for displayed answers.

## Flags and configuration

Defaults stay OFF: PAYMENTS_ENABLED, MCP_ASSISTANT_ENABLED, VITE_ENABLE_PAYMENT_FEATURES, VITE_ENABLE_AI_ASSISTANT, VITE_ENABLE_RESEARCH_FEATURES. Optional integration used backend 15003/frontend 15178; canonical regression used backend 15002/frontend 15177. Production B7 used separate compose project `lrm-optional-review-20260922`, port 18087, with optional flags absent/off.

Required deployment inputs, never saved into tracked env files:

- VNPAY_ENABLED, VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL, VNPAY_IPN_URL; optional VNPAY_VERSION=2.1.0 and official sandbox VNPAY_PAYMENT_URL.
- VIETQR_ENABLED, VIETQR_BANK_ID, VIETQR_ACCOUNT_NO, VIETQR_ACCOUNT_NAME, optional VIETQR_TEMPLATE; paired VIETQR_CLIENT_ID/VIETQR_API_KEY for API mode.
- OPENAI_API_KEY/OPENAI_MODEL only if external-model synthesis is desired.
- Backend flags are runtime environment; Vite flags require frontend build/start environment.

Canonical Dockerfile/compose were deliberately unchanged. Enabling optional features in a separate deployed environment requires explicit runtime/build-arg wiring (and proxy routing for external MCP clients, if needed). Current canonical compose does not automatically forward optional flags/provider settings. Internal assistant MCP uses backend loopback. No tunnel, merchant onboarding, real transfer or secret provisioning performed.

## Test evidence

| Gate | Result | Evidence |
|---|---|---|
| Backend lint | PASS | backend-lint.log |
| Core | 27/27 PASS | backend-core.log |
| Payment + actual MCP integration | 10/10 PASS (9 subtests + parent) | optional-integration.log |
| Frontend typecheck | PASS | frontend-typecheck.log |
| Frontend lint | 0 errors; 12 inherited warnings; no new payment/assistant warnings | frontend-lint.log |
| Vite build OFF and ON | PASS | build-off.log / build-on.log |
| B2/B3/B4/B5/B6/B8 isolated UI regression | PASS each; B4/B5 rerun after booking entry changes | b*-regression.log |
| Official production B7, unchanged script | 10/10 PASS, optional OFF | b7-demo.log / b7-build.log |
| Optional desktop/mobile browser E2E | PASS, no page errors/API 5xx | optional-ui.log |
| Actual ROOM booking/payment handoff | PASS | lab-room-payment.log |
| npm audit backend | 0 vulnerabilities | backend-audit.json |
| npm audit frontend | 0 vulnerabilities | frontend-audit.json |
| git diff --check | PASS | final command verification |
| Receipt print | 1 A4 page, rendered/opened | receipt_print.png / internal_receipt_test_fixture.pdf |

Integration coverage includes disabled routes, anonymous/disabled actor rejection, admin-only charges/ledger, foreign ownership, persisted amount, independent HMAC calculation, forged/wrong amount/merchant/ref/date callbacks, readonly Return, concurrent/idempotent success, terminal replay, failed receipt denial, VietQR pending/provider mismatch/no-confirm endpoint, missing provider config, canonical MCP registry/validation, scoped data, empty catalog, real policy/maintenance/half-open conflict boundaries, broken operational state, no DB mutations and local assistant fallback. Final isolated DB: `lab_resources_payment_ai_test_20260922_e`; optional UI fixtures live only in separate `_b` DB. Production final B7 DB: `lab_resources_optional_review_demo_20260922_r3`.

Intermediate failures were diagnosed rather than hidden: fixture NotificationType corrected to canonical enum; inactive user assertion corrected to existing 401 contract; PowerShell npm argument forwarding fixed by invoking Vite directly; mobile test uses actual Menu navigation rather than nonexistent hash routing; B7 test env was corrected to documented 10080-minute upcoming-reminder horizon and fresh DB. No official B7 assertion or required runtime rule was weakened. Print-only CSS correction occurred after B7; it is lazy optional CSS not used with features OFF, and final ON build/print verification passed.

## Performance

Vite-reported decimal kB. Baseline is the inherited transformation report, not original repository HEAD. Values measure bundles, not user-device timing.

| Asset | Inherited | Final OFF | Final ON |
|---|---:|---:|---:|
| Main JS | 406.23 | 407.48 | 407.88 |
| Main JS gzip | 115.28 | 115.52 | 115.68 |
| Main CSS | 194.78 | 194.78 | 194.78 |
| Main CSS gzip | 40.99 | 40.99 | 40.99 |

ON main JS increase ~0.41%; gzip ~0.35%. Lazy assistant JS 6.08 kB / 2.68 gzip; payment JS 11.48 / 3.84. Lazy CSS assistant 2.38 / 0.79; payment 2.96 / 0.93 including print. No frontend dependencies added; MCP stays entirely backend. Production B7 build main differs slightly (407.42/115.49) because API/app build environment differs from local build.

## Screenshots and UI review

Opened required eleven captures: student_payment_choice.png, student_vnpay_sandbox_pending.png, student_vnpay_success_receipt.png, student_vietqr_pending.png, admin_payment_ledger.png, ai_assistant_empty.png, ai_assistant_resource_search.png, ai_assistant_slot_recommendation.png, ai_assistant_booking_prefill.png, ai_assistant_mobile.png, staff_ai_scope.png.

Additional evidence: payment_terminal_refresh.png, booking_payment_handoff.png, student_payment_mobile.png, ai_assistant_mobile_response.png, lab_room_booking_success.png, lab_room_vnpay_pending.png, lab_room_payment_failed.png, receipt_print.png.

Impeccable/ui-ux/design skill guidance was applied against Admin's available skills; existing light operational UI preserved. Detector on new surfaces returned []. Independent finish reviewer initially required terminal-payment and response-discovery fixes; both were resolved. The reviewer then returned **ship** for those fixes and booking handoff, and separately **ship** for final print correction. Documenter confirmed ordinary extension, no canonical design files required; final print change rechecked. See FINISH_REVIEW.md and DESIGN_EXTENSION_REVIEW.md. Existing small shell labels/technical tool labels were not expanded into a new visual system.

## Resulting implementation

Backend: package/lock (three official MCP packages), app/config, payment routes/service/new paymentProviders, assistant routes/service/toolHandlers/mcpServer, new `test/paymentMcp.integration.test.js`.

Frontend: feature flags, App/AppLayout/Header/Sidebar integration; new payment and assistant components/CSS; booking success + booking-card/page callbacks; old VietQrPaymentModal reduced to an explicit retired placeholder with no fake success. New optional E2E scripts `test_payment_ai_e2e.mjs`, `test_lab_room_payment_e2e.mjs`. Earlier frontend transformation files/tests remain inherited and preserved.

No Prisma/migration/canonical docs changes. No secrets printed or committed. Test credentials in isolated automated fixtures are deliberately nonproduction. No paid API calls or real transfers made. Working tree intentionally remains uncommitted for human review.

## Final verdict

**PAYMENT + MCP AI INTEGRATION: GO FOR HUMAN REVIEW**

No open blocker to reviewing the optional code integration. Live activation still needs genuine VNPAY Sandbox merchant settings/IPN reachability, a verified VietQR recipient and an approved reconciliation policy; OpenAI live validation needs an explicit model/key. These are NOT CONFIGURED / NOT RUN, not claimed successes. Stop at this requested integration boundary.

Final environment cleanup: optional fixture API/Vite (15003/15178) and regression Vite (15177) stopped. Isolated test databases retained as evidence; no existing user database/container deleted. Canonical optional-OFF production review remains at http://127.0.0.1:18087.
