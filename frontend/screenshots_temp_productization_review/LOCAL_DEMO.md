# Local demo — human review

Database: `lab_resources_local_demo`, PostgreSQL 16. Separate from all Batch and payment integration databases. Current local instance: Docker container `lrm-transform-tests-20260922`, localhost port `15436`.

## Accounts

All four local-only accounts use password **LabDemo!2026Pass**. This is demo data, not a production credential or production default.

| Email | Role | Full name |
|---|---|---|
| admin@lrm.local | ADMIN | LRM Demo Administrator |
| staff@lrm.local | LAB_STAFF | LRM Demo Lab Staff |
| lecturer@lrm.local | LECTURER | LRM Demo Lecturer |
| student@lrm.local | STUDENT | LRM Demo Student |

Staff is assigned to both demo LABs. The topology has one campus, one building, two labs with explicit booking policies and eleven resources (2 ROOM, 3 EQUIPMENT, 2 MACHINE, 2 EXPERIMENT_KIT, 2 MATERIAL). Resource descriptions and specs identify LOCAL DEMO. Calibration, maintenance and offline states are illustrative configurations, not hardware evidence.

## Start

Install existing backend/frontend dependencies with `npm ci` if necessary. Ensure PostgreSQL is running and create the database once using your local PostgreSQL administrator. Do not use `prisma db push`.

From the repository's `backend` folder in PowerShell:

```powershell
$env:DEMO_MODE = 'true'
# Supply your local PostgreSQL connection, targeting this exact database.
$env:DATABASE_URL = 'postgresql://YOUR_LOCAL_USER:YOUR_LOCAL_PASSWORD@127.0.0.1:15436/lab_resources_local_demo'
npm run demo:local
```

The launcher applies existing migrations, runs the guarded idempotent seed and starts API `15004` and UI `15179`. Open [the local demo](http://127.0.0.1:15179). Ctrl+C stops both. Optional overrides: `LOCAL_DEMO_API_PORT`, `LOCAL_DEMO_UI_PORT`. Do not start a second launcher while these ports are occupied. Session tokens reset on launcher restart because its JWT signing secret is generated per run.

The launcher accepts only `DEMO_MODE=true`, the exact database name and local hosts `localhost`, `127.0.0.1`, or compose hostname `postgres`. It refuses production mode. Seed does not delete, reset or overwrite existing rows; existing account names/roles that conflict cause an error. Existing password changes remain unchanged on repeat seed. It never seeds bookings, payments, incidents, telemetry, camera, audit or operational history. Seed was verified twice before workflow execution without row duplication.

## Review flow

1. Public landing → Đăng nhập. Login form is the anchored `#dang-nhap` section; registration has its own screen and a return link.
2. Student: browse ROOM resources, open calendar or ask Trợ lý Lab for a free slot, open the canonical booking form and submit a purpose/title. The local review already created one real `PENDING_APPROVAL` booking via this UI; its ID is in `local_demo_booking.json`.
3. Staff: open Vận Hành Booking, approve and follow real handover/return steps. No synthetic history is inserted.
4. Admin: inspect users and lab assignments, resource administration, monitoring source state and optional payments.
5. For payment, admin explicitly creates a charge for a booking. The booking owner can choose a configured provider. No automatic fee is invented by booking.

## Optional payment / assistant

Local demo exposes these UI features, but no provider credentials are supplied by the seed or launcher. Configure sandbox merchant settings through local environment only: `VNPAY_ENABLED`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`. IPN must be reachable by VNPAY for a real sandbox round trip. Browser Return alone never marks success.

VietQR uses configured bank/account details and remains pending without verified reconciliation. Do not use a real recipient for experimentation unless you intend a real transfer. OpenAI is optional; missing model credentials uses local grounded MCP lookups and still respects actor scope. Hardware and cameras remain unconnected; no live monitoring is claimed.

Payment success/receipt screenshots in this directory come from the separate automated payment integration database with signed test IPN fixtures. They are NOT a real VNPAY merchant sandbox transaction and NOT manual demo records.
