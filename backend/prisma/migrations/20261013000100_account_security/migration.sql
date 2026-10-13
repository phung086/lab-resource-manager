ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE TABLE "password_challenges" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "targetUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('SELF_CHANGE', 'ASSISTED_RESET')),
  "actorVersion" INTEGER NOT NULL,
  "targetVersion" INTEGER NOT NULL,
  "codeHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_challenges_targetUserId_createdAt_idx" ON "password_challenges"("targetUserId", "createdAt");
CREATE INDEX "password_challenges_actorId_createdAt_idx" ON "password_challenges"("actorId", "createdAt");
