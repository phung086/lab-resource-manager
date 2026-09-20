# Batch 5 Operational Workflow Audit

Date: 2026-09-20  
Starting commit: `08dbf7441a975db22d8266f61bf0d3e0f289e4c1`  
Scope: REQUIRED CORE approval → handover/check-out → return → completion.

## Governance Read

`AGENTS.md`, project rules, instructor baseline, development workflow, local compliance skill, SRS, conventions, project structure, CURRENT_STATE, DECISIONS, frontend/backend guidelines, verified Batch 1E/2/3/4 reports, and Prisma schema were reviewed before implementation.

## Audit Classification

| Area | Classification | Batch 5 disposition |
|---|---|---|
| Canonical booking state machine | CANONICAL / PARTIAL | Reuse and harden; no parallel state machine |
| Approve/reject routes | CANONICAL / PARTIAL | Keep; add action-specific validation, audit and notification guarantees |
| Check-out route | CANONICAL / PARTIAL | Require condition-before; synchronize physical state |
| Return route | CANONICAL / PARTIAL | Require condition-after; persist actualEndAt; synchronize physical state |
| Completion | CANONICAL / PARTIAL | Preserve evidence; close workflow |
| UsageLog | CANONICAL | Persist every successful transition |
| ResourceStatusHistory | CANONICAL | Record real AVAILABLE↔IN_USE changes only |
| UserLabAssignment | CANONICAL | Backend source of LAB_STAFF scope |
| Booking history UI/API | MISSING | Add persisted timeline endpoint and UI |
| Approval/rejection notifications | SUPPORTING / PARTIAL | Persist in same transaction as transition |
| `BookingActionModal.tsx` | MOCK / PARTIAL | Rewrite without UAV/DJI defaults or pre-confirmed inspection facts |
| `QrCheckInModal.tsx` | OPTIONAL / RESEARCH | Isolate behind research feature flag; not core authority |
| `QrCheckinModal.jsx` | DEAD / LEGACY | Not used by canonical Batch 5 workflow |
| VietQR/payment | OPTIONAL / RESEARCH | Remains outside required booking lifecycle |
| NO_SHOW automation | SUPPORTING-DEFERRED | Outcome only; no scheduler added |
| Incident inference from return text | OUT OF SCOPE | No automatic incident fabrication |

## Required Core Findings

The existing schema already contains the fields required by the graduation assignment: approval actor/time, condition before/after, actual start/end, returned/completed timestamps, UsageLog and ResourceStatusHistory. No schema migration is required.

The current frontend booking screen still contained lowercase legacy statuses, a wrong `check-in` endpoint, and fake QR/hardware interactions. Batch 5 replaces the active booking operations surface with the canonical workflow and leaves research-only QR/payment behavior isolated from required core.

## Database Safety

- No historical migration edits.
- No new migration planned.
- No `prisma db push` authorized.
- Batch 5 destructive test/seed helpers require localhost plus a `lab_resources_b5_operations_*` database name.
