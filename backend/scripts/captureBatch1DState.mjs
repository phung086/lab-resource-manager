import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertTargetIdentity,
  batch1DClient,
  databaseArgument,
  jsonValue,
} from "../test/helpers/batch1dDatabase.js";

const backend = fileURLToPath(new URL("../", import.meta.url));
const docs = path.resolve(backend, "../docs");
const database = databaseArgument();
const outputArgument = process.argv.find((value) => value.startsWith("--output="));
assert.ok(outputArgument, "Required --output=<docs filename> argument is missing");
const output = path.resolve(docs, outputArgument.slice("--output=".length));
assert.equal(path.dirname(output), docs, "Snapshot output must remain in docs");
const client = await batch1DClient(database, { readOnly: true });

try {
  const snapshot = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const identity = await assertTargetIdentity(tx, database, { readOnly: true });
    const tables = await tx.$queryRawUnsafe(`
      SELECT tablename AS name FROM pg_tables
      WHERE schemaname = 'public' ORDER BY tablename
    `);
    const columns = await tx.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position, data_type, udt_name,
        is_nullable, column_default, datetime_precision
      FROM information_schema.columns
      WHERE table_schema = 'public' ORDER BY table_name, ordinal_position
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
    const migrations = await tx.$queryRawUnsafe(`
      SELECT migration_name, checksum, finished_at::text, rolled_back_at::text,
        applied_steps_count FROM public._prisma_migrations ORDER BY migration_name
    `);
    const rows = [];
    for (const { name } of tables) {
      const escaped = `"${name.replaceAll('"', '""')}"`;
      const [summary] = await tx.$queryRawUnsafe(`
        SELECT count(*)::int AS count,
          md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS content_digest
        FROM public.${escaped} t
      `);
      const hasId = columns.some((column) => column.table_name === name && column.column_name === "id");
      const ids = hasId
        ? await tx.$queryRawUnsafe(`SELECT id FROM public.${escaped} ORDER BY id`)
        : [];
      rows.push({ table: name, ...summary, ids: ids.map((item) => item.id) });
    }
    const [profile] = await tx.$queryRawUnsafe(`
      SELECT
        (SELECT jsonb_object_agg(role::text, count) FROM
          (SELECT role, count(*)::int AS count FROM users GROUP BY role) q) AS roles,
        (SELECT jsonb_object_agg(status::text, count) FROM
          (SELECT status, count(*)::int AS count FROM bookings GROUP BY status) q) AS booking_statuses,
        (SELECT count(*)::int FROM bookings WHERE status::text = 'no_show') AS booking_no_show,
        (SELECT count(*)::int FROM behavior_event_logs WHERE upper("eventType") = 'NO_SHOW') AS behavior_no_show,
        (SELECT count(*)::int FROM user_behavior_scores WHERE "noShowCount" > 0) AS users_with_no_show,
        (SELECT count(*)::int FROM telemetry_samples) AS telemetry_samples
    `);
    return { identity, tables, columns, enums, constraints, indexes, foreignKeys, migrations, rows, profile };
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });

  const normalized = jsonValue(snapshot);
  const report = {
    generatedAt: new Date().toISOString(),
    database,
    readOnly: true,
    catalogSha256: createHash("sha256").update(JSON.stringify({
      columns: normalized.columns,
      enums: normalized.enums,
      constraints: normalized.constraints,
      indexes: normalized.indexes,
      foreignKeys: normalized.foreignKeys,
    })).digest("hex"),
    ...normalized,
  };
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    database,
    tableCount: report.tables.length,
    migrationCount: report.migrations.length,
    applicationRows: report.rows.filter((item) => item.table !== "_prisma_migrations")
      .reduce((sum, item) => sum + item.count, 0),
    output,
  }, null, 2));
} finally {
  await client.$disconnect();
}
