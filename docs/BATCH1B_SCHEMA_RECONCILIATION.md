# Batch 1B - Canonical Prisma Schema Reconciliation

Status: **PASS for persistence reconciliation; GO to draft Batch 1C after approval.**
Completed: 2026-09-18 (Asia/Saigon).
This is a schema/client compatibility checkpoint, not an application release or a completed canonical migration.

Product scope: `PRODUCT.md`, official assignment "Xay dung he thong dat lich va giam sat tai nguyen phong thi nghiem", `ASSIGNMENT_GAP_ANALYSIS.md` sections 4.1/4.2, `BATCH0_BASELINE.md`, `BATCH1A_BACKUP_RESTORE_REPORT.md`, and the user's Batch 1B instructions. The newer Batch 1B decisions below supersede conflicting migration suggestions in the earlier Batch 0 plan.

Only the verified restored database was inspected:
`lab_resources_restore_b1a_pg16_20260917t090416z` on local PostgreSQL 16.14. No source database query or DDL was needed. The restore was queried in a read-only transaction; its catalog, all row counts, per-table content digests, and migration records remained unchanged.

Mandatory rollback baseline:
`C:\Users\Admin\LabResourceManagerBackups\Batch1A\lab_resources_batch1a_pg16_20260917T090416Z.dump`.
SHA-256 was rechecked: `f43a8dfcad3c36b2f8770fb36b7e01fb616886535d64e6c6691c48387e61fd89`.

## A. Old Prisma schema vs verified live schema

| Area | Schema before 1B | Verified persistence / reconciled schema |
|---|---|---|
| Model coverage | 5 models; only 3 correspond to actual tables | All 31 application tables now have Prisma models; 28 missing models restored |
| Nonexistent tables | `VietQrTransaction`, `AiEfficiencyMetric` | Removed from the Prisma declaration because their physical tables do not exist; advanced code and existing data were not deleted |
| User columns | Snake-case mappings such as `password_hash`, `full_name` | Existing `passwordHash`, `fullName`, profile, and active-state columns retained |
| Resource fields | Category/hourly rate/specsJson schema absent in DB | All 22 physical resource columns represented, including technical type, both status fields, lab link, metadata and version |
| Booking fields | `userId/startTime/endTime` mapped to absent snake-case columns | All 20 physical columns represented as `requestedById/startAt/endAt`, approval actor, purpose, conditions, actual times and idempotency |
| Roles | Mixed uppercase/lowercase and unsupported roles | Exactly four Prisma roles using `@map` to the four unchanged DB labels |
| Booking states | Payment/check-in lifecycle and casing aliases | Six canonical client names mapped to legacy labels, plus explicitly temporary `LEGACY_NO_SHOW`; `RETURNED` requires 1C |
| Operational states | Narrow mixed-case ResourceStatus | Seven canonical OperationalStatus client names mapped to existing physical labels |
| Relations | Incomplete | All 44 physical FKs, nullability and referential actions verified |
| Defaults | Speculative quota/rate/payment defaults; client ID generation | Only observed column defaults represented; absent fields not added |
| Migration files | Seven local files, five recorded | Files and restored `_prisma_migrations` unchanged; pending provenance issue remains |
| Booking guard | Cannot be described by Prisma schema syntax | Existing GiST exclusion constraint verified in catalog and explicitly documented in schema |

The former full schema at commit `9bdc755` was useful for model and relation names. It was not blindly restored: every physical field/default, enum label/order, relationship, index and nullability was checked against the verified restore.

Client-only ID generators and `@updatedAt` behavior are not evidence of a database default. The reconciled baseline omits unverified automatic ID/update-time generation, including introspection's inherited `cuid()` hints from the old five-model file. Required IDs and update timestamps remain required; no nullability was weakened. Before enabling writes, define the shared ID generator and timestamp ownership explicitly. This baseline is read-verified, not a write-path compatibility promise.

## B. Canonical Prisma model inventory

All listed models passed `count()`, scalar `findMany()`, and relation query smoke checks. Empty-table reads exercise SQL/schema shape but do not prove enum decoding for values without rows.

