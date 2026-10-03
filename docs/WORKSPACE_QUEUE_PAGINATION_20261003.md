# Workspace booking and incident pagination

Date: 2026-10-03. Branch: `codex/lab-workspace-ui-draft`.
Starting revision: `66e744473c940515548048d448019beb3d311e9b`.
Continuation of [draft PR #22](https://github.com/phung086/lab-resource-manager/pull/22),
within the requested task; no new numbered Batch, commit, push, merge or deployment.

## Assessment and scope

This improves required operational correctness. The existing booking list stops
at 100 recent records and the incident list defaults to 50. Aggregating those
arrays can hide old pending approvals, overdue loans and unresolved incidents.
The role workspace report and PR description disclose this limitation. Increasing
those caps alone would leave the same failure at the next threshold.

The change adds bounded server pages and complete scoped counts to the existing
Express/Prisma routes. Booking operations, incident operations and the staff home
queue fetch their selected page. Staff/admin priority figures and the incident
navigation badge consume server totals. Existing React/Vite structure, project
tokens, confirmation forms and write services remain authoritative. No schema,
migration, runtime dependency or canonical role/booking status changes are made.
Earlier local QA/documentation changes and artifacts are preserved.

## API contract

Presence of `page` selects the new envelope. Without `page`, both endpoints still
return their original arrays: bookings capped at 100; incidents default 50 with
the existing `take` option capped at 100.

| Field | Booking pages | Incident pages |
| --- | --- | --- |
| `page` | Required integer, 1–1,000,000 | Same |
| `pageSize` | Integer, 1–100; default 20 | Same |
| `filter` | `ALL` (default), `HISTORY`, or a canonical booking status | `ALL` (default), `OPEN`, `RESOLVED` |
| `status` | Optional canonical booking status | Optional existing incident status |
| `resourceId` | Optional persisted string ID, 1–255 characters; intersects actor scope | Same |
| `severity` | Unsupported | Optional `low`, `medium`, `high`, `critical` |

`status` cannot be combined with a non-`ALL` filter. Unknown query fields,
including client-provided user/lab identities, fail with `400 VALIDATION_ERROR`.
`take` belongs to the legacy incident contract, not the new page contract.

Examples:

```text
GET /api/bookings?page=1&pageSize=20&filter=PENDING_APPROVAL
GET /api/bookings?page=2&pageSize=20&filter=HISTORY
GET /api/incidents?page=1&pageSize=20&filter=OPEN
GET /api/incidents?page=1&pageSize=20&filter=RESOLVED&severity=high
```

Response shape:

```text
{
  items: [...existing record projections...],
  pagination: { page, pageSize, total, totalPages },
  summary: ...
}
```

`pagination.total` counts all matching records before pagination. `totalPages` is
zero for an empty queue. A valid page beyond the last page returns empty `items`
with truthful totals; the UI moves back to the last available page.

Booking summary: `{ total, byStatus, history, overdue, asOf }`.
`history` covers `COMPLETED`, `REJECTED`, `CANCELLED`; `overdue` counts
`CHECKED_OUT` with `endAt < asOf`. Incident summary:
`{ total, byStatus, open, resolved }`; open statuses reuse the existing service's
`reported`, `triaged`, `assigned`, `investigating`. Resolved includes `resolved`,
`verified`, `closed`. Missing `byStatus` entries mean zero.

Summaries ignore the selected status/filter so tabs retain full queue counts.
Resource and incident severity filters narrow both the list and its summary.
Every count stays inside the actor's authorized scope.

## Authorization and ordering

- Authentication checks the current active database user as before.
- `ADMIN` retains global access. `LAB_STAFF` lists and aggregates include the
  current resource laboratory's `UserLabAssignment` relation in every query.
  An unassigned/revoked staff member gets empty scoped results.
- Lecturer/student booking reads retain `requestedById` ownership; incident
  reads retain `reportedById` ownership. A page/filter cannot widen this scope.
- Explicit foreign-resource booking filters retain the existing staff `403`.
  Incident filters intersect scope and return zero matching records.
- Exact booking links use the existing authorized `GET /bookings/:id`; opening
  an old record's action link opens the confirmation form without writing.

Counts and items share one PostgreSQL Repeatable Read transaction per response.
Active booking stages sort by earliest start; checked-out loans sort by earliest
end, putting overdue work first. All/history/terminal booking lists sort by newest
start. Incidents sort by newest detection time. Creation time and ID finish each
order, preventing arbitrary tie order in an unchanged dataset.

## Frontend behavior

- Operations show 20 rows; the staff home stage shows five. Previous/Next controls
  show the range and complete total. Server filters expose older actionable rows
  even when recent completed/closed records fill the previous caps.
- Actor/filter changes reset page one, including returning to an earlier filter.
  Language changes preserve the selected page and any existing form draft.
- Reads cancel on supersession/unmount. Late responses cannot replace the current
  queue. Cancelled Strict Mode setup skips starting a duplicate page request.
- Loading/failure hides old actionable rows. Errors offer retry; successful
  mutations refresh the page and shared summaries. Refresh recovers an emptied
  last page. Keyboard page changes restore focus to an available page control.
- Shared records remain reusable when opening notifications. The existing role
  request-budget assertion now distinguishes an explicit queue page from the
  shared bounded preview by its query string.
- UI copy comes from the shared VI/EN catalogs: 2,121 matching keys. Existing
  visual tokens and 44 px controls are retained; no layout redesign is included.

## Verification

| Check run locally | Result |
| --- | --- |
| Backend lint | Pass |
| `backend: npm run test:required` | 60 pass: 38 core, 3 release security, 19 assistant |
| `backend: npm run test:queue-pagination` | 4 PostgreSQL integration tests pass |
| `frontend: npm run test:ui:queue-pagination` | 51 real-browser checks pass; no browser exceptions |
| `frontend: npm run test:required` | Pass: 7 locale/network tests, catalog/source gates, lint, TypeScript, build |
| VI/EN catalog/source checks | 2,121 keys; 79 active modules audited |
| Frontend lint | Zero errors; 13 pre-existing warnings |
| Production build | Pass; main entry 355.71 kB / 105.83 kB gzip |
| CI YAML parsing | Pass; dedicated PostgreSQL 16/browser job configured |
| Diff whitespace check | Pass |

The integration fixture is persisted only in a newly created local
`lab_resources_queue_pagination_test` database: 160 bookings and 86 incidents,
with a second laboratory and multiple roles. This is isolated test evidence.
Staff walks reach all 156 assigned bookings and 82 assigned incidents without
duplicates; old pending/open work lies beyond both former caps. Tests cover admin,
owner, lecturer, foreign-resource, inactive/unauthenticated, unassigned and revoked
staff access, plus invalid queries, empty pages, filters, summaries and tied times.

Browser checks use the real test API and PostgreSQL. They cover five account
scopes, old exact-record links, no implicit writes, filters/page resets, VI/EN,
keyboard focus, failure/retry, delayed response cancellation, request budgets,
notification navigation and 375/1440 px overflow. Five real authorized incident
resolutions remove the last open page; refresh correctly returns to page one.
Local results/screenshots are in `logs/queue-pagination-20261003/browser/` (ignored).
The dedicated API/Vite processes and this task's isolated fixture database were
removed after verification. Existing project servers and databases were retained.

The new `queue-pagination` CI job creates its own PostgreSQL service, deploys
canonical migrations, runs the integration fixture, starts the guarded test API
and Vite, runs Chromium checks, and uploads browser evidence. It has not run on
GitHub for this local change. Historical QA reports keep their original revision
and test outcomes; the entire earlier business/browser matrix was not rerun here.

### Reproduction

Use a fresh, migrated PostgreSQL 16 database named exactly
`lab_resources_queue_pagination_test` on localhost. Set
`QUEUE_TEST_DATABASE_URL` and `DATABASE_URL` to that database, then run in
`backend/`: `npm run db:migrate` and `npm run test:queue-pagination`.
The fixture refuses a wrong host/database or an existing user population.

Keep that fixture database for the browser test. In a separate backend terminal,
with `QUEUE_TEST_DATABASE_URL` still set, start
`node test/helpers/queuePaginationServer.mjs` (API port 15015). In `frontend/`,
set `VITE_API_BASE_URL=http://127.0.0.1:15015/api` and start Vite on
`127.0.0.1:15185` with `--strictPort`. Run `npm run test:ui:queue-pagination`
from another frontend terminal. Playwright Chromium must be installed; an existing
Chrome can be selected with `CHROMIUM_EXECUTABLE_PATH`. The browser suite changes
five fixture incidents, so reproduce the full suite on a fresh isolated fixture.
CI contains the complete automated setup.

## Remaining limits

- Offset pages are separate snapshots. Concurrent insertions/status changes can
  move records between pages; refresh is the supported recovery.
- Full aggregates and deep offsets have not been benchmarked at large production
  volume. Existing schema/indexes remain unchanged; page-size limits bound response
  rows, not the work required for counts or deep scans.
- Student/lecturer home previews, teaching previews, resources, maintenance and
  notifications retain their existing bounded-list behavior. Their broader
  pagination is outside this request. Legacy API callers without `page` retain
  the original booking/incident caps.
- Counts are snapshots refreshed on home entry, explicit refresh or mutation;
  there is no live push. Booking and incident responses have separate snapshots.
- The earlier maintenance rescheduling P2 and external-provider setup remain
  outside this task. PR #22 remains draft; these changes are local and unpushed.
