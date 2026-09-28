ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';

CREATE TYPE "PaymentReconciliationStatus" AS ENUM (
  'none',
  'manual_review',
  'resolved'
);

ALTER TABLE "payment_transactions"
  ADD COLUMN "paymentUrlCreatedAt" TIMESTAMP(3),
  ADD COLUMN "paymentUrlExpiresAt" TIMESTAMP(3),
  ADD COLUMN "reconciliationStatus" "PaymentReconciliationStatus" NOT NULL DEFAULT 'none',
  ADD COLUMN "reconciliationReason" TEXT,
  ADD COLUMN "reconciledAt" TIMESTAMP(3),
  ADD COLUMN "reconciledById" TEXT;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_reconciledById_fkey"
  FOREIGN KEY ("reconciledById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_vnd_integral_amount_check"
  CHECK (
    currency <> 'VND'
    OR (amount > 0 AND amount = trunc(amount) AND amount <= 9999999999)
  );

CREATE UNIQUE INDEX "payment_transactions_vnpTransactionNo_key"
  ON "payment_transactions"("vnpTransactionNo");

CREATE UNIQUE INDEX "payment_transactions_one_pending_per_booking_key"
  ON "payment_transactions"("bookingId")
  WHERE "bookingId" IS NOT NULL AND status = 'pending';

CREATE INDEX "payment_transactions_reconciliationStatus_idx"
  ON "payment_transactions"("reconciliationStatus");