| Prisma model | Physical table via @@map | Rows | Read smoke |
|---|---|---:|---|
| `Campus` | `campuses` | 1 | PASS |
| `Building` | `buildings` | 1 | PASS |
| `Laboratory` | `laboratories` | 2 | PASS |
| `LabPolicy` | `lab_policies` | 2 | PASS |
| `User` | `users` | 5 | PASS |
| `Resource` | `resources` | 9 | PASS |
| `ResourceCapability` | `resource_capabilities` | 2 | PASS |
| `ResourceStatusHistory` | `resource_status_history` | 0 | PASS |
| `TrainingCourse` | `training_courses` | 2 | PASS |
| `TrainingRequirement` | `training_requirements` | 1 | PASS |
| `UserCertification` | `user_certifications` | 1 | PASS |
| `Booking` | `bookings` | 2 | PASS |
| `MaintenanceWindow` | `maintenance_windows` | 0 | PASS |
| `Incident` | `incidents` | 0 | PASS |
| `IncidentComment` | `incident_comments` | 0 | PASS |
| `UsageLog` | `usage_logs` | 6 | PASS |
| `Notification` | `notifications` | 10 | PASS |
| `TelemetrySample` | `telemetry_samples` | 0 | PASS |
| `KnowledgeDocument` | `knowledge_documents` | 4 | PASS |
| `KnowledgeChunk` | `knowledge_chunks` | 8 | PASS |
| `AiConversation` | `ai_conversations` | 0 | PASS |
| `AiMessage` | `ai_messages` | 0 | PASS |
| `PaymentTransaction` | `payment_transactions` | 3 | PASS |
| `ShipmentOrder` | `shipment_orders` | 3 | PASS |
| `ResourceRequirement` | `resource_requirements` | 1 | PASS |
| `ResourceAllocation` | `resource_allocations` | 1 | PASS |
| `PolicyVersion` | `policy_versions` | 0 | PASS |
| `OptimizationRun` | `optimization_runs` | 1 | PASS |
| `OptimizationDecision` | `optimization_decisions` | 1 | PASS |
| `UserBehaviorScore` | `user_behavior_scores` | 0 | PASS |
| `BehaviorEventLog` | `behavior_event_logs` | 0 | PASS |

`_prisma_migrations` is preserved as Prisma-managed metadata, queried with read-only SQL, and intentionally not exposed as an application model.

## C. Physical table/column mapping

Every application model uses its existing physical table through `@@map`. All **336 application columns** retain their existing physical names, types, timestamp precision (3), nullability and defaults. Including migration metadata, the catalog contains 344 columns.

The complete field inventory, ordered column definitions, defaults, enum labels, FK targets/actions and index definitions are recorded in `BATCH1B_VERIFICATION.json`. Section A.4 of `BATCH0_BASELINE.md` remains the human-readable physical field inventory.

| Important mapping | Reconciled Prisma representation | Physical storage |
|---|---|---|
| Account security/profile | `User.passwordHash/fullName/isActive/studentId` | Same camelCase column names |
| Requester | `Booking.requestedById`, relation `requestedBy` | `bookings.requestedById` -> `users.id` |
| Approval actor | `Booking.approvedById`, relation `approvedBy` | Nullable `bookings.approvedById` |
| Booking time | `Booking.startAt/endAt` | Existing `timestamp(3) without time zone` |
| Condition evidence | `Booking.handoverCondition/returnCondition`; `UsageLog.conditionBefore/conditionAfter` | Existing nullable text; no synthetic reports |
| Actual usage | `Booking.actualStartAt/actualEndAt` | Existing nullable timestamps |
| Resource specification | `Resource.specs` | Existing non-null JSONB default `{}` |
| Operational authority | `Resource.operationalStatus` | Existing `OperationalStatus` column/enum |
| Compatibility status | `Resource.status` | Existing `ResourceStatus` column/enum |
| Telemetry | `TelemetrySample` | Existing real metrics, temperature/source/sample time; no humidity column invented |
| Payments | `PaymentTransaction` | Existing `payment_transactions`; not nonexistent VietQR tables |

No approval timestamp, returned timestamp, condition-report table, category/subtype column, or staff-scope table has been silently added.

## D. Role mapping

The generated Prisma role contract is exactly:

| Prisma/client value | Current PostgreSQL label | Future physical normalization |
|---|---|---|
| `ADMIN` | `admin` | `ADMIN` |
| `LAB_STAFF` | `lab_staff` | `LAB_STAFF` |
| `LECTURER` | `lecturer` | `LECTURER` |
| `STUDENT` | `student` | `STUDENT` |

