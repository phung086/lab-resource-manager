import assert from "node:assert/strict";
import test from "node:test";

import {
  serializeResource,
  serializeBooking,
  getResourceOperationalState,
  operationalStatuses,
  canonicalBookingStatuses
} from "../../src/utils/dataContract.js";

test("operationalStatuses and canonicalBookingStatuses are properly exported", () => {
  assert.ok(operationalStatuses.includes("AVAILABLE"));
  assert.ok(operationalStatuses.includes("IN_USE"));
  assert.ok(operationalStatuses.includes("MAINTENANCE"));
  assert.ok(operationalStatuses.includes("CALIBRATION"));
  assert.ok(operationalStatuses.includes("BROKEN"));
  assert.ok(operationalStatuses.includes("RETIRED"));
  assert.ok(operationalStatuses.includes("OFFLINE"));

  assert.ok(canonicalBookingStatuses.includes("PENDING_APPROVAL"));
  assert.ok(canonicalBookingStatuses.includes("CONFIRMED"));
  assert.ok(canonicalBookingStatuses.includes("CHECKED_OUT"));
  assert.ok(canonicalBookingStatuses.includes("RETURNED"));
  assert.ok(canonicalBookingStatuses.includes("COMPLETED"));
  assert.ok(canonicalBookingStatuses.includes("REJECTED"));
  assert.ok(canonicalBookingStatuses.includes("CANCELLED"));
});

test("serializeResource projects operationalStatus and canonical fields", () => {
  const resource = {
    id: "res-uuid-1",
    laboratoryId: "lab-uuid-1",
    code: "GPU-NODE-01",
    name: "NVIDIA DGX Station",
    subtype: "gpu_server",
    category: "EQUIPMENT",
    status: "available",
    operationalStatus: "AVAILABLE",
    location: "Lab Room 301",
    ownerTeam: "AI Research",
    capacity: 4,
    requiresApproval: true,
    specs: { gpuModel: "A100", vramGb: 80 },
    createdAt: new Date("2026-01-01T00:00:00Z")
  };

  const serialized = serializeResource(resource);
  assert.equal(serialized.id, "res-uuid-1");
  assert.equal(serialized.laboratoryId, "lab-uuid-1");
  assert.equal(serialized.code, "GPU-NODE-01");
  assert.equal(serialized.operationalStatus, "AVAILABLE");
  assert.equal(serialized.category, "EQUIPMENT");
  assert.equal(serialized.type, "gpu_server");
});

test("getResourceOperationalState marks maintenance and offline from operationalStatus", () => {
  const underMaintenance = {
    id: "res-1",
    operationalStatus: "MAINTENANCE",
    status: "maintenance"
  };
  const opState = getResourceOperationalState(underMaintenance, null);
  assert.equal(opState.state, "warning");
  assert.ok(opState.reasons.includes("maintenance"));

  const offlineRes = {
    id: "res-2",
    operationalStatus: "OFFLINE",
    status: "offline"
  };
  const offlineState = getResourceOperationalState(offlineRes, null);
  assert.equal(offlineState.state, "critical");
  assert.ok(offlineState.reasons.includes("resource_offline"));
});
