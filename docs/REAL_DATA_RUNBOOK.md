# Real Data Runbook

## What Counts As Real Data

The production system should use:

- Real user accounts created by an admin.
- Official resource inventory from the lab: asset code, device name, type, location, owner team, capacity and specs.
- Real booking requests created by students, lecturers or lab staff.
- Real telemetry sent by the system agent or Prometheus exporters.

## First Deployment

The project does not create inventory, bookings or user examples automatically. Deployment uses:

```bash
npm run db:deploy
```

This runs migrations, applies the booking overlap guard and creates the first admin only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured.

For an AI lab baseline, import `data/ai-lab-inventory.realistic.csv`, then replace asset codes, room names and owner teams with the official inventory before production use.

## Local Verification Startup

For a local smoke test with the bundled AI lab inventory:

```powershell
docker compose up -d postgres

cd backend
$env:DATABASE_URL="postgresql://lab_user:lab_password@localhost:5432/lab_resources"
$env:ADMIN_EMAIL="ops-admin@phong-thi-nghiem.local"
$env:ADMIN_PASSWORD="StrongPassword1234"
$env:ADMIN_FULL_NAME="Lab Operations Admin"
npm run db:deploy
npm run import:resources -- ../data/ai-lab-inventory.realistic.csv
npm start
```

In another terminal:

```powershell
cd frontend
$env:VITE_API_BASE_URL="http://localhost:8000"
npm run build
python -m http.server 5173 --bind 127.0.0.1 -d dist
```

Open `http://127.0.0.1:5173` and sign in with the admin account above.

## Input And Output Data Contract

- Resource codes are normalized to uppercase asset-code format before being stored or queried.
- Technical specs are normalized from CSV/UI input into typed values when possible, such as numbers and booleans.
- Telemetry percent values are validated within `0..100`; temperature values are validated before storage.
- API responses serialize dates as ISO strings and include `operational.state`, `operational.score`, `operational.reasons`, and `latestTelemetry` for resource views.
- Assistant and MCP answers use the same serialized tool results, so UI, REST, and connected AI clients audit the same data.

## CSV Columns

| Column | Required | Notes |
| --- | --- | --- |
| `code` | Yes | Official asset code |
| `name` | Yes | Official resource name |
| `type` | Yes | `gpu_server`, `room`, `raspberry_pi`, `uav`, `camera`, `kit`, `material` |
| `location` | Yes | Lab location or storage location |
| `status` | Yes | `available`, `maintenance`, `offline` |
| `ownerTeam` | Yes | Team responsible for the resource |
| `capacity` | Yes | Positive integer |
| `requiresApproval` | Yes | `true` or `false` |
| `specs` | No | Key-value pairs separated by semicolons, for example `gpuWarningPercent=85;temperatureCriticalC=85` |

## Verification Checklist

- Admin can log in.
- Real users are created from the Users tab.
- Real resources are visible after CSV import or manual entry.
- A requester can create a booking but cannot approve, hand over, or receive back their own booking.
- A different admin or lab staff account approves the booking, records handover condition within 30 minutes before the start time, and records return condition after use.
- Pending or approved bookings can be cancelled by the requester or lab staff; checked-out bookings must be returned instead.
- Creating an overlapping booking returns HTTP `409`.
- `/metrics` returns Prometheus metrics.
- Agent telemetry updates the target resource.
- The assistant answers operations questions from system data and non-lab questions from cited external knowledge.