1B uses enum-value `@map`; no database enum was mutated. A later reviewed enum-label rename must be released with removal of these mappings from the matching Prisma client. No `INSTRUCTOR`, `RESEARCHER`, or lowercase client alias remains.

Read proof: the five users decode as `ADMIN=2`, `LAB_STAFF=1`, `STUDENT=2`. There are no lecturer rows, so `LECTURER` was checked against enum metadata, not a fabricated fixture.

The permission matrix from assignment-gap section 4.2 remains unchanged. Schema reconciliation does not implement RBAC; lowercase role checks/writes in existing routes and seeds require a later application cutover.

## E. Booking status mapping

Final canonical business state machine remains exactly:
`PENDING_APPROVAL -> CONFIRMED -> CHECKED_OUT -> RETURNED -> COMPLETED`,
with `REJECTED` and `CANCELLED` exits under section 4.1 rules. Rejection is only from pending; cancellation is from pending/confirmed; the three final outcomes are terminal. Payment never blocks this lifecycle.

1B deliberately distinguishes the **current persistence bridge** from the **final seven-state lifecycle**:

| Physical DB label | Prisma bridge value in 1B | Final meaning / 1C action |
|---|---|---|
| `pending` | `PENDING_APPROVAL` | Normalize to `PENDING_APPROVAL` |
| `approved` | `CONFIRMED` | Normalize to `CONFIRMED` |
| `checked_out` | `CHECKED_OUT` | Normalize to `CHECKED_OUT` |
| Not present | Not declared | Add `RETURNED` only with a real forward migration |
| `completed` | `COMPLETED` | Preserve terminal meaning |
| `rejected` | `REJECTED` | Preserve terminal meaning |
| `cancelled` | `CANCELLED` | Preserve terminal meaning |
| `no_show` | `LEGACY_NO_SHOW` | Preserve unchanged until outcome/event migration is explicitly approved |

The latest Batch 1B instruction fixes historical `pending -> PENDING_APPROVAL`; this supersedes Batch 0's suggested conditional auto-confirmation of existing pending rows. No existing approval decision will be inferred from a resource's current policy. New bookings for no-approval resources will enter `CONFIRMED` when the business service is implemented.

Current rows decode as `COMPLETED=1`, `CANCELLED=1`. Prisma preserves the current database default of physical `pending`; application creation must explicitly choose the correct state after policy evaluation.

### No-show evidence and decision

| Evidence | Finding |
|---|---|
| Restored `bookings` | 0 rows with physical status `no_show` |
| Restored `behavior_event_logs` | 0 `NO_SHOW` events |
| Restored `user_behavior_scores` | 0 rows with `noShowCount > 0` |
| `backend/src/routes/analytics.js:59,196,199,206` | Reads `no_show` for counts/rates/ranking; removing the concept would break analytics semantics |
| `backend/src/app.js` | Analytics router is not mounted in the active app |
| `backend/test/reputationScore.test.js:24` | Expects a `NO_SHOW` behavior event, but imports absent `prioritySchedulerService.js`; not working production evidence |
| `backend/src/services/policyEngine.js:47` | Defines a no-show penalty setting; does not prove detection/transition implementation |
| `frontend/src/components/QrCheckInModal.tsx:161` | Claims timed no-show release; source scan found no corresponding persisted detector in current backend |
| Current backend source search | No implemented writer of booking status `no_show` found |

Decision: **no-show is a separately preserved business outcome/event, not a normal reserving state and not proof of completion.** 1B retains it without conversion. Existing `BehaviorEventLog` has no booking FK, so it cannot be the sole authoritative booking event record.

Proposed next design: a nullable booking outcome `NO_SHOW`, accompanied by an immutable booking-linked audit action with detection time, rule/reason and responsible actor/service. Future policy may release an unused confirmed reservation into `CANCELLED` with that outcome, but this requires an explicit detection policy; it is not a historical migration assumption. Never map no-show to `COMPLETED` merely to fit an enum.

1C must preflight the actual target again. If any `no_show` rows exist, fail closed before replacing the enum and produce a preservation/mapping review. Do not silently coerce them, invent an approver, or claim `updatedAt` is a verified detection time. The verified zero-row snapshot can migrate to the final enum only with this guard and the preserved backup. Optional penalties remain outside the required graduation workflow.

## F. Resource category/subtype design

