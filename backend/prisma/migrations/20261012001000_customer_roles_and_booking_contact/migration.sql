BEGIN;
-- Audit snapshots describe the role at the time of the event. Keep that text.
ALTER TABLE system_audit_events ALTER COLUMN actor_role_snapshot TYPE TEXT USING actor_role_snapshot::text;
ALTER TYPE "Role" RENAME TO "Role_previous";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LAB_STAFF', 'CUSTOMER');
ALTER TABLE users ALTER COLUMN role TYPE "Role" USING
  (CASE WHEN role::text IN ('LECTURER','STUDENT') THEN 'CUSTOMER' ELSE role::text END)::"Role";
DROP TYPE "Role_previous";
-- No invented personal identity for email-only accounts.
ALTER TABLE users ALTER COLUMN "fullName" SET DEFAULT '';
ALTER TABLE bookings ADD COLUMN "contactSnapshot" JSONB;
COMMIT;
