# Project Structure

## Lab Resource Manager

| Document field | Value |
|---|---|
| Document ID | LRM-STRUCT-001 |
| Version | 1.1 |
| Status | Current repository map |
| Prepared | 28 September 2026 |

## 1. Purpose

This document explains where the main source code, data, tests, infrastructure, and project records live in the Lab Resource Manager repository. It shows the current layout and distinguishes it from gradual target organization so a reader does not mistake planned folders for existing code.

## 2. Instructor Structure and Project Mapping

The instructor reference presents a logical tree with `docs/`, `code/frontend/`, `code/backend/`, `.agent/`, and `test/`. The repository preserves its existing root-level `frontend/` and `backend/` folders because Docker, Prisma, CI, scripts, imports, and test commands already use those paths.

| Instructor example | Current repository | Mapping |
|---|---|---|
| `docs/` | `docs/` | Direct match |
| `code/frontend/` | `frontend/` | Logical equivalent; not moved |
| `code/backend/` | `backend/` | Logical equivalent; not moved |
| `.agent/` | `.agent/` | Project governance and agent rules |
| `test/` | `backend/test/` and frontend E2E scripts | Tests remain alongside their application |

This mapping satisfies the logical separation in the sample while keeping repository paths stable.

## 3. Current Repository Tree

The tree below highlights maintained source and documentation areas. Build outputs, dependency directories, local logs, screenshots, and generated runtime files are intentionally omitted from this overview because they are not the source-of-truth structure.

```text
lab-resource-manager/
├── .agent/
│   ├── PROJECT_RULES.md
│   ├── INSTRUCTOR_BASELINE.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   └── skills/lab-project-compliance/SKILL.md
├── .github/workflows/                 # Continuous integration and release checks
├── backend/
│   ├── prisma/
│   │   ├── baseline/                  # Reviewed clean-install baseline
│   │   ├── migrations/                # Forward-only Prisma migrations
│   │   └── schema.prisma
│   ├── scripts/                       # Migration, demo, seed, and verification tools
│   ├── src/
│   │   ├── assistant/                 # Supporting assistant endpoints/logic
│   │   ├── constants/
│   │   ├── middleware/                # Authentication, authorization, request controls
│   │   ├── routes/                    # HTTP route definitions
│   │   ├── services/                  # Business logic and transactions
│   │   ├── utils/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── metrics.js
│   │   └── server.js
│   ├── test/                          # Backend unit, integration, and release tests
│   ├── Dockerfile
│   └── package.json
├── data/                              # Inventory templates and example data
├── docs/
│   ├── DB-erd/
│   ├── UI-UX-style-guideline/
│   ├── backlogs/
│   ├── instructor/                    # Instructor reference PDFs
│   ├── security/                      # Threat model and security records
│   ├── srs.md
│   ├── convention.md
│   ├── PROJECT_STRUCTURE.md
│   ├── CURRENT_STATE.md
│   ├── DECISIONS.md
│   ├── FRONTEND_GUIDELINE.md
│   ├── BACKEND_GUIDELINE.md
│   └── BATCH*_*.md                    # Verification and implementation records
├── firmware/                          # Hardware/firmware-related support area
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── research/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── constants.js
│   │   ├── i18n.js
│   │   ├── main.jsx
│   │   └── workspaceRoutes.js
│   ├── test_*.mjs                      # Browser/E2E and workflow verification scripts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── images/                            # Project UI and supporting image records
├── infra/                             # Infrastructure configuration and deployment support
├── ops/                               # Operational scripts and runbooks
├── research/                          # Optional and experimental research material
├── artifacts/                         # Generated review/report deliverables
├── baseline/                          # Baseline data and comparison material
├── docker-compose.yml
├── docker-compose.prod.yml
├── PRODUCT.md
├── README.md
├── AGENTS.md
└── .env.example / .env.production.example
```

## 4. Directory Responsibilities

