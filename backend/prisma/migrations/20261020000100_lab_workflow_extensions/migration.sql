ALTER TABLE "lab_policies" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "turnaroundMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lab_policies" ADD CONSTRAINT "lab_turnaround_range" CHECK ("turnaroundMinutes" BETWEEN 0 AND 240);
CREATE TABLE "booking_bundles" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL UNIQUE, "requestHash" TEXT NOT NULL, "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "booking_bundles_ownerId_createdAt_idx" ON "booking_bundles"("ownerId", "createdAt");
ALTER TABLE "bookings" ADD COLUMN "bundleId" TEXT REFERENCES "booking_bundles"("id") ON DELETE RESTRICT,
  ADD COLUMN "policySnapshot" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "booking_waitlist" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "resourceId" TEXT NOT NULL REFERENCES "resources"("id") ON DELETE RESTRICT,
  "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL,
  "purposeCode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'WAITING',
  "notifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waitlist_interval" CHECK ("endAt" > "startAt"),
  CONSTRAINT "waitlist_status" CHECK ("status" IN ('WAITING','NOTIFIED','CANCELLED','EXPIRED')),
  UNIQUE ("userId", "resourceId", "startAt", "endAt")
);
CREATE INDEX "booking_waitlist_status_startAt_idx" ON "booking_waitlist"("status", "startAt");
CREATE TABLE "booking_checklist_entries" (
  "id" TEXT PRIMARY KEY, "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE RESTRICT,
  "stage" TEXT NOT NULL CHECK ("stage" IN ('HANDOVER','RETURN','INSPECTION')),
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "items" JSONB NOT NULL, "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("bookingId", "stage")
);
