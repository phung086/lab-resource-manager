# Production readiness

Updated 19 October 2026. This is the release gate, not a deployment certificate.
Run evidence and remaining blockers are in [CURRENT_STATE](CURRENT_STATE.md).
Fixture SMTP, signed IPN fixtures, localhost HTTP and image builds do not verify
an external provider or the production host.

## Reproducible code gates

Session/booking/SEO/chat additions (ADR-043) additionally require:

- AuthSession forward migration, forced re-login and atomic registration/guest
  issuance. The isolated `sessions` release suite covers logout/replay, inactivity,
  absolute limits, claims, owner binding and cleanup. Confirm idle warnings and
  sign-out across tab visibility/reload on actual browsers; current browser access
  was blocked by tool policy, so no new visual certification is recorded.
- Public production build with actual origin/indexing opt-in. Initial HTML must
  have correct public metadata/canonical, private noindex, actual404s, sitemap
  and CSP. `checkSeoDelivery.mjs` targets only the allowlisted QA image host;
  Search Console/HTTPS verification remains required on the real domain.
- Record time to first **useful verified content**, not typing or a connection
  warning. Exercise common local reads and externally delivered partial/final
  answers. At this checkpoint Work had zero active subscriptions; the local
  resource lookup was160ms, but a required AI explanation was unavailable. The
  requested5–10s provider target is unverified, not passed. Restore the existing
  Work consumer/subscription and measure p50/p95 under expected concurrency
  before promising response latency.

- Backend: `npm run lint`, `npm run verify:prod-config`, `npm run docs:erd:check`,
  `npm run test:required`, `npm audit --omit=dev`.
- Frontend: `npm run test:required`, `npm audit --omit=dev`.
- Integration: `npm run test:release:integration` with RELEASE_TEST_ADMIN_URL
  targeting /postgres on a dedicated localhost PostgreSQL 16 instance at port
  25439. The runner refuses existing target databases and never resets them.
  It creates each allowlisted database, deploys canonical migrations and records
  per-suite exit codes in backend/logs/release-integration/. CUSTOMER migration
  verification prepares predecessor fixtures before applying the role migration.
- Browser: with UI5173 running, use test:ui:fulfillment, test:ui:payment-hold and
  test:ui:calendar-planner with their guarded test URLs. All API traffic goes to
  separate test APIs, not the demo DB.
- `.github/workflows/production-readiness.yml` repeats current contracts,
  integration and critical browser checks on PR/manual dispatch. Local results
  do not prove that this workflow has executed in GitHub Actions.
- Review full dependency audit separately; never force incompatible downgrades
  to clear it. The production API excludes dev dependencies and retains Prisma
  CLI for mandatory migration startup. Development advisories remain visible.

## Roles and booking acceptance

The guarded `operational-audit` release suite checks closed-LAB rescheduling,
current role/LAB checks after waiting for locks, direct staff booking scope,
released room projections, malformed dates, expired holds without workers,
exact maintenance duration, internal-job privacy, explicit interval policy
filters, overdue actual-use reporting and unread totals beyond preview caps.
Source audits and fixture tests do not certify institutional operating policies,
production load, physical equipment or live external providers.

Operating sign-off still needs the actual LAB SOP: booking notice/turnaround
time, cancellation/no-show consequences, refunds/damage charges and inspection
responsibility. The current baseline is30-minute notice and half-open adjacent
slots; it does not invent a cleaning buffer or financial penalty. ADR-037
explicitly releases a returned ROOM before staff completion/inspection. If the
institution requires inspection before reuse, that contract needs an approved
change rather than silently treating the owner's declaration as a safety check.

- Roles are ADMIN, LAB_STAFF and CUSTOMER; public registration creates CUSTOMER.
  Staff operate assigned LABs; global CUSTOMER account management is the explicit
  exception. Test inactive users, stale tokens, other owners and foreign LABs.
- Free eligible bookings confirm immediately. Priced bookings remain
  PENDING_APPROVAL with a fixed creation + 15-minute payment deadline. Only
  verified timely settlement confirms; retry/reload never extends the hold.
- Expiry frees the interval. Late settlement requires reconciliation and never
  restores the reservation. Browser Return cannot settle a payment.
- Legacy pending records without paymentDueAt retain approval/rejection; tests
  must not re-enable approval on new bookings to exercise this path.
- Test concurrent overlap and half-open adjacency at PostgreSQL level, policy,
  training, maintenance, pricing versions and cancellation guards.
