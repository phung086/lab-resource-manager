import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../../", import.meta.url));

export function assertBatch6Database(database) {
  assert.match(database, /^lab_resources_b6_monitoring_[a-z0-9_]+$/, "Database must use the Batch 6 monitoring marker");
  assert.notEqual(database, "lab_resources", "The development database is prohibited");
  return database;
}

export async function configureBatch6TestEnvironment(database) {
  assertBatch6Database(database);
  const env = parse(await readFile(path.join(backend, ".env")));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  url.pathname = `/${database}`;
  url.searchParams.set("schema", "public");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = "batch6-notification-incident-monitoring-secret";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.TELEMETRY_API_KEY = "batch6-telemetry-api-key-at-least-32-chars";
  process.env.REMINDER_SCHEDULER_ENABLED = "false";
  return url.toString();
}

export function isolatedBatch6Client(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}
