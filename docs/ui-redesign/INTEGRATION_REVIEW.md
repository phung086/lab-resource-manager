# Wave 1 integration review

Read-only source review on 2026-10-06. Scope workflows passed for all three web
heads below. No contributor branch was merged into coordinator/main in this step.

| Task | PR / reviewed head | Acceptance pending |
| --- | --- | --- |
| Profile | #23 / f2af3b51d43b0e860ec3319286115bf056abbfb0 | Live integrated CSS and form/draft verification |
| Operations | #24 / 319fbcb7706efdb7aedcd05daed383f81d4ca22b | Contributor terminal-history correction plus shared CSS/live checks |
| Calendar | #25 / d9a0d11e4f27326a8d337d4bf5caa27429c509f5 | Shared grid-placement correction and actual-head CI/live checks |
| Landing | Antigravity checkout, work in progress | Finished diff/report and commit/PR |

## Shared corrections owned by coordinator

Import shared foundation CSS before App/component imports to make equal-specificity
surface styles win consistently. This correction is implemented in the coordinator
foundation PR; profile still requires live review after integration.

At calendar integration, exclude obsolete final-workspace resource/action/navigation
grid-column/grid-row assignments for the redesigned root. Splitting its toolbar into
two rows does not clear inherited placements; check 768px for implicit columns.

At operations integration, exclude the obsolete desktop outer-card two-column template
from final-workspace.css for the redesigned root. The new four-fact band must not be
confined to the former detail column and cropped by overflow:hidden.

These changes belong in shared coordinator files; do not concurrently patch a
contributor's owned files. Preserve incumbent presentation until that surface is
actually integrated and verified.

## Operations contributor correction

BookingWorkflowTimeline newly displays the lifecycle strip for cancelled/rejected
records and marks every earlier step reached from the last lifecycle index. For a
resource with immediate confirmation the real events can be
REQUEST(null -> CONFIRMED), then CANCEL(CONFIRMED -> CANCELLED), with no approval
event. The new terminal strip nevertheless marks the step labelled Approved reached.

Smallest correction: keep the redesigned terminal banner and persisted history,
but omit terminal lifecycle progression as the baseline did. An alternative must
derive explicitly evidenced stages and distinguish confirmation from approval.
Do not invent audit/approval evidence, alter backend semantics or change role/status
contracts. Re-run the contributor scope gate and required frontend checks.

## CI evidence limits

At review time profile and operations CI succeeded. Calendar CI failed in the
navigation job: `lecturer: navigation focuses destination`. Its source diff does
not modify shared navigation, but that is not proof of a harmless flake; investigate
or rerun at the actual integrated head before acceptance.

Legacy Batch 5/6 workflows also reported failures on the web PRs; do not describe
those PRs as fully green or restore retired optional modules merely to pass them.
Record their actual failure causes against the approved required release gates.
Check status again if the contributor head changes; the table is a review checkpoint.
