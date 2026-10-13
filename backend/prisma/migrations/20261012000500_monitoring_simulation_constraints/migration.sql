-- Preserve historical EXTERNAL records while enforcing simulator provenance
-- and lifecycle invariants for newly persisted demo evidence.
ALTER TABLE "telemetry_sources" ADD CONSTRAINT "telemetry_sources_kind_profile_check"
  CHECK ("kind" IN ('EXTERNAL', 'SIMULATED') AND
    ("profile" IS NULL OR "profile" IN ('ROOM', 'COMPUTE')) AND
    ("kind" <> 'SIMULATED' OR "profile" IS NOT NULL));
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_origin_run_check"
  CHECK (("origin" = 'EXTERNAL' AND "simulationRunId" IS NULL) OR
    ("origin" = 'SIMULATED' AND "simulationRunId" IS NOT NULL));
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_origin_check"
  CHECK ("origin" IN ('EXTERNAL', 'SIMULATED'));
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_origin_check"
  CHECK ("origin" IN ('EXTERNAL', 'SIMULATED'));
ALTER TABLE "monitoring_simulation_runs" ADD CONSTRAINT "monitoring_simulation_runs_state_check"
  CHECK ("status" IN ('RUNNING', 'COMPLETED', 'STOPPED', 'FAILED', 'INTERRUPTED') AND
    "profile" IN ('ROOM', 'COMPUTE') AND
    "scenario" IN ('NORMAL', 'THERMAL_RISE', 'HIGH_LOAD', 'REPORTED_OFFLINE', 'NETWORK_LOSS', 'RECOVERY') AND
    ("scenario" <> 'HIGH_LOAD' OR "profile" = 'COMPUTE') AND
    "acceptedCount" >= 0 AND "elapsedSeconds" >= 0 AND "intervalSeconds" = 5 AND
    (("status" = 'RUNNING' AND "activeSourceId" IS NOT NULL AND "activeSourceId" = "sourceId" AND "endedAt" IS NULL) OR
     ("status" <> 'RUNNING' AND "activeSourceId" IS NULL AND "endedAt" IS NOT NULL)));
