# SYSTEM BUSINESS UX REVIEW — 2026-09-24

## Review baseline

- Repository: https://github.com/phung086/lab-resource-manager
- Audited branch: fix/migration-baseline-hardening
- Audited SHA: 66346d74a4d1953446eccb39eee721db02824854
- Related PR: https://github.com/phung086/lab-resource-manager/pull/6
- PR base: feature/fresh-migration-reproducibility
- Review branch: review/full-system-business-ux-audit
- Review mode: AUDIT ONLY
- Runtime/schema/migration changes made by this review: NONE
- PR #6 merged by this review: NO

### Evidence model

This report uses the required review status vocabulary:

- VERIFIED — supported by code plus appropriate exact-SHA test/runtime evidence.
- PARTIALLY VERIFIED — implementation exists but evidence is incomplete.
- NOT IMPLEMENTED — no implementation found for the claimed workflow.
- BROKEN — implementation/test exists but current evidence shows failure.
- MISLEADING — UI/docs imply a stronger capability than runtime supports.
- NEEDS BUSINESS DECISION — safe implementation depends on an explicit owner policy.
- PENDING EXTERNAL CREDENTIALS — needs SMTP, VNPAY Sandbox, R2/S3 or another external service.
- PENDING REAL HARDWARE — needs real sensor/camera/lab hardware evidence.

### Audit execution limitation

The audit environment could not clone GitHub into the local container because outbound DNS resolution for github.com was unavailable. Source was therefore inspected through the GitHub connector at the exact SHA above. Test/runtime evidence was taken from exact-SHA GitHub Actions runs and downloaded workflow screenshot artifacts. Where a check was not independently re-executed in the local container, this report says CI-verified, not locally re-executed.

# 1. Executive verdict

## 1.1 Overall status

Architecture: PARTIALLY VERIFIED. The core architecture is strong, but two P0 gaps remain.

Business workflow: PARTIALLY VERIFIED. Canonical booking, approval, handover, return, maintenance, incident, notification and monitoring flows are substantially real and database-backed. Mandatory training/certification is modeled but not enforced by booking authority. The external quick-booking flow still has transaction and identity-security gaps.

UI/UX: PARTIALLY VERIFIED. Exact-SHA desktop and mobile screenshots from GitHub Actions show a coherent LAB product with responsive layouts. Public discovery and staff operational surfaces are directionally strong. Quick booking is too dense, profile hierarchy is too commerce-first, and training/access eligibility is not surfaced as a first-class resource decision.

Security: PARTIALLY VERIFIED. Core authentication, canonical role enforcement, LAB_STAFF lab scope, booking ownership, signed VNPAY IPN verification, S3/R2 media scoping and telemetry credentials are strong. Significant gaps remain around guest OTP attempts, temporary phone password, customer classification, resource-history privacy and late-payment reconciliation.

Migration/deployment: PARTIALLY VERIFIED. PR #6 materially improves the previous clean-baseline design and exact-SHA CI proves fresh PostgreSQL 16 deployment plus a 12-case safety matrix. One fail-closed hole remains: an existing database can be classified as RECOGNIZED_PRISMA_LINEAGE from canonical migration names/state without verifying recorded checksums or canonical catalog provenance.

Graduation readiness: The required LAB core can support a controlled graduation demonstration if limitations are stated clearly. Do not present the system as safety-complete while training is not enforced. Do not present payment as production-complete.

Production readiness: NO. P0/P1 findings and three red exact-SHA full-stack/release workflows prevent a production-ready claim.

## 1.2 Product positioning

The product is correctly moving toward an Open LAB resource access and operations platform for internal and external users, combining governed discovery, eligibility, scheduling, approval, handover/return, incidents, maintenance, monitoring and optional charging.

It should not be positioned as a generic equipment rental marketplace. Pricing, VNPAY, loyalty and external-customer support are valid extensions only when subordinate to access eligibility, safety, lab policy and audited operation.

## 1.3 PR #6 verdict

PR #6 should not be merged yet on the basis of this audit.

What PR #6 does well:

- freezes baseline SQL and frozen baseline schema separately from live schema;
- pins baseline artifact and historical migration hashes;
- fingerprints PostgreSQL catalog objects that Prisma schema alone cannot represent;
- distinguishes EMPTY, CLEAN_BASELINE, RECOGNIZED_PRISMA_LINEAGE, UNKNOWN_NONEMPTY and INVALID_OR_PARTIAL;
- uses official Prisma migrate resolve only after a clean-baseline fingerprint check;
- supports resolve-phase resume;
- tests future forward migration while leaving the frozen baseline unchanged;
- exact-SHA normal CI is green.

Remaining blocker:

P0-MIG-01: existing-lineage recognition trusts migration names/order/completion but not migration checksums or terminal catalog provenance. A non-project database with a forged canonical migration-name prefix can be treated as recognized.

# 2. Verified system architecture

## 2.1 System context

