-- CreateTable
CREATE TABLE "stock_items" (
    "resourceId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("resourceId")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "maintenanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_memberships" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_memberships_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "teaching_activities" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "learningGoal" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_resourceId_createdAt_idx" ON "stock_movements"("resourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_groups_code_key" ON "teaching_groups"("code");

-- CreateIndex
CREATE INDEX "teaching_groups_lecturerId_idx" ON "teaching_groups"("lecturerId");

-- CreateIndex
CREATE INDEX "teaching_memberships_userId_idx" ON "teaching_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_activities_bookingId_key" ON "teaching_activities"("bookingId");

-- CreateIndex
CREATE INDEX "teaching_activities_groupId_createdAt_idx" ON "teaching_activities"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "stock_items"("resourceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenance_windows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_groups" ADD CONSTRAINT "teaching_groups_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_memberships" ADD CONSTRAINT "teaching_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "teaching_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_memberships" ADD CONSTRAINT "teaching_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_activities" ADD CONSTRAINT "teaching_activities_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "teaching_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_activities" ADD CONSTRAINT "teaching_activities_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_items" ADD CONSTRAINT "stock_balance_nonnegative" CHECK ("balance" >= 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_valid" CHECK ("delta" <> 0 AND "balanceAfter" >= 0 AND "kind" IN ('RECEIPT', 'ISSUE', 'ADJUSTMENT'));
ALTER TABLE "teaching_activities" ADD CONSTRAINT "teaching_decision_valid" CHECK ("decision" IN ('SUBMITTED', 'ENDORSED', 'CHANGES_REQUESTED'));
