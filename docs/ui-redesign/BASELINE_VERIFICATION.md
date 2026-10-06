# Publication baseline — 2026-10-06

Source: C:/Projects/lab-resource-manager, formerly codex/lab-workspace-ui-draft.
Committed trees of local 43b1832 and origin/main a5472d4 matched before preparation;
publication includes the existing local UI/assistant/report/runtime improvements
plus multi-agent preparation. No application redesign was implemented by setup.

Local checks passed:
- frontend npm run test:required: 2214 locale keys, integrity/projection checks,
  8 locale/network tests, ESLint (0 errors, 9 pre-existing warnings), typecheck, build.
- backend npm run test:required: 86 passing tests (38 core, 6 security,
  38 assistant, 4 report/scenario); npm run lint passed.
- preparation gate: 7 isolated behavioral checks passed (allowed edits, forbidden
  paths, global selectors, shared token overrides, !important, committed edits,
  tooling edits); manifest allowlists are disjoint.
- Antigravity: all six SKILL.md frontmatters parsed; four copied bundles matched
  their source hashes; two custom skills and the portable project skill passed
  quick_validate.py. This does not prove active loading inside an IDE conversation.

Full database integration, all runtime flows and redesigned-screen visual
acceptance were not rerun by this preparation. GitHub checks must be evaluated
at the published head; earlier PR #22 checks do not certify this local baseline.

## Publication follow-up
At first published head 614a8e2, remote fresh-database, backend, frontend,
migration-safety, Docker, queue pagination, Batch 7 regression/demo and Batch 8
smart-monitoring E2E jobs passed. Two gates exposed specific problems:
- Backend production audit flagged proxy-addr 2.0.7 (GHSA-jqcg-44mw-7w3h).
  The coordinator updated only that transitive lock entry to compatible 2.0.8.
  Production audit now reports zero vulnerabilities; the 86-test required
  backend suite, lint and production-config verifier passed after reinstall and
  Prisma client generation. Schema/migrations were not changed.
- Workspace navigation itself passed 129 assertions. The following bilingual
  test assumed every demo staff member was unassigned, despite the fresh seed
  assigning both labs. The test now checks the real history read outcome and
  explicitly injects a 403 to verify translated denial and retained modal.
  This does not weaken backend permissions or replace a required runtime flow.
  The local bilingual rerun verified the staff/VI denial assertions before
  hitting the shared API's real 429 ingress limit during staff/EN. It is not a
  full passing E2E run; the final CI rerun uses its existing isolated high-limit
  test environment. The local rate-limit policy was not weakened for testing.

Frontend required checks also passed from the clean Antigravity checkout.
Frontend production audit reports zero vulnerabilities. Full dependency audits
still report development dependency findings (frontend 10 high, backend 4 high);
these were not broadly upgraded as part of this bounded publication fix.
Inspect GitHub Actions for the final follow-up head before claiming all CI green.

External backup: C:/Users/Admin/.codex/backups/lrm-publication-20261006-220119.
Private settings, historical screenshot/log folders and backup archives are
retained locally rather than uploaded. Source, required assets, portable rules,
skills entrypoint and maintained reports are included. Secret-pattern review
found only example/variable-placeholder or explicit local-demo database URLs;
no real provider key/JWT/private key was detected by that scan. This is not a
claim that a pattern scanner proves absence of every possible secret.
