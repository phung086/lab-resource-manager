import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPrismaRoot = path.join(backendRoot, "prisma");
const deployScript = path.join(backendRoot, "scripts", "deployCanonicalMigrations.mjs");
const prismaCli = path.join(backendRoot, "node_modules", "prisma", "build", "index.js");
const databaseUrl = process.env.MIGRATION_SAFETY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("MIGRATION_SAFETY_DATABASE_URL is required");
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
if (!/(?:^|_)(?:test|ci)(?:_|$)/i.test(databaseName)) {
  throw new Error("migration safety matrix refuses a database without an explicit test or ci marker");
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const results = [];

function command(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl, ...options.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return { ...result, output: `${result.stdout || ""}${result.stderr || ""}` };
}

function deploy({ fixtureRoot, expectSuccess = true } = {}) {
  const env = fixtureRoot
    ? { LRM_MIGRATION_TEST_MODE: "1", LRM_MIGRATION_TEST_ROOT: fixtureRoot }
    : {};
  const result = command(process.execPath, [deployScript], { env });
  if (expectSuccess && result.status !== 0) throw new Error(result.output);
  if (!expectSuccess && result.status === 0) throw new Error(`deployment unexpectedly succeeded:\n${result.output}`);
  return result.output;
}

function prismaCommand(args, fixtureRoot = canonicalPrismaRoot) {
  const result = command(process.execPath, [prismaCli, ...args, "--schema", path.join(fixtureRoot, "schema.prisma")]);
  if (result.status !== 0) throw new Error(result.output);
  return result.output;
}

async function resetDatabase() {
  await prisma.$executeRawUnsafe("DROP EXTENSION IF EXISTS btree_gist CASCADE");
  await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await prisma.$executeRawUnsafe("CREATE SCHEMA public");
}

async function applyBaselineSql(fixtureRoot = canonicalPrismaRoot) {
  prismaCommand([
    "db", "execute", "--file",
    path.join(fixtureRoot, "baseline", "20260924000100_clean_baseline", "migration.sql")
  ], fixtureRoot);
}

async function migrationRows() {
  return prisma.$queryRawUnsafe(`
    SELECT id, checksum, migration_name, started_at, finished_at, rolled_back_at, logs, applied_steps_count
    FROM public._prisma_migrations
    ORDER BY started_at, migration_name
  `);
}

function comparableRows(rows) {
  return rows.map(row => ({
    ...row,
    started_at: row.started_at?.toISOString(),
    finished_at: row.finished_at?.toISOString(),
    rolled_back_at: row.rolled_back_at?.toISOString()
  }));
}

function fixtureCopy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lrm-migration-fixture-"));
  fs.cpSync(canonicalPrismaRoot, root, { recursive: true });
  return root;
}

function addForwardMigrationFixture(root, name = "20260925000100_test_forward_probe") {
  const migrationRoot = path.join(root, "migrations", name);
  fs.mkdirSync(migrationRoot, { recursive: true });
  fs.writeFileSync(path.join(migrationRoot, "migration.sql"), [
    "CREATE TABLE public._migration_future_probe (",
    "  id text PRIMARY KEY",
    ");",
    ""
  ].join("\n"));
  fs.appendFileSync(path.join(root, "schema.prisma"), [
    "",
    "model MigrationFutureProbe {",
    "  id String @id",
    "",
    "  @@map(\"_migration_future_probe\")",
    "}",
    ""
  ].join("\n"));
  return name;
}

