# Production Deployment

The canonical production stack is:

- React/Vite static frontend served by Nginx;
- Node.js/Express API;
- PostgreSQL 16;
- optional Prometheus and Node Exporter under the `observability` profile.

REQUIRED CORE production behavior must remain database-backed and must not fall back to demo/mock data.

## 1. Prepare the host

Install Docker + Docker Compose, then copy/clone the repository:

```bash
cd lab-resource-manager
cp .env.production.example .env.production
```

Edit `.env.production` before startup.

Required production values include:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD` — strong secret
- `JWT_SECRET` — at least 32 characters, not an example value
- `ADMIN_EMAIL` — valid first-admin email
- `ADMIN_PASSWORD` — at least 12 characters, not an example value
- `ADMIN_FULL_NAME`
- `CORS_ORIGINS` — explicit allowed application origin(s), never `*`

Recommended/defaulted:

- `JSON_BODY_LIMIT=1mb`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=180`
- `SESSION_IDLE_MINUTES=30`, `SESSION_ABSOLUTE_MINUTES=480` (upper limits30/480;
  idle is capped by absolute; invalid values use defaults)
- `REMINDER_SCHEDULER_ENABLED=true`
- `BOOKING_UPCOMING_REMINDER_MINUTES=30`
- `RETURN_REMINDER_MINUTES=15`
- `LRM_LOG_FORMAT=combined` (Compose maps this namespaced value to backend
  `LOG_FORMAT`; this avoids accidental host-environment collisions)
- `VITE_ENABLE_RESEARCH_FEATURES=false`

Optional backend integrations are disabled or unavailable until their complete
configuration is supplied:

- Email and guest OTP: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  and `EMAIL_FROM`. Guest OTP fails closed when SMTP is unavailable; production
  never reports a development/test email transport as successful.
- Booking-linked VNPAY: keep `PAYMENTS_ENABLED=false` and
  `VNPAY_ENABLED=false` unless the approved merchant configuration is ready.
  When enabled, set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`,
  `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, and
  `PAYMENT_APP_URL`. Startup validation rejects incomplete or insecure values.
- Resource media upload: set `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`,
  `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`,
  `MEDIA_S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_BASE_URL`. Restrict
  `MEDIA_EXTERNAL_HOSTS` to approved HTTPS image hosts.

### Session and SEO release settings

Apply the forward AuthSession migration through the canonical deploy command
before starting the new API. Back up the database first. All old JWTs require
sign-in again: issuer/audience/sid are mandatory; TOKEN_EXPIRES_IN no longer
controls internal credentials. Do not deploy FE/BE session changes independently.
No seed/reset is required. Logout invalidates the current persisted sid, while
logout-all/credential changes invalidate earlier authVersion values. Cleanup
removes at most1000 expired sessions per hour; monitor table size at actual load.
HTTP401/503 and session/activity reads must not be cached by an ingress/CDN.
JavaScript session storage still requires XSS prevention and the shipped Nginx
CSP; the policy assumes same-origin `/api` proxy and externally hosted HTTPS
images/media only. Verify CSP on real devices and integrations before release.
TLS termination/HSTS, secret rotation, distributed rate limits, MFA and recovery
procedures remain deployment/security work, not an automatic effect of JWTs.

Set `VITE_PUBLIC_SITE_URL` to the real public HTTPS origin without a path and
`VITE_SEO_INDEXABLE=true` only for the approved public deployment, then rebuild
the frontend image. Both are build arguments; changing container env later does
not rewrite a Vite bundle. Default builds stay noindex/disallowed in robots.
The build emits four public HTML introductions with distinct VI metadata,
canonical/OG URLs, crawlable links and a sitemap. Runtime metadata supports VI/EN
on those same URLs; there are no distinct locale URLs/hreflang promises or public
resource-detail routes. Private/auth/error HTML starts noindex before JS; unknown
URLs return404. Never put private profile/payment/booking URLs in the sitemap.
Public catalogue detail still needs JS/API; this is not full resource SSR.

Inspect raw HTTP HTML, status, canonical, robots and sitemap at the final HTTPS
host, then submit the sitemap and inspect the four URLs in Search Console.
Indexing/ranking is decided by the search engine. The QA image uses an explicit
example origin and is never a production-domain assertion.

Guidance: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### Media delivery and operating budgets

Media bytes go directly between browser and object storage/CDN. Express handles
metadata and authorization only; do not proxy uploads or transcode inside API
requests. Serve public resource images through an approved HTTPS media hostname;
private/security-sensitive files need a separate private access flow. Current
ResourceMedia is public catalogue content, not storage for IDs or user evidence.

Implemented controls:

- Card images use lazy loading/async decoding. Known Wikimedia Special:FilePath
  images receive 320/640/960 responsive sizes; detail images use up to1280.
  Signed S3/arbitrary URLs are not rewritten and need prepared images at origin.
