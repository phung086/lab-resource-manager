# Cấu trúc dự án

## Ánh xạ với hướng dẫn giảng viên

Hai PDF gốc nằm trong `instructor/`. Giữ SRS/use case, convention, backlog,
ERD, UI/UX, quy tắc agent, source và kiểm thử trong cùng repository.

| Ví dụ giảng viên | Dự án hiện tại |
|---|---|
| docs/ | docs/ |
| code/frontend/ | frontend/ (React/Vite) |
| code/backend/ | backend/ (Express/Prisma) |
| .agent/ | .agent/ và AGENTS.md; .claude/ bổ sung cấu hình công cụ local |
| test/ | backend/test/ và frontend/test_*.mjs, test-utils/ |

Đây là ánh xạ đã được chấp thuận. Không chuyển toàn bộ thư mục hoặc framework
vì đường dẫn Docker, migrations, CI, imports và scripts đang dùng bố cục này.

## Các thư mục được duy trì

```text
lab-resource-manager/
├── .agent/                 # Project rules, instructor baseline, workflow
├── .claude/                # Tool setup and local workflows
├── .github/workflows/      # Core CI, integration and release gates
├── backend/
│   ├── src/                # routes → middleware/services → Prisma
│   ├── prisma/             # schema, immutable baseline and forward migrations
│   ├── scripts/            # deploy, controlled seed/import, checks and demo preview
│   └── test/               # Unit/integration tests and isolated DB helpers
├── frontend/
│   ├── src/
│   │   ├── assets/         # Runtime images and provenance
│   │   ├── pages/          # Role pages and business destinations
│   │   ├── components/     # Shared/base/features; touched-module migration
│   │   ├── services/       # Business API wrappers
│   │   ├── hooks/, providers/, types/, utils/, config/
│   │   ├── locales/        # Canonical VI/EN catalogs and integrity metadata
│   │   ├── styles/         # Shared system and surface layouts
│   │   └── App.jsx, main.jsx
│   ├── public/             # Favicon, robots and static entry assets
│   ├── scripts/            # Local launcher and locale checks
│   └── test_*.mjs, test-utils/
├── docs/                   # Maintained contracts, guides, context, ERD and backlog
├── data/                   # Resource import template and labelled demo inventory
├── infra/prometheus/       # Metrics scrape configuration
├── firmware/               # Optional real telemetry adapter
├── ops/                    # Backup/restore and reviewed project cleanup tools
├── AGENTS.md, CLAUDE.md     # Agent entry points
├── PRODUCT.md               # Product contracts; design chosen for the current task
└── docker-compose*.yml     # Local, development and production profiles
```

`node_modules`, dist, logs, screenshots and run packets are generated output.
Dependencies/runtime assets/configuration are kept to keep the project runnable.
The one-time cleanup allowlist targets obsolete output and retired modules,
not these maintained areas. All reviewed targets were removed on 2026-10-07;
see CURRENT_STATE for verification and remaining product limitations.

## Boundaries

Frontend: page/view → feature/base component → service/API wrapper → API.
Backend: route → middleware/service → Prisma. Authorization and business
transactions stay on the backend; hiding a route never grants or denies authority.
Prisma schema/migrations remain the persistence source; root SQL dumps are not
an alternate schema. Do not create empty directories just to imitate a template.

Refer to [SRS](srs.md), [convention](convention.md),
[frontend](FRONTEND_GUIDELINE.md), [backend](BACKEND_GUIDELINE.md),
[ERD](DB-erd/core-erd.md) and [current state](CURRENT_STATE.md).

## Ngữ cảnh agent theo phạm vi

[CONTEXT_MAP](../.agent/CONTEXT_MAP.md) chọn điểm vào
[FE](../frontend/AGENTS.md) hoặc [BE](../backend/AGENTS.md). Root CLAUDE nhập
AGENTS; frontend/backend CLAUDE nhập area guide khi đọc trong vùng. Đây là tách
ngữ cảnh, không chuyển source hoặc tạo repo/runtime riêng. `.claude/settings.json`
giữ token settings; skills `/lab-task`, `/lab-handoff` chỉ nạp khi gọi. Cách dùng,
audit và nguồn đã lọc ở [.claude/WORKFLOW.md](../.claude/WORKFLOW.md).
