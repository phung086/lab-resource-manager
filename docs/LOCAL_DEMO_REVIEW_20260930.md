# Local demo review — 2026-09-30

The guarded local launcher now uses `scripts/deployCanonicalMigrations.mjs`, the same canonical deployment path as `npm run db:migrate`. Calling Prisma `migrate deploy` directly failed on an empty PostgreSQL 16 database at the historical reconciliation precondition. The existing frozen baseline and canonical classifier are retained; no historical migrations or protection checks changed.

Video seed links now omit Wikimedia's `width` parameter. For a WebM file that parameter returns a JPEG thumbnail; the original file link returns `video/webm`. Image seed links still request sized thumbnails. Existing seeded rows remain preserved on repeated initialization; remove/re-add an old video through resource media administration if it still contains `?width=1280`.

Verified on isolated PostgreSQL 16.14 database `lab_resources_local_demo`: canonical baseline initialization, 16 migration records, current migration status, guarded seed, Express API on 15004 and Vite UI on 15179. The database was created only for this review. No shared or production database was used.

The review uses the four documented `@lrm.local` accounts and password `LabDemo!2026Pass`. Illustrative resource media remains attributed to its external source. A demonstration usage guide for LOCAL-KIT-01 was saved through the admin UI and the corrected original WebM link was added through the resource media form. The guide is explicitly labelled demo and does not replace model-specific operating instructions.

Screen captures are from the actual React frontend, Express API and PostgreSQL demo database, with no API interception. Payment integrations are off, hardware is unconnected, and no production deployment is implied. The review recording is distributed separately from repository source to avoid committing large generated media.
