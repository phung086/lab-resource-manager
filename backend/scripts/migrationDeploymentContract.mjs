import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DATABASE_CLASSIFICATION = Object.freeze({
  EMPTY: "EMPTY",
  CLEAN_BASELINE: "CLEAN_BASELINE",
  RECOGNIZED_PRISMA_LINEAGE: "RECOGNIZED_PRISMA_LINEAGE",
  UNKNOWN_NONEMPTY: "UNKNOWN_NONEMPTY",
  INVALID_OR_PARTIAL: "INVALID_OR_PARTIAL"
});

export const CANONICAL_HASH_CONTRACT = "UTF-8 text, optional BOM removed, CRLF/CR normalized to LF, trailing newline preserved";

export function canonicalTextBuffer(filePath) {
  const raw = fs.readFileSync(filePath);
  let text = raw.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return Buffer.from(text.replace(/\r\n?/g, "\n"), "utf8");
}

export function canonicalFileSha256(filePath) {
  return crypto.createHash("sha256").update(canonicalTextBuffer(filePath)).digest("hex");
}

export function stableSha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function listMigrationNames(migrationsRoot) {
  return fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(migrationsRoot, entry.name, "migration.sql")))
    .map(entry => entry.name)
    .sort();
}

export function verifyFrozenBaselineArtifacts({ baselineRoot, migrationsRoot, manifest }) {
  const baselineSqlPath = path.join(baselineRoot, "migration.sql");
  const baselineSchemaPath = path.join(baselineRoot, "schema.prisma");
  for (const requiredPath of [baselineSqlPath, baselineSchemaPath]) {
    if (!fs.existsSync(requiredPath)) throw new Error(`missing frozen baseline artifact ${requiredPath}`);
  }
  if (path.basename(baselineRoot) !== manifest.baselineId) {
    throw new Error("baseline manifest identity does not match its immutable artifact directory");
  }
  if (manifest.hashContract !== CANONICAL_HASH_CONTRACT) {
    throw new Error("baseline manifest uses an unsupported artifact hash contract");
  }

  if (canonicalFileSha256(baselineSqlPath) !== manifest.baselineSqlSha256) {
    throw new Error("frozen baseline SQL integrity check failed");
  }
  if (canonicalFileSha256(baselineSchemaPath) !== manifest.baselineSchemaSha256) {
    throw new Error("frozen baseline schema integrity check failed");
  }
  if (!Array.isArray(manifest.includedMigrations) || manifest.includedMigrations.length === 0) {
    throw new Error("baseline manifest has no included migrations");
  }

  const repositoryMigrations = listMigrationNames(migrationsRoot);
  const seen = new Set();
  for (const [index, included] of manifest.includedMigrations.entries()) {
    if (!included || typeof included.name !== "string" || typeof included.sourceSha256 !== "string") {
      throw new Error(`invalid included migration entry at index ${index}`);
    }
    if (seen.has(included.name)) throw new Error(`duplicate included migration ${included.name}`);
    seen.add(included.name);
    if (repositoryMigrations[index] !== included.name) {
      throw new Error(`included migration sequence is not the canonical repository prefix at ${included.name}`);
    }
    const migrationPath = path.join(migrationsRoot, included.name, "migration.sql");
    if (!fs.existsSync(migrationPath)) throw new Error(`baseline manifest references missing migration ${included.name}`);
    if (canonicalFileSha256(migrationPath) !== included.sourceSha256) {
      throw new Error(`historical migration integrity check failed for ${included.name}`);
    }
  }

  if (!/^[a-f0-9]{64}$/.test(manifest.catalogFingerprintSha256 || "")) {
    throw new Error("baseline manifest has no valid catalog fingerprint");
  }
}

