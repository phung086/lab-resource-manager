import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManagedUser } from './src/utils/userValidation.ts';
const valid = { fullName: '  Lab User  ', email: '  USER@lrm.local ', password: ' a secure password ', role: 'CUSTOMER' };
test('normalizes identity but preserves password exactly', () => { const r = validateManagedUser(valid); assert.equal(r.data.fullName, 'Lab User'); assert.equal(r.data.email, 'user@lrm.local'); assert.equal(r.data.password, valid.password); });
test('empty form identifies every required field', () => assert.deepEqual(Object.keys(validateManagedUser({ fullName: '', email: '', password: '', role: '' }).errors), ['fullName', 'email', 'password', 'role']));
test('rejects malformed identity and noncanonical role', () => { const r = validateManagedUser({ ...valid, email: 'hello@', role: 'STAFF' }); assert.deepEqual(Object.keys(r.errors), ['email', 'role']); });
test('enforces API name and password boundaries', () => { for (const length of [1, 256]) assert.ok(validateManagedUser({ ...valid, fullName: 'n'.repeat(length) }).errors.fullName); for (const length of [11, 129]) assert.ok(validateManagedUser({ ...valid, password: 'p'.repeat(length) }).errors.password); for (const length of [12, 128]) assert.ok(validateManagedUser({ ...valid, password: 'p'.repeat(length) }).data); });
