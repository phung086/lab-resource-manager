import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { managedUserServerFields, validateManagedUser, validateManagedUserEdit } from './src/utils/userValidation.ts';
import { passwordServerFields, safePasswordFailure, validatePasswordCode, validatePasswordDraft } from './src/utils/accountSecurityValidation.js';
import { validateLoyaltyPolicy } from './src/utils/loyaltyPolicyValidation.js';

const account = { fullName: ' Mai Phuong ', email: ' CUSTOMER+lab@school.edu.vn ', password: ' initial-secret ', role: 'CUSTOMER', phone: ' 0912345678 ', organization: ' Open LAB ' };
test('managed customer creation normalizes contact while preserving password bytes and enforcing staff role boundary', () => {
  const result = validateManagedUser(account, 'LAB_STAFF');
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.email, 'customer+lab@school.edu.vn'); assert.equal(result.data.fullName, 'Mai Phuong');
  assert.equal(result.data.phone, '0912345678'); assert.equal(result.data.password, account.password);
  for (const role of ['ADMIN', 'LAB_STAFF', 'STUDENT']) assert.ok(validateManagedUser({ ...account, role }, 'LAB_STAFF').errors.role);
  assert.ok(validateManagedUser(account, 'CUSTOMER').errors.role);
  assert.equal(validateManagedUser({ ...account, role: 'LAB_STAFF' }, 'ADMIN').data.role, 'LAB_STAFF');
});
test('managed account fields enforce credential and contact boundaries without guessing email or optional contact', () => {
  for (const password of ['x'.repeat(11), 'x'.repeat(129)]) assert.ok(validateManagedUser({ ...account, password }).errors.password);
  for (const email of ['x', '.a@school.edu.vn', 'a..b@school.edu.vn']) assert.ok(validateManagedUser({ ...account, email }).errors.email);
  for (const password of ['x'.repeat(12), 'x'.repeat(128)]) assert.equal(validateManagedUser({ ...account, password }).errors.password, undefined);
  assert.deepEqual(validateManagedUserEdit({ fullName: 'Customer', phone: '', organization: '' }).errors, {});
  assert.ok(validateManagedUserEdit({ fullName: '', phone: '12345', organization: 'x'.repeat(161) }).errors.organization);
  assert.ok(validateManagedUserEdit({ fullName: 'Customer', phone: '12345', organization: '' }).errors.phone);
});
test('self password drafts require current password, different new password and matching confirmation', () => {
  assert.deepEqual(validatePasswordDraft({ currentPassword: 'current-secret', newPassword: ' new-secret ', confirmPassword: ' new-secret ' }), {});
  assert.ok(validatePasswordDraft({ currentPassword: 'short', newPassword: 'valid-new-secret', confirmPassword: 'different' }).currentPassword);
  assert.ok(validatePasswordDraft({ currentPassword: 'same-secret', newPassword: 'same-secret', confirmPassword: 'same-secret' }).newPassword);
  assert.ok(validatePasswordDraft({ currentPassword: 'current-secret', newPassword: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) }).newPassword);
});
test('assisted password draft omits current password but retains new-password and confirmation checks', () => {
  assert.deepEqual(validatePasswordDraft({ currentPassword: '', newPassword: 'new-secret', confirmPassword: 'new-secret' }, true), {});
  assert.ok(validatePasswordDraft({ currentPassword: '', newPassword: 'short', confirmPassword: 'short' }, true).newPassword);
  assert.ok(validatePasswordDraft({ currentPassword: '', newPassword: 'new-secret', confirmPassword: '' }, true).confirmPassword);
  assert.deepEqual(validatePasswordCode('012345'), {});
  for (const code of ['', '12345', '1234567', '1e1234', ' 123456', '１２３４５６']) assert.ok(validatePasswordCode(code).otp);
});
test('server issues map only safe editable fields and secret transport text is never shown', () => {
  assert.deepEqual(passwordServerFields({ code: 'CURRENT_PASSWORD_INVALID' }), { currentPassword: 'ui.customer.currentPasswordInvalid' });
  assert.deepEqual(passwordServerFields({ code: 'OTP_EXPIRED' }), { otp: 'api.OTP_EXPIRED' });
  assert.deepEqual(passwordServerFields({ code: 'VALIDATION_ERROR', details: { fieldErrors: { newPassword: ['raw secret'], token: ['private'] } } }), { newPassword: 'ui.account.newPasswordLength' });
  assert.deepEqual(managedUserServerFields({ code: 'VALIDATION_ERROR', details: { fieldErrors: { phone: ['private data'], passwordHash: ['hash'] } } }), { phone: 'ui.customer.phoneInvalid' });
  assert.equal(safePasswordFailure({ code: 'SMTP_NOT_CONFIGURED', message: 'private host' }), 'api.SMTP_NOT_CONFIGURED');
  assert.equal(safePasswordFailure(new Error('SMTP password secret')), 'ui.could_not_change_your_password_6c44efd3');
});
test('loyalty policy preserves version and converts human percentages to integer basis points', () => {
  const values = { enabled: true, plusThreshold: '1500000', priorityThreshold: '5000000', plusPercent: '3.25', priorityPercent: '5' };
  assert.deepEqual(validateLoyaltyPolicy(values, 7), { errors: {}, data: { enabled: true, plusThreshold: 1500000, priorityThreshold: 5000000, plusDiscountBps: 325, priorityDiscountBps: 500, expectedVersion: 7 } });
  for (const plusPercent of ['', '-1', '50.01', '1.001', 'NaN', 'Infinity']) assert.ok(validateLoyaltyPolicy({ ...values, plusPercent }, 7).errors.plusPercent);
  for (const priorityThreshold of ['', '1499999', '1500000', '1.5', '2000000001', 'Infinity']) assert.ok(validateLoyaltyPolicy({ ...values, priorityThreshold }, 7).errors.priorityThreshold);
});
test('account workflow messages exist in both catalogs with matching interpolation', () => {
  const vi = JSON.parse(readFileSync(new URL('./src/locales/catalog/vi.json', import.meta.url))).messages;
  const en = JSON.parse(readFileSync(new URL('./src/locales/catalog/en.json', import.meta.url))).messages;
  const keys = Object.keys(vi).filter(key => key.startsWith('account.'));
  assert.ok(keys.length > 30);
  for (const key of keys) { assert.equal(typeof en[key], 'string', key); assert.deepEqual([...vi[key].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), [...en[key].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), key); }
});
