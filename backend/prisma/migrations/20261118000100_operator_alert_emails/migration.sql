BEGIN;
ALTER TABLE "email_deliveries"
    DROP CONSTRAINT "email_deliveries_kind_check",
    ADD CONSTRAINT "email_deliveries_kind_check"
        CHECK ("kind" IN ('ACCOUNT_REGISTERED', 'PAYMENT_RECEIPT', 'OPERATOR_ALERT'));
COMMIT;
