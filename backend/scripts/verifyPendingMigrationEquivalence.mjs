import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../", import.meta.url));
const docs = path.resolve(backend, "../docs");
const referenceDatabase = "lab_resources_restore_b1a_pg16_20260917t090416z";
const databaseArg = process.argv.find((value) => value.startsWith("--database="));
const reportArg = process.argv.find((value) => value.startsWith("--report="));
const allowDevelopment = process.argv.includes("--allow-development");
const database = databaseArg?.slice("--database=".length) ?? referenceDatabase;
assert.ok(database === referenceDatabase || /^lab_resources_b1d_[a-z0-9_]+$/.test(database)
  || (database === "lab_resources" && allowDevelopment),
  "Only an approved restore/test DB or explicitly authorized development DB is allowed");
const reportPath = reportArg
  ? path.resolve(docs, reportArg.slice("--report=".length))
  : path.join(docs, "BATCH1C_PENDING_MIGRATION_EQUIVALENCE.json");
assert.equal(path.dirname(reportPath), docs, "Equivalence report must remain in docs");
const baselinePath = path.join(docs, "BATCH1B_VERIFICATION.json");
const migrationRoot = path.join(backend, "prisma/migrations");
const migrationNames = [
  "20260820000100_add_booking_guard_constraint",
  "20260820000200_add_orchestration_provenance_and_policy",
];
const orchestrationTables = [
  "resource_requirements",
  "resource_allocations",
  "policy_versions",
  "optimization_runs",
  "optimization_decisions",
];

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const env = parse(await readFile(path.join(backend, ".env")));
const url = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only a local restore is allowed");
url.pathname = `/${database}`;
url.searchParams.set("schema", "public");
url.searchParams.set("options", "-c default_transaction_read_only=on");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function migrationHashes() {
  const hashes = {};
  for (const name of migrationNames) {
    const sql = await readFile(path.join(migrationRoot, name, "migration.sql"));
    hashes[name] = sha256(sql);
    assert.equal(hashes[name], baseline.migrationFiles[name], `${name} changed after Batch 1B`);
  }
  return hashes;
}