~~~mermaid
flowchart LR
    Student[STUDENT]
    Lecturer[LECTURER]
    Staff[LAB_STAFF]
    Admin[ADMIN]
    External[External Open LAB user]
    VNPAY[VNPAY Sandbox / Gateway]
    SMTP[SMTP]
    Media[R2 / S3-compatible storage]
    Hardware[Telemetry / Camera sources]
    Web[React / Vite Web]
    API[Express API]
    PG[(PostgreSQL 16)]

    Student --> Web
    Lecturer --> Web
    Staff --> Web
    Admin --> Web
    External --> Web
    Web --> API
    API --> PG
    API --> SMTP
    API --> VNPAY
    API --> Media
    Hardware --> API
~~~

## 2.2 Frontend/backend/database

~~~mermaid
flowchart TD
    UI[React pages/components]
    APIWrapper[Frontend API wrapper]
    Routes[Express routes]
    Auth[Authentication / authorization]
    Services[Domain services]
    Prisma[Prisma Client]
    DB[(PostgreSQL 16)]
    Constraints[Constraints / functions / triggers]

    UI --> APIWrapper --> Routes --> Auth --> Services --> Prisma --> DB
    DB --> Constraints
~~~

Sensitive authority is generally server-side for booking transitions, role checks, LAB_STAFF laboratory scope, media mutation and incident operation.

## 2.3 Booking and payment

~~~mermaid
flowchart LR
    Discover[Discover resource]
    Eligibility[Policy / availability / training eligibility]
    Request[Create booking]
    Approval{Approval required?}
    Pending[PENDING_APPROVAL]
    Confirmed[CONFIRMED]
    Charge{Fee greater than zero?}
    Pay[Payment transaction]
    IPN[VNPAY verified IPN]
    Checkout[CHECKED_OUT]
    Returned[RETURNED]
    Complete[COMPLETED]

    Discover --> Eligibility --> Request --> Approval
    Approval -->|yes| Pending --> Confirmed
    Approval -->|no| Confirmed
    Confirmed --> Charge
    Charge -->|yes| Pay --> IPN --> Checkout
    Charge -->|no| Checkout
    Checkout --> Returned --> Complete
~~~

Current defect: the intended Eligibility stage includes training/certification in PRODUCT.md and Prisma models, but createBooking does not query training requirements or certifications.

## 2.4 Role interaction

~~~mermaid
flowchart TB
    A[ADMIN] --> AllLabs[All labs / users / resources / operations]
    S[LAB_STAFF] --> Assigned[Assigned laboratories only]
    L[LECTURER] --> OwnL[Own bookings / incidents / resources]
    ST[STUDENT] --> OwnS[Own bookings / incidents / resources]
    E[External] --> Guest[Public discovery + OTP quick booking]
    Guest --> StudentRole[Canonical STUDENT RBAC role]
~~~

## 2.5 Notifications

Booking event notifications are created in the same Prisma transaction as booking mutations. Active ADMIN users and assigned LAB_STAFF are recipients, with owner inclusion where applicable. A dedupe key protects repeated event creation.

## 2.6 Media storage

ADMIN or assigned LAB_STAFF requests a presigned PUT, uploads to R2/S3-compatible storage, then the backend validates the object using HeadObject before persisting ResourceMedia metadata. Public media keeps source, credit and license information.

## 2.7 Telemetry

Persisted telemetry source identity -> authenticated ingest -> TelemetrySample -> threshold evaluation -> MonitoringAlert -> optional Incident -> polling UI.

The design correctly separates physical Resource.operationalStatus from telemetry source/sample health. Missing data remains NO_DATA rather than being fabricated as healthy.

## 2.8 Deployment

~~~mermaid
flowchart TD
    Start[Canonical deploy]
    Inspect[Inspect public catalog and migration history]
    Class{Classification}
    Empty[EMPTY]
    Baseline[CLEAN_BASELINE]
    Existing[RECOGNIZED_PRISMA_LINEAGE]
    Reject[UNKNOWN / INVALID -> fail closed]
    SQL[Frozen baseline SQL]
    FP[Catalog fingerprint]
    Resolve[Prisma migrate resolve --applied]
    Forward[Prisma migrate deploy]
    Status[Prisma migrate status]

    Start --> Inspect --> Class
    Class --> Empty --> SQL --> FP --> Resolve --> Forward --> Status
    Class --> Baseline --> FP --> Resolve --> Forward
    Class --> Existing --> Forward
    Class --> Reject
~~~

# 3. Repository and architecture review

