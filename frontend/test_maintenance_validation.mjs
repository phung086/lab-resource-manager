import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateMaintenanceDraft, validateMaintenanceProgress } from './src/utils/maintenanceValidation.ts';
const resourceId = '95170b2b-5e96-4fc1-a2c2-e5a95ce058ec';
const draft = () => ({ resourceId, title: 'Inspect instrument', kind: 'maintenance', startAt: '2026-10-09T09:00', endAt: '2026-10-09T10:00', notes: '', changeReason: '' });
const check = (changes = {}, original) => validateMaintenanceDraft({ ...draft(), ...changes }, [resourceId], original);

test('requires actual accessible resource and valid kind; blank form returns field errors', () => {
  assert.equal(check({resourceId: ''}).errors.resourceId, 'ui.maintenance.resourceRequired');
  assert.equal(check({resourceId: 'unknown'}).errors.resourceId, 'ui.maintenance.resourceUnavailable');
  assert.equal(check({kind: 'inspection'}).errors.kind, 'ui.maintenance.kindInvalid');
  const result=check({resourceId:'',title:' ',startAt:'',endAt:''});
  assert.deepEqual(Object.keys(result.errors), ['resourceId','title','startAt','endAt']);
  assert.equal(result.data,null);
});
test('rejects impossible dates and rollover time; accepts leap day in UTC+7', () => {
  assert.ok(check({ startAt: '2026-02-30T09:00' }).errors.startAt);
  assert.ok(check({ startAt: '2026-10-09T24:00' }).errors.startAt);
  assert.ok(check({ startAt: '2026-10-09T09:60' }).errors.startAt);
  const valid=check({ startAt:'2028-02-29T23:45',endAt:'2028-03-01T00:00' });
  assert.equal(valid.data.startAt,'2028-02-29T16:45:00.000Z');
  assert.equal(valid.data.endAt,'2028-02-29T17:00:00.000Z');
});
test('matches backend ordering and inclusive 15-minute to 90-day duration boundaries', () => {
  assert.ok(check({endAt:'2026-10-09T09:00'}).errors.endAt);
  assert.ok(check({endAt:'2026-10-09T08:00'}).errors.endAt);
  assert.ok(check({endAt:'2026-10-09T09:14'}).errors.endAt);
  assert.ok(check({endAt:'2026-10-09T09:15'}).data);
  assert.ok(check({endAt:'2027-01-07T09:00'}).data);
  assert.ok(check({endAt:'2027-01-07T09:01'}).errors.endAt);
});
test('normalizes lengths as the data contract does and requires change reason on edit', () => {
  assert.ok(check({title:' a '}).errors.title);
  assert.equal(check({title:'  Long   job  ',notes:' first   line \n \n second '}).data.title,'Long job');
  assert.equal(check({notes:' first   line \n \n second '}).data.notes,'first line\nsecond');
  assert.ok(check({notes:'x'.repeat(2001)}).errors.notes);
  assert.ok(check({}, {resourceId}).errors.changeReason);
  assert.ok(check({changeReason:'valid reason'}, {resourceId}).data);
  assert.ok(check({changeReason:'x'.repeat(501)}, {resourceId}).errors.changeReason);
});
test('preserves exact existing timestamp precision for title-only changes', () => {
  const original={resourceId,startAt:'2026-10-09T02:00:23.000Z',endAt:'2026-10-09T03:00:41.000Z'};
  const result=check({changeReason:'Revise work notes'},original);
  assert.equal(result.data.startAt,original.startAt);
  assert.equal(result.data.endAt,original.endAt);
});
test('impact key changes only when resource or scheduling window changes', () => {
  const key=check().windowKey;
  assert.equal(check({title:'Another title',notes:'More notes'}).windowKey,key);
  assert.notEqual(check({endAt:'2026-10-09T11:00'}).windowKey,key);
  const other=validateMaintenanceDraft({...draft(),resourceId:'other'},['other']);
  assert.notEqual(other.windowKey,key);
});
test('allows only canonical maintenance progress with a normalized 5..500 reason', () => {
  assert.ok(validateMaintenanceProgress('scheduled','in_progress','Begin inspection').statusValid);
  assert.ok(validateMaintenanceProgress('in_progress','completed','Inspection completed').statusValid);
  assert.ok(validateMaintenanceProgress('scheduled','cancelled','Revise schedule').statusValid);
  assert.equal(validateMaintenanceProgress('scheduled','completed','valid reason').statusValid,false);
  assert.equal(validateMaintenanceProgress('completed','in_progress','valid reason').statusValid,false);
  assert.equal(validateMaintenanceProgress('in_progress','completed','    a  ').reasonValid,false);
});
