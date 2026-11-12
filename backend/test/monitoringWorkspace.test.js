import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationEnabled, simulationProfile, simulationReading, assertMonitoringActor, tickSimulation } from '../src/services/monitoringSimulationService.js';
import { explainMonitoring } from '../src/services/monitoringExplanationService.js';

test('simulation is strictly confined to the approved local database', () => {
  const env = { DEMO_MODE:'true',NODE_ENV:'development',DATABASE_URL:'postgresql://localhost/lab_resources_local_demo' };
  assert.equal(simulationEnabled(env),true);
  for (const patch of [{NODE_ENV:'production'},{DEMO_MODE:'false'},{DATABASE_URL:'postgresql://remote/lab_resources_local_demo'},{DATABASE_URL:'postgresql://localhost/real_data'},{DATABASE_URL:'postgresql://localhost/lab_resources_local_demo?schema=private'}]) assert.equal(simulationEnabled({...env,...patch}),false);
});
test('profiles do not attach CPU or RAM to room sensors or unsupported equipment', () => {
  assert.equal(simulationProfile({category:'ROOM',specs:{environment:'LOCAL_DEMO'}}),'ROOM');
  assert.equal(simulationProfile({subtype:'CAMERA',specs:{environment:'LOCAL_DEMO'}}),null);
  assert.equal(simulationProfile({subtype:'RASPBERRY_PI',specs:{}}),null);
  assert.equal(simulationReading('ROOM','THERMAL_RISE',30).cpuPercent,undefined);
  assert.throws(()=>simulationReading('ROOM','HIGH_LOAD',1));
});
test('offline does not fabricate metrics; recovery and bounds are explicit', () => {
  assert.deepEqual(simulationReading('COMPUTE','THERMAL_RISE',38),{phase:'OFFLINE',online:false});
  assert.ok(simulationReading('COMPUTE','THERMAL_RISE',30).temperatureC>=90);
  assert.ok(simulationReading('COMPUTE','THERMAL_RISE',59).temperatureC<75);
  assert.throws(()=>simulationReading('COMPUTE','THERMAL_RISE',60));
});
const actor={id:'operator',role:'LAB_STAFF',isActive:true,authVersion:1};
function fakeDb({current=actor,resource={id:'resource',name:'Demo',code:'D',specs:{},telemetrySamples:[],monitoringAlerts:[]}}={}) {
  const tx={$queryRaw:async()=>[],user:{findUnique:async()=>current},resource:{findFirst:async()=>resource,findUnique:async()=>resource}};
  return {tx,$transaction:fn=>fn(tx)};
}
test('current account and laboratory access fail closed',async()=>{
  await assert.rejects(assertMonitoringActor(fakeDb({current:{...actor,isActive:false}}).tx,actor,'resource'),{code:'ACCOUNT_INACTIVE'});
  await assert.rejects(assertMonitoringActor(fakeDb({current:{...actor,role:'CUSTOMER'}}).tx,actor,'resource'),{code:'FORBIDDEN'});
  await assert.rejects(assertMonitoringActor(fakeDb({resource:null}).tx,actor,'resource'),{code:'NOT_FOUND'});
  await assert.rejects(assertMonitoringActor(fakeDb().tx,actor,'resource'),{code:'FORBIDDEN'});
});
test('AI never synthesizes facts without samples or provider configuration',async()=>{
  const admin={...actor,role:'ADMIN'}, db=fakeDb({current:admin});
  const modelCall=async()=>assert.fail('Model must not be called');
  assert.equal((await explainMonitoring(db,admin,{resourceId:'resource',question:'why',locale:'en'},{settings:{},modelCall})).mode,'NO_DATA');
  db.tx.resource.findUnique=async()=>({id:'resource',specs:{},telemetrySamples:[{id:'sample',online:true,sampledAt:new Date(),origin:'SIMULATED'}],monitoringAlerts:[]});
  assert.equal((await explainMonitoring(db,admin,{resourceId:'resource',question:'why',locale:'en'},{settings:{},modelCall})).mode,'UNCONFIGURED');
});
test('AI receives persisted provenance, and scope is checked again after synthesis',async()=>{
  const admin={...actor,role:'ADMIN'}, db=fakeDb({current:admin,resource:{id:'resource',specs:{},telemetrySamples:[{id:'s',origin:'SIMULATED',simulationRunId:'run',sampledAt:new Date(),online:false}],monitoringAlerts:[]}});
  const modelCall=async({toolResults})=>{assert.equal(toolResults[0].data.samples[0].origin,'SIMULATED');db.tx.user.findUnique=async()=>({...admin,isActive:false});return 'Analysis';};
  await assert.rejects(explainMonitoring(db,admin,{resourceId:'resource',question:'why',locale:'en'},{settings:{openaiApiKey:'test',openaiModel:'test'},modelCall}),{code:'ACCOUNT_INACTIVE'});
});
test('worker interruption closes old runs instead of backdating samples',async()=>{
  const before={DATABASE_URL:process.env.DATABASE_URL,DEMO_MODE:process.env.DEMO_MODE,NODE_ENV:process.env.NODE_ENV};
  Object.assign(process.env,{DATABASE_URL:'postgresql://localhost/lab_resources_local_demo',DEMO_MODE:'true',NODE_ENV:'development'});
  try {
    let closed;
    const tx={$queryRaw:async()=>[],monitoringSimulationRun:{findUnique:async()=>({status:'RUNNING',configuration:{runner:'WORKSPACE'},lastHeartbeatAt:new Date(0),startedAt:new Date(0)}),update:async args=>{closed=args.data;}}};
    await tickSimulation({$transaction:fn=>fn(tx)},'run');assert.equal(closed.status,'INTERRUPTED');assert.equal(closed.activeSourceId,null);
  } finally {for(const [key,value]of Object.entries(before))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
