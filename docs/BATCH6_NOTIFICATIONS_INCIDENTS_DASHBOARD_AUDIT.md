# Batch 6 Audit — Notifications, Incidents, Dashboard & Real Telemetry

Date: 2026-09-20  
Branch: `batch6-notifications-incidents-dashboard`  
Starting main commit: `eedc324cefa1884193bd0532f14a671c12c86b37`  
Authorization: **Batch 6 explicitly authorized by the user. Batch 7 is not authorized.**

## Authority Read

Batch 6 follows:

1. official graduation assignment;
2. `AGENTS.md`;
3. `.agent/PROJECT_RULES.md`;
4. `.agent/INSTRUCTOR_BASELINE.md`;
5. `.agent/DEVELOPMENT_WORKFLOW.md`;
6. `docs/srs.md`;
7. `PRODUCT.md`;
8. `docs/CURRENT_STATE.md`;
9. `docs/DECISIONS.md`;
10. verified Batch reports and `docs/BATCH5_WALKTHROUGH.md`;
11. current implementation.

## Authoritative Batch 6 Scope

From `docs/ASSIGNMENT_GAP_ANALYSIS.md`:

1. persist approval results, upcoming-booking reminders and return reminders;
2. user-scoped notification read/update and reminder scheduling;
3. persisted incident reporting and staff resolution;
4. real dashboard aggregates for utilization, resource status, bookings and incidents;
5. minimal real telemetry with lab/resource/source/timestamp/temperature/humidity/online;
6. validate resource ownership, timestamp sanity, numeric ranges, source identity and ingestion authorization;
7. derive only deterministic telemetry states: HEALTHY, WARNING, STALE, UNAVAILABLE, NO_DATA;
8. store telemetry history and never fabricate samples or healthy state.

## Existing Canonical Persistence

No schema migration is expected.

Existing Prisma models already cover:

- `Notification`
- `Incident`
- `IncidentComment`
- `TelemetrySample`
- `Resource`
- `Booking`
- `UserLabAssignment`
- `UsageLog`

Existing enums already cover notification types and incident states.

Historical migrations must remain untouched.

## Current Implementation Classification

### Notifications — PARTIAL/CANONICAL

Current strengths:

- database-backed;
- authenticated;
- user-scoped;
- single-read and read-all endpoints;
- Batch 5 persists approval/rejection notifications.

Missing:

- upcoming reminder scheduling;
- return reminder scheduling;
- due-notification dispatcher;
- cancellation of obsolete scheduled reminders;
- unread count / pagination-quality contract.

### Incidents — PERSISTENCE EXISTS, ACTIVE UI FAKE

Persistence exists in Prisma, but no mounted canonical incident backend route is present.

The active `IncidentManagementView.tsx` currently contains:

- static incidents;
- hard-coded resource choices;
- local `Date.now()` IDs;
- local create/resolve behavior;
- fake resolution text;
- fake SLA claims;
- demo-data reset.

Disposition:

**REWRITE REQUIRED CORE**.

### Dashboard — PARTIAL

Backend currently reads real resources/bookings but:

- utilization is only a reserved-resource ratio, not actual time utilization;
- incident metrics are absent;
- telemetry is absent;
- notification counts are absent;
- status distribution is incomplete.

Disposition:

**HARDEN / REWRITE AGGREGATES**.

### Telemetry — PERSISTENCE EXISTS, ACTIVE FEATURE FAKE

`TelemetrySample` exists in Prisma.

However `useLiveTelemetry.ts` currently generates hard-coded devices and
`Math.random()` jitter every 2.5 seconds.

`TelemetryNodeCard.tsx` includes fabricated health/MTBF/power labels and local
maintenance toggles.

Disposition:

- fake live stream: **REMOVE FROM REQUIRED CORE**;
- real telemetry endpoint/service: **IMPLEMENT**;
- UI must show NO_DATA when no accepted sample exists.

## Batch 6 Design Boundary

REQUIRED CORE:

- persisted notification reminders;
- safe reminder dispatcher;
- persisted incidents;
- role-scoped incident operations;
- real dashboard aggregates;
- authenticated telemetry ingestion;
- telemetry history/latest status;
- deterministic monitoring states;
- frontend incident/dashboard/monitoring paths backed by APIs;
- PostgreSQL integration + full-stack E2E.

SUPPORTING:

- in-process reminder polling when explicitly enabled;
- Prometheus observation of accepted telemetry;
- incident comments if useful to core workflow.

DEFERRED / OPTIONAL:

- email/SMS delivery;
- WebSocket/SSE;
- hardware control;
- MQTT broker;
- predictive maintenance;
- AI incident classification;
- Digital Twin;
- simulation;
- optimization;
- fake "real-time" micro-jitter.

## Safety

Do not:

- add a migration unless a genuine schema blocker is proven;
- edit historical migrations;
- use `prisma db push` on development/shared DB;
- fabricate telemetry;
- treat missing telemetry as healthy;
- expose incidents across unauthorized lab scope;
- let client-side filtering replace backend RBAC;
- start Batch 7.
