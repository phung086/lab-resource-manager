# Batch 8 Smart Monitoring Audit

Date: 2026-09-21
Verified predecessor: Batch 7 commit `50ecda3a69ef37fc21b572616ac76b3e4975a7d3`

## Existing capability that remains authoritative

The Batch 6 implementation already provides a sound required-core base:

- `TelemetrySample` is persisted in PostgreSQL and tied to `Resource`.
- ingestion validates timestamp, numeric ranges, and resource/laboratory
  ownership;
- monitoring states are deterministic: `HEALTHY`, `WARNING`, `STALE`,
  `UNAVAILABLE`, `NO_DATA`;
- unverified signals do not become factual warnings;
- ADMIN telemetry/dashboard scope is global;
- LAB_STAFF telemetry/dashboard scope comes from `UserLabAssignment`;
- STUDENT and LECTURER are denied staff telemetry/dashboard endpoints;
- dashboard aggregates persisted resources, bookings, incidents, notifications,
  and accepted samples;
- the frontend does not interpolate missing readings.

These contracts must be extended, not replaced. `Resource.operationalStatus`
continues to be the only authoritative physical resource state.

## Gaps requiring Batch 8 persistence

### Telemetry source identity

The pre-Batch-8 ingestion path authenticated one global `TELEMETRY_API_KEY` and trusted the
client-supplied `source` label. There is no stable per-source identity,
credential lifecycle, active flag, scope, last-seen timestamp, or explicit
source health. A persisted `TelemetrySource` is required.

Each source will be bound to exactly one laboratory and resource. The token
contains a public source identifier plus a high-entropy secret; only a salted
derived hash is stored. The server resolves the source from the credential and
ignores client claims of source identity or scope.

### Threshold policy

Current thresholds are read from generic `Resource.specs`. This is not an
inspectable monitoring-policy contract and has no laboratory-level policy.
Batch 8 requires separate laboratory defaults and resource overrides with
documented system defaults as the final fallback.

Precedence is:

`resource override -> laboratory threshold -> documented system default`

The applied values and provenance must be returned with monitoring data.

### Alerts and incident provenance

Current warning state is derived at read time only. There is no durable alert,
acknowledgement, resolution, deduplication, or incident link. Batch 8 requires a
persisted alert with an active-condition unique key. Advisory locks plus the
database unique constraint will serialize concurrent duplicate conditions.

Only verified critical conditions create one linked system incident. Manual
incidents remain unchanged. System incidents require nullable human reporter
identity plus explicit telemetry source/sample/alert provenance.

### Camera boundary

There is no canonical camera model or access audit. Existing QR/Digital Twin
showcase code is not a camera implementation and remains research-only. Batch 8
requires persisted metadata, disabled-by-default configuration, scoped
authorization, non-disclosure of endpoint data, and a persisted audit for each
authenticated access attempt. No video stream will be fabricated.

## Planned additive models and changes

- `TelemetrySource`: stable resource/lab identity, salted credential hash,
  active flag, reported online state, last accepted sample, and last seen.
- `LaboratoryMonitoringThreshold` and `ResourceMonitoringThreshold`: explicit
  persisted threshold layers.
- `MonitoringAlert`: condition identity, sample/source/resource/lab provenance,
  severity, state, acknowledgement, resolution, and incident link.
- `Camera`: disabled-by-default metadata and private endpoint field.
- `CameraAccessAudit`: actor, scope, purpose, timing, and outcome.
- `TelemetrySample`: additive source identity and optional external event id.
- `Incident`: additive telemetry provenance and optional human reporter for
  system-generated incidents.

All changes will be delivered in a new migration. No historical migration or
`_prisma_migrations` row will be edited.

## Realtime and AI decision

SSE/WebSocket is not required for correctness. The existing refresh/polling
path plus persisted history provides reconnect recovery and is simpler for this
individual project. No transient realtime channel will be introduced.

AI remains optional and outside the Batch 8 release gate. It will not
acknowledge alerts, create facts, or alter authoritative state.

## Hardware truth boundary

This environment has no authenticated physical sensor or camera. Protocol,
authentication, persistence, alert logic, RBAC, and UI can be tested with
controlled isolated-database fixtures. Real physical-device verification must
remain **PENDING REAL HARDWARE**.
