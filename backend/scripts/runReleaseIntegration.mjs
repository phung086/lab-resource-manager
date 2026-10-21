import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// A fresh, disposable PostgreSQL instance is required. Never reset a database.
const backend = fileURLToPath(new URL('../', import.meta.url));
let base;
try { base = new URL(process.env.RELEASE_TEST_ADMIN_URL || 'http://missing'); }
catch { throw new Error('RELEASE_TEST_ADMIN_URL must be a valid isolated PostgreSQL URL'); }
assert.equal(base.protocol, 'postgresql:');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname));
assert.equal(base.port, '25439', 'Use the dedicated release-test PostgreSQL port');
assert.equal(base.pathname, '/postgres');
const output = path.resolve(process.env.RELEASE_TEST_OUTPUT || path.join(backend, 'logs/release-integration'));
await mkdir(output, { recursive: true });

const suites = [
  ['planning', 'planning', 'PLANNING_TEST_URL', ['planning.integration.test.js']],
  ['operational-audit', 'operational_audit', 'OPERATIONAL_AUDIT_TEST_URL', ['operationalAudit.integration.test.js']],
  ['sessions', 'sessions', 'SESSION_TEST_DATABASE_URL', ['authSessions.integration.test.js']],
  ['guest', 'guest_integrity', 'GUEST_PHASE_D_DATABASE_URL', ['guestBookingIntegrity.integration.test.js']],
  ['concurrency', 'b1d_release', 'BATCH1D_DATABASES', ['bookingConcurrency.db.test.js', 'persistenceMigration.test.js']],
  ['auth-rbac', 'b2_auth_release', 'BATCH2_DATABASE', ['batch2.auth-rbac.integration.test.js']],
  ['resources', 'b3_resource_release', 'BATCH3_DATABASE', ['batch3.resource-management.integration.test.js']],
  ['calendar', 'b4_booking_release', 'BATCH4_DATABASE', ['batch4.booking-calendar.integration.test.js']],
  ['operations', 'b5_operations_release', 'BATCH5_DATABASE', ['batch5.operational-workflow.integration.test.js']],
  ['incidents', 'b6_monitoring_release', 'BATCH6_DATABASE', ['batch6.notifications-incidents-dashboard.integration.test.js']],
  ['hardening', 'b7_demo_release', 'BATCH7_DATABASE', ['batch7.production-demo-hardening.integration.test.js']],
  ['telemetry', 'b8_monitoring_release', 'BATCH8_DATABASE', ['batch8.smart-monitoring.integration.test.js']],
  ['customer', 'customer', 'CUSTOMER_TEST_DATABASE_URL', ['customerAccount.integration.test.js']],
  ['accounts', 'account_security', 'ACCOUNT_SECURITY_TEST_DATABASE_URL', ['accountSecurity.integration.test.js']],
  ['loyalty', 'loyalty', 'LOYALTY_TEST_DATABASE_URL', ['loyalty.integration.test.js']],
  ['fulfillment', 'booking_fulfillment', 'FULFILLMENT_TEST_DATABASE_URL', ['bookingFulfillment.integration.test.js']],
  ['payment-hold', 'payment_hold', 'PAYMENT_HOLD_TEST_DATABASE_URL', ['paymentHold.integration.test.js']],
  ['support', 'support', 'SUPPORT_TEST_DATABASE_URL', ['support.integration.test.js']],
  ['email', 'email', 'EMAIL_TEST_DATABASE_URL', ['emailAutomation.integration.test.js']],
  ['monitoring', 'monitoring', 'MONITORING_TEST_DATABASE_URL', ['resourceCare.integration.test.js']],
  ['workspace', 'workspace', 'LAB_WORKSPACE_TEST_URL', ['labWorkspace.integration.test.js']],
  ['queues', 'queue_pagination', 'QUEUE_TEST_DATABASE_URL', ['queuePagination.integration.test.js']],
  ['assistant', 'assistant', 'ASSISTANT_TEST_DATABASE_URL', ['assistant.integration.test.js']],
  ['reports', 'assistant', 'OPERATIONS_REPORT_TEST_DATABASE_URL', ['operationsReport.integration.test.js']],
  ['bridge', 'chatgpt_bridge', 'CHATGPT_BRIDGE_TEST_DATABASE_URL', ['chatgptBridge.integration.test.js', 'chatgptBridgeEvents.integration.test.js']],
];
const selected = process.argv.slice(2);
assert.ok(selected.every(name => suites.some(row => row[0] === name)), 'Unknown suite');
const targets = selected.length ? suites.filter(row => selected.includes(row[0])) : suites;
const databaseName = row => `lab_resources_${row[1]}_test`;
const urlFor = name => { const url = new URL(base); url.pathname = `/${name}`; return url.href; };
const env = {
  ...process.env, NODE_ENV: 'test', LOG_FORMAT: 'dev',
  JWT_SECRET: 'release-isolated-test-secret-at-least-32-characters',
  REMINDER_SCHEDULER_ENABLED: 'false', EMAIL_AUTOMATION_ENABLED: 'false',
  PAYMENTS_ENABLED: 'false', VNPAY_ENABLED: 'false', VNPAY_TMN_CODE: '', VNPAY_HASH_SECRET: '',
  CHATGPT_BRIDGE_ENABLED: 'false', MCP_ASSISTANT_ENABLED: 'false',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', OPENAI_API_KEY: '', OPENAI_MODEL: '',
};
const admin = new PrismaClient({ datasources: { db: { url: base.href } } });
try {
  const [{ version }] = await admin.$queryRaw`SELECT current_setting('server_version') AS version`;
  assert.match(version, /^16\./);
  const existing = await admin.$queryRaw`SELECT datname FROM pg_database`;
  for (const name of new Set(targets.map(databaseName))) {
    assert.ok(!existing.some(row => row.datname === name), `${name} exists; use a fresh isolated instance, never overwrite it`);
  }
  for (const name of new Set(targets.map(databaseName))) {
    assert.match(name, /^lab_resources_[a-z0-9_]+_test$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  }
} finally { await admin.$disconnect(); }

async function run(args, environment, filename) {
  const log = await open(path.join(output, filename), 'w');
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd: backend, env: environment, stdio: ['ignore', log.fd, log.fd], windowsHide: true });
      const timeout = setTimeout(() => child.kill(), 240_000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', (code, signal) => { clearTimeout(timeout); resolve({ code, signal }); });
    });
  } finally { await log.close(); }
}

const results = [], migrated = new Set();
for (const row of targets) {
  const [name, , variable, files] = row, database = databaseName(row);
  const environment = { ...env, DATABASE_URL: urlFor(database), [variable]: variable.startsWith('BATCH') ? database : urlFor(database) };
  const started = Date.now();
  if (!migrated.has(database)) {
    const preparation = name === 'customer' ? 'scripts/prepareCustomerAccountTest.mjs' : 'scripts/deployCanonicalMigrations.mjs';
    const migration = await run([preparation], environment, `${name}-migration.log`);
    if (migration.code !== 0) {
      results.push({ name, stage: 'migration', ...migration });
      console.log(`${name}: migration FAIL`);
      continue;
    }
    migrated.add(database);
  }
  const result = await run(['--test', '--test-concurrency=1', ...files.map(file => `test/${file}`)], environment, `${name}.log`);
  results.push({ name, stage: 'test', ...result, durationMs: Date.now() - started });
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`${name}: ${result.code === 0 ? 'PASS' : 'FAIL'} (${Math.round((Date.now() - started) / 1000)}s)`);
}
await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
process.exitCode = results.some(row => row.code !== 0) ? 1 : 0;
