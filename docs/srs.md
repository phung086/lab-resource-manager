# Software Requirements Specification

## Product Summary

Lab Resource Manager is an internal web application for university laboratory
resource booking, approval, handover, monitoring, incident handling, analytics,
and AI-assisted lookup.

The product purpose and priority order are defined in `PRODUCT.md`. This SRS is
the working requirement baseline for implementation.

## Actors

- `ADMIN`: global system administration and cross-lab operation.
- `LAB_STAFF`: assigned-laboratory operation, approval, handover, resource
  updates, maintenance, and monitoring.
- `LECTURER`: authenticated resource discovery and own booking workflow.
- `STUDENT`: authenticated resource discovery and own booking workflow.

## Core Functional Requirements

### Authentication And Account

- Users can register only as `STUDENT`.
- Users can log in with real database-backed credentials.
- Protected requests reload the current active database user.
- Admins can manage users, roles, activation, and lab assignments.
- Client-side visibility never replaces backend authorization.

### Resource Management

- Users can view public safe resource catalog and schedule projections.
- Admin and assigned lab staff can create/update resources according to lab
  scope.
- Resource retirement is non-destructive.
- `Resource.operationalStatus` is the authoritative physical state.
- Category and technical subtype are separate. Unresolved categories must not
  be guessed.

### Booking Workflow

- Authenticated users can request bookings.
- Approval-required resources create `PENDING_APPROVAL` bookings.
- Immediate resources create `CONFIRMED` bookings when policy allows.
- Admin and assigned lab staff can approve, reject, check out, return, and
  complete eligible bookings.
- Owners can view and cancel their own eligible bookings.
- Booking overlap protection must remain enforced at the database level.

### Scheduling And Availability

- Availability is derived from operational status, bookings, maintenance
  windows, and policy.
- Intervals use half-open semantics: `[startAt, endAt)`.
- Public projections must not expose requester identity or private titles.

### Maintenance, Incident, Notification

- Maintenance must be persisted and must affect availability when blocking.
- Important booking/resource actions should create durable history where schema
  supports it.
- Notifications are user-scoped and database-backed.
- Incident and advanced monitoring workflows are core only when backed by real
  persistence and approved batch scope.

### Monitoring And Telemetry

- Telemetry must come from accepted real samples, agents, or exporters.
- Absence of telemetry is `NO_DATA`; do not generate fake healthy states.
- Monitoring UI must distinguish stale/unavailable/no-data states truthfully.

### AI Assistance

- AI may explain, summarize, search, and recommend based on real project data.
- AI must not override authorization, booking policy, resource state, or human
  approval responsibility.

## Non-Functional Requirements

- Correctness and security take priority over showcase features.
- Backend errors use the stable API error contract:
  `{ "error": { "code", "message", "details" } }`.
- Required workflows must avoid mock/fake success.
- UI must be responsive, keyboard-usable, and accessible.
- Build/test commands must be reproducible on a clean machine.
- Production configuration must fail closed for missing critical secrets.

## Out Of Scope Unless Explicitly Approved

- Framework migration.
- Payment as a required booking state.
- Digital Twin, optimization, simulation, genetic scheduling, and research
  modules as production-core features.
- Fabricated telemetry, audit, usage history, or benchmark evidence.
# Approved incremental extension — 2026-09-23

The user-approved Open LAB direction extends this historical graduation baseline.
Track its implementation in `docs/OPEN_LAB_UPGRADE_REPORT.md`; this is not a final
product release. External identity/fast booking, resource-purpose pricing and
booking-linked payment are approved requirements, still pending implementation.
Canonical role and booking enums are unchanged in the current checkpoint.

Current implemented exception to staff-only return/completion: an authenticated
owner may self-return a ROOM booking in CHECKED_OUT, supplying condition evidence.
The server atomically records RETURN then COMPLETE history, completes the booking,
preserves the planned interval, and records actual end time. It releases future
availability without requiring staff approval, while preserving any existing hard
unavailable physical state. EQUIPMENT/MACHINE/KIT/MATERIAL are excluded. Staff
inspection is not claimed by an owner declaration. Existing staff APIs remain scoped.

Booking creation and each operation notify active administrators and staff assigned
to the resource's lab; the owner also receives operation outcomes. Delivery is
persisted in-app; this does not imply email/push delivery or historical backfill.
