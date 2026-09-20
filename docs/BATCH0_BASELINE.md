# Batch 0 - Baseline and Data Safety

Status: **FROZEN FOR REVIEW**
Snapshot time: **2026-09-17 (Asia/Saigon)**
Sources of truth: `PRODUCT.md`, the official assignment “Xây dựng hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm”, and `docs/ASSIGNMENT_GAP_ANALYSIS.md`.

This document records a read-only inspection. No schema, migration, application code, or database data was changed. No reset or destructive command was run. Secrets and row-level personal data are intentionally omitted.

## A. Actual DB snapshot summary

### A.1 Connection and engine

| Item | Observed value |
|---|---|
| Environment | Local development Docker Compose |
| PostgreSQL server | PostgreSQL **16.14**, image `postgres:16-alpine` |
| Database | `lab_resources` |
| Database user | `lab_user` |
| Schemas | `public`, `information_schema`, `pg_catalog`, `pg_toast` |
| Persistent storage | Named Docker volume `postgres-data` |
| Database size | Approximately **10 MB** |
| Extensions | `plpgsql 1.0`, `btree_gist 1.7` |
| Public tables | **32**, including `_prisma_migrations` |
| Public columns | **344** |
| PostgreSQL enum types | **15** |
| Indexes | **96** |
| Constraints | **77** |
| Foreign keys | **44** |

The database is reachable and internally consistent for the checks performed. There are no invalid booking ranges, orphan booking-to-resource relations, orphan booking requesters, blank core resource codes, blank user emails, or currently overlapping active booking pairs.

### A.2 Row counts

| Table | Rows | Table | Rows |
|---|---:|---|---:|
| `_prisma_migrations` | 5 | `ai_conversations` | 0 |
| `ai_messages` | 0 | `behavior_event_logs` | 0 |
| `bookings` | 2 | `buildings` | 1 |
| `campuses` | 1 | `incident_comments` | 0 |
| `incidents` | 0 | `knowledge_chunks` | 8 |
| `knowledge_documents` | 4 | `lab_policies` | 2 |
| `laboratories` | 2 | `maintenance_windows` | 0 |
| `notifications` | 10 | `optimization_decisions` | 1 |
| `optimization_runs` | 1 | `payment_transactions` | 3 |
| `policy_versions` | 0 | `resource_allocations` | 1 |
| `resource_capabilities` | 2 | `resource_requirements` | 1 |
| `resource_status_history` | 0 | `resources` | 9 |
| `shipment_orders` | 3 | `telemetry_samples` | 0 |
| `training_courses` | 2 | `training_requirements` | 1 |
| `usage_logs` | 6 | `user_behavior_scores` | 0 |
| `user_certifications` | 1 | `users` | 5 |

Observed business-data timestamps span **2026-08-03 through 2026-08-19**. This is a small development dataset, but it includes linked booking history, usage logs, notifications, payment records, training data, knowledge documents, policy/optimization data, and account records. It is therefore meaningful enough that it must not be discarded without an explicit owner decision and a verified backup.

### A.3 Current distributions and integrity facts

| Dimension | Observed values |
|---|---|
| User roles | `admin=2`, `lab_staff=1`, `student=2`, `lecturer=0` |
| Booking statuses | `completed=1`, `cancelled=1` |
| Resource types | `gpu_server=3`, `raspberry_pi=2`, `uav=2`, `camera=1`, `room=1` |
| Legacy resource status | `available=8`, `maintenance=1` |
| Operational resource status | `available=9` |
| Telemetry | 0 samples; there is no real telemetry to display |
| Active overlap pairs | 0 |
| Invalid booking intervals | 0 |

There is one confirmed status disagreement: resource `UAV-M350-RTK-01` is `maintenance` in legacy `resources.status` but `available` in `resources.operationalStatus`. Six of nine resources have no `laboratoryId`. These records require normalization, not deletion.

### A.4 Physical table and column inventory

The following is the exact public-table column inventory observed from `information_schema`. Disposition is defined in section C.

