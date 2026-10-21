import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleSelectionError, definitiveBundleRejection, checklistAvailability, intervalError, matchesResource } from './src/components/features/planning/planningPresentation.ts';
test('checklist explains unavailable and recorded stages', () => {
  assert.equal(checklistAvailability('RETURN','CONFIRMED',false),'planning.checklistUnavailable');
  assert.equal(checklistAvailability('RETURN','CHECKED_OUT',false),'');
  assert.equal(checklistAvailability('INSPECTION','RETURNED',false),'');
  assert.equal(checklistAvailability('HANDOVER','CANCELLED',false),'planning.checklistUnavailable');
  assert.equal(checklistAvailability('RETURN','RETURNED',true),'planning.checklistRecorded');
});
test('time fields reject missing, reversed, equal and oversized intervals', () => {
  assert.equal(intervalError('', ''),'planning.chooseTime');
  assert.equal(intervalError('2026-10-21T10:00','2026-10-21T10:00'),'planning.invalidTime');
  assert.equal(intervalError('2026-10-21T10:00','2026-10-21T09:00'),'planning.invalidTime');
  assert.equal(intervalError('2026-10-21T10:00','2026-10-22T10:01'),'planning.intervalLimit');
  assert.equal(intervalError('2026-10-21T10:00','2026-10-21T11:00'),'');
});
test('resource search accepts Vietnamese without diacritics, laboratory and code', () => {
  assert.ok(matchesResource('dien tu','Phòng điện tử','ROOM-01'));
  assert.ok(matchesResource('room-01','Phòng điện tử','ROOM-01'));
  assert.ok(matchesResource('che tao','Máy CNC','LAB Chế tạo'));
  assert.ok(!matchesResource('khong co','Máy CNC',undefined));
});


test('bundle selection catches mixed labs, missing assignments and oversized selections', () => {
 const resources = [{id:'a',laboratoryId:'one'},{id:'b',laboratoryId:'one'},{id:'c',laboratoryId:'two'},{id:'missing'}];
 assert.equal(bundleSelectionError(['a','b'],resources),'');
 assert.equal(bundleSelectionError(['a','c'],resources),'api.PLAN_SAME_LAB_REQUIRED');
 assert.equal(bundleSelectionError(['missing'],resources),'planning.bundleMissingLab');
 assert.equal(bundleSelectionError(['deleted'],resources),'planning.bundleMissingLab');
 assert.equal(bundleSelectionError(['a','b','c','d','e','f'],resources),'planning.bundleLimit');
});
test('ambiguous retries retain their request key across auth, throttling and timeout failures', () => {
 for (const status of [401,403,408,429,500,503]) assert.equal(definitiveBundleRejection(status),false);
 for (const status of [400,404,409,422]) assert.equal(definitiveBundleRejection(status),true);
});
