# Open business decisions — 2026-09-24

This list records questions that affect future implementation. It does not block the Phase 0 audit or the deterministic safety checks that can be built without a policy choice. Existing accepted decisions in `docs/DECISIONS.md` take precedence.

| ID | Decision needed | Current evidence / safe interim rule |
| --- | --- | --- |
| D-01 | Which resources require mandatory training, and which courses qualify? | Booking now enforces every configured mandatory `TrainingRequirement`; product owners still decide which resource/course rows to configure. The implementation does not invent requirements. |
| D-02 | May staff override missing/expired training? | No accepted override policy. Phase B deliberately implements no override. |
| D-03 | Who verifies INTERNAL vs EXTERNAL classification? | Self-registration/profile currently accept the value; it must not grant price or access benefits until verified. |
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
