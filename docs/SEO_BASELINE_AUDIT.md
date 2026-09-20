# SEO Baseline Audit

Status: **SEO FOUNDATION READY — NOT VERIFIED IN PRODUCTION**  
Date: 2026-09-20

## Product Positioning

Canonical product wording is:

**Hệ thống quản lý, đặt lịch và giám sát tài nguyên phòng thí nghiệm**

AI, Digital Twin, optimization, payment and research modules are not the primary product identity.

## Current Route Model

The current React/Vite application is primarily an authenticated operational system. Dashboard, bookings, staff operations, administration, users, audit and monitoring are **AUTHENTICATED_NOINDEX** surfaces.

No production public-content route model or production domain is currently defined. Therefore a sitemap and canonical production URL are intentionally deferred rather than fabricated.

## Batch 5 SEO Foundation

- `frontend/index.html` uses Vietnamese language and product-accurate title/description.
- Authenticated application shell uses `noindex,nofollow,noarchive`.
- `frontend/public/robots.txt` currently disallows crawling because there is no approved public indexable route.
- Basic Open Graph/Twitter descriptive metadata is present without inventing a production URL.
- Private data remains protected by authentication/RBAC; robots policy is not treated as security.
- No React/Vite → Next.js migration.

## Future PUBLIC_INDEXABLE Model

When explicitly authorized, suitable public routes may include a product landing page, public-safe laboratory/resource catalog, FAQ/help, and policy information. At that time add:
- real URL routing;
- page-specific metadata;
- canonical production origin;
- sitemap containing only public canonical URLs;
- truthful JSON-LD where applicable;
- production Lighthouse/Core Web Vitals evidence;
- Search Console/URL Inspection verification.

## Current Gaps / Debt

- No public landing page yet.
- No production domain/canonical host.
- No sitemap by design at this stage.
- No production Search Console or Lighthouse evidence.
- Existing main bundle size warning remains a performance debt.

SEO is therefore a production-quality foundation, not a claim that authenticated pages are search-indexed.
