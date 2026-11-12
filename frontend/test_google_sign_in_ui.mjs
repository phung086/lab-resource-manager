import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const api = new URL(process.env.UI_API_BASE_URL || `http://${new URL(base).hostname}:8000`);
assert.ok(['127.0.0.1','localhost'].includes(api.hostname));
const shots = process.env.UI_SCREENSHOT_DIR;
if (shots) await mkdir(shots,{recursive:true});
const browser = await chromium.launch({
  channel:process.env.CHROMIUM_EXECUTABLE_PATH?undefined:'msedge',
  executablePath:process.env.CHROMIUM_EXECUTABLE_PATH
});
const clientId='browser-fixture.apps.googleusercontent.com';
const credential='browser-test-credential-never-sent-to-google';
const nonce='browser-test-nonce-with-more-than-32-characters';
const user={id:'google-ui-fixture',role:'CUSTOMER',fullName:'Minh Anh',email:'minh@example.test',isActive:true,passwordLoginEnabled:false};
let scenarios=0;
try {
  for (const [width,locale,mode] of [[1440,'vi','login'],[390,'en','register'],[390,'vi','login'],[1440,'en','register']]) {
    const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
    await context.addInitScript(locale=>localStorage.setItem('lrm_locale',locale),locale);
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // Read the actual runtime when it has no Client ID, otherwise isolate this state.
    const configured=await (await context.request.get(new URL('/api/auth/google/config',api).href)).json();
    if (configured.enabled) await page.route('**/api/auth/google/config',route=>route.fulfill({json:{enabled:false,clientId:null}}));
    await page.goto(`${base}/${mode}`);
    await page.locator('.auth-google-hint').waitFor();
    assert.equal(await page.locator('.auth-google-placeholder').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    if (shots) await page.screenshot({path:join(shots,`${mode}-${width}-${locale}.png`),fullPage:true});
    await context.close();
    scenarios++;
  }

  for (const mode of ['login','register']) {
    const context=await browser.newContext({viewport:{width:390,height:860},reducedMotion:'reduce'});
    await context.addInitScript(({credential}) => {
      window.google={accounts:{id:{
        initialize(options){window.__testGisOptions=options;},
        renderButton(node,options){
          const button=document.createElement('button');
          button.type='button'; button.textContent='Google fixture';
          button.dataset.mode=options.text; button.style.width=options.width+'px';
          button.onclick=()=>window.__testGisOptions.callback({credential});
          node.append(button);
        }
      }}};
    },{credential});
    let attempts=0;
    await context.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      let data=[], status=200;
      if (path==='/api/auth/google/config') data={enabled:true,clientId};
      else if (path==='/api/auth/google/challenge') data={nonce};
      else if (path==='/api/auth/google') {
        attempts++;
        const input=route.request().postDataJSON();
        assert.equal(input.nonce,nonce); assert.equal(input.credential===credential,true);
        if(mode==='login' && attempts===1){
          assert.ok(!('password' in input));
          data={error:{code:'GOOGLE_LINK_REQUIRED'}}; status=409;
        } else {
          if(mode==='login') assert.equal(input.password==='LinkFixture!2026',true);
          data={accessToken:'internal-session-fixture',user};
        }
      } else if(path==='/api/auth/me') data=user;
      else if(path==='/api/auth/session') data={idleExpiresAt:new Date(Date.now()+3600000),expiresAt:new Date(Date.now()+7200000),idleTimeoutSeconds:3600};
      else if(path==='/api/notifications/unread-count') data={unread:0};
      else if(path==='/api/dashboard/summary') data={summary:{}};
      else if(path==='/api/bookings') data={items:[],pagination:{total:0,totalPages:0,page:1,pageSize:20},summary:{byStatus:{},total:0}};
      await route.fulfill({json:data,status});
    });
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/${mode}`);
    const button=page.getByRole('button',{name:'Google fixture'});
    await button.waitFor();
    assert.equal(await button.getAttribute('data-mode'),mode==='login'?'signin_with':'signup_with');
    assert.equal(await page.evaluate(()=>window.__testGisOptions.nonce),nonce);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await button.click();
    if(mode==='login'){
      const proof=page.locator('.auth-google-link input');
      await proof.waitFor();
      await page.waitForFunction(()=>document.activeElement?.closest('.auth-google-link'));
      assert.equal(await button.isVisible(),false);
      await proof.fill('LinkFixture!2026');
      await page.locator('.auth-google-link button[type=submit]').click();
    }
    await page.waitForURL('**/workspace/**');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('lrm_token')),'internal-session-fixture');
    const stored=await page.evaluate(()=>JSON.stringify([sessionStorage,localStorage]));
    assert.ok(!stored.includes(credential));
    assert.equal(attempts,mode==='login'?2:1);
    assert.deepEqual(errors,[]);
    await context.close();
    scenarios++;
  }
  console.log(`Google sign-in UI passed ${scenarios} scenarios. Configured callback uses test fixtures.`);
} finally {
  await browser.close();
}
