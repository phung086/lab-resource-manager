import assert from 'node:assert/strict';
import test from 'node:test';
import { intervalFor, resourceBlocked, serviceWindow, shiftDate, freeWindows, upcomingFreeDays } from './src/components/calendar/plannerModel.ts';
import { checkSelectedDrafts, timeDraftKey } from './src/components/calendar/selectionPrecheck.ts';

const resource = { id:'room',name:'Room',code:'R1',category:'ROOM',operationalStatus:'AVAILABLE',bookingState:'bookable',labPolicy:{workDayStartHour:8,workDayEndHour:18,minBookingMinutes:30,maxBookingMinutes:240,allowWeekend:true} };
const date='2099-06-15', now=Date.parse('2099-06-14T00:00:00Z');

test('preparation blocks after a booking and reserves the candidate turnaround before the next booking', () => {
  const events = [{ id:'next', resourceId:'room', type:'booking', start:date+'T09:00:00+07:00', end:date+'T10:00:00+07:00' },
    { id:'prep', resourceId:'room', type:'preparation', start:date+'T10:00:00+07:00', end:date+'T10:20:00+07:00' }];
  const slots = freeWindows({ ...resource, labPolicy:{ ...resource.labPolicy, turnaroundMinutes:20 } }, date, 60, events, now);
  assert.ok(!slots.some(slot=>slot.start==='08:00'));
  assert.ok(slots.some(slot=>slot.start==='10:20'));
});
test('suggestions respect half-open overlap and retain immediately adjacent times',()=>{
  const events=[{id:'booking',resourceId:'room',start:date+'T09:00:00+07:00',end:date+'T10:00:00+07:00'}];
  const slots=freeWindows(resource,date,60,events,now);
  assert.ok(slots.some(slot=>slot.start==='08:00'&&slot.end==='09:00'));
  assert.ok(slots.some(slot=>slot.start==='10:00'));
  assert.ok(!slots.some(slot=>['08:30','09:00','09:30'].includes(slot.start)));
});
test('maintenance blocks only its own resource and interval',()=>{
  const events=[{id:'maintenance',resourceId:'room',type:'maintenance',start:date+'T12:00:00+07:00',end:date+'T13:00:00+07:00'}, {id:'foreign',resourceId:'other',start:date+'T14:00:00+07:00',end:date+'T16:00:00+07:00'}];
  const slots=freeWindows(resource,date,60,events,now);
  assert.ok(!slots.some(slot=>slot.start==='12:00'));assert.ok(slots.some(slot=>slot.from<='14:00'&&slot.to>='15:00'));
});
test('service policy controls the visible suggestion range and exact duration',()=>{
  const slots=freeWindows({...resource,labPolicy:{...resource.labPolicy,workDayStartHour:6,workDayEndHour:22}},date,90,[],now);
  assert.deepEqual(slots,[{from:'06:00',to:'22:00',start:'06:00',end:'07:30'}]);
  assert.deepEqual(freeWindows(resource,date,300,[],now),[]);
  assert.deepEqual(freeWindows(resource,date,15,[],now),[]);
  assert.deepEqual(freeWindows(resource,date,0,[],now),[]);
});
test('unknown hours do not silently become 08–20 or imply availability',()=>{
  assert.equal(serviceWindow({...resource,labPolicy:undefined}),null);
  assert.deepEqual(freeWindows({...resource,labPolicy:undefined},date,60,[],now),[]);
  assert.equal(serviceWindow({...resource,labPolicy:{workDayStartHour:20,workDayEndHour:8}}),null);
});
test('hard resource state, closed LAB and weekend restrictions hide suggestions',()=>{
  for(const state of ['BROKEN','MAINTENANCE','CALIBRATION','OFFLINE','RETIRED']) {
    assert.ok(resourceBlocked({...resource,operationalStatus:state}));
    assert.deepEqual(freeWindows({...resource,operationalStatus:state},date,60,[],now),[]);
  }
  assert.ok(resourceBlocked({...resource,laboratory:{id:'lab',name:'LAB',isActive:false}}));
  assert.ok(resourceBlocked({...resource,bookingState:'restricted'}));
  assert.ok(resourceBlocked({...resource,availability:{source:'maintenance_policy'}}));
  let sunday=date;while(new Date(sunday+'T00:00:00Z').getUTCDay()!==0)sunday=shiftDate(sunday,1);
  assert.deepEqual(freeWindows({...resource,labPolicy:{...resource.labPolicy,allowWeekend:false}},sunday,60,[],now),[]);
});
test('suggestions cannot select past starts even when part of the interval is future',()=>{
  const slots=freeWindows(resource,date,60,[],Date.parse(date+'T14:15:00+07:00'));
  assert.equal(slots[0].start,'14:45');
});
test('notice rounds up safely at sub-minute precision and honors each LAB preparation period',()=>{
  assert.equal(freeWindows(resource,date,60,[],Date.parse(date+'T14:15:00.001+07:00'))[0].start,'14:46');
  assert.equal(freeWindows({...resource,labPolicy:{...resource.labPolicy,minAdvanceBookingMinutes:90}},date,60,[],Date.parse(date+'T14:15:00+07:00'))[0].start,'15:45');
  assert.deepEqual(freeWindows(resource,date,60,[],Date.parse(date+'T16:30:00.001+07:00')),[]);
});
test('free windows merge overlapping and adjacent busy periods without offering occupied times',()=>{
  const periods=[['08:30','10:00'],['09:00','11:00'],['11:00','12:00'],['14:00','15:00']].map(([start,end],index)=>({id:String(index),resourceId:'room',start:date+'T'+start+':00+07:00',end:date+'T'+end+':00+07:00'}));
  assert.deepEqual(freeWindows(resource,date,60,periods,now),[
    {from:'12:00',to:'14:00',start:'12:00',end:'13:00'},
    {from:'15:00',to:'18:00',start:'15:00',end:'16:00'}
  ]);
});
test('a fully occupied day offers the next open days only inside the loaded range',()=>{
  const events=[{id:'full',resourceId:'room',start:date+'T08:00:00+07:00',end:date+'T18:00:00+07:00'}];
  assert.deepEqual(freeWindows(resource,date,120,events,now),[]);
  const days=upcomingFreeDays(resource,date,120,events,shiftDate(date,3),now);
  assert.deepEqual(days.map(day=>day.date),[shiftDate(date,1),shiftDate(date,2)]);
  assert.equal(days[0].window.start,'08:00');assert.equal(days[0].window.end,'10:00');
  assert.deepEqual(upcomingFreeDays(resource,date,120,events,shiftDate(date,1),now),[]);
});
test('narrow free periods are not missed by a fixed half-hour grid',()=>{
  const events=[{id:'before',resourceId:'room',start:date+'T08:00:00+07:00',end:date+'T09:10:00+07:00'},{id:'after',resourceId:'room',start:date+'T10:10:00+07:00',end:date+'T18:00:00+07:00'}];
  assert.deepEqual(freeWindows(resource,date,60,events,now),[{from:'09:10',to:'10:10',start:'09:10',end:'10:10'}]);
});
test('nearest-day suggestions obey the advance booking limit',()=>{
  const limited={...resource,labPolicy:{...resource.labPolicy,maxAdvanceBookingDays:1}};
  assert.deepEqual(upcomingFreeDays(limited,date,60,[],shiftDate(date,7),Date.parse(date+'T08:00:00+07:00')).map(day=>day.date),[shiftDate(date,1)]);
});
test('Vietnam intervals reject malformed/normalized/past/reversed inputs',()=>{
  assert.deepEqual(intervalFor('2099-06-15','09:00','10:30'),{startAt:'2099-06-15T02:00:00.000Z',endAt:'2099-06-15T03:30:00.000Z'});
  for(const args of [['2099-02-31','09:00','10:00'],['2099-06-15','24:00','25:00'],['2099-06-15','11:00','10:00'],['2000-01-01','09:00','10:00'],['','09:00','10:00']])assert.equal(intervalFor(...args),null);
});
test('date navigation crosses months/year independently of the browser timezone',()=>{
  for(const timezone of ['UTC','America/Los_Angeles','Asia/Tokyo']) {
    const previous=process.env.TZ;process.env.TZ=timezone;
    try {assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.equal(shiftDate('2028-03-01',-1),'2028-02-29');}finally{process.env.TZ=previous;}
  }
});

