import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../", import.meta.url));
const reportPath = path.resolve(backend, "../docs/BATCH1B_VERIFICATION.json");
const database = "lab_resources_restore_b1a_pg16_20260917t090416z";
const mode = process.argv[2];
assert.ok(["--capture", "--verify"].includes(mode), "Use --capture or --verify");
const env = parse(await readFile(path.join(backend, ".env")));
const url = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only the local verified restore is allowed");
url.pathname = `/${database}`;
url.searchParams.set("schema", "public");
url.searchParams.set("options", "-c default_transaction_read_only=on");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const json = (value) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? Number(v) : v);
const digest = (value) => createHash("sha256").update(json(value)).digest("hex");
const quote = (identifier) => '"' + identifier.replaceAll('"', '""') + '"';

async function migrationHashes() {
  const root = path.join(backend, "prisma/migrations");
  const result = {};
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      result[entry.name] = createHash("sha256").update(await readFile(path.join(root, entry.name, "migration.sql"))).digest("hex");
    }
  }
  return result;
}

async function snapshot(tx) {
  const [identity] = await tx.$queryRaw`SELECT current_database() AS database,
    current_setting('server_version') AS version, current_setting('transaction_read_only') AS read_only`;
  assert.equal(identity.database, database);
  assert.equal(identity.read_only, "on");
  assert.ok(identity.version.startsWith("16."));
  const columns = await tx.$queryRaw`SELECT table_name, column_name, ordinal_position,
    data_type, udt_name, is_nullable, column_default, datetime_precision
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`;
  const enums = await tx.$queryRaw`SELECT t.typname AS name,
    array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`;
  const constraints = await tx.$queryRaw`SELECT c.conrelid::regclass::text AS table_name,
    c.conname AS name, c.contype::text AS type, c.convalidated AS validated,
    pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
    JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1,2`;
  const foreignKeys = await tx.$queryRaw`SELECT child.relname AS table_name, c.conname AS name,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    parent.relname AS target_table,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS target_columns,
    c.confdeltype::text AS on_delete, c.confupdtype::text AS on_update
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid
    JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public' AND c.contype='f' ORDER BY child.relname,c.conname`;
  const indexes = await tx.$queryRaw`SELECT t.relname AS table_name, i.relname AS name,
    x.indisprimary AS primary_key, x.indisunique AS unique_key, x.indisexclusion AS exclusion,
    ARRAY(SELECT a.attname::text FROM unnest(x.indkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    pg_get_indexdef(x.indexrelid) AS definition FROM pg_index x
    JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,i.relname`;
  const migrations = await tx.$queryRaw`SELECT id, migration_name, checksum, started_at::text,
    finished_at::text, rolled_back_at::text, applied_steps_count, logs FROM _prisma_migrations ORDER BY migration_name`;
  const extensions = await tx.$queryRaw`SELECT extname, extversion FROM pg_extension ORDER BY extname`;
  const tables = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  const rows = [];
  for (const { tablename } of tables) {
    // Table names come only from PostgreSQL's catalog. No row content is logged or exported.
    const [value] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count,
      md5(COALESCE(string_agg(row_to_json(t)::text, E'\n' ORDER BY id),'')) AS content_digest
      FROM public.${quote(tablename)} t`);
    rows.push({ table: tablename, ...value });
  }
  const orphans = [];
  for (const fk of foreignKeys) {
    const present = fk.columns.map(c => `c.${quote(c)} IS NOT NULL`).join(" AND ");
    const join = fk.columns.map((c, i) => `c.${quote(c)} = p.${quote(fk.target_columns[i])}`).join(" AND ");
    const [result] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public.${quote(fk.table_name)} c
      WHERE ${present} AND NOT EXISTS (SELECT 1 FROM public.${quote(fk.target_table)} p WHERE ${join})`);
    assert.equal(result.count, 0, `Orphans for ${fk.name}`);
    orphans.push({ name: fk.name, count: result.count });
  }
  return { identity, columns, enums, constraints, foreignKeys, indexes, migrations, extensions, rows, orphans };
}

