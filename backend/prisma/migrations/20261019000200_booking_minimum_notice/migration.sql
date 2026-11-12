ALTER TABLE "lab_policies" ADD COLUMN "minAdvanceBookingMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "lab_policies" ADD CONSTRAINT "lab_policies_min_advance_minutes_check"
  CHECK ("minAdvanceBookingMinutes" BETWEEN 30 AND 43200);
