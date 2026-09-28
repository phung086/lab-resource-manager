import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

export function configureGuestPhaseDTestEnvironment() {
  const rawUrl = process.env.GUEST_PHASE_D_DATABASE_URL;
  assert.ok(rawUrl, "GUEST_PHASE_D_DATABASE_URL is required");
  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");
  assert.match(database, /(?:_test|_ci)(?:$|_)/, "Guest Phase D database must contain _test or _ci");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = "guest-phase-d-test-secret-at-least-32-chars";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.REMINDER_SCHEDULER_ENABLED = "false";
  process.env.PAYMENTS_ENABLED = "true";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  return { database, url: url.toString() };
}

export function guestPhaseDClient(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}
