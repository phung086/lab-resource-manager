import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

import {
  DATABASE_CLASSIFICATION,
  catalogFingerprint,
  classifyDatabase,
  listMigrationNames,
  readPublicCatalog,
  verifyFrozenBaselineArtifacts
} from "./migrationDeploymentContract.mjs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultPrismaRoot = path.join(backendRoot, "prisma");
const testRootOverride = process.env.LRM_MIGRATION_TEST_ROOT;
if (testRootOverride && process.env.LRM_MIGRATION_TEST_MODE !== "1") {
  throw new Error("Canonical migration deployment stopped: fixture root override is restricted to explicit migration tests");
}
const prismaRoot = testRootOverride ? path.resolve(testRootOverride) : defaultPrismaRoot;
const schemaPath = path.join(prismaRoot, "schema.prisma");
const migrationsRoot = path.join(prismaRoot, "migrations");
const baselineRoot = path.join(prismaRoot, "baseline", "20260924000100_clean_baseline");
const baselineSqlPath = path.join(baselineRoot, "migration.sql");
const manifest = JSON.parse(fs.readFileSync(path.join(baselineRoot, "manifest.json"), "utf8"));
const prismaCli = path.join(backendRoot, "node_modules", "prisma", "build", "index.js");
const prisma = new PrismaClient();
const includedMigrationNames = manifest.includedMigrations.map(entry => entry.name);

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

async function assertTestOverrideTargetsIsolatedDatabase() {
  if (!testRootOverride) return;
  const [row] = await prisma.$queryRawUnsafe("SELECT current_database() AS name");
  if (!/(?:^|_)(?:test|ci)(?:_|$)/i.test(row?.name || "")) {
    fail("fixture root override requires a database name containing an explicit test or ci marker");
  }
}

async function migrationState() {
  const [relation] = await prisma.$queryRawUnsafe(`
    SELECT c.relkind::text AS relkind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = '_prisma_migrations'
  `);
  if (!relation) return { present: false, rows: [] };
  if (!["r", "p"].includes(relation.relkind)) fail("_prisma_migrations exists but is not a table");
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, logs
    FROM public._prisma_migrations
    ORDER BY started_at, migration_name
  `);
  return { present: true, rows };
}

async function markerState() {
  const [relation] = await prisma.$queryRawUnsafe(`
    SELECT c.relkind::text AS relkind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = '_lrm_deployment_baselines'
  `);
  if (!relation) return { present: false, marker: null };
  if (!["r", "p"].includes(relation.relkind)) fail("baseline marker exists but is not a table");
  const rows = await prisma.$queryRawUnsafe(
    "SELECT baseline_id, schema_sha256 FROM public._lrm_deployment_baselines WHERE baseline_id = $1",
    manifest.baselineId
  );
  if (rows.length > 1) fail("baseline marker contains duplicate baseline identities");
  const marker = rows[0] || null;
  if (marker && marker.schema_sha256 !== manifest.baselineSchemaSha256) {
    fail("baseline marker does not match the frozen baseline schema artifact");
  }
  return { present: true, marker };
}

async function inspectDatabase() {
  const [schema] = await prisma.$queryRawUnsafe("SELECT current_schema() AS name");
  if (schema?.name !== "public") fail(`expected PostgreSQL schema public, received ${schema?.name || "unknown"}`);
  const [catalogRows, migrations, marker] = await Promise.all([
    readPublicCatalog(prisma),
    migrationState(),
    markerState()
  ]);
  const repositoryMigrations = listMigrationNames(migrationsRoot);
  const result = classifyDatabase({
    catalogRows,
    markerTablePresent: marker.present,
    marker: marker.marker,
    migrationTablePresent: migrations.present,
    migrationRows: migrations.rows,
    repositoryMigrations,
    includedMigrationNames
  });
  return { ...result, catalogRows, migrations, marker, repositoryMigrations };
}

function verifyBaselineCatalog(state) {
  const actual = catalogFingerprint(state.catalogRows);
  if (actual !== manifest.catalogFingerprintSha256) {
    fail(`clean baseline catalog fingerprint mismatch (expected ${manifest.catalogFingerprintSha256}, received ${actual})`);
  }
}

async function applyOrResumeCleanBaseline(initialState) {
  let state = initialState;
  if (state.classification === DATABASE_CLASSIFICATION.EMPTY) {
    console.log(`Empty database detected; applying frozen baseline ${manifest.baselineId}.`);
    runPrisma(["db", "execute", "--file", baselineSqlPath]);
    state = await inspectDatabase();
    if (state.classification !== DATABASE_CLASSIFICATION.CLEAN_BASELINE) {
      fail(`baseline SQL did not produce a resumable clean baseline; classified ${state.classification}`);
    }
  } else {
    console.log(`Resuming structurally verified baseline ${manifest.baselineId}.`);
  }

  verifyBaselineCatalog(state);
  const applied = new Set(state.appliedNames);
  for (const migrationName of includedMigrationNames) {
    if (!applied.has(migrationName)) runPrisma(["migrate", "resolve", "--applied", migrationName]);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is required");
  await assertTestOverrideTargetsIsolatedDatabase();
  try {
    verifyFrozenBaselineArtifacts({ baselineRoot, migrationsRoot, manifest });
  } catch (error) {
    fail(error.message);
  }

  const state = await inspectDatabase();
  console.log(`Database classification: ${state.classification}.`);
  switch (state.classification) {
    case DATABASE_CLASSIFICATION.EMPTY:
    case DATABASE_CLASSIFICATION.CLEAN_BASELINE:
      await applyOrResumeCleanBaseline(state);
      break;
    case DATABASE_CLASSIFICATION.RECOGNIZED_PRISMA_LINEAGE:
      console.log("Recognized canonical Prisma lineage; preserving all historical migration rows.");
      break;
    case DATABASE_CLASSIFICATION.UNKNOWN_NONEMPTY:
    case DATABASE_CLASSIFICATION.INVALID_OR_PARTIAL:
      fail(`${state.classification}: ${state.reason || "database is not a recognized canonical lineage"}`);
      break;
    default:
      fail(`unsupported database classification ${state.classification}`);
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
