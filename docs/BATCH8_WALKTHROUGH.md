# Batch 8 Smart Monitoring Walkthrough

This walkthrough demonstrates the final monitoring extension without claiming
physical-device verification. Use controlled data only in an isolated demo
database; production never generates samples automatically.

## 1. Start the verified production-like stack

Copy `.env.production.example` to an untracked environment file, set strong
secrets and an explicit `_demo` database name, then start:

```powershell
docker compose --env-file <environment-file> -f docker-compose.prod.yml up --build -d
docker compose --env-file <environment-file> -f docker-compose.prod.yml ps
docker compose --env-file <environment-file> -f docker-compose.prod.yml exec -T backend npm run db:status
```

All three services must be healthy and all nine migrations must be up to date.
Verify `/health`, `/api/health`, and `/api/health/ready` through Nginx.

## 2. Create a scoped source as ADMIN

Open the application as ADMIN. In the monitoring administration API, create a
source linked to one real laboratory and resource. Record the returned token at
creation time; the database stores only its salted derived hash.

Rotate the credential when needed. Confirm the previous credential receives
401 and the new credential is accepted. Deactivating the source must cause a
403 without updating its last-seen time.

## 3. Submit one accepted sample

Send a sample to `POST /api/telemetry/samples` with the source credential in
`x-telemetry-source-token`. The server resolves the source, laboratory, and
resource from that credential.

Confirm:

- the sample is persisted;
- source `lastSeenAt` and `lastSampleAt` advance only after acceptance;
- the response names the applied threshold values and provenance;
- `Resource.operationalStatus` is unchanged.

Attempt to submit a different source/resource/lab identifier. The API must
reject it rather than trusting the payload.

## 4. Demonstrate truthful monitoring states

Use controlled, time-stamped samples to show:

- normal accepted data -> `HEALTHY`;
- a warning threshold violation -> `WARNING`;
- an old accepted timestamp beyond the configured freshness window -> `STALE`;
- an explicit source offline report -> `UNAVAILABLE`;
- a resource without accepted samples -> `NO_DATA`.

Do not describe these controlled inputs as physical sensor evidence.

## 5. Demonstrate threshold precedence

As ADMIN, configure a laboratory threshold, then a partial resource override.
The dashboard/API must show field-by-field provenance:

`RESOURCE_OVERRIDE -> LABORATORY -> SYSTEM_DEFAULT`

The frontend is displaying backend policy; it is not calculating hidden
threshold rules locally.

## 6. Demonstrate deduplicated alert and incident provenance

Submit concurrent critical readings for one active rule. Confirm PostgreSQL
contains one active alert episode and one linked incident. Additional readings
for that same active condition must not create a new incident each poll.

Sign in as assigned LAB_STAFF and acknowledge the alert. Confirm the actor and
time persist. Sign in as foreign LAB_STAFF and confirm acknowledgement receives
403.

## 7. Demonstrate the safety boundary

Temperature alone must not create a smoke/fire claim. A warning may be shown
only after an accepted, explicitly verified source signal. The UI must display:

`NON-CERTIFIED · NOT A FIRE ALARM`

Explain that it is an experimental early-warning aid and not a replacement for
certified alarms, physical safety systems, or laboratory procedures.

## 8. Demonstrate camera privacy and audit

Create camera metadata as ADMIN with `enabled=false` and
`status=NOT_CONFIGURED`. Confirm:

- assigned LAB_STAFF can see metadata but not the raw endpoint;
- foreign LAB_STAFF cannot see it;
- STUDENT and LECTURER access is denied;
- every access attempt is persisted with actor, camera, lab/resource, purpose,
  start/end time where applicable, and outcome;
- no fake video or stream is displayed.

## 9. Demonstrate history and reconnect behavior

Expand accepted-sample history, refresh the browser, and reopen the monitoring
page. Current state, alerts, incident links, and history must reconstruct from
PostgreSQL. There is no `REAL-TIME` badge because this release intentionally
uses persisted polling instead of a live socket.

## 10. Close with the hardware truth statement

State exactly:

- implementation/protocol/authentication/persistence/RBAC/UI: VERIFIED;
- real physical sensor/camera: PENDING REAL HARDWARE.

Screenshots from the verified run are in `frontend/screenshots_batch8/`.
