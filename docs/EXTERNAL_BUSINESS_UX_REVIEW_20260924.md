# External Business / UX / Architecture Review — 2026-09-24

## 0. Review metadata

- Repository: phung086/lab-resource-manager
- Reviewed base branch: main
- Reviewed HEAD: dbab29455994f0cd4953a00018896d47dc84344b — merge: open lab quick booking upgrade
- Review branch: review/business-ux-audit-open-lab-20260924
- Review date: 2026-09-24
- Reviewer stance: senior product engineer + business analyst + UX/security auditor
- Scope: required LAB core plus the approved Open LAB quick-booking/payment extension
- No historical migration was edited.
- No role/status enum was changed.
- No prisma db push was used.
- No mock success was introduced.

The review follows the repository authority order in AGENTS.md and the priority order Correctness → Security → Required Business Rules → Data Integrity → UX → Monitoring → AI → Optimization → Experimental.

## 1. Executive summary

### Overall assessment

The project has a credible LAB-management core and is substantially stronger than a generic room-booking application. Its best parts are the canonical booking lifecycle, database-level overlap protection, lab-scoped staff authorization, resource operational state, maintenance/incidents, real persisted notifications/audit data, public schedule privacy, and a clear boundary between required core and research modules.

The system is **conditionally suitable for a graduation demo on an already verified/migrated database**, provided the team presents the product as a LAB operations system and does not overclaim optional/research/payment capabilities.

It is **not yet reproducibly deployable from a fresh PostgreSQL database at the reviewed HEAD**. The current Batch 8 release gate fails at prisma migrate deploy before tests start. This is the most important engineering blocker because a clean install cannot currently prove the repository's migration history is self-consistent.

The new Open LAB flow is directionally good but should still be considered an extension under hardening. Its main risks are: guest booking is not atomic from identity/OTP to booking, customer classification can be self-asserted/overwritten, temporary phone-number password is predictable and reset is not server-enforced as a prerequisite, payment expiry/late-callback reconciliation is unfinished, and training/certification models are not enforced by the core booking service.

### Demo-readiness conclusion

**Required LAB core:** demoable with conditions.

**Fresh deployment/reproducibility:** not ready until the migration checksum/history path is fixed and release gate is green.

**Open LAB quick booking:** suitable for controlled demonstration after identity/OTP edge cases are addressed or explicitly disclosed.

**Live VNPAY payment:** do not present as production-complete until payment expiry, late callback/cancel reconciliation, and a real Sandbox round trip with reachable IPN have been verified.

### Top-level product position

The product should be described as:

> A laboratory resource access and operations platform that combines governed reservation, approval, handover/return, maintenance, incident tracking, usage evidence and optional charging for shared academic/research resources.

It should **not** be positioned as an equipment rental marketplace. Payment, loyalty and guest checkout are secondary mechanisms around laboratory access, not the main value proposition.

---

## 2. Product positioning assessment

| Criterion | Assessment | Notes |
|---|---|---|
| 1. Correct graduation LAB topic | **Strong, with one major gap** | Resource lifecycle, staff workflow, maintenance/incidents and audit fit well. Mandatory training/certification exists in data but is not enforced in core booking. |
| 2. Realistic for university/research deployment | **Moderate-to-strong** | RBAC/lab scope/data integrity are credible. Clean deploy, training eligibility, identity classification and payment reconciliation need hardening. |
| 3. Commercially extensible without distorting the product | **Good if kept secondary** | Pricing/payment/external customer metadata are useful. Loyalty/discount should remain subordinate to safety, eligibility and institutional policy. |

### What should remain central

1. Resource discovery and availability.
2. Access eligibility and safety/training.
3. Conflict-free booking.
4. Approval where required.
5. Handover, actual use and return evidence.
6. Maintenance, incidents and downtime.
7. Audit/history and accountable staff actions.
8. Optional charging according to institution/resource/purpose.

### What should remain secondary

- Loyalty tiers.
- Priority boosts.
- Discounts.
- Marketing-style spend statistics.
- AI/research modules.
- Experimental optimization.
- Consumer-commerce language.

---

## 3. Business flow audit

### 3.1 Public landing page

**Current direction:** Strong.

The landing page tells a LAB story rather than a marketplace story. It explains booking, approval, handover/return, monitoring and role responsibilities. It also truthfully labels the floor-plan graphic as an illustration and states that hardware/telemetry may be unavailable.

**Keep**
- “LAB first” narrative.
- Conditional approval wording.
- Clear distinction between monitoring data and illustrative content.
- Public catalog entry before login.

**Improve**
- Make “training/eligibility” visible in the workflow before booking or before approval.
- Keep payment as an optional downstream step, not a hero capability.

### 3.2 Public resource catalog

**Current direction:** Strong.

