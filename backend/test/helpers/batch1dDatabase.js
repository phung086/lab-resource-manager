import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../../", import.meta.url));
const sourceDatabase = "lab_resources";

export function assertBatch1DDatabase(database) {
  assert.match(database, /^lab_resources_b1d_[a-z0-9_]+$/,
    "Database must have an explicit lab_resources_b1d_ marker");
  assert.notEqual(database, sourceDatabase, "Source development database is prohibited");
  return database;
}

export function databaseArgument() {
  const argument = process.argv.find((value) => value.startsWith("--database="));
  assert.ok(argument, "Required --database=lab_resources_b1d_... argument is missing");
  return assertBatch1DDatabase(argument.slice("--database=".length));
}

export async function databaseUrl(database, { readOnly = false } = {}) {
  assertBatch1DDatabase(database);
  const env = parse(await readFile(path.join(backend, ".env")));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only localhost is allowed");
  url.pathname = `/${database}`;
  url.searchParams.set("schema", "public");
  if (readOnly) url.searchParams.set("options", "-c default_transaction_read_only=on");
  return url.toString();
}

export async function batch1DClient(database, options) {
  const url = await databaseUrl(database, options);
  return new PrismaClient({ datasources: { db: { url } } });
}

export async function assertTargetIdentity(client, database, { readOnly } = {}) {
  const [identity] = await client.$queryRawUnsafe(`
    SELECT current_database() AS database,
      current_setting('server_version') AS version,
      current_setting('transaction_read_only') AS read_only
  `);
  assert.equal(identity.database, assertBatch1DDatabase(database));
  assert.ok(identity.version.startsWith("16."), `PostgreSQL 16 required; found ${identity.version}`);
  if (readOnly !== undefined) assert.equal(identity.read_only, readOnly ? "on" : "off");
  return identity;
}

export function jsonValue(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === "bigint" ? Number(item) : item));
}