function verifyDatamodel(catalog, schema) {
  const { models, enums } = Prisma.dmmf.datamodel;
  const tables = catalog.rows.filter(t => t.table !== "_prisma_migrations").map(t => t.table).sort();
  assert.deepEqual(models.map(m => m.dbName ?? m.name).sort(), tables);
  assert.equal(models.length, 31);
  for (const enumeration of enums) {
    const actual = catalog.enums.find(e => e.name === (enumeration.dbName ?? enumeration.name));
    assert.ok(actual, enumeration.name);
    assert.deepEqual(enumeration.values.map(v => v.dbName ?? v.name), actual.labels, enumeration.name);
  }
  assert.equal(enums.length, catalog.enums.length);
  const typeMap = { String: "text", Int: "integer", Float: "double precision", Boolean: "boolean", Json: "jsonb", DateTime: "timestamp without time zone" };
  const actions = { Cascade: "c", SetNull: "n", Restrict: "r", NoAction: "a", SetDefault: "d" };
  const relationResults = [];
  const representedIndexes = new Set();
  const physicalField = (model, name) => {
    const field = model.fields.find(f => f.name === name);
    assert.ok(field, `${model.name}.${name}`);
    return field.dbName ?? field.name;
  };
  const matchIndex = (model, fields, primary, unique) => {
    const physical = fields.map(f => physicalField(model, f));
    const table = model.dbName ?? model.name;
    const index = catalog.indexes.find(i => i.table_name === table && !i.exclusion &&
      i.primary_key === primary && i.unique_key === unique && json(i.columns) === json(physical));
    assert.ok(index, `Missing index ${table}(${physical}) primary=${primary} unique=${unique}`);
    representedIndexes.add(index.name);
  };
  for (const model of models) {
    const table = model.dbName ?? model.name;
    const scalarFields = model.fields.filter(f => f.kind !== "object");
    const columns = catalog.columns.filter(c => c.table_name === table);
    assert.deepEqual(scalarFields.map(f => f.dbName ?? f.name).sort(), columns.map(c => c.column_name).sort(), table);
    const block = schema.match(new RegExp(`model ${model.name} \\{([\\s\\S]*?)\\n\\}`))?.[1];
    assert.ok(block, model.name);
    for (const field of scalarFields) {
      const column = columns.find(c => c.column_name === (field.dbName ?? field.name));
      assert.equal(column.is_nullable, field.isRequired ? "NO" : "YES", `${table}.${field.name} nullability`);
      assert.equal(column.data_type, field.kind === "enum" ? "USER-DEFINED" : typeMap[field.type], `${table}.${field.name} type`);
      if (field.kind === "enum") {
        const enumeration = enums.find(e => e.name === field.type);
        assert.equal(column.udt_name, enumeration.dbName ?? enumeration.name);
      }
      if (field.type === "DateTime") assert.equal(column.datetime_precision, 3);
      assert.equal(field.isUpdatedAt, false, "No unverified client-side timestamp behavior in the baseline");
      if (column.column_default === null) assert.equal(field.hasDefaultValue, false, `${table}.${field.name} default`);
      else {
        assert.equal(field.hasDefaultValue, true, `${table}.${field.name} default`);
        let expected = field.default;
        if (field.kind === "enum") {
          const value = enums.find(e => e.name === field.type).values.find(v => v.name === expected);
          expected = value.dbName ?? value.name;
        }
        let actual = column.column_default.replace(/::[\s\S]*$/, "");
        if (actual.startsWith("'") && actual.endsWith("'")) actual = actual.slice(1, -1).replaceAll("''", "'");
        if (typeof expected === "object" && expected.name === "now") assert.equal(actual, "CURRENT_TIMESTAMP");
        else if (typeof expected === "number") assert.equal(Number(actual), expected);
        else assert.equal(actual, String(expected), `${table}.${field.name} default value`);
      }
      if (field.isId) matchIndex(model, [field.name], true, true);
      if (field.isUnique) matchIndex(model, [field.name], false, true);
    }
    // Prisma DMMF supplies relations/fields; these two schema attributes have no runtime DMMF equivalent.
    for (const match of block.matchAll(/@@(index|unique)\(\[([^\]]+)\]/g)) {
      const fields = match[2].split(",").map(v => v.trim());
      matchIndex(model, fields, false, match[1] === "unique");
    }
    for (const relation of model.fields.filter(f => f.relationFromFields?.length)) {
      const target = models.find(m => m.name === relation.type);
      const columns = relation.relationFromFields.map(f => physicalField(model, f));
      const fk = catalog.foreignKeys.find(f => f.table_name === table && json(f.columns) === json(columns));
      assert.ok(fk, `${model.name}.${relation.name}`);
      assert.equal(fk.target_table, target.dbName ?? target.name);
      assert.deepEqual(fk.target_columns, relation.relationToFields.map(f => physicalField(target, f)));
      const declaration = block.split("\n").find(line => line.trim().startsWith(relation.name + " "));
      const onUpdate = declaration?.match(/onUpdate:\s*(\w+)/)?.[1];
      assert.equal(actions[onUpdate], fk.on_update);
      assert.equal(actions[relation.relationOnDelete], fk.on_delete);
      relationResults.push({ model: model.name, relation: relation.name, foreignKey: fk.name,
        onDelete: relation.relationOnDelete, onUpdate });
    }
  }
  assert.equal(relationResults.length, 44);
  assert.equal(new Set(relationResults.map(r => r.foreignKey)).size, 44);
  const excludedIndexes = catalog.indexes.filter(i => !representedIndexes.has(i.name));
  assert.deepEqual(excludedIndexes.map(i => i.name).sort(), ["_prisma_migrations_pkey", "bookings_no_active_overlap"]);
  assert.deepEqual(enums.find(e => e.name === "Role").values.map(v => v.name), ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"]);
  return { models: models.length, columns: catalog.columns.length - 8, enums: enums.length,
    representedIndexes: representedIndexes.size, excludedIndexes: excludedIndexes.map(i => i.name), relations: relationResults };
}

async function smoke(tx, catalog) {
  const results = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    const delegate = model.name[0].toLowerCase() + model.name.slice(1);
    const count = await tx[delegate].count();
    const sample = await tx[delegate].findMany({ take: 1 });
    assert.equal(count, catalog.rows.find(r => r.table === (model.dbName ?? model.name)).count);
    // Query every relation, including empty tables; data itself never leaves this process.
    const relationships = model.fields.filter(f => f.kind === "object");
    for (const relation of relationships) {
      await tx[delegate].findMany({ take: 1, include: { [relation.name]: true } });
    }
    results.push({ model: model.name, table: model.dbName ?? model.name, count, scalarRead: "PASS", relationReads: relationships.length, samplePresent: sample.length > 0 });
  }
  const roles = await tx.user.groupBy({ by: ["role"], _count: true });
  const statuses = await tx.booking.groupBy({ by: ["status"], _count: true });
  await tx.booking.findMany({ where: { status: "LEGACY_NO_SHOW" }, select: { id: true } });
  await tx.resource.findMany({ where: { operationalStatus: "MAINTENANCE" }, select: { id: true } });
  const [noShow] = await tx.$queryRaw`SELECT
    (SELECT count(*)::int FROM bookings WHERE status='no_show') AS bookings,
    (SELECT count(*)::int FROM behavior_event_logs WHERE upper("eventType")='NO_SHOW') AS behavior_events,
    (SELECT count(*)::int FROM user_behavior_scores WHERE "noShowCount">0) AS users_with_count`;
  const statusDisagreements = await tx.$queryRaw`SELECT code, status::text AS compatibility_status,
    "operationalStatus"::text AS operational_status FROM resources
    WHERE status::text <> "operationalStatus"::text ORDER BY code`;
  return { models: results, roles, statuses, noShow, statusDisagreements };
}

