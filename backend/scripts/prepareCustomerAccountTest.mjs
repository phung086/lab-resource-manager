import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// A dedicated test database is required. Never reset/drop an existing database.
const url = new URL(process.env.CUSTOMER_TEST_DATABASE_URL || '');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_customer_test');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const migration = '20261012001000_customer_roles_and_booking_contact';
const deploy = extra => {
  const run = spawnSync(process.execPath, ['scripts/deployCanonicalMigrations.mjs'], {
    cwd: root, env: { ...process.env, DATABASE_URL: url.href, ...extra }, stdio: 'inherit'
  });
  assert.equal(run.status, 0, 'Forward migration deployment failed');
};
try {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_customer_test');
  const [tables] = await db.$queryRaw`SELECT to_regclass('public.users')::text AS users`;
  const applied = tables.users ? await db.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${migration} AND finished_at IS NOT NULL` : [];
  if (!tables.users) {
    const prefix = path.join(root, 'logs', 'customer-prisma-before');
    fs.mkdirSync(path.join(prefix, 'migrations'), { recursive: true });
    fs.copyFileSync(path.join(root,'prisma','schema.prisma'), path.join(prefix,'schema.prisma'));
    fs.cpSync(path.join(root,'prisma','baseline'), path.join(prefix,'baseline'), { recursive: true });
    for (const name of fs.readdirSync(path.join(root,'prisma','migrations'))) {
      if (name < migration) fs.cpSync(path.join(root,'prisma','migrations',name), path.join(prefix,'migrations',name), { recursive: true });
    }
    deploy({ LRM_MIGRATION_TEST_MODE: '1', LRM_MIGRATION_TEST_ROOT: prefix });
  }
  const emails = await db.$queryRaw`SELECT email FROM users`;
  assert.ok(emails.every(row => row.email.endsWith('@customer.test')), 'Unrelated accounts prohibit test preparation');
  if (!applied.length) {
    await db.$executeRaw`INSERT INTO users (id,email,"fullName",role,"passwordHash") VALUES ('customer-migration-student','student@customer.test','Existing Customer','STUDENT','migration-unchanged'),('customer-migration-lecturer','lecturer@customer.test','Another Customer','LECTURER','migration-unchanged') ON CONFLICT (id) DO NOTHING`;
    await db.$executeRaw`INSERT INTO system_audit_events (id,actor_id,actor_role_snapshot,action,target_type,target_id,before_state,after_state,metadata) VALUES ('customer-migration-audit','customer-migration-lecturer','LECTURER','USER_ROLE_CHANGED','USER','customer-migration-student','{"role":"STUDENT"}','{"role":"LECTURER"}','{"migrationTest":true}') ON CONFLICT (id) DO NOTHING`;
  } else {
    const [fixture] = await db.$queryRaw`SELECT id FROM system_audit_events WHERE id='customer-migration-audit' AND actor_role_snapshot='LECTURER'`;
    assert.ok(fixture, 'Already migrated test database lacks the predecessor fixture; use a fresh dedicated test database');
  }
  deploy({});
} finally { await db.$disconnect(); }
