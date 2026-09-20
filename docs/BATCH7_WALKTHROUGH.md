# Batch 7 Walkthrough — Reproducible Graduation Demo

Date: 2026-09-21  
Status: **COMPLETE & VERIFIED**

## Production-like startup

1. Copy `.env.production.example` to a private environment file and replace all
   required secrets.
2. Keep `VITE_ENABLE_RESEARCH_FEATURES=false` for the official demo.
3. Validate and start the core stack:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml config
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build postgres backend frontend
   ```

4. Verify all three public health contracts:

   ```bash
   curl -fsS http://127.0.0.1:8080/health
   curl -fsS http://127.0.0.1:8080/api/health
   curl -fsS http://127.0.0.1:8080/api/health/ready
   ```

5. For an isolated demo database whose name contains `_demo`, bootstrap only
   the physical demo infrastructure:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml exec -T \
     -e DEMO_MODE=true backend npm run demo:seed-infrastructure
   ```

The seed refuses non-local/non-Compose hosts and databases without the `_demo`
marker.

## Official 10-step scenario

1. ADMIN creates representative users and resources.
2. A user inspects current resource status, schedule, and persisted history.
3. The user checks the calendar contract and creates a real booking.
4. PostgreSQL rejects a concurrent overlapping booking.
5. Assigned LAB_STAFF approves the request.
6. The owner sees approval and the durable upcoming reminder.
7. Staff records before-use condition and checks the resource out.
8. Staff records after-use condition, returns it, and completes the booking.
9. The owner history and operational dashboard reflect persisted changes.
10. A real incident is persisted and appears in the operational dashboard.

The default UI must not expose optional/fake research surfaces during this
walkthrough.

## Automated walkthrough

From `frontend/`, with the production-like stack running:

```bash
BATCH7_FRONTEND_URL=http://127.0.0.1:8080 \
BATCH7_ADMIN_EMAIL=admin@demo.local \
BATCH7_ADMIN_PASSWORD='replace-with-private-value' \
npm run test:e2e:demo
```

Expected terminal line:

`ALL 10 CORE GRADUATION DEMO STEPS PASSED`

## Verification boundary

The automated scenario is backed by the real API and PostgreSQL. It creates its
own demo users and workflow records. It does not claim success for AI,
optimization, payment, Digital Twin, MQTT, camera, or simulated hardware.

See `docs/BATCH7_PRODUCTION_DEMO_HARDENING_REPORT.md` for the full gate matrix
and migration conclusion.
