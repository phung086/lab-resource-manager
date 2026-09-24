import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaRoot = path.join(backendRoot, "prisma");
const schemaPath = path.join(prismaRoot, "schema.prisma");
const baselineRoot = path.join(prismaRoot, "baseline", "20260924000100_clean_baseline");
const baselineSqlPath = path.join(baselineRoot, "migration.sql");
const manifest = JSON.parse(fs.readFileSync(path.join(baselineRoot, "manifest.json"), "utf8"));
const prismaCli = path.join(backendRoot, "node_modules", "prisma", "build", "index.js");
const prisma = new PrismaClient();

function fail(message) {
  throw new Error(`Canonical migration deployment stopped: ${message}`);
}

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args, "--schema", schemaPath], {
    cwd: backendRoot,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) fail(`Prisma command failed: prisma ${args.join(" ")}`);
}

function verifyBaselineFiles() {
  const normalizedSchema = fs.readFileSync(schemaPath, "utf8").replace(/\r\n/g, "\n");
  const schemaSha256 = crypto.createHash("sha256").update(normalizedSchema).digest("hex");
  if (schemaSha256 !== manifest.schemaSha256) {
    fail("schema.prisma changed without regenerating and reviewing the clean-install baseline");
  }

  const migrationNames = fs.readdirSync(path.join(prismaRoot, "migrations"), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  for (const migrationName of manifest.includedMigrations) {
    if (!migrationNames.includes(migrationName)) {
      fail(`baseline manifest references missing migration ${migrationName}`);
    }
  }
}

async function inspectDatabase() {
  const [schema] = await prisma.$queryRawUnsafe("SELECT current_schema() AS name");
  if (schema?.name !== "public") fail(`expected PostgreSQL schema public, received ${schema?.name || "unknown"}`);

  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  const tableNames = new Set(tables.map(row => row.table_name));
  let marker = null;
  if (tableNames.has("_lrm_deployment_baselines")) {
    marker = await prisma.$queryRawUnsafe(
      "SELECT baseline_id, schema_sha256 FROM public._lrm_deployment_baselines WHERE baseline_id = $1",
      manifest.baselineId
    );
    marker = marker[0] || null;
  }
  return { tableNames, marker, hasMigrationHistory: tableNames.has("_prisma_migrations") };
}

async function migrationRows() {
  const exists = await prisma.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations')::text AS name");
  if (!exists[0]?.name) return [];
  return prisma.$queryRawUnsafe(
    "SELECT migration_name, finished_at, rolled_back_at, logs FROM public._prisma_migrations ORDER BY started_at"
  );
}

async function applyOrResumeCleanBaseline(state) {
  if (state.tableNames.size === 0) {
    console.log(`Empty database detected; applying reviewed baseline ${manifest.baselineId}.`);
    runPrisma(["db", "execute", "--file", baselineSqlPath]);
  } else {
    if (!state.marker || state.marker.schema_sha256 !== manifest.schemaSha256) {
      fail("database is not empty and has no matching resumable clean-baseline marker");
    }
    for (const requiredTable of ["users", "resources", "bookings"]) {
      if (!state.tableNames.has(requiredTable)) fail(`resumable baseline is missing required table ${requiredTable}`);
    }
    console.log(`Resuming reviewed baseline ${manifest.baselineId}.`);
  }

  const rows = await migrationRows();
  const knownMigrations = new Set(
    fs.readdirSync(path.join(prismaRoot, "migrations"), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  );
  for (const row of rows) {
    if (!knownMigrations.has(row.migration_name) || !row.finished_at || row.rolled_back_at || row.logs) {
      fail(`unexpected or failed migration history while resuming baseline: ${row.migration_name}`);
    }
  }
  const applied = new Set(rows.map(row => row.migration_name));
  for (const migrationName of manifest.includedMigrations) {
    if (!applied.has(migrationName)) {
      runPrisma(["migrate", "resolve", "--applied", migrationName]);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is required");
  verifyBaselineFiles();
  const state = await inspectDatabase();
  if (state.tableNames.size === 0 || state.marker) {
    await applyOrResumeCleanBaseline(state);
  } else {
    if (!state.hasMigrationHistory) {
      fail("non-empty database has neither Prisma migration history nor a matching clean-baseline marker");
    }
    console.log("Existing database detected; preserving its migration lineage.");
  }
  runPrisma(["migrate", "deploy"]);
  runPrisma(["migrate", "status"]);
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