| Area | Current design | Strength | Problem | Recommendation | Priority |
| --- | --- | --- | --- | --- | --- |
| Frontend | React/Vite, feature-oriented components plus optional/research surfaces | Real API-backed core, feature flags, responsive redesign | Optional/legacy concepts still coexist with core IA | Preserve core; classify CORE / OPTIONAL / RESEARCH / LEGACY | P2 |
| Backend | Express routes -> middleware -> service -> Prisma | Backend authority generally strong | Some business authority missing from service layer | Put eligibility in booking authority | P0 |
| Database | Prisma + PostgreSQL 16 + hand-written constraints | Strong exclusion constraint, triggers, audit history | Float money; existing-lineage provenance gap | Exact money plan; harden lineage validation | P0/P1 |
| Auth/RBAC | JWT + DB reload + canonical roles | Inactive user and unsupported role fail closed | passwordResetRequired is informational only | Enforce temporary credential lifecycle | P1 |
| LAB scope | UserLabAssignment | Strong for booking/resource/incident operations | Resource history endpoint ignores lab/owner privacy | Scope/redact resource history | P1 |
| Booking | Resource row lock + quote + policy + availability + DB guard | Strong concurrency/integrity | Training/certification ignored | Enforce mandatory certification | P0 |
| Guest booking | Public OTP + account provisioning + booking | Useful Open LAB entry | Two transactions; classification overwrite; OTP controls weak | Refactor orchestration | P1 |
| Payments | Feature-flagged VNPAY/VietQR | IPN authority and signed gateway flow are correct | Expiry/re-initiation/late callback/refund incomplete | Add payment-session lifecycle | P1 |
| Media | S3/R2 presigned upload | Good validation and lab scope | Delete can orphan bucket objects | Cleanup/reconciliation queue | P2 |
| Notifications | Persisted and transaction-coupled | Strong recipient scoping/dedupe | Email delivery is separate from in-app truth | Keep in-app as source of truth | P2 |
| Monitoring | Persisted polling / source credentials / NO_DATA | Honest evidence boundary | Batch8 selector stale | Fix test without changing correct UI semantics | P1 release |
| Migration | Frozen baseline + official resolve + forward migrations | Major improvement | Existing lineage provenance insufficient | Verify checksums/catalog/checkpoint | P0 |
| CI | Normal CI + batch workflows | Broad matrix | Three exact-SHA full-stack/release workflows red | Restore green release evidence | P1 |

# 4. Business workflow map

## 4.1 Actor matrix

| Actor | Entry point | Main permissions | Backend authority | Failure/recovery |
| --- | --- | --- | --- | --- |
| STUDENT internal | Register/login | Discover, own bookings, self-return ROOM, report own incidents | JWT + DB user + booking ownership | Policy/conflict/auth errors |
| LECTURER internal | Login | Own bookings/incidents/resources | Canonical role + booking owner | Same core failures |
| External Open LAB | Public catalog -> guest quick booking | Public discovery, OTP, auto-provisioned STUDENT account | OTP + guest service + createBooking | Partial state can remain after booking failure |
| LAB_STAFF | Login -> operations | Assigned-lab booking/resource/media/maintenance/incident actions | UserLabAssignment | Foreign lab fails closed |
| ADMIN | Login -> administration | Global user/resource/booking/incident administration | ADMIN role | Server validation |

## 4.2 Public discovery — PARTIALLY VERIFIED

Landing -> public catalog -> resource detail -> media -> public busy schedule -> internal login or guest quick booking.

Strong points:

- schedule omits requester identity;
- media includes source/credit/license;
- API-backed catalog;
- product copy remains LAB-oriented.

Gap: resource detail does not show mandatory training/certification eligibility.

## 4.3 Internal booking — PARTIALLY VERIFIED

Implemented:

- server quote and quote-version verification;
- resource row lock;
- LabPolicy duration/opening/weekend rules;
- maintenance and booking availability;
- database overlap guard;
- conditional approval;
- free/paid split;
- staff handover;
- return/completion history.

Missing:

- training/certification gate;
- attendee/room-capacity semantics are not represented in Booking. Capacity enforcement therefore needs an explicit business definition before implementation.

## 4.4 External quick booking — BROKEN in edge cases

Implemented:

Public detail -> identity/address -> email OTP -> account create/reuse -> booking -> login token -> booking/payment continuation.

Unsafe edge cases:

- OTP/account/profile transaction commits before createBooking starts;
- existing account is forcibly written customerType=EXTERNAL;
- wrong OTP attempt increment is rolled back when the transaction throws;
- multiple OTP challenges can remain active;
- phone number is the initial password;
- passwordResetRequired is not an authorization gate.

## 4.5 VNPAY — PARTIALLY VERIFIED / PENDING EXTERNAL CREDENTIALS

Verified code properties:

- server builds signed VNPAY URL;
- hosted checkout is used;
- browser return is not payment authority;
- IPN verifies checksum, merchant, txnRef and amount;
- success update is conditional/idempotent.

Not complete:

- payment-session expiry is not persisted;
- old stored payment URL can be reused;
- late success after booking cancellation is not reconciled;
- QueryDr/refund is not implemented;
- live Sandbox proof requires merchant credentials and reachable IPN.

## 4.6 Handover/return — VERIFIED core design

- CHECKED_OUT requires ADMIN/LAB_STAFF and lab scope.
- Positive-fee booking requires matching successful charge.
- conditionBefore and conditionAfter are persisted.
- staff return/completion are canonical transitions.
- owner self-return is restricted to ROOM and records evidence.
- equipment/machine remains staff-controlled.
- hard unavailable physical states are not blindly reset to AVAILABLE.

## 4.7 Incidents/maintenance — VERIFIED core design

- ordinary users see their own reported incidents;
- LAB_STAFF is assigned-lab scoped;
- incident actions are transactional and audited;
- maintenance locks resource and conflict-checks active bookings;
- maintenance/calibration contribute to availability.

