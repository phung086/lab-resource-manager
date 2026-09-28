# Backend Release Readiness

This document records the final backend/release hardening scope on branch
`feat/backend-release-readiness`, based on
`fix/payment-lifecycle-reconciliation` at
`0785adbf55cc360f8a7a9e652a912a1c3fda09c1`.

## Confirmed release fixes

- Optional authentication continues to accept missing or invalid credentials as
  anonymous on public routes, but a database lookup failure now returns the
  stable `503 DATABASE_UNAVAILABLE` contract. An infrastructure outage can no
  longer silently reduce an authenticated request to the public projection.
- Booking and incident email templates HTML-escape user-controlled content.
  Production email delivery fails closed when SMTP is not configured; Ethereal
  remains a development-only transport.
- The canonical production Compose path passes the existing SMTP, VNPAY, and
  resource-media configuration into the backend container. Both environment
  examples document the same variables without enabling optional integrations
  by default.
- The deployment guide distinguishes the approved, booking-linked VNPAY
  extension from retired payment/VietQR research demonstrations.

## Deliberately unchanged

- No Prisma schema or migration changed.
- No historical migration or `_prisma_migrations` row changed.
- No frontend source, style, UI, or UX file changed.
- Canonical roles, booking statuses, operational statuses, API response shapes,
  and the required graduation workflow remain unchanged.

## Verification contract

The focused release-security test covers HTML escaping, production SMTP
fail-closed behavior, and optional-auth database outage handling. Release
evidence must also include backend lint, production configuration validation,
Compose interpolation, required backend tests, database-backed regression
suites, and the migration safety matrix on an isolated disposable PostgreSQL 16
database whose name contains `_test` or `_ci`.