const draft={date:'2099-06-15',start:'09:00',end:'10:00'};
test('selection checks stop on 429 and explicit resume skips fresh completed rows',async()=>{
  const checks={},calls=[],controller=new AbortController();let fail=true,inFlight=0,peak=0;
  const run=()=>checkSelectedDrafts({ids:['a','b','c'],signal:controller.signal,draftFor:()=>draft,previousFor:id=>checks[id],onResult:(id,result)=>{checks[id]=result;},request:async id=>{
    calls.push(id);inFlight++;peak=Math.max(peak,inFlight);await Promise.resolve();inFlight--;
    if(id==='b'&&fail)throw Object.assign(new Error('api.RATE_LIMITED'),{status:429});return {available:true};
  }});
  await run();assert.deepEqual(calls,['a','b']);assert.equal(checks.b.status,'paused');assert.equal(checks.c,undefined);assert.equal(peak,1);
  fail=false;await run();assert.deepEqual(calls,['a','b','b','c']);assert.equal(checks.c.status,'ready');
});
test('selection checks ignore superseded/cancelled responses and stop after transport/auth failures',async()=>{
  for(const status of [0,401]) {
    const calls=[],checks={};await checkSelectedDrafts({ids:['a','b'],signal:new AbortController().signal,draftFor:()=>draft,previousFor:()=>undefined,onResult:(id,result)=>{checks[id]=result;},request:async id=>{calls.push(id);throw Object.assign(new Error('failure'),{status});}});
    assert.deepEqual(calls,['a']);assert.equal(checks.a.status,'error');
  }
  for(const cancel of [false,true]) {
    let current=draft,results=0;const controller=new AbortController();
    await checkSelectedDrafts({ids:['a'],signal:controller.signal,draftFor:()=>current,previousFor:()=>undefined,onResult:()=>{results++;},request:async()=>{if(cancel)controller.abort();else current={...draft,start:'11:00',end:'12:00'};return {available:true};}});
    assert.equal(results,0);
  }
});
test('changed or expired checks re-run; invalid drafts report per-row error without a request',async()=>{
  const checks={a:{key:timeDraftKey(draft),at:Date.now()-61000,status:'ready'},b:{key:'old-time',at:Date.now(),status:'ready'}},calls=[];
  await checkSelectedDrafts({ids:['a','b','c'],signal:new AbortController().signal,draftFor:id=>id==='c'?{...draft,end:'08:00'}:draft,previousFor:id=>checks[id],onResult:(id,result)=>{checks[id]=result;},request:async id=>{calls.push(id);return {available:id==='a'};}});
  assert.deepEqual(calls,['a','b']);assert.equal(checks.a.status,'ready');assert.equal(checks.b.status,'unavailable');assert.equal(checks.c.status,'error');
});