| Table | Observed columns |
|---|---|
| `_prisma_migrations` | `id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count` |
| `ai_conversations` | `id`, `userId`, `title`, `createdAt`, `updatedAt` |
| `ai_messages` | `id`, `conversationId`, `role`, `content`, `toolName`, `toolInput`, `toolOutput`, `createdAt` |
| `behavior_event_logs` | `id`, `scoreId`, `eventType`, `scoreDelta`, `previousScore`, `newScore`, `reason`, `metadata`, `createdAt` |
| `bookings` | `id`, `resourceId`, `requestedById`, `approvedById`, `title`, `purpose`, `startAt`, `endAt`, `status`, `notes`, `handoverCondition`, `returnCondition`, `createdAt`, `updatedAt`, `actualEndAt`, `actualStartAt`, `bookingCode`, `checkinDeadline`, `idempotencyKey`, `priority` |
| `buildings` | `id`, `campusId`, `name`, `code`, `createdAt` |
| `campuses` | `id`, `name`, `code`, `address`, `createdAt` |
| `incident_comments` | `id`, `incidentId`, `authorId`, `content`, `createdAt` |
| `incidents` | `id`, `resourceId`, `bookingId`, `reportedById`, `assignedToId`, `severity`, `status`, `category`, `title`, `description`, `detectedAt`, `resolvedAt`, `resolution`, `createdAt`, `updatedAt` |
| `knowledge_chunks` | `id`, `documentId`, `chunkIndex`, `content`, `metadata`, `embeddingJson`, `createdAt` |
| `knowledge_documents` | `id`, `resourceId`, `laboratoryId`, `title`, `sourceType`, `fileName`, `fileUrl`, `version`, `isActive`, `createdAt`, `updatedAt` |
| `lab_policies` | `id`, `laboratoryId`, `maxBookingMinutes`, `minBookingMinutes`, `maxAdvanceBookingDays`, `checkInGraceMinutes`, `requiresApproval`, `allowWeekend`, `workDayStartHour`, `workDayEndHour`, `createdAt`, `updatedAt` |
| `laboratories` | `id`, `buildingId`, `name`, `code`, `description`, `capacity`, `openingTime`, `closingTime`, `isActive`, `createdAt`, `updatedAt` |
| `maintenance_windows` | `id`, `resourceId`, `createdById`, `kind`, `status`, `title`, `startAt`, `endAt`, `notes`, `createdAt`, `updatedAt`, `cost`, `vendor` |
| `notifications` | `id`, `userId`, `title`, `message`, `severity`, `readAt`, `createdAt`, `titleKey`, `messageKey`, `messageParams`, `channel`, `scheduledAt`, `sentAt`, `type` |
| `optimization_decisions` | `id`, `runId`, `allocationId`, `objectiveVector`, `paretoRank`, `crowdingDistance`, `explanation`, `createdAt` |
| `optimization_runs` | `id`, `algorithm`, `algorithmVersion`, `datasetVersion`, `policyVersionId`, `populationSize`, `generations`, `mutationRate`, `crossoverRate`, `objectiveWeights`, `metricsSummary`, `runtimeMs`, `createdAt` |
| `payment_transactions` | `id`, `bookingId`, `userId`, `txnRef`, `amount`, `currency`, `provider`, `status`, `bankCode`, `cardType`, `vnpResponseCode`, `vnpTransactionNo`, `paymentUrl`, `paidAt`, `description`, `createdAt`, `updatedAt` |
| `policy_versions` | `id`, `policyType`, `version`, `name`, `effectiveFrom`, `effectiveTo`, `configuration`, `isActive`, `createdById`, `createdAt`, `updatedAt` |
| `resource_allocations` | `id`, `requirementId`, `bookingId`, `resourceId`, `startAt`, `endAt`, `allocationStatus`, `optimizationRunId`, `totalScore`, `energyScore`, `fairnessScore`, `healthScore`, `explanation`, `createdAt`, `updatedAt` |
| `resource_capabilities` | `id`, `resourceId`, `key`, `value`, `unit`, `createdAt` |
| `resource_requirements` | `id`, `userId`, `bookingId`, `resourceType`, `minVramGb`, `minComputeTflops`, `requiredCapabilities`, `durationMinutes`, `deadline`, `maxCostVnd`, `priorityScore`, `projectUrgency`, `createdAt`, `updatedAt` |
| `resource_status_history` | `id`, `resourceId`, `fromStatus`, `toStatus`, `reason`, `changedById`, `createdAt` |
| `resources` | `id`, `code`, `name`, `type`, `location`, `status`, `ownerTeam`, `capacity`, `requiresApproval`, `specs`, `createdAt`, `bookingState`, `description`, `laboratoryId`, `manufacturer`, `model`, `operationalStatus`, `purchaseDate`, `serialNumber`, `updatedAt`, `version`, `warrantyExpiry` |
| `shipment_orders` | `id`, `bookingId`, `resourceId`, `userId`, `trackingCode`, `provider`, `status`, `fee`, `senderAddress`, `recipientName`, `recipientPhone`, `recipientAddress`, `expectedDelivery`, `deliveredAt`, `rawResponse`, `createdAt`, `updatedAt` |
| `telemetry_samples` | `id`, `resourceId`, `cpuPercent`, `gpuPercent`, `gpuMemoryPercent`, `ramPercent`, `diskPercent`, `temperatureC`, `online`, `source`, `sampledAt` |
| `training_courses` | `id`, `name`, `code`, `description`, `durationHours`, `isRequired`, `createdAt`, `updatedAt` |
| `training_requirements` | `id`, `resourceId`, `courseId`, `isMandatory`, `createdAt` |
| `usage_logs` | `id`, `resourceId`, `bookingId`, `userId`, `action`, `message`, `conditionBefore`, `conditionAfter`, `createdAt`, `messageKey`, `messageParams`, `ipAddress` |
| `user_behavior_scores` | `id`, `userId`, `currentScore`, `lateCancelCount`, `noShowCount`, `quotaBreachCount`, `cleanStreakDays`, `lastViolationAt`, `updatedAt` |
| `user_certifications` | `id`, `userId`, `courseId`, `status`, `issuedAt`, `expiresAt`, `issuedById`, `notes`, `createdAt`, `updatedAt` |
| `users` | `id`, `email`, `fullName`, `role`, `passwordHash`, `isActive`, `createdAt`, `department`, `phone`, `studentId`, `updatedAt` |

### A.5 Enum snapshot

| Enum | Actual values |
|---|---|
| `Role` | `admin`, `lab_staff`, `lecturer`, `student` |
| `ResourceType` | `room`, `gpu_server`, `raspberry_pi`, `uav`, `camera`, `kit`, `material`, `other` |
| `ResourceStatus` | `available`, `reserved`, `in_use`, `maintenance`, `offline` |
| `OperationalStatus` | `available`, `in_use`, `maintenance`, `calibration`, `broken`, `retired`, `offline` |
| `BookingState` | `bookable`, `restricted`, `non_bookable` |
| `BookingStatus` | `pending`, `approved`, `rejected`, `cancelled`, `checked_out`, `completed`, `no_show` |
| `UsageAction` | `request`, `approve`, `reject`, `check_out`, `check_in`, `status_change`, `telemetry`, `cancel`, `incident_reported` |
| `MaintenanceKind` | `maintenance`, `calibration` |
| `MaintenanceStatus` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `NotificationSeverity` | `info`, `success`, `warning`, `danger` |
| `IncidentSeverity` | `low`, `medium`, `high`, `critical` |
| `IncidentStatus` | `reported`, `triaged`, `assigned`, `investigating`, `resolved`, `verified`, `closed` |
| `CertificationStatus` | `pending`, `active`, `expired`, `revoked` |
| `PaymentStatus` | `pending`, `success`, `failed`, `refunded` |
| `ShipmentStatus` | `pending`, `picking`, `delivering`, `delivered`, `cancelled`, `returned` |

### A.6 Migration history

Five migrations are recorded as successfully applied. Their database checksums exactly match the checked-in `migration.sql` files:

