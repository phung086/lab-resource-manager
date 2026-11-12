ALTER TABLE bookings ADD COLUMN "fulfillmentSnapshot" JSONB;
ALTER TABLE bookings ADD COLUMN "schedulingReleasedAt" TIMESTAMP(3);
ALTER TABLE payment_transactions ADD COLUMN "appOrigin" TEXT;
CREATE TABLE resource_fulfillment (
  "resourceId" TEXT PRIMARY KEY REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "roomPasswordCiphertext" TEXT,
  "deliveryAllowed" BOOLEAN NOT NULL DEFAULT false,
  "pickupInstructions" TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE bookings ADD CONSTRAINT booking_release_after_return
  CHECK ("schedulingReleasedAt" IS NULL OR (status IN ('RETURNED','COMPLETED') AND "returnedAt" IS NOT NULL));
ALTER TABLE bookings DROP CONSTRAINT bookings_no_active_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_active_overlap
  EXCLUDE USING gist ("resourceId" WITH =, tsrange("startAt", "endAt", '[)') WITH &&)
  WHERE (status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED') AND "schedulingReleasedAt" IS NULL);