## 4.8 Shipment — DEFER

ShipmentOrder exists in schema, but no evidence supports a complete shipment workflow. Treat equipment delivery/return shipping as future architecture only.

# 5. Booking state machine review

Canonical state transitions remain coherent:

| From | Allowed to | Authority |
| --- | --- | --- |
| PENDING_APPROVAL | CONFIRMED / REJECTED / CANCELLED | staff/admin or cancellation policy |
| CONFIRMED | CHECKED_OUT / CANCELLED | staff/admin or cancellation policy |
| CHECKED_OUT | RETURNED | staff; ROOM has specialized owner self-return |
| RETURNED | COMPLETED | staff/admin |
| COMPLETED | none | terminal |
| REJECTED | none | terminal |
| CANCELLED | none | terminal |

NO_SHOW remains BookingOutcome/event, not BookingStatus.

Critical gap: backend/src/services/bookingService.js createBooking checks price, resource state, lab policy and availability but never TrainingRequirement/UserCertification.

# 6. Payment state machine review

Booking status and payment status are kept separate, which is correct.

| Booking state | Payment behavior |
| --- | --- |
| PENDING_APPROVAL | user payment should not start |
| CONFIRMED + fee 0 | no charge |
| CONFIRMED + fee > 0 | pending charge/payment |
| CHECKED_OUT | fee must already be verified success if positive |
| CANCELLED/REJECTED | initiation blocked |
| Payment SUCCESS after cancellation | currently undefined reconciliation gap |

Payment issues:

- paymentService reuses a stored paymentUrl when provider matches;
- no persisted expiration state;
- IPN updates the payment without loading/checking linked booking state;
- PaymentTransaction.amount is Float while Booking.feeAmountVnd uses integer VND.

# 7. External quick-booking review

## 7.1 Identity — PARTIALLY VERIFIED

Positive:

- email normalized;
- canonical STUDENT role;
- no GUEST role;
- address source/version is persisted;
- SMTP-required OTP fails explicitly when missing.

Problems:

- existing account can be overwritten as EXTERNAL;
- registration accepts customerType from client;
- profile PATCH accepts customerType from client.

## 7.2 OTP — BROKEN attempt lock

Wrong-code path increments attempts in the same transaction and then throws. Transaction rollback also rolls back the increment, so the intended five-attempt lock is ineffective.

sendGuestBookingOtp also creates a new active challenge without invalidating older outstanding challenges. There is route/IP rate limiting, but no dedicated per-email resend cooldown.

## 7.3 Account + booking consistency — BROKEN edge consistency

OTP consumption and user mutation commit in one transaction. createBooking is then called in a second transaction.

If slot, quote, policy or resource state fails at booking time, the system can leave:

- consumed OTP;
- mutated user profile;
- newly created account;
- no booking.

## 7.4 Temporary credential — P1

New external account hashes the phone number as password and sets passwordResetRequired=true. requireAuth does not gate sensitive operations for that state.

# 8. Handover/return review

| Scenario | Current behavior | Verdict |
| --- | --- | --- |
| Staff check-out | CONFIRMED -> CHECKED_OUT, conditionBefore, lab scope | VERIFIED |
| Paid check-out | matching successful VND charge required | VERIFIED |
| Equipment return | CHECKED_OUT -> RETURNED, conditionAfter | VERIFIED |
| Completion | RETURNED -> COMPLETED | VERIFIED |
| ROOM owner self-return | owner-only, ROOM-only, evidence | VERIFIED |
| Hard unavailable physical state | preserved | VERIFIED |
| Concurrent operators | row/resource locks + state validation | VERIFIED by backend regression |

This is one of the strongest LAB-specific areas.

# 9. Notification review

| Event class | ADMIN | Assigned LAB_STAFF | Owner |
| --- | --- | --- | --- |
| Booking request | yes | yes | no duplicate by default |
| Approve/reject | yes | assigned scope | canonical outcome notification |
| Check-out/return/complete | yes | assigned scope | included when event contract requires |
| Reminders | scheduler | scheduler as configured | booking user |

Booking event notification creation occurs in the same transaction and uses dedupeKey.

# 10. Loyalty and pricing review

## Pricing — VERIFIED design, incomplete finance hardening

- resource + purpose pricing;
- integer VND quote;
- accepted quote/version verified inside booking transaction;
- immutable booking fee snapshot;
- positive charge only after CONFIRMED;
- zero-fee booking has no fake payment.

## Loyalty — PARTIALLY VERIFIED

Profile computes spend/completed-booking signals from database records. Loyalty is documented not to bypass RBAC, approval or LAB policy.

Risks:

- customer classification is not trustworthy enough for entitlement decisions;
- profile places spend/discount/priority ahead of access/training;
- persisted and computed loyalty signals are mixed in one response.

# 11. UI/UX review

## 11.1 Evidence

Exact-SHA GitHub Actions screenshot artifacts were inspected for admin core, staff dashboard, mobile operations and smart monitoring.

This is stronger than code-only review, but still scripted screenshot evidence rather than a manual browser walkthrough at every requested viewport. Responsive/accessibility remains PARTIALLY VERIFIED.

