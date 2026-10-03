import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "./errors.js";

export function metricsAccess(settings = config) {
  return (req, res, next) => {
    const secret = settings.metricsToken || "";
    if (!settings.isProduction && !secret) return next();
    if (!secret) return next(new HttpError(503, "Metrics credential is not configured", undefined, "METRICS_UNAVAILABLE"));
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") || "");
    const expected = Buffer.from(secret), supplied = Buffer.from(match?.[1] || "");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      res.set("WWW-Authenticate", "Bearer");
      return next(new HttpError(401, "Metrics credential is required", undefined, "AUTH_REQUIRED"));
    }
    return next();
  };
}