async function verify(tx) {
  const [identity] = await tx.$queryRawUnsafe(`
    SELECT current_database() AS database,
      current_setting('server_version') AS version,
      current_setting('transaction_read_only') AS read_only
  `);
  assert.equal(identity.database, database);
  assert.equal(identity.read_only, "on");
  assert.ok(identity.version.startsWith("16."));

  const recorded = await tx.$queryRawUnsafe(`
    SELECT migration_name
    FROM _prisma_migrations
    WHERE migration_name IN (
      '20260820000100_add_booking_guard_constraint',
      '20260820000200_add_orchestration_provenance_and_policy'
    )
    ORDER BY migration_name
  `);
  assert.equal(recorded.length, 0, "Pending migrations unexpectedly appear in history");

  const [guard] = await tx.$queryRawUnsafe(`
    SELECT c.convalidated AS validated,
      pg_get_constraintdef(c.oid) AS definition,
      x.indisexclusion AS exclusion,
      am.amname AS access_method
    FROM pg_constraint c
    JOIN pg_index x ON x.indexrelid = c.conindid
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_am am ON am.oid = i.relam
    WHERE c.conrelid = 'bookings'::regclass
      AND c.conname = 'bookings_no_active_overlap'
      AND c.contype = 'x'
  `);
  const [extension] = await tx.$queryRawUnsafe(`
    SELECT extname, extversion FROM pg_extension WHERE extname = 'btree_gist'
  `);
  const [guardAssumptions] = await tx.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM bookings WHERE "startAt" >= "endAt") AS invalid_ranges,
      (SELECT count(*)::int / 2
       FROM bookings b1 CROSS JOIN bookings b2
       WHERE b1.id <> b2.id
         AND b1."resourceId" = b2."resourceId"
         AND b1.status::text IN ('pending','approved','checked_out')
         AND b2.status::text IN ('pending','approved','checked_out')
         AND tsrange(b1."startAt", b1."endAt", '[)')
             && tsrange(b2."startAt", b2."endAt", '[)')) AS active_overlap_pairs
  `);

  const expectedGuardDefinition = `EXCLUDE USING gist ("resourceId" WITH =, tsrange("startAt", "endAt", '[)'::text) WITH &&) WHERE ((status = ANY (ARRAY['pending'::"BookingStatus", 'approved'::"BookingStatus", 'checked_out'::"BookingStatus"])))`;
  const guardChecks = {
    extensionPresent: extension?.extname === "btree_gist",
    extensionVersion: extension?.extversion,
    constraintPresent: Boolean(guard),
    constraintValidated: guard?.validated === true,
    exclusionIndex: guard?.exclusion === true,
    accessMethod: guard?.access_method,
    definition: guard?.definition,
    expectedDefinition: expectedGuardDefinition,
    definitionMatches: guard?.definition === expectedGuardDefinition,
    invalidRanges: guardAssumptions.invalid_ranges,
    activeOverlapPairs: guardAssumptions.active_overlap_pairs,
  };

  const [catalogHashes] = await tx.$queryRawUnsafe(`
    WITH selected AS (
      SELECT ARRAY[
        'resource_requirements','resource_allocations','policy_versions',
        'optimization_runs','optimization_decisions'
      ]::text[] AS names
    )
    SELECT
      (SELECT md5(string_agg(
        format('%s|%s|%s|%s|%s|%s', c.relname, a.attnum, a.attname,
          format_type(a.atttypid, a.atttypmod), a.attnotnull,
          coalesce(pg_get_expr(d.adbin, d.adrelid), '')),
        E'\\n' ORDER BY c.relname, a.attnum))
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
       LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       CROSS JOIN selected s
       WHERE n.nspname = 'public' AND c.relname = ANY(s.names)) AS columns_hash,
      (SELECT md5(string_agg(
        format('%s|%s|%s|%s|%s', c.conrelid::regclass::text, c.conname,
          c.contype, pg_get_constraintdef(c.oid), c.convalidated),
        E'\\n' ORDER BY c.conrelid::regclass::text, c.conname))
       FROM pg_constraint c CROSS JOIN selected s
       WHERE c.conrelid::regclass::text = ANY(s.names)) AS constraints_hash,
      (SELECT md5(string_agg(
        format('%s|%s|%s', t.relname, i.relname, pg_get_indexdef(x.indexrelid)),
        E'\\n' ORDER BY t.relname, i.relname))
       FROM pg_index x
       JOIN pg_class t ON t.oid = x.indrelid
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       CROSS JOIN selected s
       WHERE n.nspname = 'public' AND t.relname = ANY(s.names)) AS indexes_hash
  `);

  const columns = await tx.$queryRawUnsafe(`
    SELECT table_name, count(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY(ARRAY[
        'resource_requirements','resource_allocations','policy_versions',
        'optimization_runs','optimization_decisions'
      ])
    GROUP BY table_name ORDER BY table_name
  `);
  const indexes = await tx.$queryRawUnsafe(`
    SELECT tablename AS table_name, count(*)::int AS count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY(ARRAY[
        'resource_requirements','resource_allocations','policy_versions',
        'optimization_runs','optimization_decisions'
      ])
    GROUP BY tablename ORDER BY tablename
  `);
  const constraints = await tx.$queryRawUnsafe(`
    SELECT c.conrelid::regclass::text AS table_name, c.contype::text AS type,
      count(*)::int AS count
    FROM pg_constraint c
    WHERE c.conrelid::regclass::text = ANY(ARRAY[
      'resource_requirements','resource_allocations','policy_versions',
      'optimization_runs','optimization_decisions'
    ])
    GROUP BY c.conrelid::regclass::text, c.contype::text
    ORDER BY 1, 2
  `);
  const rowCounts = [];
  for (const table of orchestrationTables) {
    const [row] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
    rowCounts.push({ table, count: row.count });
  }
  const orphanChecks = await tx.$queryRawUnsafe(`
    SELECT 'resource_requirements_userId_fkey' AS name,
      count(*)::int AS count FROM resource_requirements c
      WHERE NOT EXISTS (SELECT 1 FROM users p WHERE p.id = c."userId")
    UNION ALL SELECT 'resource_requirements_bookingId_fkey', count(*)::int
      FROM resource_requirements c WHERE c."bookingId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM bookings p WHERE p.id = c."bookingId")
    UNION ALL SELECT 'resource_allocations_requirementId_fkey', count(*)::int
      FROM resource_allocations c WHERE c."requirementId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM resource_requirements p WHERE p.id = c."requirementId")
    UNION ALL SELECT 'resource_allocations_bookingId_fkey', count(*)::int
      FROM resource_allocations c WHERE c."bookingId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM bookings p WHERE p.id = c."bookingId")
    UNION ALL SELECT 'resource_allocations_resourceId_fkey', count(*)::int
      FROM resource_allocations c
      WHERE NOT EXISTS (SELECT 1 FROM resources p WHERE p.id = c."resourceId")
    UNION ALL SELECT 'resource_allocations_optimizationRunId_fkey', count(*)::int
      FROM resource_allocations c WHERE c."optimizationRunId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM optimization_runs p WHERE p.id = c."optimizationRunId")
    UNION ALL SELECT 'optimization_runs_policyVersionId_fkey', count(*)::int
      FROM optimization_runs c WHERE c."policyVersionId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM policy_versions p WHERE p.id = c."policyVersionId")
    UNION ALL SELECT 'optimization_decisions_runId_fkey', count(*)::int
      FROM optimization_decisions c
      WHERE NOT EXISTS (SELECT 1 FROM optimization_runs p WHERE p.id = c."runId")
    ORDER BY 1
  `);
  const [resourceType] = await tx.$queryRawUnsafe(`
    SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ResourceType'
  `);

  const expectedHashes = {
    columns_hash: "84a144a24ee7666515e49422dd21003e",
    constraints_hash: "3704215e93dc3e137987733758a2e925",
    indexes_hash: "10f0a84abfb2a1e5fa3fca8e91771b18",
  };
  const orchestrationChecks = {
    tableCount: columns.length,
    columnCounts: columns,
    indexCountsIncludingPrimaryKeys: indexes,
    constraintCounts: constraints,
    catalogHashes,
    expectedHashes,
    hashesMatch: Object.entries(expectedHashes).every(([key, value]) => catalogHashes[key] === value),
    resourceTypeLabels: resourceType.labels,
    resourceTypeDefaultAvailable: resourceType.labels.includes("gpu_server"),
    rowCounts,
    populatedTablesRequirePreservation: rowCounts.filter((item) => item.count > 0),
    orphanChecks,
    orphanCount: orphanChecks.reduce((sum, item) => sum + item.count, 0),
  };

  const guardExact = Object.entries(guardChecks).every(([key, value]) => {
    if (["extensionVersion", "definition", "expectedDefinition", "accessMethod"].includes(key)) return true;
    return typeof value === "boolean" ? value : value === 0;
  }) && guardChecks.accessMethod === "gist";
  const orchestrationExact = orchestrationChecks.tableCount === 5
    && orchestrationChecks.hashesMatch
    && orchestrationChecks.resourceTypeDefaultAvailable
    && orchestrationChecks.orphanCount === 0;

  return {
    identity,
    history: { recordedPendingMigrations: recorded },
    migrations: {
      [migrationNames[0]]: {
        classification: guardExact ? "EXACTLY_EQUIVALENT" : "NOT_EQUIVALENT",
        checks: guardChecks,
      },
      [migrationNames[1]]: {
        classification: orchestrationExact ? "EXACTLY_EQUIVALENT" : "NOT_EQUIVALENT",
        checks: orchestrationChecks,
      },
    },
  };
}

try {
  const hashes = await migrationHashes();
  const result = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return verify(tx);
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });
  const classifications = Object.values(result.migrations).map((item) => item.classification);
  assert.ok(classifications.every((value) => value === "EXACTLY_EQUIVALENT"),
    "A pending migration is not exactly equivalent; resolution is blocked");
  const report = {
    generatedAt: new Date().toISOString(),
    restoreDatabase: database,
    readOnly: true,
    migrationFileSha256: hashes,
    ...result,
    resolutionPermittedInBatch1C: false,
    isolatedBatch1DResolutionCandidate: database !== referenceDatabase,
    verdict: "PASS",
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    database,
    verdict: report.verdict,
    classifications: Object.fromEntries(Object.entries(report.migrations)
      .map(([name, item]) => [name, item.classification])),
    reportPath,
  }, null, 2));
} finally {
  await client.$disconnect();
}
