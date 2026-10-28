import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Visual/interaction fixtures only: intercept every API request. No database,
// hardware, email, or external provider is used by this browser test.
const base=process.env.UI_BASE_URL||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const before=process.env.CAPTURE_PHASE==='before';
const output=process.env.UI_EVIDENCE_DIR||`${process.env.TEMP}/lab-resource-care-20261028`;
await mkdir(output,{recursive:true});
const catalogs=Object.fromEntries(await Promise.all(['vi','en'].map(async l=>[l,JSON.parse(await readFile(new URL(`./src/locales/catalog/${l}.json`,import.meta.url),'utf8')).messages])));
const browser=await chromium.launch({channel:'chrome',headless:true});
const user={id:'care-operator',fullName:'Ngọc Linh',role:'LAB_STAFF',email:'care@example.test',isActive:true};
const lab={id:'care-lab',name:'Phòng nghiên cứu AI'};
const gpu={id:'care-gpu',code:'GPU-01',name:'Máy trạm GPU nghiên cứu',category:'MACHINE',capacity:1,operationalStatus:'AVAILABLE',inspectionRequired:false,laboratory:lab,
 profile:{roomId:null,intervalDays:30,intervalHours:100,intervalUses:20,warningPercent:80,servicedAt:'2026-10-01T02:00:00Z',lastMaintenanceId:null},
 parts:[{id:'fan',name:'Quạt tản nhiệt',condition:'WORN',notes:'Theo dõi tiếng ồn khi vận hành'}],
 incidents:[{id:'care-incident',title:'Kiểm tra quạt tản nhiệt GPU',status:'investigating'}],
 maintenance:[{id:'care-job',title:'Vệ sinh và kiểm tra tản nhiệt',status:'scheduled',endAt:'2026-10-29T04:00:00Z'}],checkedOutBooking:null,activeOperation:null,history:[],
 lifetime:{hours:240,equivalentLoadHours:160},sinceService:{hours:98,uses:20},custodyHours:98,dutyPercent:null,
 care:{configured:true,due:true,nearDue:true,progressPercent:100,dueAt:'2026-10-31T02:00:00Z',remainingHours:2,remainingUses:0}};
const room={...gpu,id:'care-room',code:'ROOM-01',name:'Phòng thực hành thị giác máy tính',category:'ROOM',capacity:10,operationalStatus:'IN_USE',parts:[],incidents:[],maintenance:[],
 activeOperation:{id:'care-operation',bookingId:'care-booking',loadPercent:0,occupants:3,startedAt:'2026-10-28T02:00:00Z',endedAt:null,stopReason:null},checkedOutBooking:{id:'care-booking',bookingCode:'LAB-2810',endAt:'2026-10-28T05:00:00Z'},sinceService:{hours:32,uses:6},care:{...gpu.care,due:false,nearDue:false,progressPercent:32,remainingHours:68,remainingUses:14}};
