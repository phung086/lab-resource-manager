import { localeMiddleware, localizeError } from "./locales/index.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler, HttpError, notFoundHandler } from "./middleware/errors.js";
import { metricsMiddleware, metricsRouter } from "./metrics.js";
import { metricsAccess } from "./middleware/metricsAccess.js";

// Core Routers
import authRouter from "./routes/auth.js";
import addressRouter from "./routes/address.js";
import guestBookingRouter from "./routes/guestBooking.js";
import resourceMediaRouter from "./routes/resourceMedia.js";
import userRouter from "./routes/users.js";
import loyaltyRouter from "./routes/loyalty.js";
import auditEventsRouter from "./routes/auditEvents.js";
import resourceRouter from "./routes/resources.js";
import laboratoryRouter from "./routes/laboratories.js";
import planningRouter from './routes/planning.js';
import calendarRouter from "./routes/calendar.js";
import bookingRouter from "./routes/bookings.js";
import bookingPricingRouter from "./routes/bookingPricing.js";
import maintenanceRouter from "./routes/maintenance.js";
import labWorkspaceRouter from "./routes/labWorkspace.js";
import dashboardRouter from "./routes/dashboard.js";
import notificationRouter from "./routes/notifications.js";
import incidentRouter from "./routes/incidents.js";
import telemetryRouter from "./routes/telemetry.js";
import resourceCareRouter from "./routes/resourceCare.js";
import paymentRouter from "./routes/payments.js";
import assistantRouter from "./routes/assistant.js";
import supportRouter from "./routes/support.js";
import { handleMcp, mcpRateLimit } from "./assistant/mcpServer.js";
import { requireAuth } from "./middleware/auth.js";
import { bridgeOAuth, bridgeMcp, bridgeSettings } from './chatgptBridge/runtime.js';
import { createBridgeOAuthRouters } from './chatgptBridge/routes.js';
import bridgeRequestRouter from './routes/chatgptBridgeRequests.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(localeMiddleware);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!config.isProduction || !origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new HttpError(403, "Origin is not allowed by CORS", undefined, "FORBIDDEN"));
      },
      credentials: true,
      exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy"]
    })
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(morgan(config.logFormat, {
    // VNPAY signs its GET callback query. Access logging that URL would persist
    // the one-time secure hash and provider evidence.
    skip: (req) => /^\/api\/payments\/vnpay\/(?:ipn|return)(?:\?|$)/.test(req.originalUrl || req.url) ||
      /^\/(?:oauth\/chatgpt|api\/chatgpt-bridge)(?:\/|\?|$)/.test(req.originalUrl || req.url)
  }));
  const ingressLimit = limit => rateLimit({
    windowMs: config.rateLimitWindowMs, limit, standardHeaders: "draft-7", legacyHeaders: false,
    handler: (req, res) => {
      const retryAfterSeconds = Math.max(1, Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + config.rateLimitWindowMs) - Date.now()) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: localizeError(req.locale, "RATE_LIMITED"), details: { retryAfterSeconds } } });
    }
  });
  // MCP initialization and tool reads share the loopback IP, but must not spend
  // the ordinary API budget. Both ingress paths remain bounded before auth.
  const apiIngress = ingressLimit(config.rateLimitMax);
  const mcpIngress = ingressLimit(config.rateLimitMax * 10);
  // Support polling by multiple signed-in people behind one campus IP must not
  // exhaust the business API bucket. Its router also limits authenticated users.
  const supportIngress = ingressLimit(config.rateLimitMax * 10);
  const monitoringIngress = ingressLimit(config.rateLimitMax * 10);
  app.use((req, res, next) => {
    const path = req.path.toLowerCase().replace(/\/$/, "");
    const limiter = path === "/mcp" || path === '/mcp/support-bridge' ? mcpIngress : /^\/api\/(?:support|assistant\/bridge)(?:\/|$)/.test(path) ? supportIngress
      : /^\/api\/(?:telemetry|resource-care)(?:\/|$)/.test(path) ? monitoringIngress : apiIngress;
    return limiter(req, res, next);
  });
  app.use(metricsMiddleware);
  const bridgeRouters = createBridgeOAuthRouters({ oauth: bridgeOAuth, requireAuth });
  app.use(bridgeRouters.publicRouter);
  app.use('/api/chatgpt-bridge', bridgeRouters.adminRouter);
  if (bridgeSettings.enabled) {
    app.use('/api/assistant/bridge', bridgeRequestRouter);
    app.post('/mcp/support-bridge', bridgeMcp);
    app.all('/mcp/support-bridge', (_req, res) => res.sendStatus(405));
  }

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
  app.use("/metrics", metricsAccess(), metricsRouter);

  // 1. Auth & Identity
  app.use("/api/auth", authRouter);
  app.use("/api/address", addressRouter);
  app.use("/api/guest-booking", guestBookingRouter);

  // 2. Users & Profiles
  app.use("/api/users", userRouter);
  app.use("/api/loyalty", loyaltyRouter);
  app.use("/api/audit-events", auditEventsRouter);

  // 3. Resources & Catalog
  app.use("/api/resources", resourceMediaRouter);
  app.use("/api/resources", resourceRouter);
  app.use("/api/laboratories", laboratoryRouter);
  app.use('/api/planning', planningRouter);

  // 4. Calendar & Time Slots
  app.use("/api/calendar", calendarRouter);

  // 5. Bookings & Lifecycle Workflow
  app.use("/api/bookings", bookingRouter);
  app.use("/api/booking-pricing", bookingPricingRouter);

  // 6. Maintenance Windows & Calibration
  app.use("/api/maintenance", maintenanceRouter);
  app.use("/api/lab-workspace", labWorkspaceRouter);
  app.use("/api/support", supportRouter);

  // Optional integrations are independent of the retired research routes.
  if (config.paymentsEnabled) app.use("/api/payments", paymentRouter);
  if (config.mcpAssistantEnabled || bridgeSettings.enabled) {
    app.use("/api/assistant", assistantRouter);
    app.post("/mcp", requireAuth, mcpRateLimit, handleMcp);
    app.all("/mcp", requireAuth, (_req, res) => res.sendStatus(405));
  }

  // 7. Dashboard & Notifications
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/incidents", incidentRouter);
  app.use("/api/telemetry", telemetryRouter);
  app.use("/api/resource-care", resourceCareRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
