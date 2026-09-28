import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

export function configurePhaseFTestEnvironment() {
  const rawUrl = process.env.PHASE_F_DATABASE_URL;
  assert.ok(rawUrl, "PHASE_F_DATABASE_URL is required");
  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");
  assert.match(database, /(?:_test|_ci)(?:$|_)/, "Phase F database must contain _test or _ci");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = "phase-f-system-audit-test-secret-at-least-32-characters";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.REMINDER_SCHEDULER_ENABLED = "false";
  process.env.PAYMENTS_ENABLED = "true";
  return { database, url: url.toString() };
}

export function phaseFClient(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}