- Resource videos attach their source only after Play. They pause offscreen or
  when the document is hidden; returning does not start them automatically.
  Decorative landing playback also honors reduced motion, hidden state,
  Save-Data and slow-2g/2g/3g when the browser exposes Network Information.
  That API is not universally available; explicit motion controls remain.
- Upload PUT is single-flight in the editor, cancellable, reports progress and
  times out after120 seconds without retrying. Network completion is separate
  from the metadata completion call. If a final response is lost, reload the
  media list before retrying; publication may already have committed.
- Authenticated media writes have a20/minute per-user limit (upload request and
  completion each count). S3 metadata traffic shares a16-socket keepalive pool,
  3s connection/10s request deadlines and at most2 attempts. This is per API
  process; multiple replicas need a shared rate-limit store/edge policy.
- Presigned PUT lasts10 minutes and signs Content-Type, Content-Length and
  Cache-Control. Browser sends Content-Type and Cache-Control; it sets byte length
  automatically. Optional SDK empty-body checksum generation is disabled for
  these later browser uploads. Confirm this contract on the chosen S3 provider.
  Completion still checks HEAD MIME, actual byte size, resource key and extension.
  HEAD checks do not decode/sniff file bytes or scan malware. Only trusted
  ADMIN/scoped LAB_STAFF may publish; public uploads require a quarantine and
  validation pipeline before being enabled.
- Public objects use max-age86400. Use new object keys when replacing files;
  deleting metadata does not revoke cached public copies. Configure CDN purge
  for urgent removal. Storage must prevent overwrite of published keys by bucket
  policy/versioning or a future staging-to-published promotion flow; a presigned
  PUT is reusable until expiry, so it is not a one-use publication guarantee.
- Nginx serves /media directly with a one-day cache, one byte range per request,
  bounded open-file cache and404 for missing files. Hashed /assets cache for a
  year. Existing security headers apply; MP4/WebP are not recompressed with gzip.

Operating budgets (acceptance targets, not measured production SLA):

| Item | Initial target |
|---|---|
| Resource card image |640px maximum edge, <=160KiB |
| Detail image |1600px maximum edge, <=600KiB, strip EXIF/location |
| Decorative loop |<=2MiB, silent, one active loop |
| Resource instruction clip |Prefer <=120s,720p,H.264/yuv420p MP4,+faststart,<=1.5Mbit/s video; verify readable labels and audio/captions |
| Media above the initial viewport |No instruction video download before Play |
| Web UX |Target p75 LCP<=2.5s, INP<=200ms, CLS<=0.1 on representative real devices/network |
| Capacity acceptance |Measure intended peak users plus headroom on the actual host; API p95/error rate, DB pool, CPU/RSS, network and player stalls must stay within the agreed limits |

Prepare images **offline** from local, licensed files:

```bash
cd frontend
npm run media:prepare -- /path/to/photo.jpg /path/to/new-output-directory
```

The command refuses an existing output directory, source over20MiB, images over
24 megapixels, animation and unsupported formats. It serially creates640/1600
WebP variants, removes metadata, limits encoder concurrency to1 and imposes a
20s transform deadline per attempt. Failed budgets stop publication. The manifest
names the detail file to upload via the existing editor; it does not upload,
change the original, or automatically configure multi-variant CDN delivery.
Inspect lettering/serial plates manually before publishing; keep full originals
in private asset records when operational detail is needed. Sharp is a build/
preparation dev dependency and is not shipped in the static Nginx runtime.

For approved local video, use a maintained FFmpeg on a separate preparation host
or worker. Example for a short clip (no trimming is implied):

```bash
ffmpeg -nostdin -n -i input.mov -map 0:v:0 -map 0:a:0? -map_metadata -1 -vf "scale=w=1280:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30" -c:v libx264 -preset medium -crf 24 -maxrate 1500k -bufsize 3000k -pix_fmt yuv420p -threads 2 -c:a aac -b:a 96k -movflags +faststart output.mp4
```

Check duration/resolution/codec/bitrate with ffprobe, view the whole result and
verify actual playback/seek on target browsers. FFmpeg/ffprobe are not bundled
or installed by this change; this command was researched, not executed here.
For longer videos or significant concurrent viewing, use managed VOD/CDN with
adaptive HLS/DASH rather than increasing API memory or serving originals.
Keep encoding jobs off the API host; begin with worker concurrency1–2 and
explicit CPU/RAM/time/disk quotas, then size from measured workload.

Bucket CORS must permit PUT/GET/HEAD from the exact application origin and allow
Content-Type and Cache-Control request headers. Expose ETag, Accept-Ranges,
Content-Range and Content-Length for diagnostics as needed. Do not grant public
write/list or use wildcard origins to work around failed preflight. Restrict
storage service-account permissions to the media prefix. Configure bucket quota,
egress/budget alerts and abandoned-upload reconciliation using DB objectKey
references; do not age-delete the resources/ prefix blindly because it also
contains published files. HEAD/PUT/range/CDN behavior needs a real-provider test.

