import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Prisma } from "@prisma/client";

const backend = fileURLToPath(new URL("../", import.meta.url));
const docs = path.resolve(backend, "../docs");
const schemaPath = path.join(backend, "prisma/schema.prisma");
const migrationRoot = path.join(backend, "prisma/migrations");
const migrationName = "20260917000100_reconcile_canonical_persistence";
const migrationPath = path.join(migrationRoot, migrationName, "migration.sql");
const baseline = JSON.parse(await readFile(path.join(docs, "BATCH1B_VERIFICATION.json"), "utf8"));
const schema = await readFile(schemaPath, "utf8");
const sql = await readFile(migrationPath, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function lexicalCheck(source) {
  let index = 0;
  let state = "plain";
  let dollarTag = null;
  let parenthesisDepth = 0;
  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];
    if (state === "line-comment") {
      if (current === "\n") state = "plain";
      index += 1;
      continue;
    }
    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        state = "plain";
        index += 2;
      } else index += 1;
      continue;
    }
    if (state === "single") {
      if (current === "'" && next === "'") index += 2;
      else if (current === "'") { state = "plain"; index += 1; }
      else index += 1;
      continue;
    }
    if (state === "double") {
      if (current === '"' && next === '"') index += 2;
      else if (current === '"') { state = "plain"; index += 1; }
      else index += 1;
      continue;
    }
    if (state === "dollar") {
      if (source.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        state = "plain";
        dollarTag = null;
      } else index += 1;
      continue;
    }
    if (current === "-" && next === "-") { state = "line-comment"; index += 2; continue; }
    if (current === "/" && next === "*") { state = "block-comment"; index += 2; continue; }
    if (current === "'") { state = "single"; index += 1; continue; }
    if (current === '"') { state = "double"; index += 1; continue; }
    if (current === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        state = "dollar";
        index += dollarTag.length;
        continue;
      }
    }
    if (current === "(") parenthesisDepth += 1;
    if (current === ")") parenthesisDepth -= 1;
    assert.ok(parenthesisDepth >= 0, `Unexpected closing parenthesis at offset ${index}`);
    index += 1;
  }
  assert.ok(["plain", "line-comment"].includes(state), `Unclosed SQL lexical state: ${state}`);
  assert.equal(parenthesisDepth, 0, "Unbalanced SQL parentheses");
}

lexicalCheck(sql);
assert.match(sql.trim(), /^--[\s\S]*\bBEGIN;[\s\S]*COMMIT;$/);
assert.equal((sql.match(/^BEGIN;$/gm) ?? []).length, 1, "Expected one outer BEGIN");
assert.equal((sql.match(/^COMMIT;$/gm) ?? []).length, 1, "Expected one outer COMMIT");
assert.equal((sql.match(/^DO \$\$$/gm) ?? []).length,
  (sql.match(/^END \$\$;$/gm) ?? []).length, "Unbalanced DO blocks");
for (const forbidden of [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /(?:INSERT|UPDATE|DELETE)[\s\S]{0,40}_prisma_migrations/i,
  /prisma\s+db\s+push/i,
]) {
  assert.doesNotMatch(sql, forbidden, `Forbidden operation matched: ${forbidden}`);
}

