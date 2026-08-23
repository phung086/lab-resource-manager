import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME;

async function main() {
  if (!email || !password || !fullName) {
    console.log("ADMIN_EMAIL, ADMIN_PASSWORD or ADMIN_FULL_NAME is not set; skipping admin seed.");
    return;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters for production setup.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { fullName, role: "admin", passwordHash, isActive: true },
    create: { email, fullName, role: "admin", passwordHash, isActive: true }
  });

  console.log(`Admin account is ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
