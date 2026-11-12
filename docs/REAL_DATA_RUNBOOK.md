# Real Data Runbook

## What Counts As Real Data

The production system should use:

- Real user accounts created by an admin.
- Official resource inventory from the lab: asset code, device name, type, location, owner team, capacity and specs.
- Real booking requests created by students, lecturers or lab staff.
- Real telemetry sent by the system agent or Prometheus exporters.

## First Deployment

The project does not create inventory, bookings or user examples automatically. Deployment uses:

```bash
npm run db:deploy
```

This runs migrations, applies the booking overlap guard and creates the first admin only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured.

`data/ai-lab-inventory.realistic.csv` is illustrative planning data, not an
authorized production inventory. Replace and verify its asset codes, room names,
owner teams, condition and policies before importing into a production database.

## Local Verification Startup

For a local smoke test with the bundled AI lab inventory:

```powershell
docker compose up -d postgres

cd backend
$env:DATABASE_URL="postgresql://lab_user:lab_password@localhost:5432/lab_resources"
$env:ADMIN_EMAIL="ops-admin@phong-thi-nghiem.local"
$env:ADMIN_PASSWORD="StrongPassword1234"
$env:ADMIN_FULL_NAME="Lab Operations Admin"
npm run db:deploy
npm run import:resources -- ../data/ai-lab-inventory.realistic.csv
npm start
```

In another terminal:

```powershell
cd frontend
$env:VITE_API_BASE_URL="http://localhost:8000"
npm run build
python -m http.server 5173 --bind 127.0.0.1 -d dist
```

Open `http://127.0.0.1:5173` and sign in with the admin account above.

## Input And Output Data Contract

- Resource codes are normalized to uppercase asset-code format before being stored or queried.
- Technical specs are normalized from CSV/UI input into typed values when possible, such as numbers and booleans.
- Telemetry percent values are validated within `0..100`; temperature values are validated before storage.
- API responses serialize dates as ISO strings and include `operational.state`, `operational.score`, `operational.reasons`, and `latestTelemetry` for resource views.
- Assistant and MCP answers use the same serialized tool results, so UI, REST, and connected AI clients audit the same data.

## CSV Columns

| Column | Required | Notes |
| --- | --- | --- |
| `code` | Yes | Official asset code |
| `name` | Yes | Official resource name |
| `type` | Yes | `gpu_server`, `room`, `raspberry_pi`, `uav`, `camera`, `kit`, `material` |
| `location` | Yes | Lab location or storage location |
| `status` | Yes | `available`, `maintenance`, `offline` |
| `ownerTeam` | Yes | Team responsible for the resource |
| `capacity` | Yes | Positive integer |
| `requiresApproval` | Yes | `true` or `false` |
| `specs` | No | Key-value pairs separated by semicolons, for example `gpuWarningPercent=85;temperatureCriticalC=85` |

## Verification Checklist

- Admin can log in.
- Real users are created from the Users tab.
- Real resources are visible after CSV import or manual entry.
- Eligible free bookings confirm automatically; priced bookings confirm only
  after verified settlement within the server's15-minute payment hold. Manual
  approval is retained only for applicable legacy pending records.
- Assigned staff/admin perform authorized handover and return inspection;
  handover opens30 minutes before start and closes at end. Owner ROOM check-in/
  return is the explicit self-service exception, enforced by the API window and
  ownership rules. Room return frees scheduling but still awaits inspection.
- Cancellation follows server role/status/deadline policy. Checked-out resources
  use the return workflow; do not force cancellation to free an active loan.
- Creating an overlapping booking returns HTTP `409`.
- `/metrics` returns Prometheus metrics.
- Agent telemetry updates the target resource.
- The assistant answers operations questions from system data and non-lab questions from cited external knowledge.

## Rental catalogue research and onboarding

Source review: 18 October 2026. These are **candidates for expansion**, not assets
owned by LAB, availability promises, purchase orders or confirmed rental prices.
No records were inserted into the live inventory. Supplier pages establish that
these equipment families are offered for rent; suitability and priority below
are LAB planning judgments, to be confirmed with actual teaching/research demand.

| Candidate | Suggested use | Required onboarding evidence | Source |
|---|---|---|---|
| Digital oscilloscope | Electronics, signals and embedded systems | Channels/bandwidth, probes, calibration and electrical safety SOP | [TRS oscilloscopes](https://www.trsrentelco.com/products/oscilloscopes) |
| Function/arbitrary waveform generator | Sensor and circuit exercises | Frequency/amplitude limits, connectors and output protection | [TRS generators](https://www.trsrentelco.com/products/generators) |
| DC power supply / electronic load | Power electronics and battery research | Voltage/current envelope, protections, leads and supervised-use rules | [TRS power sources](https://www.trsrentelco.com/products/power-sources) |
| Logic analyzer | MCU buses and digital protocols | Supported buses, voltage levels and licensed analysis software | [TRS logic analyzers](https://www.trsrentelco.com/products/logic-analyzers) |
| Spectrum analyzer | Wireless and RF research | Frequency coverage, input limits, attenuators and antenna set | [TRS spectrum analyzers](https://www.trsrentelco.com/products/spectrum-analyzers) |
| Infrared thermal imager | Thermal observation and maintenance research | Temperature range, measurement accuracy and stored-data handling | [TRS electrical test equipment](https://www.trsrentelco.com/products/electrical-industrial-test-equipment) |
| Power quality / energy logger | Energy monitoring exercises | Measurement category, probes, calibration and qualified operator | [TRS rental catalogue](https://www.trsrentelco.com/) |
| Vibration measurement kit | Predictive maintenance experiments | Sensors/mounts/cables, calibration and measurement SOP | [MeanLab vibration rental](https://meanlabvn.com/san-pham/d/dich-vu-cho-thue-may-do-rung/) |
| Single-gas detector | Environmental measurement training | Exact sensor/gas, calibration/bump-check records and competent supervision; rental alone does not certify safe entry | [Tara Tech rental](https://taratech.vn/product/thue-may-don-khi/) |
| RTK GNSS survey set | Mapping and positioning fieldwork | Receiver/controller, correction service, batteries and field checkout | [Máy Đo Đạc Miền Nam](https://maydodacmiennam.com/cho-thue-may-trac-dia) |
| Electronic total station | Surveying and civil engineering practicals | Tripod/prism, accuracy verification, transport case and field return checks | [Máy Đo Đạc Miền Nam](https://maydodacmiennam.com/cho-thue-may-trac-dia) |
| Environmental sampling/measurement set | Environmental research | Select an actual model, applicable measurement method, consumables, decontamination and calibration | [SUCOMO equipment services](https://sucomo.vn/may-moc-thiet-bi/) |

Start by verifying demand and real local availability for oscilloscope, waveform
generator, power supply/load and vibration kit; they fit the current electronics
and maintenance workflows. International listings are market references and do
not establish delivery, stock, warranty or support in Vietnam. Obtain written
quotes and local service terms before making procurement decisions. Do not reuse
supplier images without an applicable license or permission; photograph the
actual unit and label reference photos honestly.

Before publishing each real resource: verify owner/serial/asset code, LAB/site,
physical condition, responsible staff, quantity/accessories, tariff/deposit terms,
training requirements, usage guide, maintenance/calibration schedule and licensed
media. Follow the existing category/subtype contract; do not add enums merely
to match a catalogue name. A measurement device without a dedicated subtype may
use approved OTHER with model details in specs, after classification is verified.
Exercise booking → configured payment/free confirmation → handover → return →
inspection/completion with real responsible staff and approved test fixtures.
Do not turn research candidates into AVAILABLE/bookable inventory by seeding.
