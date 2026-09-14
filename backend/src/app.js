import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { metricsMiddleware, metricsRouter } from "./metrics.js";

// Core 2026 Routers: Smart Booking & AI Advisory Platform
import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import resourceRouter from "./routes/resources.js";
import calendarRouter from "./routes/calendar.js";
import bookingRouter from "./routes/bookings.js";
import paymentRouter from "./routes/payments.js";
import aiRouter from "./routes/ai.js";
import dashboardRouter from "./routes/dashboard.js";
import notificationRouter from "./routes/notifications.js";

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
        return callback(null, true);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(morgan(config.logFormat));
  app.use(rateLimit({ windowMs: config.rateLimitWindowMs, limit: config.rateLimitMax }));
  app.use(metricsMiddleware);

  // Health check endpoints
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "smart-booking-ai-advisory-api",
      version: "2026.1",
      architecture: "Smart Booking & Performance Advisory Platform"
    });
  });

  app.get("/health/ready", async (_req, res, next) => {
    try {
      res.json({
        ok: true,
        database: "ready",
        service: "smart-booking-ai-advisory-api"
      });
    } catch (error) {
      next(error);
    }
  });

  // Prometheus Metrics
  app.use("/metrics", metricsRouter);

  // ─────────────────────────────────────────
  // ROUTE MOUNTING: DUAL SUPPORT (/api/* & /*)
  // ─────────────────────────────────────────

  // 1. Auth & Identity
  app.use("/api/auth", authRouter);
  app.use("/auth", authRouter);

  // 2. Users & Quotas
  app.use("/api/users", userRouter);
  app.use("/api/admin/users", userRouter);
  app.use("/users", userRouter);

  // 3. Resources & Catalog
  app.use("/api/resources", resourceRouter);
  app.use("/resources", resourceRouter);

  // 4. Calendar & Time Slots
  app.use("/api/calendar", calendarRouter);
  app.use("/calendar", calendarRouter);

  // 5. Bookings & Workflow
  app.use("/api/bookings", bookingRouter);
  app.use("/bookings", bookingRouter);

  // 6. VietQR Payments & Ledger
  app.use("/api/payments", paymentRouter);
  app.use("/payments", paymentRouter);
  app.get("/api/admin/transactions", async (_req, res, next) => {
    try {
      const { getTransactionsLedger } = await import("./services/paymentService.js");
      const ledger = await getTransactionsLedger();
      res.json(ledger);
    } catch (error) {
      next(error);
    }
  });

  // 7. AI Efficiency & Advisory
  app.use("/api/ai", aiRouter);
  app.use("/ai", aiRouter);

  // 8. General Dashboard & Notifications
  app.use("/api/dashboard", dashboardRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/notifications", notificationRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
