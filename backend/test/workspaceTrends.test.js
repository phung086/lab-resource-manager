import test from 'node:test';
import assert from 'node:assert/strict';
import { trendWindow,buildWorkspaceTrends } from '../src/services/workspaceTrendsService.js';
test('Vietnam midnight and week/month boundaries are independent of server timezone',()=>{
 const now=new Date('2026-10-09T19:00:00Z');
 assert.equal(trendWindow('day',now).start.toISOString(),'2026-10-09T17:00:00.000Z');
 assert.equal(trendWindow('week',now).start.toISOString(),'2026-10-03T17:00:00.000Z');
 assert.equal(trendWindow('month',now).start.toISOString(),'2026-09-10T17:00:00.000Z');
 assert.equal(trendWindow('day',now).step,'1 hour');
 assert.equal(trendWindow('month',now).step,'1 day');
});
test('unauthorized users and malformed windows never query the database',async()=>{
 const db={$queryRaw:()=>assert.fail('No query allowed')};
 for(const role of ['CUSTOMER','CUSTOMER','STAFF']) await assert.rejects(buildWorkspaceTrends(db,{role}),e=>e.code==='FORBIDDEN');
 for(const period of ['year','',null]) await assert.rejects(buildWorkspaceTrends(db,{role:'ADMIN'},{period}),e=>e.code==='VALIDATION_ERROR');
});
test('staff scope is bound to current assignments and cannot query money even with feature enabled',async()=>{
 let query;const db={$queryRaw:async q=>{query=q;return [];}};
 const result=await buildWorkspaceTrends(db,{id:'staff-safe',role:'LAB_STAFF'},{paymentsEnabled:true});
 assert.match(query.sql,/user_lab_assignments/);assert.ok(query.values.includes('staff-safe'));
 assert.doesNotMatch(query.sql,/payment_transactions/);assert.equal(result.paymentState,'restricted');
});
test('disabled payments are absent, enabled collections require successful settled VND records',async()=>{
 let query;const db={$queryRaw:async q=>{query=q;return [];}};
 assert.equal((await buildWorkspaceTrends(db,{role:'ADMIN'})).paymentState,'disabled');
 assert.doesNotMatch(query.sql,/payment_transactions/);
 assert.equal((await buildWorkspaceTrends(db,{role:'ADMIN'},{paymentsEnabled:true})).paymentState,'available');
 assert.match(query.sql,/status = 'success'/);assert.match(query.sql,/currency = 'VND'/);assert.match(query.sql,/manual_review/);assert.match(query.sql,/paidAt/);
});
test('query failure is not reported as zero activity',async()=>{
 const err=new Error('offline');await assert.rejects(buildWorkspaceTrends({$queryRaw:async()=>{throw err;}},{role:'ADMIN'}),e=>e===err);
});