| Migration | Recorded | Checksum match |
|---|---:|---:|
| `20260723000100_init` | Yes | Yes |
| `20260723000200_remove_resource_owner_default` | Yes | Yes |
| `20260723000300_require_explicit_resource_fields` | Yes | Yes |
| `20260727000100_add_i18n_message_keys` | Yes | Yes |
| `20260817000100_add_maintenance_windows` | Yes | Yes |
| `20260820000100_add_booking_guard_constraint` | **No** | File exists; equivalent constraint exists in DB |
| `20260820000200_add_orchestration_provenance_and_policy` | **No** | File exists; its tables/relations exist in DB |

`npx prisma migrate status` reports the last two migrations as pending. Running `prisma migrate deploy` now is unsafe: the orchestration migration would attempt to create tables that already exist. The live objects were most likely introduced by `prisma db push`, raw DDL, or another unrecorded process.

### A.7 Constraint, foreign-key, and index snapshot

The 77 PostgreSQL constraints consist of **32 primary keys**, **44 foreign keys**, and **1 exclusion constraint**. There are currently **no database check constraints**. Prisma-created uniqueness rules are represented as unique indexes rather than `pg_constraint` rows.

Core foreign keys observed:

| Table | Foreign keys |
|---|---|
| `bookings` | `bookings_resourceId_fkey`, `bookings_requestedById_fkey`, `bookings_approvedById_fkey` |
| `resources` | `resources_laboratoryId_fkey` |
| `buildings`, `laboratories`, `lab_policies` | `buildings_campusId_fkey`, `laboratories_buildingId_fkey`, `lab_policies_laboratoryId_fkey` |
| `usage_logs` | `usage_logs_resourceId_fkey`, `usage_logs_bookingId_fkey`, `usage_logs_userId_fkey` |
| `notifications` | `notifications_userId_fkey` |
| `telemetry_samples` | `telemetry_samples_resourceId_fkey` |
| `maintenance_windows` | `maintenance_windows_resourceId_fkey`, `maintenance_windows_createdById_fkey` |
| `incidents` | `incidents_resourceId_fkey`, `incidents_bookingId_fkey`, `incidents_reportedById_fkey`, `incidents_assignedToId_fkey` |
| Training/certification | `training_requirements_resourceId_fkey`, `training_requirements_courseId_fkey`, `user_certifications_userId_fkey`, `user_certifications_courseId_fkey` |
| Resource detail/history | `resource_capabilities_resourceId_fkey`, `resource_status_history_resourceId_fkey` |

All remaining foreign keys connect the preserved supporting/optional tables: knowledge documents/chunks, payments, shipments, requirements/allocations, optimization, AI messages, and behavior scores/events. They are classified **PRESERVE** pending the equivalence audit in Batch 1.

Exact index names by table:

| Table | Indexes |
|---|---|
| `_prisma_migrations` | `_prisma_migrations_pkey` |
| `users` | `users_pkey`, `users_email_key` |
| `campuses` | `campuses_pkey`, `campuses_code_key` |
| `buildings` | `buildings_pkey`, `buildings_code_key`, `buildings_campusId_idx` |
| `laboratories` | `laboratories_pkey`, `laboratories_code_key`, `laboratories_buildingId_idx` |
| `lab_policies` | `lab_policies_pkey`, `lab_policies_laboratoryId_key` |
| `resources` | `resources_pkey`, `resources_code_key`, `resources_laboratoryId_idx`, `resources_operationalStatus_idx`, `resources_bookingState_idx` |
| `resource_capabilities` | `resource_capabilities_pkey`, `resource_capabilities_resourceId_idx`, `resource_capabilities_resourceId_key_key` |
| `resource_status_history` | `resource_status_history_pkey`, `resource_status_history_resourceId_createdAt_idx` |
| `training_courses` | `training_courses_pkey`, `training_courses_code_key` |
| `training_requirements` | `training_requirements_pkey`, `training_requirements_resourceId_idx`, `training_requirements_resourceId_courseId_key` |
| `user_certifications` | `user_certifications_pkey`, `user_certifications_userId_courseId_key`, `user_certifications_userId_status_idx`, `user_certifications_userId_expiresAt_idx` |
| `bookings` | `bookings_pkey`, `bookings_bookingCode_key`, `bookings_idempotencyKey_key`, `bookings_idempotencyKey_idx`, `bookings_requestedById_idx`, `bookings_resourceId_startAt_endAt_idx`, `bookings_status_idx`, `bookings_no_active_overlap` |
| `usage_logs` | `usage_logs_pkey`, `usage_logs_resourceId_idx`, `usage_logs_bookingId_idx`, `usage_logs_userId_idx` |
| `notifications` | `notifications_pkey`, `notifications_userId_createdAt_idx`, `notifications_userId_readAt_idx` |
| `telemetry_samples` | `telemetry_samples_pkey`, `telemetry_samples_resourceId_sampledAt_idx` |
| `maintenance_windows` | `maintenance_windows_pkey`, `maintenance_windows_resourceId_startAt_endAt_idx`, `maintenance_windows_status_idx` |
| `incidents` | `incidents_pkey`, `incidents_resourceId_idx`, `incidents_reportedById_idx`, `incidents_status_idx` |
| `incident_comments` | `incident_comments_pkey`, `incident_comments_incidentId_idx` |
| `knowledge_documents` | `knowledge_documents_pkey`, `knowledge_documents_resourceId_idx` |
| `knowledge_chunks` | `knowledge_chunks_pkey`, `knowledge_chunks_documentId_idx` |
| `payment_transactions` | `payment_transactions_pkey`, `payment_transactions_txnRef_key`, `payment_transactions_bookingId_idx`, `payment_transactions_userId_idx`, `payment_transactions_status_idx` |
| `shipment_orders` | `shipment_orders_pkey`, `shipment_orders_trackingCode_key`, `shipment_orders_trackingCode_idx`, `shipment_orders_bookingId_idx`, `shipment_orders_userId_idx` |
| `resource_requirements` | `resource_requirements_pkey`, `resource_requirements_userId_idx`, `resource_requirements_bookingId_idx` |
| `resource_allocations` | `resource_allocations_pkey`, `resource_allocations_requirementId_idx`, `resource_allocations_bookingId_idx`, `resource_allocations_optimizationRunId_idx`, `resource_allocations_resourceId_startAt_endAt_idx` |
| `policy_versions` | `policy_versions_pkey`, `policy_versions_policyType_isActive_idx` |
| `optimization_runs` | `optimization_runs_pkey`, `optimization_runs_algorithm_idx`, `optimization_runs_policyVersionId_idx` |
| `optimization_decisions` | `optimization_decisions_pkey`, `optimization_decisions_runId_idx` |
| `ai_conversations` | `ai_conversations_pkey`, `ai_conversations_userId_idx` |
| `ai_messages` | `ai_messages_pkey`, `ai_messages_conversationId_idx` |
| `user_behavior_scores` | `user_behavior_scores_pkey`, `user_behavior_scores_userId_key`, `user_behavior_scores_userId_idx` |
| `behavior_event_logs` | `behavior_event_logs_pkey`, `behavior_event_logs_scoreId_createdAt_idx` |