The catalog is API-backed, separates resource category from operational status, supports public media with provenance, and does not require authentication merely to discover equipment.

**Risk**
- The catalog currently focuses on location/capacity/approval but not on the most important “Can I use this?” eligibility facts.

**Recommendation**
Add a compact eligibility block on resource detail:
- Training required / not required.
- Independent use / staff-assisted use.
- Internal / external access.
- Approval required.
- Operating hours / lead time.
- Price policy availability, without making price the primary card content.

### 3.3 Public resource detail and schedule

**Current direction:** Strong.

Public schedule projections omit requester identity and private booking titles. This is correct privacy behavior.

**Keep**
- Busy blocks only.
- Maintenance blocks.
- Explicit message that availability is revalidated when a booking is submitted.
- Media credit/source/license.

**Improve**
- Show “available hours” or a clear link to a slot picker, not only a list of busy blocks.
- Avoid exposing sensitive maintenance titles if administrators may type internal/security information into them.

### 3.4 Quick booking for external customers

**Current direction:** Useful but not yet hardened.

Current flow combines identity, organization, email/phone, Vietnam address, booking purpose/time, quote, OTP and submission in one long form.

**UX problem**
This is cognitively heavier than necessary and makes approval/payment order harder to understand.

**Recommended wizard**
1. **Resource & time** — date/time, purpose, quote, approval/training notice.
2. **Customer details** — name, organization, email, phone, address.
3. **Verify & review** — send OTP, enter OTP, review final booking facts, submit.

The review screen should explicitly state one of:
- “This request will be sent for LAB approval. Payment is available only after approval.”
- “This booking can be confirmed immediately. If there is a fee, payment follows confirmation.”
- “This resource requires training before booking.”

### 3.5 Vietnam address selection

**Current direction:** Technically sound but operationally dependent on a third party.

The service:
- uses Province Open API v2;
- records source/version;
- verifies the ward belongs to the selected province;
- caches for 12 hours;
- avoids depth=3.

**Risk**
A cold cache plus third-party outage can block profile/guest flows.

**Recommendation**
Persist a versioned address snapshot or durable cache for production/demo resilience. Treat the external API as an update source, not a hard runtime dependency for every new user.

### 3.6 Email OTP

**Current direction:** Mostly strong.

Positive controls:
- cryptographically generated code;
- HMAC-hashed storage;
- 10-minute expiry;
- max attempts;
- consumedAt;
- required SMTP for guest OTP;
- no mock success when SMTP is missing.

**Gaps**
- resend does not clearly invalidate all prior outstanding OTP rows;
- no dedicated per-email resend cooldown/velocity rule is evident beyond route/global rate limiting;
- guest completion consumes OTP before downstream booking success.

**Recommendation**
One active challenge per email/purpose, resend invalidates the previous challenge, apply email + IP throttles, and consume the OTP in an orchestration that cannot leave a half-created business outcome.

### 3.7 Implicit external account creation

**Current direction:** Acceptable concept, risky implementation edge cases.

Using canonical STUDENT role plus customerType=EXTERNAL respects the repository role contract.

**Critical issue**
The guest service verifies/consumes OTP and may create/update the user in one transaction, then calls createBooking in a later transaction. If the booking subsequently fails because of conflict, quote staleness or policy:
- OTP is already consumed;
- an account may already exist;
- address/profile data may already be overwritten;
- no login token is returned because the overall operation failed.

This creates “orphan identity / failed booking” behavior.

**Second issue**
If the email already belongs to an internal account, quick booking currently can update that user to customerType=EXTERNAL.

**Recommendation**
Preserve existing trusted classification, and redesign the guest orchestration so account provisioning/profile mutation and booking outcome have an explicit consistency boundary.

### 3.8 Normal registration and login

**Current direction:** Core auth is credible.

Strengths:
- bcrypt password hash;
- JWT auth;
- server-side active-user validation;
- real database;
- rate limiting;
- change-password verifies current password;
- canonical roles.

**Business concern**
Registration currently allows the user to choose INTERNAL or EXTERNAL customerType. This classification should not become a self-service financial/access privilege if pricing or priority differs between groups.

### 3.9 User profile

**Current direction:** Useful, but currently too commerce-forward.

The profile emphasizes:
- total spend;
- completed bookings;
- discount;
- priority boost.

For a laboratory product, the more important first block should be:
- access identity;
- institution/organization;
- verified contact;
- training/certification status;
- labs/resources user is eligible for;
- current booking obligations/returns.

Spending/loyalty should be a secondary section.

### 3.10 Loyalty / priority / discount

**Current direction:** Acceptable as a secondary policy signal.

Correct rule already present in SRS/copy: loyalty must not bypass RBAC, approval or LAB policy.

