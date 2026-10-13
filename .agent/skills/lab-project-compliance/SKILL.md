---
name: lab-project-compliance
description: Enforces instructor requirements and canonical Lab Resource Manager architecture.
---

# Lab Project Compliance

Before implementation:

1. Read `/AGENTS.md`.
2. Read `/.agent/PROJECT_RULES.md`.
3. Read `/.agent/INSTRUCTOR_BASELINE.md`.
4. Read `/.agent/DEVELOPMENT_WORKFLOW.md`.
5. Follow root AGENTS reading order through `/.agent/CONTEXT_MAP.md` and the
   relevant area guide. Read complete applicable sections of SRS, convention,
   structure, current state and decisions; preserve shared invariants.
6. Inspect the affected implementation and current tests. Historical AI Batch
   reports are retired; use `/docs/CURRENT_STATE.md` for verification limits.

When modifying frontend:

- Read applicable `/docs/FRONTEND_GUIDELINE.md` sections and `frontend/AGENTS.md`.

When modifying backend:

- Read applicable `/docs/BACKEND_GUIDELINE.md` sections and `backend/AGENTS.md`.

When modifying persistence:

- Read persistence decisions in `/docs/DECISIONS.md` and the guarded migration workflow in `/docs/BACKEND_GUIDELINE.md`.
- Read `/backend/prisma/schema.prisma`.

## Mandatory Checks Before Completion

Verify:

- correct folder placement
- naming convention
- no duplicated business logic
- canonical role/status constants
- authorization
- validation
- persistence correctness
- tests/build appropriate to scope
- no mock/fake success in core runtime
- no scope expansion
- compliance with instructor baseline

Never replace current architecture merely to imitate a reference repository.
