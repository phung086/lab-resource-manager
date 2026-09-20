import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const beforePath = argument("before");
const afterPath = argument("after");
const outputPath = argument("output");
const mode = argument("mode") || "exact";
const canonicalPath = argument("canonical");
assert.ok(beforePath && afterPath && outputPath, "--before, --after and --output are required");
assert.ok(["exact", "migration"].includes(mode), "Mode must be exact or migration");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const before = await readJson(beforePath);
const after = await readJson(afterPath);
const beforeRows = new Map(before.rows.map((row) => [row.table, row]));
const afterRows = new Map(after.rows.map((row) => [row.table, row]));
const rowResults = [];

if (mode === "exact") {
  assert.equal(after.catalogSha256, before.catalogSha256, "Catalog fingerprint mismatch");
  assert.deepEqual(after.migrations, before.migrations, "Migration history mismatch");
  for (const [table, prior] of beforeRows) {
    const restored = afterRows.get(table);
    assert.ok(restored, `Restored table missing: ${table}`);
    assert.equal(restored.count, prior.count, `${table} row count`);
    assert.equal(restored.content_digest, prior.content_digest, `${table} content digest`);
    assert.deepEqual(restored.ids, prior.ids, `${table} IDs`);
    rowResults.push({ table, before: prior.count, after: restored.count, match: true });
  }
} else {
  assert.ok(canonicalPath, "Migration mode requires --canonical");
  const canonical = await readJson(canonicalPath);
  assert.equal(after.catalogSha256, canonical.catalogSha256, "Post-cutover schema is not canonical");
  for (const [table, prior] of beforeRows) {
    const current = afterRows.get(table);
    assert.ok(current, `Post-cutover table missing: ${table}`);
    const expectedDelta = table === "_prisma_migrations" ? 3
      : table === "resource_status_history" ? 1 : 0;
    assert.equal(current.count, prior.count + expectedDelta, `${table} row count`);
    assert.ok(prior.ids.every((id) => current.ids.includes(id)), `${table} lost an existing ID`);
    rowResults.push({ table, before: prior.count, after: current.count, expectedDelta, idsPreserved: true });
  }
  assert.equal(afterRows.get("user_lab_assignments")?.count, 0, "Unexpected lab assignment rows");
  const advancedTables = [
    "ai_conversations", "ai_messages", "behavior_event_logs", "knowledge_chunks",
    "knowledge_documents", "optimization_decisions", "optimization_runs",
    "payment_transactions", "policy_versions", "resource_allocations",
    "resource_requirements", "shipment_orders", "user_behavior_scores"
  ];
  for (const table of advancedTables) {
    assert.equal(afterRows.get(table)?.content_digest, beforeRows.get(table)?.content_digest, `${table} changed unexpectedly`);
  }
  assert.equal(after.facts.telemetry_samples, before.facts.telemetry_samples, "Telemetry rows changed");
}

assert.equal(after.orphans.reduce((sum, item) => sum + item.count, 0), 0, "Foreign-key orphans found");
assert.equal(after.facts.invalid_bookings, 0, "Invalid booking ranges found");
assert.equal(after.facts.invalid_maintenance, 0, "Invalid maintenance ranges found");

const result = {
  generatedAt: new Date().toISOString(),
  mode,
  beforeDatabase: before.database,
  afterDatabase: after.database,
  beforeCatalogSha256: before.catalogSha256,
  afterCatalogSha256: after.catalogSha256,
  rows: rowResults,
  orphanCount: 0,
  verdict: "PASS"
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ mode, verdict: result.verdict, tables: rowResults.length, afterCatalogSha256: after.catalogSha256 }));
