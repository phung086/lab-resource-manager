ALTER TABLE "resources" ADD COLUMN "careInspectionRequired" BOOLEAN NOT NULL DEFAULT false;
UPDATE "resources" SET "careInspectionRequired" = true WHERE "operationalStatus" IN ('BROKEN', 'MAINTENANCE', 'CALIBRATION');
