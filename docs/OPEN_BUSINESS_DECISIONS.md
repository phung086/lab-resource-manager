# Open business decisions — 2026-09-24

This list records questions that affect future implementation. It does not block the Phase 0 audit or the deterministic safety checks that can be built without a policy choice. Existing accepted decisions in `docs/DECISIONS.md` take precedence.

| ID | Decision needed | Current evidence / safe interim rule |
| --- | --- | --- |
| D-01 | Which resources require mandatory training, and which courses qualify? | Booking now enforces every configured mandatory `TrainingRequirement`; product owners still decide which resource/course rows to configure. The implementation does not invent requirements. |
| D-02 | May staff override missing/expired training? | No accepted override policy. Phase B deliberately implements no override. |
| D-03 | Who verifies INTERNAL vs EXTERNAL classification? | Phase E defines every current value as `SELF_DECLARED_UNVERIFIED`. Self-registration/profile may declare it, but it grants no price, access, training, quota, priority or loyalty benefit. Institutional verification still needs an approved actor, evidence source, upgrade/downgrade rules and audit model before any schema expansion. |
| D-04 | Is full Vietnamese address mandatory for ROOM-only booking? | The approved quick-booking checkpoint collects it, but data minimization should be decided before making it a permanent room policy. |
| D-05 | Will a real VNPAY Sandbox round trip be shown during the defense? | Checkout exists; merchant/IPN credentials are not configured locally and no real round trip is verified. |
| D-06 | What are cancellation and no-show rules, especially after payment? | Keep existing canonical statuses and do not invent refund deadlines or fees. |
| D-07 | Who handles a valid late payment after booking cancellation: auto-refund or manual finance review? | Do not restore cancelled booking automatically. Record the payment and surface a reconciliation case once the policy is approved. |
| D-08 | Are charges based on scheduled time or actual use? | Current booking pricing snapshots scheduled time; do not retroactively rebill from actual use without an accepted policy. |
| D-09 | Is quota in the required graduation scope? | Do not enable research/fairness modules as quota authority. |
| D-10 | Is university SSO/student-directory verification required for INTERNAL users? | Current auth is database-backed; no SSO authority exists. |
| D-11 | What is audit/PII retention and deletion policy? | Preserve existing audit history; do not claim a retention schedule. |
| D-12 | How much maintenance detail may be visible publicly? | Public schedule should reveal unavailable periods without private operational notes. |
| D-13 | Is loyalty an academic access signal, commercial discount, or both? | It must never bypass training, RBAC, approval, quota or safety. |
| D-14 | RESOLVED — clean deployment strategy | ADR-021 adopts a reviewed clean-install baseline for empty databases and preserves the historical lineage for existing databases. PostgreSQL 16 verification is recorded in the Phase 1 report. |
| D-15 | May a public guest submission update an existing EXTERNAL profile? | No policy exists for reconciling submitted name, phone, organization or address with stored identity data. Preserve the current profile without overwrite until ownership/reverification and field-by-field rules are approved. |
| D-16 | Should phone-based temporary credentials be replaced by an OTP-bound password-setup session? | The current backend-restricted lifecycle is verified, but the initial password remains predictable from phone data. A setup token/session is the recommended future improvement; it is deferred because it changes the authentication contract. |
| D-17 | RESOLVED — generic system audit model | ADR-022 establishes an append-only `SystemAuditEvent` model for role changes, activation, assignment mutation, pricing, guest identity, and admin charges with strict transaction coupling and RBAC. Audit retention period remains an open policy question. |

The user explicitly requested an email login with phone number as the initial password for quick-created accounts. This remains the current product decision. Security hardening must enforce a prompt password change at the backend and limit use of that temporary credential; replacing the login model requires a new product decision.

## Phase D implementation note — 2026-09-25

- D-03 remains open. Guest completion cannot overwrite an existing trusted
  classification, and no current pricing/access/training/quota authority reads
  client-declared `customerType`. A later verified-classification model needs a
  separate approved schema decision.
- Policy for allowing a public guest submission to update an existing
  EXTERNAL user's name, phone, organization, or address is undefined. Phase D
  therefore reuses that account without overwriting any stored profile field.
- The approved phone-based initial password remains. Phase D now forces the
  password-change lifecycle in backend middleware; replacing it with a
  password-setup token or passwordless login remains a product decision.

## Phase E governance note — 2026-09-25

- `customerType` is a declaration, not `Role` and not verified institutional
  identity. No current server policy consumes it for authority or benefit.
- Full resource provenance is operational audit data for administrators and
  assigned lab staff. Ordinary users receive a separate safe timeline rather
  than internal audit fields.
- Existing EXTERNAL profile preservation remains the fail-safe rule under
  D-15. Phase E makes no silent profile reconciliation policy.
- General audit persistence and retention remain D-17. A future migration must
  define actor, target, timestamp, from/to state, reason and metadata without
  storing secrets or raw sensitive request bodies.

## Phase F accountability note — 2026-09-26

- D-17 is resolved regarding generic system audit persistence: the
  `SystemAuditEvent` model now captures user role updates, user activations,
  lab assignment lifecycle, pricing adjustments, guest account lifecycle, and
  admin financial charges.
- Data minimization and secret sanitization are enforced before database
  insertion.
- Transactional coupling guarantees mutations roll back if audit persistence
  fails.
- Audit retention period (D-11 / D-17 retention schedule) remains an open
  business decision. No destructive retention job is implemented; all audit
  records are currently retained permanently.