1B keeps the existing physical `Resource.type: ResourceType` and all eight labels unchanged, including optional `ResourceRequirement.resourceType`.

For 1C, use two independent concepts:

- `category`: assignment-level `ROOM | EQUIPMENT | MACHINE | EXPERIMENT_KIT | MATERIAL`.
- `subtype`: technical specialization. Reuse physical `resources.type` via a future Prisma `subtype @map("type")`; retain physical enum `ResourceType`. This avoids duplicate subtype storage. Client names may be uppercase via enum-value mappings.

Only category needs a new physical column. Do not overwrite GPU/UAV/camera information with a broad category. Research requirements continue referencing the existing technical vocabulary.

| Current technical type | Count | Proposed category | Subtype retained |
|---|---:|---|---|
| `room` | 1 | `ROOM` | `ROOM` |
| `gpu_server` | 3 | `MACHINE` | `GPU_SERVER` |
| `camera` | 1 | `EQUIPMENT` | `CAMERA` |
| `uav` | 2 | `EQUIPMENT` | `UAV` |
| `raspberry_pi` | 2 | Record-level review | `RASPBERRY_PI` |
| `kit` | 0 | `EXPERIMENT_KIT` | `KIT` |
| `material` | 0 | `MATERIAL` | `MATERIAL` |
| `other` | 0 | Manual classification | `OTHER` |

`RPI-KIT-05` appears to be an experiment kit from its existing seed definition; `EDGE-RPI5-01` needs inventory confirmation. Add category nullable with no fabricated default, backfill evidence-backed records, and enforce required category only after ambiguous records are resolved. Do not invent material stock quantity/unit or shared-capacity semantics from `capacity` alone.

## G. Resource status authority decision

**The single authoritative operational field is `Resource.operationalStatus`.**

Its Prisma values are exactly:
`AVAILABLE`, `IN_USE`, `MAINTENANCE`, `CALIBRATION`, `BROKEN`, `RETIRED`, `OFFLINE`.
1B maps these to the existing lowercase PostgreSQL labels.

`Resource.status` is a deprecated compatibility field retained physically in 1B. `reserved` is never an operational value. `Resource.bookingState` is a separate policy control; it also cannot replace operational state or scheduled availability.

Example:

- `operationalStatus = AVAILABLE`.
- Active booking from 14:00 to 16:00.
- `availability(15:00) = RESERVED`, while the physical state remains `AVAILABLE` until actual handover.
- At 16:00 the half-open booking interval ends, subject to maintenance, policy, actual unreturned use and other reservations.

Availability must be derived for a time/interval from operational eligibility, bookingState/policy, active booking overlap and maintenance. It is never persisted by setting `Resource.status = reserved`. Physical `IN_USE` comes from actual use/handover, not from a future booking. An overdue unreturned resource must not become available solely because planned `endAt` elapsed.

### Why the existing split is unsafe

| Reader/writer | Existing behavior |
|---|---|
| `backend/src/services/availabilityService.js:7,90,126,193` | Reads compatibility status and blocks only maintenance/offline |
| `backend/src/services/bookingService.js:77` | Checks compatibility status for maintenance |
| `backend/src/services/conflictService.js:56,64,72` | Reads operationalStatus |
| `backend/src/services/alternativeService.js:23,84` | Mixed fallback plus operational-status filtering |
| `backend/src/routes/analytics.js:53,105` | Uses operationalStatus |
| `backend/src/routes/resources.js:115` | Writes status only; its accepted enum values also drift |
| `frontend/src/components/MissionControlOverview.jsx:72,83` | Opposite field-precedence rules within one component |
| `frontend/src/components/LabFloorplan.jsx:107` | Falls back between both fields |
| `backend/scripts/importResources.js:27` | Allows reserved as an imported physical status |

The restore confirms `UAV-M350-RTK-01` has `status=maintenance` but `operationalStatus=available`. Declaring authority in documentation does not repair this row or those readers; 1B does not claim that enforcement is already complete.

### Backfill and cutover

