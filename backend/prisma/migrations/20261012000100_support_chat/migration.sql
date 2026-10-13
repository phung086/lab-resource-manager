-- CreateTable
CREATE TABLE "support_sessions" (
    "id" TEXT NOT NULL,
    "ordinal" SERIAL NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventType" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CHAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_presence" (
    "userId" TEXT NOT NULL,
    "accepting" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAssignedAt" TIMESTAMP(3),

    CONSTRAINT "support_presence_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_sessions_ordinal_key" ON "support_sessions"("ordinal");

-- CreateIndex
CREATE INDEX "support_sessions_laboratoryId_status_ordinal_idx" ON "support_sessions"("laboratoryId", "status", "ordinal");

-- CreateIndex
CREATE INDEX "support_sessions_requesterId_ordinal_idx" ON "support_sessions"("requesterId", "ordinal");

-- CreateIndex
CREATE INDEX "support_sessions_assignedStaffId_status_idx" ON "support_sessions"("assignedStaffId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "support_messages_sequence_key" ON "support_messages"("sequence");

-- CreateIndex
CREATE INDEX "support_messages_sessionId_sequence_idx" ON "support_messages"("sessionId", "sequence");

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "support_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_presence" ADD CONSTRAINT "support_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce capacity across application processes, including overlapping lab assignments.
CREATE UNIQUE INDEX "support_one_open_request_per_user" ON "support_sessions"("requesterId") WHERE "status" IN ('WAITING', 'ACTIVE');
CREATE UNIQUE INDEX "support_one_active_session_per_staff" ON "support_sessions"("assignedStaffId") WHERE "status" = 'ACTIVE';
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_status_check" CHECK ("status" IN ('WAITING', 'ACTIVE', 'CLOSED', 'CANCELLED'));
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_category_check" CHECK ("category" IN ('BOOKING', 'PAYMENT', 'ACCOUNT', 'RESOURCE', 'OTHER'));
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_assignment_check" CHECK (
  ("status" <> 'ACTIVE' OR ("assignedStaffId" IS NOT NULL AND "assignedAt" IS NOT NULL)) AND
  ("status" <> 'WAITING' OR "assignedStaffId" IS NULL) AND
  (("status" IN ('CLOSED', 'CANCELLED')) = ("closedAt" IS NOT NULL))
);
ALTER TABLE "support_messages" ADD CONSTRAINT "support_message_kind_check" CHECK ("kind" IN ('CUSTOMER', 'STAFF', 'ASSISTANT', 'SYSTEM'));
ALTER TABLE "support_messages" ADD CONSTRAINT "support_message_source_check" CHECK ("source" IN ('CHAT', 'AI_HANDOFF'));
ALTER TABLE "support_messages" ADD CONSTRAINT "support_message_size_check" CHECK (char_length("body") <= 5000);

