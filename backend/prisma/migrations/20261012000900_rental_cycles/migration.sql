ALTER TABLE "resources" ADD COLUMN "maxBookingMinutes" INTEGER;
ALTER TABLE "resources" ADD CONSTRAINT "resource_rental_duration_check" CHECK ("maxBookingMinutes" IS NULL OR "maxBookingMinutes" BETWEEN 15 AND 525600);
ALTER TABLE "resource_care_profiles" ADD COLUMN "intervalUses" INTEGER, ADD COLUMN "warningPercent" INTEGER NOT NULL DEFAULT 80;
ALTER TABLE "resource_care_profiles" DROP CONSTRAINT "resource_care_policy_check";
ALTER TABLE "resource_care_profiles" ADD CONSTRAINT "resource_care_policy_check" CHECK (
 ("intervalDays" IS NULL OR "intervalDays" BETWEEN 1 AND 3650) AND
 ("intervalHours" IS NULL OR "intervalHours" BETWEEN 1 AND 100000) AND
 ("intervalUses" IS NULL OR "intervalUses" BETWEEN 1 AND 100000) AND
 "warningPercent" BETWEEN 1 AND 99 AND
 ("intervalDays" IS NOT NULL OR "intervalHours" IS NOT NULL OR "intervalUses" IS NOT NULL) AND "roomId" IS DISTINCT FROM "resourceId"
);
