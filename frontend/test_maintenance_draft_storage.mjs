import test from 'node:test';
import assert from 'node:assert/strict';
import {readMaintenanceDraft,writeMaintenanceDraft,clearMaintenanceDraft,maintenanceDraftPending} from './src/utils/maintenanceDraftStorage.ts';
const records=new Map(), sessions=new Map();
let failWrite=false,failRemove=false;
globalThis.window={addEventListener(){}};
globalThis.localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>{if(failWrite)throw Error('quota');records.set(k,v);},removeItem:k=>{if(failRemove)throw Error('blocked');records.delete(k);}};
globalThis.sessionStorage={getItem:k=>sessions.get(k)||null,setItem:(k,v)=>sessions.set(k,v)};
const record=()=>({version:1,savedAt:Date.now(),original:null,draft:{resourceId:'r1',title:'Care plan',kind:'maintenance',startAt:'',endAt:'',notes:'Keep all text',changeReason:''}});
test('account isolation, exact text and expiry/schema validation',()=>{
 const draft=record(); writeMaintenanceDraft('alice',draft);
 assert.deepEqual(readMaintenanceDraft('alice'),draft);assert.equal(readMaintenanceDraft('bob'),null);
 records.set('lrm.maintenance-draft.v1:expired',JSON.stringify({...record(),savedAt:Date.now()-8*86400000}));
 assert.equal(readMaintenanceDraft('expired'),null);
 records.set('lrm.maintenance-draft.v1:invalid','{');assert.equal(readMaintenanceDraft('invalid'),null);
});
test('quota failure retains actor draft in memory across component remount',()=>{
 const draft=record();failWrite=true;assert.throws(()=>writeMaintenanceDraft('quota',draft));failWrite=false;
 assert.deepEqual(readMaintenanceDraft('quota'),draft);assert.equal(maintenanceDraftPending('quota'),true);
 writeMaintenanceDraft('quota',draft);assert.equal(maintenanceDraftPending('quota'),false);
});
test('confirmed save cannot restore old draft even when removal fails',async()=>{
 writeMaintenanceDraft('saved',record());failRemove=true;assert.throws(()=>clearMaintenanceDraft('saved'));failRemove=false;
 assert.equal(readMaintenanceDraft('saved'),null);
 const fresh=await import('./src/utils/maintenanceDraftStorage.ts?fresh');
 assert.equal(fresh.readMaintenanceDraft('saved'),null,'session tombstone survives module reload');
});
