import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../../", import.meta.url));

export function assertBatch1EDatabase(database) {
  assert.match(database, /^lab_resources_b1e_[a-z0-9_]+$/, "Database must use the lab_resources_b1e_ marker");
  assert.notEqual(database, "lab_resources", "The development database is prohibited");
  return database;
}

export async function isolatedDatabaseUrl(database, options = {}) {
  assertBatch1EDatabase(database);
  const env = parse(await readFile(path.join(backend, ".env")));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
  url.pathname = `/${database}`;
  url.searchParams.set("schema", "public");
  if (options.port) url.port = String(options.port);
  return url.toString();
}

export async function configureBatch1ETestEnvironment(database, options = {}) {
  const url = await isolatedDatabaseUrl(database, options);
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = "batch1e-integration-secret-at-least-32-characters";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  return url;
}

export function isolatedClient(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}

export async function assertBatch1EIdentity(client, database) {
  const [identity] = await client.$queryRawUnsafe(`
    SELECT current_database() AS database,
      current_setting('server_version') AS version,
      current_setting('transaction_isolation') AS isolation
  `);
  assert.equal(identity.database, assertBatch1EDatabase(database));
  assert.ok(identity.version.startsWith("16."), `PostgreSQL 16 required; found ${identity.version}`);
  assert.equal(identity.isolation, "read committed");
  return identity;
}

export function hasSqlState(error, state) {
  const seen = new Set();
  const visit = (value) => {
    if (value === state) return true;
    if (!value || typeof value !== "object" || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).some(visit);
  };
  return visit(error) || String(error?.message || "").includes(state) || JSON.stringify(error?.meta || {}).includes(state);
}
