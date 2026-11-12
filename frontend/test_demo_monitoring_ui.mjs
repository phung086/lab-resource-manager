import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
// Telemetry is read from the guarded demo DB; auth/shell calls are isolated fixtures.
const telemetry=JSON.parse(execFileSync('docker',['exec','lrm-local-review-backend-1','node','scripts/verifyDemoMonitoring.mjs','--snapshot'],{encoding:'utf8'}));
assert.equal(telemetry[0].latestTelemetry.origin,'SIMULATED');
const output=`${process.env.TEMP}/lab-monitoring-workspace-20261109`;
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  for(const locale of ['vi','en']) for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:960}});
    const user={id:'ui-qa',fullName:'Demo reviewer',email:'review@example.test',role:'ADMIN',isActive:true};
    let runs=[], starts=0, stops=0, explains=0;
    await context.addInitScript(({user,locale})=>{sessionStorage.setItem('lrm_token','isolated-monitoring');sessionStorage.setItem('lrm_user',JSON.stringify(user));localStorage.setItem('lrm_locale',locale);},{user,locale});
    await context.route('**/api/**',route=>{
      const path=new URL(route.request().url()).pathname;
      const method=route.request().method();
      assert.ok(method==='GET'||path==='/api/auth/activity'||path.startsWith('/api/telemetry/'));
      let data=[];
      if(['/api/auth/me','/api/users/me'].includes(path))data=user;
      else if(['/api/auth/session','/api/auth/activity'].includes(path))data={createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),idleExpiresAt:new Date(Date.now()+1800000).toISOString(),idleTimeoutSeconds:1800};
      else if(path==='/api/dashboard')data={generatedAt:new Date().toISOString(),summary:{totalResources:60,activeBookingsCount:0,pendingApprovalCount:0,checkedOutCount:0,openIncidentCount:0,criticalIncidentCount:0,unreadNotifications:0,resourcesByOperationalStatus:{AVAILABLE:60}},upcomingBookings:[],telemetry:[],monitoringAlerts:[],cameras:[]};
      else if(path==='/api/telemetry')data=telemetry;
      else if(path==='/api/telemetry/simulations'&&method==='POST'){
        starts++;runs=[{id:'ui-run',resourceId:telemetry[0].resource.id,resourceName:telemetry[0].resource.name,scenario:'THERMAL_RISE',status:'RUNNING',phase:'LOAD',acceptedCount:12,totalSteps:60,startedAt:new Date().toISOString()}];data=runs[0];
      }
      else if(path==='/api/telemetry/simulations/ui-run/stop'){stops++;runs=runs.map(r=>({...r,status:'STOPPED',phase:'STOPPED'}));data=runs[0];}
      else if(path==='/api/telemetry/simulations')data={enabled:true,resources:[{...telemetry[0].resource,profile:'COMPUTE'}],runs};
      else if(path==='/api/telemetry/explain'){explains++;data={mode:'UNCONFIGURED',answer:null,evidence:{generatedAt:new Date().toISOString(),samples:[telemetry[0].latestTelemetry],alerts:[]}};}
      else if(path==='/api/resource-care')data={generatedAt:new Date().toISOString(),items:[]};
      else if(path==='/api/notifications/unread-count')data={unread:0};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/workspace/monitoring');
    try {await page.locator('.care-tabs button').nth(1).click({timeout:10000});} catch(e){console.log(await page.locator('body').innerText());console.log(errors);throw e;}
    await page.locator('.monitor-snapshot-summary').waitFor();
    await page.locator('.monitor-register tbody tr').first().waitFor();
    assert.equal(await page.locator('.monitor-register tbody tr').count(),1);
    assert.ok(await page.locator('.monitor-simulation-badge').count()>=1);
    await page.locator('.monitor-lab>header button').click();
    await page.locator('.monitor-lab-setup .btn-primary').click();
    await page.locator('.monitor-run[data-active="true"]').waitFor();
    assert.equal(starts,1);assert.equal(await page.locator('.monitor-lab-setup .btn-primary').isDisabled(),true);
    await page.locator('.monitor-run button').click();
    await page.waitForFunction(()=>document.querySelector('.monitor-run')?.getAttribute('data-active')==='false');
    assert.equal(stops,1);
    await page.locator('.monitor-ai > summary').click();
    await page.locator('.monitor-ai button').first().click();
    await page.locator('.monitor-ai-answer').waitFor();assert.equal(explains,1);
    const filter=page.locator('.monitor-register select').first();
    await filter.selectOption('EXTERNAL');assert.equal(await page.locator('.monitor-register tbody tr').count(),0);
    await filter.selectOption('SIMULATED');await page.locator('.monitor-register tbody tr').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    assert.equal(await page.locator('.assistant-launcher').count(),1);
    await page.waitForTimeout(350);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${output}/${locale}-${width}.png`});
    results.push({locale,width,passed:true});await context.close();
  }
  console.log(JSON.stringify({results,output,scope:'Persisted SIMULATED telemetry, fixture auth; not RBAC E2E'}));
} finally {await browser.close();}
