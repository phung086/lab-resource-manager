import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler, HttpError, notFoundHandler } from "./middleware/errors.js";
import { metricsMiddleware, metricsRouter } from "./metrics.js";

// Core Routers
import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import resourceRouter from "./routes/resources.js";
import laboratoryRouter from "./routes/laboratories.js";
import calendarRouter from "./routes/calendar.js";
import bookingRouter from "./routes/bookings.js";
import maintenanceRouter from "./routes/maintenance.js";
import dashboardRouter from "./routes/dashboard.js";
import notificationRouter from "./routes/notifications.js";
import incidentRouter from "./routes/incidents.js";
import telemetryRouter from "./routes/telemetry.js";
import paymentRouter from "./routes/payments.js";
import assistantRouter from "./routes/assistant.js";
import { handleMcp } from "./assistant/mcpServer.js";
import { requireAuth } from "./middleware/auth.js";

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!config.isProduction || !origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new HttpError(403, "Origin is not allowed by CORS", undefined, "FORBIDDEN"));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(morgan(config.logFormat));
  app.use(rateLimit({ windowMs: config.rateLimitWindowMs, limit: config.rateLimitMax }));
  app.use(metricsMiddleware);

  // Health check endpoints
  const healthHandler = (_req, res) => {
    res.json({
      ok: true,
      service: "lab-resource-manager-api",
      version: "2026.1",
      architecture: "Canonical Persistence Lab Resource Manager"
    });
  };

  const readinessHandler = async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        ok: true,
        database: "ready",
        service: "lab-resource-manager-api"
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        database: "unavailable",
        error: "DATABASE_UNAVAILABLE"
      });
    }
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/health/ready", readinessHandler);
  app.get("/api/health/ready", readinessHandler);

  // Prometheus Metrics
  app.use("/metrics", metricsRouter);

  // 1. Auth & Identity
  app.use("/api/auth", authRouter);

  // 2. Users & Profiles
  app.use("/api/users", userRouter);

  // 3. Resources & Catalog
  app.use("/api/resources", resourceRouter);
  app.use("/api/laboratories", laboratoryRouter);

  // 4. Calendar & Time Slots
  app.use("/api/calendar", calendarRouter);

  // 5. Bookings & Lifecycle Workflow
  app.use("/api/bookings", bookingRouter);

  // 6. Maintenance Windows & Calibration
  app.use("/api/maintenance", maintenanceRouter);

  // Optional integrations are independent of the retired research routes.
  if (config.paymentsEnabled) app.use("/api/payments", paymentRouter);
  if (config.mcpAssistantEnabled) {
    app.use("/api/assistant", assistantRouter);
    app.post("/mcp", requireAuth, handleMcp);
    app.all("/mcp", requireAuth, (_req, res) => res.sendStatus(405));
  }

  // 7. Dashboard & Notifications
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/incidents", incidentRouter);
  app.use("/api/telemetry", telemetryRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