const unconfigured={...gpu,id:'care-camera',code:'CAM-02',name:'Camera thị giác máy tính',category:'EQUIPMENT',profile:null,parts:[],incidents:[],maintenance:[],sinceService:{hours:0,uses:0},care:{...gpu.care,configured:false,due:false,nearDue:false,progressPercent:0,dueAt:null,remainingHours:null,remainingUses:null}};
const results=[];
async function open(width,locale='vi',id=gpu.id){
 const context=await browser.newContext({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],diagnostic=[];let failed=false;
 page.on('console',message=>{if(message.type()==='error')diagnostic.push(message.text());});
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({user,locale})=>{sessionStorage.setItem('lrm_token','isolated-care-fixture');sessionStorage.setItem('lrm_user',JSON.stringify(user));localStorage.setItem('lrm_locale',locale);},{user,locale});
 await context.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;let data=[],status=200;
  if(path==='/api/auth/me')data=user;
  else if(path==='/api/auth/session'||path==='/api/auth/activity')data={idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
  else if(path==='/api/notifications/unread-count')data={unread:0};
  else if(path==='/api/resources')data=[gpu,room,unconfigured];
  else if(path==='/api/dashboard')data={generatedAt:'2026-10-28T03:00:00Z',summary:{pendingApprovalCount:0,activeBookingsCount:0,checkedOutCount:0,openIncidentCount:0,totalResources:3,unreadNotifications:0},upcomingBookings:[]};
  else if(path==='/api/bookings'||path==='/api/incidents')data={items:[],pagination:{page:1,total:0,totalPages:0,pageSize:20},summary:{total:0,open:0,resolved:0,byStatus:{},history:0}};
  else if(path==='/api/maintenance')data=[{...gpu.maintenance[0],resource:gpu,resourceId:gpu.id,kind:'maintenance',startAt:'2026-10-29T02:00:00Z',createdAt:'2026-10-28T02:00:00Z',updatedAt:'2026-10-28T02:00:00Z',notes:'Kế hoạch kiểm tra theo chu kỳ'}];
  else if(path==='/api/resource-care'){if(failed){status=503;data={message:'api.API_REQUEST_FAILED'};}else data={generatedAt:'2026-10-28T03:00:00Z',items:[gpu,room,unconfigured]};}
  else if(req.method()!=='GET'&&path!=='/api/auth/activity')throw new Error(`Unexpected mutation: ${path}`);
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)}).catch(()=>{});
 });
 await page.goto(`${base}/workspace/monitoring?resource=${id}`);
 try { await page.locator('.care-dossier h2').waitFor({timeout:10000}); }
 catch(cause) { console.log(JSON.stringify({url:page.url(),errors,diagnostic,text:(await page.locator('body').innerText()).slice(-2500)}));throw cause; }
 await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
 return {context,page,errors,fail(value){failed=value}};
}
try{
 for(const width of [1440,390]){
  const state=await open(width),{page}=state;
  if(process.env.SKIP_UI_CAPTURES!=='1')await page.screenshot({path:`${output}/${before?'before':'after'}-care-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(!before){
   const roomButton=page.locator('.care-resource-row').filter({hasText:room.name});
   await roomButton.hover();await roomButton.focus();
   assert.equal(await page.locator('.care-dossier h2').innerText(),gpu.name,'Pointer/focus browsing does not change selection');
   await page.locator('.care-controls summary').click();
   await page.locator('.care-form select').first().selectOption('CONFIGURE');
   await page.locator('.care-form textarea').fill('Giữ nguyên bản nháp kiểm tra chu kỳ');
   await page.locator('.header-2026').getByRole('button',{name:'EN',exact:true}).click();
   assert.equal(await page.locator('.care-form textarea').inputValue(),'Giữ nguyên bản nháp kiểm tra chu kỳ');
   state.fail(true);await page.locator('.care-workspace>.monitor-heading button').click();
   await page.locator('.care-workspace>.monitor-error').waitFor();
   assert.equal(await page.locator('.care-form textarea').inputValue(),'Giữ nguyên bản nháp kiểm tra chu kỳ');
   assert.equal(await page.locator('.care-form button[type=submit]').isDisabled(),true,'Stale snapshot disables commands without removing the draft');
   state.fail(false);await page.locator('.care-workspace>.monitor-heading button').click();
   await page.locator('.care-workspace>.monitor-error').waitFor({state:'hidden'});
   assert.equal(await page.locator('.care-form textarea').inputValue(),'Giữ nguyên bản nháp kiểm tra chu kỳ');
   await page.locator('.care-related-jobs').getByRole('link',{name:gpu.maintenance[0].title,exact:false}).click();
   await page.locator('#maintenance-dossier-title').waitFor();
   assert.equal(await page.locator('#maintenance-dossier-title').innerText(),gpu.maintenance[0].title);
  }
  assert.deepEqual(state.errors,[]);results.push({width,locale:'vi',passed:true});await state.context.close();
 }
 if(!before){
  for(const [id,scenario]of[[unconfigured.id,'unconfigured'],[room.id,'occupied-room']]){
   const state=await open(390,'vi',id);
   if(scenario==='unconfigured'){
    assert.equal(await state.page.locator('.care-dossier .care-cycle progress').count(),0);
    assert.ok((await state.page.locator('.care-cycle').innerText()).includes(catalogs.vi['ui.care.notConfigured']));
   }else assert.ok((await state.page.locator('.care-metrics').innerText()).includes('3/10'));
   assert.deepEqual(state.errors,[]);results.push({scenario,passed:true});await state.context.close();
  }
  const state=await open(1440,'en');
  if(process.env.SKIP_UI_CAPTURES!=='1')await state.page.screenshot({path:`${output}/after-care-en.png`,fullPage:true});
  assert.equal(/ui\.careStudio\./.test(await state.page.locator('main').innerText()),false);
  assert.deepEqual(state.errors,[]);results.push({locale:'en',passed:true});await state.context.close();
 }
 await writeFile(`${output}/${before?'before':'after'}-results.json`,JSON.stringify({results,isolation:'Every API request intercepted; no database writes'},null,2));
 console.log(JSON.stringify({results,output}));
}finally{await browser.close();}
