import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import bcrypt from 'bcryptjs';

// Only the dedicated PostgreSQL test database and loopback SMTP are permitted.
export async function startAccountSecurityUiServer() {
  const configFile = process.env.ACCOUNT_SECURITY_UI_DATABASE_FILE;
  const databaseValue = process.env.ACCOUNT_SECURITY_TEST_DATABASE_URL ||
    (configFile && JSON.parse(readFileSync(configFile, 'utf8')).lab_resources_account_security_test);
  assert.ok(databaseValue, 'Provide ACCOUNT_SECURITY_TEST_DATABASE_URL or ACCOUNT_SECURITY_UI_DATABASE_FILE');
  const database = new URL(databaseValue);
  assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
  assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
  assert.equal(database.port, '25439');
  assert.equal(database.pathname, '/lab_resources_account_security_test', 'Refuse shared/business databases');
  const messages = [], sockets = new Set();
  const smtp = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8'); socket.write('220 security-ui.local ESMTP\r\n');
    let buffer = '', raw = '', recipient = '', data = false, auth = false;
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n'), line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line !== '.') { raw += line.replace(/^\.\./, '.') + '\r\n'; continue; }
          data = false; messages.push({ recipient, raw }); raw = '';
          socket.write('250 2.0.0 Accepted\r\n'); continue;
        }
        if (auth) { auth = false; socket.write('235 2.7.0 Authenticated\r\n'); }
        else if (/^EHLO /i.test(line)) socket.write('250-security-ui.local\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        else if (/^AUTH PLAIN/i.test(line)) {
          if (line.split(' ').length >= 3) socket.write('235 2.7.0 Authenticated\r\n');
          else { auth = true; socket.write('334 \r\n'); }
        } else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)[1]; socket.write('250 2.1.5 OK\r\n'); }
        else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with dot\r\n'); }
        else if (/^QUIT$/i.test(line)) socket.end('221 2.0.0 Bye\r\n');
        else socket.write('250 2.1.0 OK\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
  let prisma, server;
  try {
  Object.assign(process.env, {
    DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'tiny', RATE_LIMIT_MAX: '10000',
    JWT_SECRET: 'account-security-ui-isolated-secret-at-least-32-chars', PAYMENTS_ENABLED: 'false',
    CORS_ORIGINS: 'http://127.0.0.1:5185', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port),
    SMTP_USER: 'fixture', SMTP_PASS: 'fixture-only', EMAIL_FROM: '"LAB UI Fixture" <sender@security.test>',
    EMAIL_APP_URL: 'http://127.0.0.1:5185', EMAIL_AUTOMATION_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false',
    OPENAI_API_KEY: '', OPENAI_MODEL: '', MCP_ASSISTANT_ENABLED: 'false', HARDWARE_TELEMETRY_ENABLED: 'false'
  });
  const [{ createApp }, databaseModule] = await Promise.all([import('../../src/app.js'), import('../../src/db.js')]);
  prisma = databaseModule.prisma;
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_account_security_test');
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(user => user.email.endsWith('@security.test')));
  const password = 'SecurityUiFixture!2026', passwordHash = await bcrypt.hash(password, 4), users = {};
  const roleNames = { admin: 'ADMIN', staff: 'LAB_STAFF', customer: 'CUSTOMER' };
  for (const [name, role] of Object.entries(roleNames)) {
    users[name] = await prisma.user.upsert({
      where: { email: 'ui-' + name + '@security.test' },
      create: { id: '68323000-1310-4000-8000-' + ({ admin: '000000000001', staff: '000000000002', customer: '000000000003' }[name]), email: 'ui-' + name + '@security.test', fullName: 'UI ' + name, role, passwordHash },
      update: { fullName: 'UI ' + name, role, passwordHash, isActive: true, deletedAt: null, passwordResetRequired: false, authVersion: { increment: 1 } }
    });
    await prisma.passwordChallenge.updateMany({ where: { targetUserId: users[name].id }, data: { consumedAt: new Date(), createdAt: new Date(Date.now() - 61000) } });
  }
  server = await new Promise((resolve, reject) => {
    const candidate = createApp().listen(18043, '127.0.0.1', () => resolve(candidate)); candidate.once('error', reject);
  });
  return {
    users, password, prisma, runId: randomUUID(), api: 'http://127.0.0.1:18043/api',
    otp(recipient) {
      const mail = messages.findLast(row => row.recipient === recipient);
      assert.ok(mail, 'A real SMTP DATA transaction must reach the intended recipient');
      const code = mail.raw.match(/\b\d{6}\b/)?.[0]; assert.ok(code, 'The SMTP message must contain a six-digit OTP'); return code;
    },
    deliveredCount: () => messages.length,
    async close() {
      for (const socket of sockets) socket.destroy();
      server.closeAllConnections();
      await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => smtp.close(resolve))]);
      await prisma.$disconnect();
    }
  };
  } catch (cause) {
    for (const socket of sockets) socket.destroy();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await new Promise(resolve => smtp.close(resolve));
    if (prisma) await prisma.$disconnect();
    throw cause;
  }
}
