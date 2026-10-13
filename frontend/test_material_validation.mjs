import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateMaterialMovement } from './src/utils/materialValidation.ts';
const item = { id: 'material', code: 'MAT', name: 'Material', laboratoryId: 'lab-a', stockItem: { balance: 12, unit: 'box' } };
const draft = { kind: 'RECEIPT', quantity: '2', unit: 'ignored', reference: '  PO-01 ', reason: '  Receipt for class ', maintenanceId: '' };
const check = (patch = {}, material = item, role = 'ADMIN', jobs = []) => validateMaterialMovement({ ...draft, ...patch }, material, role, jobs);
test('opening receipt, fixed unit and trimmed evidence follow server contract', () => {
  const result = check(); assert.equal(result.data.unit, 'box'); assert.equal(result.data.reference, 'PO-01'); assert.equal(result.data.reason, 'Receipt for class'); assert.equal(result.balanceAfter, 14);
  assert.ok(check({ unit: 'piece' }, { ...item, stockItem: null }).data);
  assert.equal(check({ kind: 'ISSUE' }, { ...item, stockItem: null }).data, null);
  assert.equal(check({}, null).data, null);
});
test('invalid quantities never produce requests; balance cannot go negative or overflow', () => {
  for (const quantity of ['', ' ', '0', '-1', '0.5', 'Infinity', '1000001']) assert.equal(check({ quantity }).data, null);
  assert.ok(check({ quantity: '1000000' }).data);
  assert.equal(check({ kind: 'ISSUE', quantity: '13' }).data, null);
  assert.equal(check({ kind: 'ISSUE', quantity: '12' }).balanceAfter, 0);
  assert.equal(check({ quantity: '1' }, { ...item, stockItem: { unit: 'box', balance: 2147483647 } }).data, null);
});
test('adjustment is admin-only and signed, issue maintenance must be open in same LAB', () => {
  assert.equal(check({ kind: 'ADJUSTMENT', quantity: '-2' }).balanceAfter, 10);
  assert.equal(check({ kind: 'ADJUSTMENT', quantity: '-2' }, item, 'LAB_STAFF').data, null);
  assert.equal(check({}, item, 'CUSTOMER').data, null);
  const job = { id: 'job', status: 'scheduled', resource: { laboratoryId: 'lab-a' } };
  assert.ok(check({ kind: 'ISSUE', maintenanceId: 'job' }, item, 'LAB_STAFF', [job]).data);
  assert.equal(check({ kind: 'RECEIPT', maintenanceId: 'job' }, item, 'ADMIN', [job]).data, null);
  assert.equal(check({ kind: 'ISSUE', maintenanceId: 'job' }, item, 'ADMIN', [{ ...job, status: 'completed' }]).data, null);
  assert.equal(check({ kind: 'ISSUE', maintenanceId: 'job' }, item, 'ADMIN', [{ ...job, resource: { laboratoryId: 'other' } }]).data, null);
});
test('lengths are validated after trim with adjacent field failures', () => {
  assert.equal(check({ reference: ' a ', reason: '    ' }).data, null);
  assert.equal(check({ reference: 'x'.repeat(121) }).data, null);
  assert.equal(check({ reason: 'x'.repeat(501) }).data, null);
  assert.ok(check({ reference: 'x'.repeat(120), reason: 'x'.repeat(500) }).data);
  assert.equal(check({ unit: '   ' }, { ...item, stockItem: null }).data, null);
  assert.equal(check({ unit: 'x'.repeat(31) }, { ...item, stockItem: null }).data, null);
});
