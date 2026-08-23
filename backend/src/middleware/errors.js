export class HttpError extends Error {
  constructor(status, message, details = undefined, code = undefined) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ code: "ROUTE_NOT_FOUND", message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === "ZodError") {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Invalid request data", details: error.flatten() });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ code: error.code, message: error.message, details: error.details });
  }

  if (error.code === "P2002") {
    const target = error.meta?.target;
    const field = Array.isArray(target) ? target.join(', ') : (typeof target === 'string' ? target : 'unknown field');
    return res.status(409).json({
      code: "DUPLICATE_DATA",
      message: `Duplicate value for: ${field}`,
      details: { field }
    });
  }

  const databaseError = String(error.meta?.database_error || error.message || "");
  if (error.code === "P2004" && databaseError.includes("bookings_no_active_overlap")) {
    return res.status(409).json({
      code: "BOOKING_CONFLICT",
      message: "Booking window conflicts with an existing booking"
    });
  }

  console.error(error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Internal server error" });
}
