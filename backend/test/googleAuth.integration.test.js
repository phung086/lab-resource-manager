import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import net from 'node:net';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const database = new URL(process.env.GOOGLE_AUTH_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_google_auth_test', 'Refuse business/shared databases');
// Real loopback SMTP, isolated PostgreSQL, and locally signed test certificates.
// No external Google accounts, email recipients or production tokens are used.
const messages = [], sockets = new Set();
const smtp = net.createServer(socket => {
  sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  socket.setEncoding('utf8'); socket.write('220 google-auth-fixture.local ESMTP\r\n');
  let buffer = '', raw = '', recipient = '', data = false;
  socket.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\r\n')) {
      const index = buffer.indexOf('\r\n'), line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
      if (data) {
        if (line !== '.') { raw += line + '\r\n'; continue; }
        messages.push({ recipient, raw }); raw = ''; data = false; socket.write('250 Message accepted\r\n');
      } else if (/^EHLO /i.test(line)) socket.write('250-google-auth-fixture.local\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
      else if (/^AUTH PLAIN/i.test(line)) socket.write('235 Authenticated\r\n');
      else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)[1]; socket.write('250 OK\r\n'); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with dot\r\n'); }
      else if (/^QUIT$/i.test(line)) socket.end('221 Bye\r\n');
      else socket.write('250 OK\r\n');
    }
  });
});
await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
Object.assign(process.env, {
  DATABASE_URL:database.href, NODE_ENV:'test', LOG_FORMAT:'dev', RATE_LIMIT_MAX:'10000',
  GOOGLE_CLIENT_ID:'integration-fixture.apps.googleusercontent.com',
  JWT_SECRET:'isolated-google-auth-test-secret-at-least-32-characters',
  CORS_ORIGINS:'http://localhost:5173', PAYMENTS_ENABLED:'false',
  SMTP_HOST:'127.0.0.1', SMTP_PORT:String(smtp.address().port), SMTP_USER:'fixture', SMTP_PASS:'fixture-only',
  EMAIL_FROM:'"LAB Fixture" <sender@security.test>', EMAIL_APP_URL:'http://localhost:5173',
  EMAIL_AUTOMATION_ENABLED:'false', REMINDER_SCHEDULER_ENABLED:'false'
});
const [{prisma}, {createGoogleAuthService, verifyGoogleCredential}, {createGoogleAuthRouter}, {createApp}, {errorHandler}, {signUserToken, verifyUserToken}, {config}] = await Promise.all([
  import('../src/db.js'), import('../src/services/googleAuthService.js'), import('../src/routes/googleAuth.js'),
  import('../src/app.js'), import('../src/middleware/errors.js'), import('../src/services/authTokens.js'), import('../src/config.js')
]);
const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength:2048}), sdk = new OAuth2Client();
const verifier = {verifyIdToken:({idToken, audience, maxExpiry}) => sdk.verifySignedJwtWithCertsAsync(idToken,
  {'test-key':publicKey.export({type:'spki', format:'pem'})}, audience, ['https://accounts.google.com'], maxExpiry)};
const verify = (credential, nonce) => verifyGoogleCredential(credential, nonce, verifier);
const authenticate = createGoogleAuthService({verify});
const app = express(); app.use(express.json());
app.use('/api/auth/google', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, createGoogleAuthRouter((_req,_res,next) => next(), {authenticate}));
app.use(errorHandler); app.use(createApp());
const marker = randomUUID(), origin = 'http://localhost:5173', password = 'GoogleLink!2026';
const identity = label => ({sub:`${label}-${marker}`, email:`${label}-${marker}@gmail.com`});
const signed = (claims, nonce, options = {}) => jwt.sign({name:'Google integration fixture', email_verified:true, nonce,
  iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+300, ...claims}, privateKey,
  {algorithm:'RS256', keyid:'test-key', issuer:'https://accounts.google.com', audience:process.env.GOOGLE_CLIENT_ID, ...options});
async function challenge() {
  const agent = request.agent(app), response = await agent.get('/api/auth/google/challenge').set('Origin',origin);
  assert.equal(response.status,200); assert.equal(response.headers['cache-control'],'no-store');
  assert.ok(response.headers['set-cookie'][0].includes('HttpOnly')); assert.ok(response.headers['set-cookie'][0].includes('SameSite=Strict'));
  return {agent, nonce:response.body.nonce};
}
const submit = (ctx, claims, extra = {}, options = {}) => ctx.agent.post('/api/auth/google').set('Origin',origin)
  .send({nonce:ctx.nonce, credential:signed(claims,ctx.nonce,options), ...extra});