The exclusion constraint is exactly:

```sql
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status IN ('pending', 'approved', 'checked_out'))
```

It currently matches `applyBookingGuard.js` and the legacy physical schema, but not the current five-model `schema.prisma` or the frozen canonical active states.

## B. Schema/migration drift matrix

| Area | Actual database | Current `schema.prisma` / migrations / guard | Classification | Consequence |
|---|---|---|---|---|
| Prisma model coverage | 31 application tables | Current schema has only 5 models | **P0 drift** | Prisma cannot represent most persisted domain data |
| Core column naming | Existing camelCase columns such as `passwordHash`, `resourceId`, `startAt` | Current schema maps to snake_case such as `password_hash`, `resource_id`, `start_time` | **P0 drift** | Normal runtime reads fail with Prisma `P2022` |
| Runtime proof | Actual `User` and `Booking` rows are readable in SQL | Current generated client looks for absent columns | **P0 confirmed** | `User.findFirst()` fails on `users.password_hash`; `Booking.findFirst()` fails on `bookings.resource_id` |
| Role model | DB has exact semantic roles in lowercase | Schema has uppercase `ADMIN`, `INSTRUCTOR`, `RESEARCHER`, `STUDENT` plus lowercase aliases and omits `LAB_STAFF`/`LECTURER` uppercase | **P0 drift** | Authentication/RBAC cannot share one contract |
| Resource taxonomy | DB has `ResourceType` and rich resource fields | Schema replaces it with `ResourceCategory` and fields not present in DB | **P0 drift** | Resource queries and writes are incompatible |
| Booking identity/time fields | `requestedById`, `startAt`, `endAt` | `userId`, `startTime`, `endTime` mapped to nonexistent snake_case | **P0 drift** | Core booking path cannot persist |
| Booking lifecycle | Legacy DB enum; terminal live rows only | Current schema introduces payment/check-in states and mixed aliases | **P0 drift** | Lifecycle conflicts with frozen assignment contract |
| Payment dependency | Separate optional `payment_transactions` table | Current schema makes `PENDING_PAYMENT` the booking default and expects `vietqr_transactions` | **P0 drift** | Payment incorrectly blocks core booking |
| Current-only models | No `vietqr_transactions` or `ai_efficiency_metrics` tables | Both models exist in current schema | **RETIRE** | `db push` would create speculative persistence |
| Missing migration provenance | 19 actual application tables are absent from all checked-in migrations | Previous 838-line schema in commit `9bdc755` closely matches the live DB | **P0 drift** | A fresh DB cannot reproduce the live schema |
| Pending migration state | Booking guard and orchestration objects exist | `_prisma_migrations` does not record their migrations | **P0 drift** | Deploy is not repeatable |
| Booking exclusion guard | Live DB and `applyBookingGuard.js` use `resourceId`, `startAt`, `endAt` | Guard does not match current schema and only blocks `pending`, `approved`, `checked_out` | **NORMALIZE** | It protects legacy live writes but not the frozen lifecycle; `RETURNED` is absent |
| Time range validity | Existing booking rows are valid | No DB `CHECK (startAt < endAt)` | **MIGRATE** | Invalid ranges can bypass application validation |
| Resource status | Both `status` and `operationalStatus` exist | They already disagree for one resource | **NORMALIZE** | Availability can report contradictory truth |
| Telemetry | Has resource, source, sample time, temperature and online; 0 rows | Missing humidity and verified event/safety signal structure | **MIGRATE** | Does not yet meet the minimal real telemetry contract |
| Handover/return | Booking text fields and usage logs exist | No dedicated immutable condition report with actor/time semantics | **MIGRATE** | Assignment evidence is incomplete |

The current `schema.prisma` was reduced from 838 lines to 97 model lines in commit `dccc12f`, while the named PostgreSQL volume retained the earlier domain. The live database and the earlier schema are the strongest persistence evidence; the current five-model schema must not be pushed to this database.

## C. Preserve/normalize/migrate/retire inventory

Definitions:

- **PRESERVE**: retain model, table, data, relation, and semantics unless a separately reviewed migration proves otherwise.
- **NORMALIZE**: retain data but converge naming/value semantics to the frozen contract.
- **MIGRATE**: add or transform persistence with an explicit backfill and verification.
- **RETIRE**: remove from the canonical contract; do not drop stored data until backup, dependency, and rollback checks pass.
- **UNKNOWN**: requires record-level or owner confirmation before choosing a transformation.

### C.1 Table/model inventory

