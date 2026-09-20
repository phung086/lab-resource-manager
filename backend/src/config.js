import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || process.env.LRM_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL || "";
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS || process.env.LRM_CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173");
const port = parsePort(process.env.PORT || 8000);
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "1mb";
const rateLimitWindowMs = parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const rateLimitMax = parsePositiveInteger(process.env.RATE_LIMIT_MAX, 180);
const logFormat = parseLogFormat(process.env.LOG_FORMAT || (isProduction ? "combined" : "dev"));

validateRuntimeConfig();

export const config = {
  isProduction,
  port,
  databaseUrl,
  jwtSecret: jwtSecret || "change-this-secret-before-production",
  corsOrigins,
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || "8h",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "",
  trustProxy: process.env.TRUST_PROXY === "true",
  logFormat,
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
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "");
    const adminFullName = String(process.env.ADMIN_FULL_NAME || "").trim();

    if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
      failures.push("DATABASE_URL must point to PostgreSQL.");
    }
    if (!jwtSecret || jwtSecret.length < 32 || isPlaceholder(jwtSecret)) {
      failures.push("JWT_SECRET must be at least 32 characters and not use an example value.");
    }
    if (corsOrigins.some((origin) => origin === "*" || !/^https?:\/\//i.test(origin))) {
      failures.push("CORS_ORIGINS must list explicit HTTP or HTTPS origins.");
    }
    if (!adminEmail || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      failures.push("ADMIN_EMAIL must be a valid email address.");
    }
    if (adminFullName.length < 2) {
      failures.push("ADMIN_FULL_NAME is required.");
    }
    if (adminPassword.length < 12 || isPlaceholder(adminPassword)) {
      failures.push("ADMIN_PASSWORD must be at least 12 characters and not use an example value.");
    }

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

function parseLogFormat(value) {
  const normalized = String(value || "").trim();
  const allowed = new Set(["combined", "common", "dev", "short", "tiny"]);
  if (!allowed.has(normalized)) {
    throw new Error("LOG_FORMAT must be one of: combined, common, dev, short, tiny.");
  }
  return normalized;
}

function isPlaceholder(value) {
  return /change-this|replace-with|example/i.test(value);
}
