import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertTargetIdentity,
  batch1DClient,
  jsonValue,
} from "../test/helpers/batch1dDatabase.js";

const backend = fileURLToPath(new URL("../", import.meta.url));
const docs = path.resolve(backend, "../docs");
const cleanDatabase = process.argv.find((value) => value.startsWith("--clean="))?.slice(8);
const upgradeDatabase = process.argv.find((value) => value.startsWith("--upgrade="))?.slice(10);
assert.ok(cleanDatabase && upgradeDatabase, "Required --clean and --upgrade arguments are missing");
const readJson = async (name) => JSON.parse(await readFile(path.join(docs, name), "utf8"));
const [pre, clean, post] = await Promise.all([
  readJson("BATCH1D_UPGRADE_PRE.json"),
  readJson("BATCH1D_CLEAN_POST.json"),
  readJson("BATCH1D_UPGRADE_POST.json"),
]);
assert.equal(pre.database, upgradeDatabase);
assert.equal(clean.database, cleanDatabase);
assert.equal(post.database, upgradeDatabase);
assert.equal(clean.catalogSha256, post.catalogSha256, "Clean and upgrade catalog hashes differ");

const postRows = new Map(post.rows.map((item) => [item.table, item]));
const rowComparison = [];
for (const before of pre.rows) {
  const after = postRows.get(before.table);
  assert.ok(after, `Missing post-upgrade table ${before.table}`);
  const expectedDelta = before.table === "_prisma_migrations" ? 3
    : before.table === "resource_status_history" ? 1 : 0;
  assert.equal(after.count, before.count + expectedDelta, `${before.table} row count`);
  const beforeIds = new Set(before.ids);
  assert.ok(before.ids.every((id) => after.ids.includes(id)), `${before.table} lost a primary ID`);
  assert.equal(beforeIds.size, before.ids.length, `${before.table} pre-upgrade duplicate ID`);
  assert.equal(new Set(after.ids).size, after.ids.length, `${before.table} post-upgrade duplicate ID`);
  rowComparison.push({ table: before.table, before: before.count, after: after.count, expectedDelta });
}
assert.equal(postRows.get("user_lab_assignments")?.count, 0);

