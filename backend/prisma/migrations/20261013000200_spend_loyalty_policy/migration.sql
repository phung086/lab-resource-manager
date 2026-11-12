-- A disabled singleton policy changes only future accepted booking quotes.
-- Legacy loyalty fields and all historic booking/payment amounts remain intact.
CREATE TABLE "loyalty_policy" (
  "id" TEXT NOT NULL DEFAULT 'SYSTEM',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "plusThreshold" INTEGER NOT NULL DEFAULT 1500000,
  "priorityThreshold" INTEGER NOT NULL DEFAULT 5000000,
  "plusDiscountBps" INTEGER NOT NULL DEFAULT 300,
  "priorityDiscountBps" INTEGER NOT NULL DEFAULT 500,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loyalty_policy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_policy_singleton" CHECK ("id" = 'SYSTEM'),
  CONSTRAINT "loyalty_policy_thresholds" CHECK (
    "plusThreshold" BETWEEN 1 AND 2000000000 AND "priorityThreshold" BETWEEN 1 AND 2000000000
    AND "priorityThreshold" > "plusThreshold"
  ),
  CONSTRAINT "loyalty_policy_discounts" CHECK (
    "plusDiscountBps" BETWEEN 0 AND 5000 AND "priorityDiscountBps" BETWEEN 0 AND 5000
  ),
  CONSTRAINT "loyalty_policy_version" CHECK ("version" >= 0)
);
INSERT INTO "loyalty_policy" ("id", "updatedAt") VALUES ('SYSTEM', CURRENT_TIMESTAMP);
