# Graduation Demo Runbook

Status: Batch 7 REQUIRED CORE release scenario  
Timezone: Asia/Ho_Chi_Minh (UTC+07:00)  
Research features: OFF

This runbook proves the official graduation assignment through one deterministic end-to-end workflow. It must use real API/database behavior and must not rely on mock/fake success.

## 1. Preconditions

Use the canonical stack:

- React/Vite frontend;
- Express backend;
- Prisma 6;
- PostgreSQL 16.

Required environment:

```text
VITE_ENABLE_RESEARCH_FEATURES=false
```

The demo database must be disposable and isolated.

For automated/local graduation-demo bootstrap only:

```text
DEMO_MODE=true
database name contains _demo
database host is localhost / 127.0.0.1 / postgres
```

Never run the demo bootstrap on development/shared/production data.

## 2. Clean Demo Startup

Production-like automated path:

```bash
docker compose --env-file .env.batch7.ci -f docker-compose.prod.yml up -d --build postgres backend frontend
```

Expected:

- frontend/Nginx health is 200;
- `/api/health/ready` is 200 with database `ready`;
- `prisma migrate deploy` completes from clean PostgreSQL;
- canonical first ADMIN exists;
- no fake resource/user/booking is created by normal production startup.

Create only the physical demo topology with the guarded helper:

```bash
docker compose --env-file .env.batch7.ci -f docker-compose.prod.yml exec -T \
  -e DEMO_MODE=true backend npm run demo:seed-infrastructure
```

This creates the isolated demo campus/building/laboratory/policy needed for the official scenario. Users/resources/bookings are still created through canonical APIs/UI.

## 3. Official 10-Step Scenario

### Step 1 — Admin creates users and representative resources

Log in as ADMIN.

Create:

- one STUDENT;
- one LECTURER;
- one LAB_STAFF;
- assign LAB_STAFF to the demo laboratory.

Create one representative resource for each assignment category:

- ROOM;
- EQUIPMENT;
- MACHINE;
- EXPERIMENT_KIT;
- MATERIAL.

Expected:

- all objects persist in PostgreSQL;
- LAB_STAFF assignment persists;
- no lowercase/alias role is introduced;
- resource `operationalStatus` starts from truthful physical state.

### Step 2 — Student/Lecturer inspects resource

As STUDENT or LECTURER:

- open resource catalog/detail;
- inspect current operational status;
- inspect upcoming schedule;
- inspect persisted usage/status history.

Expected:

- no private foreign-user data is exposed;
- status/history comes from database;
- missing history is an honest empty state, not invented rows.

### Step 3 — Calendar booking

Open day/week/month calendar.

Select an available time interval and submit a booking.

Expected:

- selected resource/date/time carries into booking form;
- LabPolicy is enforced server-side;
- approval-required resource creates `PENDING_APPROVAL`;
- booking persists after reload.

### Step 4 — Concurrent conflict proof

Submit two concurrent overlapping requests for the same resource/time interval from different users.

Expected:

- exactly one persists successfully;
- the other returns HTTP 409 `BOOKING_CONFLICT`;
- PostgreSQL overlap protection remains the final authority;
- adjacent half-open intervals remain legal.

### Step 5 — Lab staff approval

As assigned LAB_STAFF:

- open booking operations;
- approve the pending request.

Expected:

`PENDING_APPROVAL -> CONFIRMED`

Persist:

- `approvedById`;
- `approvedAt`;
- transition `UsageLog`;
- owner approval notification.

Foreign-lab staff must not be able to approve.

### Step 6 — Owner receives result/reminder

As booking owner:

- open notifications;
- confirm approval result;
- confirm upcoming-booking reminder according to configured scheduling window.

Expected:

- notification belongs only to the booking owner;
- notification is persisted;
- no fake email/SMS delivery claim.

### Step 7 — Handover / check-out

As assigned LAB_STAFF:

- record factual before-use condition;
- confirm handover/check-out.

Expected:

`CONFIRMED -> CHECKED_OUT`

Persist:

- `handoverCondition`;
- `actualStartAt`;
- transition audit;
- eligible resource physical state `AVAILABLE -> IN_USE`.

### Step 8 — Return and completion

As assigned LAB_STAFF:

- record factual after-use condition;
- return the resource;
- complete the booking.

Expected:

`CHECKED_OUT -> RETURNED -> COMPLETED`

Persist:

- `returnCondition`;
- `returnedAt`;
- `actualEndAt`;
- `completedAt`;
- durable transition audit.

If the physical resource has already moved to a serious state such as BROKEN/MAINTENANCE/CALIBRATION/OFFLINE/RETIRED, return must not silently overwrite it with AVAILABLE.

### Step 9 — History/dashboard/resource state

As owner:

- view booking workflow history.

As LAB_STAFF/ADMIN:

- open operational dashboard.

Expected:

- history shows persisted request/approval/handover/return/completion evidence;
- dashboard reads PostgreSQL aggregates;
- resource state reflects real workflow;
- metrics are not hard-coded.

### Step 10 — Incident reporting

As the relevant user:

- report an incident for the resource/booking.

As assigned LAB_STAFF:

- verify the incident appears within staff scope/dashboard.

Expected:

- incident persists;
- reporter/booking/resource linkage is real;
- dashboard open-incident count updates;
- unrelated LAB_STAFF cannot access foreign-lab incident.

## 4. Default Demo Navigation Boundary

With:

`VITE_ENABLE_RESEARCH_FEATURES=false`

the default demo must not present optional/fake features as production core.

Examples that must remain hidden:

- payment/VietQR;
- fake QR door/SSH/Jupyter flow;
- fake AI advisory/analytics;
- fake audit log screen;
- local-only policy screen;
- Digital Twin;
- Pareto/GA/NSGA-II;
- simulation/what-if;
- optimization/orchestration.

Core navigation should emphasize:

- calendar;
- booking workflow;
- resources;
- dashboard/monitoring;
- incidents;
- notifications;
- maintenance/resource management where authorized;
- user administration for ADMIN.

## 5. Automated Gate

Batch 7 provides:

`frontend/test_batch7_graduation_demo_e2e.mjs`

and the production-like GitHub Actions workflow:

`.github/workflows/batch7-graduation-demo.yml`

The automated gate must prove all 10 steps against:

- Docker production images;
- Nginx frontend proxy;
- Express backend;
- clean PostgreSQL 16;
- real Chromium.

Screenshots are supporting evidence only; assertions/API/database state are the source of truth.

## 6. Failure Policy

Any REQUIRED CORE failure means:

`Batch 7 = NO-GO`

Do not relabel a failed core step as optional.

Optional/research test failures are reported separately and must not cause agents to restore retired research code into the required runtime.

## 7. Post-Demo Cleanup

For disposable automated environment:

```bash
docker compose --env-file .env.batch7.ci -f docker-compose.prod.yml down -v --remove-orphans
```

Never use `down -v` against a production deployment containing real PostgreSQL data.

## 8. Release Evidence

Before declaring Batch 7 complete, retain:

- CI PASS;
- Batch 7 backend regression PASS;
- prior Batch 1–6 core regressions PASS;
- production-like 10-step demo PASS;
- frontend lint/typecheck/build PASS;
- production configuration negative/positive checks PASS;
- raw clean `prisma migrate deploy` PASS on Linux/PostgreSQL 16;
- health/readiness/CORS/security headers PASS;
- `docs/BATCH7_PRODUCTION_DEMO_HARDENING_REPORT.md`;
- `docs/BATCH7_WALKTHROUGH.md`.

Batch 8 must not begin automatically.
