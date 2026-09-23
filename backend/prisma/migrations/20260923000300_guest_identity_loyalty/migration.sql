ALTER TABLE "users"
  ADD COLUMN "customerType" TEXT NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "organization" TEXT,
  ADD COLUMN "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultAddressLine" TEXT,
  ADD COLUMN "defaultAddressProvinceCode" TEXT,
  ADD COLUMN "defaultAddressProvinceName" TEXT,
  ADD COLUMN "defaultAddressWardCode" TEXT,
  ADD COLUMN "defaultAddressWardName" TEXT,
  ADD COLUMN "defaultAddressSource" TEXT,
  ADD COLUMN "defaultAddressVersion" TEXT,
  ADD COLUMN "loyaltyTier" TEXT NOT NULL DEFAULT 'LAB_STANDARD',
  ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyaltyDiscountBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priorityBoost" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "email_otps" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_otps_email_purpose_consumedAt_expiresAt_idx"
  ON "email_otps"("email", "purpose", "consumedAt", "expiresAt");

CREATE INDEX "email_otps_userId_idx" ON "email_otps"("userId");

ALTER TABLE "email_otps"
  ADD CONSTRAINT "email_otps_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
