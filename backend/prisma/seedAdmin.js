import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { ADMIN } from "../src/constants/roles.js";

const prisma = new PrismaClient();

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const fullName = String(process.env.ADMIN_FULL_NAME || "").trim();
const isProduction = process.env.NODE_ENV === "production";

function isPlaceholder(value) {
  return /change-this|replace-with|example/i.test(value);
}

async function main() {
  if (!email || !password || !fullName) {
    if (isProduction) {
      throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_FULL_NAME are required in production.");
    }
    console.log("ADMIN_EMAIL, ADMIN_PASSWORD or ADMIN_FULL_NAME is not set; skipping admin seed.");
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < 12 || isPlaceholder(password)) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters and not use an example value.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { fullName, role: ADMIN, passwordHash, isActive: true },
    create: {
      id: cryptoRandomUuid(),
      email,
      fullName,
      role: ADMIN,
      passwordHash,
      isActive: true
    }
  });

  console.log(`Admin account is ready: ${email}`);
}

function cryptoRandomUuid() {
  return globalThis.crypto.randomUUID();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
