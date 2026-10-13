import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateIncidentDraft, validateIncidentResolution } from './src/utils/incidentValidation.ts';
const id = '95170b2b-5e96-4fc1-a2c2-e5a95ce058ec';
const draft = {resourceId:id,severity:'medium',category:'',title:'Observed issue',description:'Instrument stopped responding'};
const check = patch => validateIncidentDraft({...draft,...patch},[id]);
test('blank report returns every field problem and no request payload', () => {
  const result=check({resourceId:'',title:'  ',description:'\n '});
  assert.deepEqual(Object.keys(result.errors),['resourceId','title','description']); assert.equal(result.data,null);
});
test('requires an actually available resource and canonical severity',()=>{
  assert.equal(check({resourceId:'foreign'}).data,null); assert.equal(check({severity:'urgent'}).data,null);
  for(const severity of ['low','medium','high','critical']) assert.ok(check({severity}).data);
});
test('matches trimmed server length boundaries without rewriting user content',()=>{
  for(const field of ['title','description']) {
    const max=field==='title'?255:4000;
    assert.equal(check({[field]:' ab '}).data,null);
    assert.ok(check({[field]:' x'.repeat(2)}).data);
    assert.ok(check({[field]:' x'+ 'y'.repeat(max-1)+' '}).data);
    assert.equal(check({[field]:'x'.repeat(max+1)}).data,null);
  }
  const data=check({title:'  Mất kết nối  ',description:'  Line one\n  line two  ',category:'   '}).data;
  assert.equal(data.title,'Mất kết nối'); assert.equal(data.description,'Line one\n  line two'); assert.equal(data.category,null);
});
test('validates optional category and resolution evidence at server limits',()=>{
  assert.ok(check({category:'x'.repeat(100)}).data); assert.equal(check({category:'x'.repeat(101)}).data,null);
  assert.ok(validateIncidentResolution('   ').error); assert.ok(validateIncidentResolution('ab').error);
  assert.equal(validateIncidentResolution(' abc ').resolution,'abc');
  assert.equal(validateIncidentResolution('x'.repeat(4000)).error,''); assert.ok(validateIncidentResolution('x'.repeat(4001)).error);
});
