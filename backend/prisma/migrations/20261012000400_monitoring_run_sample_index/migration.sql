-- Persisted run counters are refreshed on every worker heartbeat.
CREATE INDEX "telemetry_samples_simulationRunId_idx" ON "telemetry_samples"("simulationRunId");
