# Batch 6 Walkthrough — Notifications, Incidents, Dashboard & Real Telemetry

Date: 2026-09-20  
Canonical repository: `phung086/lab-resource-manager`  
Status: **COMPLETE & VERIFIED**

This document is the handoff entry point for future Codex/Antigravity sessions that pull the repository without chat history.

## 1. Mandatory Context

Read in order:

1. `AGENTS.md`
2. `.agent/PROJECT_RULES.md`
3. `.agent/INSTRUCTOR_BASELINE.md`
4. `.agent/DEVELOPMENT_WORKFLOW.md`
5. `docs/srs.md`
6. `PRODUCT.md`
7. `docs/CURRENT_STATE.md`
8. `docs/DECISIONS.md`
9. `docs/BATCH5_WALKTHROUGH.md`
10. `docs/BATCH6_NOTIFICATIONS_INCIDENTS_DASHBOARD_REPORT.md`
11. relevant source/tests

Preserve React/Vite + Express + Prisma + PostgreSQL 16. Do not redesign architecture.

## 2. What Batch 5 Handed Into Batch 6

Batch 5 already completed:

- approval/rejection;
- handover/check-out;
- condition-before;
- return;
- condition-after;
- completion;
- booking history;
- approval/rejection notifications;
- physical resource-state synchronization.

Do not rewrite those contracts.

## 3. What Batch 6 Added

### Notifications

- persistent upcoming-booking reminder;
- persistent return reminder;
- strict user ownership;
- due-reminder dispatcher;
- read-one/read-all;
- reminder cancellation when obsolete.

Primary files:

- `backend/src/services/notificationService.js`
- `backend/src/routes/notifications.js`
- `frontend/src/components/NotificationCenter.jsx`

### Incidents

Persisted workflow:

`reported -> triaged/assigned -> investigating -> resolved`

Primary files:

- `backend/src/services/incidentService.js`
- `backend/src/routes/incidents.js`
- `frontend/src/pages/incidents/IncidentsPage.tsx`
- `frontend/src/components/features/incidents/IncidentManagementView.tsx`
- `frontend/src/services/incidents.ts`
- `frontend/src/types/incident.ts`

Authorization:

- ordinary user: own reported incidents;
- LAB_STAFF: assigned laboratories only;
- ADMIN: global.

### Dashboard

Real PostgreSQL aggregates replace hard-coded operational KPIs.

Primary files:

- `backend/src/services/dashboardService.js`
- `backend/src/routes/dashboard.js`
- `frontend/src/pages/monitoring/MonitoringDashboardPage.tsx`

Dashboard includes resource status, booking counts/utilization, incidents, unread notifications and telemetry state summary.

### Real Telemetry

Minimal accepted contract:

`labId, resourceId, source, timestamp, temperatureC, humidityPercent, online`

Primary files:

- `backend/src/services/telemetryService.js`
- `backend/src/routes/telemetry.js`
- `frontend/src/components/features/monitoring/TelemetryStatusGrid.tsx`
- `frontend/src/services/monitoring.ts`
- `frontend/src/types/telemetry.ts`

Ingestion must validate authorization, resource/lab ownership, source, timestamp and numeric ranges.

## 4. Deterministic Telemetry State Contract

These names are authoritative for Batch 6:

- `HEALTHY`
- `WARNING`
- `STALE`
- `UNAVAILABLE`
- `NO_DATA`

Meaning:

- NO_DATA = no accepted persisted sample;
- UNAVAILABLE = latest accepted sample explicitly says offline;
- STALE = latest accepted sample exceeds freshness threshold;
- WARNING = fresh threshold violation or verified warning signal;
- HEALTHY = fresh + online + within thresholds + no verified warning signal.

Never map missing telemetry to HEALTHY.

Never present unverified safety/event signals as facts.

## 5. Security / Scope

Backend remains authoritative.

- LAB_STAFF scope comes from `UserLabAssignment`.
- ADMIN is global.
- Students/lecturers cannot read staff dashboard/telemetry endpoints.
- Incident reporters cannot inspect unrelated user incidents.
- Telemetry ingestion requires the configured service credential and still validates lab/resource ownership.

Frontend visibility is UX only, not authorization.

## 6. Testing

Batch 6 backend integration:

- `backend/test/batch6.notifications-incidents-dashboard.integration.test.js`
- `npm run test:batch6`

Batch 6 frontend E2E:

- `frontend/test_batch6_monitoring_e2e.mjs`
- `npm run test:e2e:monitoring`

CI workflows:

- `.github/workflows/batch6-regression.yml`
- `.github/workflows/batch6-fullstack-e2e.yml`

Latest verified Batch 6 gates:

- core 27/27;
- Batch 1 concurrency/persistence PASS;
- Batch 1E 11/11;
- Batch 2 10/10;
- Batch 3 9/9;
- Batch 4/4.1 30/30;
- Batch 5 13/13;
- Batch 6 11/11;
- Batch 2/3/4/5/6 frontend E2E PASS;
- production build PASS;
- health/readiness/CORS/Helmet PASS.

## 7. Database Boundary

Batch 6 needed no schema migration.

Never:

- edit historical migrations;
- manually edit `_prisma_migrations`;
- use `prisma db push` against development/shared DB;
- fabricate telemetry/history/incident evidence.

## 8. Research Boundary

Do not promote these into core merely because source files exist:

- fake live telemetry jitter;
- Digital Twin;
- simulation;
- GA/NSGA-II/Pareto;
- AI diagnostic authority;
- QR hardware simulation;
- payment;
- MQTT/camera integration.

The official required-core scenario has priority.

## 9. What Comes Next

The planned next stage is Batch 7 — Production Demo Hardening:

- CI/core-vs-research cleanup;
- lint/typecheck/test quality gates;
- production config validation;
- advanced/research navigation boundary;
- hide incomplete/fake demo paths;
- reproducible graduation demo documentation.

Do not start Batch 7 without explicit user authorization.

## 10. Handoff Rule

A future coding agent should treat:

`CURRENT_STATE.md + BATCH5_WALKTHROUGH.md + BATCH6_WALKTHROUGH.md`

as the fastest continuity path, then consult the full verified reports and source before making changes.

**HARD STOP AFTER BATCH 6.**
