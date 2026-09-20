# Batch 3 Resource Domain Audit

## 1. Scope and authority

This audit freezes the Batch 3 resource-management contract before runtime changes. It follows the official graduation assignment, `PRODUCT.md`, the approved Batch 0-2 documents, the canonical Prisma schema, and repository evidence. Batch 3 does not alter canonical roles, booking states, migration history, or optional research modules.

Selected skill: `ui-ux-pro-max` is limited to resource form/table/detail usability and accessibility. It does not define taxonomy, persistence, RBAC, or operational-state semantics.

## 2. Actual persistence snapshot

The development database was inspected read-only on PostgreSQL 16.14:

- 9 persisted resources and 2 active laboratories.
- 3 resources have a laboratory; 6 remain unassigned.
- 2 bookings, 6 usage logs, 1 resource-status history row, and no maintenance, telemetry, or incident rows.
- The five intentionally unresolved categories remain `NULL`: `CAM-D435I-01`, `EDGE-RPI5-01`, `RPI-KIT-05`, `UAV-M350-RTK-01`, and `UAV-MATRICE-300`.
- The canonical schema already contains nullable `Resource.category`, technical `Resource.subtype`, authoritative `Resource.operationalStatus`, compatibility `Resource.status`, `ResourceStatusHistory`, and all required history relations. No Batch 3 schema migration is justified.

## 3. Domain findings

| Area | Classification | Evidence and decision |
|---|---|---|
| `Resource.operationalStatus` | CANONICAL | The only physical/operational authority. Values are `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE`. |
| `Resource.status` | LEGACY | Compatibility projection only; never drives availability or stores reservation. |
| `Resource.category` | CANONICAL | Assignment-level taxonomy: `ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`, `MATERIAL`; remains nullable for evidence-based review. |
| `Resource.subtype` mapped to DB `type` | CANONICAL | Technical specialization remains separate: `ROOM`, `GPU_SERVER`, `RASPBERRY_PI`, `UAV`, `CAMERA`, `KIT`, `MATERIAL`, `OTHER`. |
| `Resource.bookingState` | CANONICAL SUPPORTING | Policy control distinct from physical state and interval availability. |
| `ResourceStatusHistory` | CANONICAL | Persist immutable operational transitions with actor ID, reason, and timestamp. |
| `UsageLog` | CANONICAL SUPPORTING | Persist resource metadata/category/lab changes using truthful metadata; do not overload status history. |
| Booking and maintenance intervals | CANONICAL | Half-open `[startAt,endAt)` schedule sources; active booking and blocking-maintenance statuses are reused from Batch 1. |
| Telemetry/incidents | OPTIONAL FOR THIS BATCH | May be read when real rows exist; no samples, health values, or incidents are fabricated. |
| Hard resource deletion | DEAD/UNSAFE | History FKs use `Restrict`; Batch 3 exposes retire instead of delete. |

## 4. Active path inventory

| Path | Classification before implementation | Target |
|---|---|---|
| `backend/src/routes/resources.js` GET list/detail | CANONICAL but incomplete | Validated DB search/filter, canonical serializer, derived availability, truthful detail. |
| `backend/src/routes/resources.js` PATCH `/:id/status` | LEGACY naming, partial behavior | Replace with canonical `/:id/operational-status` service; validate reason/retired policy and persist history. |
| Resource POST/PATCH/retire | DEAD/MISSING | Add canonical routes with ADMIN and assigned-lab `LAB_STAFF` enforcement. |
| Resource history/schedule APIs | DEAD/MISSING | Add real persisted read endpoints without identity leakage or fabricated events. |
| Laboratory resource-management API | DEAD/MISSING | Add minimal list/detail plus ADMIN create/update and role-appropriate visibility. |
| `frontend/src/App.jsx` `ResourceView` | LEGACY/BROKEN | Calls nonexistent POST and PATCH paths, filters local arrays, and reads legacy status/type fields. Replace in active render path. |
| `frontend/src/components/AdminResourceManagementView.tsx` | MOCK | Hardcoded resources, users, quotas, utilization, and payment ledger. Replace with a thin real resource-management wrapper. |
| `frontend/src/components/ResourceDetailsModal.tsx` | MOCK | Hardcoded DGX specifications, telemetry, policy, and SLA. Rewrite to render only API data. |
| `frontend/src/components/ResourceStatusModal.tsx` | LEGACY/MOCK COPY | Device-specific defaults and suggestions. Rewrite as generic canonical status confirmation. |
| `frontend/src/components/LabFloorplan.tsx` | OPTIONAL_ADVANCED ACTIVE | Uses a Digital Twin view in the core resource page; remove from the canonical resource path but preserve the optional module. |
| `frontend/src/components/LabFloorplan.jsx` | DUPLICATE | Not imported. Preserve until cleanup confirms no dynamic usage, then remove only this duplicate. |
| `frontend/src/mockData.js` `mockResources` | MOCK SUPPORTING | Not imported by the active core after Batch 2; preserve optional fixture file but never import it into Batch 3. |
| `frontend/src/components/QuickBookingModal.tsx` local resources | OPTIONAL/OUT OF SCOPE | Batch 4 booking UI debt; do not use for Batch 3 resource discovery. |