**Data/model concern**
Persisted loyaltyTier has a default value, while summary logic also computes suggested tiers. The system should distinguish:
- computed/earned signal;
- approved/persisted institutional entitlement.

Do not silently turn behavioral metrics into access rights.

### 3.11 Internal student/lecturer booking

**Current direction:** Strong core lifecycle, but missing mandatory training gate.

Booking creation already covers:
- server-owned requester;
- resource state;
- LabPolicy time/duration/weekend/opening hours;
- conflict-safe availability;
- quote validation;
- conditional approval;
- DB-level overlap protection.

**Major LAB gap**
TrainingRequirement and UserCertification exist in Prisma, and PRODUCT.md states training/certification can be required before confirmation, but createBooking does not enforce them.

This is likely to be challenged in a defense:
> “What prevents an untrained student from reserving a hazardous/high-value machine?”

This is more important to a LAB thesis than loyalty.

### 3.12 Approval by staff/admin

**Current direction:** Strong.

Approval uses server authorization and laboratory scope. Booking event/audit/notifications are persisted with the business transition.

**Keep**
- lab assignment scope;
- explicit transition validation;
- reason/evidence where relevant;
- notifications committed with the operation.

### 3.13 Free booking

**Current direction:** Strong.

Free bookings correctly avoid fake/empty payment behavior. Checkout UI explicitly says there is no payment QR for a 0-VND booking.

### 3.14 Paid booking / approval-before-payment

**Current direction:** Correct order.

A booking that requires approval remains pending first. Charge creation/payment follows confirmation. This is much more appropriate for a research facility than collecting money before staff eligibility/approval is resolved.

### 3.15 VNPAY

**Current direction:** Security design is good; lifecycle is incomplete.

Strong:
- signed VNPAY URL;
- HMAC-SHA512;
- IPN verifies signature/merchant/amount/transaction reference;
- browser return does not mark the payment paid;
- IPN is the source of truth;
- success update is idempotent;
- UI says Sandbox explicitly.

Missing:
- persisted payment expiry/hold;
- reopening a payment after a VNPAY URL expires;
- late successful IPN after booking cancellation/expiry;
- reconciliation/query transaction workflow;
- refund workflow;
- end-to-end real Sandbox proof with publicly reachable IPN.

The current provider URL contains a 15-minute expiry, but PaymentTransaction does not persist a corresponding expiration state and the service can return an already-created payment URL for an existing provider. A pending transaction can therefore remain stale.

### 3.16 VietQR

**Current direction:** Truthful but not equivalent to a verified payment gateway.

The UI correctly leaves VietQR “pending / waiting reconciliation” and does not claim success from QR generation alone.

**Recommendation**
Treat it as manual bank-transfer initiation until a trusted reconciliation source is implemented.

### 3.17 Handover / check-out to user

**Current direction:** Strong.

This is one of the project's best LAB-specific differentiators:
- staff-controlled transition;
- condition-before evidence;
- actual timestamps;
- resource physical state synchronization;
- usage/audit history.

### 3.18 Self-return for rooms

**Current direction:** Reasonable.

Self-return makes sense for ROOM-type resources when physical inspection is not required. It should remain category/policy-bound and must not generalize to sensitive equipment.

### 3.19 Equipment/machine return

**Current direction:** Strong concept.

Staff inspection on return is realistic. Keep condition-after evidence and incident linkage where damage is found.

### 3.20 Notifications

**Current direction:** Good persisted in-app model.

Booking event notifications are committed with business changes. Scheduled reminders are persisted and dispatched by a scheduler.

**Caution**
The generic email service still supports Ethereal/dev mock behavior. Required guest OTP correctly bypasses fake success through sendRequiredEmail. Any future production email status UI must not say “sent” based on a development fallback.

### 3.21 Resource media / R2/S3

**Current direction:** Strong.

Positive controls:
- staff/admin lab scope for mutation;
- presigned upload;
- strict size/content types;
- HTTPS storage config;
- HeadObject validation;
- resource-bound key pattern;
- external-host allowlist;
- source/credit/license.

Operational improvement:
- cleanup for abandoned uploads;
- retry queue for failed object deletion after DB removal;
- periodic orphan reconciliation.

### 3.22 Monitoring / telemetry

**Current direction:** Strong boundary.

The product correctly distinguishes:
- physical resource state;
- telemetry source health;
- NO_DATA;
- unavailable hardware;
- non-certified monitoring.

Do not weaken this by adding synthetic “healthy” data for demo aesthetics.

### 3.23 Incidents / maintenance

**Current direction:** Strong and thesis-relevant.

These modules make the project look like a real laboratory operations system rather than a booking website. They should receive more emphasis than loyalty.

### 3.24 Admin user / resource / lab assignment management

**Current direction:** Strong RBAC basis.

