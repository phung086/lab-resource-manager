import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base=process.env.UX_FRONTEND_URL || 'http://localhost:5173', api=process.env.UX_API_URL || 'http://localhost:8000/api';
for(const url of [base,api])assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD,'Provide credentials for specifically seeded QA accounts');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true});
const rows=[['CUSTOMER',process.env.UX_CUSTOMER_EMAIL||'student@lrm.local'],['LAB_STAFF',process.env.UX_STAFF_EMAIL||'staff@lrm.local'],['ADMIN',process.env.UX_ADMIN_EMAIL||'admin@lrm.local']];
try{
 for(const[role,email]of rows){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000); page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',async route=>{
   try {const original=new URL(route.request().url()),target=new URL(api); if(original.pathname.startsWith('/api/')){
    const response=await page.request.fetch(target.origin+original.pathname+original.search,{method:route.request().method(),timeout:8000,headers:route.request().headers(),data:route.request().postDataBuffer()||undefined});await route.fulfill({response});
   }else await route.continue();}catch{try{await route.abort();}catch{}}
  });
  try{
   console.log(role+': login');await page.goto(base+'/login');await page.locator('input[type=email]').fill(email);await page.locator('input[type=password]').fill(process.env.UX_DEMO_PASSWORD);await page.locator('button[type=submit]').click();
   await page.locator('[data-role-home='+role+']').waitFor();
   assert.equal(await page.getByText('Lớp học phần',{exact:true}).count(),0);
   assert.equal(await page.locator('.home-finder').count(),role==='CUSTOMER'?1:0);
   assert.equal(await page.locator('.home-academic-banner').count(),0);
   for(const locale of ['en','vi']){console.log(role+': locale '+locale);await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).first().click();await page.waitForFunction(lang=>document.documentElement.lang.startsWith(lang),locale);
    for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   }
   assert.deepEqual(errors,[]);console.log(role+': real login, own home, no teaching screen, VI/EN and responsive passed');
  }finally{await page.unrouteAll({behavior:'ignoreErrors'});await context.close();}
 }
}finally{await browser.close();}
