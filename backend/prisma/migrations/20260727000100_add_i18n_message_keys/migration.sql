ALTER TABLE "usage_logs"
  ADD COLUMN "messageKey" TEXT,
  ADD COLUMN "messageParams" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "notifications"
  ADD COLUMN "titleKey" TEXT,
  ADD COLUMN "messageKey" TEXT,
  ADD COLUMN "messageParams" JSONB NOT NULL DEFAULT '{}';