const client = await batch1DClient(upgradeDatabase, { readOnly: true });
const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
try {
  const verification = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const identity = await assertTargetIdentity(tx, upgradeDatabase, { readOnly: true });
    const foreignKeys = await tx.$queryRawUnsafe(`
      SELECT child.relname AS table_name, c.conname AS name,
        ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num, ord)
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.num ORDER BY k.ord) AS columns,
        parent.relname AS target_table,
        ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num, ord)
          JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.num ORDER BY k.ord) AS target_columns
      FROM pg_constraint c JOIN pg_class child ON child.oid = c.conrelid
      JOIN pg_class parent ON parent.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'f' ORDER BY child.relname, c.conname
    `);
    const orphans = [];
    for (const fk of foreignKeys) {
      const present = fk.columns.map((column) => `c.${quote(column)} IS NOT NULL`).join(" AND ");
      const join = fk.columns.map((column, index) =>
        `c.${quote(column)} = p.${quote(fk.target_columns[index])}`).join(" AND ");
      const [result] = await tx.$queryRawUnsafe(`
        SELECT count(*)::int AS count FROM public.${quote(fk.table_name)} c
        WHERE ${present} AND NOT EXISTS (
          SELECT 1 FROM public.${quote(fk.target_table)} p WHERE ${join}
        )
      `);
      assert.equal(result.count, 0, `Orphans for ${fk.name}`);
      orphans.push({ name: fk.name, count: result.count });
    }
    const [facts] = await tx.$queryRawUnsafe(`
      SELECT
        (SELECT count(*)::int FROM bookings WHERE "startAt" >= "endAt") AS invalid_bookings,
        (SELECT count(*)::int FROM maintenance_windows WHERE "startAt" >= "endAt") AS invalid_maintenance,
        (SELECT count(*)::int FROM resources WHERE "operationalStatus" IS NULL) AS null_operational_status,
        (SELECT count(*)::int FROM resources WHERE status::text = 'reserved') AS reserved_compatibility,
        (SELECT count(*)::int FROM bookings WHERE "approvedAt" IS NOT NULL
          OR "returnedAt" IS NOT NULL OR "completedAt" IS NOT NULL
          OR outcome IS NOT NULL OR "outcomeAt" IS NOT NULL) AS fabricated_lifecycle_evidence,
        (SELECT count(*)::int FROM telemetry_samples) AS telemetry_samples,
        (SELECT count(*)::int FROM notifications WHERE type IS NOT NULL OR "dedupeKey" IS NOT NULL)
          AS rewritten_notifications,
        (SELECT count(*)::int FROM resource_status_history
          WHERE id = 'b1c00000-0000-4000-8000-000000000001'
            AND "fromStatus" = 'AVAILABLE' AND "toStatus" = 'MAINTENANCE'
            AND "changedById" IS NULL) AS expected_reconciliation_history,
        (SELECT count(*)::int FROM resources
          WHERE code = 'UAV-M350-RTK-01' AND "operationalStatus" = 'MAINTENANCE') AS corrected_uav,
        (SELECT count(*)::int FROM pg_trigger
          WHERE tgname IN ('bookings_schedule_integrity_before_write',
            'maintenance_schedule_integrity_before_write')
            AND NOT tgisinternal AND tgenabled = 'O') AS enabled_schedule_triggers
    `);
    const unresolved = await tx.$queryRawUnsafe(`
      SELECT code FROM resources WHERE category IS NULL ORDER BY code
    `);
    const enums = await tx.$queryRawUnsafe(`
      SELECT t.typname AS name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname
    `);
    return { identity, foreignKeyCount: foreignKeys.length, orphans, facts, unresolved, enums };
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });

  const facts = verification.facts;
  for (const key of ["invalid_bookings", "invalid_maintenance", "null_operational_status",
    "reserved_compatibility", "fabricated_lifecycle_evidence", "telemetry_samples",
    "rewritten_notifications"]) assert.equal(facts[key], 0, key);
  assert.equal(facts.expected_reconciliation_history, 1);
  assert.equal(facts.corrected_uav, 1);
  assert.equal(facts.enabled_schedule_triggers, 2);
  assert.deepEqual(verification.unresolved.map((item) => item.code), [
    "CAM-D435I-01", "EDGE-RPI5-01", "RPI-KIT-05", "UAV-M350-RTK-01", "UAV-MATRICE-300",
  ]);
  const enumMap = new Map(verification.enums.map((item) => [item.name, item.labels]));
  assert.deepEqual(enumMap.get("Role"), ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"]);
  assert.deepEqual(enumMap.get("BookingStatus"), [
    "PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "COMPLETED", "REJECTED", "CANCELLED",
  ]);
  assert.deepEqual(enumMap.get("BookingOutcome"), ["NO_SHOW"]);
  const report = jsonValue({
    generatedAt: new Date().toISOString(), cleanDatabase, upgradeDatabase,
    cleanVsUpgradeCatalogSha256: clean.catalogSha256,
    cleanVsUpgradeSchemaEquivalent: true,
    rowComparison,
    preProfile: pre.profile,
    postProfile: post.profile,
    verification,
    verdict: "PASS",
  });
  const output = path.join(docs, "BATCH1D_RECONCILIATION.json");
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    verdict: report.verdict,
    schemaEquivalent: report.cleanVsUpgradeSchemaEquivalent,
    foreignKeys: report.verification.foreignKeyCount,
    orphanCount: report.verification.orphans.reduce((sum, item) => sum + item.count, 0),
    unresolvedResources: report.verification.unresolved.length,
    output,
  }, null, 2));
} finally {
  await client.$disconnect();
}
