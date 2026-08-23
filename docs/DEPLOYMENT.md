# Production Deployment

This project is deployable as a Docker Compose application. The production stack runs:

- React static frontend through Nginx
- Node.js/Express API
- PostgreSQL
- Prometheus
- Node Exporter

## 1. Prepare The Server

Install Docker and Docker Compose on the target VPS or lab server, then copy the project folder to the server.

```bash
cd lab-resource-manager
cp .env.production.example .env.production
```

Edit `.env.production` with real secrets and the real domain:

- `POSTGRES_PASSWORD`: long random password
- `JWT_SECRET`: at least 32 random characters
- `TELEMETRY_API_KEY`: at least 32 random characters
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`: first real administrator
- `CORS_ORIGINS`: production origin, for example `https://lab.example.edu.vn`
- `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `JSON_BODY_LIMIT`: keep defaults unless the deployment has a measured need to change them

## 2. Deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Open:

- App: `http://SERVER_IP` or your configured domain
- Prometheus: `http://SERVER_IP:9090`

Verify the stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -f http://SERVER_IP/health
curl -f http://SERVER_IP/api/health/ready
```

The backend validates production configuration at startup. It will refuse to boot if required secrets are missing, still using example values, or too short.

## 3. Import Real Resource Data

Do not edit the database manually for the first inventory. Prepare a CSV using:

```text
data/resource-inventory.template.csv
```

Then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run import:resources -- /app/data/resource-inventory.csv
```

If the CSV is on the host, copy it into the backend container first:

```bash
docker cp resource-inventory.csv $(docker compose -f docker-compose.prod.yml ps -q backend):/app/data/resource-inventory.csv
```

## 4. Backup And Restore

Create a database backup before each deploy, CSV import, or schema migration:

```bash
sh ops/backup-postgres.sh
```

On Windows administration machines:

```powershell
.\ops\backup-postgres.ps1
```

Restore only after verifying the backup file and stopping application traffic:

```bash
CONFIRM_RESTORE=yes sh ops/restore-postgres.sh backups/lab_resources-YYYYMMDD-HHMMSS.dump
```

```powershell
.\ops\restore-postgres.ps1 -BackupFile backups\lab_resources-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

## 5. Run Real Telemetry Agent

Install Node.js 22 on each monitored machine, copy `backend/agents/systemMetricsAgent.js`, and run:

```bash
LRM_API_BASE_URL=https://lab.example.edu.vn/api \
LRM_TELEMETRY_API_KEY=replace-with-real-key \
LRM_RESOURCE_CODE=GPU-SERVER-CODE \
node systemMetricsAgent.js
```

The agent reads CPU/RAM from the operating system. If `nvidia-smi` exists, it also sends GPU utilization, GPU memory and GPU temperature.

## 6. Production Notes

- Deployment does not create resource inventory, bookings or extra users automatically.
- Production creates only the admin account configured in `.env.production`.
- The interface does not expose preset accounts or prefilled booking data.
- Booking overlap is protected in API logic and PostgreSQL exclusion constraint.
- Backend and frontend containers expose Docker healthchecks.
- Nginx proxies `/api/*` to the backend and keeps SPA navigation behind `/`.
- Keep `.env.production` out of git.
- Use HTTPS in front of Nginx for public access.
