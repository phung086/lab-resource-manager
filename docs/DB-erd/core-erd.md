# Core laboratory data relationships

Generated from [canonical Prisma schema](../../backend/prisma/schema.prisma).
Schema SHA-256 after LF normalization: `4dc989c5f96ddd607d43820514ef6023d2f3394e5f1d290666036bd93709d3a8`.
Run `npm run docs:erd` in `backend/`; CI verifies `docs:erd:check`.
This is a selected model projection, not a claim that only these tables exist.
Foreign keys and cardinalities come from the generated Prisma data model checked
against the source schema. The current schema contains 56 models.

## Required booking operations and persisted monitoring

```mermaid
erDiagram
    Campus {
        string id PK
        string code UK
    }
    Building {
        string id PK
        string campusId FK
        string code UK
    }
    Laboratory {
        string id PK
        string buildingId FK
        string code UK
    }
    LabPolicy {
        string id PK
        string laboratoryId FK,UK
    }
    User {
        string id PK
        string email UK
        Role role
    }
    UserLabAssignment {
        string userId PK,FK
        string laboratoryId PK,FK
    }
    Resource {
        string id PK
        string laboratoryId FK
        string code UK
        ResourceCategory category
        OperationalStatus operationalStatus
        ResourceStatus status
    }
    ResourceStatusHistory {
        string id PK
        string resourceId FK
    }
    TrainingCourse {
        string id PK
        string code UK
    }
    TrainingRequirement {
        string id PK
        string resourceId FK
        string courseId FK
    }
    UserCertification {
        string id PK
        string userId FK
        string courseId FK
        CertificationStatus status
    }
    Booking {
        string id PK
        string bookingCode UK
        string resourceId FK
        string requestedById FK
        string approvedById FK
        datetime startAt
        datetime endAt
        BookingStatus status
        string idempotencyKey UK
    }
    MaintenanceWindow {
        string id PK
        string resourceId FK
        string createdById FK
        MaintenanceStatus status
        datetime startAt
        datetime endAt
    }
    Incident {
        string id PK
        string resourceId FK
        string bookingId FK
        string reportedById FK
        string assignedToId FK
        string telemetrySourceId FK
        string telemetrySampleId FK
        string monitoringAlertId FK,UK
        IncidentStatus status
        string category
        datetime detectedAt
    }
    UsageLog {
        string id PK
        string resourceId FK
        string bookingId FK
        string userId FK
        UsageAction action
    }
    Notification {
        string id PK
        string userId FK
        string dedupeKey UK
    }
    TelemetrySource {
        string id PK
        string code UK
        string laboratoryId FK
        string resourceId FK
    }
    TelemetrySample {
        string simulationRunId FK
        string id PK
        string resourceId FK
        string sourceId FK
    }
    MonitoringAlert {
        string id PK
        string activeDedupeKey UK
        string sourceId FK
        string resourceId FK
        string laboratoryId FK
        string sampleId FK
        MonitoringAlertStatus status
        string acknowledgedById FK
    }
    SystemAuditEvent {
        string id PK
        string actorId FK
        string action
        string labId FK
        string resourceId FK
    }
    Campus ||--o{ Building : "campusId"
    Building ||--o{ Laboratory : "buildingId"
    Laboratory ||--o| LabPolicy : "laboratoryId"
    User ||--o{ UserLabAssignment : "userId"
    Laboratory ||--o{ UserLabAssignment : "laboratoryId"
    Laboratory |o--o{ Resource : "laboratoryId"
    Resource ||--o{ ResourceStatusHistory : "resourceId"
    Resource ||--o{ TrainingRequirement : "resourceId"
    TrainingCourse ||--o{ TrainingRequirement : "courseId"
    User ||--o{ UserCertification : "userId"
    TrainingCourse ||--o{ UserCertification : "courseId"
    Resource ||--o{ Booking : "resourceId"
    User ||--o{ Booking : "requestedById"
    User |o--o{ Booking : "approvedById"
    Resource ||--o{ MaintenanceWindow : "resourceId"
    User |o--o{ MaintenanceWindow : "createdById"
    Resource ||--o{ Incident : "resourceId"
    Booking |o--o{ Incident : "bookingId"
    User |o--o{ Incident : "reportedById"
    User |o--o{ Incident : "assignedToId"
    TelemetrySource |o--o{ Incident : "telemetrySourceId"
    TelemetrySample |o--o{ Incident : "telemetrySampleId"
    MonitoringAlert |o--o| Incident : "monitoringAlertId"
    Resource ||--o{ UsageLog : "resourceId"
    Booking |o--o{ UsageLog : "bookingId"
    User |o--o{ UsageLog : "userId"
    User ||--o{ Notification : "userId"
    Laboratory ||--o{ TelemetrySource : "laboratoryId"
    Resource ||--o{ TelemetrySource : "resourceId"
    Resource ||--o{ TelemetrySample : "resourceId"
    TelemetrySource |o--o{ TelemetrySample : "sourceId"
    TelemetrySource ||--o{ MonitoringAlert : "sourceId"
    Resource ||--o{ MonitoringAlert : "resourceId"
    Laboratory ||--o{ MonitoringAlert : "laboratoryId"
    TelemetrySample ||--o{ MonitoringAlert : "sampleId"
    User |o--o{ MonitoringAlert : "acknowledgedById"
    User |o--o{ SystemAuditEvent : "actorId"
    Laboratory |o--o{ SystemAuditEvent : "labId"
    Resource |o--o{ SystemAuditEvent : "resourceId"
```

