-- Durable email outbox. SMTP runs after the business transaction commits.
CREATE TABLE "email_deliveries" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "messageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_deliveries_kind_check" CHECK ("kind" IN ('ACCOUNT_REGISTERED', 'PAYMENT_RECEIPT')),
    CONSTRAINT "email_deliveries_locale_check" CHECK ("locale" IN ('vi', 'en')),
    CONSTRAINT "email_deliveries_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5),
    CONSTRAINT "email_deliveries_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
    CONSTRAINT "email_deliveries_state_check" CHECK (
        ("status" = 'PENDING' AND "nextAttemptAt" IS NOT NULL AND "leaseToken" IS NULL AND "lockedAt" IS NULL AND "sentAt" IS NULL)
        OR ("status" = 'SENDING' AND "leaseToken" IS NOT NULL AND "lockedAt" IS NOT NULL AND "sentAt" IS NULL)
        OR ("status" = 'SENT' AND "sentAt" IS NOT NULL AND "messageId" IS NOT NULL AND "nextAttemptAt" IS NULL AND "leaseToken" IS NULL AND "lockedAt" IS NULL)
        OR ("status" = 'FAILED' AND "sentAt" IS NULL AND "nextAttemptAt" IS NULL AND "leaseToken" IS NULL AND "lockedAt" IS NULL)
    )
);
CREATE UNIQUE INDEX "email_deliveries_dedupeKey_key" ON "email_deliveries"("dedupeKey");
CREATE INDEX "email_deliveries_status_nextAttemptAt_idx" ON "email_deliveries"("status", "nextAttemptAt");
CREATE INDEX "email_deliveries_userId_createdAt_idx" ON "email_deliveries"("userId", "createdAt");
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
