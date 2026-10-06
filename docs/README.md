# Documentation index

Read [AGENTS](../AGENTS.md) and the three `.agent/` documents first when changing
code. Authority remains assignment → instructor requirements → SRS → product
and approved contracts → verified reports → implementation.

## Current working documents

| Need | Document |
|---|---|
| Full Claude handoff: local/GitHub, business, source map, history, UX, verification and backlog | [Full context](CLAUDE_PROJECT_CONTEXT_20261006.md), [project instructions](CLAUDE_PROJECT_INSTRUCTIONS.txt), [Claude entry point](../CLAUDE.md) |
| Requirements, actors, permission matrix and use cases | [SRS](srs.md) |
| Product boundary | [Product](../PRODUCT.md) |
| Latest local implementation and verification | [Current state](CURRENT_STATE.md) |
| Architecture decisions | [Decisions](DECISIONS.md) |
| Source layout and conventions | [Structure](PROJECT_STRUCTURE.md), [convention](convention.md) |
| Backend/frontend contracts | [Backend](BACKEND_GUIDELINE.md), [frontend](FRONTEND_GUIDELINE.md) |
| Database relationships generated from Prisma | [Core ERD](DB-erd/core-erd.md) |
| LAB visual and interaction rules | [UI/UX](UI-UX-style-guideline/README.md) |
| Security controls and remaining risks | [Threat model](security/threat-model.md) |
| Repeatable deployment and optional services | [Deployment](DEPLOYMENT.md) |
| External provider setup and configuration limits | [Integration guide](INTEGRATION_SETUP_GUIDE_20261003.md) |
| Contextual AI assistant before adding a key | [Setup guide](AI_ASSISTANT_SETUP.md), [MCP contract](AI_ASSISTANT_MCP.md) |
| Word direction comparison, operational reports and simulation boundary | [Implementation direction](IMPLEMENTATION_DIRECTION_20261005.md) |
| Official graduation demonstration | [Demo runbook](GRADUATION_DEMO_RUNBOOK.md) |
| PR #22 review corrections and verification | [Review response](reviews/PR22_REVIEW_RESPONSE_20261003.md) |
| Prioritized remaining work | [Backlog](backlogs/README.md) |

## Evidence and historical snapshots

[Workflow QA](QA_WORKFLOW_REPORT_20261003.md) and [queue pagination](WORKSPACE_QUEUE_PAGINATION_20261003.md)
record their own run scope. [Historical review follow-up](reviews/GRADUATION_REVIEW_FOLLOWUP_20261003.md)
records subsequent fixes and fresh checks. Always match evidence to its revision
and environment; a prior GO verdict is not a fresh run of all workflows.

`BATCH*_REPORT.md`, `BATCH*_WALKTHROUGH.md`, closure audits and older gap analyses
remain historical evidence at their original paths so references continue to
work. In particular, [assignment gap analysis](ASSIGNMENT_GAP_ANALYSIS.md)
describes the pre-reconciliation implementation. Read current state before using
old findings as an implementation plan.

Screenshots and local generated reports go under the documented ignored `logs/`
or browser output folders. Existing tracked evidence is retained. Removing a
tracked file today would not shrink Git's earlier history; history rewriting is
outside this task.