function error(response, status, code) { assert.equal(response.status,status); assert.equal(response.body.error?.code,code); }
const me = token => request(app).get('/api/auth/me').set('Authorization',`Bearer ${token}`);
let created, createdToken;
test.before(async () => assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name,'lab_resources_google_auth_test'));
test.after(async () => { await prisma.$disconnect(); for (const socket of sockets) socket.destroy(); await new Promise(resolve => smtp.close(resolve)); });

test('new verified identity creates only CUSTOMER and a persistent revocable session', async () => {
  const person = identity('new'), response = await submit(await challenge(),person);
  assert.equal(response.status,200); assert.equal(response.body.user.role,'CUSTOMER');
  assert.equal(response.body.user.passwordLoginEnabled,false);
  for (const privateField of ['passwordHash','googleSubject','authVersion']) assert.ok(!(privateField in response.body.user));
  created = await prisma.user.findUniqueOrThrow({where:{email:person.email}}); createdToken = response.body.accessToken;
  assert.equal(created.googleSubject,person.sub); assert.equal(created.passwordLoginEnabled,false);
  const payload = verifyUserToken(createdToken), session = await prisma.authSession.findUniqueOrThrow({where:{id:payload.sid}});
  assert.equal(session.userId,created.id); assert.equal((await me(createdToken)).status,200);
  const again = await submit(await challenge(),person); assert.equal(again.status,200); assert.equal(again.body.user.id,created.id);
  assert.equal(await prisma.user.count({where:{googleSubject:person.sub}}),1);
});

test('linking requires current password, preserves ADMIN role and revokes previous credentials', async () => {
  const person = identity('admin'), user = await prisma.user.create({data:{id:randomUUID(),email:person.email,role:'ADMIN',passwordHash:await bcrypt.hash(password,4)}});
  const previous = await signUserToken(user), ctx = await challenge();
  error(await submit(ctx,person),409,'GOOGLE_LINK_REQUIRED');
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:user.id}})).googleSubject,null);
  const response = await submit(ctx,person,{password}); assert.equal(response.status,200); assert.equal(response.body.user.role,'ADMIN');
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:user.id}})).authVersion,1);
  assert.equal((await me(previous)).status,401); assert.equal((await me(response.body.accessToken)).status,200);
  assert.equal(await prisma.systemAuditEvent.count({where:{targetId:user.id,action:'ACCOUNT_CREDENTIAL_CHANGED'}}),1);
});

test('wrong password, inactive/deleted accounts and identity collisions fail closed', async () => {
  for (const state of ['wrong','inactive','deleted','conflict']) {
    const person = identity(state), user = await prisma.user.create({data:{id:randomUUID(),email:person.email,role:'LAB_STAFF',passwordHash:await bcrypt.hash(password,4),
      ...(state==='inactive'?{isActive:false}:{}), ...(state==='deleted'?{deletedAt:new Date()}:{}), ...(state==='conflict'?{googleSubject:'other-'+marker}:{})}});
    error(await submit(await challenge(),person,{password:'WrongProof!2026'}),state==='conflict'?409:401,
      state==='conflict'?'GOOGLE_IDENTITY_CONFLICT':state==='wrong'?'AUTH_INVALID_CREDENTIALS':'ACCOUNT_INACTIVE');
    assert.equal(await prisma.authSession.count({where:{userId:user.id}}),0);
  }
  error(await submit(await challenge(),{sub:created.googleSubject,email:identity('changed').email}),409,'GOOGLE_EMAIL_CHANGED');
});

