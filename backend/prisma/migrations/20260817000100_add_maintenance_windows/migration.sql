-- CreateEnum
CREATE TYPE "MaintenanceKind" AS ENUM ('maintenance', 'calibration');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "maintenance_windows" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdById" TEXT,
    "kind" "MaintenanceKind" NOT NULL DEFAULT 'maintenance',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'scheduled',
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_windows_resourceId_startAt_endAt_idx" ON "maintenance_windows"("resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "maintenance_windows_status_idx" ON "maintenance_windows"("status");

-- AddForeignKey
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
