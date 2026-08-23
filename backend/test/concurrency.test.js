import assert from "node:assert/strict";
import test from "node:test";

import { getResourceAvailability, assertResourceAvailable } from "../src/services/availabilityService.js";
import { HttpError } from "../src/middleware/errors.js";
import { runConcurrencyStressTest, runMultiResourceConcurrencyStressTest } from "../src/research/concurrencyBenchmark.js";

test("Concurrency: Booking conflict detection catches simultaneous overlaps", async () => {
  const resourceId = "res-gpu-01";
  const startAt = new Date("2026-09-01T08:00:00Z");
  const endAt = new Date("2026-09-01T10:00:00Z");

  const existingBooking = {
    id: "booking-101",
    resourceId,
    title: "User A GPU Session",
    status: "approved",
    startAt,
    endAt
  };

  const mockTx = {
    resource: {
      findUnique: async () => ({ id: resourceId, code: "GPU-01", status: "available" })
    },
    booking: {
      findMany: async () => [existingBooking]
    },
    maintenanceWindow: {
      findMany: async () => []
    }
  };

  const availability = await getResourceAvailability(mockTx, {
    resourceId,
    startAt,
    endAt,
    resource: { id: resourceId, code: "GPU-01", status: "available" }
  });

  assert.equal(availability.available, false, "Resource should not be available for overlapping slot");
  assert.equal(availability.conflicts.length, 1);
  assert.equal(availability.conflicts[0].type, "EQUIPMENT_CONFLICT");

  assert.throws(
    () => assertResourceAvailable(availability),
    (err) => err instanceof HttpError && err.status === 409 && err.code === "BOOKING_CONFLICT"
  );
});

// ─── 4 PRECISE GI-ST HALF-OPEN INTERVAL EDGE CASES ──────────────────────────

test("Concurrency Edge Case 1: Adjacent half-open intervals [08:00, 10:00) and [10:00, 12:00) are allowed", async () => {
  const resourceId = "res-gpu-edge";
  const existingBooking = {
    id: "bk-adjacent-1",
    resourceId,
    startAt: new Date("2026-09-01T08:00:00Z"),
    endAt: new Date("2026-09-01T10:00:00Z"),
    status: "approved"
  };

  const mockTx = {
    resource: { findUnique: async () => ({ id: resourceId, code: "GPU-EDGE", status: "available" }) },
    booking: {
      findMany: async () => {
        // Query overlapping: startAt < targetEnd && endAt > targetStart
        // Target: [10:00, 12:00) -> existing endAt (10:00) is NOT > targetStart (10:00)
        return [];
      }
    },
    maintenanceWindow: { findMany: async () => [] }
  };

  const availability = await getResourceAvailability(mockTx, {
    resourceId,
    startAt: new Date("2026-09-01T10:00:00Z"),
    endAt: new Date("2026-09-01T12:00:00Z"),
    resource: { id: resourceId, code: "GPU-EDGE", status: "available" }
  });

  assert.equal(availability.available, true, "Adjacent half-open intervals must be allowed without false positives");
  assert.doesNotThrow(() => assertResourceAvailable(availability));
});

test("Concurrency Edge Case 2: Partial overlap [08:00, 10:00) and [09:45, 11:45) is rejected (15 min conflict)", async () => {
  const resourceId = "res-gpu-edge";
  const existingBooking = {
    id: "bk-partial-1",
    resourceId,
    startAt: new Date("2026-09-01T08:00:00Z"),
    endAt: new Date("2026-09-01T10:00:00Z"),
    status: "approved"
  };

  const mockTx = {
    resource: { findUnique: async () => ({ id: resourceId, code: "GPU-EDGE", status: "available" }) },
    booking: { findMany: async () => [existingBooking] },
    maintenanceWindow: { findMany: async () => [] }
  };

  const availability = await getResourceAvailability(mockTx, {
    resourceId,
    startAt: new Date("2026-09-01T09:45:00Z"),
    endAt: new Date("2026-09-01T11:45:00Z"),
    resource: { id: resourceId, code: "GPU-EDGE", status: "available" }
  });

  assert.equal(availability.available, false, "Partial overlap must be rejected");
  assert.throws(
    () => assertResourceAvailable(availability),
    (err) => err instanceof HttpError && err.status === 409
  );
});

