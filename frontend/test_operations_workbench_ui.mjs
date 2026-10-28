import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Presentation and interaction regression: ALL API traffic is intercepted.
// These fixtures never reach a business database or external service.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const output = process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-operations-workbench-20261028`;
const before = process.env.CAPTURE_PHASE === 'before';
await mkdir(output,{recursive:true});
const catalogs = Object.fromEntries(await Promise.all(['vi','en'].map(async locale => [locale,JSON.parse(await readFile(new URL(`./src/locales/catalog/${locale}.json`,import.meta.url),'utf8')).messages])));
const browser = await chromium.launch({channel:'chrome',headless:true});
const results=[];
const resources=[{id:'wb-gpu',code:'GPU-01',name:'Máy trạm GPU nghiên cứu',category:'MACHINE',operationalStatus:'MAINTENANCE'}, {id:'wb-camera',code:'CAM-02',name:'Camera thị giác máy tính',category:'EQUIPMENT',operationalStatus:'AVAILABLE'}];
const person={id:'wb-staff',fullName:'Ngọc Linh',role:'LAB_STAFF'};
const baseIncident={id:'wb-incident',resourceId:resources[0].id,title:'Máy trạm GPU phát tiếng ồn bất thường',description:'Quạt tản nhiệt phát tiếng ồn lớn khi khởi động. Đã ngừng phiên sử dụng và báo lại LAB để kiểm tra.',severity:'high',status:'reported',category:'HARDWARE',detectedAt:'2026-10-28T02:00:00Z',createdAt:'2026-10-28T02:00:00Z',updatedAt:'2026-10-28T02:00:00Z',resource:resources[0],assignedTo:person,reportedBy:{id:'wb-customer',fullName:'Minh Anh',role:'CUSTOMER'}};
const baseJob={id:'wb-job',title:'Kiểm tra hệ thống tản nhiệt GPU',kind:'maintenance',status:'scheduled',resourceId:resources[0].id,resource:resources[0],startAt:'2026-10-29T02:00:00Z',endAt:'2026-10-29T04:00:00Z',createdAt:'2026-10-28T02:00:00Z',updatedAt:'2026-10-28T02:00:00Z',createdBy:person,notes:'Kiểm tra quạt, vệ sinh đường gió và chạy thử sau bảo trì. Ghi kết quả kiểm tra trước khi bàn giao lại thiết bị.'};
async function open(view,width,locale='vi',role='LAB_STAFF') {
 const actor=role==='LAB_STAFF'?person:{id:'wb-customer',fullName:'Minh Anh',role};
 let incident={...baseIncident},jobs=[{...baseJob},{...baseJob,id:'wb-job-two',title:'Hiệu chuẩn camera thị giác',kind:'calibration',status:'in_progress',resourceId:resources[1].id,resource:resources[1]}],detailFails=false,impactCalls=0,writes=0;
 const context=await browser.newContext({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({actor,locale})=>{sessionStorage.setItem('lrm_token','isolated-workbench-fixture');sessionStorage.setItem('lrm_user',JSON.stringify(actor));localStorage.setItem('lrm_locale',locale);},{actor,locale});
 await context.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;let data=[],status=200;
  if(path==='/api/auth/me') data=actor;
  else if(path==='/api/auth/session'||path==='/api/auth/activity') data={idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
  else if(path==='/api/resources') data=resources;
  else if(path==='/api/bookings') data={items:[],pagination:{page:1,pageSize:100,total:0,totalPages:0},summary:{total:0,byStatus:{},history:0}};
  else if(path==='/api/notifications/unread-count') data={unread:0};
  else if(path==='/api/resource-care') data={generatedAt:new Date().toISOString(),items:[]};
  else if(path==='/api/maintenance/impact') {impactCalls++;data={conflicts:[]};}
  else if(path==='/api/maintenance') data=jobs;
  else if(path==='/api/maintenance/wb-job'&&request.method()==='PATCH') {writes++;const body=request.postDataJSON();jobs=jobs.map(row=>row.id==='wb-job'?{...row,...body,updatedAt:'2026-10-28T03:00:00Z'}:row);data=jobs[0];}
  else if(path==='/api/incidents') data={items:[incident,{...baseIncident,id:'wb-incident-two',title:'Camera cần kiểm tra kết nối',resource:resources[1],resourceId:resources[1].id,severity:'medium',status:'investigating',assignedTo:null}],pagination:{page:1,pageSize:20,total:2,totalPages:1},summary:{total:2,open:2,resolved:0,byStatus:{reported:1,investigating:1}}};
  else if(path==='/api/incidents/wb-incident') {if(detailFails){status=503;data={message:'api.API_REQUEST_FAILED'};}else data=incident;}
  else if(path==='/api/incidents/wb-incident/triage') {writes++;incident={...incident,status:'triaged'};data=incident;}
  else if(request.method()!=='GET') throw new Error(`Unexpected fixture write: ${path}`);
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)}).catch(()=>{});
 });
 await page.goto(`${base}/workspace/${view}${view==='incidents'?'?incident=wb-incident':''}`);
 if(view==='incidents') await page.locator('.incident-detail h2').waitFor();
 else {await page.locator('.maintenance-job').first().click();await page.locator('#maintenance-dossier-title').waitFor();}
 await page.evaluate(async()=>{await document.fonts.ready;document.activeElement?.blur();window.scrollTo(0,0);});
 return {page,context,errors,get writes(){return writes},get impactCalls(){return impactCalls},fail(value){detailFails=value}};
}
try {
 for(const view of ['incidents','maintenance'])for(const width of [1440,390]){
  const state=await open(view,width),{page}=state;
  if(process.env.SKIP_UI_CAPTURES!=='1')await page.screenshot({path:`${output}/${before?'before':'after'}-${view}-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${view} ${width} has no overflow`);
  if(!before){
   const record=page.locator('.workbench-record').first();
   assert.equal(await record.evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion disables record arrival');
   await page.emulateMedia({reducedMotion:'no-preference'});
   assert.equal(await record.evaluate(el=>getComputedStyle(el).animationName),'workbench-record-arrive','Selecting a record has the authored arrival');
   await page.emulateMedia({reducedMotion:'reduce'});
   if(view==='maintenance'){
    // Browsing nearby work must not replace the selected dossier implicitly.
    await page.locator('.maintenance-job').nth(1).hover();
    assert.equal(await page.locator('#maintenance-dossier-title').innerText(),baseJob.title);
    await page.locator('.maintenance-job').nth(1).focus();
    assert.equal(await page.locator('#maintenance-dossier-title').innerText(),baseJob.title);
    await page.locator('.maintenance-job').first().click();
    await page.getByRole('button',{name:catalogs.vi['ui.reschedule_edit_job_125d619b'],exact:true}).click();
    assert.equal(await page.locator('[name=resourceId]').inputValue(),resources[0].id);
    await page.locator('[name=title]').fill('Kế hoạch giữ nguyên khi chuyển ngôn ngữ');
    await page.locator('.header-2026').getByRole('button',{name:'EN',exact:true}).click();
    assert.equal(await page.locator('[name=title]').inputValue(),'Kế hoạch giữ nguyên khi chuyển ngôn ngữ');
    assert.equal(await page.getByRole('button',{name:catalogs.en['ui.save_maintenance_7bf4123f'],exact:true}).isDisabled(),true,'Saving requires fresh conflict review');
    await page.locator('[name=changeReason]').fill('Kiểm tra lại thời gian bảo trì');
    await page.getByRole('button',{name:catalogs.en['ui.check_affected_bookings_f7d4f35b'],exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.maintenance-impact.is-reviewed'));
    assert.equal(state.impactCalls,1);assert.equal(state.writes,0,'Conflict review alone never saves');
    assert.equal(await page.getByRole('button',{name:catalogs.en['ui.save_maintenance_7bf4123f'],exact:true}).isEnabled(),true);
    await page.locator('[name=endAt]').fill('2026-10-29T12:00');
    assert.equal(await page.getByRole('button',{name:catalogs.en['ui.save_maintenance_7bf4123f'],exact:true}).isDisabled(),true,'Changing the time invalidates prior review');
   }else{
    await page.locator('.incident-detail-actions').getByRole('button',{name:catalogs.vi['ui.classification_a077263e'],exact:true}).click();
    await page.locator('.incident-detail-actions').getByRole('button',{name:catalogs.vi['ui.start_investigation_f9b7e9ae'],exact:true}).waitFor();
    assert.equal(state.writes,1);
    state.fail(true);await page.locator('.incident-toolbar').getByRole('button',{name:catalogs.vi['ui.refresh_b4c61340'],exact:true}).click();
    await page.locator('.incident-dossier-host [role=alert]').waitFor();
    assert.equal(await page.locator('.incident-detail-actions').count(),0,'Failed detail hides stale actions');
    state.fail(false);await page.locator('.incident-dossier-host').getByRole('button',{name:catalogs.vi['ui.retry_c58d068c'],exact:true}).click();
    await page.locator('.incident-detail-actions').waitFor();
   }
  }
  assert.deepEqual(state.errors,[]);results.push({view,width,locale:'vi',passed:true});await state.context.close();
 }
 if(!before){
  for(const view of ['incidents','maintenance']){
   const state=await open(view,1440,'en');
   if(process.env.SKIP_UI_CAPTURES!=='1')await state.page.screenshot({path:`${output}/after-${view}-en.png`,fullPage:true});
   assert.equal(/ui\.workbench\./.test(await state.page.locator('main').innerText()),false);
   assert.deepEqual(state.errors,[]);results.push({view,locale:'en',passed:true});await state.context.close();
  }
  const state=await open('incidents',390,'vi','CUSTOMER');
  assert.equal(await state.page.locator('.incident-detail-actions').count(),0,'Customer cannot perform operator actions');
  assert.equal(await state.page.locator('.incident-summary-grid').count(),0,'Customer does not receive operator totals');
  assert.deepEqual(state.errors,[]);results.push({scenario:'customer-readonly',passed:true});await state.context.close();
 }
 await writeFile(`${output}/${before?'before':'after'}-results.json`,JSON.stringify({results,isolation:'All API requests intercepted; no business database writes'},null,2));
 console.log(JSON.stringify({results,output}));
} finally{await browser.close();}