- Handover/owner ROOM check-in opens at start minus 30 minutes and closes at end.
  ROOM owner return releases scheduling but retains RETURNED until inspection.
  Hard physical states survive return. Room codes use the booking phone snapshot
  and owner-only access; shared passwords and physical locks are not implied.
- Verify incidents, notifications, stock, care/inspection, support FIFO,
  account OTP/session revocation, loyalty, reports and calendar privacy.

## Host and infrastructure gates

- Supply a private .env.production for the approved host. Use strong independent
  DB/JWT/admin secrets, explicit origins and HTTPS. Rotate bootstrap credentials
  through the OTP flow after real SMTP is available. Never commit real values.
- Validate Compose using `config --quiet` to avoid printing interpolated secrets.
  verify:prod-config checks rules with fixtures, not the operator's actual host,
  credentials, merchant or domain.
- Production Nginx proxies /api, /mcp, /oauth/chatgpt and OAuth discovery to the
  API. OAuth URLs are not access-logged; MCP buffering is disabled. Protocol
  requests must not fall through to the SPA or cache OAuth responses.
- API runs as UID1000 through canonical migration/admin startup, without .env,
  lint/watch/test packages. Database readiness must pass. Keep backend/DB private
  and configure the approved TLS edge and proxy topology.
- Test the real backup schedule and restore to a separate database. Protect keys
  separately. An isolated fixture restore does not certify production RPO/RTO.

## Media and expanded rental inventory

- Candidate equipment and supplier sources are maintained in
  [REAL_DATA_RUNBOOK](REAL_DATA_RUNBOOK.md#rental-catalogue-research-and-onboarding).
  A supplier catalogue is not a local asset or stock confirmation. Verify owner,
  LAB, asset/serial, condition, tariffs, training, maintenance/calibration,
  accessories and licensed media before enabling a real resource for rental.
- Run frontend `npm run test:media` and backend `npm run test:media`; both are
  included in their required gate. Use the offline media-preparation tool and
  [DEPLOYMENT](DEPLOYMENT.md#media-delivery-and-operating-budgets) budgets.
- Verify real S3 PUT preflight with Content-Type/Cache-Control, signed byte length,
  actual HEAD completion, CDN404/206/304 and replacement/removal behavior. Storage
  was unconfigured at the18 October local check, so signing fixtures do not
  establish provider compatibility. Do not log presigned URLs or credentials.
- Exercise play-on-demand, hidden/offscreen pause, reduced motion, Save-Data,
  slow connections, seek, bad source and cancel/timeout uploads on target
  browsers/devices. No visual or playback certification is implied by a build,
  MIME/range test or MP4 faststart inspection. Current local browser control is
  disabled in Work settings; the new playback behavior needs that browser pass.
- Measure cold/warm cache and agreed peak traffic on the actual production host,
  including booking API/DB activity while media is served. Watch DB connections,
  API p95/5xx, CPU/RAM, origin/CDN egress and buffering. The bounded local media
  smoke (8 workers,48 reads) is not a safe maximum user count or a no-stall SLA.
- Provision official inventory/topology; do not seed demo data in production.
  Verify migrations, rollback, health checks, logs and monitoring on the actual
  staging/production host before allowing traffic.

## Integration gates before enabling features

| Capability | Required evidence |
|---|---|
| SMTP/OTP/email | Real TLS SMTP, OTP in the intended inbox, failures/retries and receipt delivery. SENT means SMTP acceptance only. |
| VNPAY | Approved production merchant, HTTPS callback, timely/late/duplicate IPN and reconciliation procedure. Sandbox is separate evidence; QR/refund require verification. |
| Work bridge | HTTPS public/UI origins, stable independent 32-byte key, exact callback, ADMIN consent, one fresh receiver and real reply. Fixture MCP tests remain separate. |
| S3/media | Approved storage, host allowlist, permissions and real object verification. |
| Telemetry/camera/door | Configured authenticated physical sources and hardware evidence. Missing samples remain NO_DATA; declared use is not a measurement. |
| Equipment delivery | Internal handover only. GHN, tracking and carrier quotes are deferred. |

Do not enable capabilities lacking required configuration/evidence. Record
BLOCKED/NOT RUN separately from PASS. Current browser coverage targets Chromium;
other engines, sustained load, production capacity and receiver renewal need
separate evidence. Release requires code gates plus relevant host/provider gates.
