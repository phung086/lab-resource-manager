# Open business decisions — 2026-09-24

This list records questions that affect future implementation. It does not block the Phase 0 audit or the deterministic safety checks that can be built without a policy choice. Existing accepted decisions in `docs/DECISIONS.md` take precedence.

| ID | Decision needed | Current evidence / safe interim rule |
| --- | --- | --- |
| D-01 | Which resources require mandatory training, and which courses qualify? | `TrainingRequirement` exists; booking does not enforce it. Enforce configured mandatory requirements; do not invent new requirements. |
| D-02 | May staff override missing/expired training? | No accepted override policy. Default to no override. |
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
| D-14 | Which fresh-deployment migration strategy replaces the broken current path? | Phase 0 found mixed-line-ending checksum expectations incompatible with fresh CRLF checkout. A new clean baseline lineage is the preferred durable direction, subject to PostgreSQL 16 verification and explicit migration-path documentation. Historical SQL and `_prisma_migrations` stay immutable. |

The user explicitly requested an email login with phone number as the initial password for quick-created accounts. This remains the current product decision. Security hardening must enforce a prompt password change at the backend and limit use of that temporary credential; replacing the login model requires a new product decision.
