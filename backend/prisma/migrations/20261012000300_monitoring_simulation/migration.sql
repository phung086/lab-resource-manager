-- Forward migration: preserve existing telemetry/business history.
ALTER TABLE "telemetry_sources" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'EXTERNAL', ADD COLUMN "profile" TEXT;
ALTER TABLE "telemetry_samples" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'EXTERNAL', ADD COLUMN "simulationRunId" TEXT;
ALTER TABLE "monitoring_alerts" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'EXTERNAL';
ALTER TABLE "incidents" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'EXTERNAL';
ALTER TABLE "laboratory_monitoring_thresholds" ADD COLUMN "utilizationWarningPercent" DOUBLE PRECISION, ADD COLUMN "utilizationCriticalPercent" DOUBLE PRECISION;
ALTER TABLE "resource_monitoring_thresholds" ADD COLUMN "utilizationWarningPercent" DOUBLE PRECISION, ADD COLUMN "utilizationCriticalPercent" DOUBLE PRECISION;
CREATE TABLE "monitoring_simulation_runs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL,
  "activeSourceId" TEXT,
  "startedById" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "phase" TEXT NOT NULL DEFAULT 'STARTING',
  "intervalSeconds" INTEGER NOT NULL DEFAULT 5,
  "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monitoring_simulation_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "telemetry_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "monitoring_simulation_runs_activeSourceId_key" ON "monitoring_simulation_runs"("activeSourceId");
CREATE INDEX "monitoring_simulation_runs_sourceId_startedAt_idx" ON "monitoring_simulation_runs"("sourceId", "startedAt");
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "monitoring_simulation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