## 11.2 Visual quality

What works:

- coherent blue/neutral LAB visual system;
- clear sidebar zones;
- admin desktop table is clean and readable;
- staff dashboard has understandable headline KPIs;
- mobile booking operations uses stacked cards rather than horizontal tables;
- operations and telemetry are visually distinct;
- Vietnamese labels generally hide raw technical enums.

Problems:

- mobile monitoring is extremely long and information-dense;
- admin user screen duplicates global/content heading wording;
- profile is commerce-first rather than access/safety-first;
- payment wording says "đặt phòng" even for non-room resources;
- technical identifiers are sometimes too prominent.

## 11.3 Information architecture

User overview, Operations dashboard and Telemetry monitoring have distinct purposes in current code. That distinction should be kept.

Batch8 E2E still expects "Bảng điều khiển vận hành" after opening Telemetry. This is test drift, not evidence the two screens should be merged.

Training and audit logs are listed in RESEARCH_TAB_IDS. Training safety and audit accountability should not conceptually be taught as research/demo features.

## 11.4 Booking UX

Internal calendar/booking flow is reasonably structured.

External quick booking combines identity, organization, phone, full Vietnam address, booking title/purpose/date/time, pricing purpose, quote and OTP in one form.

Recommended target:

1. resource/time/purpose/eligibility/quote;
2. customer identity/contact/address only when needed;
3. OTP + final review + submit.

## 11.5 Accessibility

Positive source evidence:

- global focus-visible styling;
- prefers-reduced-motion rules;
- async role=status and role=alert patterns;
- image alt text.

Gaps:

- no systematic aria-invalid / aria-describedby pattern found;
- long forms do not expose a field-linked error summary;
- touch target compliance was not measured in this audit;
- modal focus trapping was not comprehensively reverified.

# 12. Screen-by-screen findings

| Screen | Actor | What works | Problem | Recommendation | Priority |
| --- | --- | --- | --- | --- | --- |
| Landing | Public | LAB-first, honest monitoring copy | Training/eligibility not first-class | Add qualification/access to core story | P2 |
| Public catalog | Public | API-backed, media provenance | Cards omit training/access | Add eligibility badges | P2 |
| Resource detail | Public | location/capacity/approval/media/schedule | no "can I use this?" answer | Eligibility block | P1/P2 |
| Guest booking | External | quote + OTP + address | long form; UTC today; weak resend state | 3-step wizard + VN utility | P2 |
| Login/register | All | real auth; role fixed STUDENT | customerType self-declared | separate declared/verified identity | P1 |
| Profile | User | real spend/booking signals | commerce-first hierarchy | access/training before loyalty | P2 |
| Calendar | Internal | day/week/month, real availability | Batch4 stage red in two exact-SHA workflows | reproduce/fix evidence | P1 release |
| Payment | User | truthful VNPAY/IPN language | no expiry; raw UUID; room wording | lifecycle + bookingCode | P1/P3 |
| Operations | Staff | clear work-centric flow | no major UX blocker found | keep separate from telemetry | KEEP |
| Dashboard | Staff | clear KPIs | mobile low-value cards can dominate | action-first mobile | P2 |
| Telemetry | Staff | truthful source state/NO_DATA | high vertical density | alert-first collapsed details | P2 |
| Incidents | All | scoped persisted workflow | no major core gap found | KEEP | KEEP |
| Notifications | All | read/unread user scope | deep-link regression evidence limited | add target tests | P2 |
| Resource management | Admin/staff | RBAC and lab scope | history exposes actors to all authenticated users | role-aware history projection | P1 |
| User management | Admin | clean desktop table | heading duplication/whitespace | polish | P3 |

# 13. External benchmark

| Source | Pattern | Application | Avoid |
| --- | --- | --- | --- |
| Agilent iLab Resource Scheduling | schedule policy, approval, training qualification, usage | training must be a booking/access authority | enterprise breadth |
| Stratocore PPMS | training access, booking, usage, maintenance, pricing | reinforces LAB-first workflow | full ERP scope |
| BookitLab Core Facility | automated training checks, controlled access, usage/billing | direct match for eligibility gate | full LIMS scope |
| Prisma baselining/migrate deploy | baseline applied then forward migrations; deploy does not detect drift | supports frozen baseline and need for provenance guard | assuming deploy proves schema identity |
| OWASP MFA/OTP | short TTL, single use, strict attempts, resend replacement | direct fix for guest OTP | calling email OTP high-assurance MFA |
| VNPAY official docs | signed request, expire date, IPN, QueryDr/refund | payment lifecycle/reconciliation | using return URL as truth |
| WCAG 2.2 | focus, keyboard, target size | concrete mobile acceptance criteria | CSS-only compliance claims |
| GOV.UK form guidance | ask only needed data, split complex flows | supports guest-booking wizard | applying consumer flow blindly to staff workflows |

# 14. Security review

## 14.1 Strong controls

