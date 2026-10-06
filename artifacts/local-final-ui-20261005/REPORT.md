# Local LAB UI build, 5 October 2026

## Result and boundary

Built the user-approved desktop direction locally on `codex/lab-workspace-ui-draft`, starting at `43b18328f80a1297c236b69e5496cc8afce86d72`. Existing working changes were preserved. No commit, push, merge, deployment or new numbered Batch was performed.

The implemented scope is landing, persistent text navigation, calendar controls, booking queue presentation and shared styling on the four role homes. The 50-frame preparation map remains a review and development map; this iteration does not claim every screen has been redesigned.

- Landing has one labelled LAB illustration, two clear actions, the existing catalogue and check-schedule section, workflow, authentication and useful footer destinations.
- Desktop navigation is always visible from 1100px, using existing role and feature filters. Narrow layouts keep the menu, focus trap, Escape dismissal and focus restoration.
- Calendar separates resource/booking controls from period/view controls. The selected resource is named once. Existing APIs and booking rules remain intact.
- Booking cards lead with resource and purpose, followed by requester, time and LAB. Actions use clear verbs and fewer icons. Server filtering, pagination, old-record links and evidence forms remain intact.
- Header/footer stay shared across public and authenticated pages. VI/EN, IBM Plex Sans and the incumbent navy identity remain.

Two observed recovery faults were fixed: failed server sign-out now clears the local React workspace as well as stored credentials; a denied resource detail/history read now shows a detail error while retaining the authorized catalogue. Server permissions are unchanged, and a failed logout response does not prove server token revocation.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Frontend required gate | Pass: 2,138 VI/EN keys, 82 source modules, eight locale/API tests, lint, typecheck and production build | `frontend-required.log` |
| Four-role navigation | Pass: 121 checks, no browser exceptions | `navigation/results.json`, `navigation-test.log` |
| Queue backend integration | Pass: six tests on isolated PostgreSQL 16 | `queue-fixture-prepare.log` |
| Queue browser regression | Pass: 58 checks on real isolated PostgreSQL data | `queue/results.json`, `queue-ui.log` |
| Bilingual browser regression | Pass: 315 checks, all four roles, no browser exceptions | `bilingual/bilingual-results.json`, `bilingual-test.log` |
| UI detector | Completed once: zero findings | `detector.json` |
| Shipping raster provenance | Two rasters, no missing provenance; one new hero plus inherited CSS asset | `ASSET_PROVENANCE.md`, `hero-prompt.txt`, `asset-scan.log`, asset sidecars |
| Preserved source backups | All 27 initial backup hashes match | `backup-manifest.json`, `backup/` |

Lint retains nine pre-existing warnings and no errors. The queue checks cover five access cases, scoped totals beyond the old caps, old-record deep links, pagination/filter reset, superseded responses, read failures/retry, keyboard pagination, emptied incident-page clamping and a real isolated maintenance reschedule. Opening a record/action form is checked not to write automatically.

Navigation checks cover all four canonical roles, role-filtered destinations, footer routes, keyboard behavior, history/reload, localization, failure states, required password gating and local sign-out recovery after an intercepted HTTP 429. The injected failures test UI behavior; successful business reads use the real backend.

Settled captures cover landing at 1440/375px, calendar and booking queues at 1440/1280/375px, and full role overviews at desktop/narrow sizes. A finish review is recorded separately in `FINISH_REVIEW.md`; its verdict applies only to its stated scope.

The fresh finish reviewer returned `ship` with no material fixes within the stated representative scope. The documenter then merged the approved structural delta into `DESIGN.md` and `.impeccable/design.json`, preserving the token frontmatter and incumbent palette/fonts. See `DOCUMENTATION_CHECK.md`. Bilingual browser checks passed after updating the inherited public language test selector to the shared header; the final run covers enabled role pages, calendar modes, private-detail denial, profile/guest drafts, read-only assistant history/context and locale network/integrity/startup recovery.

## Local runtime and data

- UI: http://127.0.0.1:15181/; API: http://127.0.0.1:15005/api.
- Main database: existing `lab_resources_local_demo`; no migration, seed, reset or business mutation was performed against it in this iteration.
- The temporary `lab_resources_queue_pagination_test` database was created only after verifying absence, populated with canonical migrations and isolated fixtures, then removed after exact-name and fixture checks. API 15015, UI 15185 and their launcher were stopped. The main local app remains running.
- Docker containers/volumes were not changed.

## Limits and remaining risks

1. The main demo staff account is unassigned to a LAB. Its empty scoped queues and denied private resource history are expected. Populated authorized staff queues were verified in the isolated test environment; no access was granted merely for a screenshot.
2. Some older role-home cards and other core views retain their incumbent composition. Desktop work is prioritized; narrow testing establishes reachability and overflow behavior rather than full mobile optimization.
3. The new 1536 × 1024 hero is a 1.15 MB lossless WebP generated illustration, explicitly labelled in both languages. It is not a photograph or evidence of an actual institutional room. Future delivery optimization can reduce transfer size.
4. This UI iteration does not rerun every business mutation or prove production performance under concurrent users. Backend/schema, canonical statuses, operational-state authority and LAB-scope authorization were not changed.
5. Live media upload/video, payment, SMTP/mail delivery and shipping remain separate work. No provider was activated and no external transaction or email was sent.
6. Ordinary live-demo rate limits remain enabled. Browser suites run sequentially with spacing; earlier combined runs hit HTTP 429 and are not counted as passing verification. Test fixtures also needed targeted restoration between repeat runs; the final queue run passed all 58 checks.

Preparation: `../final-ui-preparation-20261005/FINAL_UI_BRIEF.md`. Build details: `DESIGN_HANDOFF.md`. Test matrix: `LIVE_CHECKS.md`.
