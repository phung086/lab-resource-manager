// Guarded local runtime verification; retains labelled demo runs and audit evidence.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { validateLocalDemoEnvironment } from './localDemoGuard.mjs';
import { prisma } from '../src/db.js';
import { signUserToken, verifyUserToken } from '../src/services/authTokens.js';
validateLocalDemoEnvironment(process.env);
if(process.env.NODE_ENV==='production')throw new Error('Local only');
const sessions=[];
async function tokenFor(role, scope={}){const actor=await prisma.user.findFirst({where:{role,isActive:true,deletedAt:null,passwordResetRequired:false,...scope}});assert.ok(actor,`Missing local ${role}`);const token=await signUserToken(actor);sessions.push(verifyUserToken(token).sid);return {actor,token};}
async function request(token,path,body){const response=await fetch(`http://127.0.0.1:8000/api/telemetry${path}`,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:globalThis.AbortSignal.timeout(25000)});return {status:response.status,data:await response.json()};}
let activeRun,admin;
try{
 admin=await tokenFor('ADMIN');const customer=await tokenFor('CUSTOMER');
 assert.equal((await request(null,'/simulations')).status,401);
 assert.equal((await request(customer.token,'/simulations')).status,403);
 const list=await request(admin.token,'/simulations');assert.equal(list.status,200);assert.equal(list.data.enabled,true);
 const resource=list.data.resources.find(r=>r.code==='DEMO26-PI5-02');assert.ok(resource);
 const physical=(await prisma.resource.findUnique({where:{id:resource.id}})).operationalStatus;
 assert.equal((await request(customer.token,'/simulations',{resourceId:resource.id,scenario:'NORMAL'})).status,403);
 assert.equal((await request(admin.token,'/simulations',{resourceId:resource.id,scenario:'NORMAL',role:'ADMIN'})).status,400);
 const start=await request(admin.token,'/simulations',{resourceId:resource.id,scenario:'NORMAL'});assert.equal(start.status,201,JSON.stringify(start.data));activeRun=start.data.id;
 assert.equal((await request(admin.token,'/simulations',{resourceId:resource.id,scenario:'NORMAL'})).status,409);
 await delay(6500);
 const persisted=await prisma.monitoringSimulationRun.findUnique({where:{id:activeRun}});assert.ok(persisted.acceptedCount>=1);assert.equal(persisted.startedById,admin.actor.id);
 assert.equal((await request(admin.token,`/simulations/${activeRun}/stop`,{})).status,200);
 const stopped=await prisma.monitoringSimulationRun.findUnique({where:{id:activeRun}});assert.equal(stopped.status,'STOPPED');
 await delay(5500);assert.equal((await prisma.monitoringSimulationRun.findUnique({where:{id:activeRun}})).acceptedCount,stopped.acceptedCount);
 assert.equal((await prisma.resource.findUnique({where:{id:resource.id}})).operationalStatus,physical);
 const analysis=await request(admin.token,'/explain',{resourceId:resource.id,question:'Explain the observed readings.',locale:'en'});assert.equal(analysis.status,200,JSON.stringify(analysis.data));assert.ok(['AI','UNCONFIGURED'].includes(analysis.data.mode));assert.equal(analysis.data.evidence.samples[0].origin,'SIMULATED');
 assert.equal((await request(customer.token,'/explain',{resourceId:resource.id,question:'Explain.',locale:'en'})).status,403);
 const host=await prisma.resource.findUnique({where:{code:'DEMO-HOST-PC'},include:{telemetrySamples:{orderBy:{sampledAt:'desc'},take:5}}});
 assert.ok(host?.telemetrySamples.some(s=>s.origin==='EXTERNAL'&&s.cpuPercent!=null&&s.ramPercent!=null));
 assert.ok(host.telemetrySamples.every(s=>s.temperatureC===null&&s.gpuPercent===null));
 console.log(JSON.stringify({passed:true,scope:'Real authenticated sessions, shared local demo API; not password-login E2E',simulationStartStop:true,duplicateBlocked:true,customerDenied:true,samplesStopped:stopped.acceptedCount,physicalUnchanged:true,aiMode:analysis.data.mode,hostExternal:true}));
 if(process.argv.includes('--full')) {
   const target=await prisma.resource.findUnique({where:{code:'DEMO26-PI5-03'}});
   const staff=await tokenFor('LAB_STAFF',{labAssignments:{some:{laboratoryId:target.laboratoryId}}});
   const otherResource=list.data.resources.find(r=>r.code==='DEMO26-PI5-04');
   const outOfScope=await prisma.resource.findFirst({where:{laboratory:{staffAssignments:{none:{userId:staff.actor.id}}}}});
   if(outOfScope)assert.equal((await request(staff.token,'/simulations',{resourceId:outOfScope.id,scenario:'NORMAL'})).status,404);
   const run=await request(staff.token,'/simulations',{resourceId:target.id,scenario:'THERMAL_RISE'});
   assert.equal(run.status,201,JSON.stringify(run.data));activeRun=run.data.id;
   console.log('Full cycle started by assigned LAB_STAFF. Waiting for persisted phases.');
   let acknowledged=false, completed=false;
   const deadline=Date.now()+365000;
   while(Date.now()<deadline){
     await delay(3500);
     const current=await prisma.monitoringSimulationRun.findUnique({where:{id:activeRun}});
     if(current.status==='COMPLETED'){completed=true;break;}
     assert.equal(current.status,'RUNNING');
     if(current.phase==='OVERHEAT'&&!acknowledged){
       const alerts=await request(staff.token,`/alerts?resourceId=${target.id}&status=OPEN`);
       const critical=alerts.data.find(a=>a.severity==='CRITICAL'&&a.origin==='SIMULATED'&&a.incident);
       if(!critical)continue;
       assert.equal((await request(customer.token,`/alerts/${critical.id}/acknowledge`,{})).status,403);
       const ack=await request(staff.token,`/alerts/${critical.id}/acknowledge`,{});
       assert.equal(ack.status,200);assert.equal(ack.data.status,'ACKNOWLEDGED');acknowledged=true;
       console.log('Critical alert acknowledged through the API by assigned LAB_STAFF.');
     }
   }
   assert.ok(completed&&acknowledged);
   const samples=await prisma.telemetrySample.findMany({where:{simulationRunId:activeRun},orderBy:{sampledAt:'asc'}});
   assert.equal(samples.length,60);assert.ok(samples.every(s=>s.origin==='SIMULATED'));
   assert.ok(samples.some(s=>!s.online&&s.temperatureC===null&&s.cpuPercent===null));
   const telemetry=await request(staff.token,`?resourceId=${target.id}&take=60`);
   assert.equal(telemetry.data[0].monitoring.state,'HEALTHY');
   assert.equal(telemetry.data[0].resource.operationalStatus,target.operationalStatus);
   const alerts=await request(staff.token,`/alerts?resourceId=${target.id}&status=RESOLVED`);
   const sampleIds=new Set(samples.map(s=>s.id));
   const resolved=alerts.data.filter(a=>sampleIds.has(a.sampleId));
   assert.ok(resolved.some(a=>a.incident&&a.severity==='CRITICAL'));
   assert.ok(otherResource);
   console.log(JSON.stringify({fullCycle:true,staffScoped:true,staffOutOfScopeTested:Boolean(outOfScope),samples:samples.length,offlineSamples:samples.filter(s=>!s.online).length,resolvedAlerts:resolved.length,criticalAcknowledged:acknowledged,incidentRetained:true,finalState:'HEALTHY',physicalUnchanged:true}));
 }
}finally{
 if(activeRun&&admin)await request(admin.token,`/simulations/${activeRun}/stop`,{});
 await prisma.authSession.updateMany({where:{id:{in:sessions}},data:{revokedAt:new Date()}});
 await prisma.$disconnect();
}
