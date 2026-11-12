import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { validateLocalDemoEnvironment } from './localDemoGuard.mjs';
import { serializeTelemetry } from '../src/services/telemetryService.js';
validateLocalDemoEnvironment(process.env);
const db=new PrismaClient();
try {
  const run=await db.monitoringSimulationRun.findFirst({where:{source:{code:'DEMO26-COMPUTE'}},orderBy:{startedAt:'desc'}});
  assert.ok(run,'No persisted demo run');
  const resource=await db.resource.findUnique({where:{code:'DEMO26-PI5-01'},include:{monitoringThreshold:true,laboratory:{include:{monitoringThreshold:true}},telemetrySources:true,telemetrySamples:{where:{simulationRunId:run.id},include:{telemetrySource:true},orderBy:{sampledAt:'desc'},take:60}}});
  const samples=resource.telemetrySamples;
  const alerts=await db.monitoringAlert.findMany({where:{sourceId:run.sourceId,openedAt:{gte:run.startedAt}}});
  if(process.argv.includes('--snapshot')) {
    const view=serializeTelemetry(resource,samples[0]);
    console.log(JSON.stringify([{...view,history:samples.map(s=>({id:s.id,origin:s.origin,source:s.source,sampledAt:s.sampledAt,online:s.online,temperatureC:s.temperatureC,cpuPercent:s.cpuPercent,ramPercent:s.ramPercent})),alerts:[]}]));
  } else {
    assert.equal(run.status,'COMPLETED'); assert.equal(run.acceptedCount,60); assert.equal(samples.length,60);
    assert.ok(samples.every(s=>s.origin==='SIMULATED'&&s.simulationRunId===run.id));
    assert.ok(samples.some(s=>s.online===false)); assert.ok(samples.some(s=>s.temperatureC>=90));
    assert.equal(serializeTelemetry(resource,samples[0]).monitoring.state,'HEALTHY');
    assert.ok(alerts.some(a=>a.severity==='CRITICAL'));
    assert.ok(alerts.every(a=>a.origin==='SIMULATED'&&a.status==='RESOLVED'));
    const units=await db.resource.count({where:{code:{startsWith:'DEMO26-'}}}); assert.equal(units,60);
    console.log(JSON.stringify({units,runStatus:run.status,samples:samples.length,alerts:alerts.length,allAlertsResolved:true,latestState:'HEALTHY',physicalState:resource.operationalStatus}));
  }
} finally {await db.$disconnect();}
