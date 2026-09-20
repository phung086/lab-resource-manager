# Batch 6 — Notifications, Incidents, Dashboard & Real Telemetry Report

Date: 2026-09-20  
Branch: `batch6-notifications-incidents-dashboard`  
Starting main commit: `eedc324cefa1884193bd0532f14a671c12c86b37`  
Status: **COMPLETE & VERIFIED — HARD STOP (BATCH 7 NOT AUTHORIZED)**

## 1. Required Core Delivered

Batch 6 completes the next official graduation-core layer on top of the verified Batch 5 workflow:

- persisted approval results and booking reminder notifications;
- user-scoped notification read/update;
- durable upcoming-booking and return reminders;
- due-reminder dispatch without fake delivery claims;
- persisted incident reporting;
- LAB_STAFF assigned-lab incident scope and ADMIN global incident authority;
- incident triage / investigation / resolution with persisted evidence;
- real dashboard aggregates from PostgreSQL state;
- minimal authenticated telemetry ingestion;
- deterministic telemetry states: `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, `NO_DATA`;
- telemetry history/latest state from accepted samples only;
- no fake healthy state and no fabricated telemetry.

## 2. Notifications

Canonical notification persistence remains the existing `Notification` model.

Implemented:

- Batch 5 approval/rejection notifications remain intact.
- A confirmed/checked-out booking schedules:
  - `BOOKING_UPCOMING`
  - `RETURN_REMINDER`
- Reminder records use deterministic dedupe keys.
- Obsolete unsent booking reminders can be cancelled.
- Due reminders are marked sent by a guarded dispatcher.
- Notification listing is strictly scoped to `req.user.id`.
- Read-one and read-all operations cannot mutate another user's notifications.
- In-process reminder polling can be disabled and does not claim email/SMS delivery.

## 3. Incidents

Canonical persisted incident workflow:

`reported -> triaged/assigned -> investigating -> resolved`

Rules:

- ordinary users may report incidents using real resources;
- ordinary users read only their own reported incidents;
- LAB_STAFF operate incidents only for assigned laboratories;
- ADMIN has global operational authority;
- resolution requires non-empty evidence;
- booking linkage, when supplied, must belong to the incident resource;
- every incident report/transition writes durable audit evidence.

The previous static/local incident UI is replaced on the required-core path by API-backed persisted behavior.

## 4. Dashboard

Dashboard metrics are derived from PostgreSQL state rather than hard-coded KPI values.

Verified dashboard data includes:

- total/scoped resources;
- resource operational-status distribution;
- active bookings;
- upcoming bookings;
- scheduled and actual utilization over the defined window;
- total/open incidents and incident severity distribution;
- unread notifications for the current operator;
- telemetry-state summary;
- per-resource latest telemetry projection.

LAB_STAFF dashboard scope follows assigned laboratories. ADMIN remains global.

## 5. Minimal Real Telemetry Contract

Accepted telemetry requires:

- `labId`
- `resourceId`
- `source`
- `timestamp`
- `temperatureC`
- `humidityPercent`
- `online`

Optional utilization fields may be persisted only when valid.

Ingestion validates:

- service credential / ingestion authorization;
- source identity;
- resource existence;
- resource-to-laboratory ownership;
- timestamp sanity;
- numeric ranges;
- supported payload shape.

No sample is synthesized when input is absent or invalid.

## 6. Deterministic Monitoring State

The backend derives exactly one state from persisted accepted samples:

- `NO_DATA`: no accepted sample exists;
- `UNAVAILABLE`: latest accepted source explicitly reports offline;
- `STALE`: latest sample exceeds freshness threshold;
- `WARNING`: fresh sample violates configured threshold or contains a verified warning signal;
- `HEALTHY`: fresh, online, within thresholds, with no verified warning signal.

Unverified event/safety signals never become factual warnings.

Thresholds come from canonical resource specs with documented fallbacks.

## 7. Frontend

Touched-module migration continues toward instructor structure.

New/rewritten canonical paths include:

- `frontend/src/pages/incidents/IncidentsPage.tsx`
- `frontend/src/pages/monitoring/MonitoringDashboardPage.tsx`
- `frontend/src/components/features/incidents/IncidentManagementView.tsx`
- `frontend/src/components/features/monitoring/TelemetryStatusGrid.tsx`
- `frontend/src/services/incidents.ts`
- `frontend/src/services/monitoring.ts`
- `frontend/src/types/incident.ts`
- `frontend/src/types/telemetry.ts`

Notification center is now backed by real user-scoped notification data.

The required-core monitoring UI does not use `Math.random()` fake telemetry.

## 8. Backend Verification

Workflow: **Batch 6 Backend Regression**  
Verified run: `35520379592`

| Gate | Result |
|---|---|
| Backend core | **27/27 PASS** |
| Batch 1 concurrency | **1/1 PASS** |
| Batch 1 persistence | **1/1 PASS** |
| Batch 1E runtime | **11/11 PASS** |
| Batch 2 auth/RBAC | **10/10 PASS** |
| Batch 3 resources | **9/9 PASS** |
| Batch 4/4.1 booking/calendar | **30/30 PASS** |
| Batch 5 operational workflow | **13/13 PASS** |
| Batch 6 notifications/incidents/dashboard/telemetry | **11/11 PASS** |

Batch 6 integration coverage verifies:

1. durable upcoming/return reminders;
2. strict notification ownership;
3. persisted incident reporting;
4. staff incident scope + required resolution evidence;
5. telemetry ingestion fails closed without service credential;
6. telemetry lab ownership + numeric/timestamp validation;
7. deterministic telemetry states + unverified signal handling;
8. LAB_STAFF telemetry scope;
9. real dashboard aggregates across resources/incidents/bookings/all five telemetry states;
10. ordinary-user denial for staff telemetry/dashboard;
11. suite completion on isolated PostgreSQL 16.

## 9. Full-stack E2E & Runtime Verification

Workflow: **Batch 6 Full-stack E2E**  
Verified run: `35520379681`

Environment:

- PostgreSQL 16;
- isolated Batch 2/3/4/5/6 databases;
- real Express backend;
- real React/Vite frontend;
- headless Chromium;
- no mocked API success.

Results:

- Batch 2 auth frontend E2E: **PASS**
- Batch 3 resource frontend E2E: **PASS**
- Batch 4 calendar frontend E2E: **PASS**
- Batch 5 operations frontend E2E: **PASS**
- Batch 6 notifications/incidents/dashboard/telemetry E2E: **PASS**
- frontend production build: **PASS**, verified at **1.59s** in this run
- health/readiness smoke: **PASS**
- CORS/Helmet smoke: **PASS**
- Batch 6 screenshots artifact uploaded successfully.

Batch 6 E2E verifies:

- student notifications;
- student persisted incident report;
- assigned LAB_STAFF incident scope and resolution;
- real dashboard data;
- all deterministic telemetry states;
- foreign-staff denial;
- ADMIN global dashboard;
- mobile workflow.

## 10. Standard CI / Previous Gate Preservation

Latest branch CI: **PASS**

- backend: PASS
- frontend build: PASS
- Docker production config: PASS

Batch 5 dedicated backend regression and full-stack E2E also remain **PASS** on the Batch 6 head.

## 11. Database Safety

- New schema migration: **NO**
- Historical migration modified: **NO**
- `_prisma_migrations` manually edited: **NO**
- `prisma db push` on development/shared DB: **NO**
- Development DB destructive mutation: **NO**
- Isolated guarded PostgreSQL test databases only.

Existing Prisma models were sufficient for Batch 6.

## 12. Remaining Debt

Non-blocking/supporting:

- reminder delivery is in-app; email/SMS remains deferred;
- WebSocket/SSE remains deferred;
- real hardware/MQTT ingestion remains outside Batch 6;
- automatic telemetry-triggered incident creation is deferred to Smart Monitoring extension;
- production domain/Search Console/Lighthouse SEO verification remains deferred;
- main bundle-size warning remains;
- ESLint/Prettier/Husky/strict-TypeScript convergence remains incremental;
- optional/research modules remain separately feature-bounded.

## 13. Final Boundary

**BATCH 6 COMPLETE & VERIFIED.**

Batch 7 is the next planned batch in `docs/ASSIGNMENT_GAP_ANALYSIS.md`, but **Batch 7 is NOT authorized and has NOT started**.