| Path | Responsibility | Notes |
|---|---|---|
| `frontend/` | React/Vite browser application, UI components, API client, and browser checks | Logical equivalent of instructor `code/frontend/` |
| `backend/` | Express API, Prisma schema/migrations, services, middleware, scripts, and tests | Logical equivalent of instructor `code/backend/` |
| `backend/src/routes/` | HTTP route wiring, request/response boundary | Keep domain transactions in services |
| `backend/src/middleware/` | Authentication, role, ownership, and laboratory-scope checks | Backend is authorization authority |
| `backend/src/services/` | Business rules, orchestration, and transactional persistence | Calls Prisma through explicit services |
| `backend/prisma/` | Canonical persistence schema, baseline, and migration history | Never rewrite applied migration history |
| `backend/test/` | Backend tests for unit, integration, concurrency, and release behavior | Some suites require isolated PostgreSQL/test configuration |
| `docs/` | Requirements, conventions, architecture guidance, decisions, audit and batch evidence | Working documentation and progress evidence |
| `.agent/` | Repository-specific agent rules and development workflow | Does not replace source documentation |
| `data/` | Inventory import templates and example data | Sample data is not evidence of real operations |
| `infra/`, `ops/` | Deployment, local operation, and support material | Follow tracked runbooks for environment-specific work |
| `research/`, `frontend/src/research/` | Optional or experimental capabilities | Not automatically part of required graduation core |
| `firmware/` | Hardware/firmware-related support | Real device validation remains separately evidenced |
| `artifacts/`, `images/`, `baseline/` | Generated deliverables, visual records, or baseline material | Inspect provenance before citing as validation evidence |

## 5. Application Layering

### 5.1 Frontend

The current application uses a feature-oriented layout inside `frontend/src`. A screen/page uses reusable components and frontend services/API wrappers to communicate with the backend. Frontend visibility rules support usability but do not authorize operations.

Instructor target organization includes `pages/`, `components/base/`, `components/features/`, `routes/`, `layouts/`, `lib/`, `hooks/`, `store/`, `types/`, `styles/`, `providers/`, `schemas/`, `services/`, `utils/`, and `constants/`. Migration toward that layout is incremental and applies to touched modules; this target is not a claim that every listed folder currently exists.

### 5.2 Backend

Canonical request flow:

```text
HTTP route -> middleware -> service -> Prisma/database
```

Routes define HTTP shape, middleware checks cross-cutting controls, and services hold business logic and database transactions. Prisma access and authorization decisions remain server-side.

## 6. Technology Placement

| Layer | Technology | Repository location |
|---|---|---|
| Web UI | React 19, Vite 6, JavaScript/TypeScript | `frontend/` |
| API | Node.js, Express 4 | `backend/src/` |
| Persistence | PostgreSQL 16, Prisma 6 | `backend/prisma/`, backend services |
| Authentication/security | JWT, bcryptjs, Helmet, CORS, Zod and related middleware | `backend/` |
| Browser checks | Playwright Core with Node scripts | `frontend/test_*.mjs` and CI workflows |
| Backend checks | Node test runner, Supertest, ESLint | `backend/test/`, package scripts |
| Local/deployment runtime | Docker Compose, container definitions, GitHub Actions | Root, `frontend/`, `backend/`, `.github/workflows/` |

Versions are declared in the package manifests and deployment files; update this table when those sources change. Optional integrations such as SMTP, VNPAY, S3-compatible storage, telemetry, and AI depend on explicit environment configuration.

## 7. Current Layout and Gradual Target

The repository has a working, layered structure, but it contains accumulated test scripts, screenshots, audit records, and optional research code. Those materials are not all runtime modules. Future cleanup should move or regroup only within an explicitly approved task and should preserve paths used by CI, Docker, Prisma, and local workflows.

No physical move from `frontend/` and `backend/` to `code/frontend/` and `code/backend/` is required for the instructor mapping. No big-bang restructure is planned.

## 8. Source of Truth

- Requirements: `docs/srs.md` and `PRODUCT.md`.
- Conventions and architecture rules: `docs/convention.md`, frontend/backend guidelines, and `.agent/` governance files.
- Data model and migrations: `backend/prisma/schema.prisma` and tracked migrations.
- Verified implementation status: `docs/CURRENT_STATE.md` and the latest applicable verification reports.
- Actual folder inventory: tracked files in the repository at the report date. Runtime outputs and ignored local files may differ between developer machines.

## 9. Local LAB workspace continuation

- `backend/src/routes/labWorkspace.js` and `services/labWorkspaceService.js`:
  material stock ledger and course-group academic supervision.
- `backend/prisma/migrations/20260928000100_lab_workspace/`: forward schema
  migration for the persisted workspace models.
- `backend/test/labWorkspace.integration.test.js`: isolated database integration
  scenarios, guarded by `LAB_WORKSPACE_TEST_URL`.
- `frontend/src/providers/LocaleProvider.tsx` and `locales/`: shared presentation
  locale and core interface/workspace error translations.
- `frontend/src/pages/LabWorkspace.tsx`, `MaintenancePage.tsx`: scoped operational
  pages; `components/ResourceGallery.tsx`: resource media presentation.
- `frontend/test_lab_workspace_e2e.mjs`: local demo browser checks with
  `UX_DEMO_PASSWORD`, optional `UX_FRONTEND_URL` and `UX_API_URL`.
- `docs/LAB_WORKSPACE_EXPERIENCE_REPORT_20260929.md`: current local scope and limits.
