import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || process.env.LRM_SECRET_KEY;
const telemetryApiKey = process.env.TELEMETRY_API_KEY || "";
const databaseUrl = process.env.DATABASE_URL || "";
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS || process.env.LRM_CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173");
const port = parsePort(process.env.PORT || 8000);
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "1mb";
const rateLimitWindowMs = parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const rateLimitMax = parsePositiveInteger(process.env.RATE_LIMIT_MAX, 180);

validateRuntimeConfig();

export const config = {
  isProduction,
  port,
  databaseUrl,
  jwtSecret: jwtSecret || "change-this-secret-before-production",
  corsOrigins,
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || "8h",
  telemetryApiKey,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "",
  trustProxy: process.env.TRUST_PROXY === "true",
  logFormat: process.env.LOG_FORMAT || (isProduction ? "combined" : "dev"),
  jsonBodyLimit,
  rateLimitWindowMs,
  rateLimitMax
};

function validateRuntimeConfig() {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  if (!corsOrigins.length) {
    throw new Error("CORS_ORIGINS must contain at least one origin.");
  }

  if (isProduction) {
    const failures = [];
    if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) failures.push("DATABASE_URL must point to PostgreSQL.");
    if (!jwtSecret || jwtSecret.length < 32 || isPlaceholder(jwtSecret)) failures.push("JWT_SECRET must be at least 32 characters and not use the example value.");
    if (!telemetryApiKey || telemetryApiKey.length < 32 || isPlaceholder(telemetryApiKey)) failures.push("TELEMETRY_API_KEY must be at least 32 characters and not use the example value.");
    if (corsOrigins.some((origin) => origin === "*" || !/^https?:\/\//i.test(origin))) failures.push("CORS_ORIGINS must list explicit HTTP or HTTPS origins.");
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_FULL_NAME) failures.push("ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_FULL_NAME are required for first admin setup.");

    if (failures.length) {
      throw new Error(`Production configuration is invalid: ${failures.join(" ")}`);
    }
  }
}

function parseCorsOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePort(value) {
  const portValue = Number(value);
  return Number.isInteger(portValue) ? portValue : NaN;
}

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function isPlaceholder(value) {
  return /change-this|replace-with|example/i.test(value);
}