| Table/model group | Classification | Decision |
|---|---|---|
| `_prisma_migrations` | **PRESERVE + NORMALIZE** | Preserve all five valid records. Reconcile the two out-of-band migrations only after object-equivalence checks; never edit checksums or silently rewrite history. |
| `users` | **PRESERVE + NORMALIZE** | Preserve identity/profile/security fields and rows. Normalize `Role` values to uppercase canonical values. |
| `campuses`, `buildings`, `laboratories`, `lab_policies` | **PRESERVE** | Required/supporting location and policy ownership domain. Six unassigned resources require later lab assignment. |
| `resources` | **PRESERVE + NORMALIZE + MIGRATE** | Preserve all rows and technical metadata. Normalize top-level type and status truth; retain detailed legacy type as subtype/metadata. |
| `resource_capabilities` | **PRESERVE** | Supporting technical lookup data. |
| `resource_status_history` | **PRESERVE + MIGRATE** | Required audit structure; keep it and ensure all future status changes write immutable history. |
| `training_courses`, `training_requirements`, `user_certifications` | **PRESERVE** | Directly supports policy/training checks. |
| `bookings` | **PRESERVE + NORMALIZE + MIGRATE** | Preserve IDs, ownership, time windows, history, and idempotency. Migrate statuses and constraints to the frozen state machine. |
| `usage_logs` | **PRESERVE + NORMALIZE** | Use as the canonical immutable transition/audit log initially; expand action vocabulary and actor/reason coverage. |
| Condition report persistence | **MIGRATE** | Add a structured before/after condition record or formally normalize the existing condition fields plus usage logs. Do not erase existing text. |
| `notifications` | **PRESERVE** | Required for approval, upcoming booking, and return reminders. |
| `maintenance_windows` | **PRESERVE + MIGRATE** | Keep; add range validity and ensure availability considers active windows. |
| `incidents`, `incident_comments` | **PRESERVE** | Required operational incident domain, currently empty. |
| `telemetry_samples` | **PRESERVE + MIGRATE** | Keep existing metrics; add humidity and optional verified signal/event payload. Never seed production telemetry. |
| `knowledge_documents`, `knowledge_chunks` | **PRESERVE** | Supporting SOP/document lookup; not a booking dependency. |
| `payment_transactions` | **PRESERVE, OPTIONAL** | Keep three records and table, but decouple from confirmation and the core demo. |
| `shipment_orders` | **PRESERVE, OPTIONAL_ADVANCED** | Keep data behind an optional feature flag; not assignment scope. |
| `resource_requirements`, `resource_allocations`, `policy_versions`, `optimization_runs`, `optimization_decisions` | **PRESERVE, OPTIONAL_ADVANCED** | Keep tables/data; Advanced/Research only and never block core booking. |
| `ai_conversations`, `ai_messages` | **PRESERVE, OPTIONAL_ADVANCED** | Keep structures; AI remains decision support and must not invent persistence facts. |
| `user_behavior_scores`, `behavior_event_logs` | **PRESERVE, OPTIONAL_ADVANCED** | Keep but isolate from core authorization and booking correctness. |
| Current Prisma `VietQrTransaction` / table `vietqr_transactions` | **RETIRE** | Table does not exist. Do not create it; existing optional payments live in `payment_transactions`. |
| Current Prisma `AiEfficiencyMetric` / table `ai_efficiency_metrics` | **RETIRE** | Table does not exist and is outside core scope. Do not create it in Batch 1. |

No existing physical table is approved for drop in Batch 1.

### C.2 Core field disposition

| Model | Fields | Classification and target |
|---|---|---|
| `User` | `id`, `email`, `fullName`, `passwordHash`, `isActive`, `studentId`, `department`, `phone`, timestamps | **PRESERVE** with existing physical names; do not mass-rename columns merely to match a new style. |
| `User` | `role` | **NORMALIZE** lowercase values to the four uppercase canonical values using an explicit enum migration. |
| `User` | `monthlyQuotaHours`, `usedQuotaHours`, `reputationScore` from current schema | **RETIRE from Batch 1 contract** because these columns do not exist. Quota can be designed later from policy evidence, not created to satisfy the speculative schema. |
| `Resource` | identity, code, name, lab, location, capacity, approval flag, specs, manufacturer/model/serial/warranty, timestamps, version | **PRESERVE**. |
| `Resource` | `type` | **MIGRATE** to the canonical top-level vocabulary while preserving legacy detail as subtype/metadata. |
| `Resource` | `status` and `operationalStatus` | **NORMALIZE** toward one authoritative operational status. Keep the legacy field through at least one compatibility release; resolve the observed disagreement explicitly. |
| `Resource` | `bookingState` | **PRESERVE** as a separate policy availability control (`BOOKABLE`, `RESTRICTED`, `NON_BOOKABLE`). |
| `Resource` | `ownerTeam` | **UNKNOWN**. Preserve data, but do not treat free text as an authorization boundary. Lab ownership is determined by `laboratoryId`. |
| `Resource` | current-schema `category`, `hourlyRateVnd`, `specsJson` | **RETIRE as current-schema aliases**. They do not exist physically; do not create them in the canonical core migration. |
| `Booking` | `id`, `resourceId`, `requestedById`, `approvedById`, `title`, `purpose`, `startAt`, `endAt`, notes, actual times, code, deadline, idempotency, priority, timestamps | **PRESERVE**. |
| `Booking` | `status` | **MIGRATE** to section D.2, with row-count and mapping assertions before enum replacement. |
| `Booking` | `handoverCondition`, `returnCondition` | **PRESERVE**, then **NORMALIZE** into auditable condition reporting without losing text. |
| `Booking` | current-schema `userId`, `startTime`, `endTime`, `totalPriceVnd`, `checkinCode`, `checkinAt`, `attendeesCount` | **RETIRE as canonical fields**. These are not physical live columns; optional arrival/payment data must not reshape the lifecycle. |
| `TelemetrySample` | current columns | **PRESERVE**. Advanced CPU/GPU/RAM/disk metrics remain optional real measurements. |
| `TelemetrySample` | `humidityPercent`, verified signal/event payload, ingestion identity | **MIGRATE**. Add nullable fields and validation; absence remains no data. |

### C.3 Resource type migration map

Canonical top-level types are exactly:

`ROOM`, `EQUIPMENT`, `MACHINE`, `EXPERIMENT_KIT`, `MATERIAL`.

| Legacy value | Rows | Canonical target | Detail preservation |
|---|---:|---|---|
| `room` | 1 | `ROOM` | Preserve room-specific details in `specs`/subtype |
| `gpu_server` | 3 | `MACHINE` | Preserve subtype `GPU_SERVER` |
| `camera` | 1 | `EQUIPMENT` | Preserve subtype `CAMERA` |
| `uav` | 2 | `EQUIPMENT` | Preserve subtype `UAV` |
| `raspberry_pi` | 2 | **UNKNOWN per record** | `RPI-KIT-05` is likely `EXPERIMENT_KIT`; `EDGE-RPI5-01` requires inventory confirmation before choosing `EQUIPMENT` or `EXPERIMENT_KIT` |
| `kit` | 0 | `EXPERIMENT_KIT` | Preserve detailed kit kind |
| `material` | 0 | `MATERIAL` | Preserve unit/stock metadata when added |
| `other` | 0 | **UNKNOWN** | Manual classification required; do not silently coerce |

