ALTER TABLE bookings ADD COLUMN "paymentDueAt" TIMESTAMP(3);
CREATE INDEX bookings_payment_hold_due ON bookings ("paymentDueAt")
  WHERE status = 'PENDING_APPROVAL' AND "paymentDueAt" IS NOT NULL;