Keep canonical roles. Use customer/business metadata for external users instead of inventing a GUEST role.

### 3.25 Resource pricing by purpose

**Current direction:** Good extension.

Snapshotting feeAmountVnd into the booking is correct: later pricing changes should not rewrite historical bookings.

**Model improvement**
Money should use an integer minor-unit or exact decimal representation consistently. Booking/pricing use integer VND, but PaymentTransaction.amount is currently Float.

### 3.26 Payment ledger / receipt

**Current direction:** Good transparency.

The booking-scoped checkout is more natural than forcing the user to search a ledger. The ledger remains appropriate for history/admin reconciliation.

Small copy issue:
“Thanh toán đặt phòng LAB” is inaccurate for equipment/machine/kit bookings. Prefer “Thanh toán lịch đặt LAB”.

---

## 4. UX/UI audit

### Landing

**Strong**
- Product story is clear.
- Roles and lifecycle are understandable.
- Honest monitoring copy.
- No fake telemetry claim.
- Payment is feature-flagged.

**Improve**
- Add safety/training as a first-class capability.
- Use “access eligibility” before “payment/loyalty” in the narrative.

### Catalog

**Strong**
- Public discovery.
- Category filters.
- Real API.
- Media provenance.
- Loading/error/empty states.
- Privacy-safe busy schedule.

**Improve**
- Add search/filter by capability/location.
- Add eligibility badges.
- Show “next available” only if server derives it truthfully.

### Resource detail

**Improve decision quality**
A user should be able to answer:
1. What is this resource for?
2. Where is it?
3. When is it available?
4. Am I eligible?
5. Do I need training?
6. Does it require approval?
7. What does it cost for my purpose/type?
8. What is the cancellation/return rule?

The current detail handles 1–3 and approval/media reasonably, but eligibility/safety policy is underrepresented.

### Quick booking

Current form is too long for a public user. Use a 3-step wizard and preserve entered values across OTP resend/errors.

**Specific bug**
GuestQuickBookingPanel defines today() with new Date().toISOString().slice(0, 10). That returns a UTC date. In Vietnam between 00:00 and 06:59 local time it can default to the previous calendar date. The repo already has getVietnamTodayDateString() in frontend/src/utils/timezone.ts. Reuse it instead of maintaining a second UTC-based helper.

### OTP UX

- Disable or reset “OTP sent” state when the email changes.
- Display resend countdown.
- Clearly identify destination email.
- Allow correction without losing the entire form.
- Show expiry in human terms.

### Booking status UX

Keep canonical state names in backend and use Vietnamese presentation labels only in UI.

Avoid resurrecting old lower-case legacy status modules such as the unmounted analytics route.

### Payment UX

BookingCheckout is directionally strong:
- order-like review;
- resource/time/amount;
- approval waiting state;
- free booking state;
- redirect to official VNPAY;
- verified paid state only after server confirmation.

Improve:
- use friendly bookingCode rather than raw UUID as the primary customer-facing code;
- show payment expiration;
- show “expired — create a new payment session”;
- show cancellation/refund/reconciliation state.

### Profile

Reorder the information architecture:
1. Identity & contact.
2. Access & LAB eligibility.
3. Training/certification.
4. Active obligations/bookings/returns.
5. Usage history.
6. Spending / loyalty / benefits.

### Admin/staff navigation

Research modules are correctly feature-flagged. However, audit/history is a core accountability requirement even though the legacy AuditLogsView is currently grouped as research. Either:
- provide a core audit/history screen for staff/admin; or
- make per-resource/per-booking histories sufficiently discoverable.

### Mobile/responsive

Existing reports show browser smoke on public catalog/checkout, but the new quick booking wizard should receive dedicated 360–390px validation after redesign. Pay special attention to:
- address selects;
- OTP row;
- date/time controls;
- payment timeline;
- long booking/reference IDs.

---

## 5. Backend / API / data audit

### 5.1 Prisma model quality

**Strong**
- Canonical role/status enums.
- Explicit Booking lifecycle fields.
- UsageLog/audit metadata.
- Maintenance and incidents.
- Training/certification models.
- Lab staff assignments.
- Resource media persistence.
- Payment transaction linkage.
- OTP persistence.
- Address provenance.
- Fee snapshot on Booking.

### 5.2 Core gap: training data is disconnected from booking authority

TrainingRequirement and UserCertification are not merely display data: they represent a safety/access rule. If they are part of the approved product contract, the authoritative createBooking service must enforce them.

Recommended contract:
- no requirement → continue;
- mandatory requirement + ACTIVE non-expired certification → continue;
- missing/expired/revoked → BOOKING_TRAINING_REQUIRED;
- staff override, if allowed, must be explicit, authorized and audited.

### 5.3 Quota

