import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHmac } from 'node:crypto';
import { publicAddress, callbackUrl, signingKey, signedHeaders, equalChallenge, postWebhook } from '../src/chatgptBridge/network.js';

test('callback rejects private, mapped, multicast and special addresses', () => {
  for (const ip of ['0.0.0.0', '10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.2.1',
    '100.64.1.2', '192.0.0.1', '192.0.2.1', '198.18.1.1', '198.51.100.2', '203.0.113.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', 'fc00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '2002:0808:0808::1', '2001::1'])
    assert.equal(publicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2001:4860:4860::8888']) assert.equal(publicAddress(ip), true, ip);
  for (const value of ['http://example.com', 'https://u:p@example.com', 'https://example.com:8443', 'https://example.com/#token', 'https://[::1]/', 'https://2130706433/'])
    assert.throws(() => callbackUrl(value));
});

test('standard webhook signature authenticates exact bytes and supports key rotation', () => {
  const key = Buffer.from('12345678901234567890123456789012'), secret = 'whsec_' + key.toString('base64');
  const oldSecret = 'whsec_' + Buffer.from('abcdefghijklmnopqrstuvwx').toString('base64');
  const body = '{"message":"Tiếng Việt"}', id = 'event_1', timestamp = 1720000000;
  const headers = signedHeaders(secret, id, body, { timestamp, oldSecret });
  const expected = createHmac('sha256', key).update(Buffer.from(`${id}.${timestamp}.${body}`)).digest('base64');
  assert.equal(headers['webhook-signature'].split(' ')[0], 'v1,' + expected);
  assert.equal(headers['webhook-signature'].split(' ').length, 2);
  assert.notEqual(headers['webhook-signature'], signedHeaders(secret, id, body + ' ', { timestamp, oldSecret })['webhook-signature']);
  assert.throws(() => signingKey('whsec_YQ=='));
  assert.throws(() => signingKey('whsec_' + key.toString('base64') + 'x'));
  assert.equal(equalChallenge('challenge', 'challenge'), true);
  assert.equal(equalChallenge('challenge', 'different'), false);
  assert.equal(equalChallenge('challenge', null), false);
});

test('DNS answer is checked and pinned to the HTTPS connection', async () => {
  let resolutionCount = 0, requestCount = 0, sent;
  const response = new EventEmitter(); response.statusCode = 200;
  const resolve = async () => { resolutionCount++; return [{ address: '8.8.8.8', family: 4 }]; };
  const request = (url, options, respond) => {
    requestCount++; assert.equal(url.hostname, 'receiver.example');
    assert.equal(options.servername, 'receiver.example'); assert.equal(options.rejectUnauthorized, true); assert.equal(options.agent, false);
    options.lookup('receiver.example', {}, (error, ip, family) => { assert.equal(error, null); assert.equal(ip, '8.8.8.8'); assert.equal(family, 4); });
    const req = new EventEmitter(); req.end = body => { sent = body; respond(response); queueMicrotask(() => { response.emit('data', Buffer.from('{"challenge":"yes"}')); response.emit('end'); }); };
    return req;
  };
  const result = await postWebhook('https://receiver.example/callback', { body: '{}', headers: {} }, { resolve, request });
  assert.equal(resolutionCount, 1); assert.equal(requestCount, 1); assert.equal(sent, '{}'); assert.equal(result.ok, true);
});

test('mixed public/private DNS and oversized payload never start a connection', async () => {
  const request = () => { throw new Error('must not connect'); };
  await assert.rejects(postWebhook('https://receiver.example', { body: '{}', headers: {} }, {
    resolve: async () => [{ address: '1.1.1.1', family: 4 }, { address: '127.0.0.1', family: 4 }], request
  }), error => error.reason === 'non_public_address');
  await assert.rejects(postWebhook('https://receiver.example', { body: 'x'.repeat(262145), headers: {} }, {
    resolve: async () => { throw new Error('must not resolve'); }, request
  }), error => error.reason === 'payload_too_large');
});

test('redirect response is returned without following its destination', async () => {
  let count = 0;
  const request = (_url, _options, respond) => {
    count++; const req = new EventEmitter(); req.end = () => {
      const res = new EventEmitter(); res.statusCode = 302; res.headers = { location: 'http://127.0.0.1' };
      respond(res); queueMicrotask(() => res.emit('end'));
    }; return req;
  };
  const result = await postWebhook('https://receiver.example', { body: '{}', headers: {} }, {
    resolve: async () => [{ address: '1.1.1.1', family: 4 }], request
  });
  assert.equal(result.status, 302); assert.equal(result.ok, false); assert.equal(count, 1);
});
