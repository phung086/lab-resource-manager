# Project Structure

## Current Root

```text
lab-resource-manager/
  AGENTS.md
  .agent/
  docs/
  frontend/
  backend/
  data/
  infra/
  ops/
  research/
  artifacts/
  baseline/
  firmware/
  images/
  docker-compose.yml
  docker-compose.prod.yml
  PRODUCT.md
  README.md
```

## Instructor Mapping

Instructor logical structure:

```text
docs/
code/
  frontend/
  backend/
.agent/
test/
```

Project compatibility mapping:

- `docs/` maps directly to `docs/`.
- `frontend/` is logical `code/frontend/`.
- `backend/` is logical `code/backend/`.
- `.agent/` stores project rules and local skill.
- Backend tests live under `backend/test/`.
- Frontend E2E scripts currently live under `frontend/`.

Do not move `frontend/` or `backend/` just to match the sample tree. Moving
them could break Docker, Prisma, scripts, CI, imports, and test commands.

## Governance Layer

```text
AGENTS.md
.agent/
  PROJECT_RULES.md
  INSTRUCTOR_BASELINE.md
  DEVELOPMENT_WORKFLOW.md
  skills/
    lab-project-compliance/
      SKILL.md
docs/
  srs.md
  convention.md
  PROJECT_STRUCTURE.md
  CURRENT_STATE.md
  DECISIONS.md
  FRONTEND_GUIDELINE.md
  BACKEND_GUIDELINE.md
  DB-erd/
  UI-UX-style-guideline/
  backlogs/
```

## Frontend Current And Target

Current frontend is a React/Vite app under `frontend/src`. It currently has
`assets`, `components`, `hooks`, `api.js`, `App.jsx`, `constants.js`, `i18n.js`,
`main.jsx`, `monitoring.js`, `styles.css`, and utility modules.

Target logical structure is gradual:

```text
src/
  assets/
  pages/
  components/
    base/
    features/
  routes/
  layouts/
  lib/
  hooks/
  store/
  types/
  styles/
  providers/
  schemas/
  services/
  utils/
  constants/
```

Use touched-module migration. Do not perform a big-bang restructure.

## Backend Current And Target

Current backend is an Express/Prisma API under `backend/src` with:

```text
assistant/
constants/
middleware/
routes/
services/
utils/
app.js
config.js
db.js
metrics.js
server.js
```

Target logical flow:

route -> middleware -> service -> Prisma/database

Keep Prisma schema and migrations under `backend/prisma`.

## Documentation Inventory

Key existing evidence:

- `PRODUCT.md`
- `docs/PROJECT_DIRECTION.md`
- `docs/ASSIGNMENT_GAP_ANALYSIS.md`
- `docs/BATCH0_BASELINE.md`
- `docs/BATCH1E_CUTOVER_REPORT.md`
- `docs/BATCH2_AUTH_RBAC_REPORT.md`
- `docs/BATCH3_RESOURCE_MANAGEMENT_REPORT.md`
- `docs/CURRENT_STATE.md`
- `docs/DECISIONS.md`
- `docs/security/threat-model.md`
- `docs/instructor/`

Future Batch reports should remain in `docs/` and state explicit boundaries.