export async function readPublicCatalog(prisma) {
  return prisma.$queryRawUnsafe(`
    WITH catalog AS (
      SELECT 'relation'::text AS kind,
             c.relname::text AS identity,
             c.relkind::text AS definition
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
        AND c.relname <> '_prisma_migrations'

      UNION ALL

      SELECT 'column',
             c.relname || '.' || a.attname,
             pg_catalog.format_type(a.atttypid, a.atttypmod)
               || '|notnull=' || a.attnotnull::text
               || '|identity=' || a.attidentity::text
               || '|generated=' || a.attgenerated::text
               || '|default=' || COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '')
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm')
        AND c.relname <> '_prisma_migrations'
        AND a.attnum > 0
        AND NOT a.attisdropped

      UNION ALL

      SELECT 'constraint',
             c.relname || '.' || con.conname,
             con.contype::text || '|' || pg_catalog.pg_get_constraintdef(con.oid, true)
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname <> '_prisma_migrations'

      UNION ALL

      SELECT 'index',
             table_class.relname || '.' || index_class.relname,
             pg_catalog.pg_get_indexdef(index_class.oid)
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class index_class ON index_class.oid = i.indexrelid
      JOIN pg_catalog.pg_class table_class ON table_class.oid = i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = table_class.relnamespace
      WHERE n.nspname = 'public' AND table_class.relname <> '_prisma_migrations'

      UNION ALL

      SELECT 'type',
             t.typname,
             CASE WHEN t.typtype = 'e'
               THEN 'enum|' || COALESCE((
                 SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
                 FROM pg_catalog.pg_enum e WHERE e.enumtypid = t.oid
               ), '')
               ELSE 'domain|' || pg_catalog.format_type(t.typbasetype, t.typtypmod)
                    || '|notnull=' || t.typnotnull::text
                    || '|default=' || COALESCE(t.typdefault, '')
             END
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd')

      UNION ALL

      SELECT 'function',
             p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
             pg_catalog.pg_get_functiondef(p.oid)
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_depend dep
          WHERE dep.classid = 'pg_proc'::regclass
            AND dep.objid = p.oid
            AND dep.deptype = 'e'
        )

      UNION ALL

      SELECT 'trigger',
             c.relname || '.' || tg.tgname,
             pg_catalog.pg_get_triggerdef(tg.oid, true)
      FROM pg_catalog.pg_trigger tg
      JOIN pg_catalog.pg_class c ON c.oid = tg.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT tg.tgisinternal AND c.relname <> '_prisma_migrations'

      UNION ALL

      SELECT 'extension', e.extname, e.extversion
      FROM pg_catalog.pg_extension e
      JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
      WHERE n.nspname = 'public'
    )
    SELECT kind, identity, definition
    FROM catalog
    ORDER BY kind, identity, definition
  `);
}

export function catalogFingerprint(rows) {
  return stableSha256(rows.map(row => ({
    kind: row.kind,
    identity: row.identity,
    definition: row.definition
  })));
}

export function validateMigrationRows(rows, repositoryMigrations) {
  if (rows.length === 0) throw new Error("Prisma migration history is empty");
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.migration_name)) throw new Error(`duplicate Prisma migration ${row.migration_name}`);
    seen.add(row.migration_name);
    if (!repositoryMigrations.includes(row.migration_name)) {
      throw new Error(`foreign or unknown Prisma migration ${row.migration_name}`);
    }
    if (!row.finished_at || row.rolled_back_at || (row.logs && String(row.logs).trim())) {
      throw new Error(`unfinished, failed, or rolled-back Prisma migration ${row.migration_name}`);
    }
  }
  const appliedNames = rows.map(row => row.migration_name);
  for (const [index, name] of appliedNames.entries()) {
    if (repositoryMigrations[index] !== name) {
      throw new Error(`Prisma migration lineage is not a canonical prefix at ${name}`);
    }
  }
  return appliedNames;
}

export function classifyDatabase({ catalogRows, markerTablePresent, marker, migrationTablePresent, migrationRows, repositoryMigrations, includedMigrationNames }) {
  const hasUserObjects = catalogRows.length > 0;
  if (!hasUserObjects && !migrationTablePresent) {
    return { classification: DATABASE_CLASSIFICATION.EMPTY, appliedNames: [] };
  }

  let appliedNames = [];
  if (migrationTablePresent) {
    try {
      appliedNames = validateMigrationRows(migrationRows, repositoryMigrations);
    } catch (error) {
      return { classification: DATABASE_CLASSIFICATION.INVALID_OR_PARTIAL, reason: error.message, appliedNames: [] };
    }
  }

  if (markerTablePresent) {
    if (!marker) {
      const hasCompleteCanonicalOrigin = includedMigrationNames.every(name => appliedNames.includes(name));
      if (migrationTablePresent && hasCompleteCanonicalOrigin) {
        return { classification: DATABASE_CLASSIFICATION.RECOGNIZED_PRISMA_LINEAGE, appliedNames };
      }
      return { classification: DATABASE_CLASSIFICATION.INVALID_OR_PARTIAL, reason: "baseline marker table has no accepted marker row", appliedNames };
    }
    const includedApplied = includedMigrationNames.filter(name => appliedNames.includes(name));
    const includedPrefix = includedMigrationNames.slice(0, includedApplied.length);
    if (includedApplied.some((name, index) => name !== includedPrefix[index])) {
      return { classification: DATABASE_CLASSIFICATION.INVALID_OR_PARTIAL, reason: "baseline migration resolution is not a prefix", appliedNames };
    }
    if (includedApplied.length < includedMigrationNames.length) {
      if (appliedNames.length !== includedApplied.length) {
        return { classification: DATABASE_CLASSIFICATION.INVALID_OR_PARTIAL, reason: "forward migration exists before baseline resolution completed", appliedNames };
      }
      return { classification: DATABASE_CLASSIFICATION.CLEAN_BASELINE, appliedNames };
    }
    return { classification: DATABASE_CLASSIFICATION.RECOGNIZED_PRISMA_LINEAGE, appliedNames };
  }

  if (migrationTablePresent) {
    return { classification: DATABASE_CLASSIFICATION.RECOGNIZED_PRISMA_LINEAGE, appliedNames };
  }
  return { classification: DATABASE_CLASSIFICATION.UNKNOWN_NONEMPTY, appliedNames: [] };
}
