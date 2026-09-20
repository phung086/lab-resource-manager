import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../../", import.meta.url));

export function assertBatch4Database(database) {
  assert.match(database, /^lab_resources_b4_booking_[a-z0-9_]+$/, "Database must use the Batch 4 booking marker");
  assert.notEqual(database, "lab_resources", "The development database is prohibited");
  return database;
}

export async function configureBatch4TestEnvironment(database) {
  assertBatch4Database(database);
  const env = parse(await readFile(path.join(backend, ".env")));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  url.pathname = `/${database}`;
  url.searchParams.set("schema", "public");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = "batch4-booking-calendar-integration-secret-at-least-32";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  return url.toString();
}

export function isolatedBatch4Client(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}
