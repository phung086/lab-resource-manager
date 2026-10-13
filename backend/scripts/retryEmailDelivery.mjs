import "dotenv/config";
import { prisma } from "../src/db.js";

// Operator-only CLI; no public endpoint and no resending already accepted messages.
const deliveryId = process.argv[2];
if (!/^[a-f0-9-]{36}$/i.test(deliveryId || "")) throw new Error("Usage: npm run email:retry -- DELIVERY_UUID");
try {
  const result = await prisma.emailDelivery.updateMany({
    where: { id: deliveryId, status: "FAILED" },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null, leaseToken: null, lockedAt: null }
  });
  console.log(JSON.stringify({ requeued: result.count === 1 }));
  if (!result.count) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
