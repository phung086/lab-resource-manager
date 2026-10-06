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

External backup: C:/Users/Admin/.codex/backups/lrm-publication-20261006-220119.
Private settings, historical screenshot/log folders and backup archives are
retained locally rather than uploaded. Source, required assets, portable rules,
skills entrypoint and maintained reports are included. Secret-pattern review
found only example/variable-placeholder or explicit local-demo database URLs;
no real provider key/JWT/private key was detected by that scan. This is not a
claim that a pattern scanner proves absence of every possible secret.