1. Export/review every conflicting pair before mutation. Matching physical values need no correction; `reserved` requires booking-based review, never a direct physical-state conversion.
2. For the observed UAV mismatch, propose keeping it unbookable and setting authority to `MAINTENANCE` with a recorded reconciliation reason, pending staff verification. Do not silently discard the maintenance signal or claim a verified repair. Actual correction belongs to reviewed 1C data operations.
3. Use one authorized backend operation to update operationalStatus, write status history and maintain any temporary compatibility projection in one transaction. Reject direct compatibility writes and reject reserved as an operation.
4. During transition, a compatibility projection may map unavailable states to legacy maintenance/offline for old readers; it must never become a second independent input. Physical safety uncertainty remains blocked.
5. Update availability, booking, conflict, analytics, imports, assistant tools and notification/dashboard serializers to read the authority. Update frontend labels/actions and calendar availability to the separate fields in a later authorized application batch.
6. Test the mismatch, adjacent slots, future reservations on currently available resources, maintenance, actual handover, and overdue returns. Only then retire compatibility reads/writes; dropping the column is a separate future migration.

## H. Relation/FK verification

The verifier compares Prisma's generated DMMF against PostgreSQL for table names, all scalar fields, nullability, enum types/labels, default values, timestamps, PK/unique/index columns and each relation's target/column/actions. Referential actions are explicit in the reconciled schema. All 44 physical FKs were matched one-to-one; all are validated; orphan checks return zero.

| Prisma relation | Physical FK | ON DELETE | ON UPDATE |
|---|---|---|---|
| `Building.campus` | `buildings_campusId_fkey` | Cascade | Cascade |
| `Laboratory.building` | `laboratories_buildingId_fkey` | Cascade | Cascade |
| `LabPolicy.laboratory` | `lab_policies_laboratoryId_fkey` | Cascade | Cascade |
| `Resource.laboratory` | `resources_laboratoryId_fkey` | SetNull | Cascade |
| `ResourceCapability.resource` | `resource_capabilities_resourceId_fkey` | Cascade | Cascade |
| `ResourceStatusHistory.resource` | `resource_status_history_resourceId_fkey` | Cascade | Cascade |
| `TrainingRequirement.resource` | `training_requirements_resourceId_fkey` | Cascade | Cascade |
| `TrainingRequirement.course` | `training_requirements_courseId_fkey` | Cascade | Cascade |
| `UserCertification.user` | `user_certifications_userId_fkey` | Cascade | Cascade |
| `UserCertification.course` | `user_certifications_courseId_fkey` | Cascade | Cascade |
| `Booking.resource` | `bookings_resourceId_fkey` | Cascade | Cascade |
| `Booking.requestedBy` | `bookings_requestedById_fkey` | Restrict | Cascade |
| `Booking.approvedBy` | `bookings_approvedById_fkey` | SetNull | Cascade |
| `MaintenanceWindow.resource` | `maintenance_windows_resourceId_fkey` | Cascade | Cascade |
| `MaintenanceWindow.createdBy` | `maintenance_windows_createdById_fkey` | SetNull | Cascade |
| `Incident.resource` | `incidents_resourceId_fkey` | Cascade | Cascade |
| `Incident.booking` | `incidents_bookingId_fkey` | SetNull | Cascade |
| `Incident.reportedBy` | `incidents_reportedById_fkey` | Restrict | Cascade |
| `Incident.assignedTo` | `incidents_assignedToId_fkey` | SetNull | Cascade |
| `IncidentComment.incident` | `incident_comments_incidentId_fkey` | Cascade | Cascade |
| `UsageLog.resource` | `usage_logs_resourceId_fkey` | Cascade | Cascade |
| `UsageLog.booking` | `usage_logs_bookingId_fkey` | Cascade | Cascade |
| `UsageLog.user` | `usage_logs_userId_fkey` | Restrict | Cascade |
| `Notification.user` | `notifications_userId_fkey` | Cascade | Cascade |
| `TelemetrySample.resource` | `telemetry_samples_resourceId_fkey` | Cascade | Cascade |
| `KnowledgeDocument.resource` | `knowledge_documents_resourceId_fkey` | SetNull | Cascade |
| `KnowledgeDocument.laboratory` | `knowledge_documents_laboratoryId_fkey` | SetNull | Cascade |
| `KnowledgeChunk.document` | `knowledge_chunks_documentId_fkey` | Cascade | Cascade |
| `AiMessage.conversation` | `ai_messages_conversationId_fkey` | Cascade | Cascade |
| `PaymentTransaction.booking` | `payment_transactions_bookingId_fkey` | SetNull | Cascade |
| `PaymentTransaction.user` | `payment_transactions_userId_fkey` | Cascade | Cascade |
| `ShipmentOrder.booking` | `shipment_orders_bookingId_fkey` | SetNull | Cascade |
| `ShipmentOrder.resource` | `shipment_orders_resourceId_fkey` | SetNull | Cascade |
| `ShipmentOrder.user` | `shipment_orders_userId_fkey` | Cascade | Cascade |
| `ResourceRequirement.user` | `resource_requirements_userId_fkey` | Cascade | Cascade |
| `ResourceRequirement.booking` | `resource_requirements_bookingId_fkey` | SetNull | Cascade |
| `ResourceAllocation.requirement` | `resource_allocations_requirementId_fkey` | SetNull | Cascade |
| `ResourceAllocation.booking` | `resource_allocations_bookingId_fkey` | SetNull | Cascade |
| `ResourceAllocation.resource` | `resource_allocations_resourceId_fkey` | Cascade | Cascade |
| `ResourceAllocation.optimizationRun` | `resource_allocations_optimizationRunId_fkey` | SetNull | Cascade |
| `OptimizationRun.policyVersion` | `optimization_runs_policyVersionId_fkey` | SetNull | Cascade |
| `OptimizationDecision.optimizationRun` | `optimization_decisions_runId_fkey` | Cascade | Cascade |
| `UserBehaviorScore.user` | `user_behavior_scores_userId_fkey` | Cascade | Cascade |
| `BehaviorEventLog.score` | `behavior_event_logs_scoreId_fkey` | Cascade | Cascade |

