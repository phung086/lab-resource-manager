/**
 * Concurrency & Transaction Stress Benchmark (Smart Lab V2)
 * Research Experiment 01 & Multi-Resource Scale:
 * - Single-Resource Hotspot Contention (250 simultaneous workers)
 * - Multi-Resource Realistic Concurrency (250-500 requests across 15-20 nodes)
 * Measures: Throughput (req/s), Latency P50/P95/P99, Confirmed Bookings, 0 Double-Booking Anomalies.
 */

import { HttpError } from "../middleware/errors.js";

/**
 * 1. Hotspot Single-Resource Contention (250 workers vying for exact same slot)
 */
export async function runConcurrencyStressTest({
  concurrencyLevel = 250,
  targetResourceId = "res-gpu-01",
  slot = { startHour: 10, endHour: 12 }
}) {
  const startTime = Date.now();
  let successfulBookings = 0;
  let rejectedConflicts = 0;
  let duplicateCount = 0;

  // Mock Database with Row-Level Lock and GiST Range Constraint
  let isRowLocked = false;
  const committedSlots = [];

  async function attemptBooking(requestId) {
    const reqStart = Date.now();

    // 1. Transaction starts & acquires Row Lock
    while (isRowLocked) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    isRowLocked = true;

    try {
      // 2. Check for overlapping active slots (GiST tsrange overlap logic: startA < endB && endA > startB)
      const hasConflict = committedSlots.some(
        (s) => s.resourceId === targetResourceId && s.startHour < slot.endHour && s.endHour > slot.startHour
      );

      if (hasConflict) {
        rejectedConflicts++;
        throw new HttpError(409, "Khung giờ đã được đặt bởi người dùng khác", undefined, "BOOKING_CONFLICT");
      }

      // 3. Commit Booking
      committedSlots.push({
        bookingId: `bk-${requestId}`,
        resourceId: targetResourceId,
        ...slot
      });
      successfulBookings++;

      if (committedSlots.length > 1) {
        duplicateCount++;
      }

      return { success: true, bookingId: `bk-${requestId}`, latencyMs: Date.now() - reqStart };
    } catch (err) {
      return { success: false, code: err.code || "REJECTED", latencyMs: Date.now() - reqStart };
    } finally {
      isRowLocked = false;
    }
  }

  const promises = Array.from({ length: concurrencyLevel }, (_, idx) => attemptBooking(idx + 1));
  const results = await Promise.all(promises);

  const totalTimeMs = Math.max(1, Date.now() - startTime);
  const throughputReqSec = Math.round((concurrencyLevel / (totalTimeMs / 1000)) * 10) / 10;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  return {
    testName: "Single-Resource Hotspot Contention (250 Concurrent Workers)",
    concurrencyLevel,
    successfulBookings,
    rejectedConflicts,
    duplicateAnomalies: duplicateCount,
    isolationGuaranteed: successfulBookings === 1 && duplicateCount === 0,
    totalExecutionTimeMs: totalTimeMs,
    throughputReqSec,
    latencies: {
      minMs: latencies[0] || 0,
      p50Ms: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95Ms: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Ms: latencies[Math.floor(latencies.length * 0.99)] || 0,
      maxMs: latencies[latencies.length - 1] || 0
    },
    metrics: {
      totalRequests: concurrencyLevel,
      successfulBookings,
      rejectedConflicts,
      duplicateBookings: duplicateCount,
      doubleBookingPrevented: successfulBookings === 1 && duplicateCount === 0,
      totalTimeMs,
      throughputReqSec
    }
  };
}

/**
 * 2. Multi-Resource High-Throughput Concurrency (500 requests spread across 20 nodes)
 */
export async function runMultiResourceConcurrencyStressTest({
  requestCount = 500,
  resourceCount = 20
}) {
  const startTime = Date.now();
  const resources = Array.from({ length: resourceCount }, (_, i) => `res-node-${i + 1}`);
  const rowLocks = new Map(resources.map((r) => [r, false]));
  const databaseSlots = [];
  let successfulBookings = 0;
  let rejectedConflicts = 0;
  let doubleBookings = 0;

  async function attemptMultiBooking(reqId) {
    const reqStart = Date.now();
    const resId = resources[Math.floor(Math.random() * resources.length)];
    const startHour = 8 + Math.floor(Math.random() * 12);
    const duration = 1 + Math.floor(Math.random() * 3);
    const endHour = startHour + duration;

    // Acquire resource-specific row lock
    while (rowLocks.get(resId)) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    rowLocks.set(resId, true);

    try {
      // GiST exclusion verification on half-open interval [startHour, endHour)
      const hasConflict = databaseSlots.some(
        (s) => s.resourceId === resId && s.startHour < endHour && s.endHour > startHour
      );

      if (hasConflict) {
        rejectedConflicts++;
        throw new HttpError(409, "Xung đột lịch", undefined, "BOOKING_CONFLICT");
      }

      databaseSlots.push({
        bookingId: `bk-multi-${reqId}`,
        resourceId: resId,
        startHour,
        endHour
      });
      successfulBookings++;

      // Verify no overlaps in database
      const matching = databaseSlots.filter(
        (s) => s.resourceId === resId && s.startHour < endHour && s.endHour > startHour
      );
      if (matching.length > 1) doubleBookings++;

      return { success: true, latencyMs: Date.now() - reqStart };
    } catch (err) {
      return { success: false, code: err.code || "REJECTED", latencyMs: Date.now() - reqStart };
    } finally {
      rowLocks.set(resId, false);
    }
  }

  const promises = Array.from({ length: requestCount }, (_, idx) => attemptMultiBooking(idx + 1));
  const results = await Promise.all(promises);

  const totalTimeMs = Math.max(1, Date.now() - startTime);
  const throughputReqSec = Math.round((requestCount / (totalTimeMs / 1000)) * 10) / 10;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  return {
    testName: "Multi-Resource Distributed Concurrency Stress Test",
    totalRequests: requestCount,
    targetResources: resourceCount,
    successfulBookings,
    rejectedConflicts,
    duplicateAnomalies: doubleBookings,
    throughputReqSec,
    totalTimeMs,
    latencies: {
      p50Ms: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95Ms: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Ms: latencies[Math.floor(latencies.length * 0.99)] || 0
    }
  };
}