- JWT HS256 verification and DB-backed active-user reload.
- Canonical role validation.
- Admin-only user administration.
- LAB_STAFF laboratory scope using UserLabAssignment.
- Booking detail/history ownership checks.
- Payment browser return is not success authority.
- VNPAY signature, merchant, txnRef and amount checks.
- Media mutation is ADMIN/assigned LAB_STAFF only.
- Presigned media upload is resource-key constrained and HeadObject verified.
- Telemetry sources use persisted scoped credentials.
- CORS, Helmet, body limits and global rate limits exist.

## 14.2 Resource history overexposure

backend/src/routes/resources.js resource history is protected only by requireAuth. It returns usage-log actor id/fullName/role, maintenance creator, incident reporter, booking IDs/times/status and operational metadata for arbitrary resources.

Recommended projection:

- ordinary user: anonymized operational timeline;
- booking owner: own booking details;
- assigned LAB_STAFF/ADMIN: full actor/provenance timeline.

## 14.3 passwordResetRequired is not authority

requireAuth does not inspect passwordResetRequired, so an auto-provisioned phone-password account can use normal authenticated routes before password change.

## 14.4 Metrics

The metrics endpoint is public at the app layer. Restrict at reverse proxy/network or with an operations credential if labels are not intended to be public.

# 15. Database and migration review

## 15.1 PR #6 positive findings — VERIFIED

At exact SHA 66346d74a4d1953446eccb39eee721db02824854:

- baseline directory identity is checked;
- frozen migration.sql hash is checked;
- frozen schema.prisma hash is checked;
- each included historical migration has a canonical source hash;
- baseline migrations must be a canonical repository prefix;
- PostgreSQL catalog fingerprint covers relations, columns/defaults, constraints, indexes, enum/domain types, non-extension functions, triggers and public extensions;
- resolve runs only after fingerprint verification for clean baseline;
- baseline SQL interruption boundary is documented honestly;
- future-forward-migration fixture proves live schema can evolve while baseline remains frozen;
- production code does not directly mutate Prisma migration history;
- no historical migration is modified in PR #6;
- no prisma db push is used.

## 15.2 P0 remaining lineage-provenance defect

migrationDeploymentContract validateMigrationRows verifies migration names, order and completion state but not the recorded checksum.

classifyDatabase then treats a migration table that passes that name/state check as RECOGNIZED_PRISMA_LINEAGE without fingerprinting the actual current catalog.

Therefore a synthetic non-project database containing canonical migration names in canonical order but wrong checksums/schema can be misclassified as recognized.

Required fix:

- validate recorded checksums against an accepted checksum set, including documented legitimate historical Windows-origin values where necessary;
- and/or validate a known canonical catalog checkpoint for complete historical lineage;
- add matrix case canonical names + wrong checksums + foreign/partial schema -> fail closed;
- add a fixture sourced from a verified pre-baseline historical lineage, not only a clean-baseline-derived synthetic lineage.

## 15.3 Exact money

PaymentTransaction.amount is Float while booking/pricing authority is integer VND.

Preferred:

- VND-only: integer amountVnd;
- future multi-currency: Decimal + currency + explicit rounding.

Use an additive migration with data verification.

# 16. Test evidence

## 16.1 Exact-SHA green evidence

| Test/workflow | Run | Result | Evidence | Limitation |
| --- | --- | --- | --- | --- |
| Normal CI | 35947504205 | PASS | exact SHA; migration-safety, fresh DB, backend, frontend, Compose | CI-verified, not locally re-executed |
| Migration safety matrix | job in 35947504205 | PASS 12/12 | fresh, redeploy, resolve resume, existing lineage fixture, unknown/foreign history, tamper, future migration | no forged canonical-name wrong-checksum case |
| Batch 5 backend regression | 35947504118 | PASS | exact SHA | backend only |
| Batch 6 backend regression | 35947504109 | PASS | exact SHA | backend only |
| Batch 7 backend regression | 35947504175 | PASS | exact SHA | backend only |
| Batch 7 Graduation Demo | 35947504105 | PASS | exact SHA + screenshots | scripted E2E |

## 16.2 Exact-SHA red evidence

| Workflow | Run | Result | Failure |
| --- | --- | --- | --- |
| Batch 8 Smart Monitoring Release Gate | 35947504153 | FAIL | browser waits for Operations heading after opening Telemetry; selector is stale against current intentional IA |
| Batch 6 Full-stack E2E | 35947504151 | FAIL | Batch4 calendar stage times out finding expected resource option; earlier B2/B3 pass |
| Batch 5 Full-stack E2E | 35947504145 | FAIL | same Batch4 resource-option timeout pattern |

The Batch8 issue is strongly attributable to stale test expectation. The Batch5/6 Batch4 failure root cause is not conclusively proven in this audit and must be reproduced before production code is changed.

## 16.3 Not verified live

- real SMTP;
- real VNPAY Sandbox merchant round trip and reachable IPN;
- real R2/S3 upload/delete;
- real telemetry/camera hardware;
- manual browser walkthrough at every requested viewport;
- screen reader behavior.

# 17. Prioritized findings

## P0

### P0-MIG-01 — Existing lineage can be recognized without checksum/catalog provenance

Area: migration/deployment.

Evidence: migrationDeploymentContract validates names/order/state, then existing migration history is accepted without checking recorded checksums or an existing-lineage catalog fingerprint.

