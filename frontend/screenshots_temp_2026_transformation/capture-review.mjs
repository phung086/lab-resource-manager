import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1');
const out = decodeURIComponent(root);
const browser = await chromium.launch({headless:true});
const url='http://127.0.0.1:18086';
const results=[];
const sessions=new Map();
async function capture(page,name){
  await page.waitForLoadState('networkidle');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(400);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,`${name}: document overflow`);
  await page.screenshot({path:`${out}${name}.png`,fullPage:!(await page.getByRole('dialog').count()),animations:'disabled'});
  if(await page.getByRole('dialog').count()) console.log(name,await page.locator('.modal-container-2026').evaluate(el=>({background:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity,rect:el.getBoundingClientRect().toJSON(),scrollY:window.scrollY,ancestors:Array.from((function*(e){while(e){yield e;e=e.parentElement}})(el)).map(e=>[e.tagName,e.className,getComputedStyle(e).opacity,getComputedStyle(e).filter])})));
  results.push({name,width:page.viewportSize().width,overflow});
}
async function nav(page,label){
  if(page.viewportSize().width<=900) await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.locator('.sidebar-nav-item-2026').filter({hasText:label}).click();
  await page.waitForLoadState('networkidle');
}
async function login(page,role){
  if(sessions.has(role)){
    await page.context().addInitScript(({accessToken,user})=>{localStorage.setItem('lrm_token',accessToken);localStorage.setItem('lrm_user',JSON.stringify(user));},sessions.get(role));
    await page.goto(url,{waitUntil:'networkidle'});await page.locator('.workspace-home').waitFor();return;
  }
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('input[type=email]').fill(role==='admin'?'admin@demo.local':`demo.${role}@lab.test`);
  await page.locator('input[type=password]').fill(role==='admin'?'Batch7Admin!Passphrase':'Batch7User!Passphrase');
  await page.getByRole('button',{name:/ĐĂNG NHẬP VÀO HỆ THỐNG/i}).click();
  await page.locator('.workspace-home').waitFor();
  sessions.set(role,await page.evaluate(()=>({accessToken:localStorage.getItem('lrm_token'),user:JSON.parse(localStorage.getItem('lrm_user'))})));
}
try{
 for(const [size,viewport] of Object.entries({desktop:{width:1440,height:1000},mobile:{width:390,height:844},tablet:{width:768,height:1024}})){
  const context=await browser.newContext({viewport}); const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  await capture(page,`login_${size}`);
  await page.getByRole('button',{name:/Đăng ký tài khoản mới/}).click();
  await capture(page,`register_${size}`);
  await login(page,'student');
  await capture(page,`student_home_${size}`);
  await page.locator('#workspace-search').fill('DEMO-ROOM');
  await page.locator('.workspace-search').getByRole('button').click();
  await page.locator('.canonical-resource-card').first().waitFor();
  assert.equal(await page.locator('.canonical-resource-card').count(),1);
  await capture(page,`student_search_${size}`);
  await page.getByRole('button',{name:'Xem chi tiết',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await capture(page,`resource_detail_${size}`);
  await page.getByRole('button',{name:'Xem lịch của tài nguyên'}).click();
  await page.locator('select[aria-label="Chọn tài nguyên lịch"]').waitFor();
  await capture(page,`calendar_week_${size}`);
  await page.getByRole('button',{name:'Ngày',exact:true}).click(); await capture(page,`calendar_day_${size}`);
  await page.getByRole('button',{name:'Tháng',exact:true}).click(); await capture(page,`calendar_month_${size}`);
  await page.getByRole('button',{name:'Đặt Khung Giờ Mới'}).click();
  await page.getByRole('dialog').waitFor(); await capture(page,`booking_${size}`);
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
  await nav(page,'Lịch Đặt Của Tôi'); await capture(page,`my_bookings_${size}`);
  await nav(page,'Thông Báo'); await capture(page,`notifications_${size}`);
  await context.close();
  const staffContext=await browser.newContext({viewport});const staff=await staffContext.newPage();await login(staff,'staff');
  await capture(staff,`staff_home_${size}`);
  await nav(staff,'Vận Hành Booking');await capture(staff,`staff_operations_${size}`);
  await nav(staff,'Giám Sát Telemetry');await capture(staff,`monitoring_${size}`);
  await nav(staff,'Sự Cố Tài Nguyên');await capture(staff,`incidents_${size}`);
  await staffContext.close();
 }
 for(const role of ['lecturer','admin']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await login(page,role);
  await capture(page,`${role}_home_desktop`);
  if(role==='admin'){await nav(page,'Quản Trị Người Dùng');await capture(page,'admin_users_desktop');await nav(page,'Quản Lý Tài Nguyên');await capture(page,'admin_resources_desktop');}
  await context.close();
 }
 fs.writeFileSync(`${out}capture-results.json`,JSON.stringify(results,null,2));
 console.log(`PASS: ${results.length} screenshots, no document overflow. Home search, role landing, resource-calendar continuity, Escape dismissal verified.`);
}finally{await browser.close();}
