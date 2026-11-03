import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Isolated HTTP fixtures; never contact a bank, SMTP server or business database.
const base=process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const output=process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-payment-email-polish`;
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const user={id:'checkout-qa',role:'CUSTOMER',fullName:'Checkout QA',email:'checkout@example.test',isActive:true};
const results=[];
try {
  for(const scenario of ['hold','paid','cancelled','reconciliation','unavailable','failed','expired-hold']) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(user=>{sessionStorage.setItem('lrm_token','isolated-checkout');sessionStorage.setItem('lrm_user',JSON.stringify(user));localStorage.setItem('lrm_locale','vi');},{...user});
    const startAt=new Date(Date.now()+86400000).toISOString();
    const booking={id:'checkout-booking',bookingCode:'LAB-QA-CHECKOUT',requestedById:user.id,title:'Preview equipment session',status:['cancelled','reconciliation'].includes(scenario)?'CANCELLED':['paid','failed','unavailable'].includes(scenario)?'CONFIRMED':'PENDING_APPROVAL',paymentDueAt:['hold','expired-hold'].includes(scenario)?new Date(Date.now()+(scenario==='hold'?90000:-60000)).toISOString():null,feeAmountVnd:240000,startAt,endAt:new Date(Date.now()+90000000).toISOString(),resource:{code:'GPU-QA',name:'Preview GPU workstation',category:'EQUIPMENT'}};
    const charge={id:'checkout-charge',userId:user.id,amount:240000,currency:'VND',status:['paid','reconciliation'].includes(scenario)?'success':scenario==='failed'?'failed':'pending',provider:['paid','reconciliation'].includes(scenario)?'vnpay':'unselected',txnRef:'QA-TRANSACTION',paidAt:scenario==='paid'?new Date().toISOString():null,paymentUrlExpiresAt:null,reconciliationStatus:scenario==='reconciliation'?'manual_review':'none',reconciliationReason:null};
    let writes=0, receiptReads=0;const errors=[];
    await context.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;let data=[];
      if(path==='/api/auth/me')data=user;
      else if(['/api/auth/session','/api/auth/activity'].includes(path))data={idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
      else if(path==='/api/bookings/checkout-booking')data=booking;
      else if(path==='/api/payments/booking/checkout-booking')data=[charge];
      else if(path==='/api/payments/my')data={transactions:[charge],providers:{vnpay:scenario!=='unavailable',vietqr:false}};
      else if(path==='/api/payments/checkout-charge/receipt') {
        receiptReads++;
        if(scenario==='paid' && receiptReads===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});
        data={transaction:{...charge,user,booking},generatedAt:new Date().toISOString()};
      }
      else if(path==='/api/payments/checkout-charge/vnpay') {writes++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});}
      else if(route.request().method()!=='GET')throw new Error('Unexpected mutation '+path);
      await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/workspace/payments?booking=checkout-booking');await page.locator('.checkout-banner').waitFor();
    assert.ok((await page.locator('.checkout-banner').innerText()).includes('240.000'));
    if(scenario==='cancelled')assert.match(await page.locator('.checkout-banner-status').innerText(),/Đã hủy/);
    if(scenario==='reconciliation')assert.match(await page.locator('.checkout-banner-status').innerText(),/Cần đối soát/);
    if(['cancelled','reconciliation','paid','expired-hold'].includes(scenario))assert.equal(await page.locator('.booking-checkout-payment .primary-button').count(),0);
    if(scenario==='unavailable')assert.equal(await page.locator('.booking-checkout-payment .primary-button').isDisabled(),true);
    if(scenario==='hold') {
      assert.equal(await page.locator('.payment-hold-notice.is-urgent').count(),1);
      await page.locator('.booking-checkout-payment .primary-button').click();
      await page.waitForFunction(()=>document.activeElement?.matches('.booking-checkout>.alert.danger'));
      assert.equal(writes,1);assert.equal(new URL(page.url()).hostname,'127.0.0.1');
    }
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,scenario+' overflow');
      await page.locator('.checkout-banner').scrollIntoViewIfNeeded();
      if(['hold','paid','reconciliation'].includes(scenario))await page.screenshot({path:`${output}/checkout-${scenario}-${width}.png`,fullPage:true});
    }
    if(['paid','reconciliation'].includes(scenario)) {
      const openReceipt=page.getByRole('button',{name:'Mở biên nhận',exact:true});
      await openReceipt.click();
      if(scenario==='paid') {
        await page.waitForFunction(()=>document.activeElement?.matches('.booking-checkout-status>.alert.danger'));
        assert.equal(await page.getByRole('dialog').count(),0,'Failed receipt read must not open a blank dialog');
        await openReceipt.click();
      }
      await page.locator('.payment-receipt').waitFor();
      assert.match(await page.locator('.payment-receipt').innerText(),/LAB-QA-CHECKOUT/);
      assert.equal(await page.locator('.receipt-review').count(),scenario==='reconciliation'?1:0);
      if(scenario==='reconciliation')assert.match(await page.locator('.payment-receipt dd').allTextContents().then(rows=>rows.join(' ')),/Đã hủy/);
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Receipt overflow');
        await page.locator('.modal-container-2026').screenshot({path:`${output}/receipt-${scenario}-${width}.png`});
      }
      await page.getByRole('dialog').getByRole('button',{name:'EN',exact:true}).click();
      await page.locator('.receipt-verified').getByText('Payment verified',{exact:true}).waitFor();
      if(scenario==='reconciliation')assert.match(await page.locator('.receipt-review').innerText(),/does not restore a cancelled booking/);
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('.receipt-disclaimer').isVisible(),true,'Tax disclaimer remains visible on print');
      assert.equal(await page.locator('.modal-footer-2026').isVisible(),false,'Do not print modal controls');
      assert.equal(await page.locator('.checkout-banner').isVisible(),false,'Do not print the checkout behind the receipt');
      await page.pdf({path:`${output}/receipt-${scenario}.pdf`,format:'A4'});
      await page.emulateMedia({media:'screen'});
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.getByRole('button',{name:'Open receipt',exact:true}).evaluate(el=>el===document.activeElement),true,'Restore focus to receipt trigger');
    }
    if(scenario==='paid')await page.locator('.checkout-action-heading').getByText('Next step').waitFor();
    assert.deepEqual(errors,[]);results.push({scenario,passed:true});await context.close();
  }
  console.log(JSON.stringify({results,scope:'Isolated checkout fixtures; no live payments'}));
} finally {await browser.close();}
