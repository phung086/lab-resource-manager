# LAB interface baseline

The interface is an operational laboratory tool: a clear public entry, compact
workspaces, explicit resource states and visible next actions. Use the existing
components and tokens when fixing a flow. A visual change must help a user find,
understand or complete an actual operation.

## Visual sources

| Element | Current source / rule |
|---|---|
| Typeface | IBM Plex Sans; IBM Plex Mono for codes and technical values; system fallbacks |
| Canvas / cards | `--canvas: #f5f7fb`; white `--surface-card`; muted separators |
| Primary action | Navy `--accent: #174d70`; one clear primary action per operation |
| Text and states | Semantic `--text-*`, red/amber/emerald tokens; always accompany color with a label |
| Workspace structure | [workspace-shell.css](../../frontend/src/styles/workspace-shell.css); role navigation, headings, compact ledgers |
| Public entry | [public-landing.css](../../frontend/src/styles/public-landing.css); purpose, workflow and catalogue entry |
| Shared tokens | [light-redesign.css](../../frontend/src/styles/light-redesign.css); align component styles with these variables |

Avoid oversized cards, competing accent colors, decorative charts and unsupported
statistics. Use resource photographs/video only when they represent a configured
record; unavailable media gets an honest empty state.

## Interaction rules

- Show resource, time, current state and required next action together. Separate
  physical operational state from derived scheduling availability.
- Render queue rows from the selected server page. Show full authorized totals,
  loading/error/empty states and retry; hide stale actionable rows after failed
  reads. Filters reset to page one. Old-record shortcuts fetch the exact
  authorized record rather than searching a recent array.
- Keep confirmation, evidence and validation in the existing forms. Maintenance
  editing preserves serialized `resource.id`; changes require a reason and an
  impact check. Impact preview does not grant authorization.
- Use 44px interaction targets for primary workspace and pagination controls.
  Preserve visible focus, keyboard activation, associated labels, dialog Escape
  behavior and usable focus after paging. A screenshot alone does not certify
  accessibility.
- Use the shared VI/EN catalogue. Switching language preserves page, resource
  and unsaved input. Translate interface copy; retain user content, resource
  codes and canonical API values.
- At narrow widths, stack controls and keep actions visible. Review both VI/EN
  at 375px and 1440px; queue tests cover these sizes, not every device.
- Public schedules use safe projections. Private queues follow owner/lab scope.
  Academic review stays distinct from staff resource approval.

## Verification and artifacts

Run frontend `npm run test:required` for catalogue/source checks, network tests,
lint, incremental TypeScript and build. Changed flows also need the applicable
real API/database browser suite. Queue regression setup is in the
[queue report](../WORKSPACE_QUEUE_PAGINATION_20261003.md).

Store new screenshots under ignored `logs/` or browser output folders; retain
existing tracked evidence. Record viewport, locale, role, revision and test DB.
See [review follow-up](../backlogs/review-followup-20261003.md) for scoped checks
and known lint warnings.