Impact: an unknown schema with forged canonical migration names can cross the fail-closed boundary.

Acceptance: canonical names + wrong checksums/foreign schema must be INVALID_OR_PARTIAL before migrate deploy.

### P0-LAB-01 — Mandatory training/certification does not gate booking

Area: safety/business authority.

Evidence: TrainingRequirement and UserCertification exist, PRODUCT contract expects training eligibility, but createBooking does not query them.

Impact: an untrained user can reserve restricted equipment.

Acceptance: mandatory requirement needs ACTIVE non-expired certification; tests cover valid, missing, expired, revoked, other-user and multiple-course cases.

## P1

### P1-SEC-01 — Resource history exposes actor identities to every authenticated user

File: backend/src/routes/resources.js resource history endpoint.

Recommendation: role-aware projection/redaction.

### P1-GUEST-01 — Guest identity/OTP transaction commits before booking transaction

Impact: consumed OTP/profile/account without booking after conflict/policy/quote failure.

### P1-GUEST-02 — OTP attempt limit is ineffective and resend leaves multiple active challenges

Recommendation: persist failed attempts independently, one active challenge per email/purpose, resend cooldown, per-email + IP limits.

### P1-ID-01 — customerType is self-asserted and guest flow overwrites INTERNAL classification

Recommendation: separate declared from verified identity and preserve trusted classification.

### P1-AUTH-01 — Phone number temporary password is not server-enforced temporary

Recommendation: OTP-to-password-setup preferred; otherwise gate sensitive routes until reset and add expiry.

### P1-PAY-01 — Payment expiry and late-IPN reconciliation incomplete

Recommendation: expiresAt, session renewal, late-success reconciliation, QueryDr/refund if payment remains in final scope.

### P1-DATA-01 — PaymentTransaction.amount uses Float

Recommendation: integer VND or Decimal.

### P1-REL-01 — Three exact-SHA full-stack/release workflows are red

Recommendation: fix stale B8 selector and reproduce Batch4 failure without weakening production behavior.

### P1-MIG-02 — Existing-lineage matrix is synthetic

Recommendation: add verified legacy-lineage fixture/checksum contract.

## P2

### P2-UX-01 — Guest booking uses UTC date for Vietnam today

Use the existing Vietnam date utility.

### P2-UX-02 — Guest booking is a high-load single form

Split into resource/time, identity, OTP/review.

### P2-UX-03 — Profile hierarchy is commerce-first

Move identity/access/training/current obligations before spending/loyalty.

### P2-UX-04 — Public detail omits training/access eligibility

Add training required, independent/assisted use, approval, access group and policy summary.

### P2-IA-01 — Training and audit logs are classified as research tabs

Training safety and audit accountability should not conceptually be research/demo.

### P2-OPS-01 — Vietnam address is a cold-runtime third-party dependency

Add durable versioned snapshot/cache.

### P2-OPS-02 — Media DB delete can leave orphan S3 object

Add cleanup/reconciliation queue.

### P2-SEC-02 — Metrics endpoint is public at application layer

Restrict in deployment.

### P2-UX-05 — Mobile monitoring is excessively tall/dense

Use alert-first summaries and collapsed per-resource details.

### P2-A11Y-01 — Error association is not systematic

Use field-linked errors and an error summary for complex forms.

## P3

### P3-UX-01 — Payment wording says "đặt phòng" for all categories

Use "Thanh toán lịch đặt LAB".

### P3-UX-02 — Raw UUID is the user-facing booking reference

Prefer bookingCode.

### P3-DOC-01 — Phase1 report does not embed final exact-SHA run ID

Record 35947504205 and explicitly list other red workflows.

### P3-CLEAN-01 — Optional/research/legacy surfaces need an explicit registry

Maintain CORE / OPTIONAL / RESEARCH / LEGACY_UNMOUNTED classification.

# 18. Proposed target workflows

## Internal user

~~~mermaid
flowchart LR
    Login --> Discover --> Detail --> Eligibility --> Slot --> Quote --> Review --> Book
    Eligibility -->|missing training| TrainingAction[Training required]
    Book --> Approval --> Payment --> Handover --> Use --> Return --> Complete --> History
~~~

## External user

~~~mermaid
flowchart LR
    Public --> ResourceTime[1 Resource/time/purpose/eligibility]
    ResourceTime --> Identity[2 Identity/contact/address if needed]
    Identity --> OTP[3 OTP + review]
    OTP --> Atomic[Consistent account + booking orchestration]
    Atomic --> Approval --> Payment --> Track[Authenticated tracking]
~~~

## Payment

~~~mermaid
flowchart LR
    Confirmed --> Charge --> Session[Payment session + expiresAt]
    Session --> VNPAY --> IPN
    IPN --> Check{Booking still fulfillable?}
    Check -->|yes| Paid[Payment success]
    Check -->|no| Reconcile[Reconciliation / refund required]
~~~

# 19. UI improvement direction

## Public

- Home
- Resources
- Resource detail
- Access/training/policy
- Quick booking
- Login

## User

