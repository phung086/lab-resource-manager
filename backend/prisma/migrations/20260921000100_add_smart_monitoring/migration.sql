-- CreateEnum
CREATE TYPE "MonitoringAlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MonitoringAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "monitoringAlertId" TEXT,
ADD COLUMN     "provenance" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "telemetrySampleId" TEXT,
ADD COLUMN     "telemetrySourceId" TEXT,
ALTER COLUMN "reportedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "telemetry_samples" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "sourceId" TEXT;

-- CreateTable
CREATE TABLE "telemetry_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "credentialSalt" TEXT NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reportedOnline" BOOLEAN,
    "lastSeenAt" TIMESTAMP(3),
    "lastSampleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemetry_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_monitoring_thresholds" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "temperatureWarningC" DOUBLE PRECISION,
    "temperatureCriticalC" DOUBLE PRECISION,
    "humidityMinPercent" DOUBLE PRECISION,
    "humidityMaxPercent" DOUBLE PRECISION,
    "staleMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratory_monitoring_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_monitoring_thresholds" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "temperatureWarningC" DOUBLE PRECISION,
    "temperatureCriticalC" DOUBLE PRECISION,
    "humidityMinPercent" DOUBLE PRECISION,
    "humidityMaxPercent" DOUBLE PRECISION,
    "staleMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_monitoring_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_alerts" (
    "id" TEXT NOT NULL,
    "activeDedupeKey" TEXT,
    "conditionKey" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "severity" "MonitoringAlertSeverity" NOT NULL,
    "status" "MonitoringAlertStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "observedValue" DOUBLE PRECISION,
    "thresholdSnapshot" JSONB NOT NULL DEFAULT '{}',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "telemetrySourceId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endpointUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_access_audits" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "outcome" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "camera_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_sources_code_key" ON "telemetry_sources"("code");

-- CreateIndex
CREATE INDEX "telemetry_sources_laboratoryId_isActive_idx" ON "telemetry_sources"("laboratoryId", "isActive");

-- CreateIndex
CREATE INDEX "telemetry_sources_resourceId_isActive_idx" ON "telemetry_sources"("resourceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_sources_resourceId_code_key" ON "telemetry_sources"("resourceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_monitoring_thresholds_laboratoryId_key" ON "laboratory_monitoring_thresholds"("laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_monitoring_thresholds_resourceId_key" ON "resource_monitoring_thresholds"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_alerts_activeDedupeKey_key" ON "monitoring_alerts"("activeDedupeKey");

-- CreateIndex
CREATE INDEX "monitoring_alerts_laboratoryId_status_openedAt_idx" ON "monitoring_alerts"("laboratoryId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "monitoring_alerts_resourceId_status_idx" ON "monitoring_alerts"("resourceId", "status");

-- CreateIndex
CREATE INDEX "monitoring_alerts_sourceId_status_idx" ON "monitoring_alerts"("sourceId", "status");

-- CreateIndex
CREATE INDEX "monitoring_alerts_conditionKey_idx" ON "monitoring_alerts"("conditionKey");

-- CreateIndex
CREATE UNIQUE INDEX "cameras_code_key" ON "cameras"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cameras_telemetrySourceId_key" ON "cameras"("telemetrySourceId");

-- CreateIndex
CREATE INDEX "cameras_laboratoryId_enabled_idx" ON "cameras"("laboratoryId", "enabled");

-- CreateIndex
CREATE INDEX "cameras_resourceId_idx" ON "cameras"("resourceId");

-- CreateIndex
CREATE INDEX "camera_access_audits_cameraId_startedAt_idx" ON "camera_access_audits"("cameraId", "startedAt");

-- CreateIndex
CREATE INDEX "camera_access_audits_actorId_startedAt_idx" ON "camera_access_audits"("actorId", "startedAt");

-- CreateIndex
CREATE INDEX "camera_access_audits_laboratoryId_startedAt_idx" ON "camera_access_audits"("laboratoryId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_monitoringAlertId_key" ON "incidents"("monitoringAlertId");

-- CreateIndex
CREATE INDEX "incidents_telemetrySourceId_idx" ON "incidents"("telemetrySourceId");

-- CreateIndex
CREATE INDEX "incidents_telemetrySampleId_idx" ON "incidents"("telemetrySampleId");

-- CreateIndex
CREATE INDEX "telemetry_samples_sourceId_sampledAt_idx" ON "telemetry_samples"("sourceId", "sampledAt");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_samples_sourceId_externalId_key" ON "telemetry_samples"("sourceId", "externalId");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_telemetrySourceId_fkey" FOREIGN KEY ("telemetrySourceId") REFERENCES "telemetry_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_telemetrySampleId_fkey" FOREIGN KEY ("telemetrySampleId") REFERENCES "telemetry_samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitoringAlertId_fkey" FOREIGN KEY ("monitoringAlertId") REFERENCES "monitoring_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "telemetry_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_sources" ADD CONSTRAINT "telemetry_sources_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_sources" ADD CONSTRAINT "telemetry_sources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_monitoring_thresholds" ADD CONSTRAINT "laboratory_monitoring_thresholds_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_monitoring_thresholds" ADD CONSTRAINT "resource_monitoring_thresholds_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "telemetry_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "telemetry_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_telemetrySourceId_fkey" FOREIGN KEY ("telemetrySourceId") REFERENCES "telemetry_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_access_audits" ADD CONSTRAINT "camera_access_audits_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "cameras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_access_audits" ADD CONSTRAINT "camera_access_audits_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_access_audits" ADD CONSTRAINT "camera_access_audits_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_access_audits" ADD CONSTRAINT "camera_access_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Batch 8 monitoring policy integrity checks
ALTER TABLE "laboratory_monitoring_thresholds"
  ADD CONSTRAINT "laboratory_monitoring_thresholds_values_check" CHECK (
    ("temperatureWarningC" IS NULL OR "temperatureWarningC" BETWEEN -40 AND 125) AND
    ("temperatureCriticalC" IS NULL OR "temperatureCriticalC" BETWEEN -40 AND 125) AND
    ("temperatureWarningC" IS NULL OR "temperatureCriticalC" IS NULL OR "temperatureWarningC" < "temperatureCriticalC") AND
    ("humidityMinPercent" IS NULL OR "humidityMinPercent" BETWEEN 0 AND 100) AND
    ("humidityMaxPercent" IS NULL OR "humidityMaxPercent" BETWEEN 0 AND 100) AND
    ("humidityMinPercent" IS NULL OR "humidityMaxPercent" IS NULL OR "humidityMinPercent" <= "humidityMaxPercent") AND
    ("staleMinutes" IS NULL OR "staleMinutes" BETWEEN 1 AND 10080)
  );

ALTER TABLE "resource_monitoring_thresholds"
  ADD CONSTRAINT "resource_monitoring_thresholds_values_check" CHECK (
    ("temperatureWarningC" IS NULL OR "temperatureWarningC" BETWEEN -40 AND 125) AND
    ("temperatureCriticalC" IS NULL OR "temperatureCriticalC" BETWEEN -40 AND 125) AND
    ("temperatureWarningC" IS NULL OR "temperatureCriticalC" IS NULL OR "temperatureWarningC" < "temperatureCriticalC") AND
    ("humidityMinPercent" IS NULL OR "humidityMinPercent" BETWEEN 0 AND 100) AND
    ("humidityMaxPercent" IS NULL OR "humidityMaxPercent" BETWEEN 0 AND 100) AND
    ("humidityMinPercent" IS NULL OR "humidityMaxPercent" IS NULL OR "humidityMinPercent" <= "humidityMaxPercent") AND
    ("staleMinutes" IS NULL OR "staleMinutes" BETWEEN 1 AND 10080)
  );

ALTER TABLE "cameras"
  ADD CONSTRAINT "cameras_status_check" CHECK ("status" IN ('NOT_CONFIGURED', 'UNAVAILABLE', 'AVAILABLE'));

ALTER TABLE "camera_access_audits"
  ADD CONSTRAINT "camera_access_audits_outcome_check" CHECK ("outcome" IN ('DENIED', 'NOT_CONFIGURED', 'UNAVAILABLE', 'METADATA_ONLY'));
