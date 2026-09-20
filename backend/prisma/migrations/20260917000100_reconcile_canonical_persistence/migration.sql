-- Batch 1C canonical persistence reconciliation.
-- AUTHORING NOTE: this migration is intentionally not executed in Batch 1C.
-- It supports only (a) an empty PostgreSQL 16 database produced by all prior
-- repository migrations or (b) the verified Batch 1A restore after the two
-- proven-equivalent pending migrations have been resolved as applied.

-- Keep this loss-prevention guard outside the transaction so Prisma surfaces
-- the actionable cause instead of a later generic transaction-aborted error.
DO $$
DECLARE
  no_show_count integer;
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'Missing public.bookings before Batch 1C';
  END IF;

  SELECT count(*) INTO no_show_count
  FROM public.bookings
  WHERE status::text = 'no_show';

  IF no_show_count <> 0 THEN
    RAISE EXCEPTION
      'Cannot losslessly migrate % booking rows with status=no_show; review required',
      no_show_count;
  END IF;
END $$;

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '10min';
SET LOCAL search_path = public, pg_catalog;

CREATE FUNCTION pg_temp.batch1c_enum_labels(type_name text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname = type_name
$$;

CREATE FUNCTION pg_temp.batch1c_columns_hash(table_names text[])
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT md5(string_agg(
    format('%s|%s|%s|%s|%s|%s', c.relname, a.attnum, a.attname,
      format_type(a.atttypid, a.atttypmod), a.attnotnull,
      coalesce(pg_get_expr(d.adbin, d.adrelid), '')),
    E'\n' ORDER BY c.relname, a.attnum))
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relname = ANY(table_names)
$$;

CREATE FUNCTION pg_temp.batch1c_constraints_hash(table_names text[])
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT md5(string_agg(
    format('%s|%s|%s|%s|%s', c.conrelid::regclass::text, c.conname,
      c.contype, pg_get_constraintdef(c.oid), c.convalidated),
    E'\n' ORDER BY c.conrelid::regclass::text, c.conname))
  FROM pg_constraint c
  WHERE c.conrelid::regclass::text = ANY(table_names)
$$;

CREATE FUNCTION pg_temp.batch1c_indexes_hash(table_names text[])
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT md5(string_agg(
    format('%s|%s|%s', t.relname, i.relname, pg_get_indexdef(x.indexrelid)),
    E'\n' ORDER BY t.relname, i.relname))
  FROM pg_index x
  JOIN pg_class t ON t.oid = x.indrelid
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = ANY(table_names)
$$;

CREATE FUNCTION pg_temp.batch1c_column_names(requested_table text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT array_agg(c.column_name::text ORDER BY c.ordinal_position)
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = requested_table
$$;

DO $$
DECLARE
  required_migrations text[] := ARRAY[
    '20260723000100_init',
    '20260723000200_remove_resource_owner_default',
    '20260723000300_require_explicit_resource_fields',
    '20260727000100_add_i18n_message_keys',
    '20260817000100_add_maintenance_windows',
    '20260820000100_add_booking_guard_constraint',
    '20260820000200_add_orchestration_provenance_and_policy'
  ];
  missing_tables text[] := ARRAY[
    'campuses', 'buildings', 'laboratories', 'lab_policies',
    'resource_capabilities', 'resource_status_history', 'training_courses',
    'training_requirements', 'user_certifications', 'incidents',
    'incident_comments', 'knowledge_documents', 'knowledge_chunks',
    'ai_conversations', 'ai_messages', 'payment_transactions',
    'shipment_orders', 'user_behavior_scores', 'behavior_event_logs'
  ];
  core_tables text[] := ARRAY[
    'users', 'resources', 'bookings', 'usage_logs', 'notifications',
    'telemetry_samples', 'maintenance_windows'
  ];
  orchestration_tables text[] := ARRAY[
    'resource_requirements', 'resource_allocations', 'policy_versions',
    'optimization_runs', 'optimization_decisions'
  ];
  missing_count integer;
  recorded_count integer;
  nonempty_count bigint;
BEGIN
  IF current_setting('server_version_num')::integer < 160000
     OR current_setting('server_version_num')::integer >= 170000 THEN
    RAISE EXCEPTION 'Batch 1C requires PostgreSQL 16.x; found %', current_setting('server_version');
  END IF;

  IF to_regclass('public._prisma_migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing public._prisma_migrations';
  END IF;

  SELECT count(DISTINCT migration_name) INTO recorded_count
  FROM public._prisma_migrations
  WHERE migration_name = ANY(required_migrations)
    AND finished_at IS NOT NULL
    AND rolled_back_at IS NULL;

  IF recorded_count <> cardinality(required_migrations) THEN
    RAISE EXCEPTION
      'All seven prior migrations must be recorded successfully before Batch 1C; found % of %',
      recorded_count, cardinality(required_migrations);
  END IF;

  IF EXISTS (
    SELECT expected.name
    FROM (VALUES
      ('20260723000100_init', 'c942177016dabbfa0c3465a5e923bd0edf490f238021b6ca96ab65cdca03be96'),
      ('20260723000200_remove_resource_owner_default', '66a1614148472e82df95e52c3649e6119a54c9029fc0d4b4bc71e25a688939aa'),
      ('20260723000300_require_explicit_resource_fields', 'df6b0f54b676d92cda13592f3c55bad7b829d9f79058bc1092bf4894e03b9fa7'),
      ('20260727000100_add_i18n_message_keys', '10b67a12359efa91038b95890c1505666e10648d7dd6a12823088544df2c6ed0'),
      ('20260817000100_add_maintenance_windows', '030a4964d697a5b847f94e38e8e5bbecbf921808867a73f15232864b9597022f'),
      ('20260820000100_add_booking_guard_constraint', '658716b3be743f2bbd81b1c2f4dee5248eb1b9751a8eea693ed19b5a2b32eedb'),
      ('20260820000200_add_orchestration_provenance_and_policy', 'ca0da76bb6ef6c8d1f04a518cc8398446e499c0c11bcf70e3155937b61b691c3')
    ) AS expected(name, checksum)
    LEFT JOIN public._prisma_migrations actual
      ON actual.migration_name = expected.name
      AND actual.finished_at IS NOT NULL
      AND actual.rolled_back_at IS NULL
    GROUP BY expected.name, expected.checksum
    HAVING count(actual.id) <> 1
      OR bool_or(actual.checksum IS DISTINCT FROM expected.checksum)
  ) THEN
    RAISE EXCEPTION 'Prior migration checksum/history precondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public._prisma_migrations
    WHERE migration_name <> '20260917000100_reconcile_canonical_persistence'
      AND finished_at IS NULL AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An earlier migration is unfinished';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION
      'btree_gist is absent even though migration 20260820000100 is recorded';
  END IF;

  IF (SELECT pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'public.bookings'::regclass
        AND conname = 'bookings_no_active_overlap'
        AND contype = 'x' AND convalidated)
     IS DISTINCT FROM
       'EXCLUDE USING gist ("resourceId" WITH =, tsrange("startAt", "endAt", ''[)''::text) WITH &&) WHERE ((status = ANY (ARRAY[''pending''::"BookingStatus", ''approved''::"BookingStatus", ''checked_out''::"BookingStatus"])))' THEN
    RAISE EXCEPTION 'Booking guard is not exactly equivalent to migration 20260820000100';
  END IF;

  IF pg_temp.batch1c_columns_hash(orchestration_tables) IS DISTINCT FROM '84a144a24ee7666515e49422dd21003e'
     OR pg_temp.batch1c_constraints_hash(orchestration_tables) IS DISTINCT FROM '3704215e93dc3e137987733758a2e925'
     OR pg_temp.batch1c_indexes_hash(orchestration_tables) IS DISTINCT FROM '10f0a84abfb2a1e5fa3fca8e91771b18' THEN
    RAISE EXCEPTION 'Orchestration objects are not exactly equivalent to migration 20260820000200';
  END IF;

  SELECT count(*) INTO missing_count
  FROM unnest(missing_tables) AS item(name)
  WHERE to_regclass(format('public.%I', item.name)) IS NULL;

  IF missing_count = cardinality(missing_tables)
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'resources'
         AND column_name = 'operationalStatus'
     ) THEN
    IF (SELECT array_agg(tablename::text ORDER BY tablename)
        FROM pg_tables WHERE schemaname = 'public') IS DISTINCT FROM ARRAY[
          '_prisma_migrations', 'bookings', 'maintenance_windows', 'notifications',
          'optimization_decisions', 'optimization_runs', 'policy_versions',
          'resource_allocations', 'resource_requirements', 'resources',
          'telemetry_samples', 'usage_logs', 'users'
        ]::text[] THEN
      RAISE EXCEPTION 'Clean-history path has an unexpected public table set';
    END IF;

    IF pg_temp.batch1c_column_names('users') IS DISTINCT FROM
        ARRAY['id','email','fullName','role','passwordHash','isActive','createdAt']::text[]
       OR pg_temp.batch1c_column_names('resources') IS DISTINCT FROM
        ARRAY['id','code','name','type','location','status','ownerTeam','capacity','requiresApproval','specs','createdAt']::text[]
       OR pg_temp.batch1c_column_names('bookings') IS DISTINCT FROM
        ARRAY['id','resourceId','requestedById','approvedById','title','purpose','startAt','endAt','status','notes','handoverCondition','returnCondition','createdAt','updatedAt']::text[]
       OR pg_temp.batch1c_column_names('usage_logs') IS DISTINCT FROM
        ARRAY['id','resourceId','bookingId','userId','action','message','conditionBefore','conditionAfter','createdAt','messageKey','messageParams']::text[]
       OR pg_temp.batch1c_column_names('notifications') IS DISTINCT FROM
        ARRAY['id','userId','title','message','severity','readAt','createdAt','titleKey','messageKey','messageParams']::text[]
       OR pg_temp.batch1c_column_names('telemetry_samples') IS DISTINCT FROM
        ARRAY['id','resourceId','cpuPercent','gpuPercent','gpuMemoryPercent','ramPercent','diskPercent','temperatureC','online','source','sampledAt']::text[]
       OR pg_temp.batch1c_column_names('maintenance_windows') IS DISTINCT FROM
        ARRAY['id','resourceId','createdById','kind','status','title','startAt','endAt','notes','createdAt','updatedAt']::text[] THEN
      RAISE EXCEPTION 'Clean-history core column shape differs from repository migrations';
    END IF;

    SELECT
      (SELECT count(*) FROM users) +
      (SELECT count(*) FROM resources) +
      (SELECT count(*) FROM bookings) +
      (SELECT count(*) FROM usage_logs) +
      (SELECT count(*) FROM notifications) +
      (SELECT count(*) FROM telemetry_samples) +
      (SELECT count(*) FROM maintenance_windows) +
      (SELECT count(*) FROM resource_requirements) +
      (SELECT count(*) FROM resource_allocations) +
      (SELECT count(*) FROM policy_versions) +
      (SELECT count(*) FROM optimization_runs) +
      (SELECT count(*) FROM optimization_decisions)
    INTO nonempty_count;

    IF nonempty_count <> 0 THEN
      RAISE EXCEPTION
        'Clean-history path must be empty before out-of-band schema creation; found % rows',
        nonempty_count;
    END IF;
    PERFORM set_config('batch1c.path', 'clean', true);
  ELSIF missing_count = 0
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'resources'
         AND column_name = 'operationalStatus'
     ) THEN
    IF pg_temp.batch1c_columns_hash(core_tables) IS DISTINCT FROM '79909f3313424cf2023b4f5c7c736bfd'
       OR pg_temp.batch1c_constraints_hash(core_tables) IS DISTINCT FROM '3c42537d7cafe5d861a9973a5e2a03b3'
       OR pg_temp.batch1c_indexes_hash(core_tables) IS DISTINCT FROM '2ca39319bb3012a01441ff581498ea87' THEN
      RAISE EXCEPTION 'Verified-upgrade core table shape does not match Batch 1B evidence';
    END IF;

    IF pg_temp.batch1c_columns_hash(missing_tables) IS DISTINCT FROM 'c647b09c23f448fea4b3b4152d002e84'
       OR pg_temp.batch1c_constraints_hash(missing_tables) IS DISTINCT FROM '299299a051ae0a44277e49bfa6c8da65'
       OR pg_temp.batch1c_indexes_hash(missing_tables) IS DISTINCT FROM '72c48b96397abbceb32be0b0c1098e83' THEN
      RAISE EXCEPTION 'Verified-upgrade 19-table shape does not match Batch 1B evidence';
    END IF;

    PERFORM set_config('batch1c.path', 'upgrade', true);
  ELSE
    RAISE EXCEPTION
      'Unsupported partial persistence shape: % of % Batch 1B tables are missing',
      missing_count, cardinality(missing_tables);
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('batch1c.path') = 'clean' THEN
    CREATE TYPE public."OperationalStatus" AS ENUM
      ('AVAILABLE','IN_USE','MAINTENANCE','CALIBRATION','BROKEN','RETIRED','OFFLINE');
    CREATE TYPE public."BookingState" AS ENUM ('bookable','restricted','non_bookable');
    CREATE TYPE public."IncidentSeverity" AS ENUM ('low','medium','high','critical');
    CREATE TYPE public."IncidentStatus" AS ENUM
      ('reported','triaged','assigned','investigating','resolved','verified','closed');
    CREATE TYPE public."PaymentStatus" AS ENUM ('pending','success','failed','refunded');
    CREATE TYPE public."ShipmentStatus" AS ENUM
      ('pending','picking','delivering','delivered','cancelled','returned');
    CREATE TYPE public."CertificationStatus" AS ENUM ('pending','active','expired','revoked');
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('batch1c.path') = 'clean' THEN
    CREATE TABLE public.campuses (
      id text NOT NULL PRIMARY KEY,
      name text NOT NULL,
      code text NOT NULL,
      address text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.buildings (
      id text NOT NULL PRIMARY KEY,
      "campusId" text NOT NULL,
      name text NOT NULL,
      code text NOT NULL,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.laboratories (
      id text NOT NULL PRIMARY KEY,
      "buildingId" text NOT NULL,
      name text NOT NULL,
      code text NOT NULL,
      description text,
      capacity integer NOT NULL DEFAULT 0,
      "openingTime" text,
      "closingTime" text,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.lab_policies (
      id text NOT NULL PRIMARY KEY,
      "laboratoryId" text NOT NULL,
      "maxBookingMinutes" integer NOT NULL DEFAULT 480,
      "minBookingMinutes" integer NOT NULL DEFAULT 15,
      "maxAdvanceBookingDays" integer NOT NULL DEFAULT 30,
      "checkInGraceMinutes" integer NOT NULL DEFAULT 20,
      "requiresApproval" boolean NOT NULL DEFAULT false,
      "allowWeekend" boolean NOT NULL DEFAULT false,
      "workDayStartHour" integer NOT NULL DEFAULT 8,
      "workDayEndHour" integer NOT NULL DEFAULT 18,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.resource_capabilities (
      id text NOT NULL PRIMARY KEY,
      "resourceId" text NOT NULL,
      key text NOT NULL,
      value text NOT NULL,
      unit text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.resource_status_history (
      id text NOT NULL PRIMARY KEY,
      "resourceId" text NOT NULL,
      "fromStatus" public."OperationalStatus" NOT NULL,
      "toStatus" public."OperationalStatus" NOT NULL,
      reason text,
      "changedById" text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.training_courses (
      id text NOT NULL PRIMARY KEY,
      name text NOT NULL,
      code text NOT NULL,
      description text,
      "durationHours" double precision,
      "isRequired" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.training_requirements (
      id text NOT NULL PRIMARY KEY,
      "resourceId" text NOT NULL,
      "courseId" text NOT NULL,
      "isMandatory" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.user_certifications (
      id text NOT NULL PRIMARY KEY,
      "userId" text NOT NULL,
      "courseId" text NOT NULL,
      status public."CertificationStatus" NOT NULL DEFAULT 'active',
      "issuedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" timestamp(3) without time zone,
      "issuedById" text,
      notes text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.incidents (
      id text NOT NULL PRIMARY KEY,
      "resourceId" text NOT NULL,
      "bookingId" text,
      "reportedById" text NOT NULL,
      "assignedToId" text,
      severity public."IncidentSeverity" NOT NULL DEFAULT 'medium',
      status public."IncidentStatus" NOT NULL DEFAULT 'reported',
      category text,
      title text NOT NULL,
      description text NOT NULL,
      "detectedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "resolvedAt" timestamp(3) without time zone,
      resolution text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.incident_comments (
      id text NOT NULL PRIMARY KEY,
      "incidentId" text NOT NULL,
      "authorId" text,
      content text NOT NULL,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.knowledge_documents (
      id text NOT NULL PRIMARY KEY,
      "resourceId" text,
      "laboratoryId" text,
      title text NOT NULL,
      "sourceType" text NOT NULL DEFAULT 'manual',
      "fileName" text,
      "fileUrl" text,
      version text,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.knowledge_chunks (
      id text NOT NULL PRIMARY KEY,
      "documentId" text NOT NULL,
      "chunkIndex" integer NOT NULL,
      content text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      "embeddingJson" text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.ai_conversations (
      id text NOT NULL PRIMARY KEY,
      "userId" text NOT NULL,
      title text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL
    );

    CREATE TABLE public.ai_messages (
      id text NOT NULL PRIMARY KEY,
      "conversationId" text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      "toolName" text,
      "toolInput" jsonb,
      "toolOutput" jsonb,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.payment_transactions (
      id text NOT NULL PRIMARY KEY,
      "bookingId" text,
      "userId" text NOT NULL,
      "txnRef" text NOT NULL,
      amount double precision NOT NULL,
      currency text NOT NULL DEFAULT 'VND',
      provider text NOT NULL DEFAULT 'vnpay',
      status public."PaymentStatus" NOT NULL DEFAULT 'pending',
      "bankCode" text,
      "cardType" text,
      "vnpResponseCode" text,
      "vnpTransactionNo" text,
      "paymentUrl" text,
      "paidAt" timestamp(3) without time zone,
      description text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.shipment_orders (
      id text NOT NULL PRIMARY KEY,
      "bookingId" text,
      "resourceId" text,
      "userId" text NOT NULL,
      "trackingCode" text NOT NULL,
      provider text NOT NULL DEFAULT 'ghn',
      status public."ShipmentStatus" NOT NULL DEFAULT 'pending',
      fee double precision NOT NULL DEFAULT 0,
      "senderAddress" text NOT NULL,
      "recipientName" text NOT NULL,
      "recipientPhone" text NOT NULL,
      "recipientAddress" text NOT NULL,
      "expectedDelivery" timestamp(3) without time zone,
      "deliveredAt" timestamp(3) without time zone,
      "rawResponse" jsonb NOT NULL DEFAULT '{}',
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.user_behavior_scores (
      id text NOT NULL PRIMARY KEY,
      "userId" text NOT NULL,
      "currentScore" double precision NOT NULL DEFAULT 100.0,
      "lateCancelCount" integer NOT NULL DEFAULT 0,
      "noShowCount" integer NOT NULL DEFAULT 0,
      "quotaBreachCount" integer NOT NULL DEFAULT 0,
      "cleanStreakDays" integer NOT NULL DEFAULT 0,
      "lastViolationAt" timestamp(3) without time zone,
      "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE public.behavior_event_logs (
      id text NOT NULL PRIMARY KEY,
      "scoreId" text NOT NULL,
      "eventType" text NOT NULL,
      "scoreDelta" double precision NOT NULL,
      "previousScore" double precision NOT NULL,
      "newScore" double precision NOT NULL,
      reason text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX campuses_code_key ON public.campuses (code);
    CREATE UNIQUE INDEX buildings_code_key ON public.buildings (code);
    CREATE INDEX "buildings_campusId_idx" ON public.buildings ("campusId");
    CREATE UNIQUE INDEX laboratories_code_key ON public.laboratories (code);
    CREATE INDEX "laboratories_buildingId_idx" ON public.laboratories ("buildingId");
    CREATE UNIQUE INDEX "lab_policies_laboratoryId_key" ON public.lab_policies ("laboratoryId");
    CREATE UNIQUE INDEX "resource_capabilities_resourceId_key_key"
      ON public.resource_capabilities ("resourceId", key);
    CREATE INDEX "resource_capabilities_resourceId_idx"
      ON public.resource_capabilities ("resourceId");
    CREATE INDEX "resource_status_history_resourceId_createdAt_idx"
      ON public.resource_status_history ("resourceId", "createdAt");
    CREATE UNIQUE INDEX training_courses_code_key ON public.training_courses (code);
    CREATE UNIQUE INDEX "training_requirements_resourceId_courseId_key"
      ON public.training_requirements ("resourceId", "courseId");
    CREATE INDEX "training_requirements_resourceId_idx"
      ON public.training_requirements ("resourceId");
    CREATE UNIQUE INDEX "user_certifications_userId_courseId_key"
      ON public.user_certifications ("userId", "courseId");
    CREATE INDEX "user_certifications_userId_status_idx"
      ON public.user_certifications ("userId", status);
    CREATE INDEX "user_certifications_userId_expiresAt_idx"
      ON public.user_certifications ("userId", "expiresAt");
    CREATE INDEX "incidents_resourceId_idx" ON public.incidents ("resourceId");
    CREATE INDEX incidents_status_idx ON public.incidents (status);
    CREATE INDEX "incidents_reportedById_idx" ON public.incidents ("reportedById");
    CREATE INDEX "incident_comments_incidentId_idx"
      ON public.incident_comments ("incidentId");
    CREATE INDEX "knowledge_documents_resourceId_idx"
      ON public.knowledge_documents ("resourceId");
    CREATE INDEX "knowledge_chunks_documentId_idx"
      ON public.knowledge_chunks ("documentId");
    CREATE INDEX "ai_conversations_userId_idx" ON public.ai_conversations ("userId");
    CREATE INDEX "ai_messages_conversationId_idx" ON public.ai_messages ("conversationId");
    CREATE UNIQUE INDEX "payment_transactions_txnRef_key"
      ON public.payment_transactions ("txnRef");
    CREATE INDEX "payment_transactions_userId_idx"
      ON public.payment_transactions ("userId");
    CREATE INDEX "payment_transactions_bookingId_idx"
      ON public.payment_transactions ("bookingId");
    CREATE INDEX payment_transactions_status_idx ON public.payment_transactions (status);
    CREATE UNIQUE INDEX "shipment_orders_trackingCode_key"
      ON public.shipment_orders ("trackingCode");
    CREATE INDEX "shipment_orders_userId_idx" ON public.shipment_orders ("userId");
    CREATE INDEX "shipment_orders_bookingId_idx" ON public.shipment_orders ("bookingId");
    CREATE INDEX "shipment_orders_trackingCode_idx" ON public.shipment_orders ("trackingCode");
    CREATE UNIQUE INDEX "user_behavior_scores_userId_key"
      ON public.user_behavior_scores ("userId");
    CREATE INDEX "user_behavior_scores_userId_idx"
      ON public.user_behavior_scores ("userId");
    CREATE INDEX "behavior_event_logs_scoreId_createdAt_idx"
      ON public.behavior_event_logs ("scoreId", "createdAt");

    ALTER TABLE public.buildings ADD CONSTRAINT "buildings_campusId_fkey"
      FOREIGN KEY ("campusId") REFERENCES public.campuses(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.laboratories ADD CONSTRAINT "laboratories_buildingId_fkey"
      FOREIGN KEY ("buildingId") REFERENCES public.buildings(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.lab_policies ADD CONSTRAINT "lab_policies_laboratoryId_fkey"
      FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.resource_capabilities ADD CONSTRAINT "resource_capabilities_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.resource_status_history ADD CONSTRAINT "resource_status_history_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.training_requirements ADD CONSTRAINT "training_requirements_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.training_requirements ADD CONSTRAINT "training_requirements_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES public.training_courses(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.user_certifications ADD CONSTRAINT "user_certifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public.users(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.user_certifications ADD CONSTRAINT "user_certifications_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES public.training_courses(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.incidents ADD CONSTRAINT "incidents_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.incidents ADD CONSTRAINT "incidents_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES public.bookings(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.incidents ADD CONSTRAINT "incidents_reportedById_fkey"
      FOREIGN KEY ("reportedById") REFERENCES public.users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE public.incidents ADD CONSTRAINT "incidents_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES public.users(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.incident_comments ADD CONSTRAINT "incident_comments_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES public.incidents(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.knowledge_documents ADD CONSTRAINT "knowledge_documents_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.knowledge_documents ADD CONSTRAINT "knowledge_documents_laboratoryId_fkey"
      FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.knowledge_chunks ADD CONSTRAINT "knowledge_chunks_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES public.knowledge_documents(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.ai_messages ADD CONSTRAINT "ai_messages_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES public.ai_conversations(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.payment_transactions ADD CONSTRAINT "payment_transactions_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES public.bookings(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.payment_transactions ADD CONSTRAINT "payment_transactions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public.users(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.shipment_orders ADD CONSTRAINT "shipment_orders_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES public.bookings(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.shipment_orders ADD CONSTRAINT "shipment_orders_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE public.shipment_orders ADD CONSTRAINT "shipment_orders_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public.users(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.user_behavior_scores ADD CONSTRAINT "user_behavior_scores_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public.users(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE public.behavior_event_logs ADD CONSTRAINT "behavior_event_logs_scoreId_fkey"
      FOREIGN KEY ("scoreId") REFERENCES public.user_behavior_scores(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

LOCK TABLE public.users, public.resources, public.bookings, public.usage_logs,
  public.notifications, public.telemetry_samples, public.maintenance_windows
  IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  labels text[];
BEGIN
  labels := pg_temp.batch1c_enum_labels('Role');
  IF labels IS DISTINCT FROM ARRAY['admin', 'lab_staff', 'lecturer', 'student']::text[] THEN
    RAISE EXCEPTION 'Unexpected Role labels: %', labels;
  END IF;

  labels := pg_temp.batch1c_enum_labels('ResourceType');
  IF labels = ARRAY['room','gpu_server','raspberry_pi','uav','camera','kit','material']::text[] THEN
    IF current_setting('batch1c.path') <> 'clean' THEN
      RAISE EXCEPTION 'Seven-label ResourceType is permitted only on the verified-empty clean path';
    END IF;

    ALTER TABLE public.resource_requirements ALTER COLUMN "resourceType" DROP DEFAULT;
    ALTER TYPE public."ResourceType" RENAME TO "ResourceType_legacy_b1c";
    CREATE TYPE public."ResourceType" AS ENUM
      ('room','gpu_server','raspberry_pi','uav','camera','kit','material','other');
    ALTER TABLE public.resources
      ALTER COLUMN "type" TYPE public."ResourceType"
      USING ("type"::text::public."ResourceType");
    ALTER TABLE public.resource_requirements
      ALTER COLUMN "resourceType" TYPE public."ResourceType"
      USING ("resourceType"::text::public."ResourceType");
    ALTER TABLE public.resource_requirements
      ALTER COLUMN "resourceType" SET DEFAULT 'gpu_server'::public."ResourceType";
    DROP TYPE public."ResourceType_legacy_b1c";
  ELSIF labels IS DISTINCT FROM ARRAY['room','gpu_server','raspberry_pi','uav','camera','kit','material','other']::text[] THEN
    RAISE EXCEPTION 'Unexpected ResourceType labels: %', labels;
  END IF;

  labels := pg_temp.batch1c_enum_labels('BookingStatus');
  IF labels IS DISTINCT FROM
      ARRAY['pending','approved','rejected','cancelled','checked_out','completed']::text[]
     AND labels IS DISTINCT FROM
      ARRAY['pending','approved','rejected','cancelled','checked_out','completed','no_show']::text[] THEN
    RAISE EXCEPTION 'Unexpected BookingStatus labels: %', labels;
  END IF;

  labels := pg_temp.batch1c_enum_labels('UsageAction');
  IF labels IS DISTINCT FROM
      ARRAY['request','approve','reject','check_out','check_in','status_change','telemetry']::text[]
     AND labels IS DISTINCT FROM
      ARRAY['request','approve','reject','check_out','check_in','status_change','telemetry','cancel','incident_reported']::text[] THEN
    RAISE EXCEPTION 'Unexpected UsageAction labels: %', labels;
  END IF;

  IF to_regtype('public."OperationalStatus"') IS NULL THEN
    CREATE TYPE public."OperationalStatus" AS ENUM
      ('AVAILABLE','IN_USE','MAINTENANCE','CALIBRATION','BROKEN','RETIRED','OFFLINE');
  ELSIF pg_temp.batch1c_enum_labels('OperationalStatus') =
      ARRAY['available','in_use','maintenance','calibration','broken','retired','offline']::text[] THEN
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'available' TO 'AVAILABLE';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'in_use' TO 'IN_USE';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'maintenance' TO 'MAINTENANCE';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'calibration' TO 'CALIBRATION';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'broken' TO 'BROKEN';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'retired' TO 'RETIRED';
    ALTER TYPE public."OperationalStatus" RENAME VALUE 'offline' TO 'OFFLINE';
  ELSIF pg_temp.batch1c_enum_labels('OperationalStatus') IS DISTINCT FROM
      ARRAY['AVAILABLE','IN_USE','MAINTENANCE','CALIBRATION','BROKEN','RETIRED','OFFLINE']::text[] THEN
    RAISE EXCEPTION 'Unexpected OperationalStatus labels: %',
      pg_temp.batch1c_enum_labels('OperationalStatus');
  END IF;

  IF to_regtype('public."BookingState"') IS NULL THEN
    CREATE TYPE public."BookingState" AS ENUM ('bookable','restricted','non_bookable');
  ELSIF pg_temp.batch1c_enum_labels('BookingState') IS DISTINCT FROM
      ARRAY['bookable','restricted','non_bookable']::text[] THEN
    RAISE EXCEPTION 'Unexpected BookingState labels';
  END IF;

  IF to_regtype('public."IncidentSeverity"') IS NULL THEN
    CREATE TYPE public."IncidentSeverity" AS ENUM ('low','medium','high','critical');
  ELSIF pg_temp.batch1c_enum_labels('IncidentSeverity') IS DISTINCT FROM
      ARRAY['low','medium','high','critical']::text[] THEN
    RAISE EXCEPTION 'Unexpected IncidentSeverity labels';
  END IF;

  IF to_regtype('public."IncidentStatus"') IS NULL THEN
    CREATE TYPE public."IncidentStatus" AS ENUM
      ('reported','triaged','assigned','investigating','resolved','verified','closed');
  ELSIF pg_temp.batch1c_enum_labels('IncidentStatus') IS DISTINCT FROM
      ARRAY['reported','triaged','assigned','investigating','resolved','verified','closed']::text[] THEN
    RAISE EXCEPTION 'Unexpected IncidentStatus labels';
  END IF;

  IF to_regtype('public."PaymentStatus"') IS NULL THEN
    CREATE TYPE public."PaymentStatus" AS ENUM ('pending','success','failed','refunded');
  ELSIF pg_temp.batch1c_enum_labels('PaymentStatus') IS DISTINCT FROM
      ARRAY['pending','success','failed','refunded']::text[] THEN
    RAISE EXCEPTION 'Unexpected PaymentStatus labels';
  END IF;

  IF to_regtype('public."ShipmentStatus"') IS NULL THEN
    CREATE TYPE public."ShipmentStatus" AS ENUM
      ('pending','picking','delivering','delivered','cancelled','returned');
  ELSIF pg_temp.batch1c_enum_labels('ShipmentStatus') IS DISTINCT FROM
      ARRAY['pending','picking','delivering','delivered','cancelled','returned']::text[] THEN
    RAISE EXCEPTION 'Unexpected ShipmentStatus labels';
  END IF;

  IF to_regtype('public."CertificationStatus"') IS NULL THEN
    CREATE TYPE public."CertificationStatus" AS ENUM ('pending','active','expired','revoked');
  ELSIF pg_temp.batch1c_enum_labels('CertificationStatus') IS DISTINCT FROM
      ARRAY['pending','active','expired','revoked']::text[] THEN
    RAISE EXCEPTION 'Unexpected CertificationStatus labels';
  END IF;

  IF to_regtype('public."ResourceCategory"') IS NOT NULL
     OR to_regtype('public."BookingOutcome"') IS NOT NULL
     OR to_regtype('public."AuditActorType"') IS NOT NULL
     OR to_regtype('public."NotificationType"') IS NOT NULL THEN
    RAISE EXCEPTION 'Batch 1C target enum already exists; refusing partial reconciliation';
  END IF;

  CREATE TYPE public."ResourceCategory" AS ENUM
    ('ROOM','EQUIPMENT','MACHINE','EXPERIMENT_KIT','MATERIAL');
  CREATE TYPE public."BookingOutcome" AS ENUM ('NO_SHOW');
  CREATE TYPE public."AuditActorType" AS ENUM ('USER','SYSTEM','SERVICE');
  CREATE TYPE public."NotificationType" AS ENUM
    ('BOOKING_APPROVED','BOOKING_REJECTED','BOOKING_UPCOMING','RETURN_REMINDER');
END $$;

ALTER TYPE public."Role" RENAME VALUE 'admin' TO 'ADMIN';
ALTER TYPE public."Role" RENAME VALUE 'lab_staff' TO 'LAB_STAFF';
ALTER TYPE public."Role" RENAME VALUE 'lecturer' TO 'LECTURER';
ALTER TYPE public."Role" RENAME VALUE 'student' TO 'STUDENT';

DO $$
BEGIN
  IF current_setting('batch1c.path') = 'clean' THEN
    ALTER TABLE public.users
      ADD COLUMN department text,
      ADD COLUMN phone text,
      ADD COLUMN "studentId" text,
      ADD COLUMN "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE public.resources
      ADD COLUMN "bookingState" public."BookingState" NOT NULL DEFAULT 'bookable',
      ADD COLUMN description text,
      ADD COLUMN "laboratoryId" text,
      ADD COLUMN manufacturer text,
      ADD COLUMN model text,
      ADD COLUMN "operationalStatus" public."OperationalStatus",
      ADD COLUMN "purchaseDate" timestamp(3) without time zone,
      ADD COLUMN "serialNumber" text,
      ADD COLUMN "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN version integer NOT NULL DEFAULT 0,
      ADD COLUMN "warrantyExpiry" timestamp(3) without time zone;

    ALTER TABLE public.bookings
      ADD COLUMN "actualEndAt" timestamp(3) without time zone,
      ADD COLUMN "actualStartAt" timestamp(3) without time zone,
      ADD COLUMN "bookingCode" text,
      ADD COLUMN "checkinDeadline" timestamp(3) without time zone,
      ADD COLUMN "idempotencyKey" text,
      ADD COLUMN priority integer NOT NULL DEFAULT 0;

    ALTER TABLE public.usage_logs ADD COLUMN "ipAddress" text;

    ALTER TABLE public.notifications
      ADD COLUMN channel text NOT NULL DEFAULT 'in_app',
      ADD COLUMN "scheduledAt" timestamp(3) without time zone,
      ADD COLUMN "sentAt" timestamp(3) without time zone,
      ADD COLUMN type public."NotificationType";

    ALTER TABLE public.maintenance_windows
      ADD COLUMN cost double precision,
      ADD COLUMN vendor text;

    DROP INDEX public."notifications_userId_idx";
    CREATE INDEX "notifications_userId_readAt_idx"
      ON public.notifications ("userId", "readAt");
    CREATE INDEX "notifications_userId_createdAt_idx"
      ON public.notifications ("userId", "createdAt");
    CREATE INDEX "usage_logs_userId_idx" ON public.usage_logs ("userId");
    CREATE INDEX "resources_laboratoryId_idx" ON public.resources ("laboratoryId");
    CREATE INDEX "resources_operationalStatus_idx" ON public.resources ("operationalStatus");
    CREATE INDEX "resources_bookingState_idx" ON public.resources ("bookingState");
    CREATE UNIQUE INDEX "bookings_bookingCode_key" ON public.bookings ("bookingCode");
    CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON public.bookings ("idempotencyKey");
    CREATE INDEX "bookings_idempotencyKey_idx" ON public.bookings ("idempotencyKey");
    ALTER TABLE public.resources ADD CONSTRAINT "resources_laboratoryId_fkey"
      FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
DECLARE
  conflict_count integer;
  correction_needed boolean;
BEGIN
  SELECT count(*) INTO conflict_count
  FROM public.resources
  WHERE status::text = 'reserved';
  IF conflict_count <> 0 THEN
    RAISE EXCEPTION
      'ResourceStatus=reserved is not a physical condition; % rows require manual review',
      conflict_count;
  END IF;

  IF current_setting('batch1c.path') = 'clean' THEN
    UPDATE public.resources
    SET "operationalStatus" = CASE status::text
      WHEN 'available' THEN 'AVAILABLE'::public."OperationalStatus"
      WHEN 'in_use' THEN 'IN_USE'::public."OperationalStatus"
      WHEN 'maintenance' THEN 'MAINTENANCE'::public."OperationalStatus"
      WHEN 'offline' THEN 'OFFLINE'::public."OperationalStatus"
      ELSE NULL
    END;

    IF EXISTS (SELECT 1 FROM public.resources WHERE "operationalStatus" IS NULL) THEN
      RAISE EXCEPTION 'Unable to derive OperationalStatus on clean path';
    END IF;
    ALTER TABLE public.resources ALTER COLUMN "operationalStatus" SET NOT NULL;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.resources
      WHERE status::text <> CASE "operationalStatus"::text
        WHEN 'AVAILABLE' THEN 'available'
        WHEN 'IN_USE' THEN 'in_use'
        WHEN 'MAINTENANCE' THEN 'maintenance'
        WHEN 'CALIBRATION' THEN 'maintenance'
        WHEN 'BROKEN' THEN 'maintenance'
        WHEN 'RETIRED' THEN 'offline'
        WHEN 'OFFLINE' THEN 'offline'
      END
      AND NOT (
        code = 'UAV-M350-RTK-01'
        AND status::text = 'maintenance'
        AND "operationalStatus"::text = 'AVAILABLE'
      )
    ) THEN
      RAISE EXCEPTION 'Unexpected ResourceStatus/OperationalStatus disagreement';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.resources
      WHERE code = 'UAV-M350-RTK-01'
        AND status::text = 'maintenance'
        AND "operationalStatus"::text = 'AVAILABLE'
    ) INTO correction_needed;

    IF correction_needed THEN
      IF EXISTS (
        SELECT 1 FROM public.resource_status_history
        WHERE id = 'b1c00000-0000-4000-8000-000000000001'
      ) THEN
        RAISE EXCEPTION 'Reserved Batch 1C status-history ID is already in use';
      END IF;

      UPDATE public.resources
      SET "operationalStatus" = 'MAINTENANCE'
      WHERE code = 'UAV-M350-RTK-01';

      INSERT INTO public.resource_status_history
        (id, "resourceId", "fromStatus", "toStatus", reason, "changedById", "createdAt")
      SELECT
        'b1c00000-0000-4000-8000-000000000001', id,
        'AVAILABLE', 'MAINTENANCE',
        'Batch 1C reconciliation: compatibility status was maintenance while operational status was available; resource remains unbookable pending staff verification.',
        NULL, CURRENT_TIMESTAMP
      FROM public.resources
      WHERE code = 'UAV-M350-RTK-01';
    END IF;
  END IF;

  UPDATE public.resources
  SET status = CASE "operationalStatus"::text
    WHEN 'AVAILABLE' THEN 'available'::public."ResourceStatus"
    WHEN 'IN_USE' THEN 'in_use'::public."ResourceStatus"
    WHEN 'MAINTENANCE' THEN 'maintenance'::public."ResourceStatus"
    WHEN 'CALIBRATION' THEN 'maintenance'::public."ResourceStatus"
    WHEN 'BROKEN' THEN 'maintenance'::public."ResourceStatus"
    WHEN 'RETIRED' THEN 'offline'::public."ResourceStatus"
    WHEN 'OFFLINE' THEN 'offline'::public."ResourceStatus"
  END;
END $$;

ALTER TABLE public.resources
  ALTER COLUMN "operationalStatus" SET DEFAULT 'AVAILABLE',
  ALTER COLUMN status SET DEFAULT 'available',
  ALTER COLUMN "ownerTeam" SET DEFAULT '',
  ALTER COLUMN capacity SET DEFAULT 1,
  ALTER COLUMN "requiresApproval" SET DEFAULT false,
  ADD COLUMN category public."ResourceCategory";

UPDATE public.resources
SET category = CASE type::text
  WHEN 'room' THEN 'ROOM'::public."ResourceCategory"
  WHEN 'gpu_server' THEN 'MACHINE'::public."ResourceCategory"
  WHEN 'kit' THEN 'EXPERIMENT_KIT'::public."ResourceCategory"
  WHEN 'material' THEN 'MATERIAL'::public."ResourceCategory"
  ELSE NULL
END;

DO $$
DECLARE
  no_show_count integer;
BEGIN
  SELECT count(*) INTO no_show_count
  FROM public.bookings
  WHERE status::text = 'no_show';
  IF no_show_count <> 0 THEN
    RAISE EXCEPTION
      'Cannot losslessly migrate % booking rows with status=no_show; review required',
      no_show_count;
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings WHERE "startAt" >= "endAt") THEN
    RAISE EXCEPTION 'Invalid booking range found before Batch 1C';
  END IF;
  IF EXISTS (SELECT 1 FROM public.maintenance_windows WHERE "startAt" >= "endAt") THEN
    RAISE EXCEPTION 'Invalid maintenance range found before Batch 1C';
  END IF;
END $$;

ALTER TABLE public.bookings DROP CONSTRAINT bookings_no_active_overlap;
ALTER TABLE public.bookings ALTER COLUMN status DROP DEFAULT;
ALTER TYPE public."BookingStatus" RENAME TO "BookingStatus_legacy_b1c";
CREATE TYPE public."BookingStatus" AS ENUM
  ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED','COMPLETED','REJECTED','CANCELLED');

ALTER TABLE public.bookings
  ALTER COLUMN status TYPE public."BookingStatus"
  USING (CASE status::text
    WHEN 'pending' THEN 'PENDING_APPROVAL'
    WHEN 'approved' THEN 'CONFIRMED'
    WHEN 'checked_out' THEN 'CHECKED_OUT'
    WHEN 'completed' THEN 'COMPLETED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'cancelled' THEN 'CANCELLED'
    ELSE NULL
  END)::public."BookingStatus";

DROP TYPE public."BookingStatus_legacy_b1c";

ALTER TABLE public.bookings
  ALTER COLUMN status SET DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN "approvedAt" timestamp(3) without time zone,
  ADD COLUMN "returnedAt" timestamp(3) without time zone,
  ADD COLUMN "completedAt" timestamp(3) without time zone,
  ADD COLUMN outcome public."BookingOutcome",
  ADD COLUMN "outcomeAt" timestamp(3) without time zone,
  ADD CONSTRAINT bookings_valid_time_range CHECK ("startAt" < "endAt"),
  ADD CONSTRAINT bookings_outcome_timestamp_consistency CHECK (
    (outcome IS NULL AND "outcomeAt" IS NULL)
    OR (outcome IS NOT NULL AND "outcomeAt" IS NOT NULL)
  );

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_active_overlap
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED'));

ALTER TABLE public.maintenance_windows
  ADD CONSTRAINT maintenance_windows_valid_time_range CHECK ("startAt" < "endAt");

ALTER TYPE public."UsageAction" RENAME TO "UsageAction_legacy_b1c";
CREATE TYPE public."UsageAction" AS ENUM
  ('REQUEST','APPROVE','REJECT','CHECK_OUT','CHECK_IN','RETURN','COMPLETE',
   'STATUS_CHANGE','TELEMETRY','CANCEL','INCIDENT_REPORTED','NO_SHOW');

ALTER TABLE public.usage_logs
  ALTER COLUMN action TYPE public."UsageAction"
  USING (CASE action::text
    WHEN 'request' THEN 'REQUEST'
    WHEN 'approve' THEN 'APPROVE'
    WHEN 'reject' THEN 'REJECT'
    WHEN 'check_out' THEN 'CHECK_OUT'
    WHEN 'check_in' THEN 'CHECK_IN'
    WHEN 'status_change' THEN 'STATUS_CHANGE'
    WHEN 'telemetry' THEN 'TELEMETRY'
    WHEN 'cancel' THEN 'CANCEL'
    WHEN 'incident_reported' THEN 'INCIDENT_REPORTED'
    ELSE NULL
  END)::public."UsageAction";

DROP TYPE public."UsageAction_legacy_b1c";

ALTER TABLE public.usage_logs
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "actorType" public."AuditActorType" NOT NULL DEFAULT 'USER',
  ADD COLUMN "actorRef" text,
  ADD COLUMN "fromStatus" public."BookingStatus",
  ADD COLUMN "toStatus" public."BookingStatus",
  ADD COLUMN reason text,
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}',
  ADD CONSTRAINT usage_logs_actor_source_check CHECK (
    ("actorType" = 'USER' AND "userId" IS NOT NULL AND "actorRef" IS NULL)
    OR
    ("actorType" IN ('SYSTEM','SERVICE') AND "userId" IS NULL
      AND nullif(btrim("actorRef"), '') IS NOT NULL)
  );

DO $$
BEGIN
  IF current_setting('batch1c.path') = 'upgrade' THEN
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE type IS NOT NULL
        AND upper(type) NOT IN (
          'BOOKING_APPROVED','BOOKING_REJECTED','BOOKING_UPCOMING','RETURN_REMINDER'
        )
    ) THEN
      RAISE EXCEPTION 'Unknown notification type prevents canonical enum conversion';
    END IF;

    ALTER TABLE public.notifications
      ALTER COLUMN type TYPE public."NotificationType"
      USING CASE
        WHEN type IS NULL THEN NULL
        ELSE upper(type)::public."NotificationType"
      END;
  END IF;
END $$;

ALTER TABLE public.notifications ADD COLUMN "dedupeKey" text;
CREATE UNIQUE INDEX "notifications_dedupeKey_key"
  ON public.notifications ("dedupeKey");
CREATE INDEX "notifications_userId_type_scheduledAt_idx"
  ON public.notifications ("userId", type, "scheduledAt");

ALTER TABLE public.telemetry_samples
  ADD COLUMN "humidityPercent" double precision,
  ADD COLUMN "verifiedSignals" jsonb,
  ADD CONSTRAINT telemetry_samples_humidity_range CHECK (
    "humidityPercent" IS NULL
    OR ("humidityPercent" >= 0 AND "humidityPercent" <= 100)
  );

DO $$
BEGIN
  IF to_regclass('public.user_lab_assignments') IS NOT NULL THEN
    RAISE EXCEPTION 'user_lab_assignments already exists; refusing partial reconciliation';
  END IF;
END $$;

CREATE TABLE public.user_lab_assignments (
  "userId" text NOT NULL,
  "laboratoryId" text NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_lab_assignments_pkey PRIMARY KEY ("userId", "laboratoryId"),
  CONSTRAINT "user_lab_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES public.users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_lab_assignments_laboratoryId_fkey"
    FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "user_lab_assignments_laboratoryId_idx"
  ON public.user_lab_assignments ("laboratoryId");

-- Critical audit-retention changes. Configuration/advanced-model cascades remain
-- unchanged and are documented for later archival work.
ALTER TABLE public.bookings DROP CONSTRAINT "bookings_resourceId_fkey";
ALTER TABLE public.bookings ADD CONSTRAINT "bookings_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.usage_logs DROP CONSTRAINT "usage_logs_resourceId_fkey";
ALTER TABLE public.usage_logs ADD CONSTRAINT "usage_logs_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.usage_logs DROP CONSTRAINT "usage_logs_bookingId_fkey";
ALTER TABLE public.usage_logs ADD CONSTRAINT "usage_logs_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES public.bookings(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.maintenance_windows DROP CONSTRAINT "maintenance_windows_resourceId_fkey";
ALTER TABLE public.maintenance_windows ADD CONSTRAINT "maintenance_windows_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.incidents DROP CONSTRAINT "incidents_resourceId_fkey";
ALTER TABLE public.incidents ADD CONSTRAINT "incidents_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.resource_status_history
  DROP CONSTRAINT "resource_status_history_resourceId_fkey";
ALTER TABLE public.resource_status_history
  ADD CONSTRAINT "resource_status_history_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.telemetry_samples DROP CONSTRAINT "telemetry_samples_resourceId_fkey";
ALTER TABLE public.telemetry_samples ADD CONSTRAINT "telemetry_samples_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES public.resources(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regprocedure('public.enforce_resource_schedule_integrity()') IS NOT NULL THEN
    RAISE EXCEPTION 'enforce_resource_schedule_integrity() already exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname IN (
      'bookings_schedule_integrity_before_write',
      'maintenance_schedule_integrity_before_write'
    ) AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Batch 1C schedule-integrity trigger already exists';
  END IF;
END $$;

-- A shared resource-row lock serializes all booking/maintenance writers.
-- GiST remains the final booking-vs-booking authority. These trigger checks add
-- booking-vs-maintenance, maintenance-vs-booking and maintenance-vs-maintenance
-- protection even when a writer bypasses the application service.
CREATE FUNCTION public.enforce_resource_schedule_integrity()
RETURNS trigger
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

CREATE TRIGGER bookings_schedule_integrity_before_write
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_resource_schedule_integrity();

CREATE TRIGGER maintenance_schedule_integrity_before_write
BEFORE INSERT OR UPDATE ON public.maintenance_windows
FOR EACH ROW EXECUTE FUNCTION public.enforce_resource_schedule_integrity();

COMMENT ON COLUMN public.resources."operationalStatus" IS
  'Authoritative physical/operational state. Reservation is derived from bookings, maintenance and policy.';
COMMENT ON COLUMN public.resources.status IS
  'Temporary one-way compatibility projection; never an authoritative physical or scheduling state.';
COMMENT ON COLUMN public.resources.category IS
  'Assignment-level category; nullable when the technical subtype is not yet reviewed.';
COMMENT ON COLUMN public.telemetry_samples."verifiedSignals" IS
  'Nullable verified event/signal metadata. Absence means no verified signal data.';

DO $$
DECLARE
  definition text;
  unassigned_staff integer;
  unresolved_categories integer;
BEGIN
  IF pg_temp.batch1c_enum_labels('Role') IS DISTINCT FROM
      ARRAY['ADMIN','LAB_STAFF','LECTURER','STUDENT']::text[] THEN
    RAISE EXCEPTION 'Role postcondition failed';
  END IF;
  IF pg_temp.batch1c_enum_labels('OperationalStatus') IS DISTINCT FROM
      ARRAY['AVAILABLE','IN_USE','MAINTENANCE','CALIBRATION','BROKEN','RETIRED','OFFLINE']::text[] THEN
    RAISE EXCEPTION 'OperationalStatus postcondition failed';
  END IF;
  IF pg_temp.batch1c_enum_labels('BookingStatus') IS DISTINCT FROM
      ARRAY['PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED','COMPLETED','REJECTED','CANCELLED']::text[] THEN
    RAISE EXCEPTION 'BookingStatus postcondition failed';
  END IF;
  IF pg_temp.batch1c_enum_labels('UsageAction') IS DISTINCT FROM
      ARRAY['REQUEST','APPROVE','REJECT','CHECK_OUT','CHECK_IN','RETURN','COMPLETE',
            'STATUS_CHANGE','TELEMETRY','CANCEL','INCIDENT_REPORTED','NO_SHOW']::text[] THEN
    RAISE EXCEPTION 'UsageAction postcondition failed';
  END IF;
  IF pg_temp.batch1c_enum_labels('ResourceType') IS DISTINCT FROM
      ARRAY['room','gpu_server','raspberry_pi','uav','camera','kit','material','other']::text[]
     OR pg_temp.batch1c_enum_labels('ResourceCategory') IS DISTINCT FROM
      ARRAY['ROOM','EQUIPMENT','MACHINE','EXPERIMENT_KIT','MATERIAL']::text[]
     OR pg_temp.batch1c_enum_labels('BookingOutcome') IS DISTINCT FROM
      ARRAY['NO_SHOW']::text[]
     OR pg_temp.batch1c_enum_labels('AuditActorType') IS DISTINCT FROM
      ARRAY['USER','SYSTEM','SERVICE']::text[]
     OR pg_temp.batch1c_enum_labels('NotificationType') IS DISTINCT FROM
      ARRAY['BOOKING_APPROVED','BOOKING_REJECTED','BOOKING_UPCOMING','RETURN_REMINDER']::text[] THEN
    RAISE EXCEPTION 'Supporting canonical enum postcondition failed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.resources WHERE "operationalStatus" IS NULL) THEN
    RAISE EXCEPTION 'OperationalStatus must be populated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.resources WHERE status::text = 'reserved') THEN
    RAISE EXCEPTION 'ResourceStatus=reserved survived canonical reconciliation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE "startAt" >= "endAt")
     OR EXISTS (SELECT 1 FROM public.maintenance_windows WHERE "startAt" >= "endAt") THEN
    RAISE EXCEPTION 'Invalid scheduling interval survived canonical reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.maintenance_windows m ON m."resourceId" = b."resourceId"
    WHERE b.status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED')
      AND m.status IN ('scheduled','in_progress')
      AND tsrange(b."startAt", b."endAt", '[)')
          && tsrange(m."startAt", m."endAt", '[)')
  ) THEN
    RAISE EXCEPTION 'Existing booking/maintenance overlap requires review';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.bookings'::regclass
    AND conname = 'bookings_no_active_overlap'
    AND contype = 'x' AND convalidated;
  IF definition IS NULL
     OR position('PENDING_APPROVAL' IN definition) = 0
     OR position('CONFIRMED' IN definition) = 0
     OR position('CHECKED_OUT' IN definition) = 0
     OR position('RETURNED' IN definition) = 0 THEN
    RAISE EXCEPTION 'Canonical booking exclusion constraint postcondition failed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION 'btree_gist postcondition failed';
  END IF;

  IF (SELECT count(*) FROM pg_constraint
      WHERE (conrelid, conname) IN (
        ('public.bookings'::regclass, 'bookings_resourceId_fkey'),
        ('public.usage_logs'::regclass, 'usage_logs_resourceId_fkey'),
        ('public.usage_logs'::regclass, 'usage_logs_bookingId_fkey'),
        ('public.maintenance_windows'::regclass, 'maintenance_windows_resourceId_fkey'),
        ('public.incidents'::regclass, 'incidents_resourceId_fkey'),
        ('public.resource_status_history'::regclass, 'resource_status_history_resourceId_fkey'),
        ('public.telemetry_samples'::regclass, 'telemetry_samples_resourceId_fkey')
      ) AND contype = 'f' AND convalidated AND confdeltype = 'r') <> 7 THEN
    RAISE EXCEPTION 'Critical audit-retention FK postcondition failed';
  END IF;

  IF to_regprocedure('public.enforce_resource_schedule_integrity()') IS NULL
     OR (SELECT count(*) FROM pg_trigger
         WHERE (tgrelid, tgname) IN (
           ('public.bookings'::regclass, 'bookings_schedule_integrity_before_write'),
           ('public.maintenance_windows'::regclass, 'maintenance_schedule_integrity_before_write')
         ) AND NOT tgisinternal AND tgenabled = 'O') <> 2 THEN
    RAISE EXCEPTION 'Schedule-integrity trigger postcondition failed';
  END IF;

  SELECT count(*) INTO unresolved_categories
  FROM public.resources WHERE category IS NULL;
  SELECT count(*) INTO unassigned_staff
  FROM public.users u
  WHERE u.role = 'LAB_STAFF'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_lab_assignments a WHERE a."userId" = u.id
    );

  RAISE NOTICE 'Batch 1C path: %, unresolved resource categories: %, unassigned LAB_STAFF: %',
    current_setting('batch1c.path'), unresolved_categories, unassigned_staff;
END $$;

COMMIT;
