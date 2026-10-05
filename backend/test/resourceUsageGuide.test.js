import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSpecs } from '../src/utils/dataContract.js';
import { resourceSpecsSchema } from '../src/utils/resourceUsageGuide.js';

test('public usage instructions preserve numeric and boolean-looking prose and newlines', () => {
  const specs = { voltage: '220', usageGuide: { beforeUse: ['  Kiểm tra phụ kiện  '], steps: ['1', 'yes'], afterUse: [], safetyNotes: 'Dừng máy.\nBáo cán bộ.' } };
  assert.equal(resourceSpecsSchema.safeParse(specs).success, true);
  const normalized = normalizeSpecs(specs);
  assert.equal(normalized.voltage, 220);
  assert.deepEqual(normalized.usageGuide.steps, ['1', 'yes']);
  assert.deepEqual(normalized.usageGuide.beforeUse, ['Kiểm tra phụ kiện']);
  assert.equal(normalized.usageGuide.safetyNotes, 'Dừng máy.\nBáo cán bộ.');
  assert.deepEqual(normalizeSpecs(normalized), normalized);
});

test('guide limits and strict fields reject malformed public instructions', () => {
  for (const usageGuide of [null, 'text', { steps: [''] }, { steps: Array(21).fill('Step') }, { steps: ['x'.repeat(501)] }, { safetyNotes: 'x'.repeat(2001) }, { role: 'ADMIN' }]) {
    assert.equal(resourceSpecsSchema.safeParse({ usageGuide }).success, false);
  }
  assert.equal(resourceSpecsSchema.safeParse({ cpu: 8 }).success, true);
  assert.equal(resourceSpecsSchema.safeParse({ usageGuide: {} }).success, true);
});

test('legacy invalid guide does not remove independent technical specifications', () => {
  assert.deepEqual(normalizeSpecs({ cpu: 8, usageGuide: { steps: 'bad legacy value' } }), { cpu: 8 });
});