## 5. Canonical API contract

All management routes require a valid active database user. `ADMIN` has cross-lab access. `LAB_STAFF` must have a persisted `UserLabAssignment` for both the current and target laboratory. `LECTURER` and `STUDENT` are read-only.

| Method | Endpoint | Access | Behavior |
|---|---|---|---|
| GET | `/api/resources` | Public safe read | DB-backed search and filters: `search`, `laboratoryId`, `category`, `subtype`, `operationalStatus`, optional interval availability. |
| GET | `/api/resources/:id` | Public safe read | Canonical fields, lab, derived current availability, real upcoming booking/maintenance summary. |
| GET | `/api/resources/:id/schedule` | Public safe read | Real bookings and maintenance windows; no requester identity. |
| GET | `/api/resources/:id/history` | Authenticated | Real status, usage, booking, maintenance, and incident sources with provenance. |
| POST | `/api/resources` | ADMIN or LAB_STAFF | Strict create; staff target lab must be assigned. |
| PATCH | `/api/resources/:id` | ADMIN or LAB_STAFF | Strict mutable-field update; current and target lab scope enforced. |
| PATCH | `/api/resources/:id/operational-status` | ADMIN or LAB_STAFF | Transactional authority update, compatibility projection, immutable history. |
| POST | `/api/resources/:id/retire` | ADMIN or LAB_STAFF | Non-destructive terminal retirement with required reason; staff scope applies. |
| GET | `/api/laboratories` | Authenticated | Admin all, staff assigned only, other roles active labs. |
| GET | `/api/laboratories/:id` | Authenticated | Same visibility rule, with resource count. |
| POST/PATCH | `/api/laboratories` | ADMIN only | Minimal laboratory administration; no tenant/org expansion. |

Unknown fields are rejected. `id`, history IDs, derived availability, compatibility `status`, counts, telemetry summaries, and audit actor fields are never client-mutable.

## 6. Archive, availability, and history rules

- No resource DELETE endpoint is introduced. Retirement sets `operationalStatus=RETIRED`, projects compatibility `status=offline`, and writes status history plus usage audit.
- `RETIRED` is terminal for `LAB_STAFF`. Only `ADMIN` may explicitly restore it through the operational-status endpoint with a reason.
- Derived availability is computed from `operationalStatus`, `bookingState`, overlapping active bookings, and blocking maintenance. A future reservation never mutates physical status.
- Schedule uses half-open overlap rules. Public schedule data contains no requester identity or private title.
- Unified history retains source labels and references and never invents missing actors or telemetry.

## 7. Confirmed implementation defects

1. Existing list filters are unvalidated and support only status/subtype.
2. Existing list/detail exposes deprecated compatibility `status` as if canonical and omits lab/category context, timestamps, policy, and derived availability.
3. Existing status endpoint fabricates a generic reason instead of accepting/auditing the actual reason.
4. Create, update, retire, history, schedule, and laboratory-management routes are absent.
5. Current staff scope helper resolves resource IDs but not direct laboratory targets needed by create/move operations.
6. Active frontend create/update calls do not match backend routes and therefore cannot succeed truthfully.
7. Active admin resource screen is entirely static and includes payment/quota scope that is not part of Batch 3.
8. Active detail modal displays fabricated hardware, telemetry, and SLA values.
9. Active user resource search/filter is client-side over an initially loaded array rather than canonical server query parameters.

## 8. Implementation order

1. Add resource contracts/service and direct laboratory-scope assertion.
2. Implement canonical resource and laboratory routers without schema changes.
3. Add isolated PostgreSQL Batch 3 integration coverage.
4. Replace active resource/admin frontend paths with one API-backed catalog and management UI.
5. Rewrite detail/status dialogs to show only real data and accessible errors.
6. Run role-based live E2E, Batch 1-2 regression, build/startup smoke, and mock/duplicate re-audit.