test('origin, challenge cookie, nonce and strict request schema reject client forgery', async () => {
  error(await request(app).get('/api/auth/google/challenge').set('Origin','https://foreign.example'),403,'FORBIDDEN');
  error(await request(app).get('/api/auth/google/challenge'),403,'FORBIDDEN');
  const person = identity('forged'), ctx = await challenge();
  error(await request(app).post('/api/auth/google').set('Origin',origin).send({nonce:ctx.nonce,credential:signed(person,ctx.nonce)}),401,'GOOGLE_INVALID_CREDENTIAL');
  error(await submit(await challenge(),person,{role:'ADMIN'}),400,'VALIDATION_ERROR');
  error(await submit(await challenge(),person,{email:person.email}),400,'VALIDATION_ERROR');
  error(await submit(await challenge(),person,{nonce:'a'.repeat(43)}),401,'GOOGLE_INVALID_CREDENTIAL');
  const expiredCookie = jwt.sign({nonce:ctx.nonce,iat:Math.floor(Date.now()/1000)-600},config.jwtSecret,
    {issuer:config.jwtIssuer,audience:'lab-google-sign-in',expiresIn:300});
  error(await request(app).post('/api/auth/google').set('Origin',origin).set('Cookie',`lrm_google_challenge=${expiredCookie}`)
    .send({nonce:ctx.nonce,credential:signed(person,ctx.nonce)}),401,'GOOGLE_INVALID_CREDENTIAL');
  assert.equal(await prisma.user.count({where:{email:person.email}}),0);
});

test('invalid Google audience/signature and non-authoritative third-party email create no account', async () => {
  const person = identity('untrusted');
  error(await submit(await challenge(),person,{}, {audience:'foreign-client'}),401,'GOOGLE_INVALID_CREDENTIAL');
  const ctx = await challenge(), parts = signed(person,ctx.nonce).split('.'); parts[1]=Buffer.from(JSON.stringify({...person,nonce:ctx.nonce})).toString('base64url');
  error(await ctx.agent.post('/api/auth/google').set('Origin',origin).send({nonce:ctx.nonce,credential:parts.join('.')}),401,'GOOGLE_INVALID_CREDENTIAL');
  error(await submit(await challenge(),{...person,email:`external-${marker}@security.test`}),403,'GOOGLE_EMAIL_UNVERIFIED');
  assert.equal(await prisma.user.count({where:{googleSubject:person.sub}}),0);
});

test('concurrent first sign-ins create one account and separate valid sessions', async () => {
  const person = identity('concurrent'), contexts = await Promise.all([challenge(),challenge()]);
  const results = await Promise.all(contexts.map(ctx=>submit(ctx,person)));
  assert.deepEqual(results.map(r=>r.status),[200,200]); assert.equal(results[0].body.user.id,results[1].body.user.id);
  assert.equal(await prisma.user.count({where:{googleSubject:person.sub}}),1);
  for (const result of results) assert.equal((await me(result.body.accessToken)).status,200);
});

test('session failure rolls back registration atomically', async () => {
  const person = identity('rollback'), nonce = 'rollback-nonce-with-at-least-32-characters';
  const failing = createGoogleAuthService({verify,issueToken:async()=>{throw new Error('session-fixture-failure');}});
  await assert.rejects(failing({credential:signed(person,nonce),nonce}),/session-fixture-failure/);
  assert.equal(await prisma.user.count({where:{googleSubject:person.sub}}),0);
});

test('Google-only account sets a password via delivered OTP; local accounts still require existing password', async () => {
  const sent = await request(app).post('/api/auth/password-otp/request').set('Authorization',`Bearer ${createdToken}`).send({});
  assert.equal(sent.status,200);
  const otp = messages.findLast(row=>row.recipient===created.email)?.raw.match(/\b\d{6}\b/)?.[0]; assert.ok(otp,'Loopback SMTP delivered recipient-bound OTP');
  const body = {challengeId:sent.body.challengeId,otp,newPassword:password};
  const changed = await request(app).post('/api/auth/change-password').set('Authorization',`Bearer ${createdToken}`).send(body);
  assert.equal(changed.status,200); assert.equal(changed.body.user.passwordLoginEnabled,true);
  assert.equal((await me(createdToken)).status,401);
  const login = await request(app).post('/api/auth/login').send({email:created.email,password}); assert.equal(login.status,200);
  error(await request(app).post('/api/auth/password-otp/request').set('Authorization',`Bearer ${login.body.accessToken}`).send({}),400,'CURRENT_PASSWORD_INVALID');
  error(await request(app).post('/api/auth/change-password').set('Authorization',`Bearer ${changed.body.accessToken}`).send(body),400,'OTP_ATTEMPTS_EXCEEDED');
});
