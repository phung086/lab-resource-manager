import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeAuth, validateAuth, authFailure, serverAuthFields } from './src/components/features/auth/authValidation.js';
const valid = { email: ' learner+lab@school.edu.vn ', password: ' 12345678 ', fullName: ' Mai Phuong ', phone: '', studentId: '', department: '', organization: '', address: { provinceCode: '01', wardCode: '00001', addressLine: ' Building A ' } };
test('empty and malformed login are rejected; normalized email and password bytes are preserved', () => {
  assert.deepEqual(Object.keys(validateAuth({ email: '', password: '' }, 'login')), ['email', 'password']);
  for (const email of ['broken', '.a@school.edu.vn', 'a..b@school.edu.vn', 'a @school.edu.vn']) assert.ok(validateAuth({ email, password: valid.password }, 'login').email);
  assert.deepEqual(validateAuth(valid, 'login'), {});
  const data = normalizeAuth(valid);
  assert.equal(data.email, 'learner+lab@school.edu.vn'); assert.equal(data.fullName, 'Mai Phuong'); assert.equal(data.password, valid.password); assert.equal(valid.address.addressLine, ' Building A ');
});
test('current login compatibility and registration boundaries are distinct', () => {
  assert.equal(validateAuth({ ...valid, password: 'x'.repeat(129) }, 'login').password, undefined);
  assert.ok(validateAuth({ ...valid, password: 'x'.repeat(129) }, 'register').password);
  for (const length of [8, 128]) assert.equal(validateAuth({ ...valid, password: 'x'.repeat(length) }, 'register').password, undefined);
  assert.ok(validateAuth({ ...valid, password: '1234567' }, 'register').password);
  assert.deepEqual(validateAuth({ email: valid.email, password: valid.password }, 'register'), {});
  assert.equal(validateAuth(valid, 'register').phone, undefined); // API phone is optional.
  assert.equal(validateAuth({ ...valid, phone: 'x'.repeat(21) }, 'register').phone, undefined);
});
test('registration does not require personal contact or administrative address', () => {
  assert.deepEqual(validateAuth(valid, 'register'), {});
  const errors = validateAuth({ ...valid, address: { provinceCode: '', wardCode: '', addressLine: 'a' } }, 'register');
  assert.deepEqual(errors, {});
});
test('credential errors stay generic, transport and availability failures remain distinct', () => {
  for (const code of ['AUTH_INVALID', 'AUTH_INVALID_CREDENTIALS']) assert.equal(authFailure({ code }, 'login'), 'api.AUTH_INVALID_CREDENTIALS');
  assert.equal(authFailure({ code: 'DUPLICATE_EMAIL' }, 'register'), 'ui.email_already_registered_please_login_4d3e2f1a');
  for (const code of ['NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'RATE_LIMITED', 'ACCOUNT_INACTIVE', 'ADDRESS_SOURCE_UNAVAILABLE']) assert.equal(authFailure({ code }, 'register'), `api.${code}`);
  assert.equal(authFailure({ message: 'Failed to fetch Prisma SELECT password' }, 'login'), 'ui.auth_service_error');
});
test('server details map only known fields; internals never become rendered messages', () => {
  const errors = serverAuthFields({ code: 'VALIDATION_ERROR', details: { fieldErrors: { email: ['Prisma internals'], role: ['ADMIN'], address: ['internal schema'] } } }, 'register');
  assert.deepEqual(Object.keys(errors), ['email']);
  assert.equal(errors.email, 'ui.invalid_email_format_b9c6e7d2');
  assert.deepEqual(serverAuthFields({ code: 'VALIDATION_ERROR', details: { field: 'wardCode' } }, 'register'), {});
});
test('all validation and failure descriptors have VI/EN messages, with matching parameters', () => {
  const vi = JSON.parse(readFileSync(new URL('./src/locales/catalog/vi.json', import.meta.url))).messages;
  const en = JSON.parse(readFileSync(new URL('./src/locales/catalog/en.json', import.meta.url))).messages;
  const messages = [...Object.values(validateAuth({ ...valid, email: '', password: '', fullName: '', phone: 'x'.repeat(21), address: { provinceCode: '', wardCode: '', addressLine: 'x' } }, 'register')), ...['NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'RATE_LIMITED', 'DATABASE_UNAVAILABLE', 'AUTH_FORBIDDEN', 'VALIDATION_ERROR'].map(code => authFailure({ code }, 'login')), 'ui.auth_fix_fields', 'ui.auth_address_retry', 'ui.auth_service_error'];
  for (const message of messages) { const key = typeof message === 'string' ? message : message.key; assert.equal(typeof vi[key], 'string', key); assert.equal(typeof en[key], 'string', key); }
});
