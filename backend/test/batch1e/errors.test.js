import assert from "node:assert/strict";
import test from "node:test";

import { HttpError, errorHandler } from "../../src/middleware/errors.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test("HttpError formats custom status and code correctly", () => {
  const err = new HttpError(403, "Forbidden resource", { reason: "scope" }, "FORBIDDEN");
  const res = mockRes();
  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "FORBIDDEN");
  assert.equal(res.body.error.message, "Forbidden resource");
  assert.deepEqual(res.body.error.details, { reason: "scope" });
});

test("PostgreSQL exclusion violation 23P01 is mapped to 409 BOOKING_CONFLICT", () => {
  const exclusionErr = new Error("conflicting key value violates exclusion constraint \"bookings_no_active_overlap\"");
  exclusionErr.meta = { database_error: "SQLSTATE 23P01" };
  const res = mockRes();
  errorHandler(exclusionErr, {}, res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "BOOKING_CONFLICT");
  assert.equal(res.body.error.message, "Booking window conflicts with an existing reservation");
  // Never expose raw SQL internals in response
  assert.equal(JSON.stringify(res.body).includes("SQLSTATE"), false);
});

test("Prisma P2004 with bookings_no_active_overlap is mapped to 409 BOOKING_CONFLICT", () => {
  const p2004Err = new Error("A constraint failed on the database: bookings_no_active_overlap");
  p2004Err.code = "P2004";
  p2004Err.meta = { database_error: "bookings_no_active_overlap" };
  const res = mockRes();
  errorHandler(p2004Err, {}, res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "BOOKING_CONFLICT");
});

test("Unrelated database error is not mapped to BOOKING_CONFLICT", () => {
  const genericErr = new Error("Connection timed out to database");
  const res = mockRes();
  errorHandler(genericErr, {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, "INTERNAL_ERROR");
});
