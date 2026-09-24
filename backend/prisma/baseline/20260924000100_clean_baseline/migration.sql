--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: AuditActorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditActorType" AS ENUM (
    'USER',
    'SYSTEM',
    'SERVICE'
);


--
-- Name: BookingOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BookingOutcome" AS ENUM (
    'NO_SHOW'
);


--
-- Name: BookingState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BookingState" AS ENUM (
    'bookable',
    'restricted',
    'non_bookable'
);


--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING_APPROVAL',
    'CONFIRMED',
    'CHECKED_OUT',
    'RETURNED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: CertificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificationStatus" AS ENUM (
    'pending',
    'active',
    'expired',
    'revoked'
);


--
-- Name: IncidentSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IncidentSeverity" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: IncidentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IncidentStatus" AS ENUM (
    'reported',
    'triaged',
    'assigned',
    'investigating',
    'resolved',
    'verified',
    'closed'
);


--
-- Name: MaintenanceKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaintenanceKind" AS ENUM (
    'maintenance',
    'calibration'
);


--
-- Name: MaintenanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaintenanceStatus" AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: MonitoringAlertSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MonitoringAlertSeverity" AS ENUM (
    'WARNING',
    'CRITICAL'
);


--
-- Name: MonitoringAlertStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MonitoringAlertStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED'
);


--
-- Name: NotificationSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationSeverity" AS ENUM (
    'info',
    'success',
    'warning',
    'danger'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'BOOKING_APPROVED',
    'BOOKING_REJECTED',
    'BOOKING_UPCOMING',
    'RETURN_REMINDER'
);


--
-- Name: OperationalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperationalStatus" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'CALIBRATION',
    'BROKEN',
    'RETIRED',
    'OFFLINE'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'pending',
    'success',
    'failed',
    'refunded'
);


--
-- Name: ResourceCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceCategory" AS ENUM (
    'ROOM',
    'EQUIPMENT',
    'MACHINE',
    'EXPERIMENT_KIT',
    'MATERIAL'
);


--
-- Name: ResourceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceStatus" AS ENUM (
    'available',
    'reserved',
    'in_use',
    'maintenance',
    'offline'
);


--
-- Name: ResourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceType" AS ENUM (
    'room',
    'gpu_server',
    'raspberry_pi',
    'uav',
    'camera',
    'kit',
    'material',
    'other'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'LAB_STAFF',
    'LECTURER',
    'STUDENT'
);


--
-- Name: ShipmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShipmentStatus" AS ENUM (
    'pending',
    'picking',
    'delivering',
    'delivered',
    'cancelled',
    'returned'
);


--
-- Name: UsageAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UsageAction" AS ENUM (
    'REQUEST',
    'APPROVE',
    'REJECT',
    'CHECK_OUT',
    'CHECK_IN',
    'RETURN',
    'COMPLETE',
    'STATUS_CHANGE',
    'TELEMETRY',
    'CANCEL',
    'INCIDENT_REPORTED',
    'NO_SHOW'
);


