import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../", import.meta.url));
const database = process.argv.find((value) => value.startsWith("--database="))?.slice(11);
const output = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const allowDevelopment = process.argv.includes("--allow-development");
assert.ok(database && output, "--database and --output are required");
if (database === "lab_resources") {
  assert.ok(allowDevelopment, "Development DB requires explicit --allow-development");
} else {
  assert.match(database, /^lab_resources_b1e_[a-z0-9_]+$/, "Only explicit Batch 1E databases are allowed");
}

const env = parse(await readFile(path.join(backend, ".env")));
const url = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only local PostgreSQL is allowed");
url.pathname = `/${database}`;
url.searchParams.set("schema", "public");
url.searchParams.set("options", "-c default_transaction_read_only=on");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

try {
  const snapshot = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [identity] = await tx.$queryRawUnsafe(`
      SELECT current_database() AS database, current_user AS database_user,
        current_setting('server_version') AS version,
        current_setting('server_version_num') AS version_number,
        current_setting('transaction_read_only') AS read_only
    `);
    assert.equal(identity.database, database);
    assert.ok(identity.version.startsWith("16."));
    assert.equal(identity.read_only, "on");

    const tables = await tx.$queryRawUnsafe(`
      SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    const columns = await tx.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position, data_type, udt_name,
        is_nullable, column_default, datetime_precision
      FROM information_schema.columns WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const enums = await tx.$queryRawUnsafe(`
      SELECT t.typname AS name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname
    `);
    const constraints = await tx.$queryRawUnsafe(`
      SELECT c.conrelid::regclass::text AS table_name, c.conname AS name,
        c.contype::text AS type, c.convalidated AS validated,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' ORDER BY 1, 2
    `);
    const indexes = await tx.$queryRawUnsafe(`
      SELECT t.relname AS table_name, i.relname AS name,
        x.indisprimary AS primary_key, x.indisunique AS unique_key,
        x.indisexclusion AS exclusion, pg_get_indexdef(x.indexrelid) AS definition
      FROM pg_index x JOIN pg_class t ON t.oid = x.indrelid
      JOIN pg_class i ON i.oid = x.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' ORDER BY t.relname, i.relname
    `);
    const foreignKeys = await tx.$queryRawUnsafe(`
      SELECT child.relname AS table_name, c.conname AS name,
        parent.relname AS target_table, c.confdeltype::text AS on_delete,
        c.confupdtype::text AS on_update, c.convalidated AS validated,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class child ON child.oid = c.conrelid
      JOIN pg_class parent ON parent.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'f' ORDER BY child.relname, c.conname
    `);
    const triggers = await tx.$queryRawUnsafe(`
      SELECT c.relname AS table_name, t.tgname AS name, t.tgenabled::text AS enabled,
        pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal ORDER BY c.relname, t.tgname
    `);
    const migrations = await tx.$queryRawUnsafe(`
      SELECT migration_name, checksum, finished_at::text, rolled_back_at::text,
        applied_steps_count FROM public._prisma_migrations ORDER BY migration_name
    `);

    const rows = [];
    for (const { name } of tables) {
      const table = quote(name);
      const [summary] = await tx.$queryRawUnsafe(`
        SELECT count(*)::int AS count,
          md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS content_digest
        FROM public.${table} t
      `);
      const hasId = columns.some((column) => column.table_name === name && column.column_name === "id");
      const ids = hasId ? await tx.$queryRawUnsafe(`SELECT id FROM public.${table} ORDER BY id`) : [];
      rows.push({ table: name, ...summary, ids: ids.map((item) => item.id) });
    }

    const foreignKeyColumns = await tx.$queryRawUnsafe(`
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
    for (const fk of foreignKeyColumns) {
      const present = fk.columns.map((column) => `c.${quote(column)} IS NOT NULL`).join(" AND ");
      const join = fk.columns.map((column, index) => `c.${quote(column)} = p.${quote(fk.target_columns[index])}`).join(" AND ");
      const [result] = await tx.$queryRawUnsafe(`
        SELECT count(*)::int AS count FROM public.${quote(fk.table_name)} c
        WHERE ${present} AND NOT EXISTS (
          SELECT 1 FROM public.${quote(fk.target_table)} p WHERE ${join}
        )
      `);
      orphans.push({ name: fk.name, count: result.count });
    }

    const hasResourceCategory = columns.some((column) => column.table_name === "resources" && column.column_name === "category");
    const [facts] = await tx.$queryRawUnsafe(`
      SELECT
        (SELECT count(*)::int FROM bookings WHERE "startAt" >= "endAt") AS invalid_bookings,
        (SELECT count(*)::int FROM maintenance_windows WHERE "startAt" >= "endAt") AS invalid_maintenance,
        (SELECT count(*)::int FROM telemetry_samples) AS telemetry_samples,
        ${hasResourceCategory
          ? "(SELECT count(*)::int FROM resources WHERE category IS NULL)"
          : "NULL::int"} AS unresolved_categories
    `);
    return { identity, tables, columns, enums, constraints, indexes, foreignKeys, triggers, migrations, rows, orphans, facts };
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });

  const normalized = JSON.parse(JSON.stringify(snapshot, (_, value) => typeof value === "bigint" ? Number(value) : value));
  const catalog = {
    columns: normalized.columns,
    enums: normalized.enums,
    constraints: normalized.constraints,
    indexes: normalized.indexes,
    foreignKeys: normalized.foreignKeys
  };
  const report = {
    generatedAt: new Date().toISOString(),
    database,
    catalogSha256: createHash("sha256").update(JSON.stringify(catalog)).digest("hex"),
    ...normalized
  };
  await writeFile(path.resolve(output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    database,
    tableCount: report.tables.length,
    migrationCount: report.migrations.length,
    totalRows: report.rows.reduce((sum, row) => sum + row.count, 0),
    catalogSha256: report.catalogSha256,
    orphanCount: report.orphans.reduce((sum, item) => sum + item.count, 0)
  }));
} finally {
  await client.$disconnect();
}
