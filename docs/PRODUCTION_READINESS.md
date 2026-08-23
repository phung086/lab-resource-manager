# Production Readiness Checklist

Use this checklist before handing the system to lab operations.

## Access

- First admin is created from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_FULL_NAME`.
- The admin password has been changed after first sign-in.
- Staff, lecturer, and student accounts are created from the Users screen.
- Inactive accounts are locked instead of deleted when audit history must be preserved.

## Inventory

- Resource CSV uses official asset codes, official names, real locations, responsible owner teams, and real capacity.
- GPU, RAM, temperature, and stale telemetry thresholds are stored in `specs` when they differ from defaults.
- Maintenance/offline resources are marked before users start booking.

## Booking Operations

- Staff has tested create, approve, reject, checkout, and check-in flows.
- Requesters cannot approve, hand over, or receive back their own bookings.
- Approved bookings cannot be handed over earlier than 30 minutes before the usage window.
- Cancel is tested for pending and approved bookings; checked-out bookings are completed through check-in.
- Overlapping approved/checked-out bookings return a conflict.
- Handover and return conditions are recorded for accountable resources.

## Data And Database

- `docker compose --env-file .env.production -f docker-compose.prod.yml ps` shows healthy containers.
- A backup has been created with `ops/backup-postgres.sh` or `ops/backup-postgres.ps1`.
- Restore has been tested on a non-production database before the first real operating day.
- `.env.production` is stored outside git and restricted to operators.

## Monitoring

- `/api/health/ready` returns database connected.
- `/api/metrics` is scraped by Prometheus.
- Telemetry agents use real resource codes and the production `TELEMETRY_API_KEY`.
- Devices without telemetry are reviewed and either connected to an agent or documented as manually monitored.

## AI And MCP

- Assistant answers are verified in Vietnamese and English.
- `POST /mcp` with `tools/list` returns the same read-only operations tools as the in-app assistant.
- OpenAI configuration is optional; without `OPENAI_API_KEY` and `OPENAI_MODEL`, the local analyzer remains available.
- Non-lab questions return cited external knowledge and do not affect scheduling or inventory decisions.
- `search_external_knowledge` is verified separately from operational MCP tools.
- AI responses are checked through `dataQuality` and tool results when decisions affect scheduling.

## Security

- `JWT_SECRET` and `TELEMETRY_API_KEY` are at least 32 random characters.
- `CORS_ORIGINS` contains only real production origins.
- HTTPS terminates in front of Nginx for external access.
- Prometheus is restricted to the lab network or an authenticated operations network.
