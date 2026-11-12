-- CreateTable
CREATE TABLE "chatgpt_bridge_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_bridge_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_grants" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerAuthVersion" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "generation" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "chatgpt_bridge_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_codes" (
    "id" TEXT NOT NULL,
    "ticketHash" TEXT NOT NULL,
    "codeHash" TEXT,
    "clientId" TEXT NOT NULL,
    "grantId" TEXT,
    "redirectUri" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consentedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_bridge_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_bridge_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_subscriptions" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "secretCipher" TEXT NOT NULL,
    "oldSecretCipher" TEXT,
    "oldSecretUntil" TIMESTAMP(3),
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatgpt_bridge_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_requests" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerAuthVersion" INTEGER NOT NULL,
    "grantId" TEXT NOT NULL,
    "generation" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "context" JSONB,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "contextBytes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "chatgpt_bridge_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatgpt_bridge_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatgpt_bridge_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_grants_generation_key" ON "chatgpt_bridge_grants"("generation");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_grants_ownerId_createdAt_idx" ON "chatgpt_bridge_grants"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_codes_ticketHash_key" ON "chatgpt_bridge_codes"("ticketHash");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_codes_codeHash_key" ON "chatgpt_bridge_codes"("codeHash");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_codes_expiresAt_idx" ON "chatgpt_bridge_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_tokens_tokenHash_key" ON "chatgpt_bridge_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_tokens_grantId_type_idx" ON "chatgpt_bridge_tokens"("grantId", "type");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_tokens_expiresAt_idx" ON "chatgpt_bridge_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_subscriptions_grantId_status_idx" ON "chatgpt_bridge_subscriptions"("grantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_subscriptions_grantId_webhookId_key" ON "chatgpt_bridge_subscriptions"("grantId", "webhookId");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_requests_customerId_createdAt_idx" ON "chatgpt_bridge_requests"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_requests_grantId_status_idx" ON "chatgpt_bridge_requests"("grantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_deliveries_eventId_key" ON "chatgpt_bridge_deliveries"("eventId");

-- CreateIndex
CREATE INDEX "chatgpt_bridge_deliveries_status_nextAttemptAt_idx" ON "chatgpt_bridge_deliveries"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "chatgpt_bridge_deliveries_subscriptionId_requestId_key" ON "chatgpt_bridge_deliveries"("subscriptionId", "requestId");

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_grants" ADD CONSTRAINT "chatgpt_bridge_grants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_grants" ADD CONSTRAINT "chatgpt_bridge_grants_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "chatgpt_bridge_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_codes" ADD CONSTRAINT "chatgpt_bridge_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "chatgpt_bridge_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_codes" ADD CONSTRAINT "chatgpt_bridge_codes_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "chatgpt_bridge_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_tokens" ADD CONSTRAINT "chatgpt_bridge_tokens_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "chatgpt_bridge_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_tokens" ADD CONSTRAINT "chatgpt_bridge_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "chatgpt_bridge_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_subscriptions" ADD CONSTRAINT "chatgpt_bridge_subscriptions_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "chatgpt_bridge_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_requests" ADD CONSTRAINT "chatgpt_bridge_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_requests" ADD CONSTRAINT "chatgpt_bridge_requests_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "chatgpt_bridge_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_deliveries" ADD CONSTRAINT "chatgpt_bridge_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "chatgpt_bridge_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatgpt_bridge_deliveries" ADD CONSTRAINT "chatgpt_bridge_deliveries_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "chatgpt_bridge_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One active connection and one pending turn per customer. Expiration is
-- explicitly transitioned by the service before inserting another pending turn.
CREATE UNIQUE INDEX chatgpt_bridge_one_connection ON chatgpt_bridge_grants ((1)) WHERE "revokedAt" IS NULL;
CREATE UNIQUE INDEX chatgpt_bridge_one_pending_customer ON chatgpt_bridge_requests ("customerId") WHERE status='PENDING';
CREATE INDEX "chatgpt_bridge_requests_customerId_conversationId_createdAt_idx" ON chatgpt_bridge_requests ("customerId", "conversationId", "createdAt");
ALTER TABLE chatgpt_bridge_tokens ADD CONSTRAINT chatgpt_bridge_token_type CHECK (type IN ('ACCESS','REFRESH'));
ALTER TABLE chatgpt_bridge_subscriptions ADD CONSTRAINT chatgpt_bridge_subscription_status CHECK (status IN ('VERIFIED','REVOKED'));
ALTER TABLE chatgpt_bridge_requests ADD CONSTRAINT chatgpt_bridge_request_status CHECK (status IN ('PENDING','ANSWERED','EXPIRED','CANCELLED','HANDED_OFF'));
ALTER TABLE chatgpt_bridge_requests ADD CONSTRAINT chatgpt_bridge_request_budget CHECK ("readCount" BETWEEN 0 AND 13 AND "contextBytes" BETWEEN 0 AND 24000);
ALTER TABLE chatgpt_bridge_requests ADD CONSTRAINT chatgpt_bridge_request_content CHECK (char_length(message) BETWEEN 2 AND 2000 AND locale IN ('vi','en') AND
  ((status='ANSWERED' AND answer IS NOT NULL AND "answeredAt" IS NOT NULL AND char_length(answer) BETWEEN 2 AND 6000) OR (status<>'ANSWERED' AND answer IS NULL AND "answeredAt" IS NULL)));
ALTER TABLE chatgpt_bridge_deliveries ADD CONSTRAINT chatgpt_bridge_delivery_status CHECK (status IN ('PENDING','DELIVERED','FAILED','CANCELLED') AND attempts BETWEEN 0 AND 5);