Bandwidth planning:50 active viewers at1.5Mbit/s video plus96kbit/s audio need
about80Mbit/s of viewer egress before protocol overhead. A CDN shifts origin
traffic; it does not eliminate client bandwidth or billing. Test cold and warm
cache, slow clients and storage failure as separate scenarios. There is no
defensible universal user capacity without actual host/network measurements.

For a bounded local Nginx smoke use `npm run media:smoke` against an isolated
container on127.0.0.1:25441 with the current dist/config and an upstream backend.
It verifies404, MIME/security/cache headers,206/416, conditional304, MP4 box order
and48 read operations with8 workers. It is not a load limit or frame-stall test.

Primary references: [web.dev video](https://web.dev/learn/performance/video-performance),
[MediaWiki resizing](https://www.mediawiki.org/wiki/Help:Linking_to_files),
[Sharp pixel limits](https://sharp.pixelplumbing.com/api-constructor/),
[FFmpeg faststart](https://www.ffmpeg.org/ffmpeg-formats.html),
[S3 performance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html),
[S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html),
[Nginx range limits](https://nginx.org/en/docs/http/ngx_http_core_module.html#max_ranges).

The production backend refuses to boot when critical production configuration is invalid.

For the optional Work bridge, enable CHATGPT_BRIDGE_ENABLED only with HTTPS
CHATGPT_BRIDGE_PUBLIC_ORIGIN/CHATGPT_BRIDGE_UI_ORIGIN, an independent base64
32-byte CHATGPT_BRIDGE_SECRET_KEY and exact CHATGPT_BRIDGE_REDIRECT_URIS.
Production Compose forwards these settings and Nginx proxies MCP, OAuth and
discovery alongside /api. Consent and a fresh receiver are still required.
OAuth codes/state must not enter URL access logs. Protect stable keys separately
from the database. ROOM_ACCESS_SECRET_KEY remains for legacy encrypted settings;
current ROOM access uses the owner's booking phone snapshot (ADR-041).

Telemetry devices do not share an environment secret. Provision a source as an
administrator, copy its one-time credential to the device, and rotate it if it
is exposed. Only the derived credential hash is persisted.

## 2. Validate before startup

Validate Compose interpolation:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
```

The repository CI also verifies the production configuration contract through:

```bash
cd backend
npm run verify:prod-config
```

Never commit the real `.env.production` file.

## 3. Deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The backend production container runs:

```text
Canonical migration deployment (`npm run db:migrate`)
-> Prisma migration status verification
-> canonical first-admin seed
-> start API
```

The canonical migration command verifies immutable baseline artifacts and then
classifies the database before it changes migration state:

- a completely empty PostgreSQL database receives the reviewed baseline in
  `backend/prisma/baseline/20260924000100_clean_baseline`, then the included
  historical migrations are recorded with Prisma's official `migrate resolve`;
- a clean baseline whose SQL and marker completed may resume an interrupted
  resolve only after its complete PostgreSQL catalog fingerprint matches;
- an existing database is accepted only when its finished, non-rolled-back
  Prisma migration rows form a canonical repository prefix beginning at the
  accepted project origin. It keeps that lineage and receives only pending
  forward migrations.

Relevant public tables, partitioned tables, views, materialized views,
sequences, enum/domain types, and public functions make a database non-empty.
Foreign, empty, failed, rolled-back, duplicated, or out-of-order Prisma history
fails closed. A marker alone never authorizes resolve.

The baseline directory contains frozen SQL and Prisma schema snapshots plus a
manifest that hashes those artifacts and every represented historical
migration using normalized UTF-8/LF text. The live `schema.prisma` may evolve
through later forward migrations without changing the old baseline. A new
baseline requires a new ID and directory.

The resume boundary is exact: automatic resume applies only after baseline SQL
and its final marker completed. If baseline SQL itself is interrupted, recreate
that initially empty database and rerun deployment. Do not attempt to repair or
resolve it in place. Tracked historical migration SQL is never edited,
`_prisma_migrations` is never edited manually, and production does not run
`prisma db push`.

## 4. Verify runtime

Inspect services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Through the frontend/Nginx entry point:

```bash
curl -f http://SERVER/health
curl -f http://SERVER/api/health/ready
```

Expected readiness includes a live PostgreSQL query.

For a real domain, terminate TLS/HTTPS in the approved reverse proxy/load balancer and configure:

```text
CORS_ORIGINS=https://real-domain.example
```

Do not use wildcard CORS to make the browser work.

## 5. First administrator

The first administrator is created/upserted from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`

The persisted role is exactly:

`ADMIN`

After login, use the canonical user administration UI/API for ordinary project users and LAB_STAFF assignments.

Public registration creates CUSTOMER only and cannot request privileged roles.

## 6. Physical site topology and resource onboarding

The canonical resource model requires a laboratory.

Production must use an approved real site/topology onboarding process before resources are created. Do not fabricate campus/lab records in normal production startup.

The Batch 7 graduation-demo bootstrap:

`npm run demo:seed-infrastructure`

is explicitly demo-only. It fails unless:

- `DEMO_MODE=true`;
- the database name contains `_demo`;
- the database host is local/Compose.

It must not be used to seed fake production inventory.

After the laboratory exists, resources are created through the canonical resource API/UI.

### Legacy CSV importer

`backend/scripts/importResources.js` and old inventory CSV files belong to the earlier resource schema and are not the canonical production onboarding path until explicitly reconciled.

Do not run the legacy importer against production merely because the file exists.

## 7. Optional integrations and research features

Default production/demo:

```text
VITE_ENABLE_RESEARCH_FEATURES=false
```

This keeps research surfaces outside the default graduation workflow, including examples such as:

- legacy payment/VietQR demonstrations that are not part of the approved
  booking-linked VNPAY lifecycle;
- fake QR/door/SSH flows;
- static AI analytics/advisory;
- Digital Twin;
- Pareto/GA/NSGA-II;
- what-if simulation;
- optimization/orchestration;
- fake audit/policy screens.

Research source can remain in the repository for later approved work, but it is not REQUIRED CORE production functionality.

The approved VNPAY lifecycle is a separate optional product extension. It
remains disabled by default and becomes available only when both payment flags
and the validated merchant configuration described in section 1 are present.

## 8. Telemetry

### Protected metrics and optional observability

The production API runs as `node` (UID 1000), excludes development dependencies
and retains Prisma CLI for migration startup, with a writable `/app/data` created
in the image. Bind mounts must grant this user appropriate permissions. The
canonical migration/first-admin startup remains mandatory; do not use
`prisma db push` to work around permissions or migration errors.

Production `/metrics` returns 503 unless `METRICS_TOKEN` is configured. When
configured it requires `Authorization: Bearer <token>`; missing/wrong values
return 401. Query parameters never authorize scraping. Keep tokens out of URLs,
screenshots and logs. Development retains public local scraping unless the same
token is explicitly configured.

To enable observability on the deployment host:

1. Generate a cryptographically random token of 32–256 non-whitespace characters
   (for example 32 random bytes encoded as hex). Set `METRICS_TOKEN` in private
   `.env.production`; do not reuse JWT/provider credentials.
2. Save exactly that token in a protected file, e.g. `.secrets/metrics-token`.
   This directory is Git-ignored. Set `METRICS_TOKEN_FILE` to its path. Avoid a
   BOM or extra whitespace; restrict host access while allowing the Prometheus
   container user to read the file. Compose's file-backed secret does not itself
   encrypt the host file.
3. Verify configuration, then activate the optional services explicitly:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability config --quiet
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability up -d --build
   ```

Prometheus reads `/run/secrets/metrics_token` and scrapes `backend:8000`. Its host
UI binds `127.0.0.1:${PROMETHEUS_PORT:-9090}`; use the host or an approved secure
tunnel. Node Exporter uses Linux host mounts; native Windows host coverage is not
certified. Without the profile, ordinary production startup runs application/DB
only. Rotate file and backend environment together, recreate backend and
reload/recreate Prometheus, then confirm the target is UP without exposing secrets.

Batch 6 accepts authenticated telemetry only.

Telemetry ingestion must use the configured service credential and real resource/laboratory identity.

Missing telemetry is `NO_DATA`, not healthy.

Sensor/camera/MQTT integration belongs to the later Smart Laboratory Monitoring extension and must not be represented as production-ready before verification.

## 9. Backup and restore

Create a backup before approved schema migration, major data import, or production change:

```bash
sh ops/backup-postgres.sh
```

Windows:

```powershell
.\ops\backup-postgres.ps1
```

Restore only after validating the backup and stopping application traffic:

```bash
CONFIRM_RESTORE=yes sh ops/restore-postgres.sh backups/lab_resources-YYYYMMDD-HHMMSS.dump
```

Windows:

```powershell
.\ops\restore-postgres.ps1 -BackupFile backups\lab_resources-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

Never edit `_prisma_migrations` manually to force a deployment.

## 10. Production release checks

Before a graduation-demo or production release, verify:

Backend:

```bash
cd backend
npm run lint
npm run verify:prod-config
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Then run the approved Batch regression/full-stack workflows and the official graduation demo gate.

The exact graduation scenario is documented in:

`docs/GRADUATION_DEMO_RUNBOOK.md`

A build alone is not sufficient evidence of production readiness.