- My overview
- Resource catalog
- Calendar
- My bookings
- Payments when enabled
- Training/access status
- Notifications
- Profile/contact

## LAB_STAFF

- Operations work queue
- Calendar/bookings
- Resources
- Maintenance
- Incidents
- Telemetry
- Notifications

## ADMIN

- Operations
- Users/lab assignments
- Resources/policies/pricing
- Audit
- Monitoring
- optional research area

Design principles:

- LAB-first, not ecommerce-first.
- Safety/access before loyalty.
- One primary CTA per step.
- Server-derived success only.
- Progressive disclosure for mobile operational detail.
- Keep operations and telemetry intentionally distinct.
- Loading, empty, no-data, validation, authorization, infrastructure failure, retry and verified-success states for major screens.

# 20. Implementation roadmap

## Phase A — migration merge blocker

Goal: close P0-MIG-01.

Scope:

- accepted migration-checksum contract;
- existing-lineage provenance validation;
- forged-prefix matrix fixture;
- verified historical-lineage fixture.

Acceptance:

- forged canonical names + wrong checksum/schema fails closed;
- legitimate historical lineage passes;
- fresh baseline and future migration stay green.

## Phase B — LAB safety eligibility

Goal: enforce mandatory training.

Scope:

- booking eligibility service;
- resource detail eligibility projection;
- integration tests.

Acceptance:

- missing/expired/revoked certification cannot book mandatory resource;
- no regression in conflict-safe booking.

## Phase C — guest identity/security consistency

- OTP attempt persistence;
- resend invalidation/cooldown;
- account + booking orchestration;
- customer classification;
- temporary-password reset gate.

## Phase D — release evidence

- fix Batch8 stale selector;
- reproduce Batch4 full-stack failure;
- exact final SHA must have required release/full-stack workflows green.

## Phase E — public/guest UX

- Vietnam today utility;
- 3-step quick booking;
- eligibility block;
- field-linked errors;
- mobile validation.

## Phase F — payment hardening

Only if VNPAY remains in final demo scope:

- expiry/reinitiation;
- late-success reconciliation;
- QueryDr/refund;
- exact VND storage;
- real Sandbox/IPN proof.

## Phase G — polish

- profile hierarchy;
- bookingCode;
- generic payment wording;
- mobile monitoring collapse;
- audit/training IA;
- media orphan cleanup.

# 21. Business decisions required

1. Which resources require mandatory training?
2. Is staff override of missing training allowed? If yes, which role and what evidence?
3. Who verifies INTERNAL vs EXTERNAL customer classification?
4. Must every external ROOM booking collect a full Vietnam address?
5. Is phone-as-initial-password still a hard requirement, or may OTP lead to password setup?
6. Is VNPAY required live in the final defense?
7. What is the paid-booking cancellation/no-show policy?
8. What happens when payment succeeds after cancellation/expiry?
9. Is usage billing based on scheduled time, actual time or per-resource policy?
10. What does Resource.capacity mean for booking: room occupancy, quantity or another attribute?
11. Is quota part of official graduation scope?
12. Should ordinary authenticated users see anonymized resource history or no history?
13. How long are audit/incident/payment records retained?
14. Is loyalty only commercial discount, priority signal, or both?
15. Is university SSO/student-directory verification required for INTERNAL status?

# 22. Final recommendation

## KEEP

- canonical four roles;
- canonical BookingStatus;
- PostgreSQL exclusion constraint;
- resource physical status separation;
- LAB_STAFF lab scope;
- approval/handover/return state machine;
- transactional booking notifications;
- maintenance/incidents;
- telemetry NO_DATA/unavailable truthfulness;
- R2/S3 presigned media pattern;
- VNPAY IPN as payment authority;
- frozen clean-baseline and catalog fingerprint.

## FIX before PR #6 merge

- P0-MIG-01 existing-lineage checksum/catalog provenance.

## FIX before serious graduation rehearsal

- P0-LAB-01 training/certification booking gate.
- resource-history identity/privacy projection.
- guest OTP/transaction/customer classification/temporary credential.
- restore green exact-SHA full-stack/release workflows.

## REFACTOR

- guest quick-booking orchestration;
- guest booking UX;
- profile information hierarchy;
- payment session lifecycle.

## FEATURE FLAG

- VNPAY/payment until credentials and reconciliation are verified;
- AI/optimization/digital twin/research modules.

## RETIRE / ISOLATE

- legacy unmounted routes/components using noncanonical states or mock success.

## DEFER

- generalized equipment shipment;
- advanced loyalty;
- quota/fairness optimization;
- hardware access interlocks;
- full ERP/invoicing integration.

## Final verdict

The repository is a credible graduation-level laboratory resource operations system, not merely a booking calendar. Its strongest evidence is database booking integrity, lab-scoped staff operation, handover/return, maintenance/incidents, persisted notifications and truthful monitoring.

It is not yet safe to call production-ready, and PR #6 is not yet ready to merge because existing-lineage classification does not fully prove migration provenance. After that migration blocker, training enforcement is the highest-value product fix.

Do not spend the next implementation phase on more AI, dashboards or loyalty. Close migration provenance, training eligibility, guest security/consistency and red release evidence first.
