ALTER TABLE "payment_transactions" ADD COLUMN "walletTransactionNo" TEXT;

CREATE UNIQUE INDEX "payment_transactions_provider_walletTransactionNo_key"
  ON "payment_transactions"("provider", "walletTransactionNo");
