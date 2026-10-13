import rateLimit from "express-rate-limit";
import { HttpError } from "./errors.js";

export function createMonitoringBudget(keyGenerator, limit) {
  return rateLimit({ windowMs: 60_000, limit, keyGenerator, standardHeaders: "draft-7", legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, "Monitoring request limit exceeded", undefined, "RATE_LIMITED")) });
}
// Only attach after authentication. The same verified principal shares a budget
// across telemetry reads / simulator controls or agent heartbeats / samples.
export const monitoringOperatorBudget = createMonitoringBudget(req => req.user.id, 180);
export const monitoringSourceBudget = createMonitoringBudget(req => req.telemetrySource.id, 60);