async function createPrismaHistoryTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE public._prisma_migrations (
      id varchar(36) PRIMARY KEY,
      checksum varchar(64) NOT NULL,
      finished_at timestamptz,
      migration_name varchar(255) NOT NULL,
      logs text,
      rolled_back_at timestamptz,
      started_at timestamptz NOT NULL DEFAULT now(),
      applied_steps_count integer NOT NULL DEFAULT 0
    )
  `);
}

async function runCase(name, test) {
  await resetDatabase();
  await test();
  results.push({ name, result: "PASS" });
  console.log(`PASS ${name}`);
}

try {
  await runCase("1 fresh PostgreSQL 16 deployment", async () => {
    deploy();
    assert.equal((await migrationRows()).length, 13);
  });

  await runCase("2 idempotent repeat deployment", async () => {
    deploy();
    const before = comparableRows(await migrationRows());
    const output = deploy();
    assert.match(output, /RECOGNIZED_PRISMA_LINEAGE/);
    assert.deepEqual(comparableRows(await migrationRows()), before);
  });

  await runCase("3 interrupted resolve resumes after three migrations", async () => {
    await applyBaselineSql();
    const manifest = JSON.parse(fs.readFileSync(path.join(canonicalPrismaRoot, "baseline", "20260924000100_clean_baseline", "manifest.json")));
    for (const migration of manifest.includedMigrations.slice(0, 3)) {
      prismaCommand(["migrate", "resolve", "--applied", migration.name]);
    }
    assert.equal((await migrationRows()).length, 3);
    deploy();
    assert.equal((await migrationRows()).length, 13);
  });

  await runCase("4 existing legitimate lineage preserves rows and applies forward migration", async () => {
    deploy();
    await prisma.$executeRawUnsafe("DELETE FROM public._lrm_deployment_baselines");
    const before = comparableRows(await migrationRows());
    const fixture = fixtureCopy();
    try {
      const forwardName = addForwardMigrationFixture(fixture, "20260925000100_test_existing_lineage_forward");
      const output = deploy({ fixtureRoot: fixture });
      assert.match(output, /RECOGNIZED_PRISMA_LINEAGE/);
      assert.doesNotMatch(output, /marked as applied/);
      const after = comparableRows(await migrationRows());
      assert.deepEqual(after.slice(0, before.length), before);
      assert.equal(after.at(-1).migration_name, forwardName);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  await runCase("5 unknown table fails closed", async () => {
    await prisma.$executeRawUnsafe("CREATE TABLE public.foreign_app (id text PRIMARY KEY)");
    assert.match(deploy({ expectSuccess: false }), /UNKNOWN_NONEMPTY/);
  });

  await runCase("6 foreign Prisma history fails closed", async () => {
    await createPrismaHistoryTable();
    await prisma.$executeRawUnsafe(`
      INSERT INTO public._prisma_migrations
        (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
      VALUES ('foreign-id', repeat('a', 64), '20000101000000_foreign_project', now(), now(), 1)
    `);
    assert.match(deploy({ expectSuccess: false }), /foreign or unknown Prisma migration/);
  });

  await runCase("7 empty Prisma migration history fails closed", async () => {
    await createPrismaHistoryTable();
    assert.match(deploy({ expectSuccess: false }), /Prisma migration history is empty/);
  });

  await runCase("8 non-table public object fails closed", async () => {
    await prisma.$executeRawUnsafe("CREATE VIEW public.foreign_view AS SELECT 1 AS id");
    assert.match(deploy({ expectSuccess: false }), /UNKNOWN_NONEMPTY/);
  });

  await runCase("9 tampered baseline SQL fails integrity verification", async () => {
    const fixture = fixtureCopy();
    try {
      fs.appendFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "migration.sql"), "\n-- tampered\n");
      assert.match(deploy({ fixtureRoot: fixture, expectSuccess: false }), /baseline SQL integrity check failed/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  await runCase("10 tampered historical migration fails integrity verification", async () => {
    const fixture = fixtureCopy();
    try {
      fs.appendFileSync(path.join(fixture, "migrations", "20260723000100_init", "migration.sql"), "\n-- tampered\n");
      assert.match(deploy({ fixtureRoot: fixture, expectSuccess: false }), /historical migration integrity check failed/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  await runCase("11 baseline fingerprint mismatch stops before resolve", async () => {
    await applyBaselineSql();
    await prisma.$executeRawUnsafe("DROP TRIGGER bookings_schedule_integrity_before_write ON public.bookings");
    assert.match(deploy({ expectSuccess: false }), /catalog fingerprint mismatch/);
    const migrationTable = await prisma.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations')::text AS name");
    assert.equal(migrationTable[0].name, null);
  });

  await runCase("12 frozen baseline accepts future forward migration", async () => {
    deploy();
    const fixture = fixtureCopy();
    try {
      const manifestBefore = fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "manifest.json"), "utf8");
      const schemaBefore = fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "schema.prisma"), "utf8");
      const sqlBefore = fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "migration.sql"), "utf8");
      const forwardName = addForwardMigrationFixture(fixture);
      deploy({ fixtureRoot: fixture });
      const names = (await migrationRows()).map(row => row.migration_name);
      assert.equal(names.at(-1), forwardName);
      assert.equal(fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "manifest.json"), "utf8"), manifestBefore);
      assert.equal(fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "schema.prisma"), "utf8"), schemaBefore);
      assert.equal(fs.readFileSync(path.join(fixture, "baseline", "20260924000100_clean_baseline", "migration.sql"), "utf8"), sqlBefore);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  console.table(results);
} finally {
  await prisma.$disconnect();
}
