import assert from "node:assert/strict";
import test from "node:test";

import {
  getResourceOperationalState,
  normalizeResourceCode,
  normalizeSpecs,
  serializeBooking,
  serializeResource
} from "../src/utils/dataContract.js";

test("normalizes resource codes for API and telemetry input", () => {
  assert.equal(normalizeResourceCode(" ai gpu h100 01 "), "AI-GPU-H100-01");
});

test("normalizes technical specs into typed values", () => {
  assert.deepEqual(
    normalizeSpecs({
      "gpu warning percent": "88.5",
      enabled: "true",
      empty: " ",
      nested: { "stale minutes": "10" }
    }),
    {
      gpuwarningpercent: 88.5,
      enabled: true,
      nested: { staleminutes: 10 }
    }
  );
});

test("serializes bookings with ISO dates and calculated duration", () => {
  const booking = serializeBooking({
    id: "booking-1",
    title: "Model training window",
    purpose: "Train baseline model",
    status: "approved",
    notes: "",
    startAt: new Date("2026-08-05T01:00:00.000Z"),
    endAt: new Date("2026-08-05T03:00:00.000Z"),
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    resource: { id: "res-1", code: "AI-GPU-H100-01", name: "H100 GPU Server", type: "gpu_server", status: "available", location: "Lab A" },
    requestedBy: { id: "user-1", email: "user@example.com", fullName: "Researcher", role: "researcher", isActive: true }
  });

  assert.equal(booking.durationMinutes, 120);
  assert.equal(booking.notes, null);
  assert.equal(booking.startAt, "2026-08-05T01:00:00.000Z");
  assert.equal(booking.resource.code, "AI-GPU-H100-01");
});

test("marks high utilization resources as needing attention", () => {
  const now = new Date("2026-08-05T03:00:00.000Z");
  const resource = {
    id: "res-1",
    code: "AI-GPU-H100-01",
    name: "H100 GPU Server",
    type: "gpu_server",
    status: "available",
    location: "Lab A",
    ownerTeam: "AI Lab",
    capacity: 1,
    requiresApproval: true,
    specs: { gpuWarningPercent: 80, gpuCriticalPercent: 95 },
    createdAt: now
  };
  const telemetry = {
    gpuPercent: 91.236,
    online: true,
    source: "agent",
    sampledAt: new Date("2026-08-05T02:59:00.000Z")
  };

  const serialized = serializeResource(resource, telemetry, now);
  assert.equal(serialized.latestTelemetry.gpuPercent, 91.24);
  assert.equal(serialized.operational.attention, true);
  assert.equal(serialized.operational.state, "warning");

  const operational = getResourceOperationalState(resource, serialized.latestTelemetry, now);
  assert.equal(operational.reasons.includes("gpu_high_warning"), true);
});
