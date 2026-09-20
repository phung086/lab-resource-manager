import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../../", import.meta.url));

export function assertBatch2Database(database) {
  assert.match(database, /^lab_resources_b2_auth_[a-z0-9_]+$/, "Database must use the Batch 2 auth marker");
  assert.notEqual(database, "lab_resources", "The development database is prohibited");
  return database;
}

export async function configureBatch2TestEnvironment(database) {
  assertBatch2Database(database);
  const env = parse(await readFile(path.join(backend, ".env")));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  url.pathname = `/${database}`;
  url.searchParams.set("schema", "public");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = "batch2-auth-integration-secret-at-least-32-characters";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  return url.toString();
}

export function isolatedBatch2Client(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}
