import { PrismaClient } from "@prisma/client";

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
  WHERE (status IN ('pending', 'approved', 'checked_out'))
  `
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("Booking overlap guard is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