--
-- Name: enforce_resource_schedule_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_resource_schedule_integrity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING
      ERRCODE = '25000',
      MESSAGE = 'Scheduling writes require READ COMMITTED resource-lock semantics';
  END IF;

  IF NEW."startAt" >= NEW."endAt" THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'bookings' THEN
    IF NEW.status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED') THEN
      PERFORM 1 FROM public.resources WHERE id = NEW."resourceId" FOR UPDATE;
      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.maintenance_windows m
        WHERE m."resourceId" = NEW."resourceId"
          AND m.status IN ('scheduled','in_progress')
          AND tsrange(m."startAt", m."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'bookings_conflict_with_maintenance',
          MESSAGE = 'Booking overlaps an active maintenance window';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'maintenance_windows' THEN
    IF NEW.status IN ('scheduled','in_progress') THEN
      PERFORM 1 FROM public.resources WHERE id = NEW."resourceId" FOR UPDATE;
      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b."resourceId" = NEW."resourceId"
          AND b.status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED')
          AND tsrange(b."startAt", b."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'maintenance_conflict_with_booking',
          MESSAGE = 'Maintenance window overlaps an active booking';
      END IF;

      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.maintenance_windows m
        WHERE m.id <> NEW.id
          AND m."resourceId" = NEW."resourceId"
          AND m.status IN ('scheduled','in_progress')
          AND tsrange(m."startAt", m."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'maintenance_windows_no_active_overlap',
          MESSAGE = 'Maintenance window overlaps another active maintenance window';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unexpected trigger table: %', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "toolName" text,
    "toolInput" jsonb,
    "toolOutput" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: behavior_event_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.behavior_event_logs (
    id text NOT NULL,
    "scoreId" text NOT NULL,
    "eventType" text NOT NULL,
    "scoreDelta" double precision NOT NULL,
    "previousScore" double precision NOT NULL,
    "newScore" double precision NOT NULL,
    reason text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "requestedById" text NOT NULL,
    "approvedById" text,
    title text NOT NULL,
    purpose text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING_APPROVAL'::public."BookingStatus" NOT NULL,
    notes text,
    "handoverCondition" text,
    "returnCondition" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "actualEndAt" timestamp(3) without time zone,
    "actualStartAt" timestamp(3) without time zone,
    "bookingCode" text,
    "checkinDeadline" timestamp(3) without time zone,
    "idempotencyKey" text,
    priority integer DEFAULT 0 NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "returnedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    outcome public."BookingOutcome",
    "outcomeAt" timestamp(3) without time zone,
    "feeAmountVnd" integer DEFAULT 0 NOT NULL,
    "feeSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT booking_fee_nonnegative CHECK (("feeAmountVnd" >= 0)),
    CONSTRAINT bookings_outcome_timestamp_consistency CHECK ((((outcome IS NULL) AND ("outcomeAt" IS NULL)) OR ((outcome IS NOT NULL) AND ("outcomeAt" IS NOT NULL)))),
    CONSTRAINT bookings_valid_time_range CHECK (("startAt" < "endAt"))
);


--
-- Name: buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildings (
    id text NOT NULL,
    "campusId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: camera_access_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.camera_access_audits (
    id text NOT NULL,
    "cameraId" text NOT NULL,
    "resourceId" text NOT NULL,
    "laboratoryId" text NOT NULL,
    "actorId" text NOT NULL,
    purpose text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    outcome text NOT NULL,
    detail text,
    CONSTRAINT camera_access_audits_outcome_check CHECK ((outcome = ANY (ARRAY['DENIED'::text, 'NOT_CONFIGURED'::text, 'UNAVAILABLE'::text, 'METADATA_ONLY'::text])))
);


--
-- Name: cameras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cameras (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "laboratoryId" text NOT NULL,
    "resourceId" text NOT NULL,
    "telemetrySourceId" text,
    enabled boolean DEFAULT false NOT NULL,
    "endpointUrl" text,
    status text DEFAULT 'NOT_CONFIGURED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT cameras_status_check CHECK ((status = ANY (ARRAY['NOT_CONFIGURED'::text, 'UNAVAILABLE'::text, 'AVAILABLE'::text])))
);


--
-- Name: campuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campuses (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: email_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_otps (
    id text NOT NULL,
    email text NOT NULL,
    purpose text NOT NULL,
    "codeHash" text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text
);


--
-- Name: incident_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_comments (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "authorId" text,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "bookingId" text,
    "reportedById" text,
    "assignedToId" text,
    severity public."IncidentSeverity" DEFAULT 'medium'::public."IncidentSeverity" NOT NULL,
    status public."IncidentStatus" DEFAULT 'reported'::public."IncidentStatus" NOT NULL,
    category text,
    title text NOT NULL,
    description text NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "monitoringAlertId" text,
    provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    "telemetrySampleId" text,
    "telemetrySourceId" text
);


--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_chunks (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "chunkIndex" integer NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "embeddingJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: knowledge_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_documents (
    id text NOT NULL,
    "resourceId" text,
    "laboratoryId" text,
    title text NOT NULL,
    "sourceType" text DEFAULT 'manual'::text NOT NULL,
    "fileName" text,
    "fileUrl" text,
    version text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lab_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_policies (
    id text NOT NULL,
    "laboratoryId" text NOT NULL,
    "maxBookingMinutes" integer DEFAULT 480 NOT NULL,
    "minBookingMinutes" integer DEFAULT 15 NOT NULL,
    "maxAdvanceBookingDays" integer DEFAULT 30 NOT NULL,
    "checkInGraceMinutes" integer DEFAULT 20 NOT NULL,
    "requiresApproval" boolean DEFAULT false NOT NULL,
    "allowWeekend" boolean DEFAULT false NOT NULL,
    "workDayStartHour" integer DEFAULT 8 NOT NULL,
    "workDayEndHour" integer DEFAULT 18 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: laboratories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratories (
    id text NOT NULL,
    "buildingId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    capacity integer DEFAULT 0 NOT NULL,
    "openingTime" text,
    "closingTime" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: laboratory_monitoring_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratory_monitoring_thresholds (
    id text NOT NULL,
    "laboratoryId" text NOT NULL,
    "temperatureWarningC" double precision,
    "temperatureCriticalC" double precision,
    "humidityMinPercent" double precision,
    "humidityMaxPercent" double precision,
    "staleMinutes" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT laboratory_monitoring_thresholds_values_check CHECK (((("temperatureWarningC" IS NULL) OR (("temperatureWarningC" >= ('-40'::integer)::double precision) AND ("temperatureWarningC" <= (125)::double precision))) AND (("temperatureCriticalC" IS NULL) OR (("temperatureCriticalC" >= ('-40'::integer)::double precision) AND ("temperatureCriticalC" <= (125)::double precision))) AND (("temperatureWarningC" IS NULL) OR ("temperatureCriticalC" IS NULL) OR ("temperatureWarningC" < "temperatureCriticalC")) AND (("humidityMinPercent" IS NULL) OR (("humidityMinPercent" >= (0)::double precision) AND ("humidityMinPercent" <= (100)::double precision))) AND (("humidityMaxPercent" IS NULL) OR (("humidityMaxPercent" >= (0)::double precision) AND ("humidityMaxPercent" <= (100)::double precision))) AND (("humidityMinPercent" IS NULL) OR ("humidityMaxPercent" IS NULL) OR ("humidityMinPercent" <= "humidityMaxPercent")) AND (("staleMinutes" IS NULL) OR (("staleMinutes" >= 1) AND ("staleMinutes" <= 10080)))))
);


--
-- Name: maintenance_windows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_windows (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "createdById" text,
    kind public."MaintenanceKind" DEFAULT 'maintenance'::public."MaintenanceKind" NOT NULL,
    status public."MaintenanceStatus" DEFAULT 'scheduled'::public."MaintenanceStatus" NOT NULL,
    title text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cost double precision,
    vendor text,
    CONSTRAINT maintenance_windows_valid_time_range CHECK (("startAt" < "endAt"))
);


--
-- Name: monitoring_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_alerts (
    id text NOT NULL,
    "activeDedupeKey" text,
    "conditionKey" text NOT NULL,
    "sourceId" text NOT NULL,
    "resourceId" text NOT NULL,
    "laboratoryId" text NOT NULL,
    "sampleId" text NOT NULL,
    "ruleCode" text NOT NULL,
    severity public."MonitoringAlertSeverity" NOT NULL,
    status public."MonitoringAlertStatus" DEFAULT 'OPEN'::public."MonitoringAlertStatus" NOT NULL,
    message text NOT NULL,
    "observedValue" double precision,
    "thresholdSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "openedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastObservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acknowledgedById" text,
    "acknowledgedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity public."NotificationSeverity" DEFAULT 'info'::public."NotificationSeverity" NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "titleKey" text,
    "messageKey" text,
    "messageParams" jsonb DEFAULT '{}'::jsonb NOT NULL,
    channel text DEFAULT 'in_app'::text NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    type public."NotificationType",
    "dedupeKey" text
);


--
-- Name: optimization_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_decisions (
    id text NOT NULL,
    "runId" text NOT NULL,
    "allocationId" text,
    "objectiveVector" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "paretoRank" integer DEFAULT 1 NOT NULL,
    "crowdingDistance" double precision DEFAULT 0 NOT NULL,
    explanation text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: optimization_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_runs (
    id text NOT NULL,
    algorithm text NOT NULL,
    "algorithmVersion" text DEFAULT '1.0'::text NOT NULL,
    "datasetVersion" text,
    "policyVersionId" text,
    "populationSize" integer,
    generations integer,
    "mutationRate" double precision,
    "crossoverRate" double precision,
    "objectiveWeights" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "metricsSummary" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "runtimeMs" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id text NOT NULL,
    "bookingId" text,
    "userId" text NOT NULL,
    "txnRef" text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    provider text DEFAULT 'vnpay'::text NOT NULL,
    status public."PaymentStatus" DEFAULT 'pending'::public."PaymentStatus" NOT NULL,
    "bankCode" text,
    "cardType" text,
    "vnpResponseCode" text,
    "vnpTransactionNo" text,
    "paymentUrl" text,
    "paidAt" timestamp(3) without time zone,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_versions (
    id text NOT NULL,
    "policyType" text NOT NULL,
    version text DEFAULT '2026.1'::text NOT NULL,
    name text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resource_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_allocations (
    id text NOT NULL,
    "requirementId" text,
    "bookingId" text,
    "resourceId" text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    "allocationStatus" text DEFAULT 'proposed'::text NOT NULL,
    "optimizationRunId" text,
    "totalScore" double precision DEFAULT 0,
    "energyScore" double precision DEFAULT 0,
    "fairnessScore" double precision DEFAULT 0,
    "healthScore" double precision DEFAULT 0,
    explanation jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resource_capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_capabilities (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    unit text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resource_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_media (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    kind text NOT NULL,
    url text NOT NULL,
    "objectKey" text,
    title text NOT NULL,
    "altText" text NOT NULL,
    "sourceUrl" text,
    credit text,
    license text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT resource_media_kind_check CHECK ((kind = ANY (ARRAY['IMAGE'::text, 'VIDEO'::text])))
);


--
-- Name: resource_monitoring_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_monitoring_thresholds (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "temperatureWarningC" double precision,
    "temperatureCriticalC" double precision,
    "humidityMinPercent" double precision,
    "humidityMaxPercent" double precision,
    "staleMinutes" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT resource_monitoring_thresholds_values_check CHECK (((("temperatureWarningC" IS NULL) OR (("temperatureWarningC" >= ('-40'::integer)::double precision) AND ("temperatureWarningC" <= (125)::double precision))) AND (("temperatureCriticalC" IS NULL) OR (("temperatureCriticalC" >= ('-40'::integer)::double precision) AND ("temperatureCriticalC" <= (125)::double precision))) AND (("temperatureWarningC" IS NULL) OR ("temperatureCriticalC" IS NULL) OR ("temperatureWarningC" < "temperatureCriticalC")) AND (("humidityMinPercent" IS NULL) OR (("humidityMinPercent" >= (0)::double precision) AND ("humidityMinPercent" <= (100)::double precision))) AND (("humidityMaxPercent" IS NULL) OR (("humidityMaxPercent" >= (0)::double precision) AND ("humidityMaxPercent" <= (100)::double precision))) AND (("humidityMinPercent" IS NULL) OR ("humidityMaxPercent" IS NULL) OR ("humidityMinPercent" <= "humidityMaxPercent")) AND (("staleMinutes" IS NULL) OR (("staleMinutes" >= 1) AND ("staleMinutes" <= 10080)))))
);


--
-- Name: resource_pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_pricing_rules (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "purposeCode" text NOT NULL,
    label text NOT NULL,
    "hourlyRateVnd" integer NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "resource_pricing_rules_hourlyRateVnd_check" CHECK (("hourlyRateVnd" >= 0))
);


--
-- Name: resource_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_requirements (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookingId" text,
    "resourceType" public."ResourceType" DEFAULT 'gpu_server'::public."ResourceType" NOT NULL,
    "minVramGb" integer DEFAULT 16,
    "minComputeTflops" double precision,
    "requiredCapabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "durationMinutes" integer DEFAULT 120 NOT NULL,
    deadline timestamp(3) without time zone,
    "maxCostVnd" double precision,
    "priorityScore" integer DEFAULT 50 NOT NULL,
    "projectUrgency" text DEFAULT 'course_project'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resource_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_status_history (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "fromStatus" public."OperationalStatus" NOT NULL,
    "toStatus" public."OperationalStatus" NOT NULL,
    reason text,
    "changedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."ResourceType" NOT NULL,
    location text NOT NULL,
    status public."ResourceStatus" DEFAULT 'available'::public."ResourceStatus" NOT NULL,
    "ownerTeam" text DEFAULT ''::text NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    "requiresApproval" boolean DEFAULT false NOT NULL,
    specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "bookingState" public."BookingState" DEFAULT 'bookable'::public."BookingState" NOT NULL,
    description text,
    "laboratoryId" text,
    manufacturer text,
    model text,
    "operationalStatus" public."OperationalStatus" DEFAULT 'AVAILABLE'::public."OperationalStatus" NOT NULL,
    "purchaseDate" timestamp(3) without time zone,
    "serialNumber" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    "warrantyExpiry" timestamp(3) without time zone,
    category public."ResourceCategory"
);


--
-- Name: COLUMN resources.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resources.status IS 'Temporary one-way compatibility projection; never an authoritative physical or scheduling state.';


--
-- Name: COLUMN resources."operationalStatus"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resources."operationalStatus" IS 'Authoritative physical/operational state. Reservation is derived from bookings, maintenance and policy.';


--
-- Name: COLUMN resources.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resources.category IS 'Assignment-level category; nullable when the technical subtype is not yet reviewed.';


--
-- Name: shipment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_orders (
    id text NOT NULL,
    "bookingId" text,
    "resourceId" text,
    "userId" text NOT NULL,
    "trackingCode" text NOT NULL,
    provider text DEFAULT 'ghn'::text NOT NULL,
    status public."ShipmentStatus" DEFAULT 'pending'::public."ShipmentStatus" NOT NULL,
    fee double precision DEFAULT 0 NOT NULL,
    "senderAddress" text NOT NULL,
    "recipientName" text NOT NULL,
    "recipientPhone" text NOT NULL,
    "recipientAddress" text NOT NULL,
    "expectedDelivery" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "rawResponse" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: telemetry_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telemetry_samples (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "cpuPercent" double precision,
    "gpuPercent" double precision,
    "gpuMemoryPercent" double precision,
    "ramPercent" double precision,
    "diskPercent" double precision,
    "temperatureC" double precision,
    online boolean DEFAULT true NOT NULL,
    source text DEFAULT 'agent'::text NOT NULL,
    "sampledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "humidityPercent" double precision,
    "verifiedSignals" jsonb,
    "externalId" text,
    "sourceId" text,
    CONSTRAINT telemetry_samples_humidity_range CHECK ((("humidityPercent" IS NULL) OR (("humidityPercent" >= (0)::double precision) AND ("humidityPercent" <= (100)::double precision))))
);


--
-- Name: COLUMN telemetry_samples."verifiedSignals"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telemetry_samples."verifiedSignals" IS 'Nullable verified event/signal metadata. Absence means no verified signal data.';


--
-- Name: telemetry_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telemetry_sources (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "laboratoryId" text NOT NULL,
    "resourceId" text NOT NULL,
    "credentialSalt" text NOT NULL,
    "credentialHash" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "reportedOnline" boolean,
    "lastSeenAt" timestamp(3) without time zone,
    "lastSampleAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: training_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_courses (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "durationHours" double precision,
    "isRequired" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: training_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_requirements (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "courseId" text NOT NULL,
    "isMandatory" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_logs (
    id text NOT NULL,
    "resourceId" text NOT NULL,
    "bookingId" text,
    "userId" text,
    action public."UsageAction" NOT NULL,
    message text NOT NULL,
    "conditionBefore" text,
    "conditionAfter" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "messageKey" text,
    "messageParams" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "ipAddress" text,
    "actorType" public."AuditActorType" DEFAULT 'USER'::public."AuditActorType" NOT NULL,
    "actorRef" text,
    "fromStatus" public."BookingStatus",
    "toStatus" public."BookingStatus",
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT usage_logs_actor_source_check CHECK (((("actorType" = 'USER'::public."AuditActorType") AND ("userId" IS NOT NULL) AND ("actorRef" IS NULL)) OR (("actorType" = ANY (ARRAY['SYSTEM'::public."AuditActorType", 'SERVICE'::public."AuditActorType"])) AND ("userId" IS NULL) AND (NULLIF(btrim("actorRef"), ''::text) IS NOT NULL))))
);


--
-- Name: user_behavior_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_behavior_scores (
    id text NOT NULL,
    "userId" text NOT NULL,
    "currentScore" double precision DEFAULT 100.0 NOT NULL,
    "lateCancelCount" integer DEFAULT 0 NOT NULL,
    "noShowCount" integer DEFAULT 0 NOT NULL,
    "quotaBreachCount" integer DEFAULT 0 NOT NULL,
    "cleanStreakDays" integer DEFAULT 0 NOT NULL,
    "lastViolationAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_certifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    status public."CertificationStatus" DEFAULT 'active'::public."CertificationStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "issuedById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_lab_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lab_assignments (
    "userId" text NOT NULL,
    "laboratoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "fullName" text NOT NULL,
    role public."Role" NOT NULL,
    "passwordHash" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    department text,
    phone text,
    "studentId" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "customerType" text DEFAULT 'INTERNAL'::text NOT NULL,
    organization text,
    "passwordResetRequired" boolean DEFAULT false NOT NULL,
    "defaultAddressLine" text,
    "defaultAddressProvinceCode" text,
    "defaultAddressProvinceName" text,
    "defaultAddressWardCode" text,
    "defaultAddressWardName" text,
    "defaultAddressSource" text,
    "defaultAddressVersion" text,
    "loyaltyTier" text DEFAULT 'LAB_STANDARD'::text NOT NULL,
    "loyaltyPoints" integer DEFAULT 0 NOT NULL,
    "loyaltyDiscountBps" integer DEFAULT 0 NOT NULL,
    "priorityBoost" integer DEFAULT 0 NOT NULL
);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: behavior_event_logs behavior_event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_event_logs
    ADD CONSTRAINT behavior_event_logs_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_no_active_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_no_active_overlap EXCLUDE USING gist ("resourceId" WITH =, tsrange("startAt", "endAt", '[)'::text) WITH &&) WHERE ((status = ANY (ARRAY['PENDING_APPROVAL'::public."BookingStatus", 'CONFIRMED'::public."BookingStatus", 'CHECKED_OUT'::public."BookingStatus", 'RETURNED'::public."BookingStatus"])));


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: camera_access_audits camera_access_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera_access_audits
    ADD CONSTRAINT camera_access_audits_pkey PRIMARY KEY (id);


--
-- Name: cameras cameras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT cameras_pkey PRIMARY KEY (id);


--
-- Name: campuses campuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_pkey PRIMARY KEY (id);


--
-- Name: email_otps email_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_otps
    ADD CONSTRAINT email_otps_pkey PRIMARY KEY (id);


--
-- Name: incident_comments incident_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_comments
    ADD CONSTRAINT incident_comments_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: lab_policies lab_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_policies
    ADD CONSTRAINT lab_policies_pkey PRIMARY KEY (id);


--
-- Name: laboratories laboratories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_pkey PRIMARY KEY (id);


--
-- Name: laboratory_monitoring_thresholds laboratory_monitoring_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_monitoring_thresholds
    ADD CONSTRAINT laboratory_monitoring_thresholds_pkey PRIMARY KEY (id);


--
-- Name: maintenance_windows maintenance_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_windows
    ADD CONSTRAINT maintenance_windows_pkey PRIMARY KEY (id);


--
-- Name: monitoring_alerts monitoring_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT monitoring_alerts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: optimization_decisions optimization_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_decisions
    ADD CONSTRAINT optimization_decisions_pkey PRIMARY KEY (id);


--
-- Name: optimization_runs optimization_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_runs
    ADD CONSTRAINT optimization_runs_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: policy_versions policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_pkey PRIMARY KEY (id);


--
-- Name: resource_allocations resource_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT resource_allocations_pkey PRIMARY KEY (id);


--
-- Name: resource_capabilities resource_capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_capabilities
    ADD CONSTRAINT resource_capabilities_pkey PRIMARY KEY (id);


--
-- Name: resource_media resource_media_objectKey_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_media
    ADD CONSTRAINT "resource_media_objectKey_key" UNIQUE ("objectKey");


--
-- Name: resource_media resource_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_media
    ADD CONSTRAINT resource_media_pkey PRIMARY KEY (id);


--
-- Name: resource_monitoring_thresholds resource_monitoring_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_monitoring_thresholds
    ADD CONSTRAINT resource_monitoring_thresholds_pkey PRIMARY KEY (id);


--
-- Name: resource_pricing_rules resource_pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_pricing_rules
    ADD CONSTRAINT resource_pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: resource_pricing_rules resource_pricing_rules_resourceId_purposeCode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_pricing_rules
    ADD CONSTRAINT "resource_pricing_rules_resourceId_purposeCode_key" UNIQUE ("resourceId", "purposeCode");


--
-- Name: resource_requirements resource_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_requirements
    ADD CONSTRAINT resource_requirements_pkey PRIMARY KEY (id);


--
-- Name: resource_status_history resource_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_status_history
    ADD CONSTRAINT resource_status_history_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: shipment_orders shipment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT shipment_orders_pkey PRIMARY KEY (id);


--
-- Name: telemetry_samples telemetry_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_samples
    ADD CONSTRAINT telemetry_samples_pkey PRIMARY KEY (id);


--
-- Name: telemetry_sources telemetry_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_sources
    ADD CONSTRAINT telemetry_sources_pkey PRIMARY KEY (id);


--
-- Name: training_courses training_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_courses
    ADD CONSTRAINT training_courses_pkey PRIMARY KEY (id);


--
-- Name: training_requirements training_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_requirements
    ADD CONSTRAINT training_requirements_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_behavior_scores user_behavior_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_behavior_scores
    ADD CONSTRAINT user_behavior_scores_pkey PRIMARY KEY (id);


--
-- Name: user_certifications user_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications
    ADD CONSTRAINT user_certifications_pkey PRIMARY KEY (id);


--
-- Name: user_lab_assignments user_lab_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lab_assignments
    ADD CONSTRAINT user_lab_assignments_pkey PRIMARY KEY ("userId", "laboratoryId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ai_conversations_userId_idx" ON public.ai_conversations USING btree ("userId");


--
-- Name: ai_messages_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ai_messages_conversationId_idx" ON public.ai_messages USING btree ("conversationId");


--
-- Name: behavior_event_logs_scoreId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "behavior_event_logs_scoreId_createdAt_idx" ON public.behavior_event_logs USING btree ("scoreId", "createdAt");


--
-- Name: bookings_bookingCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bookings_bookingCode_key" ON public.bookings USING btree ("bookingCode");


--
-- Name: bookings_idempotencyKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bookings_idempotencyKey_idx" ON public.bookings USING btree ("idempotencyKey");


--
-- Name: bookings_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON public.bookings USING btree ("idempotencyKey");


--
-- Name: bookings_requestedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bookings_requestedById_idx" ON public.bookings USING btree ("requestedById");


--
-- Name: bookings_resourceId_startAt_endAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bookings_resourceId_startAt_endAt_idx" ON public.bookings USING btree ("resourceId", "startAt", "endAt");


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: buildings_campusId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "buildings_campusId_idx" ON public.buildings USING btree ("campusId");


--
-- Name: buildings_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX buildings_code_key ON public.buildings USING btree (code);


--
-- Name: camera_access_audits_actorId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "camera_access_audits_actorId_startedAt_idx" ON public.camera_access_audits USING btree ("actorId", "startedAt");


--
-- Name: camera_access_audits_cameraId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "camera_access_audits_cameraId_startedAt_idx" ON public.camera_access_audits USING btree ("cameraId", "startedAt");


--
-- Name: camera_access_audits_laboratoryId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "camera_access_audits_laboratoryId_startedAt_idx" ON public.camera_access_audits USING btree ("laboratoryId", "startedAt");


--
-- Name: cameras_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cameras_code_key ON public.cameras USING btree (code);


--
-- Name: cameras_laboratoryId_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cameras_laboratoryId_enabled_idx" ON public.cameras USING btree ("laboratoryId", enabled);


--
-- Name: cameras_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cameras_resourceId_idx" ON public.cameras USING btree ("resourceId");


--
-- Name: cameras_telemetrySourceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cameras_telemetrySourceId_key" ON public.cameras USING btree ("telemetrySourceId");


--
-- Name: campuses_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campuses_code_key ON public.campuses USING btree (code);


--
-- Name: email_otps_email_purpose_consumedAt_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "email_otps_email_purpose_consumedAt_expiresAt_idx" ON public.email_otps USING btree (email, purpose, "consumedAt", "expiresAt");


--
-- Name: email_otps_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "email_otps_userId_idx" ON public.email_otps USING btree ("userId");


--
-- Name: incident_comments_incidentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "incident_comments_incidentId_idx" ON public.incident_comments USING btree ("incidentId");


--
-- Name: incidents_monitoringAlertId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "incidents_monitoringAlertId_key" ON public.incidents USING btree ("monitoringAlertId");


--
-- Name: incidents_reportedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "incidents_reportedById_idx" ON public.incidents USING btree ("reportedById");


--
-- Name: incidents_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "incidents_resourceId_idx" ON public.incidents USING btree ("resourceId");


--
-- Name: incidents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incidents_status_idx ON public.incidents USING btree (status);


--
-- Name: incidents_telemetrySampleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "incidents_telemetrySampleId_idx" ON public.incidents USING btree ("telemetrySampleId");


--
-- Name: incidents_telemetrySourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "incidents_telemetrySourceId_idx" ON public.incidents USING btree ("telemetrySourceId");


--
-- Name: knowledge_chunks_documentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "knowledge_chunks_documentId_idx" ON public.knowledge_chunks USING btree ("documentId");


--
-- Name: knowledge_documents_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "knowledge_documents_resourceId_idx" ON public.knowledge_documents USING btree ("resourceId");


--
-- Name: lab_policies_laboratoryId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "lab_policies_laboratoryId_key" ON public.lab_policies USING btree ("laboratoryId");


--
-- Name: laboratories_buildingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "laboratories_buildingId_idx" ON public.laboratories USING btree ("buildingId");


--
-- Name: laboratories_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX laboratories_code_key ON public.laboratories USING btree (code);


--
-- Name: laboratory_monitoring_thresholds_laboratoryId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "laboratory_monitoring_thresholds_laboratoryId_key" ON public.laboratory_monitoring_thresholds USING btree ("laboratoryId");


--
-- Name: maintenance_windows_resourceId_startAt_endAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_windows_resourceId_startAt_endAt_idx" ON public.maintenance_windows USING btree ("resourceId", "startAt", "endAt");


--
-- Name: maintenance_windows_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_windows_status_idx ON public.maintenance_windows USING btree (status);


--
-- Name: monitoring_alerts_activeDedupeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "monitoring_alerts_activeDedupeKey_key" ON public.monitoring_alerts USING btree ("activeDedupeKey");


--
-- Name: monitoring_alerts_conditionKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "monitoring_alerts_conditionKey_idx" ON public.monitoring_alerts USING btree ("conditionKey");


--
-- Name: monitoring_alerts_laboratoryId_status_openedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "monitoring_alerts_laboratoryId_status_openedAt_idx" ON public.monitoring_alerts USING btree ("laboratoryId", status, "openedAt");


--
-- Name: monitoring_alerts_resourceId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "monitoring_alerts_resourceId_status_idx" ON public.monitoring_alerts USING btree ("resourceId", status);


--
-- Name: monitoring_alerts_sourceId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "monitoring_alerts_sourceId_status_idx" ON public.monitoring_alerts USING btree ("sourceId", status);


--
-- Name: notifications_dedupeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON public.notifications USING btree ("dedupeKey");


--
-- Name: notifications_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_createdAt_idx" ON public.notifications USING btree ("userId", "createdAt");


--
-- Name: notifications_userId_readAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_readAt_idx" ON public.notifications USING btree ("userId", "readAt");


--
-- Name: notifications_userId_type_scheduledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_type_scheduledAt_idx" ON public.notifications USING btree ("userId", type, "scheduledAt");


--
-- Name: optimization_decisions_runId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "optimization_decisions_runId_idx" ON public.optimization_decisions USING btree ("runId");


--
-- Name: optimization_runs_algorithm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX optimization_runs_algorithm_idx ON public.optimization_runs USING btree (algorithm);


--
-- Name: optimization_runs_policyVersionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "optimization_runs_policyVersionId_idx" ON public.optimization_runs USING btree ("policyVersionId");


--
-- Name: payment_transactions_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_bookingId_idx" ON public.payment_transactions USING btree ("bookingId");


--
-- Name: payment_transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_transactions_status_idx ON public.payment_transactions USING btree (status);


--
-- Name: payment_transactions_txnRef_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_txnRef_key" ON public.payment_transactions USING btree ("txnRef");


--
-- Name: payment_transactions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_userId_idx" ON public.payment_transactions USING btree ("userId");


--
-- Name: policy_versions_policyType_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "policy_versions_policyType_isActive_idx" ON public.policy_versions USING btree ("policyType", "isActive");


--
-- Name: resource_allocations_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_allocations_bookingId_idx" ON public.resource_allocations USING btree ("bookingId");


--
-- Name: resource_allocations_optimizationRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_allocations_optimizationRunId_idx" ON public.resource_allocations USING btree ("optimizationRunId");


--
-- Name: resource_allocations_requirementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_allocations_requirementId_idx" ON public.resource_allocations USING btree ("requirementId");


--
-- Name: resource_allocations_resourceId_startAt_endAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_allocations_resourceId_startAt_endAt_idx" ON public.resource_allocations USING btree ("resourceId", "startAt", "endAt");


--
-- Name: resource_capabilities_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_capabilities_resourceId_idx" ON public.resource_capabilities USING btree ("resourceId");


--
-- Name: resource_capabilities_resourceId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "resource_capabilities_resourceId_key_key" ON public.resource_capabilities USING btree ("resourceId", key);


--
-- Name: resource_media_resourceId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_media_resourceId_sortOrder_idx" ON public.resource_media USING btree ("resourceId", "sortOrder");


--
-- Name: resource_monitoring_thresholds_resourceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "resource_monitoring_thresholds_resourceId_key" ON public.resource_monitoring_thresholds USING btree ("resourceId");


--
-- Name: resource_requirements_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_requirements_bookingId_idx" ON public.resource_requirements USING btree ("bookingId");


--
-- Name: resource_requirements_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_requirements_userId_idx" ON public.resource_requirements USING btree ("userId");


--
-- Name: resource_status_history_resourceId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resource_status_history_resourceId_createdAt_idx" ON public.resource_status_history USING btree ("resourceId", "createdAt");


--
-- Name: resources_bookingState_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resources_bookingState_idx" ON public.resources USING btree ("bookingState");


--
-- Name: resources_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resources_code_key ON public.resources USING btree (code);


--
-- Name: resources_laboratoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resources_laboratoryId_idx" ON public.resources USING btree ("laboratoryId");


--
-- Name: resources_operationalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "resources_operationalStatus_idx" ON public.resources USING btree ("operationalStatus");


--
-- Name: shipment_orders_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shipment_orders_bookingId_idx" ON public.shipment_orders USING btree ("bookingId");


--
-- Name: shipment_orders_trackingCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shipment_orders_trackingCode_idx" ON public.shipment_orders USING btree ("trackingCode");


--
-- Name: shipment_orders_trackingCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "shipment_orders_trackingCode_key" ON public.shipment_orders USING btree ("trackingCode");


--
-- Name: shipment_orders_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shipment_orders_userId_idx" ON public.shipment_orders USING btree ("userId");


--
-- Name: telemetry_samples_resourceId_sampledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "telemetry_samples_resourceId_sampledAt_idx" ON public.telemetry_samples USING btree ("resourceId", "sampledAt");


--
-- Name: telemetry_samples_sourceId_externalId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "telemetry_samples_sourceId_externalId_key" ON public.telemetry_samples USING btree ("sourceId", "externalId");


--
-- Name: telemetry_samples_sourceId_sampledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "telemetry_samples_sourceId_sampledAt_idx" ON public.telemetry_samples USING btree ("sourceId", "sampledAt");


--
-- Name: telemetry_sources_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX telemetry_sources_code_key ON public.telemetry_sources USING btree (code);


--
-- Name: telemetry_sources_laboratoryId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "telemetry_sources_laboratoryId_isActive_idx" ON public.telemetry_sources USING btree ("laboratoryId", "isActive");


--
-- Name: telemetry_sources_resourceId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "telemetry_sources_resourceId_code_key" ON public.telemetry_sources USING btree ("resourceId", code);


--
-- Name: telemetry_sources_resourceId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "telemetry_sources_resourceId_isActive_idx" ON public.telemetry_sources USING btree ("resourceId", "isActive");


--
-- Name: training_courses_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_courses_code_key ON public.training_courses USING btree (code);


--
-- Name: training_requirements_resourceId_courseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "training_requirements_resourceId_courseId_key" ON public.training_requirements USING btree ("resourceId", "courseId");


--
-- Name: training_requirements_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "training_requirements_resourceId_idx" ON public.training_requirements USING btree ("resourceId");


--
-- Name: usage_logs_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_logs_bookingId_idx" ON public.usage_logs USING btree ("bookingId");


--
-- Name: usage_logs_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_logs_resourceId_idx" ON public.usage_logs USING btree ("resourceId");


--
-- Name: usage_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_logs_userId_idx" ON public.usage_logs USING btree ("userId");


--
-- Name: user_behavior_scores_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_behavior_scores_userId_idx" ON public.user_behavior_scores USING btree ("userId");


--
-- Name: user_behavior_scores_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_behavior_scores_userId_key" ON public.user_behavior_scores USING btree ("userId");


--
-- Name: user_certifications_userId_courseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_certifications_userId_courseId_key" ON public.user_certifications USING btree ("userId", "courseId");


--
-- Name: user_certifications_userId_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_certifications_userId_expiresAt_idx" ON public.user_certifications USING btree ("userId", "expiresAt");


--
-- Name: user_certifications_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_certifications_userId_status_idx" ON public.user_certifications USING btree ("userId", status);


--
-- Name: user_lab_assignments_laboratoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_lab_assignments_laboratoryId_idx" ON public.user_lab_assignments USING btree ("laboratoryId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: bookings bookings_schedule_integrity_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bookings_schedule_integrity_before_write BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_resource_schedule_integrity();


--
-- Name: maintenance_windows maintenance_schedule_integrity_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER maintenance_schedule_integrity_before_write BEFORE INSERT OR UPDATE ON public.maintenance_windows FOR EACH ROW EXECUTE FUNCTION public.enforce_resource_schedule_integrity();


--
-- Name: ai_messages ai_messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.ai_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: behavior_event_logs behavior_event_logs_scoreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_event_logs
    ADD CONSTRAINT "behavior_event_logs_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES public.user_behavior_scores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings bookings_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings bookings_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bookings bookings_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: buildings buildings_campusId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT "buildings_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES public.campuses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: camera_access_audits camera_access_audits_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera_access_audits
    ADD CONSTRAINT "camera_access_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: camera_access_audits camera_access_audits_cameraId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera_access_audits
    ADD CONSTRAINT "camera_access_audits_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES public.cameras(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: camera_access_audits camera_access_audits_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera_access_audits
    ADD CONSTRAINT "camera_access_audits_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: camera_access_audits camera_access_audits_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera_access_audits
    ADD CONSTRAINT "camera_access_audits_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cameras cameras_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT "cameras_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cameras cameras_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT "cameras_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cameras cameras_telemetrySourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT "cameras_telemetrySourceId_fkey" FOREIGN KEY ("telemetrySourceId") REFERENCES public.telemetry_sources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_otps email_otps_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_otps
    ADD CONSTRAINT "email_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_comments incident_comments_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_comments
    ADD CONSTRAINT "incident_comments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incidents incidents_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_monitoringAlertId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_monitoringAlertId_fkey" FOREIGN KEY ("monitoringAlertId") REFERENCES public.monitoring_alerts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_reportedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_telemetrySampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_telemetrySampleId_fkey" FOREIGN KEY ("telemetrySampleId") REFERENCES public.telemetry_samples(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_telemetrySourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "incidents_telemetrySourceId_fkey" FOREIGN KEY ("telemetrySourceId") REFERENCES public.telemetry_sources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: knowledge_chunks knowledge_chunks_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public.knowledge_documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: knowledge_documents knowledge_documents_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT "knowledge_documents_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: knowledge_documents knowledge_documents_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT "knowledge_documents_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lab_policies lab_policies_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_policies
    ADD CONSTRAINT "lab_policies_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: laboratories laboratories_buildingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT "laboratories_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: laboratory_monitoring_thresholds laboratory_monitoring_thresholds_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_monitoring_thresholds
    ADD CONSTRAINT "laboratory_monitoring_thresholds_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_windows maintenance_windows_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_windows
    ADD CONSTRAINT "maintenance_windows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maintenance_windows maintenance_windows_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_windows
    ADD CONSTRAINT "maintenance_windows_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: monitoring_alerts monitoring_alerts_acknowledgedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT "monitoring_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: monitoring_alerts monitoring_alerts_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT "monitoring_alerts_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: monitoring_alerts monitoring_alerts_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT "monitoring_alerts_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: monitoring_alerts monitoring_alerts_sampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT "monitoring_alerts_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES public.telemetry_samples(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: monitoring_alerts monitoring_alerts_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT "monitoring_alerts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public.telemetry_sources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: optimization_decisions optimization_decisions_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_decisions
    ADD CONSTRAINT "optimization_decisions_runId_fkey" FOREIGN KEY ("runId") REFERENCES public.optimization_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: optimization_runs optimization_runs_policyVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_runs
    ADD CONSTRAINT "optimization_runs_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES public.policy_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_allocations resource_allocations_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "resource_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: resource_allocations resource_allocations_optimizationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "resource_allocations_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES public.optimization_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: resource_allocations resource_allocations_requirementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "resource_allocations_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES public.resource_requirements(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: resource_allocations resource_allocations_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "resource_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_capabilities resource_capabilities_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_capabilities
    ADD CONSTRAINT "resource_capabilities_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_media resource_media_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_media
    ADD CONSTRAINT "resource_media_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_monitoring_thresholds resource_monitoring_thresholds_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_monitoring_thresholds
    ADD CONSTRAINT "resource_monitoring_thresholds_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_pricing_rules resource_pricing_rules_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_pricing_rules
    ADD CONSTRAINT "resource_pricing_rules_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_requirements resource_requirements_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_requirements
    ADD CONSTRAINT "resource_requirements_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: resource_requirements resource_requirements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_requirements
    ADD CONSTRAINT "resource_requirements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_status_history resource_status_history_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_status_history
    ADD CONSTRAINT "resource_status_history_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: resources resources_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT "resources_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shipment_orders shipment_orders_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT "shipment_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shipment_orders shipment_orders_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT "shipment_orders_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shipment_orders shipment_orders_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT "shipment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: telemetry_samples telemetry_samples_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_samples
    ADD CONSTRAINT "telemetry_samples_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: telemetry_samples telemetry_samples_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_samples
    ADD CONSTRAINT "telemetry_samples_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public.telemetry_sources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: telemetry_sources telemetry_sources_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_sources
    ADD CONSTRAINT "telemetry_sources_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: telemetry_sources telemetry_sources_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_sources
    ADD CONSTRAINT "telemetry_sources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: training_requirements training_requirements_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_requirements
    ADD CONSTRAINT "training_requirements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.training_courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: training_requirements training_requirements_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_requirements
    ADD CONSTRAINT "training_requirements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT "usage_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usage_logs usage_logs_resourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT "usage_logs_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES public.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usage_logs usage_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT "usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_behavior_scores user_behavior_scores_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_behavior_scores
    ADD CONSTRAINT "user_behavior_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_certifications user_certifications_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications
    ADD CONSTRAINT "user_certifications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.training_courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_certifications user_certifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications
    ADD CONSTRAINT "user_certifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_lab_assignments user_lab_assignments_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lab_assignments
    ADD CONSTRAINT "user_lab_assignments_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_lab_assignments user_lab_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lab_assignments
    ADD CONSTRAINT "user_lab_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


-- Clean-install lineage marker. The normal forward migration creates the same
-- empty metadata table for databases that already use the historical lineage.
CREATE TABLE public._lrm_deployment_baselines (
    baseline_id text PRIMARY KEY,
    schema_sha256 text NOT NULL,
    installed_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public._lrm_deployment_baselines (baseline_id, schema_sha256)
VALUES (
    '20260924000100_clean_baseline',
    'f22ba45d711c8da92ad7b6b81b79ef5ff139657e1fa174e41109afc022a36066'
);


--
-- PostgreSQL database dump complete
--