There are 96 live indexes: 94 represented by application-model PKs/unique/index declarations, one metadata PK, and the exclusion constraint's GiST index. The last two remain present and unchanged; Prisma does not express the exclusion constraint. Its checked definition is:

```sql
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status IN ('pending', 'approved', 'checked_out'))
```

Fields without actual FKs remain scalar: `IncidentComment.authorId`, `ResourceStatusHistory.changedById`, `UserCertification.issuedById`, `PolicyVersion.createdById`, `AiConversation.userId`, and `OptimizationDecision.allocationId`. Fabricating Prisma relations for them would misrepresent live integrity; additive constraints require prior orphan checks in a later migration.

Existing cascade behavior is preserved, not endorsed as final audit-retention policy. Resource/booking deletion currently cascades into history. Archival, restricted deletion and append-only audit controls need an explicit follow-up design.

## I. Missing canonical fields requiring Batch 1C migration

| Capability | Existing evidence | Required next decision/addition |
|---|---|---|
| Returned state | Absent in physical BookingStatus | Add real `RETURNED` and include it in overlap predicate |
| Approval/return/completion time | approvedById and actualStartAt/actualEndAt exist | Nullable `approvedAt`, `returnedAt`, `completedAt` if required for lifecycle evidence; do not reconstruct unknown history |
| No-show outcome | Legacy status; behavior logs without booking FK | Separate nullable booking outcome and booking-linked event action; explicit policy and nonzero-row guard |
| Transition audit | UsageLog has actor/time/action and booking FK | Add return/completion/no-show actions and structured from/to state, reason, metadata if used as canonical transition log |
| Condition provenance | Free text on Booking and UsageLog | Formalize immutable before/after reports with actor/time/booking linkage; reuse/extend UsageLog where sufficient, avoid duplicate authority |
| Resource taxonomy | Technical type exists | New nullable category, preserve type as subtype, review ambiguous backfill |
| Status reconciliation | Two fields; one conflicting row | Audited correction plus one-writer cutover; keep compatibility column |
| Time-range validity | No CHECK constraints | Add booking and maintenance `startAt < endAt` checks |
| Telemetry | No humidity/lab-level identity/event payload | Nullable humidity and verified-event metadata; resource already links to lab, add direct lab ingestion only when required; no synthetic samples |
| Staff lab scope | No persisted staff membership | Required authorization gap; design minimal scoped assignment persistence before multi-lab operational access |
| Notification semantics | free-text type, scheduledAt/sentAt exist | Define approval/upcoming/return-reminder types and delivery idempotency; do not create competing notification models |
| IDs/update timestamps | text IDs; some timestamps lack defaults | Choose a client/server generation convention and test create/update paths before a runtime release |

1C core migrations must be limited to fields necessary for the approved required workflows. Detailed sensor/camera/alert persistence for Smart Monitoring belongs after the core graduation demo. Research models remain preserved without expanding their behavior.

