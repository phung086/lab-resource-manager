import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { validateLocalDemoEnvironment } from './localDemoGuard.mjs';
import { createTelemetrySource, telemetrySourceInclude } from '../src/services/telemetryIdentityService.js';
import { persistTelemetrySample } from '../src/services/telemetryService.js';
import { scenarioSample } from './demoMonitoringScenario.mjs';

validateLocalDemoEnvironment(process.env);
if (process.env.NODE_ENV === 'production') throw new Error('Demo only');
const db = new PrismaClient();
let run, stopped = false;
process.on('SIGINT',()=>{stopped=true;});
process.on('SIGTERM',()=>{stopped=true;});
try {
  run = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261109, 61)`;
    const resource = await tx.resource.findUnique({where:{code:'DEMO26-PI5-01'}});
    if (resource?.specs?.catalogVersion !== 'GRADUATION_2026') throw new Error('Seed graduation resources first');
    const code = 'DEMO26-COMPUTE';
    let source = await tx.telemetrySource.findUnique({where:{code}});
    if (!source) ({source} = await createTelemetrySource(tx,{code,name:'Mô phỏng tải và nhiệt — không phải cảm biến thật',laboratoryId:resource.laboratoryId,resourceId:resource.id,kind:'SIMULATED',profile:'COMPUTE'}));
    if (source.kind !== 'SIMULATED' || source.resourceId !== resource.id || !source.isActive) throw new Error('Invalid simulation source');
    // Recover a dead runner only after its bounded 5-minute cycle plus grace period.
    await tx.monitoringSimulationRun.updateMany({where:{activeSourceId:source.id,lastHeartbeatAt:{lt:new Date(Date.now()-360000)}},data:{status:'INTERRUPTED',phase:'INTERRUPTED',activeSourceId:null,endedAt:new Date()}});
    if (await tx.monitoringSimulationRun.findUnique({where:{activeSourceId:source.id}})) throw new Error('A simulation is already running');
    return tx.monitoringSimulationRun.create({data:{id:randomUUID(),sourceId:source.id,activeSourceId:source.id,startedById:'LOCAL_DEMO_RUNNER',scenario:'THERMAL_RISE',profile:'COMPUTE',intervalSeconds:5,configuration:{origin:'SIMULATED',steps:60,runner:'LOCAL_CLI',model:'Deterministic teaching scenario; not hardware-calibrated'}}});
  });
  console.log('SIMULATED: 300s · normal → load → overheat → offline → recovery. Open Monitoring / Sensors.');
  for(let step=0;step<60&&!stopped;step++) {
    const {phase,...reading} = scenarioSample(step);
    await db.$transaction(async tx => {
      const source = await tx.telemetrySource.findUnique({where:{id:run.sourceId},include:telemetrySourceInclude()});
      await persistTelemetrySample(tx,{source,localDemoRun:true,payload:{...reading,timestamp:new Date(),eventId:`${run.id}:${step}`,simulationRunId:run.id}});
      await tx.monitoringSimulationRun.update({where:{id:run.id},data:{phase,acceptedCount:{increment:1},elapsedSeconds:step*5,lastHeartbeatAt:new Date()}});
    });
    if(step%12===0) console.log(`SIMULATED ${phase}: ${step+1}/60`);
    await delay(5000);
  }
  await db.monitoringSimulationRun.update({where:{id:run.id},data:{status:stopped?'STOPPED':'COMPLETED',phase:stopped?'STOPPED':'COMPLETED',activeSourceId:null,endedAt:new Date()}});
  console.log(JSON.stringify({status:stopped?'STOPPED':'COMPLETED',origin:'SIMULATED'}));
} catch(error) {
  if(run) await db.monitoringSimulationRun.update({where:{id:run.id},data:{status:'FAILED',phase:'FAILED',activeSourceId:null,endedAt:new Date(),lastError:'Runner failed; inspect local diagnostics'}});
  console.error(error.message); process.exitCode=1;
} finally {await db.$disconnect();}
