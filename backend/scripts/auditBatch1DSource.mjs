import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";
import { PrismaClient } from "@prisma/client";

const backend = fileURLToPath(new URL("../", import.meta.url));
const docs = path.resolve(backend, "../docs");
const rollback = JSON.parse(await readFile(path.join(docs, "BATCH1D_ROLLBACK_RESTORE.json"), "utf8"));
const env = parse(await readFile(path.join(backend, ".env")));
const url = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.pathname.slice(1), "lab_resources", "Audit script permits only the source database identity");
url.searchParams.set("schema", "public");
url.searchParams.set("options", "-c default_transaction_read_only=on");
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });

try {
  const comparison = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [identity] = await tx.$queryRawUnsafe(`
      SELECT current_database() AS database, current_setting('server_version') AS version,
        current_setting('transaction_read_only') AS read_only
    `);
    assert.equal(identity.database, "lab_resources");
    assert.equal(identity.read_only, "on");
    assert.ok(identity.version.startsWith("16."));
    const rows = [];
    for (const expected of rollback.rows) {
      const table = `"${expected.table.replaceAll('"', '""')}"`;
      const [actual] = await tx.$queryRawUnsafe(`
        SELECT count(*)::int AS count,
          md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS content_digest
        FROM public.${table} t
      `);
      assert.equal(actual.count, expected.count, `${expected.table} row count changed`);
      assert.equal(actual.content_digest, expected.content_digest, `${expected.table} content changed`);
      rows.push({ table: expected.table, count: actual.count, contentDigestMatches: true });
    }
    return { identity, rows };
  }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });
  const report = {
    generatedAt: new Date().toISOString(),
    database: "lab_resources",
    readOnly: true,
    comparedWith: rollback.database,
    tableCount: comparison.rows.length,
    totalRows: comparison.rows.reduce((sum, item) => sum + item.count, 0),
    allRowCountsAndContentDigestsMatch: true,
    verdict: "UNCHANGED",
  };
  const output = path.join(docs, "BATCH1D_SOURCE_AUDIT.json");
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.$disconnect();
}