## J. Preserved optional/advanced tables

Preserved intact: `payment_transactions`, `shipment_orders`, `knowledge_documents`, `knowledge_chunks`, `ai_conversations`, `ai_messages`, `resource_requirements`, `resource_allocations`, `policy_versions`, `optimization_runs`, `optimization_decisions`, `user_behavior_scores`, `behavior_event_logs`.

Their rows, existing enums, JSON fields, indexes and actual relations are represented in Prisma. No payment dependency is added to booking. No AI, Digital Twin, Pareto, GA/NSGA-II or simulation work was prioritized. A schema model's presence does not imply its current module is usable or enabled.

## K. Prisma checks and read-smoke results

| Check | Result |
|---|---|
| Restore introspection | Read-only `prisma db pull --print`; no schema write from introspection |
| `prisma format` | PASS |
| `prisma validate` | PASS |
| `prisma generate` | PASS, Prisma Client 6.19.3 |
| Model reads | 31/31 pass; no P2022 |
| Relation reads | 88 query shapes pass |
| Scalar catalog comparison | 336/336 application columns; physical types, defaults, precision and nullability match |
| Enums | 15 types, 78 physical labels/order matched |
| FKs | 44/44 exact targets/actions, zero orphans |
| Application indexes | 94/94 represented; metadata PK and GiST guard independently retained |
| Restore fingerprint | Catalog and per-table content digests unchanged from before generation/read smoke |
| Historical SQL hashes | All seven migration.sql files unchanged |
| Source database changes | None issued |
| Migration resolution, DDL, seeds or db push | None executed |

Reproducible read-only verification from `backend`:

```powershell
node scripts/verifySchemaReconciliation.mjs --verify
```

The script derives credentials from local configuration but replaces the database path with the exact approved restore name before connecting. It allows only localhost/127.0.0.1, sets `default_transaction_read_only=on`, opens a repeatable-read read-only transaction, asserts database identity/version, and never imports application routes/services. Existing evidence is required for verification; initial capture refuses to overwrite a baseline. Output contains metadata, counts and content digests, not credentials or personal rows.

Evidence: `docs/BATCH1B_VERIFICATION.json`. This is generated verification metadata, not a database dump. The read-only checker is `backend/scripts/verifySchemaReconciliation.mjs`.

These tests prove schema/client read compatibility with the verified restore. They do not prove write workflow correctness, concurrency behavior, RBAC or application compatibility. The full backend suite was not run because 1B authorizes read-only persistence checks; concurrency/upgrade/clean-DB tests belong to 1D.

## L. Exact proposed Batch 1C migration operations

**This section is a proposal only. No reconciliation SQL file was created or executed in 1B.**

1. Recheck dump checksum and recapture the chosen test target's rows, enum distribution, conflicts and migration history. Assert correct target identity, backup availability and no unexpected row types.
2. Draft the missing-history reconciliation path. Seven files exist, five are recorded; guard and orchestration objects were created out of band. Compare each pending migration's complete postconditions, not just table existence. Draft supported migration-resolution instructions for later approval; never modify old SQL/checksums or blindly resolve partial matches.
3. Add forward DDL capable of creating the 19 missing application tables on the clean-migration path while strictly verifying and preserving equivalent objects on the upgrade path. Preserve all optional tables and 44 FKs. Unexpected existing shapes must abort. Run reconciliation only after resolving the pending-object collision in the test upgrade runbook.
4. Normalize physical Role labels with an explicit four-label rename map; normalize all seven OperationalStatus labels and all columns using that enum, including history. Publish the paired Prisma revision without stale @map labels. Keep ResourceStatus compatibility values/column through cutover.
5. Prepare the canonical booking enum. Assert no unresolved `no_show` rows; if nonzero, abort without conversion. Retain no-show meaning through approved outcome/event design. Add `RETURNED`, explicitly map the other six labels, remove no payment values because they were never physically present, and preserve IDs/ownership/times.
6. Separate enum preparation and statements using new labels into safe transaction stages where required. Do not attempt to use an uncommitted new enum value in a constraint. A table lock or controlled writer pause must cover replacement of the overlap guard; no unguarded write window.
7. Install the GiST exclusion constraint on existing `resourceId/startAt/endAt` with half-open ranges and the four canonical reserving states. Preserve btree_gist and required indexes; add named interval validity CHECKs for booking and maintenance after auditing existing ranges. A cross-table booking/maintenance race requires a common resource-lock protocol or unified reservation design in the implementation; this exclusion constraint alone cannot prevent it.
8. Add ResourceCategory and a nullable category column without a fabricated default. Backfill reviewed classifications; preserve physical `type` as subtype. Stop before a NOT NULL change if any classification remains unresolved. Preserve optional research type semantics.
9. Draft the audited correction for `UAV-M350-RTK-01` and a temporary one-way compatibility projection. Require approval of the evidence-backed row correction before applying it. Never reinterpret legacy reserved as a physical operational state.
10. Add only the approved lifecycle/audit/condition fields from section I, with nullable historical fields and explicit provenance for any backfill. Preserve original condition text. No actor/time may be invented. Freeze ID/timestamp generation before write tests.
11. Add the minimal humidity/verified-telemetry fields when included in the approved batch; no seed measurements. Keep camera/smoke/sensor hardware extension outside 1C.
12. Draft separate clean-DB and restored-upgrade runbooks plus rollback checks. Definition of success includes all rows/IDs retained, model reads, canonical writes, negative FK/enum/range checks and real concurrent-overlap tests in **1D**. Source development application occurs only after those pass and receives separate approval.

