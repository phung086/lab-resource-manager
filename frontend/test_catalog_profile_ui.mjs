import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { selectWorkspaceTab } from './test-utils/openWorkspace.mjs';
const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base,api]) assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD);
const output = process.env.UI_SCREENSHOT_DIR || '../artifacts/catalog-profile-refinement-20261005/verification';
const roles = (process.env.UX_TEST_ROLES || 'staff,admin,student,lecturer').split(',');
for (const role of roles) assert.ok(['staff','admin','student','lecturer'].includes(role));
mkdirSync(output,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true});
const checks=[], errors=[];
const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
let currentPage;
try {
  for (const role of roles) {
    const context=await browser.newContext({viewport:{width:1440,height:960}});
    const page=await context.newPage();currentPage=page;
    page.on('pageerror',error=>errors.push(error.message));
    const auth=await fetch(`${api}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${role}@lrm.local`,password:process.env.UX_DEMO_PASSWORD})});
    assert.equal(auth.status,200);
    const session=await auth.json();
    await page.addInitScript(({accessToken,user})=>{localStorage.setItem('lrm_token',accessToken);localStorage.setItem('lrm_user',JSON.stringify(user));},session);
    await page.goto(base);await page.locator('.sidebar-2026').waitFor();
    await selectWorkspaceTab(page,'resources');await page.locator('.resource-card').first().waitFor();
    check(!await page.locator('#catalog-filters').isVisible(),`${role}: filters initially collapsed`);
    const toggle=page.locator('[aria-controls="catalog-filters"]');await toggle.click();
    const search=page.locator('#catalog-filters input');await search.fill('LOCAL');
    await page.waitForTimeout(400);await toggle.click();await toggle.click();
    check(await search.inputValue()==='LOCAL',`${role}: closing filters preserves search`);
    await page.locator('.resource-clear-filters').click();await toggle.click();
    await page.locator('.resource-card').first().waitFor();
    if(role==='staff') { await page.waitForTimeout(500); await page.screenshot({path:`${output}/catalog-1440.png`,fullPage:true}); }
    let historyRequests=0;
    page.on('request',request=>{if(request.url().endsWith('/history'))historyRequests++;});
    const selectedName=await page.locator('.catalog-resource-name').first().innerText();
    await page.locator('.catalog-resource-name').first().click();await page.getByRole('dialog').waitFor();
    check(historyRequests===0,`${role}: opening details does not request private history`);
    for(const locale of ['vi','en']) {
      await page.locator('.modal-language-row').getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
      await page.locator(`html[lang=${locale}]`).waitFor();
      for(const section of ['overview','specifications','schedule','history']) {
        const response=section==='history'?page.waitForResponse(r=>r.url().endsWith('/history')):null;
        await page.locator(`[aria-controls="dossier-${section}"]`).click();
        if(response) {const result=await response;check(result.status()===(role==='staff'?403:200),`${role}/${locale}: history authorization`);await page.waitForTimeout(100);}
        check(await page.locator(`#dossier-${section}`).isVisible(),`${role}/${locale}: ${section} opens`);
        check(!/\b(?:ui|refine|api)\.[a-zA-Z_]+/.test(await page.getByRole('dialog').innerText()),`${role}/${locale}/${section}: no translation keys`);
      }
      if(role==='staff') {
        check(await page.locator('#dossier-history [role="alert"]').isVisible(),`staff/${locale}: restricted history explained`);
        await page.screenshot({path:`${output}/history-restricted-${locale}.png`});
      }
    }
    if(role==='admin') {
      await page.locator('[aria-controls="dossier-overview"]').click();
      await page.route('**/resources/*/history',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'API_REQUEST_FAILED'}})}));
      await page.locator('[aria-controls="dossier-history"]').click();await page.locator('#dossier-history [role="alert"]').waitFor();
      check(await page.getByRole('dialog').isVisible(),'history service failure leaves details open');
      await page.unroute('**/resources/*/history');
      await page.locator('#dossier-history button').click();await page.locator('#dossier-history [role="alert"]').waitFor({state:'hidden'});
      check(true,'history retry recovers against real API');
    }
    await page.locator('[aria-controls="dossier-overview"]').click();
    if(role==='staff') {await page.waitForTimeout(250);await page.screenshot({path:`${output}/detail-overview.png`});}
    await page.locator('.modal-footer-2026 .primary-button').click();await page.locator('.calendar-toolbar').waitFor();
    await page.waitForFunction(() => Boolean(document.querySelector('.calendar-resource-filter select')?.value));
    check((await page.locator('.calendar-resource-filter select option:checked').innerText()).includes(selectedName),`${role}: details opens the selected resource calendar`);
    await selectWorkspaceTab(page,'profile');await page.locator('.profile-section-contact').waitFor();
    const draft=page.locator('.profile-section-contact input').first();const previous=await draft.inputValue();await draft.fill('Unsaved test draft');
    for(const locale of ['vi','en']) {
      await page.locator('.header-2026').getByRole('button',{name:locale.toUpperCase(),exact:true}).click();await page.locator(`html[lang=${locale}]`).waitFor();
      for(let index=0;index<4;index++) {
        await page.locator('.profile-page .refine-section-nav button').nth(index).click();
        check(!/SELF_DECLARED_UNVERIFIED|customerTypeSemantics|\bRBAC\b|\b(?:ui|refine)\.[a-zA-Z_]+/.test(await page.locator('.profile-page').innerText()),`${role}/${locale}: account section ${index} has human copy`);
        if(role==='staff') await page.screenshot({path:`${output}/profile-${index}-${locale}.png`,fullPage:true});
      }
    }
    await page.locator('.profile-page .refine-section-nav button').first().click();
    check(await draft.inputValue()==='Unsaved test draft',`${role}: profile draft survives sections and locale`);await draft.fill(previous);
    if(role==='staff') for(const width of [1280,375]) {
      await page.setViewportSize({width,height:960});
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`profile ${width}: no page overflow`);
      await page.screenshot({path:`${output}/profile-${width}.png`,fullPage:true});
      await selectWorkspaceTab(page,'resources');await page.locator('.resource-card').first().waitFor();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`catalog ${width}: no page overflow`);
      await page.screenshot({path:`${output}/catalog-${width}.png`,fullPage:true});
      await selectWorkspaceTab(page,'profile');await page.locator('.profile-section-contact').waitFor();
    }
    await context.close();console.log(`${role}: passed`);
    if(role!==roles.at(-1)) await new Promise(resolve=>setTimeout(resolve,60000));
  }
  assert.deepEqual(errors,[]);check(true,'no browser runtime errors');
} catch(error) {
  if(currentPage&&!currentPage.isClosed()) await currentPage.screenshot({path:`${output}/failure.png`,fullPage:true});
  writeFileSync(`${output}/failure.txt`,error.stack);throw error;
} finally {
  writeFileSync(`${output}/results.json`,JSON.stringify({checks,errors},null,2));await browser.close();
}
console.log(`${checks.length} checks passed`);