const requiredFragments = [
  "SET LOCAL search_path = public, pg_catalog",
  "Keep this loss-prevention guard outside the transaction",
  "CREATE FUNCTION pg_temp.batch1c_column_names",
  "Seven-label ResourceType is permitted only on the verified-empty clean path",
  "ALTER TYPE public.\"ResourceType\" RENAME TO \"ResourceType_legacy_b1c\"",
  "CREATE TYPE public.\"BookingStatus\" AS ENUM",
  "'PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED','COMPLETED','REJECTED','CANCELLED'",
  "CONSTRAINT bookings_no_active_overlap",
  "CONSTRAINT bookings_valid_time_range",
  "CONSTRAINT maintenance_windows_valid_time_range",
  "CREATE FUNCTION public.enforce_resource_schedule_integrity()",
  "ERRCODE = '23P01'",
  "CREATE TABLE public.user_lab_assignments",
  "ADD COLUMN category public.\"ResourceCategory\"",
  "ADD COLUMN \"humidityPercent\" double precision",
  "ADD COLUMN \"verifiedSignals\" jsonb",
  "ADD COLUMN cost double precision",
  "ADD COLUMN vendor text",
  "ADD COLUMN \"approvedAt\"",
  "ADD COLUMN \"returnedAt\"",
  "ADD COLUMN \"completedAt\"",
  "ADD COLUMN outcome public.\"BookingOutcome\"",
  "ADD COLUMN \"dedupeKey\" text",
  "current_setting('batch1c.path') = 'clean'",
  "current_setting('batch1c.path') = 'upgrade'",
  "Prior migration checksum/history precondition failed",
  "IS DISTINCT FROM '84a144a24ee7666515e49422dd21003e'",
  "Supporting canonical enum postcondition failed",
  "Schedule-integrity trigger postcondition failed",
];
for (const fragment of requiredFragments) assert.ok(sql.includes(fragment), `Missing SQL fragment: ${fragment}`);
const orderedFragments = [
  "CREATE FUNCTION pg_temp.batch1c_column_names",
  "PERFORM set_config('batch1c.path'",
  "LOCK TABLE public.users",
  "ALTER TYPE public.\"Role\" RENAME VALUE",
  "ADD COLUMN \"studentId\" text",
  "ResourceStatus=reserved is not a physical condition",
  "ALTER TABLE public.bookings DROP CONSTRAINT bookings_no_active_overlap",
  "CREATE TABLE public.user_lab_assignments",
  "CREATE FUNCTION public.enforce_resource_schedule_integrity()",
  "COMMIT;",
];
let previousIndex = -1;
for (const fragment of orderedFragments) {
  const currentIndex = sql.indexOf(fragment);
  assert.ok(currentIndex > previousIndex, `SQL phase is out of order: ${fragment}`);
  previousIndex = currentIndex;
}

const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
const enums = new Map(Prisma.dmmf.datamodel.enums.map((item) => [item.name, item]));
assert.equal(models.size, 32);
assert.deepEqual(enums.get("Role").values.map((item) => item.name),
  ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"]);
assert.deepEqual(enums.get("BookingStatus").values.map((item) => item.name),
  ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED", "COMPLETED", "REJECTED", "CANCELLED"]);
assert.deepEqual(enums.get("OperationalStatus").values.map((item) => item.name),
  ["AVAILABLE", "IN_USE", "MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"]);
assert.deepEqual(enums.get("ResourceType").values.map((item) => item.dbName ?? item.name),
  ["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material", "other"]);

const resourceFields = new Map(models.get("Resource").fields.map((field) => [field.name, field]));
assert.equal(resourceFields.get("subtype").dbName, "type");
assert.equal(resourceFields.get("category").type, "ResourceCategory");
assert.equal(resourceFields.get("operationalStatus").type, "OperationalStatus");
const bookingFields = new Map(models.get("Booking").fields.map((field) => [field.name, field]));
for (const field of ["approvedAt", "returnedAt", "completedAt", "outcome", "outcomeAt"])
  assert.ok(bookingFields.has(field));
const logFields = new Map(models.get("UsageLog").fields.map((field) => [field.name, field]));
for (const field of ["actorType", "actorRef", "fromStatus", "toStatus", "reason", "metadata"])
  assert.ok(logFields.has(field));
assert.equal(logFields.get("userId").isRequired, false);
assert.ok(models.has("UserLabAssignment"));

for (const [name, expected] of Object.entries(baseline.migrationFiles)) {
  const current = await readFile(path.join(migrationRoot, name, "migration.sql"));
  assert.equal(sha256(current), expected, `Historical migration changed: ${name}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  migrationName,
  migrationSha256: sha256(sql),
  schemaSha256: sha256(schema),
  checks: {
    lexicalBalance: "PASS",
    phaseOrder: "PASS",
    explicitTransaction: "PASS",
    forbiddenTableColumnDataAndHistoryDestruction: "PASS",
    requiredDdlFragments: requiredFragments.length,
    prismaModels: models.size,
    canonicalRoles: "PASS",
    canonicalBookingStatuses: "PASS",
    canonicalOperationalStatuses: "PASS",
    schemaMigrationContract: "PASS",
    historicalMigrationHashesUnchanged: Object.keys(baseline.migrationFiles).length,
  },
  limitations: [
    "Static inspection does not execute PostgreSQL DDL.",
    "Execution, rollback, and concurrency evidence is reported separately in Batch 1D.",
  ],
  verdict: "PASS_AUTHORING_ONLY",
};
await writeFile(path.join(docs, "BATCH1C_AUTHORING_VALIDATION.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
