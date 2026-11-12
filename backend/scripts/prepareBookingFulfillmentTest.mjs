import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.FULFILLMENT_TEST_DATABASE_URL || 'http://missing');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_booking_fulfillment_test');
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.href } } });
try {
  if (!(await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname='lab_resources_booking_fulfillment_test'`).length) {
    await admin.$executeRawUnsafe('CREATE DATABASE lab_resources_booking_fulfillment_test');
  }
} finally { await admin.$disconnect(); }
const child = spawnSync(process.execPath, ['scripts/deployCanonicalMigrations.mjs'], { env: { ...process.env, DATABASE_URL: url.href }, stdio: 'inherit', windowsHide: true });
process.exitCode = child.status || (child.error ? 1 : 0);