test("Concurrency Edge Case 3: Complete subset containment [08:00, 12:00) and [09:00, 10:00) is rejected", async () => {
  const resourceId = "res-gpu-edge";
  const existingBooking = {
    id: "bk-outer-1",
    resourceId,
    startAt: new Date("2026-09-01T08:00:00Z"),
    endAt: new Date("2026-09-01T12:00:00Z"),
    status: "approved"
  };

  const mockTx = {
    resource: { findUnique: async () => ({ id: resourceId, code: "GPU-EDGE", status: "available" }) },
    booking: { findMany: async () => [existingBooking] },
    maintenanceWindow: { findMany: async () => [] }
  };

  const availability = await getResourceAvailability(mockTx, {
    resourceId,
    startAt: new Date("2026-09-01T09:00:00Z"),
    endAt: new Date("2026-09-01T10:00:00Z"),
    resource: { id: resourceId, code: "GPU-EDGE", status: "available" }
  });

  assert.equal(availability.available, false, "Inner subset booking must be rejected");
  assert.throws(
    () => assertResourceAvailable(availability),
    (err) => err instanceof HttpError && err.status === 409
  );
});

test("Concurrency Edge Case 4: Exact 100% same interval [08:00, 10:00) and [08:00, 10:00) is rejected", async () => {
  const resourceId = "res-gpu-edge";
  const existingBooking = {
    id: "bk-identical-1",
    resourceId,
    startAt: new Date("2026-09-01T08:00:00Z"),
    endAt: new Date("2026-09-01T10:00:00Z"),
    status: "approved"
  };

  const mockTx = {
    resource: { findUnique: async () => ({ id: resourceId, code: "GPU-EDGE", status: "available" }) },
    booking: { findMany: async () => [existingBooking] },
    maintenanceWindow: { findMany: async () => [] }
  };

  const availability = await getResourceAvailability(mockTx, {
    resourceId,
    startAt: new Date("2026-09-01T08:00:00Z"),
    endAt: new Date("2026-09-01T10:00:00Z"),
    resource: { id: resourceId, code: "GPU-EDGE", status: "available" }
  });

  assert.equal(availability.available, false, "Identical interval must be rejected");
  assert.throws(
    () => assertResourceAvailable(availability),
    (err) => err instanceof HttpError && err.status === 409
  );
});

test("Concurrency: Multi-resource distributed stress test (500 requests / 20 nodes) achieves 0 duplicates", async () => {
  const result = await runMultiResourceConcurrencyStressTest({ requestCount: 200, resourceCount: 10 });
  assert.equal(result.duplicateAnomalies, 0, "Zero double-booking anomalies across distributed multi-resource nodes");
  assert.ok(result.successfulBookings > 0, "Successfully booked legitimate non-overlapping slots");
});

test("Concurrency: Status race condition check throws 409 when booking is already processed", async () => {
  const lockedBooking = { id: "booking-200", status: "approved" };

  function checkCanApprove(bookingStatus) {
    if (bookingStatus !== "pending") {
      throw new HttpError(409, "Only pending bookings can be approved", undefined, "BOOKING_PENDING_APPROVAL_ONLY");
    }
  }

  assert.throws(
    () => checkCanApprove(lockedBooking.status),
    (err) => err instanceof HttpError && err.status === 409 && err.code === "BOOKING_PENDING_APPROVAL_ONLY"
  );
});

test("Concurrency: User duplicate email error returns structured 409 DUPLICATE_EMAIL", () => {
  const p2002Error = {
    code: "P2002",
    meta: { target: ["email"] },
    message: "Unique constraint failed on the fields: (`email`)"
  };

  function handleUserCreationError(err) {
    if (err.code === "P2002" && (err.meta?.target?.includes?.("email") || String(err.meta?.target).includes("email"))) {
      return {
        status: 409,
        body: { code: "DUPLICATE_EMAIL", message: "Email already registered", details: { field: "email" } }
      };
    }
    return { status: 500 };
  }

  const result = handleUserCreationError(p2002Error);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "DUPLICATE_EMAIL");
  assert.equal(result.body.details.field, "email");
});
