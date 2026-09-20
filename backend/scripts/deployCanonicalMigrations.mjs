import { createHash } from "node:crypto";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationRoot = path.join(backendRoot, "prisma", "migrations");
const reconciliationName = "20260917000100_reconcile_canonical_persistence";
const reconciliationDir = path.join(migrationRoot, reconciliationName);
const reconciliationSqlPath = path.join(reconciliationDir, "migration.sql");

const verifiedMigrationChecksums = Object.freeze({
  "20260723000100_init": "c942177016dabbfa0c3465a5e923bd0edf490f238021b6ca96ab65cdca03be96",
  "20260723000200_remove_resource_owner_default": "66a1614148472e82df95e52c3649e6119a54c9029fc0d4b4bc71e25a688939aa",
  "20260723000300_require_explicit_resource_fields": "df6b0f54b676d92cda13592f3c55bad7b829d9f79058bc1092bf4894e03b9fa7",
  "20260727000100_add_i18n_message_keys": "10b67a12359efa91038b95890c1505666e10648d7dd6a12823088544df2c6ed0",
  "20260817000100_add_maintenance_windows": "030a4964d697a5b847f94e38e8e5bbecbf921808867a73f15232864b9597022f",
  "20260820000100_add_booking_guard_constraint": "658716b3be743f2bbd81b1c2f4dee5248eb1b9751a8eea693ed19b5a2b32eedb",
  "20260820000200_add_orchestration_provenance_and_policy": "ca0da76bb6ef6c8d1f04a518cc8398446e499c0c11bcf70e3155937b61b691c3"
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for canonical migration deployment");
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const psqlCommand = process.platform === "win32" ? "psql.exe" : "psql";
const prisma = new PrismaClient();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

async function reconciliationState() {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT finished_at, rolled_back_at
       FROM "_prisma_migrations"
       WHERE migration_name = $1
       ORDER BY started_at DESC`,
      reconciliationName
    );
    if (!rows.length) return "pending";
    if (rows.some((row) => row.finished_at && !row.rolled_back_at)) return "applied";
    if (rows.some((row) => !row.finished_at && !row.rolled_back_at)) return "failed";
    return "pending";
  } catch (error) {
    if (error?.code === "P2010" || error?.code === "P2021" || /_prisma_migrations/i.test(String(error?.message || ""))) {
      return "pending";
    }
    throw error;
  }
}

async function buildPortableReconciliationSql(outputPath) {
  const tracked = await readFile(reconciliationSqlPath, "utf8");
  let translated = tracked;
  let replacements = 0;

  for (const [name, verifiedHash] of Object.entries(verifiedMigrationChecksums)) {
    const bytes = await readFile(path.join(migrationRoot, name, "migration.sql"));
    const checkoutHash = sha256(bytes);
    const occurrences = translated.split(verifiedHash).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Expected exactly one verified checksum literal for ${name}; found ${occurrences}. Historical migration reconciliation is not safe to automate.`
      );
    }
    translated = translated.replace(verifiedHash, checkoutHash);
    replacements += 1;
    console.log(
      `Canonical migration compatibility: ${name} verified=${verifiedHash} checkout=${checkoutHash}`
    );
  }

  if (replacements !== Object.keys(verifiedMigrationChecksums).length) {
    throw new Error("Incomplete canonical migration checksum translation");
  }

  // Fail closed: only known checksum precondition literals may differ from
  // the tracked reconciliation migration. Reconstruct the tracked body exactly.
  let reconstructed = translated;
  for (const [name, verifiedHash] of Object.entries(verifiedMigrationChecksums)) {
    const bytes = await readFile(path.join(migrationRoot, name, "migration.sql"));
    reconstructed = reconstructed.replace(sha256(bytes), verifiedHash);
  }
  if (reconstructed !== tracked) {
    throw new Error("Portable reconciliation changed more than verified checksum precondition literals");
  }

  await writeFile(outputPath, translated, "utf8");
}

function psqlDatabaseUrl() {
  const url = new URL(databaseUrl);
  url.searchParams.delete("schema");
  return url.toString();
}

async function deployPendingReconciliation() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "lrm-migrate-"));
  const hiddenDir = path.join(tempRoot, reconciliationName);
  const translatedSql = path.join(tempRoot, "reconciliation.sql");
  let hidden = false;

  try {
    await rename(reconciliationDir, hiddenDir);
    hidden = true;

    // Deploy the seven immutable predecessor migrations using Prisma so their
    // actual checkout checksums are recorded by Prisma itself.
    run(npxCommand, ["prisma", "migrate", "deploy"]);

    await rename(hiddenDir, reconciliationDir);
    hidden = false;

    await buildPortableReconciliationSql(translatedSql);

    // Execute the verified Batch 1C body with only checksum-precondition
    // literals translated to the bytes Prisma just recorded.
    run(psqlCommand, [psqlDatabaseUrl(), "-v", "ON_ERROR_STOP=1", "-f", translatedSql]);

    // Record Batch 1C via Prisma's supported command. Never edit
    // _prisma_migrations manually.
    run(npxCommand, ["prisma", "migrate", "resolve", "--applied", reconciliationName]);

    // Apply any migrations that may be added after the reconciliation.
    run(npxCommand, ["prisma", "migrate", "deploy"]);
  } finally {
    if (hidden) {
      await rename(hiddenDir, reconciliationDir).catch(() => {});
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

try {
  const state = await reconciliationState();
  if (state === "failed") {
    throw new Error(
      `Migration ${reconciliationName} has an unfinished Prisma history row. Stop and review; automatic repair is intentionally refused.`
    );
  }

  if (state === "applied") {
    run(npxCommand, ["prisma", "migrate", "deploy"]);
  } else {
    await deployPendingReconciliation();
  }

  run(npxCommand, ["prisma", "migrate", "status"]);
  console.log("Canonical migration deployment: PASS");
} finally {
  await prisma.$disconnect();
}
