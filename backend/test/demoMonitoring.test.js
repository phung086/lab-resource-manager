import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarioSample } from '../scripts/demoMonitoringScenario.mjs';
import { graduationResources } from '../scripts/graduationResourceCatalog.mjs';
import { persistTelemetrySample, deriveTelemetryState } from '../src/services/telemetryService.js';

test('catalog has 60 distinct units, manufacturer references and explicit simulated inventory',()=>{
  assert.equal(graduationResources.length,60);
  assert.equal(new Set(graduationResources.map(r=>r.code)).size,60);
  for(const resource of graduationResources){
    assert.equal(resource.specs.provenance.inventory,'SIMULATED_INVENTORY');
    assert.ok(new URL(resource.specs.provenance.sourceUrl).protocol==='https:');
  }
});
test('scenario triggers warning/offline then recovers under canonical thresholds',()=>{
  const now=new Date();
  const state=step=>deriveTelemetryState({}, {...scenarioSample(step),sampledAt:now},now).state;
  assert.equal(state(0),'HEALTHY');
  assert.equal(state(15),'WARNING');
  assert.equal(state(30),'WARNING');
  assert.equal(state(38),'UNAVAILABLE');
  assert.equal(state(59),'HEALTHY');
  assert.throws(()=>scenarioSample(-1),RangeError);
  assert.throws(()=>scenarioSample(60),RangeError);
  assert.equal(scenarioSample(38).temperatureC,undefined,'Offline must not fabricate current readings');
});
test('public sample ingestion still rejects simulation before any database writes',async()=>{
  await assert.rejects(persistTelemetrySample({}, {source:{kind:'SIMULATED'},payload:{simulationRunId:'fake'}}), {code:'TELEMETRY_SOURCE_INACTIVE'});
});
test('external source cannot impersonate a simulated run',async()=>{
  await assert.rejects(persistTelemetrySample({}, {source:{kind:'EXTERNAL'},payload:{simulationRunId:'fake'}}), {code:'FORBIDDEN'});
});

test('local simulation refuses production, a remote DB, a closed run and real inventory',async()=>{
  const names=['DATABASE_URL','DEMO_MODE','NODE_ENV'];
  const prior=Object.fromEntries(names.map(key=>[key,process.env[key]]));
  const source={id:'source',kind:'SIMULATED',resource:{specs:{environment:'LOCAL_DEMO'}}};
  const payload={simulationRunId:'run'};
  try {
    Object.assign(process.env,{DEMO_MODE:'true',NODE_ENV:'production',DATABASE_URL:'postgresql://localhost/lab_resources_local_demo'});
    await assert.rejects(persistTelemetrySample({}, {source,payload,localDemoRun:true}), {code:'TELEMETRY_SOURCE_INACTIVE'});
    Object.assign(process.env,{NODE_ENV:'development',DATABASE_URL:'postgresql://remote.example/lab_resources_local_demo'});
    await assert.rejects(persistTelemetrySample({}, {source,payload,localDemoRun:true}), {code:'TELEMETRY_SOURCE_INACTIVE'});
    process.env.DATABASE_URL='postgresql://localhost/lab_resources_local_demo';
    const tx={monitoringSimulationRun:{findUnique:async()=>({sourceId:'source',activeSourceId:null,status:'COMPLETED'})}};
    await assert.rejects(persistTelemetrySample(tx,{source,payload,localDemoRun:true}), {code:'FORBIDDEN'});
    tx.monitoringSimulationRun.findUnique=async()=>({sourceId:'source',activeSourceId:'source',status:'RUNNING'});
    source.resource.specs.environment='REAL';
    await assert.rejects(persistTelemetrySample(tx,{source,payload,localDemoRun:true}), {code:'FORBIDDEN'});
  } finally {
    for(const key of names) if(prior[key]===undefined) delete process.env[key]; else process.env[key]=prior[key];
  }
});