The product contract mentions quota/policy as possible eligibility conditions, but core booking does not currently enforce a canonical quota rule.

Do not add complex “fairness AI” first. If quota is required by the thesis, implement a simple deterministic policy in the booking service.

### 5.4 Guest transaction consistency

Current flow crosses two transactions:
1. OTP consumption + user create/update.
2. Booking creation.

This should be modeled as an orchestration with explicit failure semantics. Avoid implicit partial success.

### 5.5 customerType governance

customerType is currently:
- selectable at registration;
- editable in profile;
- overwritten to EXTERNAL by quick booking.

This is safe only while it is informational. Once pricing, discounts, tax, priority or access differ, it becomes a business authorization attribute.

Recommended:
- self-declared organization/customer intent can be stored separately;
- verified customerType should be server/admin controlled;
- never downgrade/overwrite an existing trusted INTERNAL account just because the user uses the public booking entry.

### 5.6 Payment states

Current PaymentStatus:
- pending
- success
- failed
- refunded

Recommended additional lifecycle metadata before real deployment:
- expiresAt / paymentSessionExpiresAt;
- provider transaction identifiers;
- reconciliation checkedAt / result;
- refund amount/time/reference if partial refunds are planned;
- failure/expiry reason.

A new enum value is not necessarily required; metadata plus deterministic state rules may be sufficient. Avoid status proliferation unless the business flow requires it.

### 5.7 Money type

Booking and pricing use integer VND but PaymentTransaction.amount is Float.

For VND, use integer amount consistently. If future currencies need decimals, use Prisma Decimal with explicit rounding/currency rules. Do not use binary floating-point for authoritative money.

### 5.8 External customer profile

A separate ExternalCustomer table is **not required yet**. A User with canonical STUDENT RBAC role plus business metadata is a reasonable current design.

Split later only if external customers acquire substantially different:
- legal/billing identity;
- organization contracts;
- tax/invoice fields;
- approval lifecycle;
- retention/privacy requirements.

### 5.9 Audit log

The underlying audit/history model is a strength. Important business actions that should have auditable provenance include:
- role/active changes;
- lab assignment;
- resource status changes;
- pricing changes;
- approval/rejection;
- handover/return/complete;
- payment admin charge/refund;
- customerType verification;
- training certification/override.

---

## 6. Security / privacy audit

### Strong controls

- Backend authorization is authoritative.
- Canonical roles are constrained.
- Staff has lab scope.
- Public schedule hides requester identity.
- Booking conflicts do not need to reveal foreign owner identity.
- OTP is hashed and expires.
- Guest OTP requires real SMTP.
- VNPAY IPN verifies cryptographic signature and amount/reference.
- Secrets targeted search did not reveal obvious committed live SMTP/VNPAY/R2 secrets.
- R2/S3 presigned upload is scoped/validated.
- Production config fails closed for key core secrets/CORS/admin credentials.

### Risks

#### S1. Predictable initial password

The latest decision uses phone number as a newly provisioned external account's initial password and sets passwordResetRequired=true.

Risk:
- phone number is often known or guessable;
- it is PII;
- the flag is primarily prompted in UI and is not a server-wide “must change before continuing” gate.

Preferred:
- OTP-authenticated “set your password” flow; or
- random single-use credential / password setup link.

If phone-as-initial-password is retained by owner decision:
- short expiry;
- forced password change before sensitive authenticated operations;
- rate-limit login;
- never display/log it.

#### S2. Self-service customerType

Do not let this become a source of cheaper prices/priority without verification.

#### S3. OTP resend / lifecycle

One active OTP challenge per purpose/email is easier to reason about and audit.

#### S4. Payment late success

If a booking is cancelled/expired while VNPAY is in flight, a later valid success callback requires a defined policy:
- reinstate booking only if slot/policy still valid; generally risky;
- or mark money received but booking not fulfilled, then create refund/reconciliation task.

The second model is safer.

#### S5. Metrics endpoint

Metrics is mounted publicly at the app layer. Production network/reverse-proxy control should restrict it if it contains operational labels not intended for the public internet.

#### S6. PII retention

External guest data includes name, email, phone, organization and address. Define:
- purpose;
- retention period;
- who can read it;
- export/delete process where applicable;
- audit access;
- whether address is actually needed for room-only bookings.

Data minimization can make address conditional: equipment delivery/loan may need it, but a room booking may not.

---

## 7. Migration / deployment reproducibility — P0 finding

### Evidence at reviewed HEAD

GitHub Actions run on commit dbab29455994f0cd4953a00018896d47dc84344b:

- **CI** run 35894836193: SUCCESS.
- **Batch 8 Smart Monitoring Release Gate** run 35894836190: FAILURE.

The Batch 8 jobs pass dependency installation and static checks, create fresh PostgreSQL databases, then fail at:

