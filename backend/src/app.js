import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { metricsMiddleware, metricsRouter } from "./metrics.js";
import authRouter from "./routes/auth.js";
import assistantRouter from "./routes/assistant.js";
import bookingRouter from "./routes/bookings.js";
import dashboardRouter from "./routes/dashboard.js";
import maintenanceRouter from "./routes/maintenance.js";
import mcpRouter from "./routes/mcp.js";
import notificationRouter from "./routes/notifications.js";
import resourceRouter from "./routes/resources.js";
import telemetryRouter from "./routes/telemetry.js";
import usageLogRouter from "./routes/usageLogs.js";
import userRouter from "./routes/users.js";
import labRouter from "./routes/labs.js";
import incidentRouter from "./routes/incidents.js";
import trainingRouter from "./routes/training.js";
import analyticsRouter from "./routes/analytics.js";
import paymentRouter from "./routes/payments.js";
import shipmentRouter from "./routes/shipments.js";
import optimizationRouter from "./routes/optimization.js";
import simulationRouter from "./routes/simulation.js";
import incidentDiagnosticRouter from "./routes/incidentDiagnostic.js";
import allocationsRouter from "./routes/allocations.js";

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!config.isProduction || !origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  }));
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(morgan(config.logFormat));
  app.use(rateLimit({ windowMs: config.rateLimitWindowMs, limit: config.rateLimitMax }));
  app.use(metricsMiddleware);

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "lab-resource-manager-api",
      environment: config.isProduction ? "production" : "development"
    });
  });

  app.get("/health/ready", async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, database: "connected", service: "lab-resource-manager-api" });
    } catch (error) {
      next(error);
    }
  });

  app.use("/metrics", metricsRouter);
  app.use("/auth", authRouter);
  app.use("/assistant", assistantRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/maintenance", maintenanceRouter);
  app.use("/resources", resourceRouter);
  app.use("/bookings", bookingRouter);
  app.use("/usage-logs", usageLogRouter);
  app.use("/notifications", notificationRouter);
  app.use("/telemetry", telemetryRouter);
  app.use("/users", userRouter);
  app.use("/mcp", mcpRouter);
  app.use("/labs", labRouter);
  app.use("/incidents", incidentRouter);
  app.use("/training", trainingRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/payments", paymentRouter);
  app.use("/shipments", shipmentRouter);
  app.use("/optimization", optimizationRouter);
  app.use("/simulation", simulationRouter);
  app.use("/diagnostic", incidentDiagnosticRouter);
  app.use("/allocations", allocationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
