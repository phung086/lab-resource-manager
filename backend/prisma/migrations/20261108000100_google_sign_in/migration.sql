-- Additive identity binding; existing password accounts and history are retained.
ALTER TABLE "users" ADD COLUMN "googleSubject" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordLoginEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "users_googleSubject_key" ON "users"("googleSubject");