- prisma migrate deploy
- migration 20260917000100_reconcile_canonical_persistence
- error: Prior migration checksum/history precondition failed

Therefore ordinary fresh deployment is not currently proven.

### Why ordinary CI still passes

The general CI workflow validates:
- backend lint;
- production configuration contract;
- backend unit tests;
- frontend lint/typecheck/build;
- production Compose config.

It does not apply the complete migration history to a clean PostgreSQL database.

### Historical context found in Git history

Commit 473e6b21 added .gitattributes to force migration SQL checkout as CRLF because baseline checksums came from the original Windows workspace.

A prior workflow then had an explicit runtime checksum translation/bridge for Batch 1C. Commit 50ecda3 (“harden Batch 7 production demo”) removed that bridge and switched workflows to ordinary prisma migrate deploy, while claiming ordinary migration deployment as the verified path.

The present release-gate failure demonstrates that the current assumption is not yet true.

### What not to do

- Do not edit an already applied historical migration merely to make the checksum match.
- Do not manually rewrite shared _prisma_migrations.
- Do not use prisma db push.
- Do not disable checksum guards without replacing them with an equally safe migration lineage strategy.

### Recommended resolution process

1. Reproduce on a fresh PostgreSQL 16 database locally/CI.
2. Print current checked-out SHA-256 for all seven predecessor migration files and compare with:
   - the embedded reconciliation migration expectations;
   - BATCH1B_VERIFICATION.json;
   - Prisma-recorded checksum values.
3. Decide one canonical cross-platform clean-deploy strategy.
4. Encode that strategy in CI.
5. Add a fresh-database migration test to the normal required CI gate, not only Batch 8.
6. Keep upgrade-path tests for existing verified databases separately.

This is a release-engineering decision and should be documented in DECISIONS.md after validation.

---

## 8. Comparison with external references

### Agilent iLab

Official iLab scheduling supports:
- available hours and min/max reservation length;
- varied pricing by usage/time;
- optional facility approval;
- training qualifications controlling scheduling access;
- actual usage tracking.

**Implication for this project**
The project's approval/pricing direction is credible, but training must become an authoritative booking eligibility gate rather than a disconnected model/research screen.

### iLab usage capping

iLab can enforce resource/service-center usage caps, either rejecting requests or requiring approval above a cap.

**Implication**
If quota is included in final scope, implement simple deterministic capping before sophisticated fairness/optimization modules.

### Stratocore PPMS

PPMS emphasizes:
- training-validated access;
- booking;
- usage tracking;
- maintenance/incidents;
- dynamic pricing;
- audit/reporting.

**Implication**
The project's strongest differentiator is exactly the LAB operational chain. Maintenance/incidents/training/usage evidence should be foregrounded over loyalty.

### OWASP authentication/OTP patterns

Relevant patterns:
- short OTP lifetime;
- single use;
- limited attempts;
- rate limiting;
- invalidate/replace old OTP on resend;
- temporary credentials should expire and require change.

**Implication**
Current OTP implementation is close, but resend/account provisioning and temporary phone password need additional controls.

### VNPAY

Official VNPAY documentation distinguishes:
- payment URL/return experience;
- IPN/server notification for authoritative transaction updates;
- query/refund APIs.

**Implication**
The project correctly uses IPN as truth. The next step is expiry, reconciliation and refund lifecycle, not more checkout visuals.

### Province Open API

Official site exposes:
- API v1 before the July 2025 administrative merge;
- API v2 after the merge;
- a warning against overusing depth=3.

**Implication**
The project's v2 + depth=2 approach is sensible. Add durable fallback/versioned local data for availability.

---

## 9. What is already strong

1. Canonical four-role model and lab-scoped staff access.
2. Database-level booking overlap protection.
3. Half-open interval contract.
4. Resource operational status separate from booking state.
5. Approval/handover/return/complete lifecycle with evidence.
6. Maintenance/incidents integrated into operations.
7. Persisted notifications and usage/audit history.
8. Public catalog and privacy-safe schedule.
9. Honest telemetry NO_DATA/unavailable behavior.
10. Media provenance and scoped S3/R2 upload contract.
11. Payment IPN signature verification and no browser-return fake success.
12. Clear research-feature isolation by feature flags.

---

## 10. What is confusing or risky

1. Fresh database migration fails although README claims ordinary migrate deploy.
2. Training/certification exists but does not gate core booking.
3. Quick booking can consume OTP/create/update identity before booking fails.
4. Quick booking can change an existing user from INTERNAL to EXTERNAL.
5. User can self-edit customerType.
6. Phone-number initial password is predictable and reset flag is not a backend-wide gate.
7. Payment URL can expire while pending transaction remains reusable/stale.
8. Late successful VNPAY callback after cancellation has no defined reconciliation policy.
9. Loyalty/spend is visually more prominent than training/access eligibility.
10. README/config examples lag behind new SMTP/payment/media requirements.
11. Legacy unmounted modules contain noncanonical statuses/roles and could be accidentally reactivated.
12. PaymentTransaction.amount uses Float while booking/pricing use integer VND.

