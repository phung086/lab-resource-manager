-- Deployment-lineage metadata supports resumable, officially baselined clean
-- installs without changing any historical migration or Prisma history row.
CREATE TABLE IF NOT EXISTS public._lrm_deployment_baselines (
  baseline_id text PRIMARY KEY,
  schema_sha256 text NOT NULL,
  installed_at timestamptz NOT NULL DEFAULT now()
);
