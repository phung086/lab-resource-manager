# Production Deployment

The canonical production stack is:

- React/Vite static frontend served by Nginx;
- Node.js/Express API;
- PostgreSQL 16;
- optional Prometheus and Node Exporter under the `observability` profile.

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
- `LRM_LOG_FORMAT=combined` (Compose maps this namespaced value to backend
  `LOG_FORMAT`; this avoids accidental host-environment collisions)
- `VITE_ENABLE_RESEARCH_FEATURES=false`

Optional backend integrations are disabled or unavailable until their complete
configuration is supplied:

- Email and guest OTP: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  and `EMAIL_FROM`. Guest OTP fails closed when SMTP is unavailable; production
  never reports a development/test email transport as successful.
- Booking-linked VNPAY: keep `PAYMENTS_ENABLED=false` and
  `VNPAY_ENABLED=false` unless the approved merchant configuration is ready.
  When enabled, set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`,
  `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, and
  `PAYMENT_APP_URL`. Startup validation rejects incomplete or insecure values.
- Resource media upload: set `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`,
  `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`,
  `MEDIA_S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_BASE_URL`. Restrict
  `MEDIA_EXTERNAL_HOSTS` to approved HTTPS image hosts.

The production backend refuses to boot when critical production configuration is invalid.

Telemetry devices do not share an environment secret. Provision a source as an
administrator, copy its one-time credential to the device, and rotate it if it
is exposed. Only the derived credential hash is persisted.

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
Canonical migration deployment (`npm run db:migrate`)
-> Prisma migration status verification
-> canonical first-admin seed
-> start API
```

The canonical migration command verifies immutable baseline artifacts and then
classifies the database before it changes migration state:

- a completely empty PostgreSQL database receives the reviewed baseline in
  `backend/prisma/baseline/20260924000100_clean_baseline`, then the included
  historical migrations are recorded with Prisma's official `migrate resolve`;
- a clean baseline whose SQL and marker completed may resume an interrupted
  resolve only after its complete PostgreSQL catalog fingerprint matches;
- an existing database is accepted only when its finished, non-rolled-back
  Prisma migration rows form a canonical repository prefix beginning at the
  accepted project origin. It keeps that lineage and receives only pending
  forward migrations.

Relevant public tables, partitioned tables, views, materialized views,
sequences, enum/domain types, and public functions make a database non-empty.
Foreign, empty, failed, rolled-back, duplicated, or out-of-order Prisma history
fails closed. A marker alone never authorizes resolve.

The baseline directory contains frozen SQL and Prisma schema snapshots plus a
manifest that hashes those artifacts and every represented historical
migration using normalized UTF-8/LF text. The live `schema.prisma` may evolve
through later forward migrations without changing the old baseline. A new
baseline requires a new ID and directory.

The resume boundary is exact: automatic resume applies only after baseline SQL
and its final marker completed. If baseline SQL itself is interrupted, recreate
that initially empty database and rerun deployment. Do not attempt to repair or
resolve it in place. Tracked historical migration SQL is never edited,
`_prisma_migrations` is never edited manually, and production does not run
`prisma db push`.

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

## 7. Optional integrations and research features

Default production/demo:

```text
VITE_ENABLE_RESEARCH_FEATURES=false
```

This keeps research surfaces outside the default graduation workflow, including examples such as:

- legacy payment/VietQR demonstrations that are not part of the approved
  booking-linked VNPAY lifecycle;
- fake QR/door/SSH flows;
- static AI analytics/advisory;
- Digital Twin;
- Pareto/GA/NSGA-II;
- what-if simulation;
- optimization/orchestration;
- fake audit/policy screens.

Research source can remain in the repository for later approved work, but it is not REQUIRED CORE production functionality.

The approved VNPAY lifecycle is a separate optional product extension. It
remains disabled by default and becomes available only when both payment flags
and the validated merchant configuration described in section 1 are present.

## 8. Telemetry

### Protected metrics and optional observability

The production API runs as `node` (UID 1000), with a writable `/app/data` created
in the image. Bind mounts must grant this user appropriate permissions. The
canonical migration/first-admin startup remains mandatory; do not use
`prisma db push` to work around permissions or migration errors.

Production `/metrics` returns 503 unless `METRICS_TOKEN` is configured. When
configured it requires `Authorization: Bearer <token>`; missing/wrong values
return 401. Query parameters never authorize scraping. Keep tokens out of URLs,
screenshots and logs. Development retains public local scraping unless the same
token is explicitly configured.

To enable observability on the deployment host:

1. Generate a cryptographically random token of 32–256 non-whitespace characters
   (for example 32 random bytes encoded as hex). Set `METRICS_TOKEN` in private
   `.env.production`; do not reuse JWT/provider credentials.
2. Save exactly that token in a protected file, e.g. `.secrets/metrics-token`.
   This directory is Git-ignored. Set `METRICS_TOKEN_FILE` to its path. Avoid a
   BOM or extra whitespace; restrict host access while allowing the Prometheus
   container user to read the file. Compose's file-backed secret does not itself
   encrypt the host file.
3. Verify configuration, then activate the optional services explicitly:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability config --quiet
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability up -d --build
   ```

Prometheus reads `/run/secrets/metrics_token` and scrapes `backend:8000`. Its host
UI binds `127.0.0.1:${PROMETHEUS_PORT:-9090}`; use the host or an approved secure
tunnel. Node Exporter uses Linux host mounts; native Windows host coverage is not
certified. Without the profile, ordinary production startup runs application/DB
only. Rotate file and backend environment together, recreate backend and
reload/recreate Prometheus, then confirm the target is UP without exposing secrets.

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