---

## 11. What should be fixed before the next serious test

### P0 — critical

#### P0-1. Restore a reproducible fresh migration path
Release gate must be green on a fresh PostgreSQL 16 database without editing historical applied migration files.

#### P0-2. Enforce mandatory training/certification in createBooking
If TrainingRequirement is canonical business data, booking cannot ignore it.

#### P0-3. Make guest identity + booking failure semantics consistent
At minimum:
- do not overwrite existing INTERNAL classification;
- do not leave an inaccessible newly created account after booking failure;
- define whether OTP is consumed if slot/price changes.

#### P0-4. Payment expiry/late callback — conditional P0
If VNPAY is part of the next demo, implement payment-session expiry/re-initiation and a late-callback reconciliation rule before presenting the feature as complete.

---

## 12. Important before final defense/demo

### P1

1. Make customerType a governed business attribute, not a self-service entitlement.
2. Replace or harden phone-number temporary password and enforce reset server-side.
3. Add per-email OTP resend/velocity controls and invalidate previous OTP.
4. Add clean migration deployment to normal required CI.
5. Complete env/config documentation for SMTP, VNPAY/VietQR, R2/S3 and feature flags.
6. Add address-data fallback/snapshot.
7. Reframe profile: access/training first, spending/loyalty second.
8. Add explicit cancellation/no-show policy and outcome workflow if claimed.
9. Use exact money type consistently.
10. Expose core audit history clearly for staff/admin.

---

## 13. Good improvements after demo

### P2

- Convert external quick booking to a wizard/stepper.
- Fix Vietnam “today” UTC helper in GuestQuickBookingPanel.
- Reset OTP state if email changes.
- Use bookingCode as primary user-facing reference.
- Change “Thanh toán đặt phòng LAB” to “Thanh toán lịch đặt LAB”.
- Add media orphan cleanup.
- Add search/filter by capability and laboratory.
- Display training/eligibility summary on public detail.
- Add admin verification workflow for external organizations/customer type.
- Separate computed loyalty signal from approved benefit.

---

## 14. Future commercial expansion

### P3

Only after the LAB core is stable:

- institutional/external organization contracts;
- invoice/tax profile;
- deposit and cancellation fees;
- partial refunds;
- VNPAY QueryDr/refund automation;
- SSO/federated university identity;
- hardware access/interlock tied to approved booking and training;
- richer project/grant billing;
- external-customer-specific profile if legal/billing requirements justify it;
- advanced quota/fairness optimization.

Do not make these prerequisites for the graduation core.

---

## 15. Suggested roadmap

### Phase A — reliability first

- Repair fresh migration deployment.
- Add migration gate to main CI.
- Training eligibility enforcement.
- Guest orchestration consistency tests.

### Phase B — defense hardening

- Customer type governance.
- Temporary-password/OTP hardening.
- Quick-booking UX.
- Core audit discoverability.
- Env/runbook completeness.

### Phase C — real payment hardening

- payment expiry;
- re-initiation;
- cancellation/late-IPN reconciliation;
- provider query;
- refund;
- real VNPAY Sandbox E2E with reachable IPN.

### Phase D — institutional product maturity

- training administration UX;
- quotas;
- organization verification;
- reporting;
- actual-use billing;
- hardware integration.

---

## 16. Concrete recommendations by screen/flow

| Screen / Flow | Recommendation | Priority |
|---|---|---|
| Public landing | Add training/access eligibility to core story | P1 |
| Public catalog | Add capability/location search and eligibility badges | P2 |
| Resource detail | Show training, assisted/independent use, approval, policy summary | P1 |
| Public schedule | Keep identity hidden; consider generic maintenance reason | P1 |
| Quick booking | 3-step wizard + final review | P2 |
| Quick booking date | Use getVietnamTodayDateString(), not UTC ISO date | P2 |
| OTP | Resend countdown, invalidate old challenge, reset if email changes | P1 |
| Guest account | Preserve existing customer classification and make failure semantics atomic | P0 |
| Registration | Treat INTERNAL/EXTERNAL verification separately from self-declaration | P1 |
| Profile | Put eligibility/training above spending/loyalty | P1 |
| Internal booking | Enforce training/certification | P0 |
| Approval | Keep lab-scoped server authority | KEEP |
| Handover | Keep condition-before + actual timestamp | KEEP |
| Return | Keep equipment staff verification; room self-return policy-bound | KEEP |
| Payment checkout | Add expiry and re-initiation; use bookingCode | P1 |
| VNPAY IPN | Add cancellation/late-success reconciliation | P0 if payment demo |
| VietQR | Continue labeling as pending until reconciliation | KEEP |
| Admin pricing | Keep fee snapshot; make money type exact | P1 |
| Notifications | Preserve persisted in-app truth; no production mock email success | P1 |
| Monitoring | Preserve NO_DATA and non-certified disclaimer | KEEP |
| Audit/history | Make a core staff/admin view discoverable | P1 |
| Deployment | Fresh PostgreSQL 16 migrate deploy gate | P0 |