### C.4 Enum and constraint disposition

| Item | Classification | Target |
|---|---|---|
| `Role` | **NORMALIZE** | `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT` only |
| `BookingStatus` | **MIGRATE** | Exact state set in D.2 |
| `ResourceType` | **MIGRATE** | Exact top-level vocabulary in D.4 |
| `OperationalStatus` | **NORMALIZE** | Uppercase API/Prisma values; preserve physical meaning |
| `ResourceStatus` | **RETIRE after compatibility period** | Backfill authoritative operational status first; no immediate drop |
| `BookingState` | **PRESERVE + NORMALIZE** | Uppercase canonical values, distinct from physical status |
| `UsageAction` | **NORMALIZE + MIGRATE** | Add complete request/approval/handover/return/completion/cancellation audit actions |
| Maintenance, notification, incident, certification enums | **PRESERVE** | Normalize API representation without blocking Batch 1 core migration |
| Payment, shipment enums | **PRESERVE, OPTIONAL** | Must not influence core booking state |
| All existing primary keys | **PRESERVE** | No key regeneration |
| All 44 existing foreign keys | **PRESERVE** unless an equivalence audit finds a defect | Maintain referential integrity and current delete semantics |
| Core unique indexes (`users.email`, `resources.code`, booking code/idempotency) | **PRESERVE** | Continue deterministic identity/idempotency protection |
| Schedule/history indexes | **PRESERVE** | Keep resource/time, requester, status, telemetry time, notification, and maintenance indexes |
| `bookings_no_active_overlap` | **NORMALIZE** | Rebuild after status migration for `[startAt,endAt)` and all active reserving states |
| Booking and maintenance range checks | **MIGRATE** | Add `CHECK (startAt < endAt)` |

## D. Canonical contracts

These contracts are frozen for Prisma, backend, frontend, tests, and documentation. Legacy aliases are migration inputs only; they are not permanent public values.

### D.1 Roles

Exactly four human roles are valid:

`ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`.

There is no `INSTRUCTOR`, `RESEARCHER`, lowercase duplicate, or inferred role in the canonical contract. A researcher who needs system access must be assigned one of the official roles according to institutional policy, usually `LECTURER` or `STUDENT`; the application must not invent a fifth core role.

### D.2 Booking state machine

| State | Meaning | Allowed next states |
|---|---|---|
| `PENDING_APPROVAL` | Persisted request awaiting authorized approval because the resource requires it | `CONFIRMED`, `REJECTED`, `CANCELLED` |
| `CONFIRMED` | Valid reservation; no-approval resources enter here directly | `CHECKED_OUT`, `CANCELLED` |
| `CHECKED_OUT` | Handover and before-use condition are complete | `RETURNED` |
| `RETURNED` | Resource and after-use condition were received; final confirmation pending | `COMPLETED` |
| `COMPLETED` | Lifecycle and return confirmation complete | Terminal |
| `REJECTED` | Authorized operator rejected the pending request with a reason | Terminal |
| `CANCELLED` | Requester or operator cancelled under policy with actor/reason | Terminal |

Rules:

1. `requiresApproval=true` creates `PENDING_APPROVAL`; otherwise creation produces `CONFIRMED`.
2. Payment is a separate optional policy/transaction concern and is never a mandatory booking state.
3. QR arrival/check-in is an optional timestamped event, not a required state.
4. Every transition is server-validated and appended to audit history with actor and timestamp; reason/conditions are mandatory where applicable.
5. Active overlap states are exactly `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, and `RETURNED`.
6. Terminal states do not reserve time.
7. The database interval is half-open: `[startAt, endAt)`, allowing one booking to start exactly when another ends.

Legacy mapping:

| Legacy status | Canonical status |
|---|---|
| `pending` | `PENDING_APPROVAL` when approval is required; otherwise `CONFIRMED` |
| `approved` | `CONFIRMED` |
| `rejected` | `REJECTED` |
| `cancelled` | `CANCELLED` |
| `checked_out` | `CHECKED_OUT` |
| `completed` | `COMPLETED` |
| `no_show` | Do not map silently. Record a no-show audit outcome and migrate to `CANCELLED` only after policy confirmation. Current row count is zero. |

### D.3 Role/permission matrix

“Own” means `requestedById` or user-scoped data derived from the authenticated identity. “All” means the actor's authorized laboratory scope. Frontend visibility is never authorization.

| Required operation | `ADMIN` | `LAB_STAFF` | `LECTURER` | `STUDENT` |
|---|---:|---:|---:|---:|
| Sign in/read own profile | Own | Own | Own | Own |
| Create/deactivate users; assign roles | All | Deny | Deny | Deny |
| List resources/read status and schedule | All | All | All | All |
| Read usage/audit history | All | All | Own/relevant | Own/relevant |
| Create/update/archive resources | All | All | Deny | Deny |
| Change operational status | All | All | Deny | Deny |
| View maintenance | All | All | All | All |
| Manage maintenance | All | All | Deny | Deny |
| Create booking | Own or audited on-behalf | Own or audited on-behalf | Own | Own |
| View bookings | All | All | Own | Own |
| Approve/reject | All | All | Deny | Deny |
| Cancel | All with reason | All with reason | Own under policy | Own under policy |
| Record handover/before-use condition | All | All | Deny | Deny |
| Record return/after-use/final confirmation | All | All | Deny | Deny |
| Read/mark notifications | Own | Own | Own | Own |
| Report incident | All | All | Own submission | Own submission |
| Triage/resolve incident | All | All | Deny | Deny |
| View dashboard metrics | All | All | Scoped | Scoped |
| View audit trail | All | All | Own/relevant | Own/relevant |

Service credentials for telemetry ingestion are separate from human roles.

### D.4 Canonical API naming

1. Base prefix remains `/api`; collections use plural nouns: `/api/resources`, `/api/bookings`, `/api/laboratories`, `/api/notifications`, `/api/incidents`.
2. JSON fields use `camelCase`; Prisma model names use `PascalCase`. Existing physical camelCase columns are preserved with Prisma mapping where needed rather than mass-renamed.
3. Identifiers are opaque strings named `id`; foreign identifiers use `<entity>Id`, for example `resourceId`, `requestedById`, `laboratoryId`.
4. Timestamps use `<event>At`, ISO 8601 at the API boundary, and UTC serialization. Booking fields are `startAt` and `endAt`.
5. Public enum values use uppercase `SCREAMING_SNAKE_CASE` and exactly match shared contracts.
6. Query parameters use `camelCase`; time-range reads use `from` and `to` as ISO 8601 values.
7. Commands use explicit transition endpoints when they carry authorization/business semantics, for example `/api/bookings/:id/approve`, `/reject`, `/check-out`, `/return`, `/complete`, `/cancel`.
8. The authenticated actor is derived from the verified credential. Normal clients cannot submit `requestedById`, approver, audit actor, or ownership fields to impersonate another user.
9. One canonical route and field name is supported. Legacy aliases may exist only in a time-bounded adapter and must not be written back to canonical persistence.

### D.5 Error-code contract

Error response shape:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Human-readable localized message",
    "details": {},
    "requestId": "optional-correlation-id"
  }
}
```

