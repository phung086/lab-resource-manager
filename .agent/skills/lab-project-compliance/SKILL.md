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
5. Read `/docs/PROJECT_STRUCTURE.md`.
6. Read `/docs/convention.md`.
7. Read `/docs/CURRENT_STATE.md`.
8. Read `/docs/DECISIONS.md`.
9. Read the relevant verified Batch report.

When modifying frontend:

- Read `/docs/FRONTEND_GUIDELINE.md`.

When modifying backend:

- Read `/docs/BACKEND_GUIDELINE.md`.

When modifying persistence:

- Read Batch 1 persistence reports.
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