---

## 17. Test / CI evidence observed during review

### Current main HEAD

Commit: dbab29455994f0cd4953a00018896d47dc84344b

### GitHub Actions

**CI run 35894836193 — SUCCESS**
- backend dependency install;
- Prisma generate;
- backend lint;
- production config verification;
- required backend unit tests;
- frontend lint;
- TypeScript check;
- production build;
- production Compose config.

Important limitation: this workflow does not prove fresh DB migration.

**Batch 8 run 35894836190 — FAILURE**
- static and production checks passed;
- fresh PostgreSQL databases created;
- migration deployment failed at 20260917000100_reconcile_canonical_persistence;
- required backend matrix and browser assertions were skipped after migration failure.

Observed failure:
- Prior migration checksum/history precondition failed.

This should be treated as current release evidence, not hidden by the green general CI.

---

## 18. External references researched

1. Agilent iLab — Resource Scheduling  
   https://www.agilent.com/en/service/laboratory-services/lab-operations-management/core-facilities-management/resource-scheduling

2. iLab — Schedule Settings / Equipment  
   https://help.ilab.agilent.com/37446-managing-schedule-equipment/266098-editing-equipment

3. iLab — Usage Capping  
   https://help.ilab.agilent.com/37446-managing-schedule-equipment/usage-capping-overview.html

4. Stratocore PPMS — Core Facilities  
   https://www.stratocore.com/solutions/core-facilities

5. Stratocore PPMS — Features  
   https://www.stratocore.com/features

6. Stratocore — Research Infrastructure Management  
   https://www.stratocore.com/solutions/research-infrastructure-management

7. OWASP — Multifactor Authentication Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html

8. OWASP — Authentication Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

9. OWASP Cornucopia — temporary/default credentials guidance  
   https://cornucopia.owasp.org/

10. VNPAY Sandbox — Payment API  
    https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

11. VNPAY Sandbox — FAQ / IPN  
    https://sandbox.vnpayment.vn/apis/docs/faqs/

12. VNPAY Sandbox — Query / Refund  
    https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html

13. Province Open API  
    https://provinces.open-api.vn/

---

## 19. Open questions for the project owner

1. Is training/certification mandatory for specific machines in the final defense scope, or only future/research? The data model and PRODUCT.md currently imply it is a real booking condition.
2. Can an existing INTERNAL user intentionally use the public quick-booking form? If yes, customerType must not be overwritten.
3. Who is authorized to verify INTERNAL vs EXTERNAL customer type?
4. Is phone-number initial password a hard business requirement, or can OTP be used to force a password setup instead?
5. Is a Vietnam postal/address record truly required for every external room booking, or only for equipment lending/delivery/invoicing?
6. Will VNPAY be shown live in the defense, or only as an optional Sandbox extension?
7. What is the cancellation/no-show policy for paid bookings?
8. If payment arrives after a booking has been cancelled/expired, should the system auto-refund or create a finance reconciliation task?
9. Should usage charges be based on scheduled time, actual usage time, or a configurable policy per resource?
10. Is quota part of the official defense requirement? If yes, define a deterministic rule before re-enabling fairness/optimization UI.
11. Does the university require SSO/student-directory verification for INTERNAL users?
12. Which audit events must be retained, and for how long?
13. Should public maintenance blocks expose detailed maintenance titles or only generic unavailable periods?
14. Is loyalty an academic access signal, a commercial discount mechanism, or both? It needs one explicit policy source of truth.
15. Which clean-deployment strategy is canonical after the Batch 7 checksum bridge removal?

---

## 20. Final review verdict

The repository has a **credible and defensible LAB core**, especially in booking integrity, staff workflow, resource operations, maintenance/incidents, privacy-safe public availability and truthful telemetry boundaries.

The most important next work is not another dashboard or AI feature. It is:

1. make fresh database deployment reproducible;
2. connect training/certification to authoritative booking eligibility;
3. harden guest identity/OTP/account consistency;
4. finish payment expiry/reconciliation if payment will be demonstrated;
5. reposition loyalty below safety/access/usage governance.

After those items, the system can move from “strong graduation demo with an ambitious extension” to a much more believable institutional laboratory platform.
