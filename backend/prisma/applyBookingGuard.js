import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

// TEST DATABASE BOOTSTRAP ONLY
// Canonical schema authority is owned by Prisma migration 20260917000100_reconcile_canonical_persistence.
// This script is strictly for isolated test environments and will fail on development or shared databases.

const databaseUrl = process.env.DATABASE_URL || "";
assert.ok(databaseUrl, "DATABASE_URL is required");

const url = new URL(databaseUrl);
assert.ok(
  ["localhost", "127.0.0.1"].includes(url.hostname),
  "Out-of-band guard rejected: target must be local"
);

const dbName = url.pathname.replace(/^\//, "");
assert.notEqual(
  dbName,
  "lab_resources",
  "Out-of-band guard rejected: the development database is prohibited"
);
assert.match(
  dbName,
  /^lab_resources_(b[0-9]+[a-z]?_|test_)[a-z0-9_]+$/,
  "Out-of-band guard rejected: target must use an isolated test database marker"
);

const prisma = new PrismaClient();

const statements = [
  "CREATE EXTENSION IF NOT EXISTS btree_gist",
  "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_active_overlap",
  `
  ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_active_overlap
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_OUT', 'RETURNED'))
  `
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`Booking overlap guard applied to isolated test database: ${dbName}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
