-- Explicit non-null terminal time avoids PostgreSQL CHECK UNKNOWN acceptance.
ALTER TABLE "resource_operations" DROP CONSTRAINT "resource_operation_state_check";
ALTER TABLE "resource_operations" ADD CONSTRAINT "resource_operation_state_check" CHECK (
 "loadPercent" BETWEEN 0 AND 100 AND ("occupants" IS NULL OR "occupants" >= 0) AND
 (("endedAt" IS NULL AND "activeResourceId" IS NOT NULL AND "activeResourceId" = "resourceId") OR
  ("endedAt" IS NOT NULL AND "endedAt" >= "startedAt" AND "activeResourceId" IS NULL))
);
