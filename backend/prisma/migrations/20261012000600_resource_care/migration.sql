-- Add resource lifecycle accounting without rewriting applied telemetry migrations.
CREATE TABLE "resource_care_profiles" (
 "resourceId" TEXT PRIMARY KEY REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "roomId" TEXT REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "intervalDays" INTEGER, "intervalHours" DOUBLE PRECISION,
 "servicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastMaintenanceId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "resource_care_policy_check" CHECK (("intervalDays" IS NULL OR "intervalDays" BETWEEN 1 AND 3650) AND ("intervalHours" IS NULL OR "intervalHours" BETWEEN 1 AND 100000) AND ("intervalDays" IS NOT NULL OR "intervalHours" IS NOT NULL) AND "roomId" IS DISTINCT FROM "resourceId")
);
CREATE INDEX "resource_care_profiles_roomId_idx" ON "resource_care_profiles"("roomId");
CREATE TABLE "resource_operations" (
 "id" TEXT PRIMARY KEY, "resourceId" TEXT NOT NULL REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "activeResourceId" TEXT UNIQUE, "actorId" TEXT NOT NULL,
 "loadPercent" DOUBLE PRECISION NOT NULL, "occupants" INTEGER,
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3), "stopReason" TEXT,
 CONSTRAINT "resource_operation_state_check" CHECK ("loadPercent" BETWEEN 0 AND 100 AND ("occupants" IS NULL OR "occupants" >= 0) AND (("endedAt" IS NULL AND "activeResourceId" IS NOT NULL AND "activeResourceId" = "resourceId") OR ("endedAt" >= "startedAt" AND "activeResourceId" IS NULL)))
);
CREATE INDEX "resource_operations_resourceId_startedAt_idx" ON "resource_operations"("resourceId", "startedAt");
CREATE INDEX "resource_operations_bookingId_idx" ON "resource_operations"("bookingId");
CREATE TABLE "resource_parts" (
 "id" TEXT PRIMARY KEY, "resourceId" TEXT NOT NULL REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "name" TEXT NOT NULL, "condition" TEXT NOT NULL DEFAULT 'OK', "notes" TEXT NOT NULL DEFAULT '',
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "resource_parts_condition_check" CHECK ("condition" IN ('OK', 'WORN', 'BROKEN'))
);
CREATE UNIQUE INDEX "resource_parts_resourceId_name_key" ON "resource_parts"("resourceId", "name");
