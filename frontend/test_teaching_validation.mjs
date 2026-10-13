import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTeachingAction } from './src/utils/teachingValidation.ts';
test('group creation validates all trimmed fields before any request', () => {
  const blank = validateTeachingAction('create', {}); assert.equal(blank.data, null); assert.deepEqual(Object.keys(blank.errors), ['code', 'term', 'name', 'lecturerEmail']);
  const values = { code: '  CS-01 ', term: ' 2026 ', name: '  Practical course  ', lecturerEmail: ' lecturer@lrm.local ' };
  assert.deepEqual(validateTeachingAction('create', values).data, { code: 'CS-01', term: '2026', name: 'Practical course', lecturerEmail: 'lecturer@lrm.local' });
  for (const [field, min, max] of [['code', 2, 40], ['term', 2, 80], ['name', 3, 160]]) {
    assert.ok(validateTeachingAction('create', { ...values, [field]: 'x'.repeat(min) }).data);
    assert.ok(validateTeachingAction('create', { ...values, [field]: 'x'.repeat(max) }).data);
    assert.equal(validateTeachingAction('create', { ...values, [field]: 'x'.repeat(min - 1) }).data, null);
    assert.equal(validateTeachingAction('create', { ...values, [field]: 'x'.repeat(max + 1) }).data, null);
  }
});
test('member email and student booking must be available input, no inferred defaults', () => {
  for (const email of ['', 'bad', 'a@', 'a b@host.test']) assert.equal(validateTeachingAction('member', { email }).data, null);
  assert.deepEqual(validateTeachingAction('member', { email: ' student@lrm.local ' }).data, { email: 'student@lrm.local' });
  const values = { bookingId: 'own-booking', learningGoal: 'Measure and document the response.' };
  assert.equal(validateTeachingAction('submit', values, []).data, null);
  assert.ok(validateTeachingAction('submit', values, ['own-booking']).data);
  assert.equal(validateTeachingAction('submit', { ...values, bookingId: 'someone-else' }, ['own-booking']).data, null);
});
test('goals and feedback preserve lines and match server trimmed boundaries', () => {
  for (const [action, field, min] of [['revise', 'learningGoal', 10], ['review', 'feedback', 5]]) {
    const values = { decision: 'ENDORSED', [field]: 'x'.repeat(min) };
    assert.ok(validateTeachingAction(action, values).data);
    assert.ok(validateTeachingAction(action, { ...values, [field]: 'x'.repeat(1000) }).data);
    assert.equal(validateTeachingAction(action, { ...values, [field]: 'x'.repeat(1001) }).data, null);
    assert.equal(validateTeachingAction(action, { ...values, [field]: ' '.repeat(20) }).data, null);
  }
  assert.equal(validateTeachingAction('revise', { learningGoal: '  Line one\n  line two  ' }).data.learningGoal, 'Line one\n  line two');
});
test('academic decision has only supported outcomes and no extra payload fields', () => {
  for (const decision of ['ENDORSED', 'CHANGES_REQUESTED']) assert.deepEqual(validateTeachingAction('review', { decision, feedback: 'Enough evidence', status: 'CONFIRMED' }).data, { feedback: 'Enough evidence', decision });
  assert.equal(validateTeachingAction('review', { decision: 'APPROVED', feedback: 'Enough evidence' }).data, null);
});
