# Batch 8 Smart Laboratory Monitoring Report

Date: 2026-09-21

Branch: `final-graduation-hardening`

Verified predecessor: `50ecda3a69ef37fc21b572616ac76b3e4975a7d3`

Implementation verdict: **GO**

Physical hardware verdict: **PENDING REAL HARDWARE**

## Scope

Batch 8 extends the verified Batch 6 monitoring design. It does not replace
the canonical booking workflow, infer physical resource state from sensor
state, introduce synthetic production telemetry, or make AI authoritative.

The implementation adds:

- persisted, scoped telemetry-source identities with high-entropy credentials;
- salted SHA-256 credential hashes, timing-safe verification, activation, and
  credential rotation;
- source-reported online state, accepted-sample timestamps, last-seen time, and
  monitoring freshness separate from `Resource.operationalStatus`;
- persisted laboratory thresholds and resource overrides with deterministic
  resource -> laboratory -> system-default precedence;
- durable alert episodes with source/sample/rule provenance, deduplication,
  acknowledgement, resolution, and optional linked incidents;
- verified critical-alert to incident linkage with one incident per alert;
- persisted camera metadata and every authenticated access attempt, with raw
  endpoint data kept private and cameras disabled/not configured by default;
- monitoring history, alert acknowledgement, camera state, and exact
  non-certified safety wording in the staff dashboard.

## Persistence and migration safety

One additive migration was added:

`backend/prisma/migrations/20260921000100_add_smart_monitoring/migration.sql`

It creates the new monitoring tables, indexes, uniqueness constraints, and
additive provenance fields. No historical migration SQL or
`_prisma_migrations` record was edited.

Verified database behaviors:

- clean PostgreSQL 16 deployment of all nine migrations: PASS;
- upgrade from the canonical predecessor schema: PASS;
- repeat `prisma migrate deploy`: PASS;
- predecessor data preservation: PASS;
- migration status after deployment: up to date;
- alert episode and external event uniqueness enforced by PostgreSQL.

## Security and truthfulness contracts

- A source token is returned only when created or rotated; plaintext is never
  stored.
- The source credential determines laboratory/resource identity. A client
  cannot select another source, resource, or laboratory in its payload.
- Rejected input does not update `lastSeenAt`.
- An inactive source fails closed; rotation immediately invalidates the old
  secret.
- Sensor offline means monitoring `UNAVAILABLE`; it never changes an
  `AVAILABLE` resource to `BROKEN`.
- Missing data remains `NO_DATA`; stale data remains `STALE`; the UI never
  interpolates readings.
- Smoke/fire warnings require an accepted verified signal. Temperature alone
  does not fabricate smoke/fire evidence.
- The UI states `NON-CERTIFIED · NOT A FIRE ALARM`; this feature is not a
  replacement for physical safety systems or procedures.
- Camera API responses never expose the private endpoint. STUDENT and LECTURER
  access attempts are denied and still audited.
- ADMIN has global scope. LAB_STAFF is limited by `UserLabAssignment`.

## Alert and incident policy

Threshold and verified-signal rules produce stable rule codes. An active
condition uses a deterministic active dedupe key. Source-scoped PostgreSQL
advisory locking plus a unique constraint serializes concurrent ingestion, so
repeated readings update one active episode rather than creating an alert and
incident on each poll.

Critical verified alerts create at most one incident. The incident retains
the telemetry source, accepted sample, and alert identifiers. A later healthy
sample can resolve the active alert; acknowledgement records the authorized
actor and timestamp without erasing provenance.

## Delivery design

The release uses authenticated writes and persisted polling/history rather
than SSE or WebSocket. PostgreSQL remains the only source of truth, and a page
refresh or reconnect reconstructs the state. This is the smallest reliable
design for the project and avoids transient socket state becoming evidence.

## Verification evidence

Backend Batch 8 integration on isolated PostgreSQL 16: **12/12 PASS** (the
parent test plus 11 subtests), covering:

- valid, invalid, inactive, and rotated source credentials;
- source/resource/laboratory spoof denial;
- timestamp and numeric validation;
- threshold precedence;
- `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, and `NO_DATA`;
- concurrent alert deduplication and one incident linkage;
- acknowledgement ownership and foreign-lab denial;
- non-certified verified smoke input and no temperature-only inference;
- camera scope, endpoint privacy, disabled state, and access audit;
- ordinary-user denial and absence of fake fallback.

Full fresh-database backend regression:

- core: 27/27 PASS;
- Batch 1 concurrency: 1/1 PASS;
- Batch 1 persistence: 1/1 PASS;
- Batch 1E: 11/11 PASS;
- Batch 2: 10/10 PASS;
- Batch 3: 9/9 PASS;
- Batch 4/4.1: 30/30 PASS;
- Batch 5: 13/13 PASS;
- Batch 6: 11/11 PASS;
- Batch 7: 6/6 PASS;
- Batch 8: 12/12 PASS.

Frontend and full-stack:

- lint: PASS with zero errors and 14 existing warnings;
- TypeScript check: PASS;
- Vite production build: PASS, main entry approximately 397 kB minified and
  112 kB gzip;
- Batch 2/3/4/5/6 E2E regressions: PASS;
- Batch 8 desktop assigned-scope, foreign-scope, alert acknowledgement,
  ordinary-user denial, endpoint privacy, and mobile E2E: PASS;
- official Batch 7 10-step graduation E2E rerun through production Nginx:
  PASS.

Production Compose on an isolated clean PostgreSQL 16 volume:

- frontend, backend, and database healthy;
- `/health`, `/api/health`, `/api/health/ready`: HTTP 200;
- allowed-origin CORS: PASS; unauthorized origin: HTTP 403;
- Helmet headers: PASS;
- all nine migrations applied and status up to date;
- Batch 8 E2E through the production proxy: PASS, including mobile;
- production dependency audits: backend 0, frontend 0 vulnerabilities.

## Verification incident

During an early migration test, a PowerShell URL-replacement mistake directed
one ordinary additive `prisma migrate deploy` at the local development database
`lab_resources`. The Batch 8 migration was applied there; the guarded fixture
seed stopped before inserting data. No historical migration, existing row, or
`_prisma_migrations` record was edited or deleted. A destructive rollback was
not attempted. Every later database command first verified
`current_database()` and used an isolated database. This is a non-destructive
execution deviation, not claimed as part of the release evidence.

## Hardware boundary

No physical sensor or camera was attached to this environment. Controlled
test credentials and isolated fixtures verified protocol, authentication,
persistence, classification, threshold policy, alert logic, incident
provenance, RBAC, camera audit, UI, and production routing.

**REAL HARDWARE VERIFIED: PENDING REAL HARDWARE.**
