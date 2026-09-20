# Production Deployment

The canonical production stack is:

- React/Vite static frontend served by Nginx;
- Node.js/Express API;
- PostgreSQL 16;
- Prometheus;
- Node Exporter.

REQUIRED CORE production behavior must remain database-backed and must not fall back to demo/mock data.

## 1. Prepare the host

Install Docker + Docker Compose, then copy/clone the repository:

```bash
cd lab-resource-manager
cp .env.production.example .env.production
```

Edit `.env.production` before startup.

Required production values include:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD` — strong secret
- `JWT_SECRET` — at least 32 characters, not an example value
- `TELEMETRY_API_KEY` — at least 32 characters, distinct from JWT secret
- `ADMIN_EMAIL` — valid first-admin email
- `ADMIN_PASSWORD` — at least 12 characters, not an example value
- `ADMIN_FULL_NAME`
- `CORS_ORIGINS` — explicit allowed application origin(s), never `*`

Recommended/defaulted:

- `JSON_BODY_LIMIT=1mb`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=180`
- `REMINDER_SCHEDULER_ENABLED=true`
- `BOOKING_UPCOMING_REMINDER_MINUTES=60`
- `RETURN_REMINDER_MINUTES=15`
- `LOG_FORMAT=combined`
- `VITE_ENABLE_RESEARCH_FEATURES=false`

The production backend refuses to boot when critical production configuration is invalid.

## 2. Validate before startup

Validate Compose interpolation:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

The repository CI also verifies the production configuration contract through:

```bash
cd backend
npm run verify:prod-config
```

Never commit the real `.env.production` file.

## 3. Deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The backend production container runs:

```text
canonical migration deployment bridge
-> Prisma migration status verification
-> canonical first-admin seed
-> start API
```

The bridge exists because the verified Batch 1 reconciliation migration contains
checksum preconditions captured from the original Windows workspace, while the
repository can materialize those older migration files with different byte
checksums on another platform. It:

1. deploys the immutable predecessor migrations through Prisma;
2. creates an ephemeral copy of the verified reconciliation SQL with only the
   known checksum-precondition literals translated to the checksums Prisma
   actually recorded;
3. executes that verified reconciliation body;
4. records the reconciliation through `prisma migrate resolve --applied`;
5. resumes normal `prisma migrate deploy`.

Tracked historical migration SQL is never edited and `_prisma_migrations` is
never edited manually.

It does not run `prisma db push`.

## 4. Verify runtime

Inspect services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Through the frontend/Nginx entry point:

```bash
curl -f http://SERVER/health
curl -f http://SERVER/api/health/ready
```

Expected readiness includes a live PostgreSQL query.

For a real domain, terminate TLS/HTTPS in the approved reverse proxy/load balancer and configure:

```text
CORS_ORIGINS=https://real-domain.example
```

Do not use wildcard CORS to make the browser work.

## 5. First administrator

The first administrator is created/upserted from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`

The persisted role is exactly:

`ADMIN`

After login, use the canonical user administration UI/API for ordinary project users and LAB_STAFF assignments.

Public registration remains STUDENT-only and cannot request privileged roles.

## 6. Physical site topology and resource onboarding

The canonical resource model requires a laboratory.

Production must use an approved real site/topology onboarding process before resources are created. Do not fabricate campus/lab records in normal production startup.

The Batch 7 graduation-demo bootstrap:

`npm run demo:seed-infrastructure`

is explicitly demo-only. It fails unless:

- `DEMO_MODE=true`;
- the database name contains `_demo`;
- the database host is local/Compose.

It must not be used to seed fake production inventory.

After the laboratory exists, resources are created through the canonical resource API/UI.

### Legacy CSV importer

`backend/scripts/importResources.js` and old inventory CSV files belong to the earlier resource schema and are not the canonical production onboarding path until explicitly reconciled.

Do not run the legacy importer against production merely because the file exists.

## 7. Research/optional features

Default production/demo:

```text
VITE_ENABLE_RESEARCH_FEATURES=false
```

This keeps optional/research surfaces outside the default graduation workflow, including examples such as:

- payment/VietQR demonstrations;
- fake QR/door/SSH flows;
- static AI analytics/advisory;
- Digital Twin;
- Pareto/GA/NSGA-II;
- what-if simulation;
- optimization/orchestration;
- fake audit/policy screens.

Research source can remain in the repository for later approved work, but it is not REQUIRED CORE production functionality.

## 8. Telemetry

Batch 6 accepts authenticated telemetry only.

Telemetry ingestion must use the configured service credential and real resource/laboratory identity.

Missing telemetry is `NO_DATA`, not healthy.

Sensor/camera/MQTT integration belongs to the later Smart Laboratory Monitoring extension and must not be represented as production-ready before verification.

## 9. Backup and restore

Create a backup before approved schema migration, major data import, or production change:

```bash
sh ops/backup-postgres.sh
```

Windows:

```powershell
.\ops\backup-postgres.ps1
```

Restore only after validating the backup and stopping application traffic:

```bash
CONFIRM_RESTORE=yes sh ops/restore-postgres.sh backups/lab_resources-YYYYMMDD-HHMMSS.dump
```

Windows:

```powershell
.\ops\restore-postgres.ps1 -BackupFile backups\lab_resources-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

Never edit `_prisma_migrations` manually to force a deployment.

## 10. Production release checks

Before a graduation-demo or production release, verify:

Backend:

```bash
cd backend
npm run lint
npm run verify:prod-config
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Then run the approved Batch regression/full-stack workflows and the official graduation demo gate.

The exact graduation scenario is documented in:

`docs/GRADUATION_DEMO_RUNBOOK.md`

A build alone is not sufficient evidence of production readiness.