Conventions:

- Codes are stable uppercase `SCREAMING_SNAKE_CASE`; UI logic keys on `code`, never on translated `message`.
- Prefix domain errors where useful: `AUTH_*`, `RESOURCE_*`, `BOOKING_*`, `POLICY_*`, `TELEMETRY_*`.
- Validation is `400`/`422`, unauthenticated `401`, forbidden/ownership failure `403`, not found `404`, state/conflict/idempotency conflict `409`, rate limit `429`, unexpected/internal/database unavailability `500`/`503`.
- Minimum frozen codes: `VALIDATION_ERROR`, `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `RESOURCE_UNAVAILABLE`, `BOOKING_NOT_FOUND`, `BOOKING_CONFLICT`, `BOOKING_INVALID_TRANSITION`, `BOOKING_POLICY_DENIED`, `BOOKING_TRAINING_REQUIRED`, `BOOKING_QUOTA_EXCEEDED`, `IDEMPOTENCY_CONFLICT`, `DATABASE_UNAVAILABLE`, `TELEMETRY_NO_DATA`.
- PostgreSQL exclusion violation SQLSTATE `23P01` maps deterministically to HTTP `409` + `BOOKING_CONFLICT`; it must never trigger mock success.

### D.6 Ownership rules

1. A user owns their profile, notifications, certifications, and bookings where `requestedById` equals the authenticated user ID.
2. Resources are owned operationally by a laboratory through `laboratoryId`, never by client-supplied `ownerTeam` text.
3. `LAB_STAFF` and `ADMIN` actions are limited to authorized lab scope. The current DB has no staff-to-lab membership model, so multi-lab scope enforcement remains **UNKNOWN** until a membership/policy decision is implemented. It must not be faked with UI filtering.
4. On-behalf booking creation must store both requester and acting operator in immutable audit history.
5. Approver, handover actor, return actor, incident resolver, status changer, and audit actor come from server-side identity, not request payload ownership fields.
6. Usage/transition history is append-only from normal application paths. Corrections require an audited compensating event.
7. Telemetry belongs to the referenced resource/lab and requires a separate authenticated ingestion identity with source validation.
8. Payment, AI, optimization, and shipment records may reference core records but never own or override booking authorization/state.

### D.7 Minimal real telemetry contract

Each accepted sample has: `resourceId` and/or `laboratoryId`, authenticated `source`, `sampledAt`, nullable real `temperatureC`, nullable real `humidityPercent`, explicit `online`, and optional verified safety/event signals. Freshness is derived from `sampledAt`; UI states are `HEALTHY`, `WARNING`, `STALE`, `UNAVAILABLE`, and `NO_DATA`. The current database has zero samples, so its truthful state is `NO_DATA`.

## E. Data preservation decision

### Decision: **DO NOT RESET THE CURRENT DEVELOPMENT DATABASE**

Evidence:

1. The database uses a persistent named volume and contains related data across 22 non-empty tables (including migration metadata), including users, bookings, audit logs, notifications, training, payment, knowledge, and optimization data.
2. Five migration checksums are valid, but 19 application tables have no complete checked-in migration provenance.
3. The current seed scripts and current generated Prisma Client do not match the live schema, so the dataset is not reliably reproducible by running the repository as it stands.
4. Although values and scale strongly suggest development/demo seed data, there is no owner declaration that it is disposable.
5. Resetting would destroy the best available evidence for reconstructing the intended domain and upgrade path.

Preservation requirement before Batch 1 DDL:

- Create a custom-format `pg_dump` with timestamp and database identity outside the repository.
- Record a SHA-256 checksum and row-count manifest.
- Restore it into a separate temporary PostgreSQL 16 database.
- Re-run core row counts, FK/orphan checks, enum inventory, and booking constraint inspection against the restored copy.
- Keep the original volume untouched until both clean-database and snapshot-upgrade tests pass.

Reset may be reconsidered only after the project owner explicitly declares the data disposable **and** the canonical migration/seed path reproduces every required graduation scenario. A small dataset is not, by itself, permission to reset.

## F. Migration strategy recommendation

### F.1 Reconciliation, not rebuild

1. Use the live introspection and commit `9bdc755` as reconstruction evidence for `schema.prisma`.
2. Restore all valid live models/relations in Prisma with readable model names and `@@map`/`@map` only where required. Preserve physical names in Batch 1.
3. Do not run `prisma db push` against the current database.
4. Do not edit the five valid historical migration files or their checksums.

### F.2 Repair migration provenance safely

1. Back up and restore-test first.
2. Compare every object created by `20260820000100` and `20260820000200` with the live definition, including columns, defaults, indexes, foreign keys, and exclusion predicate.
3. Only when equivalence passes, use Prisma's supported migration-resolution operation to mark those two migrations applied on this existing database. Do not insert/update `_prisma_migrations` manually.
4. If any object differs, create a documented corrective migration before resolution; do not claim equivalence.

### F.3 Add one forward reconciliation migration

Create `20260917000100_reconcile_canonical_persistence` as a reviewed, forward migration that supports both paths:

- **Existing DB upgrade:** verify/retain existing out-of-band tables, backfill canonical values, add missing fields/constraints, and preserve all rows.
- **Fresh DB:** after the seven existing migrations, create the 19 missing persisted tables/relations before applying canonical transformations.

Because the same migration must support objects that may already exist, guarded DDL must verify shape rather than blindly treating `IF NOT EXISTS` as success. Any incompatible pre-existing object must fail loudly.

### F.4 Canonical data transformations

1. Normalize roles to the four uppercase values without regenerating users.
2. Add a detailed resource subtype field before converting top-level `ResourceType`; manually resolve the two Raspberry Pi rows and six missing lab assignments.
3. Resolve `status` versus `operationalStatus`, recording the chosen correction in resource status history.
4. Migrate booking statuses through a temporary enum/cast with pre/post row-count assertions. Current two bookings map directly (`completed`, `cancelled`), but the migration must support all legacy values.
5. Add `RETURNED`; remove payment/check-in states and lowercase aliases from the canonical booking enum.
6. Recreate `bookings_no_active_overlap` over `resourceId` + `tsrange(startAt,endAt,'[)')` for `PENDING_APPROVAL`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`.
7. Add `CHECK (startAt < endAt)` for booking and maintenance ranges.
8. Add nullable telemetry humidity/verified-signal fields. Do not insert samples.
9. Preserve optional/advanced tables and isolate them from core workflow.