The unsafe combined-deploy pattern `migrate deploy -> applyBookingGuard.js -> seedAdmin.js` must not be used for this cutover. The guard script still targets old labels and must be retired or made a verifier in an authorized subsequent implementation batch.

## M. Risks

| Risk | Consequence / control |
|---|---|
| Generated client uses canonical role/status names but consumers still use lowercase or removed fields | Do not deploy/restart the app as a 1B release. Update routes/services/seeds in an approved runtime cutover; preserve current user changes |
| RETURNED is documented but not physically present | Generated client intentionally cannot write it until 1C; no fake mapped alias |
| LEGACY_NO_SHOW still appears in the persistence bridge | It is not an extra canonical workflow state; no silent conversion; migrate only with reviewed outcome policy |
| Old enum mappings remain after physical label rename | Reads fail; schema/client and migration must ship as a coordinated pair |
| Two resource statuses conflict | Authority decision alone does not enforce safety; block uncertain resource at cutover and audit correction |
| Optional modules refer to removed five-model APIs | Advanced source is retained but remains disconnected until adapted; do not fabricate missing tables or success |
| Existing cascade FKs can erase history | Preserve current DB fidelity in 1B; use archival/restricted deletion and audited retention design before exposing deletes |
| Text IDs/updateAt require explicit values | Read-only reconciliation does not establish create/update behavior; enforce generators/timestamps before writes |
| Timestamp columns are timezone-naive | Preserve them in 1B; document UTC storage contract and verify interpretation before any type conversion |
| Six resources have no laboratoryId | Scope backfill requires evidence; never grant broad staff ownership to hide missing data |
| Restore is a snapshot, not a continuously synchronized backup | Revalidate state and refresh backup before eventual source mutation if development data changes |
| Exclusion constraints are outside Prisma's expressible schema | Keep SQL migrations/catalog verification authoritative; never use db push as a deployment shortcut |
| Same-row read success is insufficient for empty models | No artificial fixtures inserted in 1B; exercise those write/enum cases in isolated 1D databases |

## N. GO / NO-GO recommendation

**GO to Batch 1C drafting after review; NO-GO to source database application or an application release.**

1B has restored an evidence-backed Prisma representation of every live application table, validated exact FK behavior, and proved read compatibility without database mutation. Canonical roles are exposed through mappings, operational authority is decided, no-show semantics are preserved, and absent canonical fields are explicitly deferred.

Repository changes in this batch are limited to:

- `backend/prisma/schema.prisma`
- `backend/scripts/verifySchemaReconciliation.mjs`
- `docs/BATCH1B_VERIFICATION.json`
- `docs/BATCH1B_SCHEMA_RECONCILIATION.md`

Prisma Client was regenerated under ignored `node_modules`. Existing unrelated backend/frontend worktree changes were left intact. No migration file, source database, restored database data, frontend file or application service was changed by this batch.

Approved sequence remains: **1B schema reconciliation -> 1C forward migration authoring -> 1D clean/restore/concurrency/upgrade verification -> separately approved development DB application.**

Stop at 1B and wait for approval.