The 20 models cover identity/lab scope, resource policy, training eligibility,
booking, handover history, maintenance, incident handling, notification and
configured telemetry. Resource operational state and scheduling availability
remain separate. `UserLabAssignment` has a composite key; missing assignments
grant staff no laboratory access. Nullable relations are shown as optional.

PostgreSQL's `bookings_no_active_overlap` exclusion constraint and resource row
locks protect active booking intervals `[startAt, endAt)`. Prisma cannot express
the exclusion constraint; see tracked migrations and the concurrency tests.
History/audit records describe persisted events, not proof of physical inspection.

## Approved stock and teaching workspace extension

```mermaid
erDiagram
    Resource {
        string id PK
        string laboratoryId FK
        string code UK
        ResourceCategory category
        OperationalStatus operationalStatus
        ResourceStatus status
    }
    User {
        string id PK
        string email UK
        Role role
    }
    Booking {
        string id PK
        string bookingCode UK
        string resourceId FK
        string requestedById FK
        string approvedById FK
        datetime startAt
        datetime endAt
        BookingStatus status
        string idempotencyKey UK
    }
    MaintenanceWindow {
        string id PK
        string resourceId FK
        string createdById FK
        MaintenanceStatus status
        datetime startAt
        datetime endAt
    }
    StockItem {
        string resourceId PK,FK
    }
    StockMovement {
        string id PK
        string resourceId FK
        string actorId FK
        string maintenanceId FK
    }
    TeachingGroup {
        string id PK
        string code UK
        string lecturerId FK
    }
    TeachingMembership {
        string groupId PK,FK
        string userId PK,FK
    }
    TeachingActivity {
        string id PK
        string groupId FK
        string bookingId FK,UK
    }
    Resource ||--o{ Booking : "resourceId"
    User ||--o{ Booking : "requestedById"
    User |o--o{ Booking : "approvedById"
    Resource ||--o{ MaintenanceWindow : "resourceId"
    User |o--o{ MaintenanceWindow : "createdById"
    Resource ||--o| StockItem : "resourceId"
    StockItem ||--o{ StockMovement : "resourceId"
    User ||--o{ StockMovement : "actorId"
    MaintenanceWindow |o--o{ StockMovement : "maintenanceId"
    User ||--o{ TeachingGroup : "lecturerId"
    TeachingGroup ||--o{ TeachingMembership : "groupId"
    User ||--o{ TeachingMembership : "userId"
    TeachingGroup ||--o{ TeachingActivity : "groupId"
    Booking ||--o| TeachingActivity : "bookingId"
```

Stock movements record receipts, issues and admin adjustments. A maintenance-linked
issue must remain in the same laboratory. Teaching groups represent lecturer
supervision; academic endorsement does not grant resource approval or handover.
## Approved human support extension

```mermaid
erDiagram
    Laboratory {
        string id PK
        string buildingId FK
        string code UK
    }
    User {
        string id PK
        string email UK
        Role role
    }
    UserLabAssignment {
        string userId PK,FK
        string laboratoryId PK,FK
    }
    SupportSession {
        string id PK
        int ordinal UK
        string laboratoryId FK
        string requesterId FK
        string assignedStaffId FK
        string category
        string status
    }
    SupportMessage {
        string id PK
        int sequence UK
        string sessionId FK
        string senderId FK
    }
    SupportPresence {
        string userId PK,FK
    }
    User ||--o{ UserLabAssignment : "userId"
    Laboratory ||--o{ UserLabAssignment : "laboratoryId"
    Laboratory ||--o{ SupportSession : "laboratoryId"
    User ||--o{ SupportSession : "requesterId"
    User |o--o{ SupportSession : "assignedStaffId"
    SupportSession ||--o{ SupportMessage : "sessionId"
    User |o--o{ SupportMessage : "senderId"
    User ||--o| SupportPresence : "userId"
```

Support sessions retain customer messages, staff replies, handling events and
resolution. Staff access follows current lab assignments. Partial unique indexes
enforce one open request per customer and one active session per staff member
across all labs. The presence heartbeat coordinates assignment; it does not prove
the staff member has read a message. See the forward support migration for
constraints that Prisma cannot express.

## Approved automatic email extension

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        Role role
    }
    EmailDelivery {
        string id PK
        string dedupeKey UK
        string userId FK
        string status
    }
    User ||--o{ EmailDelivery : "userId"
```

Registration and verified VNPAY settlement enqueue immutable, password-free
email snapshots in the same transaction as their business event. Leased workers
send through configured SMTP after commit. SENT records SMTP acceptance, not
confirmed inbox delivery. Unique deduplication keys and state/attempt constraints
are maintained by the forward email migration. See ADR-030 for retry limits.

## Resource lifecycle extension

```mermaid
erDiagram
    ResourceCareProfile {
        string resourceId PK,FK
        string roomId FK
    }
    ResourceOperation {
        string id PK
        string resourceId FK
        string bookingId FK
        string activeResourceId UK
    }
    ResourcePart {
        string id PK
        string resourceId FK
    }
```

Virtual operations retain booking, actor, declared load and server timestamps.
Maintenance policy and component condition belong to existing catalogue resources.
Physical-state mutations remain explicit, scoped and history-backed.

Payment, shipment, AI, camera and optimization tables are outside this diagram's
core projection. Their presence in the schema does not certify those integrations.