### F.5 Verification gates

- Migration from an empty PostgreSQL 16 database succeeds.
- Migration from a restored copy of this snapshot succeeds.
- Pre/post row counts and all core IDs match expected mappings.
- No FK orphan or invalid range appears.
- Prisma can read every preserved model without `P2022`.
- Two concurrent overlapping inserts produce exactly one success and one SQLSTATE `23P01`/`BOOKING_CONFLICT`.
- Adjacent half-open intervals both succeed.
- Terminal bookings do not block a later reservation.
- `prisma migrate status` reports no pending migration.

## G. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Current five-model schema can cause destructive `db push` or broken generated client | P0 Critical | Ban `db push` for shared DB; reconcile schema from live evidence first |
| Two migrations are physically present but not recorded | P0 Critical | Object-equivalence audit, backup, then supported `migrate resolve` |
| Fresh DB cannot recreate 19 live application tables | P0 Critical | Guarded forward reconciliation migration plus clean-DB test |
| Current runtime queries fail on nonexistent snake_case columns | P0 Critical | Regenerate Prisma Client only after schema reconciliation |
| Booking guard omits canonical `RETURNED` and current schema is incompatible | P0 Critical | Status migration followed by atomic exclusion-constraint rebuild |
| Enum conversion can lock tables or strand values | P1 High | Small transactional migration, preflight counts, explicit casts, rollback restore |
| Six resources lack lab ownership | P1 High | Preserve as staging records; require reviewed assignment before scoped RBAC |
| Two resource status fields disagree | P1 High | Choose one authority, record correction, retain compatibility field temporarily |
| Raspberry Pi top-level type is ambiguous | P1 High | Manual inventory classification; never infer both rows identically without evidence |
| Existing data appears seeded but is not fully reproducible | P1 High | Treat as preservable until owner declaration and restore test |
| Out-of-band tables may differ subtly from old Prisma schema | P1 High | Compare defaults, nullability, indexes, FKs, and enum values, not table names alone |
| `db:deploy` currently also runs out-of-band guard DDL and admin seed | P1 High | Make migration the sole DDL authority; separate explicit seed command |
| No telemetry rows exist | P2 Medium | Show `NO_DATA`; test contract with integration fixtures, never production fake samples |
| Optional payment/optimization data may couple to core code | P2 Medium | Preserve tables behind feature flags and add dependency tests |

## H. Exact files that would change in Batch 1

The proposed first implementation batch is limited to persistence reconciliation and its verification. Exact repository files:

| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Reconcile with verified live models and frozen contracts; preserve valid models/data |
| `backend/prisma/migrations/migration_lock.toml` | Add/confirm PostgreSQL migration provider metadata |
| `backend/prisma/migrations/20260917000100_reconcile_canonical_persistence/migration.sql` | New guarded forward migration, backfills, checks, enum normalization, and canonical booking guard |
| `backend/prisma/applyBookingGuard.js` | Retire out-of-band mutation behavior or convert to a non-mutating verification tool; migration becomes DDL authority |
| `backend/prisma/seedAdmin.js` | Use canonical uppercase role and fail clearly on schema/config errors |
| `backend/prisma/seedBookingPlatform.js` | Remove incompatible speculative five-model/payment-dependent seed behavior; seed only explicit development fixtures |
| `backend/scripts/importResources.js` | Validate canonical resource vocabulary and subtype mapping |
| `backend/package.json` | Separate migration, verification, and seeding; remove automatic out-of-band DDL/seed from deploy |
| `backend/test/persistenceMigration.test.js` | New clean-DB and snapshot-upgrade verification harness |
| `backend/test/bookingConcurrency.db.test.js` | New real PostgreSQL concurrent-overlap tests |

Operational actions that would change the development database, but not repository files, require separate approval: verified `pg_dump`, restore test, migration equivalence check, `prisma migrate resolve` for the two proven out-of-band migrations, and application of the new reconciliation migration.

Batch 1 must not modify frontend screens, remove advanced/research modules, or make payment a booking dependency.

## Batch 0 exit decision

Batch 0 documentation is complete. The persistence baseline is **not safe for reset** and **not safe for `db push` or immediate `migrate deploy`**. The recommended first implementation batch is: backup/restore validation, Prisma schema reconciliation, migration-history equivalence resolution, one additive canonical migration, and real PostgreSQL migration/concurrency tests.

Implementation must wait for explicit approval.
