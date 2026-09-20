/**
 * Centralized error handling middleware.
 *
 * Maps PostgreSQL SQLSTATE 23P01 (exclusion violation) to BOOKING_CONFLICT.
 * Never exposes raw SQL or DB internals to clients.
 */

export class HttpError extends Error {
  constructor(status, message, details = undefined, code = undefined) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

/**
 * Extracts the PostgreSQL SQLSTATE from a Prisma error chain.
 * Prisma wraps the original DB error; the SQLSTATE may appear in meta or message.
 */
function extractSqlState(error) {
  // Prisma P2010 wraps raw query errors and includes the code in meta
  if (error.meta?.code) return error.meta.code;
  // Some Prisma versions include it in the error message
  const match = String(error.message || "").match(/SQLSTATE\[?(\w{5})\]?/i);
  if (match) return match[1];
  // Check for the database_error field in meta
  const dbError = String(error.meta?.database_error || "");
  const dbMatch = dbError.match(/SQLSTATE\[?(\w{5})\]?/i);
  if (dbMatch) return dbMatch[1];
  return null;
}

/**
 * Detects PostgreSQL exclusion violation (23P01) from Prisma error.
 * This is the canonical signal from the bookings_no_active_overlap GiST constraint.
 */
function isExclusionViolation(error) {
  // Direct SQLSTATE check
  const sqlState = extractSqlState(error);
  if (sqlState === "23P01") return true;

  // Prisma sometimes surfaces exclusion violations as P2004 with constraint name
  const databaseError = String(error.meta?.database_error || error.message || "");
  if (error.code === "P2004" && databaseError.includes("bookings_no_active_overlap")) return true;

  // Prisma raw query error with exclusion violation mention
  if (error.code === "P2010" && databaseError.includes("exclusion")) return true;

  // Check for "conflicting key value violates exclusion constraint"
  if (databaseError.includes("exclusion constraint") || databaseError.includes("23P01")) return true;

  return false;
}

export function errorHandler(error, _req, res, _next) {
  // Zod validation errors
  if (error.name === "ZodError") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request data", details: error.flatten() } });
  }

  // Application-level HttpError
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
  }

  // PostgreSQL exclusion violation → BOOKING_CONFLICT
  if (isExclusionViolation(error)) {
    return res.status(409).json({
      error: {
        code: "BOOKING_CONFLICT",
        message: "Booking window conflicts with an existing reservation"
      }
    });
  }

  // Prisma unique constraint violation
  if (error.code === "P2002") {
    const target = error.meta?.target;
    const field = Array.isArray(target) ? target.join(", ") : (typeof target === "string" ? target : "unknown field");
    return res.status(409).json({
      error: {
        code: "DUPLICATE_DATA",
        message: `Duplicate value for: ${field}`,
        details: { field }
      }
    });
  }

  // Prisma record not found
  if (error.code === "P2025") {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Requested record not found"
      }
    });
  }

  if (["P1000", "P1001", "P1002", "P1008", "P1017"].includes(error.code)) {
    return res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database service is unavailable"
      }
    });
  }

  // Log internal errors but never expose raw SQL/internals to client
  console.error("Unhandled error:", error);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}
