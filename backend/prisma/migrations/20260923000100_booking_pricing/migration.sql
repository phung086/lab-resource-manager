ALTER TABLE "bookings" ADD COLUMN "feeAmountVnd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "feeSnapshot" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "bookings" ADD CONSTRAINT "booking_fee_nonnegative" CHECK ("feeAmountVnd" >= 0);
CREATE TABLE "resource_pricing_rules" (
  "id" TEXT PRIMARY KEY,
  "resourceId" TEXT NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "purposeCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "hourlyRateVnd" INTEGER NOT NULL CHECK ("hourlyRateVnd" >= 0),
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("resourceId", "purposeCode")
);
