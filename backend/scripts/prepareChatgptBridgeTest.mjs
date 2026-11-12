import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
const databaseName = url.pathname.slice(1);
assert.ok(['lab_resources_chatgpt_bridge_test', 'lab_resources_chatgpt_actions_test'].includes(databaseName));
assert.equal(url.searchParams.get('schema') || 'public', 'public');
const administrativeUrl = new URL(url); administrativeUrl.pathname = '/postgres';
const admin = new PrismaClient({ datasources: { db: { url: administrativeUrl.href } } });
try {
  const rows = await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname=${databaseName}`;
  if (!rows.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`); // Fixed allowlist above; never accepts arbitrary SQL identifiers.
} finally { await admin.$disconnect(); }
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
try {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, databaseName);
  const [tables] = await db.$queryRaw`SELECT to_regclass('public.users')::text AS users`;
  if (tables.users) assert.ok((await db.$queryRaw`SELECT email FROM users`).every(row => row.email.endsWith('@bridge.test')), 'Unrelated users prohibit test preparation');
} finally { await db.$disconnect(); }
const run = spawnSync(process.execPath, ['scripts/deployCanonicalMigrations.mjs'], {
  env: { ...process.env, DATABASE_URL: url.href, LOG_FORMAT: 'dev' }, stdio: 'inherit'
});
assert.equal(run.status, 0, 'Canonical migration deployment failed');