try {
  const baseline = mode === "--verify" ? JSON.parse(await readFile(reportPath, "utf8")) : null;
  if (mode === "--capture") {
    try { await readFile(reportPath); throw new Error("Baseline already exists; refusing to overwrite"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const result = await client.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const catalog = await snapshot(tx);
    if (mode === "--capture") return { capturedAt: new Date().toISOString(), catalog, catalogHash: digest(catalog), migrationFiles: await migrationHashes() };
    assert.equal(digest(catalog), baseline.catalogHash, "Restored DB changed since baseline capture");
    assert.deepEqual(await migrationHashes(), baseline.migrationFiles, "Historical migration files changed");
    const schema = await readFile(path.join(backend, "prisma/schema.prisma"), "utf8");
    const datamodel = verifyDatamodel(catalog, schema);
    const reads = await smoke(tx, catalog);
    const after = await snapshot(tx);
    assert.equal(digest(after), baseline.catalogHash, "Restore changed during read smoke");
    return { ...baseline, verifiedAt: new Date().toISOString(), prismaVersion: Prisma.prismaVersion.client,
      schemaSha256: createHash("sha256").update(schema).digest("hex"), datamodel, reads,
      verdict: "PASS", unchangedRestore: true, unchangedHistoricalMigrations: true };
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });
  await writeFile(reportPath, JSON.stringify(JSON.parse(json(result)), null, 2) + "\n");
  console.log(JSON.stringify({ mode, database, verdict: result.verdict ?? "BASELINE_CAPTURED",
    rows: result.catalog.rows.map(({ table, count }) => ({ table, count })),
    datamodel: result.datamodel && { models: result.datamodel.models, columns: result.datamodel.columns,
      enums: result.datamodel.enums, indexes: result.datamodel.representedIndexes, foreignKeys: result.datamodel.relations.length },
    relationReads: result.reads?.models.reduce((sum, model) => sum + model.relationReads, 0), reportPath }, null, 2));
} catch (error) {
  // Prisma errors can include connection details; expose only assertion context or a code.
  console.error(error.code === "ERR_ASSERTION" ? error.message : `Verification failed (${error.code ?? error.name}); no fallback used.`);
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
